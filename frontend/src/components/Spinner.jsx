import React from 'react';

export default function Spinner({ size = 44, label = 'Chargement…', center = true, fullPage = false }) {
  const content = (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 32,
      }}
    >
      <div style={{ position: 'relative', width: size, height: size }}>
        {/* Track */}
        <svg width={size} height={size} viewBox="0 0 50 50" style={{ position: 'absolute', inset: 0 }} aria-hidden="true">
          <circle cx="25" cy="25" r="20" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
        </svg>
        {/* Spinner arc */}
        <svg width={size} height={size} viewBox="0 0 50 50" style={{ position: 'absolute', inset: 0 }} aria-hidden="true">
          <defs>
            <linearGradient id="spinner-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
          </defs>
          <path d="M25 5 a20 20 0 0 1 17.3 10" fill="none" stroke="url(#spinner-grad)" strokeWidth="4" strokeLinecap="round">
            <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="0.85s" repeatCount="indefinite" />
          </path>
        </svg>
      </div>
      {label && (
        <span style={{
          color: 'rgba(255,255,255,0.45)',
          fontSize: 14,
          fontWeight: 500,
          letterSpacing: '0.03em',
        }}>
          {label}
        </span>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(11,15,26,0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}>
        {content}
      </div>
    );
  }

  if (center) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
        {content}
      </div>
    );
  }

  return content;
}
