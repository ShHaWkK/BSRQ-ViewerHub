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

      const duration = 650;
      const startTime = Date.now();
      const startValue = displayViewers;
      const targetValue = cur;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        const v = Math.round(startValue + (targetValue - startValue) * eased);
        setDisplayViewers(v);

        if (progress < 1) requestAnimationFrame(animate);
        else setIsAnimating(false);
      };

      animate();
    }
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
            animation: isAnimating ? 'glow 0.45s ease-in-out' : 'none',
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
            transition: 'width 350ms cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: online ? '0 0 10px rgba(16, 185, 129, 0.5)' : 'none',
          }}
        />
      </div>
    </div>
  );
};

/* --------------------------
   Helpers
--------------------------- */
const safeNum = (v, d = 0) => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : d;
};

const getChartInstance = (refObj) => {
  const r = refObj?.current;
  if (!r) return null;
  return r.chart || r; // react-chartjs-2 compat
};

// Append 1 point, avoid duplicates, keep last MAX points
const appendPoint = (arr, p, MAX = 5000) => {
  const out = Array.isArray(arr) ? arr.slice() : [];
  if (!p || !p.ts) return out;

  const ts = new Date(p.ts).toISOString();
  const last = out[out.length - 1];

  if (last && new Date(last.ts).toISOString() === ts) {
    out[out.length - 1] = { ...last, ...p, ts };
  } else {
    out.push({ ...p, ts });
  }

  if (out.length > MAX) out.splice(0, out.length - MAX);
  return out;
};

