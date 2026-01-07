import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getEvents } from '../api.js';
import bsrqLogo from '../assets/bsrq.png';

export default function ClientHome() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all | active | paused
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    let mounted = true;
    getEvents()
      .then(list => { if (mounted) setEvents(list || []); })
      .catch(() => mounted && setError('Impossible de charger les évènements'))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 640px)');
    const handler = () => setIsMobile(mql.matches);
    handler();
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  const filtered = events.filter(ev => {
    if (filter === 'active') return !ev.is_paused;
    if (filter === 'paused') return !!ev.is_paused;
    return true;
  });

  return (
    <div className="app-bg">
      <div className="container" style={{ paddingTop: '6vh' }}>
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '20px',
        padding: '2rem 1rem',
        textAlign: 'center',
        marginBottom: '1rem',
      }}
    >
      <div style={{ marginBottom: '1rem' }}>
        <img src={bsrqLogo} alt="BSRQ" style={{ height: '60px' }} />
      </div>
      <h1
        style={{
          margin: '0 0 0.6rem 0',
          fontSize: '2.2rem',
          fontWeight: '700',
          background: 'linear-gradient(45deg, #f59e0b, #ef4444, #0c2164ff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        🎬 Évènements en ligne
      </h1>
      <div style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
        Choisissez un évènement pour ouvrir le viewer public en direct.
      </div>
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

    <div
      style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1rem',
      }}
    >
      {filtered.map(ev => (
        <div
          key={ev.id}
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '16px',
            padding: '1.5rem',
            margin: '0.5rem 0',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            overflow: 'hidden',
            transform: 'translateY(0)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px) scale(1.02)';
            e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
            }}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  background: 'linear-gradient(45deg, #10b981, #3b82f6)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {ev.name}
              </div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Polling: {ev.pollIntervalSec}s</div>
            </div>
            <span className={`badge ${ev.is_paused ? 'badge--warning' : 'badge--success'}`}>
              {ev.is_paused ? 'En pause' : 'Actif'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link to={`/event/${ev.id}/live`} className="btn btn--brand-gb">Visionner le direct</Link>
            <Link to={`/event/${ev.id}/stats`} className="btn btn--brand-bp">Tableau de bord</Link>
          </div>
        </div>
      ))}
    </div>
      </div>
    </div>
  );
}
