import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getEvent, addStream, removeStream } from '../api.js';

// Composant de particules flottantes
const FloatingParticles = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const createParticle = () => {
      const particle = document.createElement('div');
      particle.style.position = 'absolute';
      particle.style.width = Math.random() * 6 + 2 + 'px';
      particle.style.height = particle.style.width;
      particle.style.background = `hsl(${Math.random() * 60 + 200}, 70%, 60%)`;
      particle.style.borderRadius = '50%';
      particle.style.pointerEvents = 'none';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.top = '100%';
      particle.style.opacity = Math.random() * 0.8 + 0.2;
      particle.style.transition = `transform ${Math.random() * 10 + 5}s linear, opacity ${Math.random() * 5 + 3}s ease-out`;
      
      container.appendChild(particle);
      
      setTimeout(() => {
        particle.style.transform = `translateY(-100vh) translateX(${(Math.random() - 0.5) * 200}px)`;
        particle.style.opacity = '0';
      }, 100);
      
      setTimeout(() => {
        if (container.contains(particle)) {
          container.removeChild(particle);
        }
      }, 15000);
    };

    const interval = setInterval(createParticle, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
        overflow: 'hidden'
      }}
    />
  );
};

// Composant Stream Item animé
const StreamItem = ({ stream, onDelete, index }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    setTimeout(() => {
      onDelete(stream.id);
    }, 500);
  };

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: '20px',
        padding: '1.5rem',
        margin: '1rem 0',
        transform: isDeleting 
          ? 'scale(0.8) rotateX(90deg)' 
          : isHovered 
            ? 'translateY(-5px) scale(1.02)' 
            : 'translateY(0) scale(1)',
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: isDeleting ? 0 : 1,
        boxShadow: isHovered 
          ? '0 20px 40px rgba(139, 92, 246, 0.3)' 
          : '0 10px 30px rgba(0,0,0,0.2)',
        position: 'relative',
        overflow: 'hidden',
        animation: `slideInFromRight 0.8s ease-out ${index * 0.1}s both`
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

      <div style={{ 
        position: 'relative', 
        zIndex: 1, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <div>
          <h3 style={{
            margin: '0 0 0.5rem 0',
            fontSize: '1.3rem',
            fontWeight: '600',
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

        <button
          onClick={handleDelete}
          disabled={isDeleting}
          style={{
            background: isDeleting 
              ? 'linear-gradient(45deg, #6b7280, #9ca3af)' 
              : 'linear-gradient(45deg, #ef4444, #dc2626)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '0.75rem 1.5rem',
            fontSize: '0.9rem',
            fontWeight: '600',
            cursor: isDeleting ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            transform: isDeleting ? 'scale(0.9)' : 'scale(1)',
            boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)'
          }}
          onMouseEnter={(e) => {
            if (!isDeleting) {
              e.target.style.transform = 'scale(1.1)';
              e.target.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.6)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isDeleting) {
              e.target.style.transform = 'scale(1)';
              e.target.style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.4)';
            }
          }}
        >
          {isDeleting ? '🗑️ Suppression...' : '❌ Supprimer'}
        </button>
      </div>
    </div>
  );
};

