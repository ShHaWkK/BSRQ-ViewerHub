import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getEvent, addStream, removeStream, pauseEvent, startEvent, reactivateStream, updateStream, pauseStream, startStream, toggleStreamFavorite } from '../api.js';
import bsrqLogo from '../assets/bsrq.png';



/**
 * Composant pour afficher des particules flottantes en arrière-plan
 * param {Object} props
 * @returns 
 */
const FloatingParticles = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

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

    let interval = setInterval(createParticle, 1600);
    const onVis = () => {
      clearInterval(interval);
      interval = document.hidden ? null : setInterval(createParticle, 1600);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', onVis);
    };
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

/*
  * Composant pour afficher un flux individuel avec ses actions
  * @param {Object} props
  * @param {Object} props.stream - Données du flux
  * @param {Function} props.onDelete - Fonction de suppression du flux
  * @param {Function} props.onReactivate - Fonction de réactivation du flux
  * @param {Function} props.onUpdate - Fonction de mise à jour du flux
  * @param {Function} props.onPauseStream - Fonction de mise en pause du flux
  * @param {Function} props.onStartStream - Fonction de démarrage du flux
  * @param {Function} props.onToggleFavorite - Fonction de basculement du favori
  * @param {number} props.index - Index du flux pour l'animation
  * @returns
*/


