import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import pool, { migrate } from './db.js';
import { extractVideoId, generateAutoLabel } from '../utils/youtube.js';
import { genId } from '../utils/id.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());
// Autoriser toutes les origines en développement pour éviter les erreurs CORS locales
app.use(cors());

// Rate limit simple pour endpoints admin
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/events', limiter);

const events = new Map(); // état en mémoire
const clients = new Map(); // SSE clients par évènement

async function init() {
  await migrate();
  // Charger les évènements existants
  const { rows: evs } = await pool.query('SELECT * FROM events');
  for (const ev of evs) {
    ev.streams = (await pool.query('SELECT * FROM streams WHERE event_id=$1', [ev.id])).rows;
    // Initialiser les propriétés par défaut si elles n'existent pas
    ev.is_paused = ev.is_paused || false;
    for (const stream of ev.streams) {
      stream.is_favorite = stream.is_favorite || false;
      stream.failure_count = stream.failure_count || 0;
      stream.is_disabled = stream.is_disabled || false;
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
    
    const ids = activeStreams.map(s => s.video_id);
    const chunks = [];
    while (ids.length) chunks.push(ids.splice(0, 50));
    let total = 0;
    const now = new Date();
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
          const stream = activeStreams.find(s => s.video_id === videoId);
          if (stream) {
            await handleStreamFailure(stream, ev.id);
          }
        }
        continue;
      }
      
      // Traiter les réponses réussies
      for (const item of data.items || []) {
        const id = item.id;
        const stream = activeStreams.find(s => s.video_id === id);
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
      }
      
      // Gérer les streams qui n'ont pas de réponse (potentiellement en échec)
      for (const videoId of chunk) {
        const stream = activeStreams.find(s => s.video_id === videoId);
        if (stream && !data.items?.find(item => item.id === videoId)) {
          await handleStreamFailure(stream, ev.id);
        }
      }
    }
    
    ev.state = { total, streams: streamStates };
    await pool.query('INSERT INTO samples(event_id, ts, total) VALUES($1,$2,$3)', [ev.id, now, total]);
    // Notifier SSE
    const payload = JSON.stringify({ type: 'tick', data: { ts: now, total, streams: Object.values(streamStates) } });
    const set = clients.get(ev.id) || new Set();
    for (const res of set) res.write(`data: ${payload}\n\n`);
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
app.get('/health', (req, res) => res.json({ ok: true }));

app.post('/events', async (req, res) => {
  const { name, pollIntervalSec } = req.body;
  const poll = Math.max(2, parseInt(pollIntervalSec || process.env.POLL_INTERVAL_DEFAULT)) * 1000;
  const id = genId();
  await pool.query('INSERT INTO events(id,name,poll_interval_ms) VALUES($1,$2,$3)', [id, name, poll]);
  const ev = { id, name, poll_interval_ms: poll, streams: [], state: { total: 0, streams: {} } };
  events.set(id, ev);
  startPolling(id);
  res.json({ id: ev.id, name: ev.name, pollIntervalSec: ev.poll_interval_ms / 1000, streams: ev.streams, state: ev.state });
});

app.get('/events', (req, res) => {
  res.json(Array.from(events.values()).map(e => ({ id: e.id, name: e.name, pollIntervalSec: e.poll_interval_ms / 1000 })));
});

app.get('/events/:id', (req, res) => {
  try {
    const ev = getEvent(req.params.id);
    res.json({ id: ev.id, name: ev.name, pollIntervalSec: ev.poll_interval_ms / 1000, streams: ev.streams, state: ev.state });
  } catch {
    res.status(404).end();
  }
});

app.post('/events/:id/streams', async (req, res) => {
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

app.delete('/events/:id/streams/:sid', async (req, res) => {
  try {
    const ev = getEvent(req.params.id);
    await pool.query('DELETE FROM streams WHERE id=$1 AND event_id=$2', [req.params.sid, ev.id]);
    ev.streams = ev.streams.filter(s => s.id !== req.params.sid);
    res.json({ ok: true });
  } catch {
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
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });
    res.write('\n');
    const set = clients.get(ev.id) || new Set();
    set.add(res);
    clients.set(ev.id, set);
    req.on('close', () => set.delete(res));
    // Historique 60 min
    const { rows } = await pool.query('SELECT ts,total FROM samples WHERE event_id=$1 AND ts > NOW() - INTERVAL \'60 minutes\' ORDER BY ts', [ev.id]);
    const payload = JSON.stringify({ type: 'init', data: { state: ev.state, history: rows } });
    res.write(`data: ${payload}\n\n`);
  } catch {
    res.status(404).end();
  }
});

// Routes pour contrôler la pause/start
app.post('/events/:id/pause', async (req, res) => {
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

app.post('/events/:id/start', async (req, res) => {
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
app.post('/events/:id/streams/:sid/favorite', async (req, res) => {
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
app.post('/events/:id/streams/:sid/reactivate', async (req, res) => {
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
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${process.env.YT_API_KEY}`;
    
    const response = await fetch(url, { timeout: 10000 });
    const data = await response.json();
    
    if (data.items && data.items.length > 0) {
      const title = data.items[0].snippet.title;
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
app.put('/events/:id/streams/:sid', async (req, res) => {
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
app.post('/events/:id/streams/:sid/pause', async (req, res) => {
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
app.post('/events/:id/streams/:sid/start', async (req, res) => {
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
