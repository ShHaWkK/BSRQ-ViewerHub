// Dashboard.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import EventDetail from './EventDetail.jsx'; // gardé (même si non utilisé ici)
import { getEvent } from '../api.js';
import bsrqLogo from '../assets/bsrq.png';

ChartJS.register(LineElement, PointElement, LinearScale, TimeScale, Tooltip, Legend, Filler, Decimation);

/* =========================
   Particles
========================= */
const ParticleSystem = () => {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReduced =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const ctx = canvas.getContext('2d');

    const updateCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    updateCanvasSize();

    const createParticles = () => {
      particlesRef.current = [];
      const base = 24;
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
      if (document.hidden) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.hue += 0.5;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 70%, 60%, ${p.opacity})`;
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

    const handleVisibility = () => {
      if (!document.hidden && !animationRef.current) animate();
      if (document.hidden && animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
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

/* =========================
   Stream Card
========================= */
const DynamicStreamCard = ({ label, current, online }) => {
  const [displayViewers, setDisplayViewers] = useState(current);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (typeof current !== 'number') return;
    if (current === displayViewers) return;

    setIsAnimating(true);
    const duration = 1000;
    const startTime = Date.now();
    const startValue = displayViewers;
    const targetValue = current;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(startValue + (targetValue - startValue) * eased);
      setDisplayViewers(value);

      if (progress < 1) requestAnimationFrame(animate);
      else setIsAnimating(false);
    };

    animate();
  }, [current]); // volontaire: pas displayViewers dans deps

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
        const el = e.currentTarget;
        el.style.transform = 'translateY(-5px) scale(1.02)';
        el.style.boxShadow = '0 20px 40px rgba(0,0,0,0.4)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.transform = 'translateY(0) scale(1)';
        el.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
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
          animation: online ? 'shine 3s infinite' : 'none'
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3
          title={label}
          style={{
            margin: 0,
            fontSize: '1.1rem',
            fontWeight: '600',
            background: online
              ? 'linear-gradient(45deg, #10b981, #3b82f6)'
              : 'linear-gradient(45deg, #6b7280, #9ca3af)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            maxWidth: '70%',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
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
          <span style={{ fontSize: '0.8rem', color: online ? '#10b981' : '#ef4444', fontWeight: '500' }}>
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
          {Number(displayViewers || 0).toLocaleString()}
        </div>
        <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', marginTop: '0.25rem' }}>
          spectateurs
        </div>
      </div>

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
            background: online ? 'linear-gradient(90deg, #10b981, #3b82f6)' : 'linear-gradient(90deg, #6b7280, #9ca3af)',
            borderRadius: '2px',
            width: `${Math.min(100, (Number(displayViewers || 0) / 50000) * 100)}%`,
            transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: online ? '0 0 10px rgba(16, 185, 129, 0.5)' : 'none'
          }}
        />
      </div>
    </div>
  );
};

/* =========================
   Dashboard
========================= */
export default function Dashboard() {
  const { id } = useParams();

  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const proto = typeof window !== 'undefined' ? window.location.protocol : 'http:';

  const API_BASE = useMemo(() => {
    let base = import.meta.env.VITE_API_URL || `${proto}//${host}:4000`;

    // dev: si VITE_API_URL est relative, forcer backend :4000 depuis ports dev
    if (typeof base === 'string' && base.startsWith('/') && typeof window !== 'undefined') {
      const port = window.location.port;
      const devPorts = new Set(['3000', '3001', '3019']);
      if (devPorts.has(port)) base = `${proto}//${host}:4000`;
    }

    return String(base).replace(/\/+$/, '');
  }, [host, proto]);

  const [event, setEvent] = useState(null);
  const [history, setHistory] = useState([]);
  const [streamsHistory, setStreamsHistory] = useState({});
  const [showStreamCharts, setShowStreamCharts] = useState(false);

  const [totalViewers, setTotalViewers] = useState(0);
  const [previousTotal, setPreviousTotal] = useState(0);

  const [jobExporting, setJobExporting] = useState(false);
  const [jobProgress, setJobProgress] = useState(0);
  const [jobId, setJobId] = useState(null);

  const totalChartRef = useRef(null);
  const streamChartRefs = useRef({});

  const esRef = useRef(null);
  const sseFlushTimerRef = useRef(null);
  const sseMonitorTimerRef = useRef(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef(null);

  const lastMsgTsRef = useRef(Date.now());
  const lastTotalRef = useRef(0);
  const createdAtRef = useRef(null);

  const sseBufferRef = useRef({ totals: [], streams: new Map(), lastState: null });
  const SSE_THROTTLE_MS = 250;

  const getChartInstance = (refObj) => {
    const r = refObj?.current;
    if (!r) return null;
    // react-chartjs-2 peut exposer soit l’instance directe, soit { chart }
    if (typeof r.update === 'function') return r;
    if (r.chart && typeof r.chart.update === 'function') return r.chart;
    return null;
  };

  // Helpers export
  const downloadDataUrl = (filename, dataUrl) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const exportTotalCsvLocal = (filename) => {
    const header = "Heure,Total de spectateurs de l'events\n";
    const rows = (Array.isArray(history) ? history : []).map((r) => {
      const heure = new Date(r.ts).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      const total = typeof r.total === 'number' ? r.total : Number(r.total) || 0;
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

  // 1) Charger event (métadonnées)
  useEffect(() => {
    let aborted = false;

    (async () => {
      try {
        const ev = await getEvent(id);
        if (aborted) return;
        setEvent(ev);
        if (ev?.created_at) createdAtRef.current = ev.created_at;

        const initTotal = typeof ev?.state?.total === 'number' ? ev.state.total : 0;
        lastTotalRef.current = initTotal;
        setPreviousTotal(initTotal);
        setTotalViewers(initTotal);
      } catch {}
    })();

    return () => {
      aborted = true;
    };
  }, [id]);

  // 2) SSE live (reconnexion + ajout point + update total)
  useEffect(() => {
    const cleanup = () => {
      try { esRef.current?.close(); } catch {}
      esRef.current = null;

      if (sseFlushTimerRef.current) clearTimeout(sseFlushTimerRef.current);
      sseFlushTimerRef.current = null;

      if (sseMonitorTimerRef.current) clearInterval(sseMonitorTimerRef.current);
      sseMonitorTimerRef.current = null;

      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;

      // reset buffer
      sseBufferRef.current.totals = [];
      sseBufferRef.current.streams = new Map();
      sseBufferRef.current.lastState = null;
    };

    const scheduleReconnect = () => {
      if (reconnectTimerRef.current) return;

      const backoff = Math.min(30000, 1000 * Math.pow(2, reconnectAttemptRef.current));
      reconnectAttemptRef.current += 1;

      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        setupES();
      }, backoff);
    };

    const setupES = () => {
      // stop previous
      try { esRef.current?.close(); } catch {}
      esRef.current = null;

      if (sseMonitorTimerRef.current) {
        clearInterval(sseMonitorTimerRef.current);
        sseMonitorTimerRef.current = null;
      }

      const url = `${API_BASE}/events/${id}/stream?minutes=1440`;

      // Toujours withCredentials: si cookie auth -> indispensable
      esRef.current = new EventSource(url, { withCredentials: true });

      lastMsgTsRef.current = Date.now();

      esRef.current.onopen = () => {
        reconnectAttemptRef.current = 0;
        lastMsgTsRef.current = Date.now();
      };

      esRef.current.onerror = () => {
        try { esRef.current?.close(); } catch {}
        esRef.current = null;
        scheduleReconnect();
      };

      esRef.current.onmessage = (ev) => {
        lastMsgTsRef.current = Date.now();

        const raw = ev.data;
        if (!raw || raw[0] !== '{') return;

        let msg;
        try { msg = JSON.parse(raw); } catch { return; }

        if (msg.type === 'init') {
          const st = msg?.data?.state || null;

          setEvent((prev) => {
            // si on n’a pas encore l’event (métadonnées), on tente d’en créer un minimum
            if (!prev) return { ...(msg?.data?.event || {}), state: st };
            return { ...prev, state: st };
          });

          if (Array.isArray(msg?.data?.history)) setHistory(msg.data.history);

          // init total
          const initTotal = typeof st?.total === 'number' ? st.total : Number(st?.total) || 0;
          lastTotalRef.current = initTotal;
          setPreviousTotal(initTotal);
          setTotalViewers(initTotal);

          // init created_at si absent côté getEvent
          if (!createdAtRef.current && msg?.data?.event?.created_at) {
            createdAtRef.current = msg.data.event.created_at;
          }

          return;
        }

        if (msg.type === 'tick') {
          // buffer
          sseBufferRef.current.lastState = {
            total: msg.data.total,
            streams: Object.fromEntries((msg.data.streams || []).map((s) => [s.id, s]))
          };

          sseBufferRef.current.totals.push({ ts: msg.data.ts, total: msg.data.total });

          for (const s of msg.data.streams || []) {
            const list = sseBufferRef.current.streams.get(s.id) || [];
            list.push({ ts: msg.data.ts, current: s.current });
            sseBufferRef.current.streams.set(s.id, list);
          }

          if (!sseFlushTimerRef.current) {
            sseFlushTimerRef.current = setTimeout(() => {
              sseFlushTimerRef.current = null;

              const buf = sseBufferRef.current;

              // A) total + delta
              if (buf.lastState) {
                const newTotal =
                  typeof buf.lastState.total === 'number'
                    ? buf.lastState.total
                    : Number(buf.lastState.total) || 0;

                setPreviousTotal(lastTotalRef.current);
                setTotalViewers(newTotal);
                lastTotalRef.current = newTotal;

                setEvent((prev) => (prev ? { ...prev, state: buf.lastState } : prev));
              }

              // B) ajouter point au graphe (history)
              if (buf.totals.length) {
                setHistory((prev) => {
                  const next = prev.concat(buf.totals);

                  // couper par created_at si connu
                  const cutoffMs = createdAtRef.current ? new Date(createdAtRef.current).getTime() : 0;
                  const filtered = cutoffMs
                    ? next.filter((row) => new Date(row.ts).getTime() >= cutoffMs)
                    : next;

                  const MAX = 5000;
                  return filtered.length > MAX ? filtered.slice(filtered.length - MAX) : filtered;
                });
                buf.totals = [];
              }

              // C) historique par stream
              if (buf.streams.size) {
                setStreamsHistory((prev) => {
                  const cutoffMs = createdAtRef.current ? new Date(createdAtRef.current).getTime() : 0;
                  const next = { ...prev };

                  for (const [sid, arrNew] of buf.streams.entries()) {
                    const arrOld = next[sid] || [];
                    const merged = arrOld.concat(arrNew);
                    const filtered = cutoffMs
                      ? merged.filter((row) => new Date(row.ts).getTime() >= cutoffMs)
                      : merged;

                    const MAX = 5000;
                    next[sid] = filtered.length > MAX ? filtered.slice(filtered.length - MAX) : filtered;
                  }
                  return next;
                });
                buf.streams.clear();
              }

              // D) redraw chart
              try {
                const chart = getChartInstance(totalChartRef);
                if (chart) chart.update('none');
              } catch {}
            }, SSE_THROTTLE_MS);
          }
        }
      };

      // Heartbeat: si plus de messages, reconnect
      sseMonitorTimerRef.current = setInterval(() => {
        // si ton backend tick toutes les 10–20s, 35s est safe
        const THRESHOLD_MS = 35000;
        if (Date.now() - lastMsgTsRef.current > THRESHOLD_MS) {
          try { esRef.current?.close(); } catch {}
          esRef.current = null;
          scheduleReconnect();
        }
      }, 5000);
    };

    setupES();

    const handleVisibility = () => {
      if (document.hidden) {
        try { esRef.current?.close(); } catch {}
        esRef.current = null;
      } else {
        setupES();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      cleanup();
    };
  }, [id, API_BASE]);

  // 3) Charger l’historique JSON initial (fallback + streams) sans casser le live
  useEffect(() => {
    let aborted = false;

    (async () => {
      try {
        const url = `${API_BASE}/events/${id}/history?minutes=1440&streams=1&limit=5000`;
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) return;

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
      } catch {}
    })();

    return () => {
      aborted = true;
    };
  }, [id, API_BASE]);

  // 4) IMPORTANT: hook toujours appelé (fix React #310) + force redraw quand history change
  useEffect(() => {
    try {
      const chart = getChartInstance(totalChartRef);
      if (chart) chart.update('none');
    } catch {}
  }, [history]);

  if (!event) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #0c2164ff 50%, #db2777 100%)',
          color: 'white'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '60px',
              height: '60px',
              border: '3px solid rgba(255,255,255,0.3)',
              borderTopColor: '#f59e0b',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem'
            }}
          />
          <div style={{ fontSize: '1.2rem', fontWeight: '500' }}>Chargement...</div>
        </div>
      </div>
    );
  }

  const streamList = event.streams || [];

  // Chart series
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
  const seriesPoints = series.map((p) => ({
    x: new Date(p.ts),
    y: typeof p.total === 'number' ? p.total : Number(p.total) || 0
  }));

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
  const timeUnit = totalMinutes >= 1440 ? 'day' : totalMinutes >= 360 ? 'hour' : 'minute';

  const seriesVisiblePoints = seriesPoints.filter((p) => p.x >= xMin && p.x <= xMax);
  const visibleYs = seriesVisiblePoints.map((p) => (typeof p.y === 'number' ? p.y : Number(p.y) || 0));
  const maxTotal = visibleYs.length ? Math.max(10, ...visibleYs) : 10;
  const minTotal = visibleYs.length ? Math.min(...visibleYs) : 0;

  const data = {
    datasets: [
      {
        id: 'total',
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
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    parsing: false,
    normalized: false,
    plugins: {
      legend: { display: false },
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
        beginAtZero: false,
        min: Math.max(0, Math.floor(minTotal * 0.95)),
        max: Math.max(Math.ceil(maxTotal * 1.05), 11),
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        ticks: { color: 'rgba(255, 255, 255, 0.7)' }
      }
    },
    animation: false,
    elements: { point: { radius: 0 } },
    interaction: { intersect: false, mode: 'index' },
    spanGaps: true
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1e1b4b 0%, #0c2164ff 50%, #db2777 100%)',
        color: 'white',
        position: 'relative'
      }}
    >
      <ParticleSystem />

      <div style={{ position: 'relative', zIndex: 10 }}>
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
              const el = e.currentTarget;
              el.style.transform = 'translateY(-2px)';
              el.style.boxShadow = '0 8px 25px rgba(139, 92, 246, 0.3)';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.transform = 'translateY(0)';
              el.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
            }}
          >
            ← Retour à l&apos;évènement
          </Link>
        </div>

        <div
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
            padding: '2rem 1rem',
            textAlign: 'center'
          }}
        >
          <div style={{ marginBottom: '1rem' }}>
            <img src={bsrqLogo} alt="BSRQ" style={{ height: '60px' }} />
          </div>

          <h1
            style={{
              margin: '0 0 1rem 0',
              fontSize: '2.5rem',
              fontWeight: '700',
              background: 'linear-gradient(45deg, #f59e0b, #ef4444, #0c2164ff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            📊 Dashboard Live
          </h1>

          <div
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '20px',
              padding: '2rem',
              maxWidth: '400px',
              margin: '0 auto',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
            }}
          >
            <div
              style={{
                fontSize: '0.9rem',
                color: 'rgba(255,255,255,0.8)',
                marginBottom: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}
            >
              Total Spectateurs
            </div>

            <div
              style={{
                fontSize: '3.5rem',
                fontWeight: '800',
                background: 'linear-gradient(45deg, #10b981, #3b82f6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                lineHeight: '1'
              }}
            >
              {Number(totalViewers || 0).toLocaleString()}
            </div>

            {Number(totalViewers || 0) !== Number(previousTotal || 0) && (
              <div
                style={{
                  color: Number(totalViewers || 0) >= Number(previousTotal || 0) ? '#10b981' : '#ef4444',
                  fontSize: '0.9rem',
                  marginTop: '0.5rem',
                  animation: 'bounce 1s infinite'
                }}
              >
                {Number(totalViewers || 0) >= Number(previousTotal || 0)
                  ? `📈 +${(Number(totalViewers || 0) - Number(previousTotal || 0)).toLocaleString()}`
                  : `📉 ${(
                      Number(totalViewers || 0) - Number(previousTotal || 0)
                    ).toLocaleString()}`}
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: '2rem 1rem' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem'
            }}
          >
            {streamList.map((s) => {
              const st = event.state?.streams?.[s.id];
              return (
                <DynamicStreamCard
                  key={s.id}
                  label={s.label}
                  current={typeof st?.current === 'number' ? st.current : Number(st?.current) || 0}
                  online={Boolean(st?.online)}
                />
              );
            })}
          </div>

          <div
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '20px',
              padding: '2rem',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
            }}
          >
            <h3
              style={{
                margin: '0 0 1.5rem 0',
                fontSize: '1.5rem',
                fontWeight: '600',
                background: 'linear-gradient(45deg, #0c2164ff, #3b82f6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              📈 Évolution Temps Réel
            </h3>

            <div style={{ height: '300px', position: 'relative' }}>
              <Line ref={totalChartRef} data={data} options={options} datasetIdKey="id" />
              {seriesVisiblePoints.length === 0 && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(255,255,255,0.9)',
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.05) 100%)',
                    borderRadius: '16px'
                  }}
                >
                  Aucune donnée disponible sur la période.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  const chart = getChartInstance(totalChartRef);
                  if (chart) downloadDataUrl(`total_viewers_${id}.png`, chart.toBase64Image());
                }}
                style={{
                  background: 'linear-gradient(45deg, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '10px',
                  cursor: 'pointer'
                }}
              >
                Exporter PNG
              </button>

              <button
                onClick={() => exportTotalCsvLocal(`event_${id}_total_viewers.csv`)}
                style={{
                  background: 'linear-gradient(45deg, #3b82f6, #0ea5e9)',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '10px',
                  cursor: 'pointer'
                }}
              >
                Exporter CSV (Heure, Total)
              </button>

              <button
                onClick={async () => {
                  try {
                    setJobExporting(true);
                    setJobProgress(0);
                    setJobId(null);

                    const payload = event?.created_at
                      ? { type: 'total', from: event.created_at, to: new Date().toISOString() }
                      : { type: 'total', minutes: 180 };

                    const res = await fetch(`${API_BASE}/events/${id}/export`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify(payload)
                    });

                    const json = await res.json();
                    if (!json.jobId) throw new Error('jobId manquant');

                    setJobId(json.jobId);

                    const poll = async () => {
                      const sres = await fetch(`${API_BASE}/exports/${json.jobId}/status`, { credentials: 'include' });
                      const sdata = await sres.json();

                      if (sdata.status === 'done') {
                        setJobExporting(false);
                        const url = `${API_BASE}/exports/${json.jobId}/download`;
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = event?.created_at ? `event_${id}_history_all.csv` : `event_${id}_history_180m.csv`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        return;
                      }

                      if (sdata.status === 'error') {
                        setJobExporting(false);
                        return;
                      }

                      setJobProgress(sdata.progress || 0);
                      setTimeout(poll, 1000);
                    };

                    poll();
                  } catch {
                    setJobExporting(false);
                  }
                }}
                style={{
                  background: 'linear-gradient(45deg, #f59e0b, #ef4444)',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '10px',
                  cursor: 'pointer'
                }}
              >
                {jobExporting ? `Job… ${jobProgress}` : 'Exporter CSV (async)'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button
              onClick={() => setShowStreamCharts((v) => !v)}
              style={{
                background: showStreamCharts
                  ? 'linear-gradient(45deg, #ef4444, #f59e0b)'
                  : 'linear-gradient(45deg, #10b981, #059669)',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '10px',
                cursor: 'pointer'
              }}
            >
              {showStreamCharts ? 'Masquer les graphiques par stream' : 'Afficher les graphiques par stream'}
            </button>
          </div>

          {showStreamCharts && (event.streams || []).length > 0 && (
            <div
              style={{
                marginTop: '2rem',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '20px',
                padding: '2rem',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
              }}
            >
              <h3
                style={{
                  margin: '0 0 1.5rem 0',
                  fontSize: '1.5rem',
                  fontWeight: '600',
                  background: 'linear-gradient(45deg, #0c2164ff, #3b82f6)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                📈 Par stream
              </h3>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: '1rem'
                }}
              >
                {(event.streams || []).map((stream) => {
                  const rows = reduceSeries(streamsHistory[stream.id] || []);
                  const points = rows.map((r) => ({
                    x: new Date(r.ts),
                    y: typeof r.current === 'number' ? r.current : Number(r.current) || 0
                  }));

                  const st = event.state?.streams?.[stream.id];
                  const sd = {
                    datasets: [
                      {
                        id: stream.id,
                        label: stream.label,
                        data: points,
                        borderColor: st?.online ? '#10b981' : '#ef4444',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        borderWidth: 2,
                        tension: 0.3,
                        pointRadius: 0
                      }
                    ]
                  };

                  return (
                    <div
                      key={stream.id}
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '12px',
                        padding: '1rem'
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'white' }}>
                        🎬 {stream.label}
                      </div>

                      <div style={{ height: '200px' }}>
                        <Line
                          ref={(el) => {
                            streamChartRefs.current[stream.id] = el;
                          }}
                          data={sd}
                          options={{ ...options, maintainAspectRatio: false }}
                          datasetIdKey="id"
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button
                          onClick={() => {
                            const refObj = { current: streamChartRefs.current[stream.id] };
                            const chart = getChartInstance(refObj);
                            if (chart) {
                              downloadDataUrl(
                                `${stream.label.replace(/\s+/g, '_')}_viewers_${id}.png`,
                                chart.toBase64Image()
                              );
                            }
                          }}
                          style={{
                            background: 'linear-gradient(45deg, #10b981, #059669)',
                            color: 'white',
                            border: 'none',
                            padding: '0.4rem 0.8rem',
                            borderRadius: '8px',
                            cursor: 'pointer'
                          }}
                        >
                          PNG
                        </button>

                        <button
                          onClick={() => {
                            const nowIso = new Date().toISOString();
                            const url = event?.created_at
                              ? `${API_BASE}/events/${id}/streams/${stream.id}/history.csv?from=${encodeURIComponent(
                                  event.created_at
                                )}&to=${encodeURIComponent(nowIso)}`
                              : `${API_BASE}/events/${id}/streams/${stream.id}/history.csv?minutes=180`;

                            const a = document.createElement('a');
                            a.href = url;
                            a.download = event?.created_at
                              ? `${stream.label.replace(/\s+/g, '_')}_viewers_${id}_all.csv`
                              : `${stream.label.replace(/\s+/g, '_')}_viewers_${id}_180m.csv`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          }}
                          style={{
                            background: 'linear-gradient(45deg, #3b82f6, #0ea5e9)',
                            color: 'white',
                            border: 'none',
                            padding: '0.4rem 0.8rem',
                            borderRadius: '8px',
                            cursor: 'pointer'
                          }}
                        >
                          CSV
                        </button>

                        <button
                          onClick={async () => {
                            try {
                              const payload = event?.created_at
                                ? { type: 'stream', sid: stream.id, from: event.created_at, to: new Date().toISOString() }
                                : { type: 'stream', sid: stream.id, minutes: 180 };

                              const res = await fetch(`${API_BASE}/events/${id}/export`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify(payload)
                              });

                              const json = await res.json();
                              if (!json.jobId) return;

                              const poll = async () => {
                                const sres = await fetch(`${API_BASE}/exports/${json.jobId}/status`, { credentials: 'include' });
                                const sdata = await sres.json();

                                if (sdata.status === 'done') {
                                  const url = `${API_BASE}/exports/${json.jobId}/download`;
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = event?.created_at
                                    ? `${stream.label.replace(/\s+/g, '_')}_viewers_${id}_all.csv`
                                    : `${stream.label.replace(/\s+/g, '_')}_viewers_${id}_180m.csv`;
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                  return;
                                }

                                if (sdata.status === 'error') return;
                                setTimeout(poll, 1000);
                              };

                              poll();
                            } catch {}
                          }}
                          style={{
                            background: 'linear-gradient(45deg, #f59e0b, #ef4444)',
                            color: 'white',
                            border: 'none',
                            padding: '0.4rem 0.8rem',
                            borderRadius: '8px',
                            cursor: 'pointer'
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
