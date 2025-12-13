import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  Filler,
  Decimation
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import EventDetail from './EventDetail.jsx';
import { getEvent } from '../api.js';
import bsrqLogo from '../assets/bsrq.png';

ChartJS.register(LineElement, PointElement, LinearScale, TimeScale, Tooltip, Legend, Filler, Decimation);

// Composant de particules animées
const ParticleSystem = () => {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationRef = useRef();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return; // désactive pour les utilisateurs sensibles/économie
    
    const ctx = canvas.getContext('2d');
    const updateCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    updateCanvasSize();

    // Créer des particules
    const createParticles = () => {
      particlesRef.current = [];
      const base = 24; // réduit pour limiter l'usage GPU
      for (let i = 0; i < base; i++) {
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 1,
          vy: (Math.random() - 0.5) * 1,
          size: Math.random() * 2 + 1,
          opacity: Math.random() * 0.3 + 0.1,
          hue: Math.random() * 360
        });
      }
    };

    const animate = () => {
      if (document.hidden) return; // pause si onglet caché
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particlesRef.current.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.hue += 0.5;
        
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;
        
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${particle.hue}, 70%, 60%, ${particle.opacity})`;
        ctx.fill();
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };

    createParticles();
    animate();

    const handleResize = () => {
      updateCanvasSize();
      createParticles();
    };

    window.addEventListener('resize', handleResize);
    const handleVisibility = () => {
      if (!document.hidden && !animationRef.current) {
        animate();
      }
      if (document.hidden && animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.2
      }}
    />
  );
};

// Composant StreamCard amélioré
const DynamicStreamCard = ({ label, current, online }) => {
  const [displayViewers, setDisplayViewers] = useState(current);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (current !== displayViewers) {
      setIsAnimating(true);
      
      const duration = 1000;
      const startTime = Date.now();
      const startValue = displayViewers;
      const targetValue = current;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.round(startValue + (targetValue - startValue) * easedProgress);
        setDisplayViewers(currentValue);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
        }
      };

      animate();
    }
  }, [current, displayViewers]);

  return (
    <div 
      className="stream-card"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: '16px',
        padding: '1.5rem',
        margin: '0.5rem',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden',
        transform: 'translateY(0)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
      }}
      onMouseEnter={(e) => {
        e.target.style.transform = 'translateY(-5px) scale(1.02)';
        e.target.style.boxShadow = '0 20px 40px rgba(0,0,0,0.4)';
      }}
      onMouseLeave={(e) => {
        e.target.style.transform = 'translateY(0) scale(1)';
        e.target.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
      }}
    >
      {/* Effet de brillance */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '-100%',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
          animation: online ? 'shine 3s infinite' : 'none'
        }}
      />
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 style={{ 
          margin: 0, 
          fontSize: '1.1rem', 
          fontWeight: '600',
          background: online ? 'linear-gradient(45deg, #10b981, #3b82f6)' : 'linear-gradient(45deg, #6b7280, #9ca3af)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          {label}
        </h3>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: online ? '#10b981' : '#ef4444',
              animation: online ? 'pulse 2s infinite' : 'none'
            }}
          />
          <span style={{ 
            fontSize: '0.8rem', 
            color: online ? '#10b981' : '#ef4444',
            fontWeight: '500'
          }}>
            {online ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
      </div>
      
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontSize: '2rem',
            fontWeight: '700',
            background: 'linear-gradient(45deg, #f59e0b, #ef4444, #0c2164ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: isAnimating ? 'glow 0.5s ease-in-out' : 'none'
          }}
        >
          {displayViewers?.toLocaleString() || 0}
        </div>
        <div style={{ 
          fontSize: '0.9rem', 
          color: 'rgba(255,255,255,0.7)',
          marginTop: '0.25rem'
        }}>
          spectateurs
        </div>
      </div>
      
      {/* Barre de progression */}
      <div
        style={{
          marginTop: '1rem',
          height: '4px',
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderRadius: '2px',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            height: '100%',
            background: online 
              ? 'linear-gradient(90deg, #10b981, #3b82f6)' 
              : 'linear-gradient(90deg, #6b7280, #9ca3af)',
            borderRadius: '2px',
            width: `${Math.min(100, (displayViewers / 50000) * 100)}%`,
            transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: online ? '0 0 10px rgba(16, 185, 129, 0.5)' : 'none'
          }}
        />
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { id } = useParams();
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const proto = typeof window !== 'undefined' ? window.location.protocol : 'http:';
  let API_BASE = import.meta.env.VITE_API_URL || `${proto}//${host}:4000`;
  // Si la base est relative (ex: '/api') et qu'on accède via un serveur dev (3000/3001/3019),
  // basculer vers le backend direct sur :4000 pour garantir SSE et éviter du HTML côté frontend.
  if (typeof API_BASE === 'string' && API_BASE.startsWith('/') && typeof window !== 'undefined') {
    const port = window.location.port;
    const devPorts = new Set(['3000', '3001', '3019']);
    if (devPorts.has(port)) {
      API_BASE = `${proto}//${host}:4000`;
    }
  }
  const [event, setEvent] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyMinutes, setHistoryMinutes] = useState('all'); // forcé à 'all' pour couvrir toute la durée
  const [totalViewers, setTotalViewers] = useState(0);
  const [previousTotal, setPreviousTotal] = useState(0);
  const [streamsHistory, setStreamsHistory] = useState({});
  const [showStreamCharts, setShowStreamCharts] = useState(false);
  const [jobExporting, setJobExporting] = useState(false);
  const [jobProgress, setJobProgress] = useState(0);
  const [jobId, setJobId] = useState(null);
  const totalChartRef = useRef(null);
  const streamChartRefs = useRef({});
  const esRef = useRef(null);
  const sseFlushTimerRef = useRef(null);
  const sseBufferRef = useRef({ totals: [], streams: new Map(), lastState: null });
  const SSE_THROTTLE_MS = 250; // rafraîchissement plus réactif

  useEffect(() => {
    getEvent(id).then(ev => {
      setEvent(ev);
      setPreviousTotal(ev.state?.total || 0);
      setTotalViewers(ev.state?.total || 0);
    });

    const setupES = () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      // Afficher par défaut les dernières 24h pour voir les variations quotidiennes
      const params = `minutes=1440`;
      const base = API_BASE;
      const url = `${String(base).replace(/\/+$/, '')}/events/${id}/stream?${params}`;
      const useCreds = (typeof base === 'string' && base.startsWith('/'));
      esRef.current = new EventSource(url, useCreds ? { withCredentials: true } : undefined);
      // Fallback automatique en cas d'erreur (ex: proxy dev renvoyant du HTML)
      esRef.current.onerror = () => {
        try {
          if (typeof API_BASE === 'string' && API_BASE.startsWith('/') && typeof window !== 'undefined') {
            const direct = `${proto}//${host}:4000`;
            esRef.current.close();
            esRef.current = new EventSource(`${direct.replace(/\/+$/, '')}/events/${id}/stream?${params}`);
          }
        } catch {}
      };
      esRef.current.onmessage = ev => {
        const raw = ev.data;
        if (!raw || raw[0] !== '{') return;
        let msg;
        try {
          msg = JSON.parse(raw);
        } catch {
          return;
        }
        if (msg.type === 'init') {
          sseBufferRef.current.lastState = msg.data.state;
          setEvent(e => ({ ...e, state: msg.data.state }));
          setHistory(msg.data.history);
          setPreviousTotal(msg.data.state?.total || 0);
          setTotalViewers(msg.data.state?.total || 0);
        }
        if (msg.type === 'tick') {
          // Bufferiser et flush avec throttling pour limiter les re-renders
          sseBufferRef.current.lastState = {
            total: msg.data.total,
            streams: Object.fromEntries(msg.data.streams.map(s => [s.id, s]))
          };
          sseBufferRef.current.totals.push({ ts: msg.data.ts, total: msg.data.total });
          for (const s of msg.data.streams) {
            const list = sseBufferRef.current.streams.get(s.id) || [];
            list.push({ ts: msg.data.ts, current: s.current });
            sseBufferRef.current.streams.set(s.id, list);
          }
          const scheduleFlush = () => {
            if (sseFlushTimerRef.current) return;
            sseFlushTimerRef.current = setTimeout(() => {
              sseFlushTimerRef.current = null;
              const buf = sseBufferRef.current;
              // Mettre à jour état courant (cartes) et total affiché
              if (buf.lastState) {
                setEvent(e => ({ ...e, state: buf.lastState }));
                const sum = Object.values(buf.lastState.streams || {}).reduce((acc, s) => {
                  const v = (typeof s.current === 'number' ? s.current : Number(s.current) || 0);
                  return acc + v;
                }, 0);
                setTotalViewers(sum);
              }
              // Historique total
              if (buf.totals.length) {
                setHistory(h => {
                  const next = h.concat(buf.totals);
                  const cutoff = event?.created_at ? new Date(event.created_at).getTime() : 0;
                  return next.filter(row => new Date(row.ts).getTime() >= cutoff);
                });
                buf.totals = [];
              }
              // Historique par stream
              if (buf.streams.size) {
                setStreamsHistory(prev => {
                  const cutoff = event?.created_at ? new Date(event.created_at).getTime() : 0;
                  const next = { ...prev };
                  for (const [sid, arrNew] of buf.streams.entries()) {
                    const arr = next[sid] || [];
                    next[sid] = arr.concat(arrNew).filter(row => new Date(row.ts).getTime() >= cutoff);
                  }
                  return next;
                });
                buf.streams.clear();
              }
            }, SSE_THROTTLE_MS);
          };
          scheduleFlush();
        }
      };
    };

    setupES();

    const handleVisibility = () => {
      if (document.hidden) {
        if (esRef.current) {
          esRef.current.close();
          esRef.current = null;
        }
      } else {
        setupES();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (esRef.current) esRef.current.close();
      if (sseFlushTimerRef.current) {
        clearTimeout(sseFlushTimerRef.current);
        sseFlushTimerRef.current = null;
      }
    };
  }, [id, event?.created_at]);

  // Charger l'historique JSON (incluant les streams) sur les dernières 24h
  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const url = `${API_BASE}/events/${id}/history?minutes=1440&streams=1&limit=5000`;
        let res = await fetch(url);
        if (!res.ok) return; // SSE init fera le fallback
        const ct = res.headers.get('content-type') || '';
        // Si le serveur dev renvoie du HTML, refaire la requête directement sur :4000
        if (!ct.includes('application/json')) {
          if (typeof API_BASE === 'string' && API_BASE.startsWith('/') && typeof window !== 'undefined') {
            const direct = `${proto}//${host}:4000`;
            res = await fetch(`${direct}/events/${id}/history?minutes=1440&streams=1&limit=5000`);
            if (!res.ok) return;
          } else {
            return;
          }
        }
        const data = await res.json();
        if (aborted) return;
        if (Array.isArray(data.history)) setHistory(data.history);
        if (Array.isArray(data.streams)) {
          const grouped = {};
          for (const row of data.streams) {
            const arr = grouped[row.stream_id] || [];
            arr.push({ ts: row.ts, current: row.concurrent_viewers });
            grouped[row.stream_id] = arr;
          }
          setStreamsHistory(grouped);
        }
      } catch (e) {
        // silencieux: on garde l'affichage existant
      }
    })();
    return () => { aborted = true; };
  }, [id, event?.created_at]);

  if (!event) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1e1b4b 0%, #0c2164ff 50%, #db2777 100%)',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '3px solid rgba(255,255,255,0.3)',
            borderTopColor: '#f59e0b',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <div style={{ fontSize: '1.2rem', fontWeight: '500' }}>Chargement...</div>
        </div>
      </div>
    );
  }

  const streamList = event.streams || [];

  // Configuration du graphique avec style moderne
  const MAX_POINTS = 3000;
  const reduceSeries = (rows) => {
    if (!Array.isArray(rows)) return [];
    if (rows.length <= MAX_POINTS) return rows;
    const stride = Math.ceil(rows.length / MAX_POINTS);
    const out = [];
    for (let i = 0; i < rows.length; i += stride) out.push(rows[i]);
    return out;
  };
  const series = reduceSeries(history);
  // Utiliser des points {x, y} pour une échelle temporelle fiable avec parsing désactivé
  const seriesPoints = series.map(p => ({ x: new Date(p.ts), y: (typeof p.total === 'number' ? p.total : Number(p.total) || 0) }));
  // Déterminer unité de temps et bornes selon la fenêtre choisie
  const now = new Date();
  const computeEarliestTs = () => {
    let t = Infinity;
    if (Array.isArray(history) && history.length) {
      for (const row of history) {
        const ts = new Date(row.ts).getTime();
        if (ts < t) t = ts;
      }
    }
    for (const sid in streamsHistory) {
      const arr = streamsHistory[sid];
      if (Array.isArray(arr)) {
        for (const row of arr) {
          const ts = new Date(row.ts).getTime();
          if (ts < t) t = ts;
        }
      }
    }
    if (!isFinite(t)) {
      if (event?.created_at) return new Date(event.created_at);
      return new Date(Date.now() - 3 * 60 * 60 * 1000);
    }
    return new Date(t);
  };
  const xMin = computeEarliestTs();
  const xMax = now;
  const totalMinutes = Math.max(1, Math.round((xMax.getTime() - xMin.getTime()) / 60000));
  const timeUnit = totalMinutes >= 1440 ? 'day' : (totalMinutes >= 360 ? 'hour' : 'minute');
  // Ne garder que les points dans la fenêtre visible pour éviter des axes trompeurs
  const seriesVisiblePoints = seriesPoints.filter(p => p.x >= xMin && p.x <= xMax);
  const data = {
    datasets: [{
      label: 'Spectateurs',
      data: seriesVisiblePoints,
      borderColor: '#0c2164ff',
      backgroundColor: 'rgba(139, 92, 246, 0.1)',
      borderWidth: 3,
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#0c2164ff',
      pointBorderColor: '#ffffff',
      pointBorderWidth: 0,
      pointRadius: 0,
      pointHoverRadius: 0
    }]
  };
  
  const maxTotal = Math.max(10, ...seriesVisiblePoints.map(p => (typeof p.y === 'number' ? p.y : Number(p.y) || 0)));
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    parsing: false,
    // Ne pas normaliser: on veut afficher les valeurs réelles (pas 0..1)
    normalized: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#0c2164ff',
        borderWidth: 1
      },
      decimation: {
        enabled: true,
        algorithm: 'lttb',
        threshold: 500
      }
    },
    scales: {
      x: {
        type: 'time',
        time: { unit: timeUnit },
        min: xMin,
        max: xMax,
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        ticks: { color: 'rgba(255, 255, 255, 0.7)', maxTicksLimit: 10 }
      },
      y: {
        beginAtZero: true,
        suggestedMax: Math.ceil(maxTotal * 1.1),
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        ticks: { color: 'rgba(255, 255, 255, 0.7)' }
      }
    },
    animation: false,
    elements: { point: { radius: 0 } },
    interaction: { intersect: false, mode: 'index' },
    spanGaps: true
  };

  // Export helpers
  const downloadDataUrl = (filename, dataUrl) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  // Export CSV local (2 colonnes: Heure, Total de spectateurs de l'events)
  const exportTotalCsvLocal = (filename) => {
    const header = "Heure,Total de spectateurs de l'events\n";
    const rows = (Array.isArray(history) ? history : []).map(r => {
      const heure = new Date(r.ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const total = (typeof r.total === 'number' ? r.total : Number(r.total) || 0);
      return `${heure},${total}`;
    });
    const csv = header + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e1b4b 0%, #0c2164ff 50%, #db2777 100%)',
      color: 'white',
      position: 'relative'
    }}>
      <ParticleSystem />
      
      <div style={{ position: 'relative', zIndex: 10 }}>
        {/* Bouton de retour */}
        <div style={{ padding: '1rem 2rem' }}>
          <Link
            to={`/admin/event/${id}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '12px',
              padding: '0.75rem 1.5rem',
              color: 'white',
              textDecoration: 'none',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 8px 25px rgba(139, 92, 246, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
            }}
          >
            ← Retour à l'évènement
          </Link>
        </div>

        {/* En-tête avec métriques principales */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
          padding: '2rem 1rem',
          textAlign: 'center'
        }}>
          <div style={{ marginBottom: '1rem' }}>
            <img src={bsrqLogo} alt="BSRQ" style={{ height: '60px' }} />
          </div>
          <h1 style={{ 
            margin: '0 0 1rem 0', 
            fontSize: '2.5rem', 
            fontWeight: '700',
            background: 'linear-gradient(45deg, #f59e0b, #ef4444, #0c2164ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            📊 Dashboard Live
          </h1>
          
          <div style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '20px',
            padding: '2rem',
            maxWidth: '400px',
            margin: '0 auto',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
          }}>
            <div style={{ 
              fontSize: '0.9rem', 
              color: 'rgba(255,255,255,0.8)', 
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              Total Spectateurs
            </div>
            <div style={{
              fontSize: '3.5rem',
              fontWeight: '800',
              background: 'linear-gradient(45deg, #10b981, #3b82f6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: '1'
            }}>
              {totalViewers?.toLocaleString() || 0}
            </div>
            {totalViewers > previousTotal && (
              <div style={{ 
                color: '#10b981', 
                fontSize: '0.9rem', 
                marginTop: '0.5rem',
                animation: 'bounce 1s infinite'
              }}>
                📈 +{(totalViewers - previousTotal).toLocaleString()}
              </div>
            )}
          </div>
        </div>

        {/* Contenu principal */}
        <div style={{ padding: '2rem 1rem' }}>
          {/* Grille des streams */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            {streamList.map(s => {
              const st = event.state?.streams?.[s.id];
              return (
                <DynamicStreamCard 
                  key={s.id} 
                  label={s.label} 
                  current={st?.current ?? 0} 
                  online={st?.online ?? false} 
                />
              );
            })}
          </div>

          {/* Graphique total + export */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '20px',
            padding: '2rem',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ 
              margin: '0 0 1.5rem 0', 
              fontSize: '1.5rem', 
              fontWeight: '600',
              background: 'linear-gradient(45deg, #0c2164ff, #3b82f6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              📈 Évolution Temps Réel
            </h3>
            <div style={{ height: '300px', position: 'relative' }}>
              <Line ref={totalChartRef} data={data} options={options} />
              {seriesVisiblePoints.length === 0 && (
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'rgba(255,255,255,0.9)', fontWeight: 600,
                  background: 'linear-gradient(135deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.05) 100%)',
                  borderRadius: '16px'
                }}>
                  Aucune donnée disponible sur la période.
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  const chart = totalChartRef.current;
                  if (chart) downloadDataUrl(`total_viewers_${id}.png`, chart.toBase64Image());
                }}
                style={{
                  background: 'linear-gradient(45deg, #10b981, #059669)',
                  color: 'white', border: 'none', padding: '0.5rem 1rem',
                  borderRadius: '10px', cursor: 'pointer'
                }}
              >
                Exporter PNG
              </button>
              <button
                onClick={() => {
                  exportTotalCsvLocal(`event_${id}_total_viewers.csv`);
                }}
                style={{
                  background: 'linear-gradient(45deg, #3b82f6, #0ea5e9)',
                  color: 'white', border: 'none', padding: '0.5rem 1rem',
                  borderRadius: '10px', cursor: 'pointer'
                }}
              >
                Exporter CSV (Heure, Total)
              </button>
              <button
                onClick={async () => {
                  try {
                    setJobExporting(true); setJobProgress(0); setJobId(null);
                    const payload = (event?.created_at)
                      ? { type: 'total', from: event.created_at, to: new Date().toISOString() }
                      : { type: 'total', minutes: 180 };
                    const res = await fetch(`${API_BASE}/events/${id}/export`, {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(payload)
                    });
                    const data = await res.json();
                    if (!data.jobId) throw new Error('jobId manquant');
                    setJobId(data.jobId);
                    const poll = async () => {
                      const sres = await fetch(`${API_BASE}/exports/${data.jobId}/status`);
                      const sdata = await sres.json();
                      if (sdata.status === 'done') {
                        setJobExporting(false);
                        const url = `${API_BASE}/exports/${data.jobId}/download`;
                        const a = document.createElement('a'); a.href = url; a.download = (event?.created_at ? `event_${id}_history_all.csv` : `event_${id}_history_180m.csv`); document.body.appendChild(a); a.click(); document.body.removeChild(a); return;
                      }
                      if (sdata.status === 'error') { setJobExporting(false); return; }
                      setJobProgress(sdata.progress || 0);
                      setTimeout(poll, 1000);
                    };
                    poll();
                  } catch (e) {
                    setJobExporting(false);
                  }
                }}
                style={{
                  background: 'linear-gradient(45deg, #f59e0b, #ef4444)',
                  color: 'white', border: 'none', padding: '0.5rem 1rem',
                  borderRadius: '10px', cursor: 'pointer'
                }}
              >
                {jobExporting ? `Job… ${jobProgress}` : 'Exporter CSV (async)'}
              </button>
            </div>
          </div>

          {/* Toggle graphs par stream */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button
              onClick={() => setShowStreamCharts(v => !v)}
              style={{
                background: showStreamCharts ? 'linear-gradient(45deg, #ef4444, #f59e0b)' : 'linear-gradient(45deg, #10b981, #059669)',
                color: 'white', border: 'none', padding: '0.5rem 1rem',
                borderRadius: '10px', cursor: 'pointer'
              }}
            >
              {showStreamCharts ? 'Masquer les graphiques par stream' : 'Afficher les graphiques par stream'}
            </button>
          </div>

          {/* Graphiques par stream + export */}
          {showStreamCharts && (event.streams || []).length > 0 && (
            <div style={{
              marginTop: '2rem',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '20px',
              padding: '2rem',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
            }}>
              <h3 style={{ 
                margin: '0 0 1.5rem 0', 
                fontSize: '1.5rem', 
                fontWeight: '600',
                background: 'linear-gradient(45deg, #0c2164ff, #3b82f6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                📈 Par stream
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '1rem'
              }}>
                {(event.streams || []).map(stream => {
                  const rows = reduceSeries(streamsHistory[stream.id] || []);
                  const points = rows.map(r => ({ x: new Date(r.ts), y: (typeof r.current === 'number' ? r.current : Number(r.current) || 0) }));
                  const st = event.state?.streams?.[stream.id];
                  const sd = {
                    datasets: [{
                      label: stream.label,
                      data: points,
                      borderColor: st?.online ? '#10b981' : '#ef4444',
                      backgroundColor: 'rgba(139, 92, 246, 0.1)',
                      borderWidth: 2,
                      tension: 0.3,
                      pointRadius: 0
                    }]
                  };
                  return (
                    <div key={stream.id} style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '12px',
                      padding: '1rem'
                    }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'white' }}>🎬 {stream.label}</div>
                      <div style={{ height: '200px' }}>
                        <Line ref={el => (streamChartRefs.current[stream.id] = el)} data={sd} options={{ ...options, maintainAspectRatio: false }} />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button
                          onClick={() => {
                            const chart = streamChartRefs.current[stream.id];
                            if (chart) downloadDataUrl(`${stream.label.replace(/\s+/g,'_')}_viewers_${id}.png`, chart.toBase64Image());
                          }}
                          style={{
                            background: 'linear-gradient(45deg, #10b981, #059669)',
                            color: 'white', border: 'none', padding: '0.4rem 0.8rem',
                            borderRadius: '8px', cursor: 'pointer'
                          }}
                        >
                          PNG
                        </button>
                        <button
                          onClick={() => {
                            const nowIso = new Date().toISOString();
                            const url = (event?.created_at)
                              ? `${API_BASE}/events/${id}/streams/${stream.id}/history.csv?from=${encodeURIComponent(event.created_at)}&to=${encodeURIComponent(nowIso)}`
                              : `${API_BASE}/events/${id}/streams/${stream.id}/history.csv?minutes=180`;
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = (event?.created_at)
                              ? `${stream.label.replace(/\s+/g,'_')}_viewers_${id}_all.csv`
                              : `${stream.label.replace(/\s+/g,'_')}_viewers_${id}_180m.csv`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          }}
                          style={{
                            background: 'linear-gradient(45deg, #3b82f6, #0ea5e9)',
                            color: 'white', border: 'none', padding: '0.4rem 0.8rem',
                            borderRadius: '8px', cursor: 'pointer'
                          }}
                        >
                          CSV
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              const payload = (event?.created_at)
                                ? { type: 'stream', sid: stream.id, from: event.created_at, to: new Date().toISOString() }
                                : { type: 'stream', sid: stream.id, minutes: 180 };
                              const res = await fetch(`${API_BASE}/events/${id}/export`, {
                                method: 'POST', headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(payload)
                              });
                              const data = await res.json();
                              if (!data.jobId) return;
                              const poll = async () => {
                                const sres = await fetch(`${API_BASE}/exports/${data.jobId}/status`);
                                const sdata = await sres.json();
                                if (sdata.status === 'done') {
                                  const url = `${API_BASE}/exports/${data.jobId}/download`;
                                  const a = document.createElement('a'); a.href = url; a.download = (event?.created_at ? `${stream.label.replace(/\s+/g,'_')}_viewers_${id}_all.csv` : `${stream.label.replace(/\s+/g,'_')}_viewers_${id}_180m.csv`); document.body.appendChild(a); a.click(); document.body.removeChild(a); return;
                                }
                                if (sdata.status === 'error') { return; }
                                setTimeout(poll, 1000);
                              };
                              poll();
                            } catch {}
                          }}
                          style={{
                            background: 'linear-gradient(45deg, #f59e0b, #ef4444)',
                            color: 'white', border: 'none', padding: '0.4rem 0.8rem',
                            borderRadius: '8px', cursor: 'pointer'
                          }}
                        >
                          Job
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Animations CSS */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes bounce {
          0%, 20%, 53%, 80%, 100% { transform: translateY(0); }
          40%, 43% { transform: translateY(-8px); }
          70% { transform: translateY(-4px); }
          90% { transform: translateY(-2px); }
        }
        
        @keyframes glow {
          0% { text-shadow: 0 0 5px rgba(19, 48, 110, 0.8); }
          50% { text-shadow: 0 0 20px rgba(19, 48, 110, 0.8); }
          100% { text-shadow: 0 0 5px rgba(19, 48, 110, 0.5); }
        }
        
        @keyframes shine {
          0% { left: -100%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
}
