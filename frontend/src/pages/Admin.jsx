import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getEvents, createEvent, updateEvent, deleteEvent, generateMagicLink, logout } from '../api.js';
import Modal from '../components/Modal.jsx';
import customLogo from '../assets/custom-logo.svg';

// Composant de fond animé
const AnimatedBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

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
      if (document.hidden) return;
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
    const onVis = () => {
      // rien à faire, l'animation est simplement stoppée quand hidden
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', onVis);
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
        opacity: 0.6
      }}
    />
  );
};

// Composant Event Card animé
const EventCard = ({ event, index, onEdit, onDelete, onCopyMagic, onCopyMagicClient }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [clientTTLMonths, setClientTTLMonths] = useState(2);

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
          
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{
              background: 'linear-gradient(45deg, #10b981, #3b82f6)',
              borderRadius: '12px',
              padding: '0.4rem 0.75rem',
              fontSize: '0.85rem',
              fontWeight: '600',
              color: 'white',
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
            }}>
              ⏱️ {event.pollIntervalSec}s
            </div>
            <div style={{
              background: event.is_paused ? 'linear-gradient(45deg, #f59e0b, #ef4444)' : 'linear-gradient(45deg, #16a34a, #10b981)',
              borderRadius: '999px',
              padding: '0.35rem 0.75rem',
              fontSize: '0.8rem',
              fontWeight: '700',
              color: 'white',
              boxShadow: event.is_paused ? '0 4px 15px rgba(245, 158, 11, 0.4)' : '0 4px 15px rgba(16, 185, 129, 0.4)'
            }}>
              {event.is_paused ? '⏸️ En pause' : '▶️ Actif'}
            </div>
          </div>
        </div>

        <div style={{ 
          color: 'rgba(255,255,255,0.8)', 
          marginBottom: '1.5rem',
          fontSize: '1rem'
        }}>
          Intervalle de polling: {event.pollIntervalSec} secondes
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
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
          
          <button
            onClick={() => onCopyMagic(event)}
            style={{
              background: 'linear-gradient(45deg, #22c55e, #10b981)',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              transform: isHovered ? 'scale(1.05)' : 'scale(1)',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(34, 197, 94, 0.4)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.1)';
              e.target.style.boxShadow = '0 6px 20px rgba(34, 197, 94, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = isHovered ? 'scale(1.05)' : 'scale(1)';
              e.target.style.boxShadow = '0 4px 15px rgba(34, 197, 94, 0.4)';
            }}
          >
            🔗 Magic Link Admin
          </button>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <select
              value={clientTTLMonths}
              onChange={(e) => setClientTTLMonths(parseInt(e.target.value))}
              title="Durée du lien (TTL)"
              style={{
                appearance: 'none',
                background: 'linear-gradient(45deg, rgba(59,130,246,0.15), rgba(14,165,233,0.15))',
                color: '#0f172a',
                border: '1px solid rgba(59,130,246,0.4)',
                padding: '0.6rem 0.75rem',
                borderRadius: '10px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <option value={1}>TTL: 1 mois</option>
              <option value={2}>TTL: 2 mois</option>
            </select>

          <button
            onClick={() => onCopyMagicClient(event, clientTTLMonths)}
            style={{
              background: 'linear-gradient(45deg, #3b82f6, #0ea5e9)',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              transform: isHovered ? 'scale(1.05)' : 'scale(1)',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.1)';
              e.target.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = isHovered ? 'scale(1.05)' : 'scale(1)';
              e.target.style.boxShadow = '0 4px 15px rgba(59, 130, 246, 0.4)';
            }}
          >
            🔗 Magic Link Client
          </button>
          </div>

          <button
            type="button"
            onClick={() => onEdit(event)}
            style={{
              background: 'linear-gradient(45deg, #f59e0b, #ef4444)',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              transform: isHovered ? 'scale(1.05)' : 'scale(1)',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.1)';
              e.target.style.boxShadow = '0 6px 20px rgba(245, 158, 11, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = isHovered ? 'scale(1.05)' : 'scale(1)';
              e.target.style.boxShadow = '0 4px 15px rgba(245, 158, 11, 0.4)';
            }}
          >
            ✏️ Modifier
          </button>

          <button
            type="button"
            onClick={() => onDelete(event)}
            style={{
              background: 'linear-gradient(45deg, #ef4444, #b91c1c)',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.25rem',
              borderRadius: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              transform: isHovered ? 'scale(1.05)' : 'scale(1)',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(239, 68, 68, 0.5)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.1)';
              e.target.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.7)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = isHovered ? 'scale(1.05)' : 'scale(1)';
              e.target.style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.5)';
            }}
          >
            🗑️ Supprimer
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Admin() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState({ name: '', pollIntervalSec: '5' });
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [isCopying, setIsCopying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [banner, setBanner] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [editName, setEditName] = useState('');
  const [editInterval, setEditInterval] = useState('5');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');
  const [confirmHighInterval, setConfirmHighInterval] = useState(false);
  const [confirmCountdown, setConfirmCountdown] = useState(0);
  const countdownRef = useRef(null);

  // Suppression
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    getEvents()
      .then(events => {
        setEvents(events);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Échec getEvents:', err);
        setError(err.message || 'Impossible de charger les évènements');
        setIsLoading(false);
      });
  }, []);

  const submit = async e => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    try {
      // Validation côté client
      if (!form.name.trim()) {
        throw new Error('Le nom de l\'événement est requis');
      }
      
      const pollInterval = parseInt(form.pollIntervalSec);
      if (isNaN(pollInterval) || pollInterval < 2) {
        throw new Error('L\'intervalle doit être d\'au moins 2 secondes');
      }
      
      const eventData = {
        name: form.name.trim(),
        pollIntervalSec: pollInterval
      };
      
      const ev = await createEvent(eventData);
      setEvents([...events, ev]);
      setForm({ name: '', pollIntervalSec: '5' });
      
      // Animation de succès
      setTimeout(() => setIsSubmitting(false), 1000);
    } catch (error) {
      console.error('Erreur lors de la création:', error);
      setError(error.message || 'Erreur lors de la création de l\'événement');
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
        <div style={{ textAlign: 'center', width: 'min(700px, 92vw)' }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '2rem' }}>
            {[0,1,2].map(i => (
              <div key={i} className="skeleton" style={{ height: '140px' }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #2c1810 0%, #1a4645 25%, #2d5aa0 50%, #0f3460 75%, #8b1538 100%)',
      color: 'white',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <AnimatedBackground />
      
      <div style={{ position: 'relative', zIndex: 10, padding: '2rem' }}>
        <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}>
          <button
            onClick={async () => {
              try { await logout(); } catch {}
              try { navigate('/login?aud=admin', { replace: true }); } catch { window.location.assign('/login?aud=admin'); }
            }}
            style={{
              background: 'linear-gradient(45deg, #ef4444, #b91c1c)',
              color: 'white',
              border: 'none',
              padding: '0.6rem 1rem',
              borderRadius: '12px',
              fontWeight: '600',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 8px 25px rgba(239, 68, 68, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
            }}
          >
            Déconnexion
          </button>
        </div>
        {/* En-tête */}
        <header style={{
          textAlign: 'center',
          marginBottom: '3rem',
          background: 'linear-gradient(135deg, rgba(255,107,107,0.15) 0%, rgba(78,205,196,0.15) 25%, rgba(69,183,209,0.15) 50%, rgba(150,206,180,0.15) 75%, rgba(254,202,87,0.15) 100%)',
          backdropFilter: 'blur(20px)',
          borderRadius: '25px',
          padding: '3rem 2rem',
          border: '2px solid rgba(255,107,107,0.3)',
          boxShadow: '0 20px 40px rgba(255,107,107,0.2), 0 0 60px rgba(78,205,196,0.1)'
        }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <img 
              src={customLogo} 
              alt="Logo" 
              style={{
                height: '100px',
                width: '100px',
                filter: 'drop-shadow(0 0 20px rgba(255,107,107,0.5))',
                animation: 'float 3s ease-in-out infinite',
                display: 'block',
                margin: '0 auto',
                objectFit: 'contain'
              }}
              onError={(e) => {
                console.error('Erreur de chargement du logo:', e);
                e.target.style.display = 'none';
              }}
              onLoad={() => console.log('Logo chargé avec succès')}
            />
          </div>
          <h1 style={{
            margin: '0 0 1rem 0',
            fontSize: '3.5rem',
            fontWeight: '800',
            background: 'linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #feca57)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'glow 2s ease-in-out infinite alternate'
          }}>
            BSRQ
          </h1>
          <p style={{ 
            fontSize: '1.2rem', 
            color: 'rgba(255,255,255,0.9)',
            margin: 0,
            textShadow: '0 2px 10px rgba(0,0,0,0.3)'
          }}>
            Gérez vos évènements live en temps réel
          </p>
        </header>

        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {banner && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(16,185,129,0.1) 100%)',
              border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: '15px',
              padding: '1rem',
              marginBottom: '1.5rem',
              color: '#10b981',
              fontSize: '0.95rem',
              fontWeight: '600'
            }}>
              ✅ {banner}
            </div>
          )}
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
              background: 'linear-gradient(45deg, #4ecdc4, #45b7d1)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              ✨ Créer un Nouvel Évènement
            </h2>

            {error && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(255,107,107,0.2) 0%, rgba(255,107,107,0.1) 100%)',
                border: '1px solid rgba(255,107,107,0.3)',
                borderRadius: '15px',
                padding: '1rem',
                marginBottom: '1.5rem',
                color: '#ff6b6b',
                fontSize: '0.9rem',
                fontWeight: '500'
              }}>
                ⚠️ {error}
              </div>
            )}

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
                    e.target.style.borderColor = '#4ecdc4';
                    e.target.style.boxShadow = '0 0 20px rgba(78, 205, 196, 0.4)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.2)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                
                <input
                  type="number"
                  min="2"
                  placeholder="⏱ Interval (s)"
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
                    e.target.style.borderColor = '#45b7d1';
                    e.target.style.boxShadow = '0 0 20px rgba(69, 183, 209, 0.4)';
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
                    : 'linear-gradient(45deg, #ff6b6b, #4ecdc4)',
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
                  <EventCard key={event.id} event={event} index={index} onCopyMagic={async (ev) => {
                    if (isCopying) return;
                    setIsCopying(true);
                    try {
                      const url = await generateMagicLink(`/event/${ev.id}/dashboard`);
                      await navigator.clipboard.writeText(url);
                      setToast('Magic link copié dans le presse-papiers');
                      setTimeout(() => setToast(''), 3000);
                    } catch (e) {
                      setToast('Erreur lors de la génération du magic link');
                      setTimeout(() => setToast(''), 3000);
                    } finally {
                      setIsCopying(false);
                    }
                  }} onCopyMagicClient={async (ev, months) => {
                    if (isCopying) return;
                    setIsCopying(true);
                    try {
                      const ttlSec = Math.max(1, parseInt(months || 2)) * 30 * 24 * 60 * 60;
                      const url = await generateMagicLink(`/event/${ev.id}/stats`, ttlSec, 'client');
                      await navigator.clipboard.writeText(url);
                      setToast('Magic link client copié dans le presse-papiers');
                      setTimeout(() => setToast(''), 3000);
                    } catch (e) {
                      setToast('Erreur lors de la génération du magic link client');
                      setTimeout(() => setToast(''), 3000);
                    } finally {
                      setIsCopying(false);
                    }
                  }} onEdit={(ev) => {
                    setEditEvent(ev);
                    setEditName(ev.name || '');
                    setEditInterval(String(ev.pollIntervalSec || 5));
                    setEditError('');
                    setConfirmHighInterval(false);
                    setConfirmCountdown(0);
                    setEditOpen(true);
                  }} onDelete={(ev) => {
                    setEditOpen(false);
                    setDeleteTarget(ev);
                    setDeleteError('');
                    setDeleteOpen(true);
                  }} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal d'édition */}
      <Modal
        isOpen={editOpen}
        title="✏️ Modifier l'évènement"
        onClose={() => {
          setEditOpen(false);
          setConfirmHighInterval(false);
          setConfirmCountdown(0);
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
          }
        }}
        onConfirm={async () => {
          setEditSubmitting(true);
          setEditError('');
          try {
            if (!editName.trim()) throw new Error('Le nom est requis');
            const interval = parseInt(editInterval);
            if (isNaN(interval) || interval < 2) throw new Error('Intervalle \u2265 2s');
            if (interval > 60 && !confirmHighInterval) {
              setConfirmHighInterval(true);
              setConfirmCountdown(3);
              if (countdownRef.current) clearInterval(countdownRef.current);
              countdownRef.current = setInterval(() => {
                setConfirmCountdown((c) => {
                  if (c <= 1) {
                    clearInterval(countdownRef.current);
                    countdownRef.current = null;
                    return 0;
                  }
                  return c - 1;
                });
              }, 1000);
              setEditSubmitting(false);
              return;
            }
            const updated = await updateEvent(editEvent.id, { name: editName.trim(), pollIntervalSec: interval });
            setEvents(evts => evts.map(e => e.id === editEvent.id ? { ...e, name: updated.name, pollIntervalSec: updated.pollIntervalSec } : e));
            setEditSubmitting(false);
            setEditOpen(false);
            setBanner('Évènement mis à jour avec succès');
            setTimeout(() => setBanner(''), 3000);
          } catch (err) {
            console.error('Échec de la mise à jour', err);
            setEditError(err.message || 'Erreur inconnue');
            setEditSubmitting(false);
          }
        }}
        confirmText={confirmHighInterval ? (confirmCountdown > 0 ? `Confirmer (${confirmCountdown}s)` : 'Confirmer') : 'Enregistrer'}
        isSubmitting={editSubmitting}
        disableConfirm={confirmHighInterval && confirmCountdown > 0}
        ariaDescribedBy={confirmHighInterval ? 'high-interval-tip' : undefined}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: '1rem' }}>
          <label htmlFor="edit-name" style={{ position: 'absolute', left: '-10000px' }}>Nom de l'évènement</label>
          <input
            type="text"
            id="edit-name"
            aria-label="Nom de l'évènement"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Nom de l'évènement"
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '2px solid rgba(255,255,255,0.2)',
              borderRadius: '12px',
              padding: '0.75rem 1rem',
              color: 'white'
            }}
      />

      

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: 20,
          right: 20,
          background: 'rgba(16, 185, 129, 0.95)',
          color: 'white',
          padding: '0.75rem 1rem',
          borderRadius: 12,
          boxShadow: '0 10px 30px rgba(16, 185, 129, 0.5)',
          zIndex: 1000,
          fontWeight: 600
        }}>
          {toast}
        </div>
      )}
          <label htmlFor="edit-interval" style={{ position: 'absolute', left: '-10000px' }}>Intervalle de polling (secondes)</label>
          <input
            type="number"
            min="2"
            id="edit-interval"
            aria-label="Intervalle de polling (secondes)"
            value={editInterval}
            onChange={(e) => setEditInterval(e.target.value)}
            placeholder="Intervalle (s)"
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '2px solid rgba(255,255,255,0.2)',
              borderRadius: '12px',
              padding: '0.75rem 1rem',
              color: 'white'
            }}
          />
        </div>
        {confirmHighInterval && (
          <div id="high-interval-tip" style={{
            marginTop: '0.75rem',
            color: '#f59e0b',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '10px',
            padding: '0.5rem 0.75rem',
            fontSize: '0.9rem'
          }}>
            ⚠️ Intervalle élevé détecté (60s). Appuyez sur "Confirmer" pour valider.
          </div>
        )}
        {editError && (
          <div style={{
            marginTop: '0.75rem',
            color: '#ff6b6b',
            background: 'rgba(255,107,107,0.1)',
            border: '1px solid rgba(255,107,107,0.3)',
            borderRadius: '10px',
            padding: '0.5rem 0.75rem',
            fontSize: '0.9rem'
          }}>
            ⚠️ {editError}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={deleteOpen}
        title={deleteTarget ? `🗑️ Supprimer "${deleteTarget.name}" ?` : '🗑️ Supprimer cet évènement ?'}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteTarget(null);
        }}
        confirmText={deleteSubmitting ? 'Suppression…' : 'Confirmer'}
        isSubmitting={deleteSubmitting}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setDeleteSubmitting(true);
          setDeleteError('');
          try {
            await deleteEvent(deleteTarget.id);
            setEvents((prev) => prev.filter((e) => e.id !== deleteTarget.id));
            setDeleteOpen(false);
            setDeleteTarget(null);
          } catch (e) {
            console.error('Suppression échouée:', e);
            setDeleteError(e.message || 'Erreur lors de la suppression');
          } finally {
            setDeleteSubmitting(false);
          }
        }}
      >
        <div style={{ color: 'rgba(255,255,255,0.85)' }}>
          Cette action supprime l’évènement de la liste et met fin aux mises à jour en temps réel. Les données historiques restent conservées.
          {deleteError && (
            <div style={{ marginTop: '0.75rem', color: '#ef4444', fontWeight: 600 }}>
              {deleteError}
            </div>
          )}
        </div>
      </Modal>

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
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
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
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        
        input::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </div>
  );
}
