/*
Author : ShHawk 

*/

import express from 'express';
import cors from 'cors';
// Correction compat ESM/CJS sous Node v22 pour express-rate-limit
// On force l'utilisation de la résolution CJS via createRequire.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const rateLimit = require('express-rate-limit');
import compression from 'compression';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

import pool, { migrate } from './db.js';
import { extractVideoId, generateAutoLabel } from '../utils/youtube.js';
import { genId } from '../utils/id.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());
// Configuration CORS stricte et configurable
const isProd = process.env.NODE_ENV === 'production';
const allowedOriginsEnv = process.env.CORS_ALLOWED_ORIGINS || '';
const ALLOWED_ORIGINS = new Set(
  allowedOriginsEnv
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
);
if (process.env.FRONTEND_ORIGIN) {
  ALLOWED_ORIGINS.add(process.env.FRONTEND_ORIGIN.trim());
}
const ALLOW_ALL = process.env.CORS_ALLOW_ALL
  ? process.env.CORS_ALLOW_ALL === 'true'
  : !isProd;

const corsOptions = {
  origin: (origin, callback) => {
    // Autoriser requêtes sans en-tête Origin (ex: curl) et en dev si ALLOW_ALL
    if (ALLOW_ALL || !origin) return callback(null, true);
    if (ALLOWED_ORIGINS.has(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
// Préflight générique (inclut SSE)
app.options('*', cors(corsOptions));

// Compression conditionnelle: ne pas compresser les flux SSE
const shouldCompress = (req, res) => {
  if (req.path.endsWith('/stream')) return false;
  return compression.filter(req, res);
};
app.use(compression({ filter: shouldCompress }));

// Rate limit uniquement pour les requêtes NON-GET (évite de limiter l'SSE et les lectures)
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false
});

app.use((req, res, next) => {
  if (req.path.startsWith('/events') && req.method !== 'GET') {
    return adminLimiter(req, res, next);
  }
  next();
});

const events = new Map(); // état en mémoire
const clients = new Map(); // SSE clients par évènement
// Cache simple pour titres YouTube
const titleCache = new Map(); // videoId -> { title, ts }
const TITLE_TTL_MS = 60 * 60 * 1000; // 1h

// Configuration d'historique (minutes) au-delà de 1440
const MAX_HISTORY_MINUTES = (() => {
  const v = parseInt(process.env.MAX_HISTORY_MINUTES || '10080', 10); // défaut: 7 jours
  return Number.isFinite(v) && v > 0 ? v : 10080;
})();

function clampMinutes(raw, def) {
  let m = parseInt(raw ?? def, 10);
  if (!Number.isFinite(m) || m <= 0) m = def;
  return Math.min(m, MAX_HISTORY_MINUTES);
}

function parseRange(req, defaultMinutes) {
  // Permet soit minutes, soit from/to ISO
  const fromStr = req.query.from;
  const toStr = req.query.to;
  let from = undefined;
  let to = undefined;
  if (fromStr && toStr) {
    const f = new Date(fromStr);
    const t = new Date(toStr);
    if (!isNaN(f.getTime()) && !isNaN(t.getTime()) && f <= t) {
      from = f;
      to = t;
    }
  }
  const minutes = clampMinutes(req.query.minutes, defaultMinutes);
  return { from, to, minutes };
}

// --- Authentification simple par cookie/token ---
const AUTH_SECRET = process.env.AUTH_SECRET || 'dev_secret_change_me';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';
const CLIENT_PASSWORD = process.env.CLIENT_PASSWORD || 'clientpw';

function base64url(buf) {
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function createToken(aud = 'admin', ttlSec = 60 * 60 * 24 * 60) {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const sig = base64url(crypto.createHmac('sha256', AUTH_SECRET).update(`${aud}|${exp}`).digest());
  return `${exp}.${aud}.${sig}`;
}

function verifyToken(token, requiredAud) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length === 2) {
    // Ancien format: exp.sig (considéré admin)
    const exp = parseInt(parts[0], 10);
    const sig = parts[1];
    if (!Number.isFinite(exp) || exp <= Math.floor(Date.now() / 1000)) return false;
    const expectedLegacy = base64url(crypto.createHmac('sha256', AUTH_SECRET).update(`admin|${exp}`).digest());
    const ok = sig === expectedLegacy;
    return requiredAud ? (requiredAud === 'admin' && ok) : ok;
  }
  if (parts.length !== 3) return false;
  const exp = parseInt(parts[0], 10);
  const aud = parts[1];
  const sig = parts[2];
  if (!Number.isFinite(exp) || exp <= Math.floor(Date.now() / 1000)) return false;
  if (requiredAud && aud !== requiredAud) return false;
  if (!['admin', 'client'].includes(aud)) return false;
  const expected = base64url(crypto.createHmac('sha256', AUTH_SECRET).update(`${aud}|${exp}`).digest());
  return sig === expected;
}

function isSafeRedirect(path) {
  if (typeof path !== 'string') return false;
  // Interdire schémas externes et doubles slash
  if (/^https?:\/\//i.test(path)) return false;
  if (!path.startsWith('/')) return false;
  if (path.startsWith('/api/')) return false;
  // Autoriser uniquement caractères simples
  return /^\/[A-Za-z0-9_\-\/]*$/.test(path);
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const k = pair.slice(0, idx).trim();
    const v = decodeURIComponent(pair.slice(idx + 1).trim());
    out[k] = v;
  });
  return out;
}

