import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getEvent } from '../api.js';

// Composant d'onde sonore animée
const SoundWave = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = 100;

    let phase = 0;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Dessiner plusieurs ondes
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        const amplitude = 20 + i * 10;
        const frequency = 0.02 + i * 0.01;
        const offset = i * Math.PI / 3;
        
        for (let x = 0; x < canvas.width; x++) {
          const y = canvas.height / 2 + Math.sin(x * frequency + phase + offset) * amplitude;
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
        gradient.addColorStop(0, `hsla(${180 + i * 60}, 70%, 60%, 0.3)`);
        gradient.addColorStop(0.5, `hsla(${240 + i * 60}, 70%, 70%, 0.8)`);
        gradient.addColorStop(1, `hsla(${300 + i * 60}, 70%, 60%, 0.3)`);
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      phase += 0.05;
      requestAnimationFrame(animate);
    };

    animate();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        height: '100px',
        pointerEvents: 'none',
        opacity: 0.7
      }}
    />
  );
};

// Composant Video Card ultra-moderne
const LiveStreamCard = ({ stream, streamState, index }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [viewerCount, setViewerCount] = useState(streamState?.current || 0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (streamState?.current !== viewerCount) {
      // Animation du compteur
      const duration = 1000;
      const startTime = Date.now();
      const startValue = viewerCount;
      const targetValue = streamState?.current || 0;

      const animateCount = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        
        const currentValue = Math.round(startValue + (targetValue - startValue) * easedProgress);
        setViewerCount(currentValue);

        if (progress < 1) {
          requestAnimationFrame(animateCount);
        }
      };

      animateCount();
    }
  }, [streamState?.current, viewerCount]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <>
      {/* Version normale */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)',
          backdropFilter: 'blur(20px)',
          border: streamState?.online ? '2px solid rgba(16, 185, 129, 0.5)' : '2px solid rgba(239, 68, 68, 0.5)',
          borderRadius: '25px',
          overflow: 'hidden',
          transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isHovered ? 'translateY(-10px) scale(1.02)' : 'translateY(0) scale(1)',
          boxShadow: isHovered 
            ? `0 30px 60px ${streamState?.online ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}` 
            : '0 15px 35px rgba(0,0,0,0.2)',
          position: 'relative',
          animation: `slideInFromBottom 0.8s ease-out ${index * 0.15}s both`,
          display: isFullscreen ? 'none' : 'block'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Indicateur LIVE pulsant */}
        {streamState?.online && (
          <div
            style={{
              position: 'absolute',
              top: '1rem',
              left: '1rem',
              background: 'linear-gradient(45deg, #ef4444, #dc2626)',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: '700',
              zIndex: 10,
              animation: 'pulse 2s infinite',
              boxShadow: '0 0 20px rgba(239, 68, 68, 0.6)'
            }}
          >
            🔴 LIVE
          </div>
        )}

        {/* Bouton plein écran */}
        <button
          onClick={toggleFullscreen}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            padding: '0.5rem',
            cursor: 'pointer',
            zIndex: 10,
            transition: 'all 0.3s ease',
            opacity: isHovered ? 1 : 0
          }}
        >
          🔍
        </button>

        {/* Conteneur vidéo */}
        <div style={{ 
          position: 'relative', 
          paddingTop: '56.25%',
          background: 'linear-gradient(45deg, #1a1a2e, #16213e)'
        }}>
          <iframe
            src={`https://www.youtube.com/embed/${stream.video_id}?autoplay=0&mute=1&controls=1`}
            title={stream.label}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              borderRadius: '0',
              transition: 'all 0.3s ease'
            }}
          />
        </div>

        {/* Métadonnées */}
        <div style={{ padding: '1.5rem', position: 'relative' }}>
          <SoundWave />
          
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h3 style={{
              margin: '0 0 1rem 0',
              fontSize: '1.3rem',
              fontWeight: '700',
              background: 'linear-gradient(45deg, #f59e0b, #ef4444, #0c2164ff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              📺 {stream.label}
            </h3>
            <p style={{ 
              margin: 0, 
              color: 'rgba(255,255,255,0.7)',
              fontSize: '0.9rem'
            }}>
              ID: {stream.video_id}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

// Composant principal LiveViewer qui affiche tous les streams d'un événement
export default function LiveViewer() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getEvent(id).then(event => {
      setEvent(event);
      setIsLoading(false);
    });
    
    // Connexion SSE pour les données en temps réel
    const es = new EventSource(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/events/${id}/stream`);
    
    es.onmessage = ev => {
      const msg = JSON.parse(ev.data);
      if (msg.type === 'init') {
        setEvent(e => ({ ...e, state: msg.data.state }));
      }
      if (msg.type === 'tick') {
        setEvent(e => ({ 
          ...e, 
          state: { 
            total: msg.data.total, 
            streams: Object.fromEntries(msg.data.streams.map(s => [s.id, s])) 
          } 
        }));
      }
    };
    
    return () => es.close();
  }, [id]);

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔄</div>
          <div>Chargement des streams...</div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>❌</div>
          <div>Événement non trouvé</div>
        </div>
      </div>
    );
  }

  const streamList = event.streams || [];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Bouton de retour */}
      <div style={{ 
        position: 'absolute', 
        top: '2rem', 
        left: '2rem', 
        zIndex: 10 
      }}>
        <Link
          to={`/admin/event/${event.id}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(10px)',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '12px',
            textDecoration: 'none',
            fontWeight: '600',
            transition: 'all 0.3s ease',
            border: '1px solid rgba(255,255,255,0.3)'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(255,255,255,0.3)';
            e.target.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(255,255,255,0.2)';
            e.target.style.transform = 'translateY(0)';
          }}
        >
          ← Retour à l'événement
        </Link>
      </div>

      {/* En-tête */}
      <div style={{
        textAlign: 'center',
        padding: '4rem 2rem 2rem',
        color: 'white'
      }}>
        <h1 style={{
          fontSize: '3rem',
          fontWeight: '800',
          margin: '0 0 1rem 0',
          background: 'linear-gradient(45deg, #ffffff, #f0f0f0)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          🔴 Live Viewer
        </h1>
        <p style={{
          fontSize: '1.2rem',
          opacity: 0.9,
          margin: 0
        }}>
          {event.name} - {streamList.length} stream{streamList.length > 1 ? 's' : ''}
        </p>
      </div>

      {/* Grille des streams */}
      <div style={{
        padding: '2rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '2rem',
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        {streamList.length === 0 ? (
          <div style={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            color: 'rgba(255,255,255,0.8)',
            fontSize: '1.2rem',
            padding: '4rem'
          }}>
            Aucun stream configuré pour cet événement
          </div>
        ) : (
          streamList.map((stream, index) => (
            <LiveStreamCard
              key={stream.id}
              stream={stream}
              streamState={event.state?.streams?.[stream.id]}
              index={index}
            />
          ))
        )}
      </div>
    </div>
  );
}