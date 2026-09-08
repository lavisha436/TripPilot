import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios.js';
import { formatDateToDisplay } from '../utils/dateUtils.js';
import NotificationBell from '../components/NotificationBell.jsx';

/**
 * ✈️ Dashboard Page Component: Fetches and displays user's trips & pending invitations.
 */
export default function Dashboard() {
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
    <div className="landing-container" style={{ padding: '40px 20px' }}>
      <div className="glass-card" style={{ maxWidth: '1200px', width: '100%', textAlign: 'left' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div className="badge" style={{ marginBottom: '6px' }}>✈️ Workspace</div>
            <h1 className="page-title" style={{ margin: 0 }}>Trip Dashboard</h1>
          </div>
          <NotificationBell />
        </div>
        <p className="hero-subtitle" style={{ fontSize: '1rem', marginBottom: '24px' }}>
          Manage your trips, itineraries, weather alerts, and collaboration invitations
        </p>

        {/* ========================================================= */}
        {/* 📩 PENDING INVITATIONS SECTION */}
        {/* ========================================================= */}
        <div
          className="placeholder-box"
          style={{
            textAlign: 'left',
            borderStyle: 'solid',
            borderColor: 'rgba(56, 189, 248, 0.3)',
            background: 'rgba(15, 23, 42, 0.7)',
            marginBottom: '28px',
            padding: '20px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ color: '#ffffff', fontSize: '1.1rem', margin: 0 }}>
              📩 Pending Trip Invitations
            </h3>
            {invitations.length > 0 && (
              <span style={{ color: '#38bdf8', fontSize: '0.85rem', fontWeight: '700' }}>
                {invitations.length} pending
              </span>
            )}
          </div>

          {actionSuccessMessage && (
            <div className="alert alert-success" style={{ marginBottom: '12px' }}>
              {actionSuccessMessage}
            </div>
          )}

          {actionError && (
            <div className="alert alert-error" style={{ marginBottom: '12px' }}>
              {actionError}
            </div>
          )}

          {invitationsLoading && (
            <p style={{ color: '#cbd5e1', fontSize: '0.9rem', margin: 0 }}>
              Loading invitations...
            </p>
          )}

          {!invitationsLoading && invitationsError && (
            <div className="alert alert-error" style={{ marginBottom: 0 }}>
              {invitationsError}
            </div>
          )}

          {!invitationsLoading && !invitationsError && invitations.length === 0 && (
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
              No pending trip invitations.
            </p>
          )}

          {!invitationsLoading && !invitationsError && invitations.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {invitations.map((inv) => {
                const tripInfo = inv.tripId;
                const inviter = inv.invitedBy;
                const isProcessing = actionLoadingId === inv._id;

                return (
                  <div
                    key={inv._id}
                    style={{
                      background: 'rgba(15, 23, 42, 0.8)',
                      padding: '16px',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <h4 style={{ color: '#ffffff', fontSize: '1.1rem', marginBottom: '4px' }}>
                          {tripInfo?.title || 'Trip Workspace'}
                        </h4>
                        <p style={{ color: '#38bdf8', fontSize: '0.9rem', marginBottom: '4px', fontWeight: '600' }}>
                          📍 {tripInfo?.destination || 'N/A'}
                        </p>
                        {tripInfo?.startDate && tripInfo?.endDate && (
                          <p style={{ color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '4px' }}>
                            📅 {formatDateToDisplay(tripInfo.startDate)} - {formatDateToDisplay(tripInfo.endDate)}
                          </p>
                        )}
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
                          👤 Invited by: <strong style={{ color: '#cbd5e1' }}>{inviter?.name || 'User'}</strong> ({inviter?.email || 'N/A'})
                        </p>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                        <span className="badge" style={{ marginBottom: 0, fontSize: '0.75rem', padding: '4px 10px' }}>
                          Role: {inv.role}
                        </span>
                        {inv.createdAt && (
                          <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                            {formatDateToDisplay(inv.createdAt)}
                          </span>
                        )}
                      </div>
                    </div>

                    {inv.inviteMessage && (
                      <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '10px 12px', borderRadius: '8px', borderLeft: '3px solid #38bdf8' }}>
                        <p style={{ color: '#cbd5e1', fontSize: '0.85rem', fontStyle: 'italic', margin: 0 }}>
                          💬 "{inv.inviteMessage}"
                        </p>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleDeclineInvitation(inv._id)}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.85rem', opacity: isProcessing ? 0.6 : 1 }}
                      >
                        {isProcessing ? 'Processing...' : '✕ Decline'}
                      </button>
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleAcceptInvitation(inv._id)}
                        className="btn btn-primary btn-sm"
                        style={{ fontSize: '0.85rem', opacity: isProcessing ? 0.6 : 1 }}
                      >
                        {isProcessing ? 'Processing...' : '✓ Accept'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* ✈️ TRIPS LIST SECTION */}
        {/* ========================================================= */}
        <h3 style={{ color: '#ffffff', fontSize: '1.2rem', marginBottom: '14px' }}>
          ✈️ My Trip Workspaces
        </h3>

        {loading && (
          <div className="placeholder-box">
            <p>Loading trips...</p>
          </div>
        )}

        {!loading && error && (
          <div className="alert alert-error">{error}</div>
        )}

        {!loading && !error && trips.length === 0 && (
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '16px',
              padding: '40px 24px',
              textAlign: 'center',
              marginBottom: '24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <div style={{ fontSize: '3rem', lineHeight: '1', marginBottom: '4px' }}>🗺️</div>
            <h3 style={{ color: '#ffffff', fontSize: '1.4rem', margin: 0, fontWeight: '700' }}>
              No Trips Yet
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: '0 0 12px 0', maxWidth: '400px' }}>
              Start planning your next adventure with TripPilot.
            </p>
            <Link to="/dashboard/create" className="btn btn-primary" style={{ fontSize: '0.95rem' }}>
              + Create Your First Trip
            </Link>
          </div>
        )}

        {!loading && !error && trips.length > 0 && (
          <div
            className="trips-list"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              marginBottom: '24px',
              textAlign: 'left'
            }}
          >
            {trips.map((trip) => (
              <Link
                key={trip._id}
                to={`/dashboard/trip/${trip._id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div
                  style={{
                    background: 'rgba(15, 23, 42, 0.75)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '16px',
                    padding: '24px 20px',
                    marginBottom: '0',
                    textAlign: 'left',
                    transition: 'all 0.25s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)';
                    e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 0 15px rgba(56, 189, 248, 0.1)';
                    e.currentTarget.style.background = 'rgba(15, 23, 42, 0.9)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.background = 'rgba(15, 23, 42, 0.75)';
                  }}
                >
                  <h3 style={{ color: '#ffffff', marginBottom: '8px', fontSize: '1.2rem' }}>
                    {trip.title}
                  </h3>
                  <p style={{ color: '#38bdf8', marginBottom: '6px', fontSize: '0.95rem' }}>
                    📍 {trip.destination}
                  </p>
                  <p style={{ color: '#cbd5e1', fontSize: '0.875rem', marginBottom: '4px' }}>
                    📅 {formatDateToDisplay(trip.startDate)} -{' '}
                    {formatDateToDisplay(trip.endDate)}
                  </p>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                    🏷️ Status: <strong>{trip.status}</strong>
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="nav-actions">
          <Link to="/dashboard/create" className="btn btn-primary">
            + Create New Trip
          </Link>
          <Link to="/dashboard/discover-destinations" className="btn btn-secondary">
            🔎 Discover Destinations
          </Link>
          <Link to="/" className="btn btn-secondary">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
