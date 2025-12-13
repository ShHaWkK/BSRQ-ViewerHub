import React, { useEffect, useRef, useState } from 'react';
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
  Filler
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { getEvent } from '../api.js';

ChartJS.register(LineElement, PointElement, LinearScale, TimeScale, Tooltip, Legend, Filler);

export default function ClientDashboard() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [totalViewers, setTotalViewers] = useState(0);
  const [previousTotal, setPreviousTotal] = useState(0);
  const [history, setHistory] = useState([]);
  const esRef = useRef(null);
  const sseReconnectAttemptRef = useRef(0);
  const sseReconnectTimerRef = useRef(null);

  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const proto = typeof window !== 'undefined' ? window.location.protocol : 'http:';
  let API_BASE = import.meta.env.VITE_API_URL || `${proto}//${host}:4000`;
  if (typeof API_BASE === 'string' && API_BASE.startsWith('/') && typeof window !== 'undefined') {
    const port = window.location.port;
    const devPorts = new Set(['3000', '3001', '3019']);
    if (devPorts.has(port)) {
      API_BASE = `${proto}//${host}:4000`;
    }
  }

  useEffect(() => {
    let mounted = true;
    getEvent(id).then(ev => {
      if (!mounted) return;
      setEvent(ev);
      setPreviousTotal(ev.state?.total || 0);
      setTotalViewers(ev.state?.total || 0);
    });
    return () => { mounted = false; };
  }, [id]);

  useEffect(() => {
    const setupES = () => {
      if (esRef.current) {
        try { esRef.current.close(); } catch {}
        esRef.current = null;
      }
      const params = `minutes=1440`;
      const base = (typeof API_BASE === 'string' && API_BASE.startsWith('/') && typeof window !== 'undefined')
        ? `${proto}//${host}:4000`
        : API_BASE;
      const url = `${String(base).replace(/\/\/+$/, '')}/events/${id}/stream?${params}`;
      esRef.current = new EventSource(url, { withCredentials: true });
      esRef.current.onopen = () => { sseReconnectAttemptRef.current = 0; };
      esRef.current.onerror = () => {
        try { if (esRef.current) { esRef.current.close(); esRef.current = null; } } catch {}
        const backoff = Math.min(30000, 1000 * Math.pow(2, sseReconnectAttemptRef.current || 0));
        sseReconnectAttemptRef.current = (sseReconnectAttemptRef.current || 0) + 1;
        if (sseReconnectTimerRef.current) { clearTimeout(sseReconnectTimerRef.current); sseReconnectTimerRef.current = null; }
        sseReconnectTimerRef.current = setTimeout(() => setupES(), backoff);
      };
      esRef.current.onmessage = ev => {
        const raw = ev.data;
        if (!raw || raw[0] !== '{') return;
        let msg; try { msg = JSON.parse(raw); } catch { return; }
        if (msg.type === 'init') {
          const rows = Array.isArray(msg.data?.history) ? msg.data.history : [];
          setHistory(rows.map(r => ({ ts: new Date(r.ts).getTime(), total: r.total })));
          setEvent(e => ({ ...(e || {}), state: msg.data?.state }));
        } else if (msg.type === 'tick') {
          const ts = new Date(msg.data?.ts).getTime();
          const tot = Number(msg.data?.total || 0);
          setTotalViewers(t => {
            setPreviousTotal(t);
            return tot;
          });
          setHistory(h => {
            const next = h.concat({ ts, total: tot });
            // garder les dernières 24h
            const cutoff = Date.now() - 24 * 60 * 60 * 1000;
            return next.filter(p => p.ts >= cutoff);
          });
        }
      };
    };
    setupES();
    const handleVisibility = () => {
      if (document.hidden) {
        try { if (esRef.current) esRef.current.close(); } catch {}
        esRef.current = null;
      } else {
        setupES();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      try { if (esRef.current) esRef.current.close(); } catch {}
      esRef.current = null;
      if (sseReconnectTimerRef.current) { clearTimeout(sseReconnectTimerRef.current); sseReconnectTimerRef.current = null; }
    };
  }, [id]);

  const chartData = {
    labels: history.map(p => p.ts),
    datasets: [
      {
        label: 'Total viewers',
        data: history.map(p => ({ x: p.ts, y: p.total })),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.2)',
        fill: true,
        tension: 0.3,
        pointRadius: 0,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    parsing: false,
    plugins: { legend: { display: false }, tooltip: { mode: 'nearest', intersect: false } },
    scales: {
      x: { type: 'time', time: { unit: 'minute' }, grid: { display: false } },
      y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' } }
    }
  };

  return (
    <div className="app-bg">
      <div className="container" style={{ paddingTop: '6vh' }}>
        <div className="hero">
          <h1 className="gradient-text" style={{ margin: 0, fontSize: '2rem' }}>Dashboard</h1>
          <p className="muted" style={{ marginTop: 8 }}>Vue client sans export. Données en temps réel.</p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'stretch', marginTop: '1.5rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '20px',
            padding: '2rem',
            maxWidth: '400px',
            margin: '0 auto',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
          }}>
            <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Total Spectateurs
            </div>
            <div style={{ fontSize: '3.5rem', fontWeight: '800', background: 'linear-gradient(45deg, #10b981, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', lineHeight: '1' }}>
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
          <div style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '20px',
            padding: '2rem',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.5rem', fontWeight: '600', background: 'linear-gradient(45deg, #0c2164ff, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              📈 Évolution Temps Réel
            </h3>
            <div style={{ height: '300px', position: 'relative' }}>
              <Line data={chartData} options={chartOptions} datasetIdKey="id" />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <Link to="/events" className="btn btn--brand-gb">Retour</Link>
        </div>
      </div>
    </div>
  );
}

