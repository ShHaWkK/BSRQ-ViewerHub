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
  Decimation,
} from 'chart.js';
import 'chartjs-adapter-date-fns';

import { getEvent } from '../api.js';
import bsrqLogo from '../assets/bsrq.png';

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  Filler,
  Decimation
);

/* --------------------------
   Particle background
--------------------------- */
const ParticleSystem = () => {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReduced =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const ctx = canvas.getContext('2d');

    const updateCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

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
          hue: Math.random() * 360,
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

    updateCanvasSize();
    createParticles();
    animate();

    const handleResize = () => {
      updateCanvasSize();
      createParticles();
    };

    const handleVisibility = () => {
      if (!document.hidden && !animationRef.current) {
        animate();
      }
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
        opacity: 0.2,
      }}
    />
  );
};

/* --------------------------
   Stream card
--------------------------- */
const DynamicStreamCard = ({ label, current, online }) => {
  const [displayViewers, setDisplayViewers] = useState(current ?? 0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const cur = typeof current === 'number' ? current : Number(current) || 0;

    if (cur !== displayViewers) {
      setIsAnimating(true);

      const duration = 700;
      const startTime = Date.now();
      const startValue = displayViewers;
      const targetValue = cur;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        const v = Math.round(startValue + (targetValue - startValue) * eased);
        setDisplayViewers(v);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
        }
      };

      animate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  return (
    <div
      className="stream-card"
      style={{
        background:
          'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: '16px',
        padding: '1.5rem',
        margin: '0.5rem',
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
          background:
            'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
          animation: online ? 'shine 3s infinite' : 'none',
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
        <h3
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
              animation: online ? 'pulse 2s infinite' : 'none',
            }}
          />
          <span
            style={{
              fontSize: '0.8rem',
              color: online ? '#10b981' : '#ef4444',
              fontWeight: '500',
            }}
          >
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
            animation: isAnimating ? 'glow 0.5s ease-in-out' : 'none',
          }}
        >
          {displayViewers?.toLocaleString() || 0}
        </div>
        <div
          style={{
            fontSize: '0.9rem',
            color: 'rgba(255,255,255,0.7)',
            marginTop: '0.25rem',
          }}
        >
          spectateurs
        </div>
      </div>

      <div
        style={{
          marginTop: '1rem',
          height: '4px',
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderRadius: '2px',
          overflow: 'hidden',
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
            boxShadow: online ? '0 0 10px rgba(16, 185, 129, 0.5)' : 'none',
          }}
        />
      </div>
    </div>
  );
};

/* --------------------------
   Helpers chart ref
--------------------------- */
const getChartInstance = (refObj) => {
  const r = refObj?.current;
  if (!r) return null;
  // react-chartjs-2 versions differ: sometimes ref is chart instance, sometimes { chart }
  return r.chart || r;
};