function isAuthenticated(req, aud = 'admin') {
  const cookies = parseCookies(req);
  const tok = cookies.lp_auth || (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  return verifyToken(tok, aud);
}

function setAuthCookie(res, token) {
  const parts = String(token).split('.');
  const exp = parts.length >= 2 ? parseInt(parts[0], 10) : Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 60);
  const now = Math.floor(Date.now() / 1000);
  const maxAgeMs = Math.max(1, (exp - now) * 1000);
  res.cookie('lp_auth', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: false,
    maxAge: maxAgeMs
  });
}

function requireAuth(req, res, next) {
  if (!isAuthenticated(req, 'admin')) return res.status(401).json({ error: 'unauthorized' });
  next();
}

async function init() {
  await migrate();
  // Charger les évènements existants
  const { rows: evs } = await pool.query('SELECT * FROM events WHERE COALESCE(is_deleted,false)=false');
  for (const ev of evs) {
    ev.streams = (await pool.query('SELECT * FROM streams WHERE event_id=$1', [ev.id])).rows;
    // Initialiser les propriétés par défaut si elles n'existent pas
    ev.is_paused = ev.is_paused || false;
    for (const stream of ev.streams) {
      stream.is_favorite = stream.is_favorite || false;
      stream.failure_count = stream.failure_count || 0;
      stream.is_disabled = stream.is_disabled || false;
      stream.next_poll_at = new Date();
    }
    events.set(ev.id, { ...ev, state: { total: 0, streams: {} } });
    startPolling(ev.id);
  }
  if (process.env.SEED_ON_START === 'true') await seed();
}

function getEvent(id) {
  const ev = events.get(id);
  if (!ev) throw new Error('notfound');
  return ev;
}

