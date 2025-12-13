import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function Login({ forceAud, forceRedirect }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const audParam = ((forceAud || params.get('aud') || 'client')).toLowerCase();
  const defaultRedirect = audParam === 'client' ? '/events' : '/admin';
  const redirectParam = forceRedirect || params.get('redirect') || defaultRedirect;

  // Masquer le login admin aux sessions client
  useEffect(() => {
    let mounted = true;
    if (audParam === 'admin') {
      fetch('/api/auth/check?aud=client', { credentials: 'same-origin' })
        .then(res => {
          if (!mounted) return;
          if (res.ok) {
            navigate('/events', { replace: true });
          }
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
      fetch(url, { credentials: 'same-origin' })
        .then(res => {
          if (res.redirected) {
            navigate(redirectParam, { replace: true });
            return;
          }
          if (res.ok) {
            navigate(redirectParam, { replace: true });
          } else {
            setError('Lien invalide ou expiré');
          }
        })
        .catch(() => setError('Erreur réseau'))
        .finally(() => setLoading(false));
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
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError('Mot de passe invalide');
      } else {
        // le backend renvoie { ok: true, aud }
        let target = defaultRedirect;
        try {
          const data = await res.json();
          if (data?.aud === 'client') target = forceRedirect || params.get('redirect') || '/events';
          else target = forceRedirect || params.get('redirect') || '/admin';
        } catch {
          target = redirectParam;
        }
        navigate(target, { replace: true });
      }
    } catch {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-bg">
      <div className="container container--narrow center-area">
        <div className="card" style={{ width: '100%' }}>
          <h1 className="gradient-text" style={{ margin: 0 }}>
            {audParam === 'client' ? 'Accès client' : 'Accès admin'}
          </h1>
          <p className="muted" style={{ marginTop: 8 }}>
            {audParam === 'client'
              ? 'Entrez le mot de passe client pour accéder aux pages publiques.'
              : 'Entrez le mot de passe pour accéder au dashboard.'}
          </p>
          <form onSubmit={submit} style={{ marginTop: 12 }}>
            <input
              className="input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mot de passe"
              aria-label="Mot de passe"
              style={{ marginBottom: 12 }}
            />
            <button type="submit" disabled={loading} className="btn btn--primary btn--block">
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
          {error && <p className="error-text">{error}</p>}
        </div>
      </div>
    </div>
  );
}
