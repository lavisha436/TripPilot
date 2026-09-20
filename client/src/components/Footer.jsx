import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, CloudSun, Wallet, Heart } from 'lucide-react';

/**
 * ⚓ Footer Component: Clean, light editorial travel footer for TripPilot AI.
 */
export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="tp-footer">
      <div className="tp-footer-container">
        {/* Brand Column */}
        <div className="tp-footer-brand">
          <Link to="/" className="tp-brand" style={{ marginBottom: '14px' }}>
            <div className="tp-brand-icon-plane">
              <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="tp-plane-svg">
                <path d="M2.5 13L25.5 2.5L14 25.5L10.5 16L2.5 13Z" fill="#1e293b" />
                <path d="M10.5 16L25.5 2.5L14 25.5L10.5 16Z" fill="#0f172a" />
                <path d="M25.5 2.5L10.5 16" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
                <path d="M10.5 16V21.5L13.5 18.5" fill="#ea580c" stroke="#ea580c" strokeWidth="1" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="tp-brand-text-group">
              <span className="tp-brand-name">TripPilot</span>
              <span className="tp-brand-tagline">Plan • Explore • Belong</span>
            </div>
          </Link>
          <p className="tp-footer-brand-desc">
            Intelligent travel command center for tailored itineraries, live weather advisories, smart budget planning, and seamless group collaboration.
          </p>
        </div>

        {/* Capabilities Column */}
        <div className="tp-footer-column">
          <h4>Capabilities</h4>
          <ul>
            <li><a href="#capabilities">Smart Itinerary Generation</a></li>
            <li><a href="#capabilities">Live Weather Sync</a></li>
            <li><a href="#capabilities">Smart Budget Planning</a></li>
            <li><a href="#capabilities">Group Expenses & Settlement</a></li>
          </ul>
        </div>

        {/* Navigation Column */}
        <div className="tp-footer-column">
          <h4>Navigation</h4>
          <ul>
            <li><Link to="/login">Login</Link></li>
            <li><Link to="/register">Create Account</Link></li>
            <li><Link to="/dashboard">Trip Dashboard</Link></li>
            <li><Link to="/dashboard/discover-destinations">Explore Destinations</Link></li>
          </ul>
        </div>

        {/* Product Values Column */}
        <div className="tp-footer-column">
          <h4>TripPilot</h4>
          <ul className="tp-footer-values-list">
            <li>
              <div className="tp-footer-icon-badge">
                <Sparkles size={14} />
              </div>
              <span>Smart trip planning</span>
            </li>
            <li>
              <div className="tp-footer-icon-badge">
                <CloudSun size={14} />
              </div>
              <span>Weather-aware itineraries</span>
            </li>
            <li>
              <div className="tp-footer-icon-badge">
                <Wallet size={14} />
              </div>
              <span>Smarter budget management</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="tp-footer-bottom">
        <div className="tp-footer-bottom-content">
          <p>© {currentYear} TripPilot. All rights reserved.</p>
          <p className="tp-footer-bottom-note">
            Made with <Heart size={13} className="tp-heart-icon" /> for travelers worldwide.
          </p>
        </div>
      </div>
    </footer>
  );
}
