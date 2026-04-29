import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import bsrqLogo from '../assets/bsrq.png';

export default function Login({ forceAud, forceRedirect }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const audParam = ((forceAud || params.get('aud') || 'client')).toLowerCase();
  const defaultRedirect = audParam === 'client' ? '/events' : '/admin';
  const redirectParam = forceRedirect || params.get('redirect') || defaultRedirect;
  const isAdmin = audParam === 'admin';

  useEffect(() => {
    let mounted = true;
    if (audParam === 'admin') {
      fetch('/api/auth/check?aud=client', { credentials: 'include' })
        .then(res => {
          if (!mounted) return;
          if (res.ok) navigate('/events', { replace: true });
        })
        .catch(() => {});
    }
    return () => { mounted = false; };
  }, [audParam, navigate]);

  useEffect(() => {
    const token = params.get('token');
    if (token) {
      setLoading(true);
      const url = `/api/auth/magic?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent(redirectParam)}`;
      try {
        window.location.replace(url);
      } catch (e) {
        setError('Erreur réseau');
        setLoading(false);
      }
    }
  }, [params, navigate, redirectParam]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, aud: audParam }),
        credentials: 'include'
      });
      if (!res.ok) {
        setError('Mot de passe invalide');
      } else {
        let target = defaultRedirect;
        let wantedAud = audParam === 'client' ? 'client' : 'admin';
        try {
          const data = await res.json();
          wantedAud = (data?.aud === 'client') ? 'client' : 'admin';
          if (wantedAud === 'client') target = forceRedirect || params.get('redirect') || '/events';
          else target = forceRedirect || params.get('redirect') || '/admin';
        } catch {
          target = redirectParam;
        }

        const check = async () => {
          try {
            const chk = await fetch(`/api/auth/check?aud=${encodeURIComponent(wantedAud)}`, {
              credentials: 'include',
              cache: 'no-store',
            });
            return !!chk.ok;
          } catch {
            return false;
          }
        };

        const delays = [0, 250, 750, 1500];
        for (let i = 0; i < delays.length; i++) {
          if (delays[i] > 0) await new Promise(r => setTimeout(r, delays[i]));
          const ok = await check();
          if (ok) { navigate(target, { replace: true }); return; }
        }
        try { window.location.assign(target); } catch { navigate(target, { replace: true }); }
      }
    } catch {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: isAdmin
        ? 'linear-gradient(135deg, #1e1b4b 0%, #0c2164 50%, #6d28d9 100%)'
        : 'linear-gradient(135deg, #0b0f1a 0%, #0f172a 50%, #1e293b 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background orbs */}
      <div style={{
        position: 'absolute',
        width: 400,
        height: 400,
        borderRadius: '50%',
        background: isAdmin
          ? 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)'
          : 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)',
        top: '-100px',
        right: '-100px',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: '50%',
        background: isAdmin
          ? 'radial-gradient(circle, rgba(219,39,119,0.1) 0%, transparent 70%)'
          : 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)',
        bottom: '-80px',
        left: '-80px',
        pointerEvents: 'none',
      }} />

      <div style={{
        width: '100%',
        maxWidth: 420,
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 24,
          padding: '40px 36px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}>
          {/* Logo + badge */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
            marginBottom: 28,
          }}>
            <img
              src={bsrqLogo}
              alt="BSRQ"
              style={{ maxHeight: 48, maxWidth: '100%', objectFit: 'contain' }}
            />
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: isAdmin ? 'rgba(139,92,246,0.15)' : 'rgba(59,130,246,0.12)',
              border: `1px solid ${isAdmin ? 'rgba(139,92,246,0.3)' : 'rgba(59,130,246,0.25)'}`,
              borderRadius: 999,
              padding: '6px 16px',
              fontSize: 12,
              fontWeight: 700,
              color: isAdmin ? '#c4b5fd' : '#93c5fd',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}>
              <span style={{ fontSize: 10 }}>{isAdmin ? '⚙' : '●'}</span>
              {isAdmin ? 'Espace Admin' : 'Espace Client'}
            </div>
          </div>

          <h1 style={{
            margin: '0 0 8px',
            fontSize: '1.75rem',
            fontWeight: 800,
            textAlign: 'center',
            background: isAdmin
              ? 'linear-gradient(90deg, #a78bfa, #818cf8)'
              : 'linear-gradient(90deg, #60a5fa, #34d399)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}>
            Connexion
          </h1>
          <p style={{
            margin: '0 0 28px',
            fontSize: 14,
            color: 'rgba(255,255,255,0.45)',
            textAlign: 'center',
            lineHeight: 1.5,
          }}>
            {isAdmin
              ? 'Entrez votre mot de passe pour accéder au dashboard.'
              : 'Entrez le mot de passe client pour accéder aux pages.'}
          </p>

          <form onSubmit={submit}>
            {/* Password field */}
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mot de passe"
                aria-label="Mot de passe"
                autoFocus
                style={{
                  width: '100%',
                  padding: '14px 48px 14px 16px',
                  background: 'rgba(255,255,255,0.07)',
                  border: `1px solid ${error ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.12)'}`,
                  borderRadius: 12,
                  color: 'white',
                  fontSize: 15,
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  boxSizing: 'border-box',
                }}
                onFocus={e => {
                  e.target.style.borderColor = isAdmin ? 'rgba(139,92,246,0.6)' : 'rgba(59,130,246,0.6)';
                  e.target.style.boxShadow = isAdmin ? '0 0 0 3px rgba(139,92,246,0.15)' : '0 0 0 3px rgba(59,130,246,0.15)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = error ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.12)';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{
                  position: 'absolute',
                  right: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: 16,
                  padding: 4,
                  lineHeight: 1,
                }}
                aria-label={showPassword ? 'Masquer' : 'Afficher'}
              >
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 10,
                color: '#fca5a5',
                fontSize: 14,
                marginBottom: 16,
              }}>
                <span>⚠</span>
                {error}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading || !password}
              style={{
                width: '100%',
                padding: '14px',
                background: loading
                  ? 'rgba(255,255,255,0.08)'
                  : isAdmin
                    ? 'linear-gradient(135deg, #7c3aed, #4f46e5)'
                    : 'linear-gradient(135deg, #2563eb, #0891b2)',
                border: 'none',
                borderRadius: 12,
                color: 'white',
                fontSize: 15,
                fontWeight: 700,
                cursor: loading || !password ? 'not-allowed' : 'pointer',
                opacity: !password && !loading ? 0.6 : 1,
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                letterSpacing: '0.02em',
              }}
            >
              {loading ? (
                <>
                  <svg width={18} height={18} viewBox="0 0 50 50" style={{ flexShrink: 0 }}>
                    <circle cx="25" cy="25" r="20" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="5" />
                    <path d="M25 5 a20 20 0 0 1 0 40" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round">
                      <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="0.8s" repeatCount="indefinite" />
                    </path>
                  </svg>
                  Connexion en cours…
                </>
              ) : (
                <>
                  Se connecter
                  <span style={{ fontSize: 16 }}>→</span>
                </>
              )}
            </button>
          </form>
        </div>

        <p style={{
          textAlign: 'center',
          marginTop: 20,
          fontSize: 12,
          color: 'rgba(255,255,255,0.2)',
        }}>
          BSRQ ViewerHub · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
