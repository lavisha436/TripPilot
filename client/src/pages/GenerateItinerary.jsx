import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/axios.js';

/**
 * 🤖 GenerateItinerary Page Component: AI-powered day-by-day itinerary generator, preview, and batch persistence handler.
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

  const handleGenerate = async () => {
    if (!trip) return;
    setGenerating(true);
    setError('');

    const durationDays = calculateDurationDays(trip.startDate, trip.endDate);

    const itineraryBudgetAmount =
      trip.budget?.itineraryBudget !== undefined &&
      trip.budget?.itineraryBudget !== null
        ? trip.budget.itineraryBudget
        : trip.budget?.estimated;

    const payload = {
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
        err.response?.data?.message || 'Failed to generate AI itinerary. Please try again.';
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
      const candidateTitle = `AI Itinerary (${trip?.destination || 'Option'}) - ${timeString}`;

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

  return (
    <div className="landing-container" style={{ padding: '40px 20px' }}>
      <div className="glass-card" style={{ maxWidth: '680px', width: '100%', textAlign: 'left' }}>
        <div className="badge">🤖 AI Travel Assistant</div>

        {loadingTrip && (
          <div className="placeholder-box" style={{ textAlign: 'center' }}>
            <p>Loading trip details...</p>
          </div>
        )}

        {!loadingTrip && error && (
          <div className="alert alert-error">{error}</div>
        )}

        {!loadingTrip && trip && (
          <div>
            <h1 className="page-title" style={{ fontSize: '2.2rem', marginBottom: '8px' }}>
              Generate Itinerary for {trip.title}
            </h1>
            <p className="hero-subtitle" style={{ fontSize: '1rem', marginBottom: '20px' }}>
              Destination: <strong style={{ color: '#38bdf8' }}>{trip.destination}</strong> •{' '}
              {calculateDurationDays(trip.startDate, trip.endDate)} Days
            </p>

            {/* Initial State / Generator trigger */}
            {!itinerary && (
              <div
                className="placeholder-box"
                style={{ textAlign: 'center', padding: '32px 20px', borderStyle: 'solid', marginBottom: '24px' }}
              >
                <p style={{ color: '#cbd5e1', marginBottom: '16px', fontSize: '0.95rem' }}>
                  Let TripPilot AI construct a day-by-day travel schedule tailored to your interests, budget, and travel style.
                </p>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={generating}
                  className="btn btn-primary"
                  style={{ fontSize: '1rem', padding: '12px 28px' }}
                >
                  {generating ? 'Generating your itinerary...' : '✨ Generate AI Itinerary'}
                </button>
              </div>
            )}

            {/* Preview Section */}
            {itinerary && (
              <div>
                <div
                  className="alert"
                  style={{
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: '#7dd3fc',
                    textAlign: 'center',
                    marginBottom: '20px'
                  }}
                >
                  ℹ️ AI-generated preview — review before saving.
                </div>

                {saving && saveProgress && (
                  <div className="alert alert-success" style={{ textAlign: 'center', marginBottom: '20px' }}>
                    ⏳ {saveProgress}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '24px' }}>
                  {itinerary.map((day) => (
                    <div
                      key={day.dayNumber}
                      className="placeholder-box"
                      style={{ marginBottom: '0', textAlign: 'left', borderStyle: 'solid' }}
                    >
                      <h3 style={{ color: '#ffffff', fontSize: '1.2rem', marginBottom: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '8px' }}>
                        Day {day.dayNumber} — {day.title}
                      </h3>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {day.activities?.map((act, index) => (
                          <div
                            key={index}
                            style={{
                              background: 'rgba(15, 23, 42, 0.6)',
                              padding: '12px 16px',
                              borderRadius: '12px',
                              border: '1px solid rgba(255, 255, 255, 0.08)'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span style={{ color: '#38bdf8', fontWeight: '700', fontSize: '0.85rem' }}>
                                ⏰ {formatTimeTo12Hour(act.time) || 'Schedule'}
                              </span>
                              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                                ⏱️ {act.estimatedDurationMinutes} min
                              </span>
                            </div>
                            <h4 style={{ color: '#ffffff', fontSize: '1rem', marginBottom: '4px' }}>
                              {act.title}
                            </h4>
                            {act.description && (
                              <p style={{ color: '#cbd5e1', fontSize: '0.875rem', marginBottom: '6px' }}>
                                {act.description}
                              </p>
                            )}
                            <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', color: '#94a3b8' }}>
                              {act.locationName && <span>📍 {act.locationName}</span>}
                              <span>💰 ₹{act.estimatedCost}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Preview Actions */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleAcceptAndSave}
                    disabled={saving}
                    className="btn btn-primary"
                    style={{ flex: '1' }}
                  >
                    {saving ? 'Saving Itinerary...' : '✓ Accept & Save Itinerary'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDiscard}
                    disabled={saving}
                    className="btn btn-secondary"
                  >
                    ✕ Discard
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="auth-footer" style={{ textAlign: 'center', marginTop: '16px' }}>
          <Link to={`/dashboard/trip/${tripId}`} className="btn btn-secondary btn-sm">
            ← Back to Trip Details
          </Link>
        </div>
      </div>
    </div>
  );
}
