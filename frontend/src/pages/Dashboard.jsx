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
  const API_BASE = import.meta.env.VITE_API_URL || `${proto}//${host}:4000`;
  const [event, setEvent] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyMinutes, setHistoryMinutes] = useState(60); // number or 'all' (par défaut 60 pour alléger)
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
  const SSE_THROTTLE_MS = 1000; // 1s

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
      const params = (historyMinutes === 'all' && event?.created_at)
        ? `from=${encodeURIComponent(event.created_at)}&to=${encodeURIComponent(new Date().toISOString())}`
        : (historyMinutes === 'all' ? `minutes=180` : `minutes=${historyMinutes}`);
      esRef.current = new EventSource(`${API_BASE}/events/${id}/stream?${params}`);
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
              // Mettre à jour état courant (cartes)
              if (buf.lastState) {
                setEvent(e => ({ ...e, state: buf.lastState }));
                setTotalViewers(buf.lastState.total || 0);
              }
              // Historique total
              if (buf.totals.length) {
                setHistory(h => {
                  const next = h.concat(buf.totals);
                  const cutoff = (historyMinutes === 'all' && event?.created_at)
                    ? new Date(event.created_at).getTime()
                    : Date.now() - Number(historyMinutes) * 60 * 1000;
                  return next.filter(row => new Date(row.ts).getTime() >= cutoff);
                });
                buf.totals = [];
              }
              // Historique par stream
              if (buf.streams.size) {
                setStreamsHistory(prev => {
                  const cutoff = (historyMinutes === 'all' && event?.created_at)
                    ? new Date(event.created_at).getTime()
                    : Date.now() - Number(historyMinutes) * 60 * 1000;
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
  }, [id, historyMinutes]);

  // Charger l'historique JSON (incluant les streams) pour la fenêtre sélectionnée
  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        // Chargement initial JSON: minutes ou depuis le début avec boucle afterTs
        if (historyMinutes === 'all' && event?.created_at) {
          let allHistory = [];
          let allStreams = [];
          let lastTs = null;
          // Première requête avec from/to pour amorcer
          let url = `${API_BASE}/events/${id}/history?streams=1&limit=5000&from=${encodeURIComponent(event.created_at)}&to=${encodeURIComponent(new Date().toISOString())}`;
          while (!aborted) {
            const res = await fetch(url);
            if (!res.ok) break;
            const ct = res.headers.get('content-type') || '';
            if (!ct.includes('application/json')) break;
            const data = await res.json();
            if (aborted) return;
            const h = Array.isArray(data.history) ? data.history : [];
            const s = Array.isArray(data.streams) ? data.streams : [];
            allHistory = allHistory.concat(h);
            allStreams = allStreams.concat(s);
            if (h.length < 5000 && s.length < 5000) break;
            lastTs = (h.length ? h[h.length - 1].ts : (s.length ? s[s.length - 1].ts : lastTs));
            if (!lastTs) break;
            url = `${API_BASE}/events/${id}/history?streams=1&limit=5000&afterTs=${encodeURIComponent(lastTs)}`;
          }
          // Appliquer les données agrégées
          setHistory(allHistory);
          const grouped = {};
          for (const row of allStreams) {
            const arr = grouped[row.stream_id] || [];
            arr.push({ ts: row.ts, current: row.concurrent_viewers });
            grouped[row.stream_id] = arr;
          }
          setStreamsHistory(grouped);
        } else {
          const url = `${API_BASE}/events/${id}/history?minutes=${historyMinutes}&streams=1&limit=5000`;
          const res = await fetch(url);
          if (!res.ok) return; // SSE init fera le fallback
          const ct = res.headers.get('content-type') || '';
          if (!ct.includes('application/json')) return;
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
        }
      } catch (e) {
        // silencieux: on garde l'affichage existant
      }
    })();
    return () => { aborted = true; };
  }, [id, historyMinutes, event?.created_at]);

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

  const streamList = Object.values(event.state?.streams || {});

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
  const data = {
    labels: series.map(p => new Date(p.ts)),
    datasets: [{
      label: 'Spectateurs',
      data: series.map(p => p.total),
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

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    parsing: false,
    normalized: true,
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
        time: { unit: 'minute' },
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        ticks: { color: 'rgba(255, 255, 255, 0.7)', maxTicksLimit: 10 }
      },
      y: {
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
  const downloadCSV = (filename, rows) => {
    const header = 'timestamp,viewers\n';
    const csv = header + rows.map(r => `${new Date(r.ts).toISOString()},${r.current ?? r.total ?? 0}`).join('\n');
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
            {streamList.map(s => (
              <DynamicStreamCard 
                key={s.id} 
                label={s.label} 
                current={s.current} 
                online={s.online} 
              />
            ))}
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
            <div style={{ height: '300px' }}>
              <Line ref={totalChartRef} data={data} options={options} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ color: 'white', opacity: 0.9 }}>
                Fenêtre:
                <select
                  value={historyMinutes}
                  onChange={(e) => {
                    const v = e.target.value;
                    setHistoryMinutes(v === 'all' ? 'all' : parseInt(v, 10));
                  }}
                  style={{ marginLeft: '0.5rem', padding: '0.25rem 0.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
                >
                  <option value="all">Depuis le début</option>
                  <option value={60}>1h</option>
                  <option value={180}>3h</option>
                  <option value={360}>6h</option>
                  <option value={720}>12h</option>
                  <option value={1440}>24h</option>
                  <option value={2880}>48h</option>
                  <option value={4320}>72h</option>
                  <option value={10080}>7j</option>
                </select>
              </label>
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
                  const nowIso = new Date().toISOString();
                  const url = (historyMinutes === 'all' && event?.created_at)
                    ? `${API_BASE}/events/${id}/history.csv?from=${encodeURIComponent(event.created_at)}&to=${encodeURIComponent(nowIso)}`
                    : `${API_BASE}/events/${id}/history.csv?minutes=${historyMinutes}`;
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = (historyMinutes === 'all')
                    ? `event_${id}_history_all.csv`
                    : `event_${id}_history_${historyMinutes}m.csv`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
                style={{
                  background: 'linear-gradient(45deg, #3b82f6, #0ea5e9)',
                  color: 'white', border: 'none', padding: '0.5rem 1rem',
                  borderRadius: '10px', cursor: 'pointer'
                }}
              >
                Exporter CSV
              </button>
              <button
                onClick={async () => {
                  try {
                    setJobExporting(true); setJobProgress(0); setJobId(null);
                    const payload = (historyMinutes === 'all' && event?.created_at)
                      ? { type: 'total', from: event.created_at, to: new Date().toISOString() }
                      : { type: 'total', minutes: historyMinutes };
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
                        const a = document.createElement('a'); a.href = url; a.download = (historyMinutes === 'all' ? `event_${id}_history_all.csv` : `event_${id}_history_${historyMinutes}m.csv`); document.body.appendChild(a); a.click(); document.body.removeChild(a); return;
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
                {jobExporting ? `Job… ${jobProgress}` : 'Export asynchrone'}
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
          {showStreamCharts && Object.values(event.state?.streams || {}).length > 0 && (
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
                {Object.values(event.state.streams).map(s => {
                  const rows = reduceSeries(streamsHistory[s.id] || []);
                  const sd = {
                    labels: rows.map(r => new Date(r.ts)),
                    datasets: [{
                      label: s.label,
                      data: rows.map(r => r.current || 0),
                      borderColor: s.online ? '#10b981' : '#ef4444',
                      backgroundColor: 'rgba(139, 92, 246, 0.1)',
                      borderWidth: 2,
                      tension: 0.3,
                      pointRadius: 0
                    }]
                  };
                  return (
                    <div key={s.id} style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '12px',
                      padding: '1rem'
                    }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'white' }}>🎬 {s.label}</div>
                      <div style={{ height: '200px' }}>
                        <Line ref={el => (streamChartRefs.current[s.id] = el)} data={sd} options={{ ...options, maintainAspectRatio: false }} />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button
                          onClick={() => {
                            const chart = streamChartRefs.current[s.id];
                            if (chart) downloadDataUrl(`${s.label.replace(/\s+/g,'_')}_viewers_${id}.png`, chart.toBase64Image());
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
                            const url = (historyMinutes === 'all' && event?.created_at)
                              ? `${API_BASE}/events/${id}/streams/${s.id}/history.csv?from=${encodeURIComponent(event.created_at)}&to=${encodeURIComponent(nowIso)}`
                              : `${API_BASE}/events/${id}/streams/${s.id}/history.csv?minutes=${historyMinutes}`;
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = (historyMinutes === 'all')
                              ? `${s.label.replace(/\s+/g,'_')}_viewers_${id}_all.csv`
                              : `${s.label.replace(/\s+/g,'_')}_viewers_${id}_${historyMinutes}m.csv`;
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
                              const payload = (historyMinutes === 'all' && event?.created_at)
                                ? { type: 'stream', sid: s.id, from: event.created_at, to: new Date().toISOString() }
                                : { type: 'stream', sid: s.id, minutes: historyMinutes };
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
                                  const a = document.createElement('a'); a.href = url; a.download = (historyMinutes === 'all' ? `${s.label.replace(/\s+/g,'_')}_viewers_${id}_all.csv` : `${s.label.replace(/\s+/g,'_')}_viewers_${id}_${historyMinutes}m.csv`); document.body.appendChild(a); a.click(); document.body.removeChild(a); return;
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