import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import fetch from 'node-fetch'; // Node 18 global but to ensure
import pool, { migrate } from './db.js';
import { extractVideoId } from '../utils/youtube.js';
import { genId } from '../utils/id.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN }));

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
    if (!ev.streams.length) return;
    const ids = ev.streams.map(s => s.video_id);
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
        continue;
      }
      for (const item of data.items || []) {
        const id = item.id;
        const stream = ev.streams.find(s => s.video_id === id);
        const viewers = item.liveStreamingDetails?.concurrentViewers ? parseInt(item.liveStreamingDetails.concurrentViewers) : 0;
        const online = !!item.liveStreamingDetails?.concurrentViewers;
        streamStates[stream.id] = { id: stream.id, label: stream.label, current: viewers, online };
        total += viewers;
        await pool.query('INSERT INTO stream_samples(event_id, stream_id, ts, concurrent_viewers) VALUES($1,$2,$3,$4)', [ev.id, stream.id, now, viewers]);
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
  res.json(ev);
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
    const { label, urlOrId } = req.body;
    const videoId = extractVideoId(urlOrId);
    if (!videoId) return res.status(400).json({ error: 'id invalide' });
    const id = genId();
    await pool.query('INSERT INTO streams(id,event_id,label,video_id) VALUES($1,$2,$3,$4)', [id, ev.id, label, videoId]);
    const stream = { id, event_id: ev.id, label, video_id: videoId };
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

init().then(() => {
  app.listen(process.env.PORT || 4000, () => console.log('Backend prêt sur', process.env.PORT || 4000));
});
