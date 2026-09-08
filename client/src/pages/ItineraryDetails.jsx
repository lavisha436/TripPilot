import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios.js';
import { formatDateToDisplay } from '../utils/dateUtils.js';

/**
 * 🗺️ ItineraryDetails Page Component: Displays activities for a specific itinerary candidate.
 */
export default function ItineraryDetails() {
  const { tripId, itineraryId } = useParams();

  const [itinerary, setItinerary] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    const fetchItineraryDetails = async () => {
      try {
        const response = await api.get(`/trips/${tripId}/itineraries/${itineraryId}`);
        setItinerary(response.data?.data?.itinerary || null);
        setActivities(response.data?.data?.activities || []);
      } catch (err) {
        const errorMessage =
          err.response?.data?.message || 'Failed to fetch itinerary candidate details. Please try again.';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchItineraryDetails();
  }, [tripId, itineraryId]);

  // Group activities by dayNumber and sort by order
  const getGroupedActivities = () => {
    const grouped = {};
    activities.forEach((act) => {
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

  const groupedActivities = getGroupedActivities();
  const sortedDayNumbers = Object.keys(groupedActivities).map(Number).sort((a, b) => a - b);

  return (
    <div className="landing-container" style={{ padding: '40px 20px' }}>
      <div className="glass-card" style={{ maxWidth: '680px', width: '100%', textAlign: 'left' }}>
        <div className="badge">🗺️ Itinerary Candidate View</div>

        {loading && (
          <div className="placeholder-box" style={{ textAlign: 'center', padding: '32px 20px' }}>
            <p>Loading itinerary schedule...</p>
          </div>
        )}

        {!loading && error && (
          <div className="alert alert-error">{error}</div>
        )}

        {!loading && !error && itinerary && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <h1 className="page-title" style={{ fontSize: '2rem', margin: 0 }}>
                  {itinerary.title}
                </h1>
                {itinerary.isActive && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      padding: '4px 10px',
                      borderRadius: '50px',
                      background: 'rgba(56, 189, 248, 0.25)',
                      color: '#38bdf8',
                      border: '1px solid rgba(56, 189, 248, 0.4)'
                    }}
                  >
                    ⭐ Active Itinerary
                  </span>
                )}
              </div>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                {itinerary.source === 'AI_GENERATED' ? '✨ AI Generated' : '✍️ Manual Plan'} • Created {formatDateToDisplay(itinerary.createdAt)}
              </p>
            </div>

            {activities.length === 0 ? (
              <div className="placeholder-box" style={{ textAlign: 'center', padding: '32px 20px' }}>
                <p style={{ color: '#cbd5e1' }}>No activities found for this candidate.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '24px' }}>
                {sortedDayNumbers.map((dayNum) => (
                  <div
                    key={dayNum}
                    className="placeholder-box"
                    style={{ marginBottom: '0', textAlign: 'left', borderStyle: 'solid' }}
                  >
                    <h3
                      style={{
                        color: '#ffffff',
                        fontSize: '1.2rem',
                        marginBottom: '12px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        paddingBottom: '8px'
                      }}
                    >
                      Day {dayNum}
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {groupedActivities[dayNum].map((act) => (
                        <div
                          key={act._id}
                          style={{
                            background: act.isCompleted ? 'rgba(34, 197, 94, 0.08)' : 'rgba(15, 23, 42, 0.6)',
                            padding: '14px 18px',
                            borderRadius: '12px',
                            border: act.isCompleted
                              ? '1px solid rgba(34, 197, 94, 0.3)'
                              : '1px solid rgba(255, 255, 255, 0.08)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ color: '#38bdf8', fontWeight: '700', fontSize: '0.85rem' }}>
                              ⏰ {formatTimeTo12Hour(act.time) || 'Schedule'}
                            </span>
                            <span
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                padding: '3px 10px',
                                borderRadius: '50px',
                                background: act.isCompleted ? 'rgba(34, 197, 94, 0.2)' : 'rgba(148, 163, 184, 0.15)',
                                color: act.isCompleted ? '#86efac' : '#94a3b8'
                              }}
                            >
                              {act.isCompleted ? '✓ Completed' : '○ Pending'}
                            </span>
                          </div>

                          <h4
                            style={{
                              color: act.isCompleted ? '#94a3b8' : '#ffffff',
                              fontSize: '1.05rem',
                              marginBottom: '4px',
                              textDecoration: act.isCompleted ? 'line-through' : 'none'
                            }}
                          >
                            {act.isCompleted ? `✓ ${act.title}` : `○ ${act.title}`}
                          </h4>

                          {act.description && (
                            <p style={{ color: '#cbd5e1', fontSize: '0.875rem', marginBottom: '8px', lineHeight: '1.4' }}>
                              {act.description}
                            </p>
                          )}

                          <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', color: '#94a3b8', flexWrap: 'wrap' }}>
                            {act.location?.name && <span>📍 {act.location.name}</span>}
                            {act.estimatedCost !== undefined && <span>💰 ₹{act.estimatedCost}</span>}
                            {act.estimatedDurationMinutes !== undefined && (
                              <span>⏱️ {act.estimatedDurationMinutes} min</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="auth-footer" style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px', flexWrap: 'wrap' }}>
          <Link to={`/dashboard/trip/${tripId}/itineraries`} className="btn btn-secondary btn-sm">
            ← Back to All Candidates
          </Link>
          <Link to={`/dashboard/trip/${tripId}`} className="btn btn-secondary btn-sm">
            Trip Details
          </Link>
        </div>
      </div>
    </div>
  );
}
