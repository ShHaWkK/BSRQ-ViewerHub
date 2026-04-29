import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
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

import { getEvent, logout } from '../api.js';
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
    <div style={{
      background: online
        ? 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(59,130,246,0.06) 100%)'
        : 'rgba(255,255,255,0.02)',
      border: `1px solid ${online ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)'}`,
      borderRadius: 16,
      padding: '1.25rem 1.5rem',
      transition: 'transform 0.2s, box-shadow 0.2s',
      position: 'relative',
      overflow: 'hidden',
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.3)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      {/* shine pour les streams online */}
      {online && (
        <div style={{
          position: 'absolute', top: 0, left: '-100%',
          width: '100%', height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)',
          animation: 'shine 3s infinite',
          pointerEvents: 'none',
        }} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <span style={{
          fontSize: 14,
          fontWeight: 600,
          color: online ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%',
        }}>
          {label}
        </span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
          color: online ? '#34d399' : '#6b7280',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: online ? '#10b981' : '#4b5563',
            boxShadow: online ? '0 0 6px #10b981' : 'none',
            animation: online ? 'pulse 2s infinite' : 'none',
          }} />
          {online ? 'LIVE' : 'OFF'}
        </span>
      </div>

      <div style={{
        fontSize: isAnimating ? '2.2rem' : '2rem',
        fontWeight: 800,
        color: online ? 'white' : 'rgba(255,255,255,0.25)',
        lineHeight: 1,
        transition: 'font-size 0.15s',
        marginBottom: 4,
      }}>
        {displayViewers.toLocaleString()}
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>spectateurs</div>

      <div style={{
        marginTop: '1rem', height: 3,
        background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          background: online ? 'linear-gradient(90deg, #10b981, #3b82f6)' : 'rgba(255,255,255,0.1)',
          borderRadius: 2,
          width: `${Math.min(100, (displayViewers / Math.max(50000, displayViewers)) * 100)}%`,
          transition: 'width 350ms cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: online ? '0 0 8px rgba(16,185,129,0.5)' : 'none',
        }} />
      </div>
    </div>
  );
};

const ParticleSystem = () => {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
// compat react-chartjs-2 ref: parfois { chart }, parfois directement le chart
const getChartInstance = (refObj) => {
  const r = refObj?.current;
  if (!r) return null;
  return r.chart || r;
};

const safeNum = (v, d = 0) => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : d;
};

// Append 1 point (no duplicate ts), keep last MAX points
const appendPoint = (arr, p, MAX = 5000) => {
  const out = Array.isArray(arr) ? arr.slice() : [];
  if (!p || !p.ts) return out;

  const tsIso = new Date(p.ts).toISOString();
  const last = out[out.length - 1];

  if (last && new Date(last.ts).toISOString() === tsIso) {
    out[out.length - 1] = { ...last, ...p, ts: tsIso };
  } else {
    out.push({ ...p, ts: tsIso });
  }

  if (out.length > MAX) out.splice(0, out.length - MAX);
  return out;
};

