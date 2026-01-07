import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Login from '../pages/Login.jsx';
import Admin from '../pages/Admin.jsx';

export default function AdminGate() {
  const [adminOk, setAdminOk] = useState(null);
  const [clientOk, setClientOk] = useState(null);
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetch('/api/auth/check?aud=admin', { credentials: 'include' }),
      fetch('/api/auth/check?aud=client', { credentials: 'include' })
    ])
      .then(([adminRes, clientRes]) => {
        if (!mounted) return;
        setAdminOk(!!adminRes.ok);
        setClientOk(!!clientRes.ok);
      })
      .catch(() => {
        if (!mounted) return;
        setAdminOk(false);
        setClientOk(false);
      });
    return () => { mounted = false; };
  }, []);

  if (adminOk === null || clientOk === null) return <div style={{ padding: 24 }}>Chargement…</div>;
  if (adminOk) return <Admin />;
  // Autoriser le login admin même si une session client existe (pas de redirection automatique)
  const redirect = params.get('redirect') || '/admin';
  return <Login forceAud="admin" forceRedirect={redirect} />;
}