function startPolling(eventId) {
  const ev = getEvent(eventId);
  async function poll() {
    // Vérifier si l'événement est en pause
    if (ev.is_paused) return;
    
    if (!ev.streams.length) return;
    
    // Filtrer les streams non désactivés ET non en pause individuellement
    const activeStreams = ev.streams.filter(s => !s.is_disabled && !s.is_paused);
    if (!activeStreams.length) return;
    const now = new Date();
    // Respecter l'intervalle personnalisé par stream (et backoff sur échecs)
    const dueStreams = activeStreams.filter(s => {
      const next = s.next_poll_at ? new Date(s.next_poll_at) : new Date(0);
      return now >= next;
    });
    // Même si aucun stream n'est "due" à ce tick, on produit quand même un échantillon
    const ids = dueStreams.map(s => s.video_id);
    const chunks = [];
    while (ids.length) chunks.push(ids.splice(0, 50));
    let total = 0;
    const streamStates = {};
    
    for (const chunk of chunks) {
      const url = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${chunk.join(',')}&key=${process.env.YT_API_KEY}`;
      let data;
      try {
        const res = await fetch(url, { timeout: 10000 });
        data = await res.json();
      } catch (e) {
        console.error('Erreur YouTube', e);
        // Incrémenter le compteur d'échecs pour tous les streams de ce chunk
        for (const videoId of chunk) {
          const stream = dueStreams.find(s => s.video_id === videoId);
          if (stream) {
            await handleStreamFailure(stream, ev.id);
          }
        }
        continue;
      }
      
      // Traiter les réponses réussies
      for (const item of data.items || []) {
        const id = item.id;
        const stream = dueStreams.find(s => s.video_id === id);
        if (!stream) continue;
        
        const viewers = item.liveStreamingDetails?.concurrentViewers ? parseInt(item.liveStreamingDetails.concurrentViewers) : 0;
        const online = !!item.liveStreamingDetails?.concurrentViewers;
        
        // Réinitialiser le compteur d'échecs en cas de succès
        if (stream.failure_count > 0) {
          await pool.query('UPDATE streams SET failure_count = 0, last_failure_at = NULL WHERE id = $1', [stream.id]);
          stream.failure_count = 0;
          stream.last_failure_at = null;
        }
        
        streamStates[stream.id] = { 
          id: stream.id, 
          label: stream.label, 
          current: viewers, 
          online,
          is_favorite: stream.is_favorite || false
        };
        total += viewers;
        await pool.query('INSERT INTO stream_samples(event_id, stream_id, ts, concurrent_viewers) VALUES($1,$2,$3,$4)', [ev.id, stream.id, now, viewers]);
        // Planifier prochain poll selon intervalle personnalisé
        const intervalSec = stream.custom_interval_sec || (ev.poll_interval_ms / 1000);
        stream.next_poll_at = new Date(now.getTime() + Math.max(2, intervalSec) * 1000);
      }
      
      // Gérer les streams qui n'ont pas de réponse (potentiellement en échec)
      for (const videoId of chunk) {
        const stream = dueStreams.find(s => s.video_id === videoId);
        if (stream && !data.items?.find(item => item.id === videoId)) {
          await handleStreamFailure(stream, ev.id);
        }
      }
    }
    
    // Construire l'état fusionné et calculer le total sur tous les streams ACTIFS (non désactivés et non en pause)
    const prev = ev.state || { total: 0, streams: {} };
    const mergedStreams = { ...prev.streams, ...streamStates };
    const activeIds = new Set(ev.streams.filter(s => !s.is_disabled && !s.is_paused).map(s => s.id));
    let totalNext = 0;
    for (const s of ev.streams) {
      if (!activeIds.has(s.id)) continue;
      const st = mergedStreams[s.id];
      const v = (st && typeof st.current === 'number') ? st.current : (Number(st?.current) || 0);
      totalNext += v;
    }
    let streamsChanged = false;
    for (const [sid, st] of Object.entries(streamStates)) {
      const prevSt = prev.streams[sid];
      if (!prevSt || prevSt.current !== st.current || prevSt.online !== st.online) { streamsChanged = true; break; }
    }
    const changedTotal = totalNext !== prev.total;
    // Mise à jour de l'état
    ev.state = { total: totalNext, streams: mergedStreams };
    // Écriture DB et SSE uniquement si changement (ou si WRITE_UNCHANGED_SAMPLES)
    const writeUnchanged = (process.env.WRITE_UNCHANGED_SAMPLES === 'true') || (!dueStreams.length);
    if (changedTotal || streamsChanged || writeUnchanged) {
      await pool.query('INSERT INTO samples(event_id, ts, total) VALUES($1,$2,$3)', [ev.id, now, totalNext]);
      const payload = JSON.stringify({ type: 'tick', data: { ts: now, total: totalNext, streams: Object.values(ev.state.streams) } });
      const set = clients.get(ev.id) || new Set();
      for (const res of set) res.write(`data: ${payload}\n\n`);
    }
  }
  poll();
  ev.timer && clearInterval(ev.timer);
  ev.timer = setInterval(poll, ev.poll_interval_ms);
}

// Fonction pour gérer les échecs de stream
async function handleStreamFailure(stream, eventId) {
  const newFailureCount = (stream.failure_count || 0) + 1;
  const now = new Date();
  
  if (newFailureCount >= 3) {
    // Désactiver le stream après 3 échecs
    await pool.query('UPDATE streams SET failure_count = $1, last_failure_at = $2, is_disabled = TRUE WHERE id = $3', 
      [newFailureCount, now, stream.id]);
    stream.failure_count = newFailureCount;
    stream.last_failure_at = now;
    stream.is_disabled = true;
    console.log(`Stream ${stream.label} (${stream.video_id}) désactivé après 3 échecs`);
  } else {
    // Incrémenter le compteur d'échecs
    await pool.query('UPDATE streams SET failure_count = $1, last_failure_at = $2 WHERE id = $3', 
      [newFailureCount, now, stream.id]);
    stream.failure_count = newFailureCount;
    stream.last_failure_at = now;
    console.log(`Échec ${newFailureCount}/3 pour le stream ${stream.label} (${stream.video_id})`);
  }
  // Backoff: repousser prochain poll selon le nombre d'échecs
  const intervalSec = stream.custom_interval_sec ||  (getEvent(eventId).poll_interval_ms / 1000);
  const backoffFactor = Math.min(4, 1 + newFailureCount); // jusqu'à x4
  stream.next_poll_at = new Date(now.getTime() + Math.max(2, intervalSec * backoffFactor) * 1000);
}

async function seed() {
  if (events.size) return;
  const id = genId();
  const poll = parseInt(process.env.POLL_INTERVAL_DEFAULT || '5') * 1000;
  await pool.query('INSERT INTO events(id,name,poll_interval_ms) VALUES($1,$2,$3)', [id, 'Démo', poll]);
  const ev = { id, name: 'Démo', poll_interval_ms: poll, streams: [], state: { total: 0, streams: {} } };
  events.set(id, ev);
  startPolling(id);
}

// Routes API
// Auth
app.post('/auth/login', (req, res) => {
  const password = (req.body && req.body.password) || '';
  let aud = null;
  if (password && password === ADMIN_PASSWORD) aud = 'admin';
  else if (password && password === CLIENT_PASSWORD) aud = 'client';
  if (!aud) return res.status(401).json({ error: 'invalid_credentials' });
  const token = createToken(aud);
  setAuthCookie(res, token);
  res.json({ ok: true, aud });
});

app.get('/auth/check', (req, res) => {
  const aud = typeof req.query.aud === 'string' ? req.query.aud : 'admin';
  if (!isAuthenticated(req, aud)) return res.status(401).json({ error: 'unauthorized' });
  res.json({ ok: true, aud });
});

app.get('/auth/magic', (req, res) => {
  const tokenParam = req.query.token;
  const redirect = typeof req.query.redirect === 'string' ? req.query.redirect : '/admin';
  const aud = typeof req.query.aud === 'string' ? req.query.aud : undefined; // aud embarqué dans le token
  if (!verifyToken(tokenParam, aud)) return res.status(400).json({ error: 'invalid_token' });
  setAuthCookie(res, tokenParam);
  res.redirect(isSafeRedirect(redirect) ? redirect : '/admin');
});

// Générer un lien magique signé côté serveur (protégé)
app.post('/auth/magic', requireAuth, (req, res) => {
  const ttlSec = Number.isFinite(parseInt(req.body?.ttlSec, 10)) ? parseInt(req.body.ttlSec, 10) : (60 * 60 * 24 * 60);
  const aud = req.body?.aud === 'client' ? 'client' : 'admin';
  const redirect = typeof req.body?.redirect === 'string' ? req.body.redirect : (aud === 'admin' ? '/admin' : '/events');
  if (!isSafeRedirect(redirect)) return res.status(400).json({ error: 'invalid_redirect' });
  const token = createToken(aud, ttlSec);
  const url = `/api/auth/magic?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent(redirect)}&aud=${encodeURIComponent(aud)}`;
  res.json({ url, ttlSec, aud });
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.post('/events', requireAuth, async (req, res) => {
  const { name, pollIntervalSec } = req.body;
  const poll = Math.max(2, parseInt(pollIntervalSec || process.env.POLL_INTERVAL_DEFAULT)) * 1000;
  const id = genId();
  const { rows } = await pool.query('INSERT INTO events(id,name,poll_interval_ms) VALUES($1,$2,$3) RETURNING *', [id, name, poll]);
  const evRow = rows[0] || { id, name, poll_interval_ms: poll };
  const ev = { id: evRow.id, name: evRow.name, poll_interval_ms: evRow.poll_interval_ms, created_at: evRow.created_at, streams: [], state: { total: 0, streams: {} } };
  events.set(id, ev);
  startPolling(id);
  res.json({ id: ev.id, name: ev.name, pollIntervalSec: ev.poll_interval_ms / 1000, streams: ev.streams, state: ev.state });
});

app.get('/events', (req, res) => {
  res.json(Array.from(events.values()).map(e => ({ id: e.id, name: e.name, pollIntervalSec: e.poll_interval_ms / 1000, is_paused: !!e.is_paused, created_at: e.created_at })));
});

app.get('/events/:id', (req, res) => {
  try {
    const ev = getEvent(req.params.id);
    res.json({ id: ev.id, name: ev.name, pollIntervalSec: ev.poll_interval_ms / 1000, streams: ev.streams, state: ev.state, created_at: ev.created_at });
  } catch {
    res.status(404).end();
  }
});

// Mise à jour du nom et de l'intervalle d'un évènement
app.put('/events/:id', requireAuth, async (req, res) => {
  try {
    const ev = getEvent(req.params.id);
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : ev.name;
    let pollMs = ev.poll_interval_ms;
    if (req.body.pollIntervalSec !== undefined) {
      const sec = parseInt(req.body.pollIntervalSec, 10);
      if (!Number.isFinite(sec) || sec < 2 || sec > 600) {
        return res.status(400).json({ error: 'pollIntervalSec invalide (2-600)' });
      }
      pollMs = sec * 1000;
    }
    await pool.query('UPDATE events SET name=$1, poll_interval_ms=$2 WHERE id=$3', [name, pollMs, ev.id]);
    ev.name = name;
    ev.poll_interval_ms = pollMs;
    if (ev.timer) { clearInterval(ev.timer); ev.timer = null; }
    if (!ev.is_paused) startPolling(ev.id);
    res.json({ id: ev.id, name: ev.name, pollIntervalSec: ev.poll_interval_ms / 1000 });
  } catch (e) {
    console.error('PUT /events/:id failed', e);
    res.status(404).end();
  }
});

app.post('/events/:id/streams', requireAuth, async (req, res) => {
  try {
    const ev = getEvent(req.params.id);
    const { label, urlOrId, customTitle, customInterval } = req.body;
    const videoId = extractVideoId(urlOrId);
    if (!videoId) return res.status(400).json({ error: 'id invalide' });
    const id = genId();
    const intervalSec = customInterval ? Math.max(2, Math.min(300, parseInt(customInterval))) : null;
    // Générer automatiquement le label si vide
    const finalLabel = label && label.trim() ? label : generateAutoLabel(urlOrId);
    await pool.query('INSERT INTO streams(id,event_id,label,video_id,custom_title,custom_interval_sec) VALUES($1,$2,$3,$4,$5,$6)', [id, ev.id, finalLabel, videoId, customTitle || null, intervalSec]);
    const stream = { id, event_id: ev.id, label: finalLabel, video_id: videoId, custom_title: customTitle || null, custom_interval_sec: intervalSec };
    ev.streams.push(stream);
    res.json(stream);
  } catch {
    res.status(404).end();
  }
});

app.delete('/events/:id/streams/:sid', requireAuth, async (req, res) => {
  try {
    const ev = getEvent(req.params.id);
    await pool.query('DELETE FROM streams WHERE id=$1 AND event_id=$2', [req.params.sid, ev.id]);
    ev.streams = ev.streams.filter(s => s.id !== req.params.sid);
    // Répercuter immédiatement dans l'état courant et notifier les clients SSE
    if (ev.state && ev.state.streams) {
      delete ev.state.streams[req.params.sid];
      const total = Object.values(ev.state.streams).reduce((acc, s) => acc + (s.current || 0), 0);
      ev.state.total = total;
      const now = new Date();
      const payload = JSON.stringify({ type: 'tick', data: { ts: now, total, streams: Object.values(ev.state.streams) } });
      const set = clients.get(ev.id) || new Set();
      for (const client of set) client.write(`data: ${payload}\n\n`);
    }
    res.json({ ok: true });
  } catch {
    res.status(404).end();
  }
});

// Suppression logique d'un évènement (soft delete)
app.delete('/events/:id', requireAuth, async (req, res) => {
  try {
    const ev = getEvent(req.params.id);
    // Marquer comme supprimé dans la base
    await pool.query('UPDATE events SET is_deleted=true, deleted_at=NOW() WHERE id=$1', [ev.id]);
    // Arrêter le polling
    if (ev.timer) { clearInterval(ev.timer); ev.timer = null; }
    // Fermer les clients SSE attachés
    const set = clients.get(ev.id);
    if (set) {
      for (const client of set) {
        try { client.end(); } catch {}
      }
      clients.delete(ev.id);
    }
    // Retirer de l'état en mémoire
    events.delete(ev.id);
    res.status(204).end();
  } catch (e) {
    res.status(404).end();
  }
});

app.get('/events/:id/now', (req, res) => {
  try {
    const ev = getEvent(req.params.id);
    res.json({ total: ev.state.total, streams: Object.values(ev.state.streams) });
  } catch {
    res.status(404).end();
  }
});

app.get('/events/:id/stream', async (req, res) => {
  try {
    const ev = getEvent(req.params.id);
    // CORS pour SSE: autoriser seulement les origines configurées
    const reqOrigin = req.headers.origin;
    const isAllowed = ALLOW_ALL || !reqOrigin || ALLOWED_ORIGINS.has(reqOrigin);
    const origin = isAllowed ? (reqOrigin || '*') : Array.from(ALLOWED_ORIGINS)[0] || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '600');
    res.setHeader('Vary', 'Origin');
    // Indiquer aux reverse proxies (ex: Nginx) de ne pas bufferiser le flux SSE
    res.setHeader('X-Accel-Buffering', 'no');
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });
    const set = clients.get(ev.id) || new Set();
    set.add(res);
    clients.set(ev.id, set);
    req.on('close', () => set.delete(res));
    // Historique configurable (par défaut 60 min) et limité par MAX_HISTORY_MINUTES
    const { from, to, minutes } = parseRange(req, 60);
    let rows;
    if (from && to) {
      rows = (await pool.query('SELECT ts,total FROM samples WHERE event_id=$1 AND ts BETWEEN $2 AND $3 ORDER BY ts', [ev.id, from, to])).rows;
    } else {
      const intervalStr = `${minutes} minutes`;
      rows = (await pool.query('SELECT ts,total FROM samples WHERE event_id=$1 AND ts > NOW() - $2::interval ORDER BY ts', [ev.id, intervalStr])).rows;
    }
    const payload = JSON.stringify({ type: 'init', data: { state: ev.state, history: rows } });
    res.write(`data: ${payload}\n\n`);
  } catch {
    res.status(404).end();
  }
});
// Préflight dédié pour la route SSE (utile si le client envoie des headers custom)
app.options('/events/:id/stream', (req, res) => {
  const reqOrigin = req.headers.origin;
  const isAllowed = ALLOW_ALL || !reqOrigin || ALLOWED_ORIGINS.has(reqOrigin);
  const origin = isAllowed ? (reqOrigin || '*') : Array.from(ALLOWED_ORIGINS)[0] || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '600');
  res.setHeader('Vary', 'Origin');
  res.status(204).end();
});

// Historique JSON
app.get('/events/:id/history', async (req, res) => {
  try {
    const ev = getEvent(req.params.id);
    const { from, to, minutes } = parseRange(req, 180);
    const limit = Math.min(parseInt(req.query.limit || '20000', 10) || 20000, 200000);
    const afterTs = req.query.afterTs ? new Date(req.query.afterTs) : undefined;
    const baseParams = [ev.id];
    let rows;
    if (from && to) {
      rows = (await pool.query('SELECT ts,total FROM samples WHERE event_id=$1 AND ts BETWEEN $2 AND $3 ORDER BY ts LIMIT $4', [ev.id, from, to, limit])).rows;
    } else if (afterTs && !isNaN(afterTs.getTime())) {
      const intervalStr = `${minutes} minutes`;
      rows = (await pool.query('SELECT ts,total FROM samples WHERE event_id=$1 AND ts > $2 ORDER BY ts LIMIT $3', [ev.id, afterTs, limit])).rows;
    } else {
      const intervalStr = `${minutes} minutes`;
      rows = (await pool.query('SELECT ts,total FROM samples WHERE event_id=$1 AND ts > NOW() - $2::interval ORDER BY ts LIMIT $3', [ev.id, intervalStr, limit])).rows;
    }
    let streamsRows = [];
    if (req.query.streams === '1' || req.query.streams === 'true') {
      if (from && to) {
        const r = await pool.query('SELECT ts, stream_id, concurrent_viewers FROM stream_samples WHERE event_id=$1 AND ts BETWEEN $2 AND $3 ORDER BY ts LIMIT $4', [ev.id, from, to, limit]);
        streamsRows = r.rows;
      } else if (afterTs && !isNaN(afterTs.getTime())) {
        const r = await pool.query('SELECT ts, stream_id, concurrent_viewers FROM stream_samples WHERE event_id=$1 AND ts > $2 ORDER BY ts LIMIT $3', [ev.id, afterTs, limit]);
        streamsRows = r.rows;
      } else {
        const intervalStr = `${minutes} minutes`;
        const r = await pool.query('SELECT ts, stream_id, concurrent_viewers FROM stream_samples WHERE event_id=$1 AND ts > NOW() - $2::interval ORDER BY ts LIMIT $3', [ev.id, intervalStr, limit]);
        streamsRows = r.rows;
      }
    }
    res.json({ history: rows, streams: streamsRows });
  } catch {
    res.status(404).end();
  }
});

// Export CSV des totaux
app.get('/events/:id/history.csv', async (req, res) => {
  try {
    const ev = getEvent(req.params.id);
    const { from, to, minutes } = parseRange(req, 180);
    const batch = Math.min(parseInt(req.query.batch || '20000', 10) || 20000, 200000);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="event_${ev.id}_history_${minutes}m.csv"`);
    res.setHeader('Transfer-Encoding', 'chunked');
    if (res.flushHeaders) res.flushHeaders();
    res.write('timestamp,total\n');
    let offset = 0;
    while (true) {
      let rows;
      if (from && to) {
        rows = (await pool.query('SELECT ts,total FROM samples WHERE event_id=$1 AND ts BETWEEN $2 AND $3 ORDER BY ts LIMIT $4 OFFSET $5', [ev.id, from, to, batch, offset])).rows;
      } else {
        const intervalStr = `${minutes} minutes`;
        rows = (await pool.query('SELECT ts,total FROM samples WHERE event_id=$1 AND ts > NOW() - $2::interval ORDER BY ts LIMIT $3 OFFSET $4', [ev.id, intervalStr, batch, offset])).rows;
      }
      if (!rows.length) break;
      for (const row of rows) {
        const ts = new Date(row.ts).toISOString();
        res.write(`${ts},${row.total}\n`);
      }
      offset += rows.length;
    }
    res.end();
  } catch {
    res.status(404).end();
  }
});

