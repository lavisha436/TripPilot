import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/axios.js';
import {
  ArrowLeft,
  Scale,
  Star,
  Check,
  AlertTriangle,
  Clock,
  MapPin,
  Calendar,
  Loader2
} from 'lucide-react';

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
    <div className="tp-workspace-subpage">
      <div className="tp-subpage-container" style={{ maxWidth: '1200px' }}>
        {/* Header */}
        <div className="tp-subpage-header">
          <Link to={`/dashboard/trip/${tripId}/itineraries`} className="tp-subpage-back-link">
            <ArrowLeft size={16} />
            <span>Back to Itineraries</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: '600',
                padding: '3px 10px',
                borderRadius: '50px',
                background: 'rgba(234, 88, 12, 0.08)',
                color: '#ea580c',
                border: '1px solid rgba(234, 88, 12, 0.18)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Scale size={12} /> Side-by-Side Comparison
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginTop: '6px' }}>
            <div>
              <h1 className="tp-subpage-title" style={{ margin: 0 }}>
                Compare Itineraries
              </h1>
              <p className="tp-subpage-subtitle" style={{ margin: '4px 0 0 0' }}>
                Evaluate schedule differences, places, and estimated costs side-by-side
              </p>
            </div>
            <Link to={`/dashboard/trip/${tripId}/itineraries`} className="tp-action-btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <ArrowLeft size={15} /> Back to Itineraries
            </Link>
          </div>
        </div>

        {loading && (
          <div
            style={{
              background: '#ffffff',
              border: '1px solid rgba(15, 23, 42, 0.08)',
              borderRadius: '16px',
              padding: '48px 24px',
              textAlign: 'center'
            }}
          >
            <Loader2 size={28} className="animate-spin" style={{ color: '#ea580c', margin: '0 auto 12px auto' }} />
            <p style={{ color: '#64748b', fontSize: '0.92rem', margin: 0 }}>Loading itinerary comparison...</p>
          </div>
        )}

        {!loading && error && (
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #fecaca',
              borderRadius: '16px',
              padding: '32px 24px',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                marginBottom: '16px',
                padding: '12px 18px',
                background: '#fef2f2',
                borderRadius: '8px',
                color: '#991b1b',
                fontSize: '0.92rem'
              }}
            >
              {error}
            </div>
            <Link to={`/dashboard/trip/${tripId}/itineraries`} className="tp-action-btn-primary">
              Return to Candidate List
            </Link>
          </div>
        )}

        {/* Final Selection Confirmation Card */}
        {confirmingItinerary && (
          <div
            style={{
              background: '#fff7ed',
              border: '1px solid #fed7aa',
              borderRadius: '16px',
              marginBottom: '24px',
              padding: '24px',
              boxShadow: '0 4px 20px rgba(234, 88, 12, 0.06)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <AlertTriangle size={18} style={{ color: '#ea580c' }} />
              <h3 style={{ color: '#9a3412', fontSize: '1.15rem', fontWeight: '700', margin: 0 }}>
                Confirm Final Itinerary Selection
              </h3>
            </div>
            <p style={{ color: '#0f172a', fontSize: '1rem', fontWeight: '600', marginBottom: '6px' }}>
              Are you sure you want to use "{confirmingItinerary.title}"?
            </p>
            <p style={{ color: '#7c2d12', fontSize: '0.88rem', marginBottom: '18px', lineHeight: '1.5' }}>
              After you confirm, all other saved itinerary candidates for this trip will be permanently removed. Only this itinerary will remain.
            </p>

            {activateError && (
              <div
                style={{
                  marginBottom: '14px',
                  padding: '10px 14px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  color: '#991b1b',
                  fontSize: '0.85rem'
                }}
              >
                {activateError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleConfirmActivate}
                disabled={activating}
                className="tp-action-btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Check size={16} />
                {activating ? 'Selecting Itinerary...' : 'Yes, Use This Itinerary'}
              </button>
              <button
                type="button"
                onClick={handleCancelSelection}
                disabled={activating}
                className="tp-action-btn-secondary"
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
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '20px',
                marginBottom: '28px'
              }}
            >
              {/* Candidate A Summary Card */}
              <div
                style={{
                  background: '#ffffff',
                  border: candidateA.itinerary?.isActive ? '2px solid #ea580c' : '1px solid rgba(15, 23, 42, 0.08)',
                  borderRadius: '16px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 2px 12px rgba(15, 23, 42, 0.03)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <h3 style={{ color: '#0f172a', fontSize: '1.2rem', fontWeight: '700', margin: 0 }}>
                    {candidateA.itinerary?.title}
                  </h3>
                  {candidateA.itinerary?.isActive && (
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        padding: '3px 8px',
                        borderRadius: '50px',
                        background: 'rgba(234, 88, 12, 0.1)',
                        color: '#ea580c',
                        border: '1px solid rgba(234, 88, 12, 0.25)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Star size={11} /> Active
                    </span>
                  )}
                </div>
                <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '14px' }}>
                  {candidateA.itinerary?.source === 'AI_GENERATED' ? 'Smart Plan' : 'Manual Plan'}
                </p>
                <div style={{ fontSize: '0.88rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '18px' }}>
                  <span>Activities: <strong style={{ color: '#0f172a' }}>{candidateA.activities?.length || 0}</strong></span>
                  <span>Estimated Cost: <strong style={{ color: '#0f172a' }}>₹{Number(getCost(candidateA)).toLocaleString('en-IN')}</strong></span>
                </div>

                <div style={{ marginTop: 'auto' }}>
                  {candidateA.itinerary?.isActive ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.85rem',
                        fontWeight: '700',
                        padding: '8px 16px',
                        borderRadius: '50px',
                        background: 'rgba(234, 88, 12, 0.08)',
                        color: '#ea580c',
                        border: '1px solid rgba(234, 88, 12, 0.2)'
                      }}
                    >
                      <Star size={13} /> Active Itinerary
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleInitiateSelection(candidateA.itinerary)}
                      disabled={activating}
                      className="tp-action-btn-primary"
                      style={{
                        width: '100%',
                        fontSize: '0.88rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <Check size={16} />
                      {activating && confirmingItinerary?._id === candidateA.itinerary?._id
                        ? 'Selecting Itinerary...'
                        : 'Use This Itinerary'}
                    </button>
                  )}
                </div>
              </div>

              {/* Candidate B Summary Card */}
              <div
                style={{
                  background: '#ffffff',
                  border: candidateB.itinerary?.isActive ? '2px solid #ea580c' : '1px solid rgba(15, 23, 42, 0.08)',
                  borderRadius: '16px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 2px 12px rgba(15, 23, 42, 0.03)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <h3 style={{ color: '#0f172a', fontSize: '1.2rem', fontWeight: '700', margin: 0 }}>
                    {candidateB.itinerary?.title}
                  </h3>
                  {candidateB.itinerary?.isActive && (
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        padding: '3px 8px',
                        borderRadius: '50px',
                        background: 'rgba(234, 88, 12, 0.1)',
                        color: '#ea580c',
                        border: '1px solid rgba(234, 88, 12, 0.25)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Star size={11} /> Active
                    </span>
                  )}
                </div>
                <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '14px' }}>
                  {candidateB.itinerary?.source === 'AI_GENERATED' ? 'Smart Plan' : 'Manual Plan'}
                </p>
                <div style={{ fontSize: '0.88rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '18px' }}>
                  <span>Activities: <strong style={{ color: '#0f172a' }}>{candidateB.activities?.length || 0}</strong></span>
                  <span>Estimated Cost: <strong style={{ color: '#0f172a' }}>₹{Number(getCost(candidateB)).toLocaleString('en-IN')}</strong></span>
                </div>

                <div style={{ marginTop: 'auto' }}>
                  {candidateB.itinerary?.isActive ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.85rem',
                        fontWeight: '700',
                        padding: '8px 16px',
                        borderRadius: '50px',
                        background: 'rgba(234, 88, 12, 0.08)',
                        color: '#ea580c',
                        border: '1px solid rgba(234, 88, 12, 0.2)'
                      }}
                    >
                      <Star size={13} /> Active Itinerary
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleInitiateSelection(candidateB.itinerary)}
                      disabled={activating}
                      className="tp-action-btn-primary"
                      style={{
                        width: '100%',
                        fontSize: '0.88rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <Check size={16} />
                      {activating && confirmingItinerary?._id === candidateB.itinerary?._id
                        ? 'Selecting Itinerary...'
                        : 'Use This Itinerary'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Day-by-Day Schedule Grid Comparison */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '28px' }}>
              {allDays.map((dayNum) => {
                const dayActivitiesA = groupedA[dayNum] || [];
                const dayActivitiesB = groupedB[dayNum] || [];

                return (
                  <div
                    key={dayNum}
                    style={{
                      background: '#ffffff',
                      border: '1px solid rgba(15, 23, 42, 0.08)',
                      borderRadius: '16px',
                      padding: '24px',
                      boxShadow: '0 2px 10px rgba(15, 23, 42, 0.02)'
                    }}
                  >
                    <h3
                      style={{
                        color: '#0f172a',
                        fontSize: '1.15rem',
                        fontWeight: '700',
                        marginBottom: '16px',
                        borderBottom: '1px solid rgba(15, 23, 42, 0.06)',
                        paddingBottom: '8px'
                      }}
                    >
                      Day {dayNum} Schedule Comparison
                    </h3>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: '20px'
                      }}
                    >
                      {/* Candidate A Day Activities */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <h4 style={{ color: '#475569', fontSize: '0.9rem', fontWeight: '700', margin: '0 0 6px 0' }}>
                          {candidateA.itinerary?.title}
                        </h4>

                        {dayActivitiesA.length === 0 ? (
                          <p style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic', margin: 0 }}>
                            No activities planned for Day {dayNum}.
                          </p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {dayActivitiesA.map((act) => (
                              <div
                                key={act._id}
                                style={{
                                  background: '#f8fafc',
                                  padding: '12px 14px',
                                  borderRadius: '10px',
                                  border: '1px solid rgba(15, 23, 42, 0.06)'
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                  <span style={{ color: '#ea580c', fontWeight: '700', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Clock size={12} /> {formatTimeTo12Hour(act.time) || 'Flexible'}
                                  </span>
                                  {act.estimatedDurationMinutes && (
                                    <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                                      {act.estimatedDurationMinutes}m
                                    </span>
                                  )}
                                </div>
                                <p style={{ color: '#0f172a', fontSize: '0.92rem', fontWeight: '600', margin: '0 0 4px 0' }}>
                                  {act.title}
                                </p>
                                {act.description && (
                                  <p style={{ color: '#475569', fontSize: '0.82rem', margin: '0 0 6px 0', lineHeight: '1.4' }}>
                                    {act.description}
                                  </p>
                                )}
                                <div style={{ display: 'flex', gap: '12px', fontSize: '0.78rem', color: '#64748b', flexWrap: 'wrap' }}>
                                  {act.location?.name && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                      <MapPin size={11} style={{ color: '#ea580c' }} /> {act.location.name}
                                    </span>
                                  )}
                                  {act.estimatedCost !== undefined && (
                                    <span>₹{Number(act.estimatedCost).toLocaleString('en-IN')}</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Candidate B Day Activities */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <h4 style={{ color: '#475569', fontSize: '0.9rem', fontWeight: '700', margin: '0 0 6px 0' }}>
                          {candidateB.itinerary?.title}
                        </h4>

                        {dayActivitiesB.length === 0 ? (
                          <p style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic', margin: 0 }}>
                            No activities planned for Day {dayNum}.
                          </p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {dayActivitiesB.map((act) => (
                              <div
                                key={act._id}
                                style={{
                                  background: '#f8fafc',
                                  padding: '12px 14px',
                                  borderRadius: '10px',
                                  border: '1px solid rgba(15, 23, 42, 0.06)'
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                  <span style={{ color: '#ea580c', fontWeight: '700', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Clock size={12} /> {formatTimeTo12Hour(act.time) || 'Flexible'}
                                  </span>
                                  {act.estimatedDurationMinutes && (
                                    <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                                      {act.estimatedDurationMinutes}m
                                    </span>
                                  )}
                                </div>
                                <p style={{ color: '#0f172a', fontSize: '0.92rem', fontWeight: '600', margin: '0 0 4px 0' }}>
                                  {act.title}
                                </p>
                                {act.description && (
                                  <p style={{ color: '#475569', fontSize: '0.82rem', margin: '0 0 6px 0', lineHeight: '1.4' }}>
                                    {act.description}
                                  </p>
                                )}
                                <div style={{ display: 'flex', gap: '12px', fontSize: '0.78rem', color: '#64748b', flexWrap: 'wrap' }}>
                                  {act.location?.name && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                      <MapPin size={11} style={{ color: '#ea580c' }} /> {act.location.name}
                                    </span>
                                  )}
                                  {act.estimatedCost !== undefined && (
                                    <span>₹{Number(act.estimatedCost).toLocaleString('en-IN')}</span>
                                  )}
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

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <Link to={`/dashboard/trip/${tripId}/itineraries`} className="tp-action-btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={16} /> Back to Itineraries
          </Link>
        </div>
      </div>
    </div>
  );
}
