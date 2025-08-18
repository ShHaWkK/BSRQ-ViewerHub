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