/* --------------------------
   Dashboard
--------------------------- */
export default function Dashboard() {
  const { id } = useParams();

  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const proto = typeof window !== 'undefined' ? window.location.protocol : 'http:';

  let API_BASE = import.meta.env.VITE_API_URL || `${proto}//${host}:4000`;

  // Dev proxy fallback: si API_BASE est relative, basculer vers :4000 sur ports dev
  if (typeof API_BASE === 'string' && API_BASE.startsWith('/') && typeof window !== 'undefined') {
    const port = window.location.port;
    const devPorts = new Set(['3000', '3001', '3019']);
    if (devPorts.has(port)) API_BASE = `${proto}//${host}:4000`;
  }

  const SSE_BASE =
    typeof API_BASE === 'string' && API_BASE.startsWith('/')
      ? `${proto}//${host}:4000`
      : API_BASE;

  const [event, setEvent] = useState(null);

  // history total: [{ts, total}]
  const [history, setHistory] = useState([]);

  // streamsHistory: { [sid]: [{ts, current}] }
  const [streamsHistory, setStreamsHistory] = useState({});

  const [showStreamCharts, setShowStreamCharts] = useState(false);

  const [totalViewers, setTotalViewers] = useState(0);
  const [previousTotal, setPreviousTotal] = useState(0);

  const [jobExporting, setJobExporting] = useState(false);
  const [jobProgress, setJobProgress] = useState(0);
  const [jobId, setJobId] = useState(null);
  const [canExport, setCanExport] = useState(false);

  const [sseStatus, setSseStatus] = useState('connecting'); // connecting | live | reconnecting | down

  const totalChartRef = useRef(null);
  const streamChartRefs = useRef({});

  const esRef = useRef(null);
  const pollTimerRef = useRef(null);
  const sseReconnectTimerRef = useRef(null);

  const lastMsgTsRef = useRef(Date.now());
  const createdAtRef = useRef(null);
  const pollIntervalSecRef = useRef(2); // fallback poll live (2s)
  const lastTotalRef = useRef(0);

  const SSE_THROTTLE_MS = 120; // plus agressif = plus "live"
  const MAX_POINTS = 5000; // total history points
  const MAX_POINTS_STREAM = 3000;

  const flushTimerRef = useRef(null);
  const bufferRef = useRef({
    lastState: null,
    totalPoints: [],
    streamPoints: new Map(), // sid -> [{ts,current}]
  });

  useEffect(() => {
    let mounted = true;
    fetch('/api/auth/check?aud=admin', { credentials: 'same-origin' })
      .then((res) => {
        if (!mounted) return;
        setCanExport(!!res.ok);
      })
      .catch(() => {
        if (!mounted) return;
        setCanExport(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const reduceSeries = (rows, MAX = 3000) => {
    if (!Array.isArray(rows)) return [];
    if (rows.length <= MAX) return rows;

    const stride = Math.ceil(rows.length / MAX);
    const out = [];
    for (let i = 0; i < rows.length; i += stride) out.push(rows[i]);

    const last = rows[rows.length - 1];
    if (out[out.length - 1] !== last) out.push(last);
    return out;
  };

  const cleanupSSE = () => {
    try {
      if (esRef.current) esRef.current.close();
    } catch {}
    esRef.current = null;

    if (sseReconnectTimerRef.current) {
      clearTimeout(sseReconnectTimerRef.current);
      sseReconnectTimerRef.current = null;
    }

    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
  };

  const cleanupPoll = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const scheduleFlush = () => {
    if (flushTimerRef.current) return;

    flushTimerRef.current = setTimeout(() => {
      flushTimerRef.current = null;

      const buf = bufferRef.current;

      // 1) push state live
      if (buf.lastState) {
        setEvent((prev) => (prev ? { ...prev, state: buf.lastState } : prev));

        // TOTAL: priorité au total backend (vrai temps réel)
        const total = safeNum(buf.lastState.total, 0);

        setPreviousTotal(lastTotalRef.current);
        setTotalViewers(total);
        lastTotalRef.current = total;
      }

      // cutoff created_at
      const cutoff = createdAtRef.current ? new Date(createdAtRef.current).getTime() : 0;

      // 2) total points
      if (buf.totalPoints.length) {
        setHistory((prev) => {
          let next = Array.isArray(prev) ? prev : [];
          for (const p of buf.totalPoints) {
            const tsMs = new Date(p.ts).getTime();
            if (cutoff && tsMs < cutoff) continue;
            next = appendPoint(next, p, MAX_POINTS);
          }
          buf.totalPoints = [];
          return next;
        });
      }

      // 3) stream points
      if (buf.streamPoints.size) {
        setStreamsHistory((prev) => {
          const next = { ...(prev || {}) };

          for (const [sid, pts] of buf.streamPoints.entries()) {
            let arr = Array.isArray(next[sid]) ? next[sid] : [];
            for (const p of pts) {
              const tsMs = new Date(p.ts).getTime();
              if (cutoff && tsMs < cutoff) continue;
              arr = appendPoint(arr, p, MAX_POINTS_STREAM);
            }
            next[sid] = arr;
          }
          buf.streamPoints.clear();
          return next;
        });
      }

      // 4) force chart update (certaines versions react-chartjs-2)
      try {
        const chart = getChartInstance(totalChartRef);
        if (chart && typeof chart.update === 'function') chart.update('none');
      } catch {}
    }, SSE_THROTTLE_MS);
  };

  const pushTick = ({ ts, total, streamsArr }) => {
    const t = ts || new Date().toISOString();
    const tot = safeNum(total, 0);

    // state buffer
    const streamsObj = Object.fromEntries(
      (Array.isArray(streamsArr) ? streamsArr : []).map((s) => [
        s.id,
        {
          id: s.id,
          current: safeNum(s.current, 0),
          online: !!s.online,
        },
      ])
    );

    bufferRef.current.lastState = {
      total: tot,
      streams: streamsObj,
    };

    // points buffer
    bufferRef.current.totalPoints.push({ ts: t, total: tot });

    if (Array.isArray(streamsArr)) {
      for (const s of streamsArr) {
        const sid = s.id;
        if (!sid) continue;
        const list = bufferRef.current.streamPoints.get(sid) || [];
        list.push({ ts: t, current: safeNum(s.current, 0) });
        bufferRef.current.streamPoints.set(sid, list);
      }
    }

    scheduleFlush();
  };

  /* --------------------------
     Boot: load event + initial history (1 shot)
  --------------------------- */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const ev = await getEvent(id);
        if (cancelled) return;

        setEvent(ev);

        createdAtRef.current = ev?.created_at || null;

        // total initial
        const initialTotal = safeNum(ev?.state?.total, 0);
        lastTotalRef.current = initialTotal;
        setPreviousTotal(initialTotal);
        setTotalViewers(initialTotal);

        // load initial history
        try {
          const url = `${String(API_BASE).replace(/\/+$/, '')}/events/${id}/history?minutes=1440&streams=1&limit=5000`;
          const res = await fetch(url, { credentials: 'include' });
          if (res.ok) {
            const data = await res.json();
            if (cancelled) return;

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
          }
        } catch {}
      } catch {
        // si ça échoue, SSE init pourra remplir l'UI
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, API_BASE]);

  /* --------------------------
     SSE live (primary)
  --------------------------- */
  useEffect(() => {
    let cancelled = false;

    const setupSSE = () => {
      if (cancelled) return;

      cleanupSSE();
      setSseStatus((s) => (s === 'live' ? 'reconnecting' : 'connecting'));

      const params = `minutes=1440`;
      const url = `${String(SSE_BASE).replace(/\/+$/, '')}/events/${id}/stream?${params}`;

      // IMPORTANT: withCredentials = cookies cross-origin si serveur l'autorise
      try {
        esRef.current = new EventSource(url, { withCredentials: true });
      } catch {
        // si le navigateur refuse EventSource init dict, fallback sans options
        esRef.current = new EventSource(url);
      }

      lastMsgTsRef.current = Date.now();

      esRef.current.onopen = () => {
        lastMsgTsRef.current = Date.now();
        setSseStatus('live');
      };

      esRef.current.onerror = () => {
        if (cancelled) return;

        setSseStatus('reconnecting');

        try {
          if (esRef.current) esRef.current.close();
        } catch {}
        esRef.current = null;

        // backoff
        sseReconnectTimerRef.current = setTimeout(() => {
          if (!cancelled && !document.hidden) setupSSE();
        }, 900);
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
          const st = msg?.data?.state || null;
          const hist = Array.isArray(msg?.data?.history) ? msg.data.history : [];

          // event state
          if (st) {
            setEvent((prev) => (prev ? { ...prev, state: st } : prev));
            const initTotal = safeNum(st?.total, 0);

            setPreviousTotal(initTotal);
            setTotalViewers(initTotal);
            lastTotalRef.current = initTotal;
          }

          // total history
          if (hist.length) setHistory(hist);

          // poll interval backend (si fourni)
          const p = safeNum(msg?.data?.pollIntervalSec, 0);
          if (p > 0) pollIntervalSecRef.current = Math.max(1, Math.floor(p));
        }

        if (msg.type === 'tick') {
          const ts = msg?.data?.ts || new Date().toISOString();
          const total = safeNum(msg?.data?.total, 0);
          const streamsArr = Array.isArray(msg?.data?.streams) ? msg.data.streams : [];

          pushTick({ ts, total, streamsArr });
        }
      };
    };

    setupSSE();

    // watchdog: si pas de msg depuis X sec => reconnect + polling fallback
    const watchdog = setInterval(() => {
      const since = Date.now() - lastMsgTsRef.current;
      if (since > 8000) {
        // SSE pas vraiment “live”
        setSseStatus((s) => (s === 'live' ? 'reconnecting' : s));
        setupSSE();
      }
    }, 2500);

    const vis = () => {
      if (document.hidden) cleanupSSE();
      else setupSSE();
    };

    document.addEventListener('visibilitychange', vis);

    return () => {
      cancelled = true;
      clearInterval(watchdog);
      document.removeEventListener('visibilitychange', vis);
      cleanupSSE();
    };
  }, [id, SSE_BASE]);

  /* --------------------------
     Polling live (fallback) - zero refresh
     Si SSE down, on poll /events/:id (ou /history court) pour garder le direct.
  --------------------------- */
  useEffect(() => {
    let cancelled = false;

    cleanupPoll();

    pollTimerRef.current = setInterval(async () => {
      if (cancelled) return;
      if (document.hidden) return;

      // si SSE est live, pas besoin de poll
      if (sseStatus === 'live') return;

      try {
        // endpoint le plus stable: /events/:id (contient state)
        const url = `${String(API_BASE).replace(/\/+$/, '')}/events/${id}`;
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) return;

        const ev = await res.json();
        if (cancelled) return;

        // mettre à jour event (streams + state)
        setEvent((prev) => {
          if (!prev) return ev;
          return {
            ...prev,
            ...ev,
            streams: ev?.streams || prev.streams || [],
            state: ev?.state || prev.state || null,
          };
        });

        // pousser un tick local pour graphe
        const st = ev?.state || {};
        const total = safeNum(st.total, 0);

        const streamsArr = Object.entries(st.streams || {}).map(([sid, s]) => ({
          id: sid,
          current: safeNum(s?.current, 0),
          online: !!s?.online,
        }));

        pushTick({ ts: new Date().toISOString(), total, streamsArr });
      } catch {
        // ignore
      }
    }, Math.max(1000, pollIntervalSecRef.current * 1000));

    return () => {
      cancelled = true;
      cleanupPoll();
    };
  }, [id, API_BASE, sseStatus]);

  /* --------------------------
     Derived data for charts
  --------------------------- */
  const streamList = event?.streams || [];

  const xBounds = useMemo(() => {
    const now = new Date();

    let t = Infinity;

    if (Array.isArray(history) && history.length) {
      for (const row of history) {
        const ts = new Date(row.ts).getTime();
        if (Number.isFinite(ts) && ts < t) t = ts;
      }
    }

    for (const sid in streamsHistory) {
      const arr = streamsHistory[sid];
      if (Array.isArray(arr)) {
        for (const row of arr) {
          const ts = new Date(row.ts).getTime();
          if (Number.isFinite(ts) && ts < t) t = ts;
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

  const totalVisiblePoints = useMemo(() => {
    const series = reduceSeries(history, 3500);
    return series
      .map((p) => ({
        x: new Date(p.ts),
        y: safeNum(p.total, 0),
      }))
      .filter((p) => Number.isFinite(p.x.valueOf()) && Number.isFinite(p.y))
      .filter((p) => p.x >= xBounds.xMin && p.x <= xBounds.xMax);
  }, [history, xBounds]);

  const totalData = useMemo(() => {
    return {
      datasets: [
        {
          id: 'total',
          label: 'Spectateurs',
          data: totalVisiblePoints,
          borderColor: '#0c2164ff',
          backgroundColor: 'rgba(139, 92, 246, 0.12)',
          borderWidth: 3,
          fill: true,
          tension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 0,
        },
      ],
    };
  }, [totalVisiblePoints]);

  const totalOptions = useMemo(() => {
    const ys = totalVisiblePoints.map((p) => safeNum(p.y, 0));
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
        // IMPORTANT: on désactive la décimation pour éviter l'effet "ça bouge pas"
        // (tu as déjà reduceSeries + cap, c'est suffisant)
        decimation: { enabled: false },
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
      interaction: { intersect: false, mode: 'index' },
      spanGaps: true,
      elements: { point: { radius: 0 } },
    };
  }, [timeUnit, xBounds, totalVisiblePoints]);

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
      const total = safeNum(r.total, 0);
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
              margin: '0 0 0.6rem 0',
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

          {/* SSE status */}
          <div style={{ opacity: 0.85, fontWeight: 600, marginBottom: '1rem' }}>
            {sseStatus === 'live' && <span style={{ color: '#10b981' }}>LIVE</span>}
            {sseStatus === 'connecting' && <span style={{ color: '#f59e0b' }}>Connexion…</span>}
            {sseStatus === 'reconnecting' && <span style={{ color: '#f59e0b' }}>Reconnexion…</span>}
            {sseStatus === 'down' && <span style={{ color: '#ef4444' }}>Hors ligne</span>}
            <span style={{ color: 'rgba(255,255,255,0.65)', marginLeft: 10 }}>
              (sans refresh, mise à jour auto)
            </span>
          </div>

          <div
            style={{
              background:
                'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '20px',
              padding: '2rem',
              maxWidth: '420px',
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
              {safeNum(totalViewers, 0).toLocaleString()}
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
                  current={safeNum(st?.current, 0)}
                  online={!!st?.online}
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

            <div style={{ height: '320px', position: 'relative' }}>
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

              {canExport && (
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
              )}

              {canExport && (
                <button
                  onClick={async () => {
                    try {
                      setJobExporting(true);
                      setJobProgress(0);
                      setJobId(null);

                      const payload = createdAtRef.current
                        ? { type: 'total', from: createdAtRef.current, to: new Date().toISOString() }
                        : { type: 'total', minutes: 180 };

                      const res = await fetch(
                        `${String(API_BASE).replace(/\/+$/, '')}/events/${id}/export`,
                        {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(payload),
                          credentials: 'include',
                        }
                      );

                      const data = await res.json();
                      if (!data.jobId) throw new Error('jobId manquant');

                      setJobId(data.jobId);

                      const poll = async () => {
                        const sres = await fetch(
                          `${String(API_BASE).replace(/\/+$/, '')}/exports/${data.jobId}/status`,
                          { credentials: 'include' }
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
              )}
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
                  const rows = reduceSeries(streamsHistory[stream.id] || [], 2500);
                  const points = rows
                    .map((r) => ({
                      x: new Date(r.ts),
                      y: safeNum(r.current, 0),
                    }))
                    .filter((p) => Number.isFinite(p.x.valueOf()) && Number.isFinite(p.y));

                  const st = event.state?.streams?.[stream.id];

                  const sd = {
                    datasets: [
                      {
                        id: stream.id,
                        label: stream.label,
                        data: points,
                        borderColor: st?.online ? '#10b981' : '#ef4444',
                        backgroundColor: 'rgba(139, 92, 246, 0.10)',
                        borderWidth: 2,
                        tension: 0.3,
                        pointRadius: 0,
                        fill: true,
                      },
                    ],
                  };

                  const so = {
                    ...totalOptions,
                    plugins: {
                      ...totalOptions.plugins,
                      legend: { display: false },
                    },
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

                        {canExport && (
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
                        )}

                        {canExport && (
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
                                    credentials: 'include',
                                  }
                                );

                                const data = await res.json();
                                if (!data.jobId) return;

                                const poll = async () => {
                                  const sres = await fetch(
                                    `${String(API_BASE).replace(/\/+$/, '')}/exports/${data.jobId}/status`,
                                    { credentials: 'include' }
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
                        )}
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
