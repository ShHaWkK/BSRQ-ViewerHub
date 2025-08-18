import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getEvent } from '../api.js';

export default function LiveViewer() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);

  useEffect(() => {
    let es;
    getEvent(id).then(ev => {
      setEvent(ev);
      es = new EventSource(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/events/${id}/stream`);
      es.onmessage = evMsg => {
        const msg = JSON.parse(evMsg.data);
        if (msg.type === 'init') {
          setEvent(e => ({ ...e, state: msg.data.state }));
        }
        if (msg.type === 'tick') {
          setEvent(e => ({ ...e, state: { total: msg.data.total, streams: Object.fromEntries(msg.data.streams.map(s => [s.id, s])) } }));
        }
      };
    });
    return () => es && es.close();
  }, [id]);

  if (!event) return null;

  return (
    <div className="live-viewer">
      <header><h1>{event.name}</h1></header>
      <div className="video-grid">
        {event.streams.map(s => {
          const st = event.state?.streams?.[s.id];
          return (
            <div key={s.id} className="video-card">
              <div className="video-container">
                <iframe
                  src={`https://www.youtube.com/embed/${s.video_id}`}
                  title={s.label}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
              <div className="video-meta">
                <h3>{s.label}</h3>
                <p>{st?.current || 0} spectateurs</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