const StreamItem = ({ stream, onDelete, onReactivate, onUpdate, onPauseStream, onStartStream, onToggleFavorite, index }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [saveError, setSaveError] = useState(null);
  const [editForm, setEditForm] = useState({
    label: stream.label || '',
    customInterval: stream.custom_interval_sec || ''
  });

  const handleDelete = async () => {
    setIsDeleting(true);
    setTimeout(() => {
      onDelete(stream.id);
    }, 500);
  };

  const handleReactivate = async () => {
    await onReactivate(stream.id);
  };

  const handlePauseStream = async () => {
    setActionError('');
    setActionBusy(true);
    try {
      await onPauseStream(stream.id);
    } catch (e) {
      console.error('Pause stream failed:', e);
      setActionError('Échec de la pause du flux.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleStartStream = async () => {
    setActionError('');
    setActionBusy(true);
    try {
      await onStartStream(stream.id);
    } catch (e) {
      console.error('Start stream failed:', e);
      setActionError('Échec du démarrage du flux.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleToggleFavorite = async () => {
    await onToggleFavorite(stream.id, !stream.is_favorite);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    setSaveError(null);
    setIsSaving(true);
    try {
      const nextLabel = (editForm.label || '').trim();
      if (!nextLabel) {
        throw new Error('Le label est requis');
      }
      const rawInterval = editForm.customInterval;
      const intervalNum = rawInterval === '' || rawInterval === null || rawInterval === undefined
        ? undefined
        : parseInt(rawInterval, 10);
      const payload = intervalNum && !isNaN(intervalNum)
        ? { label: nextLabel, customInterval: intervalNum }
        : { label: nextLabel };
      await onUpdate(stream.id, payload);
      setIsEditing(false);
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      setSaveError('Échec de la sauvegarde. Réessayez.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditForm({
      label: stream.label || '',
      customInterval: stream.custom_interval_sec || ''
    });
    setIsEditing(false);
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
          {isEditing ? (
            <div style={{ marginBottom: '1rem' }}>
              <input
                type="text"
                placeholder="Label"
                value={editForm.label}
                onChange={e => setEditForm({ ...editForm, label: e.target.value })}
                style={{
                  padding: '0.5rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  width: '100%',
                  marginBottom: '0.5rem',
                  outline: 'none'
                }}
              />

              <input
                type="number"
                placeholder="Intervalle (sec, optionnel)"
                value={editForm.customInterval}
                onChange={e => setEditForm({ ...editForm, customInterval: e.target.value })}
                min="2"
                max="300"
                style={{
                  padding: '0.5rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  width: '100%',
                  outline: 'none'
                }}
              />
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <button
                onClick={handleToggleFavorite}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: stream.is_favorite ? '2.5rem' : '1.2rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  transform: stream.is_favorite ? 'scale(1.3)' : 'scale(0.7)',
                  filter: stream.is_favorite ? 'drop-shadow(0 0 15px #fbbf24)' : 'none',
                  opacity: stream.is_favorite ? 1 : 0.5
                }}
                title={stream.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              >
                {stream.is_favorite ? '⭐' : '☆'}
              </button>
              <h3 style={{
                margin: 0,
                fontSize: '1.3rem',
                fontWeight: '600',
                background: stream.is_favorite 
                  ? 'linear-gradient(45deg, #fbbf24, #f59e0b, #d97706)' 
                  : 'linear-gradient(45deg, #f59e0b, #ef4444, #0c2164ff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>📺 {stream.label}</h3>
              {stream.custom_interval_sec && (
                <span style={{
                  fontSize: '0.8rem',
                  color: 'rgba(255,255,255,0.7)',
                  background: 'rgba(255,255,255,0.1)',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '10px'
                }}>⏱️ {stream.custom_interval_sec}s</span>
              )}
            </div>
          )}
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              {stream.is_paused ? (
                <button
                  onClick={handleStartStream}
                  disabled={actionBusy}
                  style={{
                    background: 'linear-gradient(45deg, #10b981, #059669)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.3rem 0.6rem',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    cursor: actionBusy ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  title="Démarrer ce flux"
                >
                  ▶️ Start
                </button>
              ) : (
                <button
                  onClick={handlePauseStream}
                  disabled={actionBusy}
                  style={{
                    background: 'linear-gradient(45deg, #f59e0b, #d97706)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.3rem 0.6rem',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    cursor: actionBusy ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  title="Mettre en pause ce flux"
                >
                  {actionBusy ? '⏳...' : '⏸️ Pause'}
                </button>
              )}
            </div>
            {actionError && (
              <div style={{ color: '#fecaca', marginTop: '0.25rem', fontSize: '0.8rem' }}>{actionError}</div>
            )}
          </div>
          <p style={{ 
            margin: 0, 
            color: 'rgba(255,255,255,0.7)',
            fontSize: '0.9rem'
          }}>
            ID: {stream.video_id}
            {stream.is_disabled && (
              <span style={{ 
                color: '#ef4444', 
                fontWeight: 'bold', 
                marginLeft: '0.5rem'
              }}>
                (Désactivé - {stream.failure_count || 0}/3 échecs)
              </span>
            )}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {stream.is_disabled && (
            <button
              onClick={handleReactivate}
              style={{
                background: 'linear-gradient(45deg, #1e293b, #334155)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '0.5rem 1rem',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'scale(1.05)';
                e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)';
                e.target.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.4)';
              }}
            >
              🔄 Réactiver
            </button>
          )}
          {isEditing ? (
            <>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                style={{
                  background: 'linear-gradient(45deg, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.5rem 1rem',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                {isSaving ? '⏳ Sauvegarde...' : '✅ Sauvegarder'}
              </button>
              {saveError && (
                <div style={{ color: '#fecaca', marginTop: '0.5rem' }}>{saveError}</div>
              )}
              <button
                onClick={handleCancelEdit}
                style={{
                  background: 'linear-gradient(45deg, #6b7280, #4b5563)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.5rem 1rem',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                ❌ Annuler
              </button>
            </>
          ) : (
            <button
              onClick={handleEdit}
              style={{
                background: 'linear-gradient(45deg, #0c2164ff, #1e40af)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '0.5rem 1rem',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              ✏️ Modifier
            </button>
          )}
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
  const [form, setForm] = useState({ label: '', urlOrId: '', customInterval: '' });
  const [autoTitle, setAutoTitle] = useState('');
  const [isLoadingTitle, setIsLoadingTitle] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const titleAbortRef = useRef(null);
  const titleDebounceRef = useRef(null);

  async function refresh() {
    const ev = await getEvent(id);
    setEvent(ev);
    setIsPaused(ev.is_paused || false);
    setIsLoading(false);
  }

  useEffect(() => { 
    refresh(); 
  }, [id]);

  const fetchVideoTitle = async (urlOrId) => {
    if (!urlOrId.trim()) return;
    
    setIsLoadingTitle(true);
    try {
      // Extraire l'ID de la vidéo depuis l'URL ou utiliser directement l'ID
      let videoId = urlOrId;
      if (urlOrId.includes('youtube.com') || urlOrId.includes('youtu.be')) {
        const url = new URL(urlOrId);
        videoId = url.searchParams.get('v') || url.pathname.split('/').pop();
      }
      
      // Appel à l'API backend pour récupérer le titre (via VITE_API_URL ou /api)
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      // Annule toute requête précédente
      if (titleAbortRef.current) titleAbortRef.current.abort();
      const controller = new AbortController();
      titleAbortRef.current = controller;
      const response = await fetch(`${API_BASE}/youtube/title/${videoId}`, { signal: controller.signal });
      
      if (response.ok) {
        const data = await response.json();
        const title = data.title;
        setAutoTitle(title);
        // Remplir automatiquement le label avec le titre de la vidéo
        setForm(prev => ({ ...prev, label: title }));
      } else {
        console.error('Erreur lors de la récupération du titre:', response.status);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Erreur lors de la récupération du titre:', error);
      }
    }
    setIsLoadingTitle(false);
  };

  const debouncedFetchVideoTitle = (value) => {
    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
    titleDebounceRef.current = setTimeout(() => {
      fetchVideoTitle(value);
    }, 400);
  };

  useEffect(() => {
    return () => {
      if (titleAbortRef.current) titleAbortRef.current.abort();
      if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
    };
  }, []);

  const submit = async e => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      // Validation basique de l'ID YouTube pour meilleure UX
      const isId = /^[a-zA-Z0-9_-]{11}$/;
      let videoId = form.urlOrId;
      if (form.urlOrId.includes('youtube.com') || form.urlOrId.includes('youtu.be')) {
        const url = new URL(form.urlOrId);
        videoId = url.searchParams.get('v') || url.pathname.split('/').pop();
      }
      if (!videoId || !isId.test(videoId)) {
        setSubmitError('ID/URL YouTube invalide. Vérifiez la valeur saisie.');
        setIsSubmitting(false);
        return;
      }

      await addStream(id, form);
      setForm({ label: '', urlOrId: '', customInterval: '' });
      setAutoTitle('');
      await refresh();
      setIsSubmitting(false);
    } catch (error) {
      setSubmitError(error.message || 'Échec ajout du flux. Réessayez.');
      setIsSubmitting(false);
    }
  };

  const del = async sid => {
    await removeStream(id, sid);
    refresh();
  };

  const handleTogglePause = async () => {
    setIsToggling(true);
    try {
      if (isPaused) {
        await startEvent(id);
        setIsPaused(false);
      } else {
        await pauseEvent(id);
        setIsPaused(true);
      }
    } catch (error) {
      console.error('Erreur lors du toggle pause/start:', error);
    }
    setIsToggling(false);
  };

  const handleUpdateStream = async (streamId, updateData) => {
    try {
      await updateStream(id, streamId, updateData);
      await refresh();
    } catch (error) {
      console.error('Erreur lors de la mise à jour du flux:', error);
      throw error;
    }
  };

  const handlePauseStream = async (streamId) => {
    try {
      await pauseStream(id, streamId);
      await refresh();
    } catch (error) {
      console.error('Erreur lors de la pause du flux:', error);
    }
  };

  const handleStartStream = async (streamId) => {
    try {
      await startStream(id, streamId);
      await refresh();
    } catch (error) {
      console.error('Erreur lors du démarrage du flux:', error);
    }
  };

  const handleReactivateStream = async (streamId) => {
    try {
      await reactivateStream(id, streamId);
      await refresh();
    } catch (error) {
      console.error('Erreur lors de la réactivation:', error);
    }
  };

  const handleToggleFavorite = async (streamId, isFavorite) => {
    try {
      await toggleStreamFavorite(id, streamId, isFavorite);
      await refresh();
    } catch (error) {
      console.error('Erreur lors du toggle favori:', error);
    }
  };

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 30%, #334155 70%, #475569 100%)',
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
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 30%, #334155 70%, #475569 100%)',
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
          {/* Logo BSRQ */}
          <div style={{ marginBottom: '1.5rem' }}>
            <img 
              src={bsrqLogo} 
              alt="BSRQ Logo" 
              style={{
                height: '80px',
                width: 'auto',
                maxWidth: '300px',
                objectFit: 'contain'
              }}
            />
          </div>
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

          {/* Boutons Pause/Start */}
          <div style={{
            margin: '0 0 2rem 0',
            display: 'flex',
            justifyContent: 'center',
            gap: '1rem'
          }}>
            <button
              onClick={handleTogglePause}
              disabled={isToggling}
              style={{
                background: isPaused ? 'linear-gradient(45deg, #1e293b, #334155)' : 'linear-gradient(45deg, #475569, #64748b)',
                color: 'white',
                border: 'none',
                padding: '1rem 2rem',
                borderRadius: '15px',
                fontWeight: '600',
                fontSize: '1.1rem',
                cursor: isToggling ? 'not-allowed' : 'pointer',
                opacity: isToggling ? 0.7 : 1,
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
              }}
            >
              {isToggling ? '⏳ Chargement...' : (isPaused ? '▶️ Démarrer' : '⏸️ Pause')}
            </button>
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
                boxShadow: '0 4px 15px rgba(30, 41, 59, 0.4)',
                border: 'none'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-3px) scale(1.05)';
                e.target.style.boxShadow = '0 8px 25px rgba(30, 41, 59, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0) scale(1)';
                e.target.style.boxShadow = '0 4px 15px rgba(30, 41, 59, 0.4)';
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
                background: 'linear-gradient(45deg, #475569, #64748b)',
                color: 'white',
                padding: '1rem 2rem',
                borderRadius: '15px',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '1.1rem',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(71, 85, 105, 0.4)',
                border: 'none'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-3px) scale(1.05)';
                e.target.style.boxShadow = '0 8px 25px rgba(71, 85, 105, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0) scale(1)';
                e.target.style.boxShadow = '0 4px 15px rgba(71, 85, 105, 0.4)';
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
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center' }}>
              <input
                type="text"
                placeholder="URL ou ID YouTube"
                value={form.urlOrId}
                onChange={e => {
                  const newValue = e.target.value;
                  setForm({ ...form, urlOrId: newValue });
                  // Déclencher automatiquement la récupération du titre si l'URL semble valide
                  if (newValue.includes('youtube.com') || newValue.includes('youtu.be') || (newValue.length === 11 && !newValue.includes(' '))) {
                    debouncedFetchVideoTitle(newValue);
                  }
                }}
                style={{
                  padding: '0.75rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  width: '100%',
                  maxWidth: '300px',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                }}
              />
              <button
                type="button"
                onClick={() => fetchVideoTitle(form.urlOrId)}
                disabled={!form.urlOrId.trim() || isLoadingTitle}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: isLoadingTitle ? 'linear-gradient(45deg, #6b7280, #9ca3af)' : 'linear-gradient(45deg, #3b82f6, #1d4ed8)',
                  color: 'white',
                  fontWeight: '600',
                  cursor: (!form.urlOrId.trim() || isLoadingTitle) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  fontSize: '0.9rem'
                }}
              >
                {isLoadingTitle ? '⏳' : '🔍 Titre'}
              </button>
            </div>
          </div>

          {autoTitle && (
            <div style={{
              marginBottom: '1rem',
              textAlign: 'center',
              fontSize: '0.9rem',
              color: 'rgba(255,255,255,0.7)'
            }}>
              📺 Titre détecté et ajouté au label: <span style={{ fontStyle: 'italic', color: 'white' }}>{autoTitle}</span>
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <input
              type="number"
              placeholder="Intervalle personnalisé (secondes, optionnel)"
              value={form.customInterval}
              onChange={e => setForm({ ...form, customInterval: e.target.value })}
              min="2"
              max="300"
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
            background: 'linear-gradient(45deg, #1e293b, #334155)',
            color: 'white',
            fontWeight: '600',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            transform: isSubmitting ? 'scale(0.9)' : 'scale(1)',
            boxShadow: '0 4px 15px rgba(30, 41, 59, 0.4)'
          }}
          disabled={isSubmitting}
          >
            {isSubmitting ? '⏳ En cours...' : '➕ Ajouter'}
          </button>
          {submitError && (
            <div style={{ marginTop: '0.75rem', color: '#fecaca', fontWeight: '600' }}>
              {submitError}
            </div>
          )}
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

          {event.streams
            .sort((a, b) => {
              // Favoris en premier
              if (a.is_favorite && !b.is_favorite) return -1;
              if (!a.is_favorite && b.is_favorite) return 1;
              return 0;
            })
            .map((stream, index) => (
            <StreamItem 
              key={stream.id} 
              stream={stream} 
              onDelete={del} 
              onPauseStream={handlePauseStream}
              onStartStream={handleStartStream}
              onReactivate={handleReactivateStream}
              onUpdate={handleUpdateStream}
              onToggleFavorite={handleToggleFavorite}
              index={index} 
            />
          ))}
        </div>
      </div>
    </div>
  );
};