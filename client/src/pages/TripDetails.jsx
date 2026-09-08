import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/axios.js';
import { formatDateToDisplay } from '../utils/dateUtils.js';
import { AuthContext } from '../context/AuthContext.jsx';
import NotificationBell from '../components/NotificationBell.jsx';

const TRANSPORTATION_MODE_MAP = {
  FLIGHT: 'Flight',
  TRAIN: 'Train',
  BUS: 'Bus',
  OWN_VEHICLE: 'Own Vehicle'
};

const ACCOMMODATION_TYPE_MAP = {
  BUDGET: 'Budget',
  THREE_STAR: '3-Star',
  FOUR_STAR: '4-Star',
  FIVE_STAR: '5-Star'
};

/**
 * 🗺️ TripDetails Page Component: Displays comprehensive trip workspace metadata, budget, members,
 * and integrated Weather Forecast, Analysis, and AI Schedule Optimization.
 */
export default function TripDetails() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [trip, setTrip] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Delete Trip Workspace state
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Invite Member Modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    userEmail: '',
    role: 'VIEWER',
    inviteMessage: ''
  });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  // Member Role Update state
  const [roleUpdatingId, setRoleUpdatingId] = useState(null);
  const [memberActionError, setMemberActionError] = useState('');
  const [memberActionSuccess, setMemberActionSuccess] = useState('');

  // Member Removal Modal state
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  // Weather Module States
  const [forecastData, setForecastData] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState('');
  const [showForecast, setShowForecast] = useState(false);

  const [analysisData, setAnalysisData] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [showAnalysis, setShowAnalysis] = useState(false);

  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [optimizeLoading, setOptimizeLoading] = useState(false);
  const [optimizeError, setOptimizeError] = useState('');
  const [optimizeSuccessMessage, setOptimizeSuccessMessage] = useState('');

  const fetchTripDetails = async () => {
    try {
      const response = await api.get(`/trips/${tripId}`);
      setTrip(response.data?.data?.trip || null);
      setMembers(response.data?.data?.members || []);
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || 'Failed to fetch trip details. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTripDetails();
  }, [tripId]);

  // Determine user role and permissions in this trip workspace
  const currentMember = user && members.find((m) => m.userId?._id?.toString() === user._id.toString());
  const userRole = currentMember
    ? currentMember.role
    : user && trip && ((trip.createdBy?._id && trip.createdBy._id.toString() === user._id.toString()) || (trip.createdBy && trip.createdBy.toString() === user._id.toString()))
    ? 'OWNER'
    : 'VIEWER';

  const isOwner = userRole === 'OWNER';
  const isEditor = userRole === 'EDITOR';
  const isViewer = userRole === 'VIEWER';
  const canEditTrip = isOwner || isEditor;
  const canGenerateItinerary = isOwner || isEditor;

  const handleDelete = async () => {
    setDeleteLoading(true);
    setDeleteError('');

    try {
      await api.delete(`/trips/${tripId}`);
      navigate('/dashboard');
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || 'Failed to delete trip. Please try again.';
      setDeleteError(errorMessage);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Invite Collaborator Submit Handler
  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteForm.userEmail || !inviteForm.userEmail.trim()) {
      setInviteError('User email is required.');
      return;
    }

    setInviteLoading(true);
    setInviteError('');
    setInviteSuccess('');

    try {
      await api.post(`/trips/${tripId}/members`, {
        userEmail: inviteForm.userEmail.trim(),
        role: inviteForm.role || 'VIEWER',
        inviteMessage: inviteForm.inviteMessage.trim()
      });

      setInviteSuccess(`✓ Invitation sent successfully to ${inviteForm.userEmail}`);
      setInviteForm({ userEmail: '', role: 'VIEWER', inviteMessage: '' });

      // Refresh members list
      const res = await api.get(`/trips/${tripId}`);
      setMembers(res.data?.data?.members || []);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send invitation. Please try again.';
      setInviteError(msg);
    } finally {
      setInviteLoading(false);
    }
  };

  // Update Member Role Handler
  const handleUpdateRole = async (memberId, newRole) => {
    setRoleUpdatingId(memberId);
    setMemberActionError('');
    setMemberActionSuccess('');

    try {
      const res = await api.patch(`/trips/${tripId}/members/${memberId}/role`, {
        role: newRole
      });
      const updatedMember = res.data?.data?.member;

      if (updatedMember) {
        setMembers((prev) =>
          prev.map((m) => (m._id === memberId ? { ...m, role: updatedMember.role } : m))
        );
      } else {
        setMembers((prev) =>
          prev.map((m) => (m._id === memberId ? { ...m, role: newRole } : m))
        );
      }
      setMemberActionSuccess('✓ Member role updated successfully.');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update member role.';
      setMemberActionError(msg);
    } finally {
      setRoleUpdatingId(null);
    }
  };

  // Remove Member Handler
  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    setRemoveLoading(true);
    setMemberActionError('');
    setMemberActionSuccess('');

    try {
      await api.delete(`/trips/${tripId}/members/${memberToRemove._id}`);
      setMembers((prev) => prev.filter((m) => m._id !== memberToRemove._id));
      setMemberActionSuccess(`✓ ${memberToRemove.userId?.name || 'Member'} removed from workspace.`);
      setMemberToRemove(null);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to remove member.';
      setMemberActionError(msg);
    } finally {
      setRemoveLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Presentation-only formatting helpers for Weather UI
  // -------------------------------------------------------------

  /**
   * Converts 24-hour time string ("09:00", "18:00", "00:00") into 12-hour AM/PM format ("9:00 AM", "6:00 PM", "12:00 AM").
   */
  const formatTimeTo12Hour = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return '';
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})/);
    if (!match) return timeStr;
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    return `${hours}:${minutes} ${ampm}`;
  };

  /**
   * Replaces any 24-hour HH:mm time patterns inside weather alert text with 12-hour AM/PM format.
   */
  const formatWeatherText12Hour = (text) => {
    if (!text || typeof text !== 'string') return '';
    return text.replace(/\b(\d{1,2}:\d{2})\b/g, (match) => formatTimeTo12Hour(match));
  };

  // Fetch OpenWeather 5-Day Forecast
  const handleFetchForecast = async () => {
    if (showForecast && forecastData) {
      setShowForecast(false);
      return;
    }

    setForecastLoading(true);
    setForecastError('');

    try {
      const res = await api.get(`/weather/forecast?destination=${encodeURIComponent(trip.destination)}`);
      setForecastData(res.data?.data?.weather || res.data?.data || null);
      setShowForecast(true);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to fetch weather forecast.';
      setForecastError(msg);
    } finally {
      setForecastLoading(false);
    }
  };

  // Fetch AI Weather Analysis
  const handleFetchAnalysis = async () => {
    if (showAnalysis && analysisData) {
      setShowAnalysis(false);
      return;
    }

    setAnalysisLoading(true);
    setAnalysisError('');

    try {
      const res = await api.get(`/weather/trip/${tripId}/analyze`);
      setAnalysisData(res.data?.data?.weatherAnalysis || res.data?.data || null);
      setShowAnalysis(true);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to generate weather analysis.';
      setAnalysisError(msg);
    } finally {
      setAnalysisLoading(false);
    }
  };

  // Trigger Weather Optimization via Gemini AI
  const handleOptimizeItinerary = async () => {
    setShowOptimizeModal(false);
    setOptimizeLoading(true);
    setOptimizeError('');
    setOptimizeSuccessMessage('');

    try {
      const activeItineraryId = trip.activeItinerary?._id || trip.activeItinerary;

      if (!activeItineraryId) {
        throw new Error('No active itinerary set for this trip. Please generate or select an active itinerary first.');
      }

      const res = await api.post(`/weather/itinerary/${activeItineraryId}/optimize`);
      const optimizedCount = res.data?.data?.optimizedCount || 0;

      setOptimizeSuccessMessage(`🤖 Weather optimization complete! ${optimizedCount} activity(ies) re-scheduled.`);
      navigate(`/dashboard/trip/${tripId}/itinerary`, {
        state: { weatherOptimizedSuccess: true, optimizedCount }
      });
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to optimize itinerary schedule for weather.';
      setOptimizeError(msg);
    } finally {
      setOptimizeLoading(false);
    }
  };

  // Helper to group raw 3-hour forecast lists into daily summaries filtered by trip dates
  const getGroupedForecastDays = () => {
    if (!forecastData || !forecastData.list) return [];

    const startDateIso = trip?.startDate ? new Date(trip.startDate).toISOString().split('T')[0] : null;
    const endDateIso = trip?.endDate ? new Date(trip.endDate).toISOString().split('T')[0] : null;

    const daysMap = {};
    forecastData.list.forEach((item) => {
      const dateStr = item.dt_txt.split(' ')[0];

      // Filter: Include only forecast entries falling within [startDate, endDate]
      if (startDateIso && endDateIso) {
        if (dateStr < startDateIso || dateStr > endDateIso) {
          return;
        }
      }

      if (!daysMap[dateStr]) {
        daysMap[dateStr] = {
          date: dateStr,
          minTemp: item.main.temp_min,
          maxTemp: item.main.temp_max,
          condition: item.weather[0]?.main || 'Clear',
          description: item.weather[0]?.description || '',
          icon: item.weather[0]?.icon || ''
        };
      } else {
        daysMap[dateStr].minTemp = Math.min(daysMap[dateStr].minTemp, item.main.temp_min);
        daysMap[dateStr].maxTemp = Math.max(daysMap[dateStr].maxTemp, item.main.temp_max);
      }
    });

    return Object.values(daysMap);
  };

  return (
    <div className="landing-container" style={{ padding: '40px 20px' }}>
      <div className="glass-card" style={{ maxWidth: '1200px', width: '100%', textAlign: 'left' }}>

        {loading && (
          <div className="placeholder-box" style={{ textAlign: 'center' }}>
            <p>Loading trip details...</p>
          </div>
        )}

        {!loading && error && (
          <div className="alert alert-error">{error}</div>
        )}

        {!loading && trip && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div className="badge" style={{ marginBottom: '6px' }}>✈️ Workspace Overview</div>
                <h1 className="page-title" style={{ fontSize: '2.2rem', margin: 0 }}>
                  {trip.title}
                </h1>
              </div>
              <NotificationBell />
            </div>

            <p style={{ color: '#38bdf8', fontSize: '1.1rem', marginBottom: '20px', fontWeight: '600' }}>
              📍 Destination: {trip.destination}
            </p>

            {trip.description && (
              <p className="hero-subtitle" style={{ fontSize: '0.95rem', marginBottom: '24px', textAlign: 'left' }}>
                {trip.description}
              </p>
            )}

            {/* Core Details Card */}
            <div
              className="placeholder-box"
              style={{
                marginBottom: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <p style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>
                🛫 <strong>Starting Location:</strong> {trip.startingLocation}
              </p>
              <p style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>
                📅 <strong>Dates:</strong> {formatDateToDisplay(trip.startDate)} -{' '}
                {formatDateToDisplay(trip.endDate)}
              </p>
              <p style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>
                👥 <strong>Travel Companion:</strong> {trip.travelCompanion} ({trip.travelerCount} traveler{trip.travelerCount > 1 ? 's' : ''})
              </p>
              <p style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>
                🏷️ <strong>Status:</strong> <span style={{ color: '#38bdf8', fontWeight: '600' }}>{trip.status}</span>
              </p>
            </div>

            {/* Budget Overview Card */}
            <div
              className="placeholder-box"
              style={{
                marginBottom: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <h3 style={{ color: '#ffffff', fontSize: '1.1rem', marginBottom: '4px' }}>💰 Budget Summary</h3>
              <p style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>
                <strong>Tier:</strong> {trip.budgetType}
              </p>
              <p style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>
                <strong>Estimated Budget:</strong> {trip.budget?.currency} {trip.budget?.estimated}
              </p>
              <p style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>
                <strong>Spent:</strong> {trip.budget?.currency} {trip.budget?.spent}
              </p>
            </div>

            {/* Travel Preferences Card */}
            <div
              className="placeholder-box"
              style={{
                marginBottom: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <h3 style={{ color: '#ffffff', fontSize: '1.1rem', marginBottom: '4px' }}>🧳 Travel Preferences</h3>
              <p style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>
                🚘 <strong>Transportation:</strong>{' '}
                {TRANSPORTATION_MODE_MAP[trip.transportationMode] || 'Not specified'}
              </p>
              <p style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>
                🏨 <strong>Accommodation:</strong>{' '}
                {ACCOMMODATION_TYPE_MAP[trip.accommodationType] || 'Not specified'}
              </p>
            </div>

            {/* Interests Section */}
            {trip.interests && trip.interests.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ color: '#ffffff', fontSize: '1.1rem', marginBottom: '10px' }}>🎯 Interests</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {trip.interests.map((interest, index) => (
                    <span key={index} className="feature-pill">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* 👥 TRIP MEMBERS & COLLABORATION SECTION */}
            {/* ========================================================= */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                <h3 style={{ color: '#ffffff', fontSize: '1.1rem', margin: 0 }}>👥 Trip Members</h3>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowInviteModal(true);
                      setInviteError('');
                      setInviteSuccess('');
                    }}
                    className="btn btn-primary btn-sm"
                    style={{ fontSize: '0.85rem' }}
                  >
                    ➕ Invite Collaborator
                  </button>
                )}
              </div>

              {memberActionError && (
                <div className="alert alert-error" style={{ marginBottom: '12px' }}>
                  {memberActionError}
                </div>
              )}

              {memberActionSuccess && (
                <div className="alert alert-success" style={{ marginBottom: '12px' }}>
                  {memberActionSuccess}
                </div>
              )}

              {members.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No members found.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {members.map((member) => {
                    const isCurrentMemberOwner = member.role === 'OWNER';
                    return (
                      <div
                        key={member._id}
                        style={{
                          background: 'rgba(15, 23, 42, 0.6)',
                          padding: '12px 16px',
                          borderRadius: '12px',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '10px'
                        }}
                      >
                        <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                          <p style={{ color: '#ffffff', fontWeight: '600', fontSize: '0.95rem', margin: 0 }}>
                            {member.userId?.name || 'User'}
                          </p>
                          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '2px 0 0 0', wordBreak: 'break-word' }}>
                            {member.userId?.email || 'N/A'}
                          </p>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          {/* Owner role indicator OR Role Dropdown for Owner */}
                          {isOwner && !isCurrentMemberOwner ? (
                            <select
                              value={member.role}
                              disabled={roleUpdatingId === member._id}
                              onChange={(e) => handleUpdateRole(member._id, e.target.value)}
                              style={{
                                background: '#1e293b',
                                border: '1px solid rgba(56, 189, 248, 0.4)',
                                color: '#38bdf8',
                                fontSize: '0.8rem',
                                fontWeight: '600',
                                borderRadius: '8px',
                                padding: '4px 8px',
                                outline: 'none',
                                cursor: 'pointer'
                              }}
                            >
                              <option value="EDITOR">EDITOR</option>
                              <option value="VIEWER">VIEWER</option>
                            </select>
                          ) : (
                            <span className="badge" style={{ marginBottom: '0', fontSize: '0.75rem', padding: '4px 10px' }}>
                              {member.role}
                            </span>
                          )}

                          {/* Remove Member Button (Owner only, for non-owner members) */}
                          {isOwner && !isCurrentMemberOwner && (
                            <button
                              type="button"
                              onClick={() => setMemberToRemove(member)}
                              className="btn btn-sm"
                              style={{
                                fontSize: '0.75rem',
                                padding: '4px 10px',
                                background: 'rgba(239, 68, 68, 0.2)',
                                color: '#fca5a5',
                                border: '1px solid rgba(239, 68, 68, 0.4)'
                              }}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ========================================================= */}
            {/* 🌤️ WEATHER MODULE SECTION */}
            {/* ========================================================= */}
            <div
              className="placeholder-box"
              style={{
                textAlign: 'left',
                borderStyle: 'solid',
                borderColor: 'rgba(56, 189, 248, 0.3)',
                background: 'rgba(15, 23, 42, 0.7)',
                marginBottom: '24px',
                padding: '24px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ color: '#ffffff', fontSize: '1.2rem', margin: 0 }}>
                    🌤️ Weather & Destination Forecast
                  </h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                    Check OpenWeather forecast and analyze conditions for {trip.destination}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleFetchForecast}
                    disabled={forecastLoading}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.85rem' }}
                  >
                    {forecastLoading ? 'Loading...' : showForecast ? '🙈 Hide Forecast' : '🌤️ View Forecast'}
                  </button>
                  <button
                    type="button"
                    onClick={handleFetchAnalysis}
                    disabled={analysisLoading}
                    className="btn btn-primary btn-sm"
                    style={{ fontSize: '0.85rem' }}
                  >
                    {analysisLoading ? 'Analyzing...' : showAnalysis ? '🙈 Hide Analysis' : '🔍 Analyze Trip Weather'}
                  </button>
                </div>
              </div>

              {optimizeSuccessMessage && (
                <div className="alert alert-success" style={{ marginBottom: '16px' }}>
                  ✓ {optimizeSuccessMessage}
                </div>
              )}

              {/* 1. OpenWeather Forecast Display */}
              {forecastError && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{forecastError}</div>}

              {showForecast && forecastData && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ color: '#38bdf8', fontSize: '1rem', marginBottom: '12px' }}>
                    Trip Weather Forecast — {forecastData.city?.name || trip.destination}
                  </h4>

                  {getGroupedForecastDays().length === 0 ? (
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>
                      ℹ️ No forecast data available for the trip dates ({formatDateToDisplay(trip.startDate)} - {formatDateToDisplay(trip.endDate)}).
                    </p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                      {getGroupedForecastDays().map((day) => (
                        <div
                          key={day.date}
                          style={{
                            background: 'rgba(15, 23, 42, 0.8)',
                            padding: '12px',
                            borderRadius: '10px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            textAlign: 'center'
                          }}
                        >
                          <p style={{ color: '#38bdf8', fontWeight: '700', fontSize: '0.85rem', marginBottom: '4px' }}>
                            {formatDateToDisplay(day.date)}
                          </p>
                          <p style={{ color: '#ffffff', fontSize: '1.1rem', fontWeight: 'bold', margin: '4px 0' }}>
                            {Math.round(day.minTemp)}°C - {Math.round(day.maxTemp)}°C
                          </p>
                          <p style={{ color: '#cbd5e1', fontSize: '0.8rem', textTransform: 'capitalize' }}>
                            {day.condition} ({formatWeatherText12Hour(day.description)})
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 2. AI Trip Weather Analysis Display */}
              {analysisError && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{analysisError}</div>}

              {showAnalysis && analysisData && (() => {
                const hasSevereWeatherInAnalysis = Boolean(
                  analysisData?.hasSevereWeather ||
                  analysisData?.days?.some((d) => d.hasSevereWeather)
                );

                return (
                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 0.6)',
                      padding: '16px',
                      borderRadius: '12px',
                      border: '1px solid rgba(56, 189, 248, 0.2)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h4 style={{ color: '#38bdf8', fontSize: '1rem', margin: 0 }}>
                        📋 Weather Advisory Summary
                      </h4>
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: '50px',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          background: hasSevereWeatherInAnalysis ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                          color: hasSevereWeatherInAnalysis ? '#fca5a5' : '#86efac',
                          border: hasSevereWeatherInAnalysis ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(34, 197, 94, 0.4)'
                        }}
                      >
                        {hasSevereWeatherInAnalysis ? '⚠️ Severe Weather Detected' : '☀️ Fair Weather Conditions'}
                      </span>
                    </div>

                    <p style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '12px', lineHeight: '1.4' }}>
                      {formatWeatherText12Hour(analysisData.overallSummary)}
                    </p>

                    {/* Severe Weather Conditions List */}
                    {analysisData.severeConditions && analysisData.severeConditions.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <h5 style={{ color: '#fca5a5', fontSize: '0.85rem', marginBottom: '6px' }}>
                          ⚠️ Severe Conditions & Advisory Alerts:
                        </h5>
                        <ul style={{ margin: 0, paddingLeft: '20px', color: '#cbd5e1', fontSize: '0.85rem' }}>
                          {analysisData.severeConditions.map((c, i) => (
                            <li key={i} style={{ marginBottom: '4px' }}>
                              <strong>{c.date}:</strong>{' '}
                              {c.summaryText ? formatWeatherText12Hour(c.summaryText) : `${c.condition} (${formatWeatherText12Hour(c.description)})`}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Day-by-Day Detailed Weather Analysis */}
                    {analysisData.days && analysisData.days.length > 0 && (
                      <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                        <h5 style={{ color: '#38bdf8', fontSize: '0.9rem', marginBottom: '12px', fontWeight: 'bold' }}>
                          📅 Day-by-Day Weather Analysis
                        </h5>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                          {analysisData.days.map((dayItem) => {
                            const forecastDay = forecastData ? getGroupedForecastDays().find((f) => f.date === dayItem.date) : null;
                            return (
                              <div
                                key={dayItem.dayNumber}
                                style={{
                                  background: 'rgba(15, 23, 42, 0.8)',
                                  padding: '12px 14px',
                                  borderRadius: '10px',
                                  border: dayItem.hasSevereWeather
                                    ? '1px solid rgba(239, 68, 68, 0.4)'
                                    : '1px solid rgba(255, 255, 255, 0.1)'
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                  <span style={{ color: '#38bdf8', fontWeight: '700', fontSize: '0.85rem' }}>
                                    Day {dayItem.dayNumber} ({formatDateToDisplay(dayItem.date)})
                                  </span>
                                  <span
                                    style={{
                                      padding: '2px 8px',
                                      borderRadius: '50px',
                                      fontSize: '0.7rem',
                                      fontWeight: 'bold',
                                      background: dayItem.hasSevereWeather ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                                      color: dayItem.hasSevereWeather ? '#fca5a5' : '#86efac',
                                      border: dayItem.hasSevereWeather ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(34, 197, 94, 0.3)'
                                    }}
                                  >
                                    {dayItem.hasSevereWeather ? '⚠️ Severe Alert' : '☀️ Fair'}
                                  </span>
                                </div>

                                {/* Temperatures from forecast if available */}
                                {forecastDay && (
                                  <p style={{ color: '#ffffff', fontSize: '1rem', fontWeight: 'bold', margin: '4px 0' }}>
                                    {Math.round(forecastDay.minTemp)}°C - {Math.round(forecastDay.maxTemp)}°C
                                  </p>
                                )}

                                {/* Weather Conditions */}
                                <div style={{ color: '#cbd5e1', fontSize: '0.8rem', marginTop: '4px' }}>
                                  {dayItem.weatherConditions && dayItem.weatherConditions.length > 0 ? (
                                    dayItem.weatherConditions.map((cond, idx) => (
                                      <div key={idx} style={{ marginBottom: '2px' }}>
                                        <strong style={{ color: '#f8fafc' }}>{cond.condition}:</strong>{' '}
                                        {formatWeatherText12Hour(cond.summaryText || cond.description)}
                                      </div>
                                    ))
                                  ) : (
                                    <div>
                                      <strong style={{ color: '#f8fafc' }}>Condition:</strong>{' '}
                                      {forecastDay ? `${forecastDay.condition} (${formatWeatherText12Hour(forecastDay.description)})` : (dayItem.statusMessage || 'Good weather')}
                                    </div>
                                  )}
                                </div>

                                {/* Activity & Weather Warnings */}
                                {dayItem.activities && dayItem.activities.length > 0 && (
                                  <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                                    <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '600' }}>Activities ({dayItem.activities.length}):</span>
                                    <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px', color: '#cbd5e1', fontSize: '0.75rem' }}>
                                      {dayItem.activities.map((act, actIdx) => (
                                        <li key={actIdx} style={{ marginBottom: '2px' }}>
                                          <span>{act.title || act.name || 'Scheduled Activity'}</span>
                                          {act.time && <span style={{ color: '#94a3b8' }}> ({formatTimeTo12Hour(act.time)})</span>}
                                          {act.weatherWarning && (
                                            <div style={{ color: '#fca5a5', fontStyle: 'italic', marginTop: '1px' }}>
                                              ⚠️ {formatWeatherText12Hour(act.weatherWarning)}
                                            </div>
                                          )}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Action trigger for Gemini Itinerary Re-optimization */}
                    {hasSevereWeatherInAnalysis && canGenerateItinerary && (
                      <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '12px' }}>
                        <p style={{ color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '10px' }}>
                          Bad weather alert detected! Would you like TripPilot AI to re-optimize your active schedule to substitute outdoor activities with safe indoor options?
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowOptimizeModal(true)}
                          className="btn btn-primary btn-sm"
                          style={{ fontSize: '0.85rem' }}
                        >
                          🤖 Re-Optimize Itinerary for Weather
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Action Bar */}
            {deleteError && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{deleteError}</div>}

            {showConfirmDelete ? (
              <div
                className="placeholder-box"
                style={{
                  borderStyle: 'solid',
                  borderColor: 'rgba(239, 68, 68, 0.4)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  textAlign: 'left',
                  marginTop: '20px'
                }}
              >
                <h3 style={{ color: '#fca5a5', fontSize: '1.1rem', marginBottom: '8px' }}>
                  ⚠️ Delete Trip Workspace?
                </h3>
                <p style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '16px' }}>
                  Are you sure you want to permanently delete <strong>"{trip.title}"</strong>? This will cascade-delete all itineraries, weather alerts, and financial records. This action cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleteLoading}
                    className="btn"
                    style={{ background: '#ef4444', color: '#ffffff', opacity: deleteLoading ? 0.6 : 1 }}
                  >
                    {deleteLoading ? 'Deleting...' : 'Yes, Delete Trip'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirmDelete(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="nav-actions" style={{ marginTop: '24px', justifyContent: 'flex-start', flexWrap: 'wrap' }}>
                <Link to={`/dashboard/trip/${tripId}/itinerary`} className="btn btn-primary">
                  🗺️ Active Itinerary
                </Link>
                <Link to={`/dashboard/trip/${tripId}/expenses`} className="btn btn-secondary">
                  💰 Budget & Expenses
                </Link>
                <Link to={`/dashboard/trip/${tripId}/packing-list`} className="btn btn-secondary">
                  🎒 Packing List
                </Link>
                <Link to={`/dashboard/trip/${tripId}/gallery`} className="btn btn-secondary">
                  📸 Photo Gallery
                </Link>
                <Link to={`/dashboard/trip/${tripId}/summary`} className="btn btn-secondary">
                  ✨ AI Travel Summary
                </Link>
                <Link to={`/dashboard/trip/${tripId}/itineraries`} className="btn btn-secondary">
                  📋 Itinerary Versions
                </Link>
                {canGenerateItinerary && (
                  <Link to={`/dashboard/trip/${tripId}/generate-itinerary`} className="btn btn-secondary">
                    🤖 Generate Itinerary
                  </Link>
                )}
                {canEditTrip && (
                  <Link to={`/dashboard/trip/${tripId}/edit`} className="btn btn-secondary">
                    ✏️ Edit Trip
                  </Link>
                )}
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => setShowConfirmDelete(true)}
                    className="btn"
                    style={{
                      background: 'rgba(239, 68, 68, 0.2)',
                      color: '#fca5a5',
                      border: '1px solid rgba(239, 68, 68, 0.4)'
                    }}
                  >
                    🗑️ Delete Trip
                  </button>
                )}
                <Link to="/dashboard" className="btn btn-secondary">
                  ← Back to Dashboard
                </Link>
              </div>
            )}
          </>
        )}
      </div>

      {/* ========================================================= */}
      {/* ➕ INVITE COLLABORATOR GLASSMORPHIC MODAL */}
      {/* ========================================================= */}
      {showInviteModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: '480px',
              width: '100%',
              textAlign: 'left',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.6)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: '#ffffff', fontSize: '1.3rem', margin: 0 }}>
                ➕ Invite Collaborator
              </h2>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.8rem' }}
              >
                ✕
              </button>
            </div>

            {inviteError && (
              <div className="alert alert-error" style={{ marginBottom: '16px' }}>
                {inviteError}
              </div>
            )}

            {inviteSuccess && (
              <div className="alert alert-success" style={{ marginBottom: '16px' }}>
                {inviteSuccess}
              </div>
            )}

            <form onSubmit={handleSendInvite} className="auth-form">
              <div className="form-group">
                <label htmlFor="inviteEmail">User Email *</label>
                <input
                  id="inviteEmail"
                  type="email"
                  placeholder="colleague@example.com"
                  value={inviteForm.userEmail}
                  onChange={(e) => setInviteForm({ ...inviteForm, userEmail: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="inviteRole">Permission Role *</label>
                <select
                  id="inviteRole"
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: '#1e293b',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    color: '#f8fafc',
                    fontSize: '0.95rem',
                    outline: 'none'
                  }}
                >
                  <option value="VIEWER">VIEWER (Read-only access)</option>
                  <option value="EDITOR">EDITOR (Can edit itinerary & expenses)</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="inviteMessage">Personal Note (Optional)</label>
                <textarea
                  id="inviteMessage"
                  placeholder="Add a friendly invitation message..."
                  value={inviteForm.inviteMessage}
                  onChange={(e) => setInviteForm({ ...inviteForm, inviteMessage: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    color: '#f8fafc',
                    fontSize: '0.95rem',
                    outline: 'none',
                    minHeight: '70px'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="btn btn-primary"
                  style={{ opacity: inviteLoading ? 0.6 : 1 }}
                >
                  {inviteLoading ? 'Sending Invite...' : '📩 Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ⚠️ REMOVE MEMBER CONFIRMATION MODAL */}
      {/* ========================================================= */}
      {memberToRemove && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: '440px',
              width: '100%',
              textAlign: 'left',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.6)'
            }}
          >
            <h2 style={{ color: '#fca5a5', fontSize: '1.3rem', marginBottom: '12px' }}>
              ⚠️ Remove Member from Workspace?
            </h2>

            <p style={{ color: '#cbd5e1', fontSize: '0.95rem', marginBottom: '20px', lineHeight: '1.5' }}>
              Are you sure you want to remove <strong>{memberToRemove.userId?.name || 'this member'}</strong> ({memberToRemove.userId?.email}) from this trip workspace? They will lose access to all itineraries, weather alerts, and financial records.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setMemberToRemove(null)}
                className="btn btn-secondary"
                disabled={removeLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemoveMember}
                disabled={removeLoading}
                className="btn"
                style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  opacity: removeLoading ? 0.6 : 1
                }}
              >
                {removeLoading ? 'Removing...' : 'Remove Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* Weather Optimization Confirmation Modal */}
      {/* ========================================================= */}
      {showOptimizeModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: '500px',
              width: '100%',
              textAlign: 'left',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
            }}
          >
            <h2 style={{ color: '#38bdf8', fontSize: '1.4rem', marginBottom: '12px' }}>
              🤖 Re-Optimize Itinerary Schedule?
            </h2>

            <p style={{ color: '#cbd5e1', fontSize: '0.95rem', marginBottom: '16px', lineHeight: '1.5' }}>
              TripPilot AI will analyze your active itinerary schedule against severe weather alert intervals and swap risky outdoor activities with safe indoor alternatives.
            </p>

            <div className="alert alert-info" style={{ marginBottom: '20px', fontSize: '0.85rem' }}>
              💡 Your original itinerary structure will be updated, and activities optimized for weather will be marked with a weather badge.
            </div>

            {optimizeError && (
              <div className="alert alert-error" style={{ marginBottom: '16px' }}>
                {optimizeError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowOptimizeModal(false)}
                className="btn btn-secondary"
                disabled={optimizeLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleOptimizeItinerary}
                disabled={optimizeLoading}
                className="btn btn-primary"
                style={{ opacity: optimizeLoading ? 0.6 : 1 }}
              >
                {optimizeLoading ? '🤖 Optimizing Schedule...' : '✨ Confirm Re-Optimization'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
