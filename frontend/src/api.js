const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

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
  const res = await fetch(`${API}/events`);
  return readJsonOrThrow(res);
}

export async function createEvent(data) {
  const res = await fetch(`${API}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return readJsonOrThrow(res);
}

export async function getEvent(id) {
  const res = await fetch(`${API}/events/${id}`);
  return readJsonOrThrow(res);
}

export async function addStream(id, data) {
  const res = await fetch(`${API}/events/${id}/streams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return readJsonOrThrow(res);
}

export async function removeStream(eventId, streamId) {
  await fetch(`${API}/events/${eventId}/streams/${streamId}`, { method: 'DELETE' });
}

// Fonctions pour contrôler la pause/start
export async function pauseEvent(eventId) {
  const res = await fetch(`${API}/events/${eventId}/pause`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return readJsonOrThrow(res);
}

export async function startEvent(eventId) {
  const res = await fetch(`${API}/events/${eventId}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return readJsonOrThrow(res);
}

// Mettre à jour les détails d'un évènement (nom, intervalle)
export async function updateEvent(eventId, { name, pollIntervalSec }) {
  const res = await fetch(`${API}/events/${eventId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, pollIntervalSec })
  });
  return readJsonOrThrow(res);
}

// Fonctions pour gérer les favoris
export async function toggleStreamFavorite(eventId, streamId, isFavorite) {
  const res = await fetch(`${API}/events/${eventId}/streams/${streamId}/favorite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_favorite: isFavorite })
  });
  return readJsonOrThrow(res);
}

// Fonction pour réactiver un stream désactivé
export async function reactivateStream(eventId, streamId) {
  const res = await fetch(`${API}/events/${eventId}/streams/${streamId}/reactivate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return readJsonOrThrow(res);
}

export async function updateStream(eventId, streamId, data) {
  const res = await fetch(`${API}/events/${eventId}/streams/${streamId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return readJsonOrThrow(res);
}

export async function pauseStream(eventId, streamId) {
  const res = await fetch(`${API}/events/${eventId}/streams/${streamId}/pause`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return readJsonOrThrow(res);
}

export async function startStream(eventId, streamId) {
  const res = await fetch(`${API}/events/${eventId}/streams/${streamId}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return readJsonOrThrow(res);
}