// Export CSV par stream
app.get('/events/:id/streams/history.csv', async (req, res) => {
  try {
    const ev = getEvent(req.params.id);
    const { from, to, minutes } = parseRange(req, 180);
    const batch = Math.min(parseInt(req.query.batch || '20000', 10) || 20000, 200000);
    const labelMap = new Map(ev.streams.map(s => [s.id, s.label]));
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="event_${ev.id}_streams_history_${minutes}m.csv"`);
    res.setHeader('Transfer-Encoding', 'chunked');
    if (res.flushHeaders) res.flushHeaders();
    res.write('timestamp,stream_id,label,viewers\n');
    let offset = 0;
    while (true) {
      let rows;
      if (from && to) {
        rows = (await pool.query('SELECT ts, stream_id, concurrent_viewers FROM stream_samples WHERE event_id=$1 AND ts BETWEEN $2 AND $3 ORDER BY ts LIMIT $4 OFFSET $5', [ev.id, from, to, batch, offset])).rows;
      } else {
        const intervalStr = `${minutes} minutes`;
        rows = (await pool.query('SELECT ts, stream_id, concurrent_viewers FROM stream_samples WHERE event_id=$1 AND ts > NOW() - $2::interval ORDER BY ts LIMIT $3 OFFSET $4', [ev.id, intervalStr, batch, offset])).rows;
      }
      if (!rows.length) break;
      for (const row of rows) {
        const ts = new Date(row.ts).toISOString();
        const label = labelMap.get(row.stream_id) || '';
        res.write(`${ts},${row.stream_id},${JSON.stringify(label)},${row.concurrent_viewers}\n`);
      }
      offset += rows.length;
    }
    res.end();
  } catch {
    res.status(404).end();
  }
});

// Export CSV pour un stream spécifique
app.get('/events/:id/streams/:sid/history.csv', async (req, res) => {
  try {
    const ev = getEvent(req.params.id);
    const sid = req.params.sid;
    const { from, to, minutes } = parseRange(req, 180);
    const batch = Math.min(parseInt(req.query.batch || '20000', 10) || 20000, 200000);
    const label = ev.streams.find(s => s.id === sid)?.label || '';
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="event_${ev.id}_${sid}_history_${minutes}m.csv"`);
    res.setHeader('Transfer-Encoding', 'chunked');
    if (res.flushHeaders) res.flushHeaders();
    res.write('timestamp,stream_id,label,viewers\n');
    let offset = 0;
    while (true) {
      let rows;
      if (from && to) {
        rows = (await pool.query('SELECT ts, concurrent_viewers FROM stream_samples WHERE event_id=$1 AND stream_id=$2 AND ts BETWEEN $3 AND $4 ORDER BY ts LIMIT $5 OFFSET $6', [ev.id, sid, from, to, batch, offset])).rows;
      } else {
        const intervalStr = `${minutes} minutes`;
        rows = (await pool.query('SELECT ts, concurrent_viewers FROM stream_samples WHERE event_id=$1 AND stream_id=$2 AND ts > NOW() - $3::interval ORDER BY ts LIMIT $4 OFFSET $5', [ev.id, sid, intervalStr, batch, offset])).rows;
      }
      if (!rows.length) break;
      for (const row of rows) {
        const ts = new Date(row.ts).toISOString();
        res.write(`${ts},${sid},${JSON.stringify(label)},${row.concurrent_viewers}\n`);
      }
      offset += rows.length;
    }
    res.end();
  } catch {
    res.status(404).end();
  }
});

