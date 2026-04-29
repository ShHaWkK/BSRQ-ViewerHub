import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getEvents } from '../api.js';
import bsrqLogo from '../assets/bsrq.png';

export default function ClientHome() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
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

        {/* Header */}
        <div style={{
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 20,
          padding: '2rem 1.5rem',
          textAlign: 'center',
          marginBottom: '1.25rem',
        }}>
          <img src={bsrqLogo} alt="BSRQ" style={{ height: 52, marginBottom: 16 }} />
          <h1 style={{
            margin: '0 0 0.5rem',
            fontSize: '1.9rem',
            fontWeight: 800,
            background: 'linear-gradient(90deg, #60a5fa, #34d399)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}>
            Évènements en ligne
          </h1>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>
            Choisissez un évènement pour accéder aux streams et statistiques.
          </p>
        </div>

        {/* Toolbar — sans lien admin */}
        <div className="toolbar">
          <div className="toolbar-pills">
            {['all', 'active', 'paused'].map(key => {
              const label = key === 'all' ? 'Tous' : (key === 'active' ? 'Actifs' : 'En pause');
              const isActive = filter === key;
              const variant = key === 'active' ? 'pill--success' : (key === 'paused' ? 'pill--warning' : '');
              return (
                <button key={key} onClick={() => setFilter(key)} className={`pill ${variant} ${isActive ? 'is-active' : ''}`}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading skeletons */}
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

        {/* Event cards — sans hover sur la card */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1rem',
        }}>
          {filtered.map(ev => (
            <div
              key={ev.id}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16,
                padding: '1.5rem',
              }}
            >
              {/* Event header */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: '1.25rem',
                gap: 8,
              }}>
                <div style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.88)',
                  lineHeight: 1.3,
                }}>
                  {ev.name}
                </div>
                <span className={`badge ${ev.is_paused ? 'badge--warning' : 'badge--success'}`} style={{ flexShrink: 0 }}>
                  {ev.is_paused ? 'En pause' : 'Actif'}
                </span>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link
                  to={`/event/${ev.id}/live`}
                  style={{
                    flex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '10px 14px',
                    background: 'linear-gradient(135deg, #10b981, #3b82f6)',
                    border: 'none',
                    borderRadius: 10,
                    color: 'white',
                    textDecoration: 'none',
                    fontSize: 13,
                    fontWeight: 700,
                    transition: 'filter 0.15s, transform 0.15s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.15)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  ▶ Direct
                </Link>
                <Link
                  to={`/event/${ev.id}/stats`}
                  style={{
                    flex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '10px 14px',
                    background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
                    border: 'none',
                    borderRadius: 10,
                    color: 'white',
                    textDecoration: 'none',
                    fontSize: 13,
                    fontWeight: 700,
                    transition: 'filter 0.15s, transform 0.15s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.15)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  📊 Tableau de bord
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