export default function EventDetail() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [form, setForm] = useState({ label: '', urlOrId: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function refresh() {
    const ev = await getEvent(id);
    setEvent(ev);
    setIsLoading(false);
  }

  useEffect(() => { 
    refresh(); 
  }, [id]);

  const submit = async e => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await addStream(id, form);
      setForm({ label: '', urlOrId: '' });
      await refresh();
      setTimeout(() => setIsSubmitting(false), 1000);
    } catch (error) {
      setIsSubmitting(false);
    }
  };

  const del = async sid => {
    await removeStream(id, sid);
    refresh();
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
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600' }}>Chargement de l'évènement...</h2>
        </div>
      </div>
    );
  }

  if (!event) return null;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #2d1b69 100%)',
      color: 'white',
      position: 'relative'
    }}>
      <FloatingParticles />
      
      <div style={{ position: 'relative', zIndex: 10, padding: '2rem' }}>
        {/* Bouton de retour */}
        <div style={{ marginBottom: '2rem' }}>
          <Link
            to="/admin"
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
            ← Retour à l'admin
          </Link>
        </div>

        {/* En-tête avec navigation */}
        <header style={{
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(20px)',
          borderRadius: '25px',
          padding: '2rem',
          marginBottom: '3rem',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          textAlign: 'center'
        }}>
          <h1 style={{
            margin: '0 0 2rem 0',
            fontSize: '3rem',
            fontWeight: '800',
            background: 'linear-gradient(45deg, #f59e0b, #ef4444, #0c2164ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'glow 2s ease-in-out infinite alternate'
          }}>
            {event.name}
          </h1>

          <div style={{
            margin: '0 0 2rem 0',
            fontSize: '1.2rem',
            fontWeight: '600',
            color: 'rgba(255,255,255,0.8)'
          }}>
            ID de l'évènement : {event.id}
          </div>

          {/* Boutons de navigation vers Dashboard et LiveViewer */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <Link
              to={`/event/${event.id}/dashboard`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'linear-gradient(45deg, #10b981, #059669)',
                color: 'white',
                padding: '1rem 2rem',
                borderRadius: '15px',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '1.1rem',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
                border: 'none'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-3px) scale(1.05)';
                e.target.style.boxShadow = '0 8px 25px rgba(16, 185, 129, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0) scale(1)';
                e.target.style.boxShadow = '0 4px 15px rgba(16, 185, 129, 0.4)';
              }}
            >
              📊 Dashboard
            </Link>

            <Link
              to={`/event/${event.id}/live`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'linear-gradient(45deg, #ef4444, #dc2626)',
                color: 'white',
                padding: '1rem 2rem',
                borderRadius: '15px',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '1.1rem',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)',
                border: 'none'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-3px) scale(1.05)';
                e.target.style.boxShadow = '0 8px 25px rgba(239, 68, 68, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0) scale(1)';
                e.target.style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.4)';
              }}
            >
              🔴 Live Viewer
            </Link>
          </div>
        </header>

        {/* Formulaire d'ajout de flux */}
        <form onSubmit={submit} style={{
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(20px)',
          borderRadius: '25px',
          padding: '2rem',
          marginBottom: '3rem',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          textAlign: 'center'
        }}>
          <h2 style={{
            margin: '0 0 2rem 0',
            fontSize: '2rem',
            fontWeight: '700',
            color: 'white'
          }}>Ajouter un flux</h2>

          <div style={{ marginBottom: '1rem' }}>
            <input
              type="text"
              placeholder="Label"
              value={form.label}
              onChange={e => setForm({ ...form, label: e.target.value })}
              style={{
                padding: '0.75rem',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                width: '100%',
                maxWidth: '400px',
                margin: '0 auto',
                outline: 'none',
                transition: 'all 0.3s ease',
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <input
              type="text"
              placeholder="URL ou ID"
              value={form.urlOrId}
              onChange={e => setForm({ ...form, urlOrId: e.target.value })}
              style={{
                padding: '0.75rem',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                width: '100%',
                maxWidth: '400px',
                margin: '0 auto',
                outline: 'none',
                transition: 'all 0.3s ease',
              }}
            />
          </div>

          <button type="submit" style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '12px',
            border: 'none',
            background: 'linear-gradient(45deg, #0c2164ff, #3b82f6)',
            color: 'white',
            fontWeight: '600',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            transform: isSubmitting ? 'scale(0.9)' : 'scale(1)',
            boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)'
          }}
          disabled={isSubmitting}
          >
            {isSubmitting ? '⏳ En cours...' : '➕ Ajouter'}
          </button>
        </form>

        {/* Liste des flux */}
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(20px)',
          borderRadius: '25px',
          padding: '2rem',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        }}>
          <h2 style={{
            margin: '0 0 2rem 0',
            fontSize: '2rem',
            fontWeight: '700',
            color: 'white'
          }}>Flux ajoutés</h2>

          {event.streams.map((stream, index) => (
            <StreamItem key={stream.id} stream={stream} onDelete={del} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
};