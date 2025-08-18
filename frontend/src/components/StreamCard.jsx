import React from 'react';

export default function StreamCard({ label, current, online }) {
  return (
    <div className="card stream-card">
      <h3>{label}</h3>
      <p style={{ color: online ? 'lime' : 'gray' }}>{online ? 'en direct' : 'hors-ligne'}</p>
      <div style={{ fontSize: '2rem' }}>{current}</div>
    </div>
  );
}
