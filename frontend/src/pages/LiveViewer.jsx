import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getEvent } from '../api.js';
import bsrqLogo from '../assets/bsrq.png';

const LiveStreamCard = ({ stream, streamState }) => {
  const [viewerCount, setViewerCount] = useState(streamState?.current || 0);

  useEffect(() => {
    const target = streamState?.current || 0;
    if (target === viewerCount) return;
    const duration = 800;
    const start = Date.now();
    const from = viewerCount;
    const tick = () => {
      const p = Math.min((Date.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setViewerCount(Math.round(from + (target - from) * eased));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [streamState?.current]);

  const online = !!streamState?.online;

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${online ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: 20,
      overflow: 'hidden',
    }}>
      {/* Video */}
      <div style={{ position: 'relative', paddingTop: '56.25%', background: '#070d1a' }}>
        <iframe
          src={`https://www.youtube.com/embed/${stream.video_id}?autoplay=0&mute=1&controls=1`}
          title={stream.label}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        />
        {online && (
          <div style={{
            position: 'absolute',
            top: 12,
            left: 12,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(239,68,68,0.9)',
            backdropFilter: 'blur(8px)',
            borderRadius: 999,
            padding: '4px 12px',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.08em',
            color: 'white',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'white',
              animation: 'pulse 1.5s infinite',
            }} />
            LIVE
          </div>
        )}
      </div>

      {/* Meta */}
      <div style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.88)', marginBottom: 2 }}>
            {stream.label}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
            {online ? 'En direct' : 'Hors ligne'}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{
            fontSize: '1.6rem',
            fontWeight: 800,
            color: online ? 'white' : 'rgba(255,255,255,0.2)',
            lineHeight: 1,
          }}>
            {viewerCount.toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>spectateurs</div>
        </div>
      </div>
    </div>
  );
};

export default function LiveViewer() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [totalViewers, setTotalViewers] = useState(0);
  const esRef = useRef(null);
  const sseReconnectAttemptRef = useRef(0);
  const sseReconnectTimerRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    getEvent(id)
      .then(ev => {
        if (!mounted) return;
        setEvent(ev);
        setTotalViewers(ev?.state?.total || 0);
        setIsLoading(false);
      })
      .catch(() => { if (mounted) setIsLoading(false); });

    const setupES = () => {
      if (esRef.current) { try { esRef.current.close(); } catch {} esRef.current = null; }
      const base = import.meta.env.VITE_API_URL || '/api';
      const url = `${String(base).replace(/\/+$/, '')}/events/${id}/stream`;
      esRef.current = new EventSource(url);
      esRef.current.onopen = () => { sseReconnectAttemptRef.current = 0; };
      esRef.current.onerror = () => {
        try { if (esRef.current) { esRef.current.close(); esRef.current = null; } } catch {}
        const backoff = Math.min(30000, 1000 * Math.pow(2, sseReconnectAttemptRef.current || 0));
        sseReconnectAttemptRef.current = (sseReconnectAttemptRef.current || 0) + 1;
        if (sseReconnectTimerRef.current) clearTimeout(sseReconnectTimerRef.current);
        sseReconnectTimerRef.current = setTimeout(() => setupES(), backoff);
      };
      esRef.current.onmessage = e => {
        const raw = e.data;
        if (!raw || raw[0] !== '{') return;
        let msg;
        try { msg = JSON.parse(raw); } catch { return; }
        if (!mounted) return;
        if (msg.type === 'init') {
          setEvent(ev => ({ ...ev, state: msg.data.state }));
          setTotalViewers(msg.data.state?.total || 0);
        }
        if (msg.type === 'tick') {
          setEvent(ev => ({
            ...ev,
            state: {
              total: msg.data.total,
              streams: Object.fromEntries(msg.data.streams.map(s => [s.id, s])),
            },
          }));
          setTotalViewers(msg.data.total || 0);
        }
      };
    };
    setupES();

    const onVis = () => {
      if (document.hidden) {
        try { if (esRef.current) esRef.current.close(); } catch {}
        esRef.current = null;
      } else {
        setupES();
      }
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', onVis);
      try { if (esRef.current) esRef.current.close(); } catch {}
      esRef.current = null;
      if (sseReconnectTimerRef.current) clearTimeout(sseReconnectTimerRef.current);
    };
  }, [id]);

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #030712 0%, #0c1225 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'rgba(255,255,255,0.4)', flexDirection: 'column', gap: 16,
      }}>
        <svg width={40} height={40} viewBox="0 0 50 50">
          <circle cx="25" cy="25" r="20" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
          <path d="M25 5 a20 20 0 0 1 17.3 10" fill="none" stroke="#60a5fa" strokeWidth="4" strokeLinecap="round">
            <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="0.85s" repeatCount="indefinite" />
          </path>
        </svg>
        Chargement…
      </div>
    );
  }

  if (!event) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #030712 0%, #0c1225 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'rgba(255,255,255,0.4)', flexDirection: 'column', gap: 12,
      }}>
        <span style={{ fontSize: 32 }}>⚠</span>
        Événement introuvable
        <Link to="/events" style={{ color: '#60a5fa', fontSize: 14, marginTop: 4 }}>← Retour aux évènements</Link>
      </div>
    );
  }

  const streamList = event.streams || [];
  const liveCount = streamList.filter(s => !!event.state?.streams?.[s.id]?.online).length;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #030712 0%, #0c1225 40%, #0a1628 100%)',
      color: 'white',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>

      {/* Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(3,7,18,0.8)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '0 1.5rem',
        height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img src={bsrqLogo} alt="BSRQ" style={{ height: 28 }} />
          {event.name && (
            <span style={{
              fontSize: 14, fontWeight: 600,
              color: 'rgba(255,255,255,0.45)',
              borderLeft: '1px solid rgba(255,255,255,0.12)',
              paddingLeft: '1rem',
              maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {event.name}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {liveCount > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 999, padding: '4px 12px',
              fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: '#fca5a5',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.5s infinite' }} />
              {liveCount} LIVE
            </span>
          )}
          <Link
            to="/events"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '0 14px', height: 36,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              color: 'rgba(255,255,255,0.65)',
              textDecoration: 'none', fontSize: 13, fontWeight: 600,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; }}
          >
            ← Retour aux évènements
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>

        {/* Stats bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '1rem',
          marginBottom: '2rem',
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>
              Total spectateurs
            </div>
            <div style={{
              fontSize: '2.5rem', fontWeight: 800, lineHeight: 1,
              background: 'linear-gradient(135deg, #60a5fa, #34d399)',
              WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
            }}>
              {totalViewers.toLocaleString()}
            </div>
          </div>
          <div style={{
            fontSize: 13, color: 'rgba(255,255,255,0.35)',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 10, padding: '8px 16px',
          }}>
            {liveCount} / {streamList.length} streams en direct
          </div>
        </div>

        {/* Stream grid */}
        {streamList.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '4rem 2rem',
            color: 'rgba(255,255,255,0.25)', fontSize: 15,
            border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 16,
          }}>
            Aucun stream configuré pour cet évènement.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: streamList.length === 1 ? '1fr' : 'repeat(auto-fill, minmax(420px, 1fr))',
            gap: '1.25rem',
          }}>
            {streamList.map(stream => (
              <LiveStreamCard
                key={stream.id}
                stream={stream}
                streamState={event.state?.streams?.[stream.id]}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
