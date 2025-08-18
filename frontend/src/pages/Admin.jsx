import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getEvents, createEvent } from '../api.js';

export default function Admin() {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState({ name: '', pollIntervalSec: 5 });

  useEffect(() => { getEvents().then(setEvents); }, []);

  const submit = async e => {
    e.preventDefault();
    const ev = await createEvent(form);
    setEvents([...events, ev]);
  };

  return (
    <div>
      <header><h1>Évènements</h1></header>
      <ul>
        {events.map(ev => (
          <li key={ev.id}>
            {ev.name} - {ev.pollIntervalSec}s <Link to={`/admin/event/${ev.id}`}>ouvrir</Link>
          </li>
        ))}
      </ul>
      <form onSubmit={submit} style={{ marginTop: '1rem' }}>
        <input placeholder="Nom" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <input type="number" min="2" value={form.pollIntervalSec} onChange={e => setForm({ ...form, pollIntervalSec: e.target.value })} />
        <button type="submit">Créer un évènement</button>
      </form>
    </div>
  );
}
