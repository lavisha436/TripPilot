import React, { createContext, useState, useEffect } from 'react';
import api from '../api/axios';

/**
 * 🔒 AuthContext: React Context object holding global authentication state.
 */
export const AuthContext = createContext(null);

/**
 * 🛡️ AuthProvider: Provider component that wraps the application.
 * Manages user profile data and initial authentication loading status.
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await api.get('/auth/me');
        if (response.data && response.data.success && response.data.data?.user) {
          setUser(response.data.data.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        // Normal unauthenticated state or error: set user to null quietly without showing error alert
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
