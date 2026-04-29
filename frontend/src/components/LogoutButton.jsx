import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function LogoutButton({
  className = 'toolbar-link',
  redirect = '/login?aud=client',
  children = 'Déconnexion',
  style,
}) {
  const navigate = useNavigate();

  const onClick = async (e) => {
    e.preventDefault();
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
      });
    } catch {}
    // Forcer une navigation plein page pour assurer la prise en compte du cookie effacé
    try { window.location.replace(redirect); }
    catch { navigate(redirect, { replace: true }); }
  };

  return (
    <button type="button" onClick={onClick} className={className} style={style}>
      {children}
    </button>
  );
}

