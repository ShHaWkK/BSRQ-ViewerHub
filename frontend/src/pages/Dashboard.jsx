import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import StreamCard from '../components/StreamCard.jsx';
import { getEvent } from '../api.js';

ChartJS.register(LineElement, PointElement, LinearScale, TimeScale, Tooltip, Legend);

export default function Dashboard() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    getEvent(id).then(setEvent);
    const es = new EventSource(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/events/${id}/stream`);
    es.onmessage = ev => {
      const msg = JSON.parse(ev.data);
      if (msg.type === 'init') {
        setEvent(e => ({ ...e, state: msg.data.state }));
        setHistory(msg.data.history);
      }
      if (msg.type === 'tick') {
        setEvent(e => ({ ...e, state: { total: msg.data.total, streams: Object.fromEntries(msg.data.streams.map(s => [s.id, s])) } }));
        setHistory(h => [...h, { ts: msg.data.ts, total: msg.data.total }]);
      }
    };
    return () => es.close();
  }, [id]);

  if (!event) return null;
  const streamList = Object.values(event.state?.streams || {});
  const data = {
    labels: history.map(p => new Date(p.ts)),
    datasets: [{ label: 'Total spectateurs', data: history.map(p => p.total), borderColor: '#e53935' }]
  };
  const options = { responsive: true, scales: { x: { type: 'time', time: { unit: 'minute' } } } };

  return (
    <div className="dashboard">
      <div className="card total-card">TOTAL: {event.state?.total || 0}</div>
      {streamList.map(s => (
        <StreamCard key={s.id} label={s.label} current={s.current} online={s.online} />
      ))}
      <div className="chart-container">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
