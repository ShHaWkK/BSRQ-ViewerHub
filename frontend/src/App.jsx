import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Admin from './pages/Admin.jsx';
import EventDetail from './pages/EventDetail.jsx';
import Dashboard from './pages/Dashboard.jsx';
import LiveViewer from './pages/LiveViewer.jsx';
import Login from './pages/Login.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import ClientHome from './pages/ClientHome.jsx';
import './styles.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProtectedRoute aud="client"><ClientHome /></ProtectedRoute>} />
        <Route path="/events" element={<ProtectedRoute aud="client"><ClientHome /></ProtectedRoute>} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<ProtectedRoute aud="admin"><Admin /></ProtectedRoute>} />
        <Route path="/admin/event/:id" element={<ProtectedRoute aud="admin"><EventDetail /></ProtectedRoute>} />
        <Route path="/event/:id/dashboard" element={<ProtectedRoute aud="admin"><Dashboard /></ProtectedRoute>} />
        <Route path="/event/:id/live" element={<ProtectedRoute aud="client"><LiveViewer /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/events" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
