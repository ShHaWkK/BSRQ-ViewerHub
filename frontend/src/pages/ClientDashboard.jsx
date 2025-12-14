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

// compat react-chartjs-2 ref: parfois c’est { chart }, parfois directement le chart
const getChartInstance = (refObj) => {
  const r = refObj?.current;
  if (!r) return null;
  return r.chart || r;
};

export default function ClientDashboard() {
  const { id } = useParams();

  const [event, setEvent] = useState(null);
  const [totalViewers, setTotalViewers] = useState(0);
  const [previousTotal, setPreviousTotal] = useState(0);

  // history: on stocke { ts: number(ms), total: number }
  const [history, setHistory] = useState([]);

  // refs infra
  const esRef = useRef(null);
  const sseReconnectAttemptRef = useRef(0);
  const sseReconnectTimerRef = useRef(null);
  const pollTimerRef = useRef(null);
  const watchdogRef = useRef(null);
  const lastUpdateRef = useRef(0);

  // buffer SSE pour éviter trop de re-render
  const flushTimerRef = useRef(null);
  const bufferRef = useRef({ points: [] });

  // chart ref
  const chartRef = useRef(null);

  // config env
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const proto = typeof window !== 'undefined' ? window.location.protocol : 'http:';
  let API_BASE = import.meta.env.VITE_API_URL || `${proto}//${host}:4000`;

  if (typeof API_BASE === 'string' && API_BASE.startsWith('/') && typeof window !== 'undefined') {
    const port = window.location.port;
    const devPorts = new Set(['3000', '3001', '3019']);
    if (devPorts.has(port)) API_BASE = `${proto}//${host}:4000`;
  }

  const SSE_BASE =
    typeof API_BASE === 'string' && API_BASE.startsWith('/')
      ? `${proto}//${host}:4000`
      : API_BASE;

  // downsample: garde le dernier point sinon “ça s’arrête”
  const MAX_POINTS = 3000;
  const reduceSeriesKeepLast = (rows) => {
    if (!Array.isArray(rows)) return [];
    if (rows.length <= MAX_POINTS) return rows;

    const stride = Math.ceil(rows.length / MAX_POINTS);
    const out = [];
    for (let i = 0; i < rows.length; i += stride) out.push(rows[i]);

    const last = rows[rows.length - 1];
    if (out[out.length - 1] !== last) out.push(last);

    return out;
  };

  // --------- Load event initial (pour total + label etc.)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const ev = await getEvent(id);
        if (!mounted) return;
        setEvent(ev);

        const tot = Number(ev?.state?.total || 0);
        setPreviousTotal(tot);
        setTotalViewers(tot);
      } catch {
        // silencieux
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id]);

  // --------- Poll fallback
  function startPolling(intervalMs = 10000) {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    pollTimerRef.current = setInterval(async () => {
      try {
        const ev = await getEvent(id);
        const ts = Date.now();
        const tot = Number(ev?.state?.total || 0);

        setTotalViewers((t) => {
          setPreviousTotal(t);
          return tot;
        });

        setHistory((h) => {
          const next = h.concat({ ts, total: tot });
          const cutoff = Date.now() - 24 * 60 * 60 * 1000;
          return next.filter((p) => p.ts >= cutoff);
        });

        lastUpdateRef.current = Date.now();

        // redraw chart (important sur certains builds)
        try {
          const chart = getChartInstance(chartRef);
          if (chart && typeof chart.update === 'function') chart.update('none');
        } catch {}
      } catch {
        // silencieux
      }
    }, Math.max(3000, intervalMs));
  }

  // --------- SSE setup + buffering
  useEffect(() => {
    let cancelled = false;

    const cleanupES = () => {
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

    const stopPolling = () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };

    const flush = () => {
      flushTimerRef.current = null;

      const buf = bufferRef.current.points;
      if (!buf.length) return;

      // merge history (garde les 24h)
      setHistory((h) => {
        const merged = h.concat(buf);
        bufferRef.current.points = [];
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        return merged.filter((p) => p.ts >= cutoff);
      });

      // redraw chart
      try {
        const chart = getChartInstance(chartRef);
        if (chart && typeof chart.update === 'function') chart.update('none');
      } catch {}
    };

    const scheduleFlush = () => {
      if (flushTimerRef.current) return;
      flushTimerRef.current = setTimeout(flush, 250);
    };

    const setupES = () => {
      if (cancelled) return;

      cleanupES();

      const params = `minutes=1440`;
      const url = `${String(SSE_BASE).replace(/\/+$/, '')}/events/${id}/stream?${params}`;

      esRef.current = new EventSource(url);
      lastUpdateRef.current = Date.now();

      esRef.current.onopen = () => {
        sseReconnectAttemptRef.current = 0;
        stopPolling(); // SSE OK => on coupe le polling
      };

      esRef.current.onerror = () => {
        try {
          if (esRef.current) esRef.current.close();
        } catch {}
        esRef.current = null;

        const attempt = sseReconnectAttemptRef.current || 0;
        const backoff = Math.min(30000, 1000 * Math.pow(2, attempt));
        sseReconnectAttemptRef.current = attempt + 1;

        if (sseReconnectTimerRef.current) {
          clearTimeout(sseReconnectTimerRef.current);
          sseReconnectTimerRef.current = null;
        }

        sseReconnectTimerRef.current = setTimeout(() => {
          if (!cancelled && !document.hidden) setupES();
        }, backoff);

        // fallback immédiat
        if (!pollTimerRef.current) startPolling(10000);
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

        lastUpdateRef.current = Date.now();

        if (msg.type === 'init') {
          const rows = Array.isArray(msg.data?.history) ? msg.data.history : [];
          const mapped = rows.map((r) => ({
            ts: new Date(r.ts).getTime(),
            total: Number(r.total || 0),
          }));

          setHistory(mapped);

          setEvent((e) => ({ ...(e || {}), state: msg.data?.state }));

          const tot = Number(msg.data?.state?.total || 0);
          setTotalViewers((t) => {
            setPreviousTotal(t);
            return tot;
          });

          // redraw
          try {
            const chart = getChartInstance(chartRef);
            if (chart && typeof chart.update === 'function') chart.update('none');
          } catch {}
        }

        if (msg.type === 'tick') {
          const ts = new Date(msg.data?.ts).getTime();
          const tot = Number(msg.data?.total || 0);

          // total live
          setTotalViewers((t) => {
            setPreviousTotal(t);
            return tot;
          });

          // buffer points, flush throttled
          bufferRef.current.points.push({ ts, total: tot });
          scheduleFlush();
        }
      };
    };

    setupES();

    const handleVisibility = () => {
      if (document.hidden) {
        cleanupES();
        stopPolling(); // pas besoin de poller onglet caché
      } else {
        setupES();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    // watchdog: si rien ne bouge, polling
    watchdogRef.current = setInterval(() => {
      const now = Date.now();
      const STALE_MS = 20000;
      if (lastUpdateRef.current && now - lastUpdateRef.current > STALE_MS) {
        if (!pollTimerRef.current) startPolling(10000);
      }
    }, 5000);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      cleanupES();

      if (watchdogRef.current) {
        clearInterval(watchdogRef.current);
        watchdogRef.current = null;
      }

      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [id, SSE_BASE]);

  // --------- chart models
  const reducedHistory = useMemo(() => reduceSeriesKeepLast(history), [history]);

  const chartData = useMemo(() => {
    return {
      datasets: [
        {
          id: 'total',
          label: 'Total viewers',
          data: reducedHistory.map((p) => ({ x: p.ts, y: p.total })),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.2)',
          fill: true,
          tension: 0.3,
          pointRadius: 0,
        },
      ],
    };
  }, [reducedHistory]);

  const chartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      parsing: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: { mode: 'nearest', intersect: false },
        decimation: {
          enabled: true,
          algorithm: 'lttb',
          threshold: 500,
        },
      },
      scales: {
        x: {
          type: 'time',
          time: { unit: 'minute' },
          grid: { display: false },
          ticks: { color: 'rgba(255,255,255,0.75)' },
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255,255,255,0.1)' },
          ticks: { color: 'rgba(255,255,255,0.75)' },
        },
      },
    };
  }, []);

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
        {/* En-tête brandée */}
        <div className="hero" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src={bsrqLogo} alt="BSRQ" style={{ height: '40px' }} />
            <h1 className="gradient-text" style={{ margin: 0, fontSize: '2rem' }}>
              Dashboard Live
            </h1>
          </div>
          <Link to="/events" className="btn btn--brand-gb">
            Retour
          </Link>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'stretch', marginTop: '1.5rem' }}>
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)',
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
              TOTAL SPECTATEURS
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
              <div style={{ color: '#10b981', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                📈 +{(totalViewers - previousTotal).toLocaleString()}
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: '2rem 1rem' }}>
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
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
              <Line ref={chartRef} data={chartData} options={chartOptions} datasetIdKey="id" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
