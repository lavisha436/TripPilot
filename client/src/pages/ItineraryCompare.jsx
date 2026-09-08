import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/axios.js';

/**
 * ⚖️ ItineraryCompare Page Component: Displays side-by-side comparison of two selected itinerary candidates
 * and handles final itinerary selection activation.
 */
export default function ItineraryCompare() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const idsParam = searchParams.get('ids') || searchParams.get('versionIds') || '';
  const versionIds = idsParam.split(',').map((id) => id.trim()).filter(Boolean);

  const [comparisonData, setComparisonData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Final Selection State
  const [confirmingItinerary, setConfirmingItinerary] = useState(null);
  const [activating, setActivating] = useState(false);
  const [activateError, setActivateError] = useState('');

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

  useEffect(() => {
    if (versionIds.length !== 2) {
      setError('Invalid itinerary comparison parameters. Please select exactly two itinerary candidates to compare.');
      setLoading(false);
      return;
    }

    const fetchComparisonData = async () => {
      try {
        const response = await api.get(
          `/trips/${tripId}/itineraries/compare?versionIds=${versionIds[0]},${versionIds[1]}`
        );
        setComparisonData(response.data?.data?.itineraries || []);
      } catch (err) {
        // Resilient fallback to fetching both candidates individually if needed
        try {
          const [res1, res2] = await Promise.all([
            api.get(`/trips/${tripId}/itineraries/${versionIds[0]}`),
            api.get(`/trips/${tripId}/itineraries/${versionIds[1]}`)
          ]);

          const data1 = res1.data?.data || {};
          const data2 = res2.data?.data || {};

          setComparisonData([data1, data2]);
        } catch (fallbackErr) {
          const errorMessage =
            err.response?.data?.message ||
            fallbackErr.response?.data?.message ||
            'Failed to fetch comparison data. Please try again.';
          setError(errorMessage);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchComparisonData();
  }, [tripId, idsParam]);

  const handleInitiateSelection = (itinerary) => {
    setActivateError('');
    setConfirmingItinerary(itinerary);
  };

  const handleCancelSelection = () => {
    if (activating) return;
    setConfirmingItinerary(null);
    setActivateError('');
  };

  const handleConfirmActivate = async () => {
    if (!confirmingItinerary || !confirmingItinerary._id) return;
    setActivating(true);
    setActivateError('');

    try {
      await api.patch(`/trips/${tripId}/itineraries/${confirmingItinerary._id}/activate`);
      // Navigate to the selected itinerary details page after successful activation
      navigate(`/dashboard/trip/${tripId}/itineraries/${confirmingItinerary._id}`);
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || 'Failed to select itinerary. Please try again.';
      setActivateError(errorMessage);
      setActivating(false);
    }
  };

  // Group activities by dayNumber and sort by order
  const groupActivitiesByDay = (activitiesList = []) => {
    const grouped = {};
    activitiesList.forEach((act) => {
      const day = act.dayNumber || 1;
      if (!grouped[day]) {
        grouped[day] = [];
      }
      grouped[day].push(act);
    });

    Object.keys(grouped).forEach((day) => {
      grouped[day].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    });

    return grouped;
  };

  const candidateA = comparisonData[0] || null;
  const candidateB = comparisonData[1] || null;

  const groupedA = candidateA ? groupActivitiesByDay(candidateA.activities) : {};
  const groupedB = candidateB ? groupActivitiesByDay(candidateB.activities) : {};

  // Unique sorted list of all dayNumbers across both candidates
  const allDays = Array.from(
    new Set([...Object.keys(groupedA), ...Object.keys(groupedB)])
  )
    .map(Number)
    .sort((a, b) => a - b);

  const getCost = (cand) => {
    if (!cand) return 0;
    if (cand.itinerary?.totalEstimatedCost !== undefined) return cand.itinerary.totalEstimatedCost;
    return (cand.activities || []).reduce((sum, a) => sum + (a.estimatedCost || 0), 0);
  };

  return (
    <div className="landing-container" style={{ padding: '40px 20px' }}>
      <div className="glass-card" style={{ maxWidth: '1200px', width: '100%', textAlign: 'left' }}>
        <div className="badge">⚖️ Side-by-Side Comparison</div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
          <div>
            <h1 className="page-title" style={{ fontSize: '2.2rem', marginBottom: '4px' }}>
              Compare Itineraries
            </h1>
            <p className="hero-subtitle" style={{ fontSize: '0.95rem', margin: 0 }}>
              Evaluate schedule differences, places, and estimated costs side-by-side
            </p>
          </div>
          <Link to={`/dashboard/trip/${tripId}/itineraries`} className="btn btn-secondary btn-sm">
            ← Back to Itineraries
          </Link>
        </div>

        {loading && (
          <div className="placeholder-box" style={{ textAlign: 'center', padding: '32px 20px' }}>
            <p>Loading itinerary comparison...</p>
          </div>
        )}

        {!loading && error && (
          <div className="placeholder-box" style={{ textAlign: 'center', padding: '32px 20px', borderStyle: 'solid' }}>
            <div className="alert alert-error" style={{ marginBottom: '16px' }}>{error}</div>
            <Link to={`/dashboard/trip/${tripId}/itineraries`} className="btn btn-primary">
              ← Return to Candidate List
            </Link>
          </div>
        )}

        {/* Final Selection Confirmation Card */}
        {confirmingItinerary && (
          <div
            className="placeholder-box"
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              borderColor: 'rgba(239, 68, 68, 0.4)',
              marginBottom: '24px',
              textAlign: 'left',
              borderStyle: 'solid',
              padding: '24px'
            }}
          >
            <h3 style={{ color: '#fca5a5', fontSize: '1.2rem', marginBottom: '8px' }}>
              ⚠️ Confirm Final Itinerary Selection
            </h3>
            <p style={{ color: '#ffffff', fontSize: '1rem', fontWeight: '600', marginBottom: '8px' }}>
              Are you sure you want to use "{confirmingItinerary.title}"?
            </p>
            <p style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '16px', lineHeight: '1.5' }}>
              After you confirm, all other saved itinerary candidates for this trip will be permanently deleted. Only this itinerary will remain.
            </p>

            {activateError && (
              <div className="alert alert-error" style={{ marginBottom: '16px' }}>
                {activateError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleConfirmActivate}
                disabled={activating}
                className="btn"
                style={{
                  background: '#22c55e',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: '700',
                  opacity: activating ? 0.6 : 1,
                  cursor: activating ? 'not-allowed' : 'pointer'
                }}
              >
                {activating ? 'Selecting Itinerary...' : '✓ Yes, Use This Itinerary'}
              </button>
              <button
                type="button"
                onClick={handleCancelSelection}
                disabled={activating}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {!loading && !error && candidateA && candidateB && (
          <div>
            {/* Header Comparison Summary Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px',
                marginBottom: '24px'
              }}
            >
              {/* Candidate A Summary Card */}
              <div
                className="placeholder-box"
                style={{
                  marginBottom: 0,
                  textAlign: 'left',
                  borderStyle: 'solid',
                  borderColor: candidateA.itinerary?.isActive ? 'rgba(56, 189, 248, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                  background: candidateA.itinerary?.isActive ? 'rgba(56, 189, 248, 0.08)' : 'rgba(15, 23, 42, 0.7)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <h3 style={{ color: '#ffffff', fontSize: '1.2rem', margin: 0 }}>
                    {candidateA.itinerary?.title}
                  </h3>
                  {candidateA.itinerary?.isActive && (
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: '50px',
                        background: 'rgba(56, 189, 248, 0.25)',
                        color: '#38bdf8'
                      }}
                    >
                      ⭐ Active
                    </span>
                  )}
                </div>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '12px' }}>
                  {candidateA.itinerary?.source === 'AI_GENERATED' ? '✨ AI Generated' : '✍️ Manual Plan'}
                </p>
                <div style={{ fontSize: '0.9rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
                  <span>🎯 <strong>{candidateA.activities?.length || 0}</strong> Activities</span>
                  <span>💰 Estimated Cost: <strong>₹{getCost(candidateA)}</strong></span>
                </div>

                <div style={{ marginTop: 'auto' }}>
                  {candidateA.itinerary?.isActive ? (
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '0.85rem',
                        fontWeight: '700',
                        padding: '8px 16px',
                        borderRadius: '50px',
                        background: 'rgba(56, 189, 248, 0.25)',
                        color: '#38bdf8',
                        border: '1px solid rgba(56, 189, 248, 0.4)'
                      }}
                    >
                      ⭐ Active Itinerary
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleInitiateSelection(candidateA.itinerary)}
                      disabled={activating}
                      className="btn btn-primary btn-sm"
                      style={{
                        width: '100%',
                        fontSize: '0.9rem',
                        opacity: activating ? 0.6 : 1,
                        cursor: activating ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {activating && confirmingItinerary?._id === candidateA.itinerary?._id
                        ? 'Selecting Itinerary...'
                        : '✅ Use This Itinerary'}
                    </button>
                  )}
                </div>
              </div>

              {/* Candidate B Summary Card */}
              <div
                className="placeholder-box"
                style={{
                  marginBottom: 0,
                  textAlign: 'left',
                  borderStyle: 'solid',
                  borderColor: candidateB.itinerary?.isActive ? 'rgba(56, 189, 248, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                  background: candidateB.itinerary?.isActive ? 'rgba(56, 189, 248, 0.08)' : 'rgba(15, 23, 42, 0.7)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <h3 style={{ color: '#ffffff', fontSize: '1.2rem', margin: 0 }}>
                    {candidateB.itinerary?.title}
                  </h3>
                  {candidateB.itinerary?.isActive && (
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: '50px',
                        background: 'rgba(56, 189, 248, 0.25)',
                        color: '#38bdf8'
                      }}
                    >
                      ⭐ Active
                    </span>
                  )}
                </div>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '12px' }}>
                  {candidateB.itinerary?.source === 'AI_GENERATED' ? '✨ AI Generated' : '✍️ Manual Plan'}
                </p>
                <div style={{ fontSize: '0.9rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
                  <span>🎯 <strong>{candidateB.activities?.length || 0}</strong> Activities</span>
                  <span>💰 Estimated Cost: <strong>₹{getCost(candidateB)}</strong></span>
                </div>

                <div style={{ marginTop: 'auto' }}>
                  {candidateB.itinerary?.isActive ? (
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '0.85rem',
                        fontWeight: '700',
                        padding: '8px 16px',
                        borderRadius: '50px',
                        background: 'rgba(56, 189, 248, 0.25)',
                        color: '#38bdf8',
                        border: '1px solid rgba(56, 189, 248, 0.4)'
                      }}
                    >
                      ⭐ Active Itinerary
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleInitiateSelection(candidateB.itinerary)}
                      disabled={activating}
                      className="btn btn-primary btn-sm"
                      style={{
                        width: '100%',
                        fontSize: '0.9rem',
                        opacity: activating ? 0.6 : 1,
                        cursor: activating ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {activating && confirmingItinerary?._id === candidateB.itinerary?._id
                        ? 'Selecting Itinerary...'
                        : '✅ Use This Itinerary'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Day-by-Day Schedule Grid Comparison */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '24px' }}>
              {allDays.map((dayNum) => {
                const dayActivitiesA = groupedA[dayNum] || [];
                const dayActivitiesB = groupedB[dayNum] || [];

                return (
                  <div key={dayNum}>
                    <h3
                      style={{
                        color: '#38bdf8',
                        fontSize: '1.15rem',
                        marginBottom: '12px',
                        borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
                        paddingBottom: '6px'
                      }}
                    >
                      Day {dayNum} Schedule Comparison
                    </h3>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '16px'
                      }}
                    >
                      {/* Candidate A Day Activities */}
                      <div
                        className="placeholder-box"
                        style={{ marginBottom: 0, textAlign: 'left', borderStyle: 'solid', background: 'rgba(15, 23, 42, 0.5)' }}
                      >
                        <h4 style={{ color: '#ffffff', fontSize: '0.95rem', marginBottom: '10px', opacity: 0.8 }}>
                          {candidateA.itinerary?.title} (Day {dayNum})
                        </h4>

                        {dayActivitiesA.length === 0 ? (
                          <p style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>
                            No activities planned for Day {dayNum}.
                          </p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {dayActivitiesA.map((act) => (
                              <div
                                key={act._id}
                                style={{
                                  background: 'rgba(15, 23, 42, 0.7)',
                                  padding: '12px 14px',
                                  borderRadius: '10px',
                                  border: '1px solid rgba(255, 255, 255, 0.08)'
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                  <span style={{ color: '#38bdf8', fontWeight: '700', fontSize: '0.8rem' }}>
                                    ⏰ {formatTimeTo12Hour(act.time) || 'Schedule'}
                                  </span>
                                  <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                                    ⏱️ {act.estimatedDurationMinutes}m
                                  </span>
                                </div>
                                <p style={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: '600', marginBottom: '4px' }}>
                                  {act.title}
                                </p>
                                {act.description && (
                                  <p style={{ color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '6px', lineHeight: '1.3' }}>
                                    {act.description}
                                  </p>
                                )}
                                <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', color: '#94a3b8', flexWrap: 'wrap' }}>
                                  {act.location?.name && <span>📍 {act.location.name}</span>}
                                  <span>💰 ₹{act.estimatedCost}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Candidate B Day Activities */}
                      <div
                        className="placeholder-box"
                        style={{ marginBottom: 0, textAlign: 'left', borderStyle: 'solid', background: 'rgba(15, 23, 42, 0.5)' }}
                      >
                        <h4 style={{ color: '#ffffff', fontSize: '0.95rem', marginBottom: '10px', opacity: 0.8 }}>
                          {candidateB.itinerary?.title} (Day {dayNum})
                        </h4>

                        {dayActivitiesB.length === 0 ? (
                          <p style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>
                            No activities planned for Day {dayNum}.
                          </p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {dayActivitiesB.map((act) => (
                              <div
                                key={act._id}
                                style={{
                                  background: 'rgba(15, 23, 42, 0.7)',
                                  padding: '12px 14px',
                                  borderRadius: '10px',
                                  border: '1px solid rgba(255, 255, 255, 0.08)'
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                  <span style={{ color: '#38bdf8', fontWeight: '700', fontSize: '0.8rem' }}>
                                    ⏰ {formatTimeTo12Hour(act.time) || 'Schedule'}
                                  </span>
                                  <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                                    ⏱️ {act.estimatedDurationMinutes}m
                                  </span>
                                </div>
                                <p style={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: '600', marginBottom: '4px' }}>
                                  {act.title}
                                </p>
                                {act.description && (
                                  <p style={{ color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '6px', lineHeight: '1.3' }}>
                                    {act.description}
                                  </p>
                                )}
                                <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', color: '#94a3b8', flexWrap: 'wrap' }}>
                                  {act.location?.name && <span>📍 {act.location.name}</span>}
                                  <span>💰 ₹{act.estimatedCost}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="auth-footer" style={{ textAlign: 'center', marginTop: '20px' }}>
          <Link to={`/dashboard/trip/${tripId}/itineraries`} className="btn btn-secondary btn-sm">
            ← Back to Itineraries
          </Link>
        </div>
      </div>
    </div>
  );
}
