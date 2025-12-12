import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export default function ProtectedRoute({ children, aud = 'admin' }) {
  const [state, setState] = useState('pending');
  const location = useLocation();

  useEffect(() => {
    let mounted = true;
    const url = `/api/auth/check?aud=${encodeURIComponent(aud)}`;
    fetch(url, { credentials: 'same-origin' })
      .then(res => {
        if (!mounted) return;
        setState(res.ok ? 'ok' : 'nope');
      })
      .catch(() => mounted && setState('nope'));
    return () => { mounted = false; };
  }, [aud]);

  if (state === 'pending') return <div style={{ padding: 24 }}>Chargement…</div>;
  if (state === 'nope') {
    const redirect = `${location.pathname}${location.search || ''}`;
    const loginUrl = `/login?aud=${encodeURIComponent(aud)}&redirect=${encodeURIComponent(redirect)}`;
    window.location.href = loginUrl;
    return null;
  }
  return children;
}
