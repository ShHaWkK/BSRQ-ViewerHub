import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getEvents, createEvent } from '../api.js';

// Composant de fond animé
const AnimatedBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const waves = [];
    for (let i = 0; i < 3; i++) {
      waves.push({
        y: canvas.height / 2 + i * 50,
        length: 0.01 + i * 0.005,
        amplitude: 30 + i * 20,
        frequency: 0.01 + i * 0.005,
        increment: 0
      });
    }

    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      waves.forEach((wave, index) => {
        wave.increment += wave.frequency;
        ctx.beginPath();
        ctx.moveTo(0, wave.y);

        for (let x = 0; x < canvas.width; x++) {
          const y = wave.y + Math.sin(x * wave.length + wave.increment) * wave.amplitude;
          ctx.lineTo(x, y);
        }

        const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
        gradient.addColorStop(0, `hsla(${240 + index * 60}, 70%, 50%, 0.3)`);
        gradient.addColorStop(0.5, `hsla(${300 + index * 60}, 70%, 60%, 0.5)`);
        gradient.addColorStop(1, `hsla(${360 + index * 60}, 70%, 50%, 0.3)`);

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
        opacity: 0.6
      }}
    />
  );
};

// Composant Event Card animé
const EventCard = ({ event, index }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: '20px',
        padding: '2rem',
        margin: '1rem 0',
        transform: isHovered ? 'translateY(-10px) scale(1.02)' : 'translateY(0) scale(1)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: isHovered 
          ? '0 20px 60px rgba(139, 92, 246, 0.3)' 
          : '0 10px 30px rgba(0,0,0,0.2)',
        position: 'relative',
        overflow: 'hidden',
        animation: `slideInFromLeft 0.8s ease-out ${index * 0.1}s both`
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Effet de brillance */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: isHovered ? '0%' : '-100%',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
          transition: 'left 0.6s ease-in-out'
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{
            margin: 0,
            fontSize: '1.5rem',
            fontWeight: '700',
            background: 'linear-gradient(45deg, #f59e0b, #ef4444, #8b5cf6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            {event.name}
          </h3>
          
          <div style={{
            background: 'linear-gradient(45deg, #10b981, #3b82f6)',
            borderRadius: '12px',
            padding: '0.5rem 1rem',
            fontSize: '0.9rem',
            fontWeight: '600',
            color: 'white',
            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
          }}>
            ⏱️ {event.pollIntervalSec}s
          </div>
        </div>

        <div style={{ 
          color: 'rgba(255,255,255,0.8)', 
          marginBottom: '1.5rem',
          fontSize: '1rem'
        }}>
          Intervalle de polling: {event.pollIntervalSec} secondes
        </div>

        <Link
          to={`/admin/event/${event.id}`}
          style={{
            display: 'inline-block',
            background: 'linear-gradient(45deg, #8b5cf6, #3b82f6)',
            color: 'white',
            padding: '0.75rem 2rem',
            borderRadius: '12px',
            textDecoration: 'none',
            fontWeight: '600',
            transform: isHovered ? 'scale(1.05)' : 'scale(1)',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)'
          }}
        >
          🚀 Ouvrir l'évènement
        </Link>
      </div>
    </div>
  );
};

