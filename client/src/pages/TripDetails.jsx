import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/axios.js';
import { formatDateToDisplay } from '../utils/dateUtils.js';
import { AuthContext } from '../context/AuthContext.jsx';
import NotificationBell from '../components/NotificationBell.jsx';
import {
  MapPin,
  ArrowLeft,
  Compass,
  Calendar,
  Wallet,
  Luggage,
  Image,
  Sparkles,
  Layers,
  Users,
  Tag,
  CircleDollarSign,
  SlidersHorizontal,
  Car,
  Hotel,
  Heart,
  UserPlus,
  CloudSun,
  AlertTriangle,
  Wand2
} from 'lucide-react';

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
 * Presentation helper to format currency numbers cleanly (e.g. 100000 -> 1,00,000)
 */
const formatCurrencyDisplay = (val) => {
  if (val === null || val === undefined || val === '') return '0';
  if (typeof val === 'number') return val.toLocaleString('en-IN');
  const num = Number(val);
  return !isNaN(num) ? num.toLocaleString('en-IN') : val;
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
    const paddedHours = String(hours).padStart(2, '0');
    return `${paddedHours}:${minutes} ${ampm}`;
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
    <>
      <div className="tp-workspace-content-inner">
          {loading ? (
            <div className="tp-workspace-loading-box">
              <p>Loading trip details...</p>
            </div>
          ) : error ? (
            <div className="alert alert-error">{error}</div>
          ) : !trip ? (
            <div className="alert alert-error">Trip not found.</div>
          ) : (
            <>
              {/* Top Trip Overview Header */}
              <header className="tp-trip-overview-header">
                <div className="tp-trip-overview-header-left">
                  <div className="tp-trip-overview-eyebrow">
                    <span className="tp-trip-overview-line" />
                    <span>TRIP OVERVIEW</span>
                  </div>

                  <h1 className="tp-trip-overview-title">{trip.title || trip.destination}</h1>

                  <div className="tp-trip-overview-location">
                    <MapPin size={17} className="tp-trip-overview-pin" />
                    <span>{trip.destination}</span>
                  </div>
                </div>

                <div className="tp-trip-overview-header-right">
                  <div className="tp-workspace-bell-wrap">
                    <NotificationBell tripId={tripId} />
                  </div>
                </div>
              </header>

              {/* Existing Next Sections */}
              <div className="tp-workspace-body-sections">

            {/* 🧭 Trip Metadata Information Strip */}
            <div className="tp-trip-meta-strip">
              <div className="tp-trip-meta-item">
                <div className="tp-trip-meta-icon-box">
                  <MapPin size={18} />
                </div>
                <div className="tp-trip-meta-content">
                  <span className="tp-trip-meta-label">Starting Location</span>
                  <span className="tp-trip-meta-value">{trip.startingLocation || 'Not specified'}</span>
                </div>
              </div>

              <div className="tp-trip-meta-item">
                <div className="tp-trip-meta-icon-box">
                  <Calendar size={18} />
                </div>
                <div className="tp-trip-meta-content">
                  <span className="tp-trip-meta-label">Travel Dates</span>
                  <span className="tp-trip-meta-value">
                    {formatDateToDisplay(trip.startDate)} – {formatDateToDisplay(trip.endDate)}
                  </span>
                </div>
              </div>

              <div className="tp-trip-meta-item">
                <div className="tp-trip-meta-icon-box">
                  <Users size={18} />
                </div>
                <div className="tp-trip-meta-content">
                  <span className="tp-trip-meta-label">Travel Companion</span>
                  <span className="tp-trip-meta-value">
                    {trip.travelCompanion} {trip.travelerCount ? `(${trip.travelerCount} traveler${trip.travelerCount > 1 ? 's' : ''})` : ''}
                  </span>
                </div>
              </div>

              <div className="tp-trip-meta-item">
                <div className="tp-trip-meta-icon-box">
                  <Tag size={18} />
                </div>
                <div className="tp-trip-meta-content">
                  <span className="tp-trip-meta-label">Status</span>
                  <span className="tp-trip-meta-status-pill">{trip.status}</span>
                </div>
              </div>
            </div>

            {/* 📊 Row 1: Budget Summary & Travel Preferences (Equal Size and Level) */}
            <div className="tp-workspace-grid-2col">
              {/* Left Column: Budget Summary */}
              <div className="tp-budget-summary-card">
                <div className="tp-budget-card-header">
                  <div className="tp-budget-card-icon-box">
                    <CircleDollarSign size={18} />
                  </div>
                  <h3 className="tp-budget-card-title">Budget Summary</h3>
                </div>

                <div className="tp-budget-card-rows">
                  <div className="tp-budget-card-row">
                    <span className="tp-budget-card-label">Tier</span>
                    <span className="tp-budget-card-value">{trip.budgetType || 'Not specified'}</span>
                  </div>
                  <div className="tp-budget-card-row">
                    <span className="tp-budget-card-label">Estimated Budget</span>
                    <span className="tp-budget-card-value">
                      {trip.budget?.currency || 'INR'} {formatCurrencyDisplay(trip.budget?.estimated)}
                    </span>
                  </div>
                  <div className="tp-budget-card-row">
                    <span className="tp-budget-card-label">Spent</span>
                    <span className="tp-budget-card-value">
                      {trip.budget?.currency || 'INR'} {formatCurrencyDisplay(trip.budget?.spent)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Travel Preferences */}
              <div className="tp-prefs-summary-card">
                <div className="tp-prefs-card-header">
                  <div className="tp-prefs-card-icon-box">
                    <SlidersHorizontal size={18} />
                  </div>
                  <h3 className="tp-prefs-card-title">Travel Preferences</h3>
                </div>

                <div className="tp-prefs-card-rows">
                  <div className="tp-prefs-card-row">
                    <div className="tp-prefs-card-label-group">
                      <Car size={16} className="tp-prefs-row-icon" />
                      <span className="tp-prefs-card-label">Transportation</span>
                    </div>
                    <span className="tp-prefs-card-value">
                      {TRANSPORTATION_MODE_MAP[trip.transportationMode] || 'Not specified'}
                    </span>
                  </div>
                  <div className="tp-prefs-card-row">
                    <div className="tp-prefs-card-label-group">
                      <Hotel size={16} className="tp-prefs-row-icon" />
                      <span className="tp-prefs-card-label">Accommodation</span>
                    </div>
                    <span className="tp-prefs-card-value">
                      {ACCOMMODATION_TYPE_MAP[trip.accommodationType] || 'Not specified'}
                    </span>
                  </div>
                </div>
                <p className="tp-prefs-note">These preferences help us personalize your recommendations.</p>
              </div>
            </div>

            {/* 🎯 Row 2: Interests & Trip Members Grid */}
            <div className="tp-workspace-grid-2col">
              {/* Left Column: Interests */}
              <div className="tp-interests-section">
                <div className="tp-interests-header">
                  <div className="tp-interests-icon-box">
                    <Heart size={18} />
                  </div>
                  <h3 className="tp-interests-title">Interests</h3>
                </div>
                {trip.interests && trip.interests.length > 0 ? (
                  <div className="tp-interests-tags-wrap">
                    {trip.interests.map((interest, index) => (
                      <span key={index} className="tp-interest-tag">
                        {interest}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="tp-members-empty">No interests specified.</p>
                )}
              </div>

              {/* Right Column: Trip Members */}
              <div id="trip-members" className="tp-members-section">
                <div className="tp-members-header">
                  <div className="tp-members-title-group">
                    <div className="tp-members-icon-box">
                      <Users size={18} />
                    </div>
                    <h3 className="tp-members-title">Trip Members</h3>
                  </div>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowInviteModal(true);
                        setInviteError('');
                        setInviteSuccess('');
                      }}
                      className="tp-members-action-btn"
                    >
                      <UserPlus size={15} />
                      <span>Invite Collaborator</span>
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
                  <p className="tp-members-empty">No members found.</p>
                ) : (
                  <div className="tp-members-list">
                    {members.map((member) => {
                      const isCurrentMemberOwner = member.role === 'OWNER';
                      const memberName = member.userId?.name || 'User';
                      const memberInitial = (memberName.trim().charAt(0) || 'U').toUpperCase();

                      return (
                        <div key={member._id} className="tp-member-row">
                          <div className="tp-member-info-group">
                            <div className="tp-member-avatar">
                              {memberInitial}
                            </div>
                            <div className="tp-member-details">
                              <p className="tp-member-name">{memberName}</p>
                              <p className="tp-member-email">
                                {member.userId?.email || 'N/A'}
                              </p>
                            </div>
                          </div>

                          <div className="tp-member-actions-group">
                            {/* Owner role indicator OR Role Dropdown for Owner */}
                            {isOwner && !isCurrentMemberOwner ? (
                              <select
                                value={member.role}
                                disabled={roleUpdatingId === member._id}
                                onChange={(e) => handleUpdateRole(member._id, e.target.value)}
                                className="tp-member-role-select"
                              >
                                <option value="EDITOR">EDITOR</option>
                                <option value="VIEWER">VIEWER</option>
                              </select>
                            ) : (
                              <span className={`tp-member-role-badge ${member.role === 'OWNER' ? 'owner' : 'neutral'}`}>
                                {member.role}
                              </span>
                            )}

                            {/* Remove Member Button (Owner only, for non-owner members) */}
                            {isOwner && !isCurrentMemberOwner && (
                              <button
                                type="button"
                                onClick={() => setMemberToRemove(member)}
                                className="tp-member-remove-btn"
                                title="Remove Member"
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
            </div>

            {/* ========================================================= */}
            {/* 🌤️ WEATHER MODULE SECTION */}
            {/* ========================================================= */}
            <div id="trip-weather" className="tp-weather-section">
              <div className="tp-weather-header">
                <div className="tp-weather-title-group">
                  <div className="tp-weather-icon-box">
                    <CloudSun size={20} />
                  </div>
                  <div className="tp-weather-title-text">
                    <h3 className="tp-weather-title">
                      Weather & Destination Forecast
                    </h3>
                    <p className="tp-weather-subtitle">
                      Check forecast and analyze conditions for {trip.destination}
                    </p>
                  </div>
                </div>

                <div className="tp-weather-actions">
                  <button
                    type="button"
                    onClick={handleFetchForecast}
                    disabled={forecastLoading}
                    className="tp-weather-btn-secondary"
                  >
                    {forecastLoading ? 'Loading...' : showForecast ? 'Hide Forecast' : 'View Forecast'}
                  </button>
                  <button
                    type="button"
                    onClick={handleFetchAnalysis}
                    disabled={analysisLoading}
                    className="tp-weather-btn-primary"
                  >
                    {analysisLoading ? 'Analyzing...' : showAnalysis ? 'Hide Analysis' : 'Analyze Trip Weather'}
                  </button>
                </div>
              </div>

              {optimizeSuccessMessage && (
                <div className="tp-weather-alert tp-weather-alert-success">
                  ✓ {optimizeSuccessMessage}
                </div>
              )}

              {/* 1. OpenWeather Forecast Display */}
              {forecastError && (
                <div className="tp-weather-alert tp-weather-alert-error">
                  {forecastError}
                </div>
              )}

              {showForecast && forecastData && (
                <div className="tp-weather-forecast-block">
                  <h4 className="tp-weather-section-subtitle">
                    Trip Weather Forecast — {forecastData.city?.name || trip.destination}
                  </h4>

                  {getGroupedForecastDays().length === 0 ? (
                    <p className="tp-weather-empty-text">
                      No forecast data available for the trip dates ({formatDateToDisplay(trip.startDate)} - {formatDateToDisplay(trip.endDate)}).
                    </p>
                  ) : (
                    <div className="tp-weather-forecast-grid">
                      {getGroupedForecastDays().map((day) => (
                        <div key={day.date} className="tp-weather-day-card">
                          <p className="tp-weather-day-date">
                            {formatDateToDisplay(day.date)}
                          </p>
                          <p className="tp-weather-day-temp">
                            {Math.round(day.minTemp)}°C - {Math.round(day.maxTemp)}°C
                          </p>
                          <p className="tp-weather-day-cond">
                            {day.condition} ({formatWeatherText12Hour(day.description)})
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 2. AI Trip Weather Analysis Display */}
              {analysisError && (
                <div className="tp-weather-alert tp-weather-alert-error">
                  {analysisError}
                </div>
              )}

              {showAnalysis && analysisData && (() => {
                const daysList = analysisData?.days || [];
                const availableDaysCount = daysList.filter((d) => Boolean(d.isForecastAvailable)).length;
                const totalDaysCount = daysList.length;
                const hasSevereWeatherInAnalysis = Boolean(
                  analysisData?.hasSevereWeather ||
                  daysList.some((d) => d.hasSevereWeather)
                );
                const hasAnyForecastAvailable = Boolean(
                  analysisData?.hasAvailableForecasts !== undefined
                    ? analysisData.hasAvailableForecasts
                    : availableDaysCount > 0
                );
                const areAllForecastsAvailable = totalDaysCount > 0 && availableDaysCount === totalDaysCount;

                let overallBadgeClass = 'tp-weather-badge-fair';
                let overallBadgeText = '☀️ Fair Weather Conditions';

                if (!hasAnyForecastAvailable) {
                  overallBadgeClass = 'tp-weather-badge-unavailable';
                  overallBadgeText = 'Forecast Unavailable';
                } else if (hasSevereWeatherInAnalysis) {
                  overallBadgeClass = 'tp-weather-badge-severe';
                  overallBadgeText = '⚠️ Severe Weather Detected';
                } else if (!areAllForecastsAvailable) {
                  overallBadgeClass = 'tp-weather-badge-partial';
                  overallBadgeText = '⛅ Partial Forecast Available';
                } else {
                  overallBadgeClass = 'tp-weather-badge-fair';
                  overallBadgeText = '☀️ Fair Weather Conditions';
                }

                const fallbackOverallSummary = !hasAnyForecastAvailable
                  ? 'Weather forecast data is currently unavailable for these trip dates (forecasts are available up to 5 days in advance).'
                  : hasSevereWeatherInAnalysis
                  ? 'Severe weather conditions detected during the forecast period. Review day-by-day advisories and adjust scheduled activities accordingly.'
                  : !areAllForecastsAvailable
                  ? 'Fair weather conditions for upcoming dates with available forecast data. Remaining dates are outside the 5-day forecast window.'
                  : 'Fair weather conditions expected across all trip dates with no severe weather alerts.';

                const overallSummaryText = analysisData.overallSummary || fallbackOverallSummary;

                return (
                  <div className="tp-weather-analysis-block">
                    {/* 3. Weather Advisory Summary: distinct highlighted surface */}
                    <div className={`tp-weather-advisory-card ${!hasAnyForecastAvailable ? 'unavailable' : hasSevereWeatherInAnalysis ? 'severe' : 'fair'}`}>
                      <div className="tp-weather-advisory-header">
                        <div className="tp-weather-advisory-title-wrap">
                          <div className="tp-weather-advisory-icon-box">
                            {!hasAnyForecastAvailable ? (
                              <Calendar size={18} />
                            ) : hasSevereWeatherInAnalysis ? (
                              <AlertTriangle size={18} />
                            ) : (
                              <CloudSun size={18} />
                            )}
                          </div>
                          <h4 className="tp-weather-advisory-title">
                            Weather Advisory Summary
                          </h4>
                        </div>
                        <span className={overallBadgeClass}>
                          {overallBadgeText}
                        </span>
                      </div>

                      <p className="tp-weather-advisory-text">
                        {formatWeatherText12Hour(overallSummaryText)}
                      </p>
                    </div>

                    {/* Severe Weather Conditions List (if any) */}
                    {analysisData.severeConditions && analysisData.severeConditions.length > 0 && (
                      <div className="tp-weather-severe-box">
                        <h5 className="tp-weather-severe-heading">
                          ⚠️ Severe Conditions & Advisory Alerts:
                        </h5>
                        <ul className="tp-weather-severe-list">
                          {analysisData.severeConditions.map((c, i) => (
                            <li key={i} style={{ marginBottom: '4px' }}>
                              <strong>{c.date}:</strong>{' '}
                              {c.summaryText ? formatWeatherText12Hour(c.summaryText) : `${c.condition} (${formatWeatherText12Hour(c.description)})`}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* 4. Day-by-Day Detailed Weather Analysis */}
                    {analysisData.days && analysisData.days.length > 0 && (
                      <div className="tp-weather-days-analysis-wrap">
                        <div className="tp-weather-days-header-row">
                          <h4 className="tp-weather-days-section-title">
                            Day-by-Day Weather Analysis
                          </h4>
                        </div>
                        <div className="tp-weather-analysis-grid">
                          {analysisData.days.map((dayItem) => {
                            const forecastDay = forecastData ? getGroupedForecastDays().find((f) => f.date === dayItem.date) : null;
                            const isDayForecastAvailable = Boolean(
                              dayItem.isForecastAvailable !== undefined
                                ? dayItem.isForecastAvailable
                                : forecastDay !== null
                            );

                            let dayBadgeClass = 'tp-weather-badge-fair';
                            let dayBadgeText = '☀️ Fair';
                            let dayCardClass = 'tp-weather-analysis-day-card';

                            if (!isDayForecastAvailable) {
                              dayBadgeClass = 'tp-weather-badge-unavailable';
                              dayBadgeText = 'Forecast Unavailable';
                              dayCardClass = 'tp-weather-analysis-day-card unavailable';
                            } else if (dayItem.hasSevereWeather) {
                              dayBadgeClass = 'tp-weather-badge-severe';
                              dayBadgeText = '⚠️ Severe Alert';
                              dayCardClass = 'tp-weather-analysis-day-card severe';
                            } else {
                              dayBadgeClass = 'tp-weather-badge-fair';
                              dayBadgeText = '☀️ Fair';
                              dayCardClass = 'tp-weather-analysis-day-card';
                            }

                            return (
                              <div
                                key={dayItem.dayNumber}
                                className={dayCardClass}
                              >
                                <div className="tp-weather-day-header">
                                  <div className="tp-weather-day-meta">
                                    <span className="tp-weather-day-num-badge">
                                      Day {dayItem.dayNumber}
                                    </span>
                                    <span className="tp-weather-day-date-text">
                                      {formatDateToDisplay(dayItem.date)}
                                    </span>
                                  </div>
                                  <span className={dayBadgeClass}>
                                    {dayBadgeText}
                                  </span>
                                </div>

                                {/* Temperatures from forecast if available */}
                                {isDayForecastAvailable && forecastDay && (
                                  <p className="tp-weather-analysis-day-temp">
                                    {Math.round(forecastDay.minTemp)}°C - {Math.round(forecastDay.maxTemp)}°C
                                  </p>
                                )}

                                {/* Weather Condition - Simple muted information row */}
                                <div className="tp-weather-condition-row">
                                  <span className="tp-weather-condition-label">Condition</span>
                                  <span className="tp-weather-condition-val">
                                    {isDayForecastAvailable && dayItem.weatherConditions && dayItem.weatherConditions.length > 0 ? (
                                      dayItem.weatherConditions.map((cond, idx) => (
                                        <span key={idx}>
                                          {idx > 0 && ', '}
                                          <strong>{cond.condition}:</strong> {formatWeatherText12Hour(cond.summaryText || cond.description)}
                                        </span>
                                      ))
                                    ) : (
                                      !isDayForecastAvailable
                                        ? (dayItem.statusMessage || 'Forecast unavailable for this date')
                                        : forecastDay
                                        ? `${forecastDay.condition} (${formatWeatherText12Hour(forecastDay.description)})`
                                        : (dayItem.statusMessage || 'Good weather')
                                    )}
                                  </span>
                                </div>

                                {/* Activity & Weather Warnings - Travel Itinerary Timeline */}
                                {dayItem.activities && dayItem.activities.length > 0 && (
                                  <div className="tp-weather-analysis-activities">
                                    <div className="tp-weather-analysis-activities-label">
                                      Activities ({dayItem.activities.length})
                                    </div>
                                    <div className="tp-weather-timeline">
                                      {dayItem.activities.map((act, actIdx) => (
                                        <div key={actIdx} className="tp-weather-timeline-item">
                                          <div className="tp-weather-timeline-node" />
                                          <div className="tp-weather-timeline-content">
                                            {act.time && (
                                              <span className="tp-weather-act-time">
                                                {formatTimeTo12Hour(act.time)}
                                              </span>
                                            )}
                                            <span className="tp-weather-act-title">
                                              {act.title || act.name || 'Scheduled Activity'}
                                            </span>
                                            {isDayForecastAvailable && act.weatherWarning && (
                                              <div className="tp-weather-analysis-warning">
                                                ⚠️ {formatWeatherText12Hour(act.weatherWarning)}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
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
                      <div className="tp-weather-reoptimize-block">
                        <p className="tp-weather-reoptimize-text">
                          Bad weather alert detected! Would you like TripPilot to re-optimize your active schedule to substitute outdoor activities with safe indoor options?
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowOptimizeModal(true)}
                          className="tp-weather-btn-primary"
                        >
                          Re-Optimize Itinerary for Weather
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
              <div className="tp-delete-confirm-box">
                <h3 className="tp-delete-confirm-title">
                  Delete Trip Workspace?
                </h3>
                <p className="tp-delete-confirm-text">
                  Are you sure you want to permanently delete <strong>"{trip.title}"</strong>? This will cascade-delete all itineraries, weather alerts, and financial records. This action cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleteLoading}
                    className="tp-action-btn-danger"
                    style={{ opacity: deleteLoading ? 0.6 : 1 }}
                  >
                    {deleteLoading ? 'Deleting...' : 'Yes, Delete Trip'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirmDelete(false)}
                    className="tp-action-btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              (canEditTrip || isOwner) && (
                <div className="tp-workspace-quick-actions">
                  {canEditTrip && (
                    <Link to={`/dashboard/trip/${tripId}/edit`} className="tp-action-btn-edit">
                      Edit Trip
                    </Link>
                  )}
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => setShowConfirmDelete(true)}
                      className="tp-action-btn-delete"
                    >
                      Delete Trip
                    </button>
                  )}
                </div>
              )
            )}
              </div>
            </>
          )}
        </div>

      {/* ========================================================= */}
      {/* ➕ INVITE COLLABORATOR MODAL */}
      {/* ========================================================= */}
      {showInviteModal && (
        <div className="tp-modal-backdrop">
          <div className="tp-modal-card">
            <div className="tp-modal-header">
              <h2 className="tp-modal-title">
                Invite Collaborator
              </h2>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="tp-modal-close-btn"
                aria-label="Close"
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
              <div className="tp-modal-form-group">
                <label htmlFor="inviteEmail" className="tp-modal-label">User Email *</label>
                <input
                  id="inviteEmail"
                  type="email"
                  value={inviteForm.userEmail}
                  onChange={(e) => setInviteForm({ ...inviteForm, userEmail: e.target.value })}
                  className="tp-modal-input"
                  required
                />
              </div>

              <div className="tp-modal-form-group">
                <label htmlFor="inviteRole" className="tp-modal-label">Permission Role *</label>
                <select
                  id="inviteRole"
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  className="tp-modal-select"
                >
                  <option value="VIEWER">VIEWER (Read-only access)</option>
                  <option value="EDITOR">EDITOR (Can edit itinerary & expenses)</option>
                </select>
              </div>

              <div className="tp-modal-form-group">
                <label htmlFor="inviteMessage" className="tp-modal-label">Personal Note (Optional)</label>
                <textarea
                  id="inviteMessage"
                  value={inviteForm.inviteMessage}
                  onChange={(e) => setInviteForm({ ...inviteForm, inviteMessage: e.target.value })}
                  className="tp-modal-textarea"
                  style={{ minHeight: '70px' }}
                />
              </div>

              <div className="tp-modal-actions">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="tp-action-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="tp-action-btn-primary"
                  style={{ opacity: inviteLoading ? 0.6 : 1 }}
                >
                  {inviteLoading ? 'Sending Invite...' : 'Send Invitation'}
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
        <div className="tp-modal-backdrop">
          <div className="tp-modal-card" style={{ maxWidth: '460px' }}>
            <div className="tp-modal-header">
              <h2 className="tp-modal-title" style={{ color: '#991b1b' }}>
                Remove Member from Workspace?
              </h2>
              <button
                type="button"
                onClick={() => setMemberToRemove(null)}
                className="tp-modal-close-btn"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <p style={{ color: '#475569', fontSize: '0.92rem', marginBottom: '20px', lineHeight: '1.5' }}>
              Are you sure you want to remove <strong>{memberToRemove.userId?.name || 'this member'}</strong> ({memberToRemove.userId?.email}) from this trip workspace? They will lose access to all itineraries, weather alerts, and financial records.
            </p>

            <div className="tp-modal-actions">
              <button
                type="button"
                onClick={() => setMemberToRemove(null)}
                className="tp-action-btn-secondary"
                disabled={removeLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemoveMember}
                disabled={removeLoading}
                className="tp-action-btn-danger"
                style={{ opacity: removeLoading ? 0.6 : 1 }}
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
        <div className="tp-modal-backdrop">
          <div className="tp-modal-card" style={{ maxWidth: '500px' }}>
            <div className="tp-modal-header">
              <h2 className="tp-modal-title">
                Re-Optimize Itinerary Schedule?
              </h2>
              <button
                type="button"
                onClick={() => setShowOptimizeModal(false)}
                className="tp-modal-close-btn"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <p style={{ color: '#475569', fontSize: '0.92rem', marginBottom: '16px', lineHeight: '1.5' }}>
              TripPilot will analyze your active itinerary schedule against severe weather alert intervals and swap risky outdoor activities with safe indoor alternatives.
            </p>

            <div className="alert alert-info" style={{ marginBottom: '20px', fontSize: '0.84rem' }}>
              Your original itinerary structure will be updated, and activities optimized for weather will be marked with a weather badge.
            </div>

            {optimizeError && (
              <div className="alert alert-error" style={{ marginBottom: '16px' }}>
                {optimizeError}
              </div>
            )}

            <div className="tp-modal-actions">
              <button
                type="button"
                onClick={() => setShowOptimizeModal(false)}
                className="tp-action-btn-secondary"
                disabled={optimizeLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleOptimizeItinerary}
                disabled={optimizeLoading}
                className="tp-action-btn-primary"
                style={{ opacity: optimizeLoading ? 0.6 : 1 }}
              >
                {optimizeLoading ? 'Optimizing Schedule...' : 'Confirm Re-Optimization'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
