import React from 'react';
import { Link } from 'react-router-dom';

/**
 * 🏠 Home Page Component: Displays landing UI with primary navigation links.
 */
export default function Home() {
  return (
    <div className="landing-container" style={{ padding: '40px 20px' }}>
      <div className="glass-card" style={{ maxWidth: '1200px', width: '100%' }}>
        <div className="badge">
          <span className="sparkle">✨</span> Next-Gen Travel Assistant
        </div>
        <h1 className="hero-title">TripPilot</h1>
        <p className="hero-subtitle">AI-Powered Travel Planning</p>
        
        <div className="features-preview">
          <div className="feature-pill">Smart Itineraries</div>
          <div className="feature-pill">Live Weather Sync</div>
          <div className="feature-pill">Budget Analytics</div>
        </div>

        <div className="nav-actions">
          <Link to="/login" className="btn btn-secondary">Login</Link>
          <Link to="/register" className="btn btn-primary">Register</Link>
          <Link to="/dashboard" className="btn btn-outline">Dashboard</Link>
        </div>
      </div>
    </div>
  );
}