export default function Admin() {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState({ name: '', pollIntervalSec: 5 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getEvents().then(events => {
      setEvents(events);
      setIsLoading(false);
    });
  }, []);

  const submit = async e => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const ev = await createEvent(form);
      setEvents([...events, ev]);
      setForm({ name: '', pollIntervalSec: 5 });
      
      // Animation de succès
      setTimeout(() => setIsSubmitting(false), 1000);
    } catch (error) {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #2d1b69 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '80px',
            height: '80px',
            border: '4px solid rgba(139, 92, 246, 0.3)',
            borderTopColor: '#8b5cf6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 2rem'
          }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600' }}>Chargement des évènements...</h2>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #2d1b69 100%)',
      color: 'white',
      position: 'relative'
    }}>
      <AnimatedBackground />
      
      <div style={{ position: 'relative', zIndex: 10, padding: '2rem' }}>
        {/* En-tête */}
        <header style={{
          textAlign: 'center',
          marginBottom: '3rem',
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(20px)',
          borderRadius: '25px',
          padding: '3rem 2rem',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
        }}>
          <h1 style={{
            margin: '0 0 1rem 0',
            fontSize: '3.5rem',
            fontWeight: '800',
            background: 'linear-gradient(45deg, #f59e0b, #ef4444, #8b5cf6, #3b82f6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'glow 2s ease-in-out infinite alternate'
          }}>
            🎯 Centre de Contrôle
          </h1>
          <p style={{ 
            fontSize: '1.2rem', 
            color: 'rgba(255,255,255,0.8)',
            margin: 0 
          }}>
            Gérez vos évènements live en temps réel
          </p>
        </header>

        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Formulaire de création */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '25px',
            padding: '2.5rem',
            marginBottom: '3rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <h2 style={{
              margin: '0 0 2rem 0',
              fontSize: '1.8rem',
              fontWeight: '700',
              background: 'linear-gradient(45deg, #10b981, #3b82f6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              ✨ Créer un Nouvel Évènement
            </h2>

            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '1rem' }}>
                <input
                  type="text"
                  placeholder="🎪 Nom de l'évènement"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '2px solid rgba(255,255,255,0.2)',
                    borderRadius: '15px',
                    padding: '1rem 1.5rem',
                    fontSize: '1rem',
                    color: 'white',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    backdropFilter: 'blur(10px)'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#8b5cf6';
                    e.target.style.boxShadow = '0 0 20px rgba(139, 92, 246, 0.3)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.2)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                
                <input
                  type="number"
                  min="2"
                  placeholder="⏱️ Interval (s)"
                  value={form.pollIntervalSec}
                  onChange={e => setForm({ ...form, pollIntervalSec: e.target.value })}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '2px solid rgba(255,255,255,0.2)',
                    borderRadius: '15px',
                    padding: '1rem 1.5rem',
                    fontSize: '1rem',
                    color: 'white',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    backdropFilter: 'blur(10px)'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#8b5cf6';
                    e.target.style.boxShadow = '0 0 20px rgba(139, 92, 246, 0.3)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.2)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !form.name.trim()}
                style={{
                  background: isSubmitting 
                    ? 'linear-gradient(45deg, #6b7280, #9ca3af)' 
                    : 'linear-gradient(45deg, #8b5cf6, #3b82f6)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '15px',
                  padding: '1rem 2rem',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  transform: isSubmitting ? 'scale(0.98)' : 'scale(1)',
                  boxShadow: '0 10px 30px rgba(139, 92, 246, 0.4)',
                  alignSelf: 'flex-start'
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting) {
                    e.target.style.transform = 'scale(1.05)';
                    e.target.style.boxShadow = '0 15px 40px rgba(139, 92, 246, 0.6)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSubmitting) {
                    e.target.style.transform = 'scale(1)';
                    e.target.style.boxShadow = '0 10px 30px rgba(139, 92, 246, 0.4)';
                  }
                }}
              >
                {isSubmitting ? '🔄 Création...' : '🚀 Créer l\'Évènement'}
              </button>
            </form>
          </div>

          {/* Liste des évènements */}
          <div>
            <h2 style={{
              fontSize: '2rem',
              fontWeight: '700',
              marginBottom: '2rem',
              background: 'linear-gradient(45deg, #f59e0b, #ef4444)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              📋 Évènements Actifs ({events.length})
            </h2>

            {events.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '20px',
                border: '2px dashed rgba(255,255,255,0.2)'
              }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎪</div>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'rgba(255,255,255,0.8)' }}>
                  Aucun évènement créé
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.6)' }}>
                  Créez votre premier évènement pour commencer !
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {events.map((event, index) => (
                  <EventCard key={event.id} event={event} index={index} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes glow {
          0% { text-shadow: 0 0 20px rgba(139, 92, 246, 0.5); }
          100% { text-shadow: 0 0 30px rgba(59, 130, 246, 0.8); }
        }
        
        @keyframes slideInFromLeft {
          from {
            transform: translateX(-100px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        input::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </div>
  );
}