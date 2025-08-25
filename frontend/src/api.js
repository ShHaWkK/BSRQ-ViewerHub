const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export async function getEvents() {
  const res = await fetch(`${API}/events`);
  return res.json();
}

export async function createEvent(data) {
  const res = await fetch(`${API}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function getEvent(id) {
  const res = await fetch(`${API}/events/${id}`);
  return res.json();
}

export async function addStream(id, data) {
  const res = await fetch(`${API}/events/${id}/streams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
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
  return res.json();
}

export async function startEvent(eventId) {
  const res = await fetch(`${API}/events/${eventId}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return res.json();
}

// Fonctions pour gérer les favoris
export async function toggleStreamFavorite(eventId, streamId, isFavorite) {
  const res = await fetch(`${API}/events/${eventId}/streams/${streamId}/favorite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_favorite: isFavorite })
  });
  return res.json();
}

// Fonction pour réactiver un stream désactivé
export async function reactivateStream(eventId, streamId) {
  const res = await fetch(`${API}/events/${eventId}/streams/${streamId}/reactivate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return res.json();
}

export async function updateStream(eventId, streamId, data) {
  const res = await fetch(`${API}/events/${eventId}/streams/${streamId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function pauseStream(eventId, streamId) {
  const res = await fetch(`${API}/events/${eventId}/streams/${streamId}/pause`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return res.json();
}

export async function startStream(eventId, streamId) {
  const res = await fetch(`${API}/events/${eventId}/streams/${streamId}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return res.json();
}
