import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/axios.js';
import {
  Wand2,
  MapPin,
  Clock
} from 'lucide-react';

/**
 * 🧭 GenerateItinerary Page Component: Day-by-day itinerary generator, preview, and candidate persistence handler.
 */
export default function GenerateItinerary() {
  const { tripId } = useParams();
  const navigate = useNavigate();

  const [trip, setTrip] = useState(null);
  const [itinerary, setItinerary] = useState(null);
  const [loadingTrip, setLoadingTrip] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTripDetails = async () => {
      try {
        const response = await api.get(`/trips/${tripId}`);
        setTrip(response.data?.data?.trip || null);
      } catch (err) {
        const errorMessage =
          err.response?.data?.message || 'Failed to fetch trip details. Please try again.';
        setError(errorMessage);
      } finally {
        setLoadingTrip(false);
      }
    };

    fetchTripDetails();
  }, [tripId]);

  // Calculates inclusive trip duration in days
  const calculateDurationDays = (startDateStr, endDateStr) => {
    if (!startDateStr || !endDateStr) return 1;
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 1;
  };

  // Presentation-only helper for 12-hour AM/PM time formatting
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

  // Calculates effective itinerary budget:
  // 1. Prefer explicitly allocated positive itineraryBudget (>0)
  // 2. Otherwise calculate unreserved budget (estimated - reserved total)
  // 3. Otherwise fall back to total estimated budget (>0)
  const getEffectiveItineraryBudget = (tripObj) => {
    if (!tripObj || !tripObj.budget) return 0;
    const itin = Number(tripObj.budget.itineraryBudget);
    const est = Number(tripObj.budget.estimated);
    const reservedTotal =
      (Number(tripObj.budget.reserved?.intercityTransport) || 0) +
      (Number(tripObj.budget.reserved?.accommodation) || 0) +
      (Number(tripObj.budget.reserved?.buffer) || 0);

    if (Number.isFinite(itin) && itin > 0) return itin;
    if (Number.isFinite(est) && est > 0) {
      const remaining = est - reservedTotal;
      return remaining > 0 ? remaining : est;
    }
    return 0;
  };

  const handleGenerate = async () => {
    if (!trip) return;
    setGenerating(true);
    setError('');

    const durationDays = calculateDurationDays(trip.startDate, trip.endDate);
    const itineraryBudgetAmount = getEffectiveItineraryBudget(trip);

    if (!itineraryBudgetAmount || itineraryBudgetAmount <= 0) {
      setError(
        'A valid trip budget is required to generate an itinerary. Please set or update your trip budget.'
      );
      setGenerating(false);
      return;
    }

    const payload = {
      tripId: trip._id,
      destination: trip.destination,
      budget: itineraryBudgetAmount,
      travelerCount: trip.travelerCount || 1,
      durationDays: durationDays,
      travelCompanion: trip.travelCompanion || 'SOLO',
      budgetType: trip.budgetType || 'MID_RANGE',
      interests: trip.interests && trip.interests.length > 0 ? trip.interests : ['Sightseeing']
    };

    try {
      const response = await api.post('/ai/generate-itinerary', payload);
      const generatedItinerary = response.data?.data?.itinerary || [];
      setItinerary(generatedItinerary);
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || 'Failed to generate itinerary. Please try again.';
      setError(errorMessage);
    } finally {
      setGenerating(false);
    }
  };

  const handleDiscard = () => {
    setItinerary(null);
    setError('');
    setSaveProgress('');
  };

  const handleAcceptAndSave = async () => {
    if (!itinerary || !Array.isArray(itinerary) || itinerary.length === 0) return;
    setSaving(true);
    setError('');

    try {
      const activitiesPayload = [];
      itinerary.forEach((day) => {
        const dayNumber = day.dayNumber;
        (day.activities || []).forEach((act) => {
          activitiesPayload.push({
            dayNumber: dayNumber,
            time: act.time || '09:00',
            title: act.title,
            description: act.description || '',
            locationName: act.locationName || '',
            estimatedCost: Number(act.estimatedCost) || 0,
            estimatedDurationMinutes: Number(act.estimatedDurationMinutes) || 60
          });
        });
      });

      const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const candidateTitle = `Smart Itinerary (${trip?.destination || 'Option'}) - ${timeString}`;

      const candidatePayload = {
        title: candidateTitle,
        source: 'AI_GENERATED',
        activities: activitiesPayload
      };

      await api.post(`/trips/${tripId}/itineraries`, candidatePayload);

      // Navigate to candidate version list after saving candidate
      navigate(`/dashboard/trip/${tripId}/itineraries`);
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || 'Failed to save itinerary candidate. Please try again.';
      setError(errorMessage);
    } finally {
      setSaving(false);
      setSaveProgress('');
    }
  };

  const effectiveItineraryBudget = getEffectiveItineraryBudget(trip);

  return (
    <div className="tp-workspace-content-inner" style={{ maxWidth: '820px' }}>
          {loadingTrip ? (
            <div className="tp-workspace-loading-box">
              <p>Loading trip details...</p>
            </div>
          ) : error && !trip ? (
            <div className="alert alert-error" style={{ marginBottom: '20px' }}>
              {error}
            </div>
          ) : trip ? (
            <>
              {/* Main Content Header */}
              <header className="tp-trip-overview-header" style={{ marginBottom: '28px' }}>
                <div className="tp-trip-overview-header-left">
                  <div className="tp-trip-overview-eyebrow">
                    <span className="tp-trip-overview-line" />
                    <span>TRIP PLANNING</span>
                  </div>

                  <h1 className="tp-trip-overview-title" style={{ fontSize: '2.4rem', marginBottom: '8px' }}>
                    Create Your Itinerary
                  </h1>

                  <div className="tp-generate-header-context">
                    <div className="tp-generate-trip-title">{trip.title}</div>
                    <div className="tp-generate-trip-details">
                      <MapPin size={15} className="tp-generate-pin" />
                      <span>{trip.destination}</span>
                      <span className="tp-meta-dot">•</span>
                      <span>{calculateDurationDays(trip.startDate, trip.endDate)} Days</span>
                      {effectiveItineraryBudget > 0 && (
                        <>
                          <span className="tp-meta-dot">•</span>
                          <span>
                            {trip.budget?.currency === 'INR' ? '₹' : `${trip.budget?.currency || '₹'} `}
                            {effectiveItineraryBudget.toLocaleString()} Itinerary Budget
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </header>

              {effectiveItineraryBudget <= 0 && !error && (
                <div
                  className="tp-create-trip-alert tp-create-trip-alert-warning"
                  style={{ marginBottom: '20px' }}
                >
                  <span>
                    No budget has been set for this trip yet. Please{' '}
                    <Link
                      to={`/dashboard/trip/${tripId}/edit`}
                      style={{ fontWeight: 600, color: '#b45309', textDecoration: 'underline' }}
                    >
                      set an estimated trip budget
                    </Link>{' '}
                    to enable personalized itinerary generation.
                  </span>
                </div>
              )}

              {error && (
                <div className="alert alert-error" style={{ marginBottom: '20px' }}>
                  {error}
                </div>
              )}

              {/* Initial State / Generator trigger */}
              {!itinerary && (
                <div className="tp-generate-panel">
                  <div className="tp-generate-icon-box">
                    <Wand2 size={28} />
                  </div>
                  <h2 className="tp-generate-panel-title">Build Your Journey</h2>
                  <p className="tp-generate-panel-desc">
                    TripPilot will curate a personalized day-by-day itinerary tailored to your travel preferences, budget, duration, and selected interests.
                  </p>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={generating || effectiveItineraryBudget <= 0}
                    className="tp-generate-action-btn"
                  >
                    {generating ? (
                      <>
                        <span className="tp-spinner-sm" />
                        <span>Generating itinerary...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 size={18} />
                        <span>Generate Itinerary</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Preview Section */}
              {itinerary && (
                <div>
                  <div className="tp-preview-notice-banner">
                    <span className="tp-preview-notice-icon">✓</span>
                    <span>Itinerary preview generated — review your schedule before saving as a version.</span>
                  </div>

                  {saving && saveProgress && (
                    <div className="alert alert-success" style={{ textAlign: 'center', marginBottom: '20px' }}>
                      {saveProgress}
                    </div>
                  )}

                  <div className="tp-generate-preview-days">
                    {itinerary.map((day) => (
                      <div key={day.dayNumber} className="tp-generate-day-card">
                        <div className="tp-generate-day-header">
                          <span className="tp-generate-day-badge">Day {day.dayNumber}</span>
                          <h3 className="tp-generate-day-title">{day.title}</h3>
                        </div>

                        <div className="tp-generate-activities-list">
                          {day.activities?.map((act, index) => (
                            <div key={index} className="tp-generate-activity-item">
                              <div className="tp-generate-activity-top">
                                <span className="tp-generate-activity-time">
                                  <Clock size={14} />
                                  <span>{formatTimeTo12Hour(act.time) || 'Schedule'}</span>
                                </span>
                                <span className="tp-generate-activity-duration">
                                  {act.estimatedDurationMinutes} min
                                </span>
                              </div>
                              <h4 className="tp-generate-activity-title">{act.title}</h4>
                              {act.description && (
                                <p className="tp-generate-activity-desc">{act.description}</p>
                              )}
                              <div className="tp-generate-activity-meta">
                                {act.locationName && (
                                  <span className="tp-generate-act-meta-item">
                                    <MapPin size={13} className="tp-generate-pin" />
                                    <span>{act.locationName}</span>
                                  </span>
                                )}
                                <span className="tp-generate-act-meta-item">
                                  <span>₹{act.estimatedCost}</span>
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Preview Actions */}
                  <div className="tp-generate-preview-actions">
                    <button
                      type="button"
                      onClick={handleAcceptAndSave}
                      disabled={saving}
                      className="tp-action-btn-primary"
                      style={{ padding: '11px 24px', fontSize: '0.92rem' }}
                    >
                      {saving ? 'Saving Itinerary...' : 'Accept & Save Itinerary'}
                    </button>
                    <button
                      type="button"
                      onClick={handleDiscard}
                      disabled={saving}
                      className="tp-action-btn-secondary"
                      style={{ padding: '11px 20px', fontSize: '0.92rem' }}
                    >
                      Discard
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
  );
}
