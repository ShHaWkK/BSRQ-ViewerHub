import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
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
import EventDetail from './EventDetail.jsx';
import { getEvent } from '../api.js';

ChartJS.register(LineElement, PointElement, LinearScale, TimeScale, Tooltip, Legend);

// Composant de particules animées
const ParticleSystem = () => {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationRef = useRef();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const updateCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    updateCanvasSize();

    // Créer des particules
    const createParticles = () => {
      particlesRef.current = [];
      for (let i = 0; i < 50; i++) {
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 1,
          vy: (Math.random() - 0.5) * 1,
          size: Math.random() * 2 + 1,
          opacity: Math.random() * 0.3 + 0.1,
          hue: Math.random() * 360
        });
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particlesRef.current.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.hue += 0.5;
        
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;
        
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${particle.hue}, 70%, 60%, ${particle.opacity})`;
        ctx.fill();
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };

    createParticles();
    animate();

    const handleResize = () => {
      updateCanvasSize();
      createParticles();
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
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
        opacity: 0.2
      }}
    />
  );
};

// Composant StreamCard amélioré
const DynamicStreamCard = ({ label, current, online }) => {
  const [displayViewers, setDisplayViewers] = useState(current);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (current !== displayViewers) {
      setIsAnimating(true);
      
      const duration = 1000;
      const startTime = Date.now();
      const startValue = displayViewers;
      const targetValue = current;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.round(startValue + (targetValue - startValue) * easedProgress);
        setDisplayViewers(currentValue);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
        }
      };

      animate();
    }
  }, [current, displayViewers]);

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
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
      }}
      onMouseEnter={(e) => {
        e.target.style.transform = 'translateY(-5px) scale(1.02)';
        e.target.style.boxShadow = '0 20px 40px rgba(0,0,0,0.4)';
      }}
      onMouseLeave={(e) => {
        e.target.style.transform = 'translateY(0) scale(1)';
        e.target.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
      }}
    >
      {/* Effet de brillance */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '-100%',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
          animation: online ? 'shine 3s infinite' : 'none'
        }}
      />
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 style={{ 
          margin: 0, 
          fontSize: '1.1rem', 
          fontWeight: '600',
          background: online ? 'linear-gradient(45deg, #10b981, #3b82f6)' : 'linear-gradient(45deg, #6b7280, #9ca3af)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          {label}
        </h3>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: online ? '#10b981' : '#ef4444',
              animation: online ? 'pulse 2s infinite' : 'none'
            }}
          />
          <span style={{ 
            fontSize: '0.8rem', 
            color: online ? '#10b981' : '#ef4444',
            fontWeight: '500'
          }}>
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
            animation: isAnimating ? 'glow 0.5s ease-in-out' : 'none'
          }}
        >
          {displayViewers?.toLocaleString() || 0}
        </div>
        <div style={{ 
          fontSize: '0.9rem', 
          color: 'rgba(255,255,255,0.7)',
          marginTop: '0.25rem'
        }}>
          spectateurs
        </div>
      </div>
      
      {/* Barre de progression */}
      <div
        style={{
          marginTop: '1rem',
          height: '4px',
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderRadius: '2px',
          overflow: 'hidden'
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
            boxShadow: online ? '0 0 10px rgba(16, 185, 129, 0.5)' : 'none'
          }}
        />
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [history, setHistory] = useState([]);
  const [totalViewers, setTotalViewers] = useState(0);
  const [previousTotal, setPreviousTotal] = useState(0);

  useEffect(() => {
    getEvent(id).then(setEvent);
    
    const es = new EventSource(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/events/${id}/stream`);
    
    es.onmessage = ev => {
      const msg = JSON.parse(ev.data);
      if (msg.type === 'init') {
        setEvent(e => ({ ...e, state: msg.data.state }));
        setHistory(msg.data.history);
        setPreviousTotal(msg.data.state?.total || 0);
        setTotalViewers(msg.data.state?.total || 0);
      }
      if (msg.type === 'tick') {
        setEvent(e => ({ 
          ...e, 
          state: { 
            total: msg.data.total, 
            streams: Object.fromEntries(msg.data.streams.map(s => [s.id, s])) 
          } 
        }));
        setHistory(h => [...h.slice(-29), { ts: msg.data.ts, total: msg.data.total }]);
        setPreviousTotal(totalViewers);
        setTotalViewers(msg.data.total);
      }
    };
    
    return () => es.close();
  }, [id, totalViewers]);

  if (!event) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1e1b4b 0%, #0c2164ff 50%, #db2777 100%)',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '3px solid rgba(255,255,255,0.3)',
            borderTopColor: '#f59e0b',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <div style={{ fontSize: '1.2rem', fontWeight: '500' }}>Chargement...</div>
        </div>
      </div>
    );
  }

  const streamList = Object.values(event.state?.streams || {});

  // Configuration du graphique avec style moderne
  const data = {
    labels: history.map(p => new Date(p.ts)),
    datasets: [{
      label: 'Spectateurs',
      data: history.map(p => p.total),
      borderColor: '#0c2164ff',
      backgroundColor: 'rgba(139, 92, 246, 0.1)',
      borderWidth: 3,
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#0c2164ff',
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#0c2164ff',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        type: 'time',
        time: { unit: 'minute' },
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        ticks: { color: 'rgba(255, 255, 255, 0.7)' }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        ticks: { color: 'rgba(255, 255, 255, 0.7)' }
      }
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e1b4b 0%, #0c2164ff 50%, #db2777 100%)',
      color: 'white',
      position: 'relative'
    }}>
      <ParticleSystem />
      
      <div style={{ position: 'relative', zIndex: 10 }}>
        {/* Bouton de retour */}
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
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 8px 25px rgba(139, 92, 246, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
            }}
          >
            ← Retour à l'évènement
          </Link>
        </div>

        {/* En-tête avec métriques principales */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
          padding: '2rem 1rem',
          textAlign: 'center'
        }}>
          <h1 style={{ 
            margin: '0 0 1rem 0', 
            fontSize: '2.5rem', 
            fontWeight: '700',
            background: 'linear-gradient(45deg, #f59e0b, #ef4444, #0c2164ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            📊 Dashboard Live
          </h1>
          
          <div style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '20px',
            padding: '2rem',
            maxWidth: '400px',
            margin: '0 auto',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
          }}>
            <div style={{ 
              fontSize: '0.9rem', 
              color: 'rgba(255,255,255,0.8)', 
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              Total Spectateurs
            </div>
            <div style={{
              fontSize: '3.5rem',
              fontWeight: '800',
              background: 'linear-gradient(45deg, #10b981, #3b82f6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: '1'
            }}>
              {totalViewers?.toLocaleString() || 0}
            </div>
            {totalViewers > previousTotal && (
              <div style={{ 
                color: '#10b981', 
                fontSize: '0.9rem', 
                marginTop: '0.5rem',
                animation: 'bounce 1s infinite'
              }}>
                📈 +{(totalViewers - previousTotal).toLocaleString()}
              </div>
            )}
          </div>
        </div>

        {/* Contenu principal */}
        <div style={{ padding: '2rem 1rem' }}>
          {/* Grille des streams */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            {streamList.map(s => (
              <DynamicStreamCard 
                key={s.id} 
                label={s.label} 
                current={s.current} 
                online={s.online} 
              />
            ))}
          </div>

          {/* Graphique */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '20px',
            padding: '2rem',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ 
              margin: '0 0 1.5rem 0', 
              fontSize: '1.5rem', 
              fontWeight: '600',
              background: 'linear-gradient(45deg, #0c2164ff, #3b82f6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              📈 Évolution Temps Réel
            </h3>
            <div style={{ height: '300px' }}>
              <Line data={data} options={options} />
            </div>
          </div>
        </div>
      </div>

      {/* Animations CSS */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes bounce {
          0%, 20%, 53%, 80%, 100% { transform: translateY(0); }
          40%, 43% { transform: translateY(-8px); }
          70% { transform: translateY(-4px); }
          90% { transform: translateY(-2px); }
        }
        
        @keyframes glow {
          0% { text-shadow: 0 0 5px rgba(19, 48, 110, 0.8); }
          50% { text-shadow: 0 0 20px rgba(19, 48, 110, 0.8); }
          100% { text-shadow: 0 0 5px rgba(19, 48, 110, 0.5); }
        }
        
        @keyframes shine {
          0% { left: -100%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
}