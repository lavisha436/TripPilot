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
      <div className="tp-auth-loading-screen" aria-label="Loading authentication status">
        <div className="tp-auth-loading-spinner" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
