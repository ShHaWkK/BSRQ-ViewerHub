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
  let API_BASE = import.meta.env.VITE_API_URL || `${proto}//${host}:4000`;

  // dev proxy fallback: si API_BASE est relative, basculer vers :4000 sur ports dev
  if (typeof API_BASE === 'string' && API_BASE.startsWith('/') && typeof window !== 'undefined') {
    const port = window.location.port;
    const devPorts = new Set(['3000', '3001', '3019']);
    if (devPorts.has(port)) API_BASE = `${proto}//${host}:4000`;
  }

  const SSE_BASE =
    typeof API_BASE === 'string' && API_BASE.startsWith('/')
      ? `${proto}//${host}:4000`
      : API_BASE;

  // buffer SSE pour éviter trop de re-render
  const bufferRef = useRef({
    lastTotal: null,
    points: [], // [{ts,total}]
  });

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

        const tot = safeNum(ev?.state?.total, 0);
        setPreviousTotal(tot);
        setTotalViewers(tot);
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

      // IMPORTANT: cookies cross-origin si backend le permet
      try {
        esRef.current = new EventSource(url, { withCredentials: true });
      } catch {
        esRef.current = new EventSource(url);
      }

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

  const chartData = useMemo(() => {
    return {
      datasets: [
        {
          id: 'total',
          label: 'Spectateurs',
          data: reducedHistory
            .map((p) => ({ x: new Date(p.ts), y: safeNum(p.total, 0) }))
            .filter((p) => Number.isFinite(p.x.valueOf()) && Number.isFinite(p.y)),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.18)',
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
        // IMPORTANT: pas de decimation ici (sinon impression freeze)
        decimation: { enabled: false },
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
        {/* header */}
        <div
          className="hero"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src={bsrqLogo} alt="BSRQ" style={{ height: '40px' }} />
            <div>
              <h1 className="gradient-text" style={{ margin: 0, fontSize: '2rem' }}>
                Dashboard Live
              </h1>
              <div style={{ opacity: 0.85, fontWeight: 600, marginTop: 6 }}>
                {sseStatus === 'live' && <span style={{ color: '#10b981' }}>LIVE</span>}
                {sseStatus === 'connecting' && <span style={{ color: '#f59e0b' }}>Connexion…</span>}
                {sseStatus === 'reconnecting' && <span style={{ color: '#f59e0b' }}>Reconnexion…</span>}
                <span style={{ color: 'rgba(255,255,255,0.65)', marginLeft: 10 }}>
                  (mise à jour auto, aucun refresh)
                </span>
              </div>
            </div>
          </div>

          <Link to="/events" className="btn btn--brand-gb">
            Retour
          </Link>
        </div>

        {/* total card */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'stretch', marginTop: '1.5rem' }}>
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '20px',
              padding: '2rem',
              maxWidth: '420px',
              width: '100%',
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
              {safeNum(totalViewers, 0).toLocaleString()}
            </div>

            {totalViewers > previousTotal && (
              <div style={{ color: '#10b981', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                📈 +{(totalViewers - previousTotal).toLocaleString()}
              </div>
            )}
          </div>

          {/* petite carte info event optionnelle */}
          <div
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 20,
              padding: '2rem',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              display: 'flex',
              alignItems: 'center',
              minHeight: 140,
            }}
          >
            <div style={{ opacity: 0.9 }}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
                {event?.name || `Évènement ${id}`}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.75)' }}>
                Les chiffres se mettent à jour automatiquement en temps réel.
              </div>
            </div>
          </div>
        </div>

        {/* chart */}
        <div style={{ padding: '2rem 0 1rem' }}>
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

            <div style={{ height: '320px', position: 'relative' }}>
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
