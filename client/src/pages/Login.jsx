import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios.js';
import { AuthContext } from '../context/AuthContext.jsx';
import {
  Mail,
  Lock,
  ArrowRight,
  ArrowLeft,
  Compass,
  Bookmark,
  Globe,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

/**
 * 🔒 Login Page Component: Authenticates user credentials via TripPilot backend API
 * Styled in the TripPilot light warm travel aesthetic.
 */
export default function Login() {
  const { setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/auth/login', { email, password });

      setSuccess(response.data.message || 'User logged in successfully.');
      setEmail('');
      setPassword('');

      const loggedInUser = response.data?.data?.user;
      if (loggedInUser) {
        setUser(loggedInUser);
      }

      navigate('/dashboard');
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tp-login-page">
      {/* 🧭 Subtle travel backdrop decorative accents */}
      <div className="tp-login-bg-decor" aria-hidden="true">
        <div className="tp-login-decor-glow tp-login-glow-1" />
        <div className="tp-login-decor-glow tp-login-glow-2" />
        <svg className="tp-login-route-svg" viewBox="0 0 1440 900" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M-40 220 C 280 120, 520 400, 860 220 C 1140 80, 1360 260, 1500 180"
            stroke="#f97316"
            strokeWidth="1.2"
            strokeDasharray="6 8"
            strokeOpacity="0.18"
          />
          <path
            d="M-60 620 C 340 500, 720 780, 1100 560 C 1320 440, 1420 580, 1520 520"
            stroke="#ea580c"
            strokeWidth="1"
            strokeDasharray="5 7"
            strokeOpacity="0.12"
          />
          <circle cx="860" cy="220" r="3.5" fill="#f97316" fillOpacity="0.3" />
          <circle cx="1100" cy="560" r="3" fill="#ea580c" fillOpacity="0.25" />
        </svg>
      </div>

      <div className="tp-login-container">
        {/* ========================================================= */}
        {/* 1. LEFT SIDE: TripPilot Travel Welcome / Brand Area       */}
        {/* ========================================================= */}
        <div className="tp-login-welcome-panel">
          {/* Logo & Tagline */}
          <Link to="/" className="tp-brand" title="TripPilot Home">
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

          {/* Heading & Intro */}
          <div className="tp-login-intro">
            <span className="tp-login-eyebrow">WELCOME BACK</span>
            <h1 className="tp-login-welcome-title">Continue Your Journey with TripPilot</h1>
            <p className="tp-login-welcome-desc">
              Log in to access your personalized travel plans, save destinations, and explore more of the world.
            </p>
          </div>

          {/* 3 Benefit Rows */}
          <div className="tp-login-benefits">
            <div className="tp-login-benefit-item">
              <div className="tp-login-benefit-icon-wrap">
                <Compass size={18} className="tp-login-benefit-icon" />
              </div>
              <div className="tp-login-benefit-content">
                <h4 className="tp-login-benefit-title">Plan smarter</h4>
                <p className="tp-login-benefit-desc">Get personalized recommendations</p>
              </div>
            </div>

            <div className="tp-login-benefit-item">
              <div className="tp-login-benefit-icon-wrap">
                <Bookmark size={18} className="tp-login-benefit-icon" />
              </div>
              <div className="tp-login-benefit-content">
                <h4 className="tp-login-benefit-title">Save your favorites</h4>
                <p className="tp-login-benefit-desc">Keep dream destinations handy</p>
              </div>
            </div>

            <div className="tp-login-benefit-item">
              <div className="tp-login-benefit-icon-wrap">
                <Globe size={18} className="tp-login-benefit-icon" />
              </div>
              <div className="tp-login-benefit-content">
                <h4 className="tp-login-benefit-title">Explore more</h4>
                <p className="tp-login-benefit-desc">Turn your travel ideas into real trips</p>
              </div>
            </div>
          </div>

          {/* Subtle Decorative Mountain Silhouette */}
          <div className="tp-login-landscape-accent" aria-hidden="true">
            <svg viewBox="0 0 380 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="tp-login-mountains-svg">
              <path
                d="M0 60 L45 32 L95 50 L160 18 L225 45 L285 24 L340 46 L380 34 L380 60 Z"
                fill="rgba(234, 88, 12, 0.05)"
              />
              <path
                d="M20 60 L80 38 L140 52 L210 28 L270 48 L330 35 L380 50 L380 60 Z"
                fill="rgba(234, 88, 12, 0.04)"
              />
            </svg>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. RIGHT SIDE: Clean Login Form Card                      */}
        {/* ========================================================= */}
        <div className="tp-login-card-wrapper">
          <div className="tp-login-card">
            <div className="tp-login-card-header">
              <h2 className="tp-login-card-title">Welcome to TripPilot</h2>
              <p className="tp-login-card-subtitle">Login to your account</p>
            </div>

            {error && (
              <div className="tp-login-alert tp-login-alert-error" role="alert">
                <AlertCircle size={16} className="tp-login-alert-icon" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="tp-login-alert tp-login-alert-success" role="alert">
                <CheckCircle2 size={16} className="tp-login-alert-icon" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="tp-login-form">
              <div className="tp-login-field-group">
                <label htmlFor="email" className="tp-login-label">
                  Email Address
                </label>
                <div className="tp-login-input-wrap">
                  <Mail size={17} className="tp-login-input-icon" />
                  <input
                    id="email"
                    type="email"
                    className="tp-login-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="tp-login-field-group">
                <label htmlFor="password" className="tp-login-label">
                  Password
                </label>
                <div className="tp-login-input-wrap">
                  <Lock size={17} className="tp-login-input-icon" />
                  <input
                    id="password"
                    type="password"
                    className="tp-login-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="tp-login-submit-btn"
                disabled={loading}
              >
                <span>{loading ? 'Logging in...' : 'Login'}</span>
                {!loading && <ArrowRight size={17} className="tp-login-btn-arrow" />}
              </button>
            </form>

            <div className="tp-login-footer">
              <p className="tp-login-register-text">
                Don't have an account?{' '}
                <Link to="/register" className="tp-login-link">
                  Register here
                </Link>
              </p>

              <div className="tp-login-back-wrap">
                <Link to="/" className="tp-login-back-btn">
                  <ArrowLeft size={15} />
                  <span>Back to Home</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