// Exports asynchrones basiques (job en mémoire)
const exportJobs = new Map();
app.post('/events/:id/export', requireAuth, async (req, res) => {
  try {
    const ev = getEvent(req.params.id);
    const { type = 'total', sid, minutes, from, to } = req.body || {};
    const jobId = genId();
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'viewerhub-'));
    const filePath = path.join(tmpDir, `${ev.id}-${type}-${Date.now()}.csv`);
    exportJobs.set(jobId, { status: 'pending', filePath, type, progress: 0, error: null });
    res.json({ jobId });
    setImmediate(async () => {
      const update = (patch) => exportJobs.set(jobId, { ...exportJobs.get(jobId), ...patch });
      try {
        update({ status: 'running' });
        const ws = fs.createWriteStream(filePath, { encoding: 'utf8' });
        ws.write('timestamp');
        if (type === 'total') {
          ws.write(',total\n');
        } else if (type === 'streams') {
          ws.write(',stream_id,label,viewers\n');
        } else if (type === 'stream' && sid) {
          ws.write(',stream_id,label,viewers\n');
        }
        const { from: f, to: t, minutes: m } = { ...parseRange({ query: { minutes, from, to } }, 180) };
        const batch = 50000;
        let offset = 0;
        const labelMap = new Map(ev.streams.map(s => [s.id, s.label]));
        while (true) {
          let rows = [];
          if (type === 'total') {
            if (f && t) {
              rows = (await pool.query('SELECT ts,total FROM samples WHERE event_id=$1 AND ts BETWEEN $2 AND $3 ORDER BY ts LIMIT $4 OFFSET $5', [ev.id, f, t, batch, offset])).rows;
            } else {
              const intervalStr = `${m} minutes`;
              rows = (await pool.query('SELECT ts,total FROM samples WHERE event_id=$1 AND ts > NOW() - $2::interval ORDER BY ts LIMIT $3 OFFSET $4', [ev.id, intervalStr, batch, offset])).rows;
            }
          } else if (type === 'streams') {
            if (f && t) {
              rows = (await pool.query('SELECT ts, stream_id, concurrent_viewers FROM stream_samples WHERE event_id=$1 AND ts BETWEEN $2 AND $3 ORDER BY ts LIMIT $4 OFFSET $5', [ev.id, f, t, batch, offset])).rows;
            } else {
              const intervalStr = `${m} minutes`;
              rows = (await pool.query('SELECT ts, stream_id, concurrent_viewers FROM stream_samples WHERE event_id=$1 AND ts > NOW() - $2::interval ORDER BY ts LIMIT $3 OFFSET $4', [ev.id, intervalStr, batch, offset])).rows;
            }
          } else if (type === 'stream' && sid) {
            if (f && t) {
              rows = (await pool.query('SELECT ts, concurrent_viewers FROM stream_samples WHERE event_id=$1 AND stream_id=$2 AND ts BETWEEN $3 AND $4 ORDER BY ts LIMIT $5 OFFSET $6', [ev.id, sid, f, t, batch, offset])).rows;
            } else {
              const intervalStr = `${m} minutes`;
              rows = (await pool.query('SELECT ts, concurrent_viewers FROM stream_samples WHERE event_id=$1 AND stream_id=$2 AND ts > NOW() - $3::interval ORDER BY ts LIMIT $4 OFFSET $5', [ev.id, sid, intervalStr, batch, offset])).rows;
            }
          }
          if (!rows.length) break;
          for (const row of rows) {
            const ts = new Date(row.ts).toISOString();
            if (type === 'total') {
              ws.write(`${ts},${row.total}\n`);
            } else if (type === 'streams') {
              const label = labelMap.get(row.stream_id) || '';
              ws.write(`${ts},${row.stream_id},${JSON.stringify(label)},${row.concurrent_viewers}\n`);
            } else if (type === 'stream' && sid) {
              const label = labelMap.get(sid) || '';
              ws.write(`${ts},${sid},${JSON.stringify(label)},${row.concurrent_viewers}\n`);
            }
          }
          offset += rows.length;
          update({ progress: offset });
        }
        ws.end();
        update({ status: 'done' });
      } catch (e) {
        update({ status: 'error', error: String(e?.message || e) });
      }
    });
  } catch (e) {
    res.status(404).json({ error: 'not_found' });
  }
});