/* --------------------------
   Dashboard
--------------------------- */
export default function Dashboard() {
  const { id } = useParams();

  const host =
    typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const proto =
    typeof window !== 'undefined' ? window.location.protocol : 'http:';

  let API_BASE = import.meta.env.VITE_API_URL || `${proto}//${host}:4000`;

  // Dev proxy fallback: si API_BASE est relative, basculer SSE/Fetch vers :4000 en dev ports
  if (
    typeof API_BASE === 'string' &&
    API_BASE.startsWith('/') &&
    typeof window !== 'undefined'
  ) {
    const port = window.location.port;
    const devPorts = new Set(['3000', '3001', '3019']);
    if (devPorts.has(port)) {
      API_BASE = `${proto}//${host}:4000`;
    }
  }

  const SSE_BASE =
    typeof API_BASE === 'string' && API_BASE.startsWith('/')
      ? `${proto}//${host}:4000`
      : API_BASE;

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
  const lastMsgTsRef = useRef(Date.now());

  const createdAtRef = useRef(null);
  const pollIntervalSecRef = useRef(60);
  const lastTotalRef = useRef(0);

  const sseBufferRef = useRef({
    totals: [],
    streams: new Map(),
    lastState: null,
  });

  // Rend le live "visible" sans saturer React
  const SSE_THROTTLE_MS = 250;

  // IMPORTANT: downsampling qui garde TOUJOURS le dernier point (sinon le graphe “s’arrête”)
  const MAX_POINTS = 3000;
  const reduceSeries = (rows) => {
    if (!Array.isArray(rows)) return [];
    if (rows.length <= MAX_POINTS) return rows;

    const stride = Math.ceil(rows.length / MAX_POINTS);
    const out = [];
    for (let i = 0; i < rows.length; i += stride) out.push(rows[i]);

    const last = rows[rows.length - 1];
    if (out[out.length - 1] !== last) out.push(last);

    return out;
  };

  /* --------------------------
     Load event + SSE live stream
  --------------------------- */
  useEffect(() => {
    let cancelled = false;

    // 1) Charger l’event (info + état initial)
    (async () => {
      try {
        const ev = await getEvent(id);
        if (cancelled) return;

        setEvent(ev);

        createdAtRef.current = ev?.created_at || null;
        pollIntervalSecRef.current =
          (ev?.pollIntervalSec && Number(ev.pollIntervalSec)) || 60;

        const initialTotal =
          typeof ev?.state?.total === 'number'
            ? ev.state.total
            : Number(ev?.state?.total) || 0;

        lastTotalRef.current = initialTotal;
        setPreviousTotal(initialTotal);
        setTotalViewers(initialTotal);
      } catch {
        // silencieux: l’UI SSE init fera le reste si dispo
      }
    })();

    // 2) SSE setup
    const cleanupES = () => {
      try {
        if (esRef.current) esRef.current.close();
      } catch {}
      esRef.current = null;

      if (sseMonitorTimerRef.current) {
        clearInterval(sseMonitorTimerRef.current);
        sseMonitorTimerRef.current = null;
      }

      if (sseFlushTimerRef.current) {
        clearTimeout(sseFlushTimerRef.current);
        sseFlushTimerRef.current = null;
      }
    };

    const setupES = () => {
      if (cancelled) return;

      cleanupES();

      const params = `minutes=1440`;
      const url = `${String(SSE_BASE).replace(/\/+$/, '')}/events/${id}/stream?${params}`;

      esRef.current = new EventSource(url);
      lastMsgTsRef.current = Date.now();

      // Monitor: si on ne reçoit rien, on reconnecte
      sseMonitorTimerRef.current = setInterval(() => {
        const pollSec = pollIntervalSecRef.current || 60;
        const thresholdMs = Math.max(20000, pollSec * 2000);
        if (Date.now() - lastMsgTsRef.current > thresholdMs) {
          setupES();
        }
      }, 5000);

      esRef.current.onopen = () => {
        lastMsgTsRef.current = Date.now();
      };

      esRef.current.onerror = () => {
        // Reconnexion simple (EventSource réessaie déjà, mais on force un reset propre)
        // pour éviter les états "bloqués" selon proxy/infra.
        try {
          if (esRef.current) esRef.current.close();
        } catch {}
        esRef.current = null;

        // petit backoff
        setTimeout(() => {
          if (!cancelled && !document.hidden) setupES();
        }, 1000);
      };

      esRef.current.onmessage = (ev) => {
        const raw = ev.data;
        if (!raw || raw[0] !== '{') return;

        let msg;
        try {
          msg = JSON.parse(raw);
        } catch {
          return;
        }

        lastMsgTsRef.current = Date.now();

        if (msg.type === 'init') {
          // état initial + history
          const st = msg?.data?.state || null;
          const hist = Array.isArray(msg?.data?.history) ? msg.data.history : [];

          sseBufferRef.current.lastState = st;

          setEvent((prev) => (prev ? { ...prev, state: st } : prev));
          setHistory(hist);

          // total initial
          const initTotal =
            typeof st?.total === 'number' ? st.total : Number(st?.total) || 0;

          setPreviousTotal(initTotal);
          setTotalViewers(initTotal);
          lastTotalRef.current = initTotal;

          // poll interval dynamique si backend le fournit
          if (msg?.data?.pollIntervalSec) {
            const p = Number(msg.data.pollIntervalSec);
            if (Number.isFinite(p) && p > 0) pollIntervalSecRef.current = p;
          }
        }

        if (msg.type === 'tick') {
          const ts = msg.data.ts;
          const total = msg.data.total;
          const streamsArr = Array.isArray(msg.data.streams) ? msg.data.streams : [];

          // buffer state
          sseBufferRef.current.lastState = {
            total,
            streams: Object.fromEntries(streamsArr.map((s) => [s.id, s])),
          };

          sseBufferRef.current.totals.push({ ts, total });

          for (const s of streamsArr) {
            const list = sseBufferRef.current.streams.get(s.id) || [];
            list.push({ ts, current: s.current });
            sseBufferRef.current.streams.set(s.id, list);
          }

          const scheduleFlush = () => {
            if (sseFlushTimerRef.current) return;

            sseFlushTimerRef.current = setTimeout(() => {
              sseFlushTimerRef.current = null;

              const buf = sseBufferRef.current;

              // 1) état courant
              if (buf.lastState) {
                setEvent((prev) => (prev ? { ...prev, state: buf.lastState } : prev));

                const sum = Object.values(buf.lastState.streams || {}).reduce(
                  (acc, s) => acc + (typeof s.current === 'number' ? s.current : Number(s.current) || 0),
                  0
                );

                // delta display fiable
                setPreviousTotal(lastTotalRef.current);
                setTotalViewers(sum);
                lastTotalRef.current = sum;
              }

              // cutoff (éviter d’afficher avant created_at)
              const cutoff =
                createdAtRef.current ? new Date(createdAtRef.current).getTime() : 0;

              // 2) historique total
              if (buf.totals.length) {
                setHistory((h) => {
                  const next = h.concat(buf.totals);
                  buf.totals = [];
                  return cutoff ? next.filter((row) => new Date(row.ts).getTime() >= cutoff) : next;
                });
              }

              // 3) historique par stream
              if (buf.streams.size) {
                setStreamsHistory((prev) => {
                  const next = { ...prev };
                  for (const [sid, arrNew] of buf.streams.entries()) {
                    const arr = next[sid] || [];
                    const merged = arr.concat(arrNew);
                    next[sid] = cutoff
                      ? merged.filter((row) => new Date(row.ts).getTime() >= cutoff)
                      : merged;
                  }
                  buf.streams.clear();
                  return next;
                });
              }

              // 4) redraw chart pour être sûr (certaines configs chartjs/react-chartjs-2 le nécessitent)
              try {
                const chart = getChartInstance(totalChartRef);
                if (chart && typeof chart.update === 'function') chart.update('none');
              } catch {}
            }, SSE_THROTTLE_MS);
          };

          scheduleFlush();
        }
      };
    };

    setupES();

    const handleVisibility = () => {
      if (document.hidden) {
        cleanupES();
      } else {
        setupES();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      cleanupES();
    };
  }, [id, SSE_BASE]);

  /* --------------------------
     Load initial JSON history (fallback/complément)
  --------------------------- */
  useEffect(() => {
    let aborted = false;

    (async () => {
      try {
        const url = `${String(API_BASE).replace(/\/+$/, '')}/events/${id}/history?minutes=1440&streams=1&limit=5000`;
        let res = await fetch(url);

        if (!res.ok) return;

        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) {
          // fallback direct :4000
          const direct = `${proto}//${host}:4000`;
          res = await fetch(
            `${direct.replace(/\/+$/, '')}/events/${id}/history?minutes=1440&streams=1&limit=5000`
          );
          if (!res.ok) return;
        }

        const data = await res.json();
        if (aborted) return;

        if (Array.isArray(data.history)) setHistory(data.history);

        if (Array.isArray(data.streams)) {
          const grouped = {};
          for (const row of data.streams) {
            const sid = row.stream_id;
            const arr = grouped[sid] || [];
            arr.push({ ts: row.ts, current: row.concurrent_viewers });
            grouped[sid] = arr;
          }
          setStreamsHistory(grouped);
        }
      } catch {
        // silencieux
      }
    })();

    return () => {
      aborted = true;
    };
  }, [id, API_BASE, host, proto]);

  /* --------------------------
     Chart models (memo)
  --------------------------- */
  const streamList = event?.streams || [];

  // bornes X basées sur history/streamsHistory
  const xBounds = useMemo(() => {
    const now = new Date();

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
      if (createdAtRef.current) return { xMin: new Date(createdAtRef.current), xMax: now };
      return { xMin: new Date(Date.now() - 3 * 60 * 60 * 1000), xMax: now };
    }

    return { xMin: new Date(t), xMax: now };
  }, [history, streamsHistory]);

  const timeUnit = useMemo(() => {
    const totalMinutes = Math.max(
      1,
      Math.round((xBounds.xMax.getTime() - xBounds.xMin.getTime()) / 60000)
    );
    return totalMinutes >= 1440 ? 'day' : totalMinutes >= 360 ? 'hour' : 'minute';
  }, [xBounds]);

  // total series points (downsample + keep last)
  const totalVisiblePoints = useMemo(() => {
    const series = reduceSeries(history);
    const points = series.map((p) => ({
      x: new Date(p.ts),
      y: typeof p.total === 'number' ? p.total : Number(p.total) || 0,
    }));
    return points.filter((p) => p.x >= xBounds.xMin && p.x <= xBounds.xMax);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, xBounds.xMin, xBounds.xMax]);

  const totalData = useMemo(() => {
    return {
      datasets: [
        {
          id: 'total',
          label: 'Spectateurs',
          data: totalVisiblePoints,
          borderColor: '#0c2164ff',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 0,
        },
      ],
    };
  }, [totalVisiblePoints]);

  const totalOptions = useMemo(() => {
    const ys = totalVisiblePoints.map((p) => (typeof p.y === 'number' ? p.y : Number(p.y) || 0));
    const maxY = ys.length ? Math.max(10, ...ys) : 10;
    const minY = ys.length ? Math.min(...ys) : 0;

    return {
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
          borderWidth: 1,
        },
        decimation: {
          enabled: true,
          algorithm: 'lttb',
          threshold: 500,
        },
      },
      scales: {
        x: {
          type: 'time',
          time: { unit: timeUnit },
          min: xBounds.xMin,
          max: xBounds.xMax,
          grid: { color: 'rgba(255, 255, 255, 0.1)' },
          ticks: { color: 'rgba(255, 255, 255, 0.7)', maxTicksLimit: 10 },
        },
        y: {
          beginAtZero: false,
          min: Math.max(0, Math.floor(minY * 0.95)),
          max: Math.max(Math.ceil(maxY * 1.05), 11),
          grid: { color: 'rgba(255, 255, 255, 0.1)' },
          ticks: { color: 'rgba(255, 255, 255, 0.7)' },
        },
      },
      animation: false,
      elements: { point: { radius: 0 } },
      interaction: { intersect: false, mode: 'index' },
      spanGaps: true,
    };
  }, [timeUnit, xBounds, totalVisiblePoints]);

  // Hook sûr: redraw chart quand les points changent (PLACÉ AVANT tout return conditionnel)
  useEffect(() => {
    try {
      const chart = getChartInstance(totalChartRef);
      if (chart && typeof chart.update === 'function') chart.update('none');
    } catch {}
  }, [totalVisiblePoints]);

  /* --------------------------
     Export helpers
  --------------------------- */
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
        second: '2-digit',
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

  /* --------------------------
     Render: loading
  --------------------------- */
  if (!event) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'linear-gradient(135deg, #1e1b4b 0%, #0c2164ff 50%, #db2777 100%)',
          color: 'white',
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
              margin: '0 auto 1rem',
            }}
          />
          <div style={{ fontSize: '1.2rem', fontWeight: '500' }}>
            Chargement...
          </div>
        </div>
      </div>
    );
  }

  /* --------------------------
     Render: main
  --------------------------- */
  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'linear-gradient(135deg, #1e1b4b 0%, #0c2164ff 50%, #db2777 100%)',
        color: 'white',
        position: 'relative',
      }}
    >
      <ParticleSystem />

      <div style={{ position: 'relative', zIndex: 10 }}>
        {/* Back */}
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
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow =
                '0 8px 25px rgba(139, 92, 246, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
            }}
          >
            ← Retour à l&apos;évènement
          </Link>
        </div>

        {/* Header */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
            padding: '2rem 1rem',
            textAlign: 'center',
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
              backgroundClip: 'text',
            }}
          >
            📊 Dashboard Live
          </h1>

          <div
            style={{
              background:
                'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '20px',
              padding: '2rem',
              maxWidth: '400px',
              margin: '0 auto',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}
          >
            <div
              style={{
                fontSize: '0.9rem',
                color: 'rgba(255,255,255,0.8)',
                marginBottom: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '1px',
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
                lineHeight: '1',
              }}
            >
              {totalViewers?.toLocaleString() || 0}
            </div>

            {totalViewers > previousTotal && (
              <div
                style={{
                  color: '#10b981',
                  fontSize: '0.9rem',
                  marginTop: '0.5rem',
                  animation: 'bounce 1s infinite',
                }}
              >
                📈 +{(totalViewers - previousTotal).toLocaleString()}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '2rem 1rem' }}>
          {/* Streams grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem',
            }}
          >
            {streamList.map((s) => {
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

          {/* Total chart + export */}
          <div
            style={{
              background:
                'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '20px',
              padding: '2rem',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
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
                backgroundClip: 'text',
              }}
            >
              📈 Évolution Temps Réel
            </h3>

            <div style={{ height: '300px', position: 'relative' }}>
              <Line
                ref={totalChartRef}
                data={totalData}
                options={totalOptions}
                datasetIdKey="id"
              />
              {totalVisiblePoints.length === 0 && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(255,255,255,0.9)',
                    fontWeight: 600,
                    background:
                      'linear-gradient(135deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.05) 100%)',
                    borderRadius: '16px',
                  }}
                >
                  Aucune donnée disponible sur la période.
                </div>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                marginTop: '1rem',
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
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
                  cursor: 'pointer',
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
                  cursor: 'pointer',
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

                    const payload = createdAtRef.current
                      ? { type: 'total', from: createdAtRef.current, to: new Date().toISOString() }
                      : { type: 'total', minutes: 180 };

                    const res = await fetch(`${String(API_BASE).replace(/\/+$/, '')}/events/${id}/export`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(payload),
                    });

                    const data = await res.json();
                    if (!data.jobId) throw new Error('jobId manquant');

                    setJobId(data.jobId);

                    const poll = async () => {
                      const sres = await fetch(
                        `${String(API_BASE).replace(/\/+$/, '')}/exports/${data.jobId}/status`
                      );
                      const sdata = await sres.json();

                      if (sdata.status === 'done') {
                        setJobExporting(false);
                        const url = `${String(API_BASE).replace(/\/+$/, '')}/exports/${data.jobId}/download`;
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = createdAtRef.current
                          ? `event_${id}_history_all.csv`
                          : `event_${id}_history_180m.csv`;
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
                  cursor: 'pointer',
                }}
              >
                {jobExporting ? `Job… ${jobProgress}` : 'Exporter CSV (async)'}
              </button>
            </div>
          </div>

          {/* Toggle stream charts */}
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
                cursor: 'pointer',
              }}
            >
              {showStreamCharts ? 'Masquer les graphiques par stream' : 'Afficher les graphiques par stream'}
            </button>
          </div>

          {/* Stream charts */}
          {showStreamCharts && streamList.length > 0 && (
            <div
              style={{
                marginTop: '2rem',
                background:
                  'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '20px',
                padding: '2rem',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
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
                  backgroundClip: 'text',
                }}
              >
                📈 Par stream
              </h3>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: '1rem',
                }}
              >
                {streamList.map((stream) => {
                  const rows = reduceSeries(streamsHistory[stream.id] || []);
                  const points = rows.map((r) => ({
                    x: new Date(r.ts),
                    y: typeof r.current === 'number' ? r.current : Number(r.current) || 0,
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
                        pointRadius: 0,
                      },
                    ],
                  };

                  // options stream: on garde le même X live, mais on laisse Y auto
                  const so = {
                    ...totalOptions,
                    scales: {
                      ...totalOptions.scales,
                      y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: 'rgba(255, 255, 255, 0.7)' },
                      },
                    },
                  };

                  return (
                    <div
                      key={stream.id}
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '12px',
                        padding: '1rem',
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'white' }}>
                        🎬 {stream.label}
                      </div>

                      <div style={{ height: '200px' }}>
                        <Line
                          ref={(el) => (streamChartRefs.current[stream.id] = el)}
                          data={sd}
                          options={so}
                          datasetIdKey="id"
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button
                          onClick={() => {
                            const chart = getChartInstance({ current: streamChartRefs.current[stream.id] });
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
                            cursor: 'pointer',
                          }}
                        >
                          PNG
                        </button>

                        <button
                          onClick={() => {
                            const nowIso = new Date().toISOString();
                            const url = createdAtRef.current
                              ? `${String(API_BASE).replace(/\/+$/, '')}/events/${id}/streams/${stream.id}/history.csv?from=${encodeURIComponent(
                                  createdAtRef.current
                                )}&to=${encodeURIComponent(nowIso)}`
                              : `${String(API_BASE).replace(/\/+$/, '')}/events/${id}/streams/${stream.id}/history.csv?minutes=180`;

                            const a = document.createElement('a');
                            a.href = url;
                            a.download = createdAtRef.current
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
                            cursor: 'pointer',
                          }}
                        >
                          CSV
                        </button>

                        <button
                          onClick={async () => {
                            try {
                              const payload = createdAtRef.current
                                ? {
                                    type: 'stream',
                                    sid: stream.id,
                                    from: createdAtRef.current,
                                    to: new Date().toISOString(),
                                  }
                                : { type: 'stream', sid: stream.id, minutes: 180 };

                              const res = await fetch(
                                `${String(API_BASE).replace(/\/+$/, '')}/events/${id}/export`,
                                {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify(payload),
                                }
                              );

                              const data = await res.json();
                              if (!data.jobId) return;

                              const poll = async () => {
                                const sres = await fetch(
                                  `${String(API_BASE).replace(/\/+$/, '')}/exports/${data.jobId}/status`
                                );
                                const sdata = await sres.json();

                                if (sdata.status === 'done') {
                                  const url = `${String(API_BASE).replace(/\/+$/, '')}/exports/${data.jobId}/download`;
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = createdAtRef.current
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
                            cursor: 'pointer',
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

      {/* CSS anims */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        @keyframes bounce {
          0%,20%,53%,80%,100%{transform:translateY(0)}
          40%,43%{transform:translateY(-8px)}
          70%{transform:translateY(-4px)}
          90%{transform:translateY(-2px)}
        }
        @keyframes glow {
          0%{text-shadow:0 0 5px rgba(19,48,110,.8)}
          50%{text-shadow:0 0 20px rgba(19,48,110,.8)}
          100%{text-shadow:0 0 5px rgba(19,48,110,.5)}
        }
        @keyframes shine { 0%{left:-100%} 100%{left:100%} }
      `}</style>
    </div>
  );
}
