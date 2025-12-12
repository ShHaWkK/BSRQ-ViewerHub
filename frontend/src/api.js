const HOST = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const PROTO = typeof window !== 'undefined' ? window.location.protocol : 'http:';
const DEFAULT_API = `${PROTO}//${HOST}:4000`;
const API = import.meta.env.VITE_API_URL || DEFAULT_API;

function joinUrl(base, path) {
  const b = (base || '').replace(/\/+$/, '');
  const p = (path || '').replace(/^\/+/, '');
  return `${b}/${p}`;
}

const API_IS_RELATIVE = typeof API === 'string' && API.startsWith('/');

async function fetchWithFallback(path, options) {
  // Première tentative: base explicitement configurée (peut être relative '/api')
  const primaryUrl = joinUrl(API, path);
  let res = await fetch(primaryUrl, options);
  const ct = res.headers.get('content-type') || '';
  // Si on obtient du HTML avec une base relative, on retente vers l'API directe (port 4000)
  const looksHtml = ct.includes('text/html');
  if (API_IS_RELATIVE && looksHtml) {
    const fallbackUrl = joinUrl(DEFAULT_API, path);
    try {
      const res2 = await fetch(fallbackUrl, options);
      return res2;
    } catch {
      // en cas d'échec, retourner la réponse initiale pour que l'erreur soit explicite
      return res;
    }
  }
  return res;
}

async function readJsonOrThrow(res) {
  const ct = res.headers.get('content-type') || '';
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.url || ''} -> HTTP ${res.status}: ${text?.slice(0, 200) || ''}`);
  }
  if (!ct.includes('application/json')) {
    const body = await res.clone().text().catch(() => '');
    throw new Error(`${res.url || ''} -> Non-JSON response (${ct}). Body: ${body.slice(0, 200)}`);
  }
  try {
    return await res.json();
  } catch (e) {
    const body = await res.clone().text().catch(() => '');
    throw new Error(`${res.url || ''} -> Invalid JSON. Body: ${body.slice(0, 200)}`);
  }
}

export async function getEvents() {
  const res = await fetchWithFallback('/events');
  return readJsonOrThrow(res);
}

export async function createEvent(data) {
  const res = await fetchWithFallback('/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return readJsonOrThrow(res);
}

export async function getEvent(id) {
  const res = await fetchWithFallback(`/events/${id}`);
  return readJsonOrThrow(res);
}

export async function deleteEvent(id) {
  const res = await fetchWithFallback(`/events/${id}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) {
    const text = await res.text().catch(() => '');
    throw new Error(`DELETE /events/${id} -> HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
}

export async function addStream(id, data) {
  const res = await fetchWithFallback(`/events/${id}/streams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return readJsonOrThrow(res);
}

export async function removeStream(eventId, streamId) {
  const res = await fetchWithFallback(`/events/${eventId}/streams/${streamId}`, { method: 'DELETE' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`DELETE /events/${eventId}/streams/${streamId} -> HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  // Le backend renvoie { ok: true } sur succès
  try {
    return await res.json();
  } catch {
    // Si pas de JSON, considérer comme succès (certains serveurs peuvent répondre 204)
    return { ok: true };
  }
}

// Fonctions pour contrôler la pause/start
export async function pauseEvent(eventId) {
  const res = await fetchWithFallback(`/events/${eventId}/pause`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return readJsonOrThrow(res);
}

export async function startEvent(eventId) {
  const res = await fetchWithFallback(`/events/${eventId}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return readJsonOrThrow(res);
}

// Mettre à jour les détails d'un évènement (nom, intervalle)
export async function updateEvent(eventId, { name, pollIntervalSec }) {
  const res = await fetchWithFallback(`/events/${eventId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, pollIntervalSec })
  });
  return readJsonOrThrow(res);
}

// Fonctions pour gérer les favoris
export async function toggleStreamFavorite(eventId, streamId, isFavorite) {
  const res = await fetchWithFallback(`/events/${eventId}/streams/${streamId}/favorite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_favorite: isFavorite })
  });
  return readJsonOrThrow(res);
}

// Fonction pour réactiver un stream désactivé
export async function reactivateStream(eventId, streamId) {
  const res = await fetchWithFallback(`/events/${eventId}/streams/${streamId}/reactivate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return readJsonOrThrow(res);
}

export async function updateStream(eventId, streamId, data) {
  const res = await fetchWithFallback(`/events/${eventId}/streams/${streamId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return readJsonOrThrow(res);
}

export async function pauseStream(eventId, streamId) {
  const res = await fetchWithFallback(`/events/${eventId}/streams/${streamId}/pause`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return readJsonOrThrow(res);
}

export async function startStream(eventId, streamId) {
  const res = await fetchWithFallback(`/events/${eventId}/streams/${streamId}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return readJsonOrThrow(res);
}

// Récupérer le titre YouTube avec repli si la base API relative renvoie du HTML
export async function getYoutubeTitle(videoId) {
  const res = await fetchWithFallback(`/youtube/title/${videoId}`);
  return readJsonOrThrow(res);
}

// Génération d'un magic link côté serveur (protégé)
export async function generateMagicLink(redirect, ttlSec = 60 * 60 * 24 * 60, aud = 'admin') {
  const res = await fetchWithFallback('/auth/magic', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ redirect, ttlSec, aud })
  });
  const data = await readJsonOrThrow(res);
  if (!data?.url) throw new Error('Réponse invalide lors de la génération du magic link');
  return data.url;
}
