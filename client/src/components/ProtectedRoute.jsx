import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';

/**
 * 🛡️ ProtectedRoute Component: Guards private routes from unauthenticated access.
 * Displays loading status during auth state resolution, redirects unauthenticated users to /login,
 * and renders protected child components for authenticated users.
 */
export default function ProtectedRoute({ children }) {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="landing-container">
        <div className="glass-card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p className="hero-subtitle">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
