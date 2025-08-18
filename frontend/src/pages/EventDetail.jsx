import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getEvent, addStream, removeStream } from '../api.js';

export default function EventDetail() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [form, setForm] = useState({ label: '', urlOrId: '' });

  async function refresh() {
    const ev = await getEvent(id);
    setEvent(ev);
  }
  useEffect(() => { refresh(); }, [id]);

  const submit = async e => {
    e.preventDefault();
    await addStream(id, form);
    setForm({ label: '', urlOrId: '' });
    refresh();
  };

  const del = async sid => {
    await removeStream(id, sid);
    refresh();
  };

  if (!event) return null;

  return (
    <div>
      <header>
        <h1>{event.name}</h1>
        <Link to={`/event/${id}/dashboard`}>Afficher le Dashboard</Link>
      </header>
      <ul>
        {event.streams.map(s => (
          <li key={s.id}>{s.label} <button onClick={() => del(s.id)}>Supprimer</button></li>
        ))}
      </ul>
      <form onSubmit={submit} style={{ marginTop: '1rem' }}>
        <input placeholder="Label" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} />
        <input placeholder="URL ou ID" value={form.urlOrId} onChange={e => setForm({ ...form, urlOrId: e.target.value })} />
        <button type="submit">Ajouter le stream</button>
      </form>
    </div>
  );
}