app.get('/exports/:jobId/status', (req, res) => {
  const job = exportJobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'not_found' });
  res.json({ status: job.status, progress: job.progress, type: job.type });
});

app.get('/exports/:jobId/download', (req, res) => {
  const job = exportJobs.get(req.params.jobId);
  if (!job || job.status !== 'done') return res.status(404).json({ error: 'not_ready' });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${path.basename(job.filePath)}"`);
  const rs = fs.createReadStream(job.filePath);
  rs.pipe(res);
});

// Routes pour contrôler la pause/start
app.post('/events/:id/pause', requireAuth, async (req, res) => {
  try {
    const ev = getEvent(req.params.id);
    await pool.query('UPDATE events SET is_paused = TRUE WHERE id = $1', [ev.id]);
    ev.is_paused = true;
    // Arrêter complètement le polling pendant la pause
    if (ev.timer) {
      clearInterval(ev.timer);
      ev.timer = null;
    }
    res.json({ ok: true, paused: true });
  } catch {
    res.status(404).end();
  }
});

app.post('/events/:id/start', requireAuth, async (req, res) => {
  try {
    const ev = getEvent(req.params.id);
    await pool.query('UPDATE events SET is_paused = FALSE WHERE id = $1', [ev.id]);
    ev.is_paused = false;
    // Relancer le polling si il avait été arrêté
    if (!ev.timer) {
      startPolling(ev.id);
    }
    res.json({ ok: true, paused: false });
  } catch {
    res.status(404).end();
  }
});

