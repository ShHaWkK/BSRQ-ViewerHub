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

  return (
    <div className="app-bg">
      <div className="container" style={{ paddingTop: '6vh' }}>
        <ParticleSystem />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <Link
            to="/events"
            style={{
              background: 'linear-gradient(45deg, #8b5cf6, #3b82f6)',
              border: 'none',
              borderRadius: '12px',
              padding: '0.6rem 1rem',
              color: 'white',
              textDecoration: 'none',
              fontWeight: '600',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(139, 92, 246, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
            }}
          >
            ← Retour à l'évènement
          </Link>
        </div>

        <div style={{ padding: isMobile ? '0.75rem 0' : '1.5rem 0' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1rem',
              marginBottom: '0.5rem',
            }}
          >
            {(event?.streams || []).map((s) => {
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
        </div>

        <div
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '20px',
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
          <div style={{ opacity: 0.85, fontWeight: 600 }}>
            {sseStatus === 'live' && <span style={{ color: '#10b981' }}>LIVE</span>}
            {sseStatus === 'connecting' && <span style={{ color: '#f59e0b' }}>Connexion…</span>}
            {sseStatus === 'reconnecting' && <span style={{ color: '#f59e0b' }}>Reconnexion…</span>}
            <span style={{ color: 'rgba(255,255,255,0.65)', marginLeft: 10 }}>
              (mise à jour auto, aucun refresh)
            </span>
          </div>
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '20px',
              padding: '2rem',
              maxWidth: '420px',
              margin: '1rem auto 0',
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
              <div style={{ color: '#10b981', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                📈 +{(totalViewers - previousTotal).toLocaleString()}
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: isMobile ? '0.75rem' : '1.5rem' }} />

        {/* chart */}
        <div style={{ padding: isMobile ? '1.25rem 0 0.75rem' : '2rem 0 1rem' }}>
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '20px',
              padding: isMobile ? '1.25rem' : '2rem',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}
          >
            <h3
              style={{
                margin: '0 0 1.5rem 0',
                fontSize: isMobile ? '1.25rem' : '1.5rem',
                fontWeight: '600',
                background: 'linear-gradient(45deg, #0c2164ff, #3b82f6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              📈 Évolution Temps Réel
            </h3>

            <div style={{ height: isMobile ? '240px' : '320px', position: 'relative' }}>
              <Line ref={chartRef} data={chartData} options={chartOptions} datasetIdKey="id" />
              {reducedHistory.length === 0 && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(255,255,255,0.9)',
                    fontWeight: 600,
                    background: 'rgba(0,0,0,0.12)',
                    borderRadius: 16,
                  }}
                >
                  Aucune donnée disponible pour le moment.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
