import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import api from '../api/axios.js';
import { formatDateToDisplay } from '../utils/dateUtils.js';
import NotificationBell from '../components/NotificationBell.jsx';
import {
  MapPin,
  Calendar,
  ArrowRight,
  Compass,
  Mail,
  User,
  MessageSquare,
  Check,
  X,
  Plus,
  Search,
  Users,
  Heart,
  Briefcase
} from 'lucide-react';

/**
 * ✈️ Dashboard Page Component: Fetches and displays user's trips & pending invitations.
 */
export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Pending Invitations States
  const [invitations, setInvitations] = useState([]);
  const [invitationsLoading, setInvitationsLoading] = useState(true);
  const [invitationsError, setInvitationsError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState('');
  const [actionError, setActionError] = useState('');

  // Calculate unique destination count safely
  const uniqueDestinationsCount = new Set(
    trips.map((t) => t.destination?.trim().toLowerCase()).filter(Boolean)
  ).size;

  // Calculate total calendar days traveled across COMPLETED trips only
  const daysTraveledCount = trips.reduce((acc, trip) => {
    // Only count trips whose status is COMPLETED
    if (trip.status?.toUpperCase() !== 'COMPLETED') {
      return acc;
    }

    // Safely check for missing dates
    if (!trip.startDate || !trip.endDate) {
      return acc;
    }

    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);

    // Validate that dates are valid Date instances
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return acc;
    }

    // Calculate calendar days difference (difference + 1) using UTC midnight to avoid DST/timezone drift
    const utcStart = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
    const utcEnd = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
    const diffDays = Math.round((utcEnd - utcStart) / (1000 * 60 * 60 * 24));

    if (diffDays >= 0) {
      return acc + diffDays + 1;
    }

    return acc;
  }, 0);

  const fetchTrips = async () => {
    try {
      const response = await api.get('/trips');
      setTrips(response.data?.data?.trips || []);
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || 'Failed to fetch trips. Please try again later.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvitations = async () => {
    setInvitationsLoading(true);
    setInvitationsError('');
    try {
      const response = await api.get('/trips/invitations');
      setInvitations(response.data?.data?.invitations || []);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to fetch pending trip invitations.';
      setInvitationsError(msg);
    } finally {
      setInvitationsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
    fetchInvitations();
  }, []);

  // Handle Accept Invitation
  const handleAcceptInvitation = async (membershipId) => {
    setActionLoadingId(membershipId);
    setActionError('');
    setActionSuccessMessage('');

    try {
      await api.patch(`/trips/members/${membershipId}/accept`);
      setActionSuccessMessage('✓ Trip invitation accepted! The trip workspace is now active on your dashboard.');

      // Remove invitation from pending list
      setInvitations((prev) => prev.filter((inv) => inv._id !== membershipId));

      // Refresh user's trips list so the accepted trip immediately appears
      fetchTrips();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to accept trip invitation.';
      setActionError(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Decline Invitation
  const handleDeclineInvitation = async (membershipId) => {
    setActionLoadingId(membershipId);
    setActionError('');
    setActionSuccessMessage('');

    try {
      await api.patch(`/trips/members/${membershipId}/decline`);
      setActionSuccessMessage('✓ Trip invitation declined.');

      // Remove invitation from pending list
      setInvitations((prev) => prev.filter((inv) => inv._id !== membershipId));
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to decline trip invitation.';
      setActionError(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="tp-dashboard-wrapper">
      <div className="tp-dashboard-container-inner">
        {/* ========================================================= */}
        {/* 🧭 1. TOP BAR (Brand Logo & User Profile) */}
        {/* ========================================================= */}
        <div className="tp-dashboard-top-bar">
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

          <div className="tp-dashboard-top-right">
            <NotificationBell />
            {user && (
              <Link to="/profile" className="tp-dashboard-user-pill" title="View Profile">
                <div className="tp-dashboard-avatar">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="tp-dashboard-username">
                  {user?.name || 'Traveler'}
                </span>
              </Link>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* 🌅 2. HERO WELCOME BANNER ("Where to next?") */}
        {/* ========================================================= */}
        <div className="tp-dashboard-hero-banner">
          {/* Scenic Panoramic Travel Landscape */}
          <div className="tp-dashboard-hero-scenic" />

          {/* Left Hero Content */}
          <div className="tp-dashboard-hero-content">
            <div className="tp-dashboard-hero-greeting">
              Hello, {user?.name || 'Traveler'}! <span className="tp-wave-emoji">👋</span>
            </div>
            <h1 className="tp-dashboard-hero-heading">Where to next?</h1>
            <p className="tp-dashboard-hero-subtitle">
              Your next adventure is just a plan away.
            </p>

            <div className="tp-dashboard-hero-actions">
              <Link to="/dashboard/create" className="tp-btn-banner-create">
                <Plus size={16} /> Create a New Trip
              </Link>
              <Link to="/dashboard/discover-destinations" className="tp-btn-banner-explore">
                <Search size={15} /> Explore Destinations
              </Link>
            </div>
          </div>

          {/* Floating script typography on scenic right side */}
          <div className="tp-banner-badge-script">
            <span className="tp-banner-script-line">Good</span>
            <span className="tp-banner-script-line">Trips</span>
            <span className="tp-banner-script-line">Better</span>
            <span className="tp-banner-script-line">Stories</span>
            <svg viewBox="0 0 110 14" fill="none" className="tp-banner-script-curve">
              <path d="M3 10C35 3 75 3 107 9" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 📊 3. FOUR QUICK STATS CARDS */}
        {/* ========================================================= */}
        <div className="tp-dashboard-stats-row">
          {/* Card 1: Total Trips (Warm Peach) */}
          <div className="tp-dashboard-stat-card-v2 tp-stat-card-trips">
            <div className="tp-stat-icon-box tp-stat-icon-trips">
              <Briefcase size={20} />
            </div>
            <div className="tp-stat-text-group">
              <div className="tp-stat-number">{trips.length}</div>
              <div className="tp-stat-title">Total Trips</div>
              <div className="tp-stat-subtitle">Journeys planned</div>
            </div>
          </div>

          {/* Card 2: Destinations (Light Sky Blue) */}
          <div className="tp-dashboard-stat-card-v2 tp-stat-card-destinations">
            <div className="tp-stat-icon-box tp-stat-icon-destinations">
              <MapPin size={20} />
            </div>
            <div className="tp-stat-text-group">
              <div className="tp-stat-number">{uniqueDestinationsCount}</div>
              <div className="tp-stat-title">Destinations</div>
              <div className="tp-stat-subtitle">Places to explore</div>
            </div>
          </div>

          {/* Card 3: Pending Invitations (Fresh Mint Green) */}
          <div className="tp-dashboard-stat-card-v2 tp-stat-card-invites">
            <div className="tp-stat-icon-box tp-stat-icon-invites">
              <Mail size={20} />
            </div>
            <div className="tp-stat-text-group">
              <div className="tp-stat-number">{invitations.length}</div>
              <div className="tp-stat-title">Pending Invitations</div>
              <div className="tp-stat-subtitle">Awaiting response</div>
            </div>
          </div>

          {/* Card 4: Days Traveled (Soft Rose/Pink) */}
          <div className="tp-dashboard-stat-card-v2 tp-stat-card-days">
            <div className="tp-stat-icon-box tp-stat-icon-days">
              <Heart size={20} />
            </div>
            <div className="tp-stat-text-group">
              <div className="tp-stat-number">{daysTraveledCount}</div>
              <div className="tp-stat-title">Days Traveled</div>
              <div className="tp-stat-subtitle">Memories made</div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* ✈️ MY TRIPS SECTION */}
        {/* ========================================================= */}
        <div className="tp-workspaces-section-header">
          <div className="tp-my-trips-heading-wrap">
            <div className="tp-my-trips-eyebrow-wrap">
              <span className="tp-my-trips-eyebrow-line" />
              <span className="tp-my-trips-eyebrow">YOUR JOURNEYS</span>
            </div>
            <h2 className="tp-workspaces-title">My Trips</h2>
            <p className="tp-workspaces-subtitle">
              Your planned journeys, ready whenever you are.
            </p>
          </div>
        </div>

        {loading && (
          <div className="placeholder-box">
            <p>Loading trips...</p>
          </div>
        )}

        {!loading && error && (
          <div className="alert alert-error">{error}</div>
        )}

        {!loading && !error && trips.length === 0 && (
          <div className="tp-dashboard-empty-state">
            <div className="tp-dashboard-empty-icon">🗺️</div>
            <h3 className="tp-dashboard-empty-title">
              No Trips Yet
            </h3>
            <p className="tp-dashboard-empty-text">
              Start planning your next adventure with TripPilot.
            </p>
            <Link to="/dashboard/create" className="tp-btn-create-trip">
              + Create Your First Trip
            </Link>
          </div>
        )}

        {!loading && !error && trips.length > 0 && (
          <div className="tp-dashboard-grid">
            {trips.map((trip) => (
              <Link
                key={trip._id}
                to={`/dashboard/trip/${trip._id}`}
                className="tp-dashboard-card"
              >
                <div className="tp-dashboard-card-header">
                  <h3 className="tp-dashboard-card-title">{trip.title}</h3>
                  <span className="tp-dashboard-status-badge">
                    {trip.status || 'Active'}
                  </span>
                </div>

                <div className="tp-dashboard-card-location">
                  <MapPin size={14} />
                  <span>{trip.destination}</span>
                </div>

                <div className="tp-dashboard-card-dates">
                  <Calendar size={14} />
                  <span>
                    {formatDateToDisplay(trip.startDate)} – {formatDateToDisplay(trip.endDate)}
                  </span>
                </div>

                <div className="tp-dashboard-card-divider" />

                <div className="tp-dashboard-card-footer">
                  <span className="tp-dashboard-card-link">
                    View Workspace <ArrowRight size={13} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
        {/* ========================================================= */}
        {/* 📩 PENDING TRIP INVITATIONS SECTION */}
        {/* ========================================================= */}
        <section className="tp-invitations-card-section">
          {/* Subtle Watermark Landscape Illustration (Right Side 25-35%) */}
          <div className="tp-invitations-backdrop-watermark" aria-hidden="true">
            <img
              src="/dashboard-invitations-scenic.svg"
              alt=""
              className="tp-invitations-watermark-img"
            />
          </div>

          <div className="tp-invitations-content-wrap">
            <div className="tp-invitations-section-header">
              <div>
                <div className="tp-invitations-eyebrow-wrap">
                  <span className="tp-invitations-eyebrow-line" />
                  <span className="tp-invitations-eyebrow">INVITATIONS</span>
                </div>
                <div className="tp-invitations-title-group">
                  <h2 className="tp-invitations-title">Pending Trip Invitations</h2>
                  {invitations.length > 0 && (
                    <span className="tp-invitations-count-badge">
                      {invitations.length} Pending
                    </span>
                  )}
                </div>
                <p className="tp-invitations-subtitle">
                  Trips you've been invited to join.
                </p>
              </div>
            </div>

            {actionSuccessMessage && (
              <div className="alert alert-success" style={{ marginBottom: '14px', position: 'relative', zIndex: 2 }}>
                {actionSuccessMessage}
              </div>
            )}

            {actionError && (
              <div className="alert alert-error" style={{ marginBottom: '14px', position: 'relative', zIndex: 2 }}>
                {actionError}
              </div>
            )}

            {invitationsLoading && (
              <div className="placeholder-box" style={{ position: 'relative', zIndex: 2 }}>
                <p>Loading invitations...</p>
              </div>
            )}

            {!invitationsLoading && invitationsError && (
              <div className="alert alert-error" style={{ marginBottom: 0, position: 'relative', zIndex: 2 }}>
                {invitationsError}
              </div>
            )}

            {!invitationsLoading && !invitationsError && invitations.length === 0 && (
              <div className="tp-invitations-empty-card">
                <div className="tp-invitations-empty-icon">
                  <Mail size={20} />
                </div>
                <div className="tp-invitations-empty-text-group">
                  <h3 className="tp-invitations-empty-title">No Pending Invitations</h3>
                  <p className="tp-invitations-empty-text">You're all caught up.</p>
                </div>
              </div>
            )}

            {!invitationsLoading && !invitationsError && invitations.length > 0 && (
              <div className="tp-invitations-list">
              {invitations.map((inv) => {
                const tripInfo = inv.tripId;
                const inviter = inv.invitedBy;
                const isProcessing = actionLoadingId === inv._id;

                return (
                  <div key={inv._id} className="tp-invitation-card">
                    {/* Left Column: Icon + Trip & Inviter Information */}
                    <div className="tp-invitation-main">
                      <div className="tp-invitation-icon-wrap">
                        <Compass size={18} />
                      </div>

                      <div className="tp-invitation-details">
                        <div className="tp-invitation-title-row">
                          <h3 className="tp-invitation-title">
                            {tripInfo?.title || 'Trip Workspace'}
                          </h3>
                          {inv.role && (
                            <span className="tp-invitation-role-badge">
                              Role: {inv.role}
                            </span>
                          )}
                          {inv.createdAt && (
                            <span className="tp-invitation-date-received">
                              {formatDateToDisplay(inv.createdAt)}
                            </span>
                          )}
                        </div>

                        <div className="tp-invitation-meta">
                          {tripInfo?.destination && (
                            <div className="tp-invitation-meta-item">
                              <MapPin size={14} />
                              <span>{tripInfo.destination}</span>
                            </div>
                          )}
                          {tripInfo?.startDate && tripInfo?.endDate && (
                            <div className="tp-invitation-meta-item">
                              <Calendar size={14} />
                              <span>
                                {formatDateToDisplay(tripInfo.startDate)} – {formatDateToDisplay(tripInfo.endDate)}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="tp-invitation-inviter">
                          <User size={13} />
                          <span>
                            Invited by <strong>{inviter?.name || 'User'}</strong>
                            {inviter?.email && ` (${inviter.email})`}
                          </span>
                        </div>

                        {inv.inviteMessage && (
                          <div className="tp-invitation-message">
                            <MessageSquare size={13} />
                            <p>"{inv.inviteMessage}"</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Actions */}
                    <div className="tp-invitation-actions">
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleDeclineInvitation(inv._id)}
                        className="tp-btn-decline"
                      >
                        <X size={14} /> {isProcessing ? 'Processing...' : 'Decline'}
                      </button>
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleAcceptInvitation(inv._id)}
                        className="tp-btn-accept"
                      >
                        <Check size={14} /> {isProcessing ? 'Processing...' : 'Accept'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          </div>
        </section>

        {/* Back to Home Navigation */}
        <div className="tp-invitations-bottom-nav">
          <Link to="/" className="tp-invitations-back-link">
            Back to Home <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