// downsample: garde le dernier point sinon impression de “freeze”
const reduceSeriesKeepLast = (rows, MAX_POINTS = 3000) => {
  if (!Array.isArray(rows)) return [];
  if (rows.length <= MAX_POINTS) return rows;

  const stride = Math.ceil(rows.length / MAX_POINTS);
  const out = [];
  for (let i = 0; i < rows.length; i += stride) out.push(rows[i]);

  const last = rows[rows.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
};

export default function ClientDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [streamsHistory, setStreamsHistory] = useState({});
  const createdAtRef = useRef(null);

  // total + delta
  const [totalViewers, setTotalViewers] = useState(0);
  const [previousTotal, setPreviousTotal] = useState(0);

  // history total: [{ts: string ISO, total:number}]
  const [history, setHistory] = useState([]);

  // status
  const [sseStatus, setSseStatus] = useState('connecting'); // connecting | live | reconnecting
  const lastMsgTsRef = useRef(Date.now());

  // refs infra
  const esRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const flushTimerRef = useRef(null);
  const pollTimerRef = useRef(null);

  const chartRef = useRef(null);

  // env base
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const proto = typeof window !== 'undefined' ? window.location.protocol : 'http:';
  let API_BASE = import.meta.env.VITE_API_URL || '/api';
  const SSE_BASE = API_BASE;

  // buffer SSE pour éviter trop de re-render
  const bufferRef = useRef({
    lastTotal: null,
    points: [], // [{ts,total}]
  });

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 640px)');
    const handler = () => setIsMobile(mql.matches);
    handler();
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const cleanupSSE = () => {
    try {
      if (esRef.current) esRef.current.close();
    } catch {}
    esRef.current = null;

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
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

  // ---------- Load event initial (state + total initial)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const ev = await getEvent(id);
        if (!mounted) return;

        setEvent(ev);
        createdAtRef.current = ev?.created_at || null;

        const tot = safeNum(ev?.state?.total, 0);
        setPreviousTotal(tot);
        setTotalViewers(tot);

        try {
          const url = `/api/events/${id}/history?minutes=1440&streams=1&limit=5000`;
          const res = await fetch(url, { credentials: 'include' });
          if (res.ok) {
            const data = await res.json();
            if (!mounted) return;
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
        // silencieux: SSE/poll prendront le relai
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id]);

  // ---------- Poll fallback live (si SSE down) : pas d'export côté client
  const startPolling = (intervalMs = 2500) => {
    cleanupPoll();
    pollTimerRef.current = setInterval(async () => {
      if (document.hidden) return;

      // si SSE est live, ne poll pas
      if (sseStatus === 'live') return;

      try {
        const ev = await getEvent(id);

        // update event minimal
        setEvent((prev) => {
          if (!prev) return ev;
          return {
            ...prev,
            ...ev,
            streams: ev?.streams || prev.streams,
            state: ev?.state || prev.state,
          };
        });

        const tot = safeNum(ev?.state?.total, 0);
        const ts = new Date().toISOString();

        // total live + delta
        setPreviousTotal((prevTot) => {
          // prevTot ici = ancienne valeur affichée
          return prevTot;
        });
        setTotalViewers((cur) => {
          setPreviousTotal(cur);
          return tot;
        });

        // point graphe
        setHistory((h) => {
          const next = appendPoint(h, { ts, total: tot }, 5000);
          // garde 24h
          const cutoff = Date.now() - 24 * 60 * 60 * 1000;
          return next.filter((p) => new Date(p.ts).getTime() >= cutoff);
        });

        // redraw chart
        try {
          const chart = getChartInstance(chartRef);
          if (chart && typeof chart.update === 'function') chart.update('none');
        } catch {}
      } catch {
        // ignore
      }
    }, Math.max(1000, intervalMs));
  };

  // ---------- Flush buffered points (throttle)
  const scheduleFlush = () => {
    if (flushTimerRef.current) return;
    flushTimerRef.current = setTimeout(() => {
      flushTimerRef.current = null;

      const buf = bufferRef.current;
      if (!buf.points.length) return;

      // Apply total last
      if (buf.lastTotal !== null) {
        const tot = buf.lastTotal;
        setTotalViewers((cur) => {
          setPreviousTotal(cur);
          return tot;
        });
        buf.lastTotal = null;
      }

      // merge points (keep 24h + cap)
      setHistory((h) => {
        let next = Array.isArray(h) ? h : [];
        for (const p of buf.points) next = appendPoint(next, p, 5000);
        buf.points = [];

        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        return next.filter((p) => new Date(p.ts).getTime() >= cutoff);
      });

      // redraw chart
      try {
        const chart = getChartInstance(chartRef);
        if (chart && typeof chart.update === 'function') chart.update('none');
      } catch {}
    }, 120);
  };

  // ---------- SSE setup (primary) + reconnexion + watchdog
  useEffect(() => {
    let cancelled = false;

    const setupSSE = () => {
      if (cancelled) return;

      cleanupSSE();
      setSseStatus((s) => (s === 'live' ? 'reconnecting' : 'connecting'));

      const params = `minutes=1440`;
      const url = `${String(SSE_BASE).replace(/\/+$/, '')}/events/${id}/stream?${params}`;
      esRef.current = new EventSource(url);

      lastMsgTsRef.current = Date.now();

      esRef.current.onopen = () => {
        lastMsgTsRef.current = Date.now();
        setSseStatus('live');
        cleanupPoll(); // SSE ok => stop poll
      };

      esRef.current.onerror = () => {
        if (cancelled) return;

        setSseStatus('reconnecting');

        try {
          if (esRef.current) esRef.current.close();
        } catch {}
        esRef.current = null;

        // backoff léger
        reconnectTimerRef.current = setTimeout(() => {
          if (!cancelled && !document.hidden) setupSSE();
        }, 900);

        // fallback polling immédiat
        if (!pollTimerRef.current) startPolling(2500);
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
          // history initial (total)
          const rows = Array.isArray(msg.data?.history) ? msg.data.history : [];
          const mapped = rows.map((r) => ({
            ts: new Date(r.ts).toISOString(),
            total: safeNum(r.total, 0),
          }));

          setHistory(mapped);

          // event state minimal
          setEvent((prev) => {
            const st = msg.data?.state || null;
            if (!prev) return st ? { state: st, streams: [] } : prev;
            return { ...prev, state: st || prev.state };
          });

          const tot = safeNum(msg.data?.state?.total, 0);
          setPreviousTotal(tot);
          setTotalViewers(tot);

          // redraw
          try {
            const chart = getChartInstance(chartRef);
            if (chart && typeof chart.update === 'function') chart.update('none');
          } catch {}
        }

        if (msg.type === 'tick') {
          const ts = msg?.data?.ts ? new Date(msg.data.ts).toISOString() : new Date().toISOString();
          const tot = safeNum(msg?.data?.total, 0);

          const streamsArr = Array.isArray(msg?.data?.streams) ? msg.data.streams : [];
          const streamsObj = Object.fromEntries(
            streamsArr.map((s) => [
              s.id,
              { id: s.id, current: safeNum(s?.current, 0), online: !!s?.online },
            ])
          );
          setEvent((e) => {
            const prev = e || {};
            return { ...prev, state: { total: tot, streams: streamsObj } };
          });

          // buffer total + point
          bufferRef.current.lastTotal = tot;
          bufferRef.current.points.push({ ts, total: tot });
          scheduleFlush();
        }
      };
    };

    setupSSE();

    const watchdog = setInterval(() => {
      // si pas de message depuis 8s => polling + reset SSE
      const since = Date.now() - lastMsgTsRef.current;
      if (since > 8000) {
        if (!pollTimerRef.current) startPolling(2500);
        setSseStatus((s) => (s === 'live' ? 'reconnecting' : s));
        setupSSE();
      }
    }, 2500);

    const handleVisibility = () => {
      if (document.hidden) {
        cleanupSSE();
        cleanupPoll();
      } else {
        setupSSE();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      clearInterval(watchdog);
      document.removeEventListener('visibilitychange', handleVisibility);
      cleanupSSE();
      cleanupPoll();
    };
  }, [id, SSE_BASE]);

  // --------- chart models
  const reducedHistory = useMemo(() => reduceSeriesKeepLast(history, 3000), [history]);
  const xBounds = useMemo(() => {
    const now = new Date();
    let t = Infinity;
    if (Array.isArray(history) && history.length) {
      for (const row of history) {
        const ts = new Date(row.ts).getTime();
        if (Number.isFinite(ts) && ts < t) t = ts;
      }
    }
    if (!isFinite(t)) {
      if (createdAtRef.current) return { xMin: new Date(createdAtRef.current), xMax: now };
      return { xMin: new Date(Date.now() - 3 * 60 * 60 * 1000), xMax: now };
    }
    return { xMin: new Date(t), xMax: now };
  }, [history]);
  const timeUnit = useMemo(() => {
    const totalMinutes = Math.max(1, Math.round((xBounds.xMax.getTime() - xBounds.xMin.getTime()) / 60000));
    return totalMinutes >= 1440 ? 'day' : totalMinutes >= 360 ? 'hour' : 'minute';
  }, [xBounds]);
  const totalVisiblePoints = useMemo(() => {
    return reducedHistory
      .map((p) => ({ x: new Date(p.ts), y: safeNum(p.total, 0) }))
      .filter((p) => Number.isFinite(p.x.valueOf()) && Number.isFinite(p.y))
      .filter((p) => p.x >= xBounds.xMin && p.x <= xBounds.xMax);
  }, [reducedHistory, xBounds]);

  const chartData = useMemo(() => {
    return {
      datasets: [
        {
          id: 'total',
          label: 'Spectateurs',
          data: totalVisiblePoints,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.18)',
          fill: true,
          tension: 0.3,
          pointRadius: 0,
        },
      ],
    };
  }, [totalVisiblePoints]);

  const chartOptions = useMemo(() => {
    const ys = totalVisiblePoints.map((p) => safeNum(p.y, 0));
    const maxY = ys.length ? Math.max(10, ...ys) : 10;
    const minY = ys.length ? Math.min(...ys) : 0;
    return {
      responsive: true,
      maintainAspectRatio: false,
      parsing: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: { mode: 'nearest', intersect: false },
        decimation: { enabled: false },
      },
      scales: {
        x: {
          type: 'time',
          time: { unit: timeUnit },
          min: xBounds.xMin,
          max: xBounds.xMax,
          grid: { display: false },
          ticks: { color: 'rgba(255,255,255,0.75)' },
        },
        y: {
          suggestedMin: Math.max(0, minY - Math.round(maxY * 0.05)),
          suggestedMax: Math.round(maxY * 1.05),
          grid: { color: 'rgba(255,255,255,0.1)' },
          ticks: { color: 'rgba(255,255,255,0.75)' },
        },
      },
    };
  }, [timeUnit, xBounds, totalVisiblePoints]);

  // force redraw sur changement de série (sécurise les builds “qui figent”)
  useEffect(() => {
    try {
      const chart = getChartInstance(chartRef);
      if (chart && typeof chart.update === 'function') chart.update('none');
    } catch {}
  }, [reducedHistory]);

  const liveStreamsCount = (event?.streams || []).filter(s => !!event?.state?.streams?.[s.id]?.online).length;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #030712 0%, #0c1225 40%, #0f1f3d 100%)',
      color: 'white',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <ParticleSystem />

      {/* ── Top nav ── */}
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(3,7,18,0.75)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '0 1.5rem',
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img src={bsrqLogo} alt="BSRQ" style={{ height: 28 }} />
          {event?.name && (
            <span style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.55)',
              borderLeft: '1px solid rgba(255,255,255,0.12)',
              paddingLeft: '1rem',
              maxWidth: isMobile ? 120 : 300,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {event.name}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Link
            to="/events"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '0 14px',
              height: 36,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              color: 'rgba(255,255,255,0.7)',
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 600,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
          >
            ← Retour
          </Link>
          <button
            type="button"
            onClick={async () => {
              try { await logout(); } catch {}
              try { navigate('/login?aud=client', { replace: true }); } catch { window.location.assign('/login?aud=client'); }
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '0 14px',
              height: 36,
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 10,
              color: '#fca5a5',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
          >
            ⏻ Déconnexion
          </button>
        </div>
      </nav>

      {/* ── Main content ── */}
      <div style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: isMobile ? '1.5rem 1rem 3rem' : '2.5rem 2rem 4rem',
        position: 'relative',
        zIndex: 1,
      }}>

        {/* ── Hero : total spectateurs ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}>
          {/* Total card */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(16,185,129,0.08) 100%)',
            border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: 20,
            padding: '2rem',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: -40, right: -40,
              width: 140, height: 140,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#60a5fa',
              marginBottom: 8,
            }}>
              Total spectateurs
            </div>
            <div style={{
              fontSize: isMobile ? '3rem' : '4rem',
              fontWeight: 800,
              lineHeight: 1,
              background: 'linear-gradient(135deg, #60a5fa, #34d399)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              marginBottom: 12,
            }}>
              {safeNum(totalViewers, 0).toLocaleString()}
            </div>
            {totalViewers > previousTotal && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(16,185,129,0.12)',
                border: '1px solid rgba(16,185,129,0.25)',
                borderRadius: 999,
                padding: '4px 12px',
                fontSize: 13,
                fontWeight: 600,
                color: '#34d399',
              }}>
                ↑ +{(totalViewers - previousTotal).toLocaleString()} depuis le début
              </div>
            )}
          </div>

          {/* Status + streams actifs */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 20,
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '1rem',
          }}>
            {/* SSE status */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>
                Statut
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  display: 'inline-block',
                  width: 8, height: 8,
                  borderRadius: '50%',
                  background: sseStatus === 'live' ? '#10b981' : '#f59e0b',
                  boxShadow: sseStatus === 'live' ? '0 0 8px #10b981' : '0 0 8px #f59e0b',
                  animation: 'pulse 2s infinite',
                }} />
                <span style={{ fontWeight: 700, fontSize: 15, color: sseStatus === 'live' ? '#34d399' : '#fbbf24' }}>
                  {sseStatus === 'live' ? 'En direct' : sseStatus === 'connecting' ? 'Connexion…' : 'Reconnexion…'}
                </span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                  · mise à jour auto
                </span>
              </div>
            </div>
            {/* Streams actifs */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>
                Streams actifs
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: '2.5rem', fontWeight: 800, color: liveStreamsCount > 0 ? '#34d399' : 'rgba(255,255,255,0.3)' }}>
                  {liveStreamsCount}
                </span>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>
                  / {(event?.streams || []).length} streams
                </span>
              </div>
            </div>
            {/* Lien visionner */}
            <Link
              to={`/event/${id}/live`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #2563eb, #0891b2)',
                border: 'none',
                borderRadius: 12,
                color: 'white',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: 14,
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
            >
              ▶ Visionner le direct
            </Link>
          </div>
        </div>

        {/* ── Chart ── */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 20,
          padding: isMobile ? '1.25rem' : '1.75rem',
          marginBottom: '1.5rem',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.5rem',
          }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>
                Évolution
              </div>
              <div style={{ fontSize: isMobile ? '1rem' : '1.15rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
                Spectateurs en temps réel
              </div>
            </div>
            {reducedHistory.length > 0 && (
              <div style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.3)',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 8,
                padding: '4px 10px',
              }}>
                {reducedHistory.length} points
              </div>
            )}
          </div>
          <div style={{ height: isMobile ? 220 : 300, position: 'relative' }}>
            <Line ref={chartRef} data={chartData} options={chartOptions} datasetIdKey="id" />
            {reducedHistory.length === 0 && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: 8,
                color: 'rgba(255,255,255,0.25)',
                fontSize: 14,
              }}>
                <span style={{ fontSize: 28 }}>📊</span>
                Aucune donnée disponible pour le moment
              </div>
            )}
          </div>
        </div>

        {/* ── Stream cards ── */}
        {(event?.streams || []).length > 0 && (
          <>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.3)',
              marginBottom: '0.75rem',
            }}>
              Détail par stream
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '0.75rem',
            }}>
              {(event.streams).map((s) => {
                const st = event?.state?.streams?.[s.id];
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
          </>
        )}
      </div>
    </div>
  );
}
