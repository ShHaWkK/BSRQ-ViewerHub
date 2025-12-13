import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export default function ProtectedRoute({ children, aud = 'admin' }) {
  const [state, setState] = useState('pending');
  const location = useLocation();

  useEffect(() => {
    let mounted = true;
    const url = `/api/auth/check?aud=${encodeURIComponent(aud)}`;
    const attempt = async () => {
      // Petit retry en cas de panne transitoire du backend
      const tries = [0, 350, 1000];
      for (let i = 0; i < tries.length; i++) {
        try {
          const res = await fetch(url, { credentials: 'same-origin' });
          if (!mounted) return;
          if (res.ok) { setState('ok'); return; }
        } catch {}
        if (!mounted) return;
        if (i < tries.length - 1) await new Promise(r => setTimeout(r, tries[i+1]));
      }
      if (mounted) setState('nope');
    };
    attempt();
    return () => { mounted = false; };
  }, [aud]);

  if (state === 'pending') return <div style={{ padding: 24 }}>Chargement…</div>;
  if (state === 'nope') {
    const redirect = `${location.pathname}${location.search || ''}`;
    const loginUrl = aud === 'admin'
      ? `/admin?redirect=${encodeURIComponent(redirect)}`
      : `/login?aud=${encodeURIComponent(aud)}&redirect=${encodeURIComponent(redirect)}`;
    window.location.href = loginUrl;
    return null;
  }
  return children;
}