// Routes pour gérer les favoris
app.post('/events/:id/streams/:sid/favorite', requireAuth, async (req, res) => {
  try {
    const ev = getEvent(req.params.id);
    const { is_favorite } = req.body;
    await pool.query('UPDATE streams SET is_favorite = $1 WHERE id = $2 AND event_id = $3', [is_favorite, req.params.sid, ev.id]);
    const stream = ev.streams.find(s => s.id === req.params.sid);
    if (stream) {
      stream.is_favorite = is_favorite;
    }
    res.json({ ok: true, is_favorite });
  } catch {
    res.status(404).end();
  }
});

// Route pour réactiver un stream désactivé
app.post('/events/:id/streams/:sid/reactivate', requireAuth, async (req, res) => {
  try {
    const ev = getEvent(req.params.id);
    await pool.query('UPDATE streams SET is_disabled = FALSE, failure_count = 0, last_failure_at = NULL WHERE id = $1 AND event_id = $2', [req.params.sid, ev.id]);
    const stream = ev.streams.find(s => s.id === req.params.sid);
    if (stream) {
      stream.is_disabled = false;
      stream.failure_count = 0;
      stream.last_failure_at = null;
    }
    res.json({ ok: true });
  } catch {
    res.status(404).end();
  }
});

// Route pour récupérer le titre d'une vidéo YouTube
app.get('/youtube/title/:videoId', async (req, res) => {
  try {
    const videoId = req.params.videoId;
    if (!process.env.YT_API_KEY) {
      return res.status(400).json({ error: 'YT_API_KEY manquant' });
    }

    const cached = titleCache.get(videoId);
    if (cached && (Date.now() - cached.ts) < TITLE_TTL_MS) {
      return res.json({ title: cached.title });
    }

    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${process.env.YT_API_KEY}`;
    const response = await fetch(url, { timeout: 10000 });
    const data = await response.json();
    
    if (data.items && data.items.length > 0) {
      const title = data.items[0].snippet.title;
      titleCache.set(videoId, { title, ts: Date.now() });
      res.json({ title });
    } else {
      res.status(404).json({ error: 'Vidéo non trouvée' });
    }
  } catch (error) {
    console.error('Erreur lors de la récupération du titre YouTube:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour modifier un stream existant
app.put('/events/:id/streams/:sid', requireAuth, async (req, res) => {
  try {
    const ev = getEvent(req.params.id);
    const { label, customTitle, customInterval } = req.body;
    const intervalSec = customInterval ? Math.max(2, Math.min(300, parseInt(customInterval))) : null;
    
    await pool.query('UPDATE streams SET label=$1, custom_title=$2, custom_interval_sec=$3 WHERE id=$4 AND event_id=$5', 
      [label, customTitle || null, intervalSec, req.params.sid, ev.id]);
    
    const stream = ev.streams.find(s => s.id === req.params.sid);
    if (stream) {
      stream.label = label;
      stream.custom_title = customTitle || null;
      stream.custom_interval_sec = intervalSec;
    }
    
    res.json({ ok: true });
  } catch {
    res.status(404).end();
  }
});

// Pause d'un flux individuel
app.post('/events/:id/streams/:sid/pause', requireAuth, async (req, res) => {
  try {
    const ev = getEvent(req.params.id);
    await pool.query('UPDATE streams SET is_paused=TRUE WHERE id=$1 AND event_id=$2', [req.params.sid, ev.id]);
    
    const stream = ev.streams.find(s => s.id === req.params.sid);
    if (stream) {
      stream.is_paused = true;
    }
    
    res.json({ ok: true });
  } catch {
    res.status(404).end();
  }
});

// Démarrage d'un flux individuel
app.post('/events/:id/streams/:sid/start', requireAuth, async (req, res) => {
  try {
    const ev = getEvent(req.params.id);
    await pool.query('UPDATE streams SET is_paused=FALSE WHERE id=$1 AND event_id=$2', [req.params.sid, ev.id]);
    
    const stream = ev.streams.find(s => s.id === req.params.sid);
    if (stream) {
      stream.is_paused = false;
    }
    
    res.json({ ok: true });
  } catch {
    res.status(404).end();
  }
});

init().then(() => {
  app.listen(process.env.PORT || 4000, () => console.log('Backend prêt sur', process.env.PORT || 4000));
});
