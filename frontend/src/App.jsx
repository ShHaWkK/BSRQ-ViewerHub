import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Admin from './pages/Admin.jsx';
import AdminGate from './components/AdminGate.jsx';
import EventDetail from './pages/EventDetail.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ClientDashboard from './pages/ClientDashboard.jsx';
import LiveViewer from './pages/LiveViewer.jsx';
import Login from './pages/Login.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import ClientHome from './pages/ClientHome.jsx';
import './styles.css';
import ErrorBoundary from './components/ErrorBoundary.jsx';

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<ProtectedRoute aud="client"><ClientHome /></ProtectedRoute>} />
          <Route path="/events" element={<ProtectedRoute aud="client"><ClientHome /></ProtectedRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<AdminGate />} />
          <Route path="/admin/event/:id" element={<ProtectedRoute aud="admin"><EventDetail /></ProtectedRoute>} />
          <Route path="/event/:id/dashboard" element={<ProtectedRoute aud="admin"><Dashboard /></ProtectedRoute>} />
          <Route path="/event/:id/stats" element={<ProtectedRoute aud="client"><Dashboard /></ProtectedRoute>} />
          <Route path="/event/:id/live" element={<ProtectedRoute aud="client"><LiveViewer /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/events" replace />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
