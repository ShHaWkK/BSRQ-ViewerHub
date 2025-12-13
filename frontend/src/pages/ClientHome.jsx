import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getEvents } from '../api.js';

export default function ClientHome() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all | active | paused

  useEffect(() => {
    let mounted = true;
    getEvents()
      .then(list => { if (mounted) setEvents(list || []); })
      .catch(() => mounted && setError('Impossible de charger les évènements'))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const filtered = events.filter(ev => {
    if (filter === 'active') return !ev.is_paused;
    if (filter === 'paused') return !!ev.is_paused;
    return true;
  });

  return (
    <div className="app-bg">
      <div className="container" style={{ paddingTop: '6vh' }}>
        {/* Hero */}
        <div className="hero">
          <h1 className="gradient-text" style={{ margin: 0, fontSize: '2rem' }}>Évènements en ligne</h1>
          <p className="muted" style={{ marginTop: 8 }}>Choisissez un évènement pour ouvrir le viewer public en direct.</p>
        </div>

        {/* Toolbar */}
        <div className="toolbar">
          <div className="toolbar-pills">
            {['all', 'active', 'paused'].map(key => {
              const label = key === 'all' ? 'Tous' : (key === 'active' ? 'Actifs' : 'En pause');
              const isActive = filter === key;
              const variant = key === 'active' ? 'pill--success' : (key === 'paused' ? 'pill--warning' : 'pill--all');
              const className = `pill ${variant} ${isActive ? 'is-active' : ''}`;
              return (
                <button key={key} onClick={() => setFilter(key)} className={className}>{label}</button>
              );
            })}
          </div>
          <Link to="/login?aud=admin" className="toolbar-link">Accès admin</Link>
        </div>

        {/* Loading */}
        {loading && (
          <div className="grid-auto">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton skeleton--96 card" />
            ))}
          </div>
        )}

        {/* Error */}
        {error && <div className="error-text" style={{ marginTop: 8 }}>{error}</div>}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="empty">
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Aucun évènement</div>
            <div style={{ fontSize: 13 }}>Revenez plus tard ou contactez votre organisateur.</div>
          </div>
        )}

        {/* Event cards */}
        <div className="grid-auto">
          {filtered.map(ev => (
            <div key={ev.id} className="card">
              <div className="card-header">
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{ev.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>Polling: {ev.pollIntervalSec}s</div>
                </div>
                <span className={`badge ${ev.is_paused ? 'badge--warning' : 'badge--success'}`}>
                  {ev.is_paused ? 'En pause' : 'Actif'}
                </span>
              </div>
              <div className="card-actions">
                <Link to={`/event/${ev.id}/live`} className="btn btn--brand-gb">Ouvrir le viewer</Link>
                <Link to={`/event/${ev.id}/stats`} className="btn btn--brand-bp">Dashboard</Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
