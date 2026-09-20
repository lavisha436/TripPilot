import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import api from '../api/axios.js';
import { Compass, Menu, X, ArrowRight, LogOut } from 'lucide-react';

/**
 * 🧭 Navbar Component: Clean landing page navigation header.
 */
export default function Navbar() {
  const { user, setUser } = useContext(AuthContext);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setMobileMenuOpen(false);
    }
  };

  return (
    <header className="tp-navbar">
      <div className="tp-navbar-container">
        {/* Brand Logo */}
        <Link to="/" className="tp-brand">
          <div className="tp-brand-icon-plane">
            <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="tp-plane-svg">
              {/* Left wing body */}
              <path d="M2.5 13L25.5 2.5L14 25.5L10.5 16L2.5 13Z" fill="#1e293b" />
              {/* Right shaded wing */}
              <path d="M10.5 16L25.5 2.5L14 25.5L10.5 16Z" fill="#0f172a" />
              {/* Center crisp crease */}
              <path d="M25.5 2.5L10.5 16" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
              {/* Under-fold flap */}
              <path d="M10.5 16V21.5L13.5 18.5" fill="#334155" stroke="#334155" strokeWidth="1" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="tp-brand-text-group">
            <span className="tp-brand-name">TripPilot</span>
            <span className="tp-brand-tagline">Plan • Explore • Belong</span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="tp-nav-links">
          <button type="button" onClick={() => scrollToSection('capabilities')} className="tp-nav-link">
            Features
          </button>
          <button type="button" onClick={() => scrollToSection('how-it-works')} className="tp-nav-link">
            How It Works
          </button>
          <button type="button" onClick={() => scrollToSection('explore')} className="tp-nav-link">
            Destinations
          </button>
        </nav>

        {/* Action Buttons */}
        <div className="tp-nav-actions">
          {user ? (
            <>
              <Link to="/dashboard" className="tp-nav-btn-cta">
                Dashboard <ArrowRight size={15} />
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="tp-nav-btn-secondary"
              >
                <LogOut size={15} /> Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="tp-nav-btn-login">
                Login
              </Link>
              <Link to="/register" className="tp-nav-btn-cta">
                Start Planning <ArrowRight size={15} />
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          className="tp-mobile-toggle"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="tp-mobile-menu">
          <button type="button" onClick={() => scrollToSection('capabilities')} className="tp-mobile-link">
            Features
          </button>
          <button type="button" onClick={() => scrollToSection('how-it-works')} className="tp-mobile-link">
            How It Works
          </button>
          <button type="button" onClick={() => scrollToSection('explore')} className="tp-mobile-link">
            Destinations
          </button>
          <div className="tp-mobile-actions">
            {user ? (
              <>
                <Link to="/dashboard" className="tp-nav-btn-cta" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setMobileMenuOpen(false)}>
                  Dashboard <ArrowRight size={15} />
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="tp-nav-btn-secondary"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <LogOut size={15} /> Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="tp-nav-btn-login" style={{ width: '100%', textAlign: 'center' }} onClick={() => setMobileMenuOpen(false)}>
                  Login
                </Link>
                <Link to="/register" className="tp-nav-btn-cta" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setMobileMenuOpen(false)}>
                  Start Planning <ArrowRight size={15} />
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
