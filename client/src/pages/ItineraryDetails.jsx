import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios.js';
import { formatDateToDisplay } from '../utils/dateUtils.js';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Circle,
  Star,
  Loader2
} from 'lucide-react';

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
    <div className="tp-workspace-subpage">
      <div className="tp-subpage-container" style={{ maxWidth: '820px' }}>
        {/* Header */}
        <div className="tp-subpage-header">
          <Link to={`/dashboard/trip/${tripId}/itineraries`} className="tp-subpage-back-link">
            <ArrowLeft size={16} />
            <span>Back to All Candidates</span>
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
              <Calendar size={12} /> Candidate Schedule
            </span>
          </div>

          {itinerary && (
            <div style={{ marginTop: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h1 className="tp-subpage-title" style={{ margin: 0 }}>
                  {itinerary.title}
                </h1>
                {itinerary.isActive && (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      padding: '3px 10px',
                      borderRadius: '50px',
                      background: 'rgba(234, 88, 12, 0.1)',
                      color: '#ea580c',
                      border: '1px solid rgba(234, 88, 12, 0.25)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Star size={11} /> Active Itinerary
                  </span>
                )}
              </div>
              <p className="tp-subpage-subtitle" style={{ margin: '4px 0 0 0' }}>
                {itinerary.source === 'AI_GENERATED' ? 'Smart Plan' : 'Manual Plan'} • Created {formatDateToDisplay(itinerary.createdAt)}
              </p>
            </div>
          )}
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
            <p style={{ color: '#64748b', fontSize: '0.92rem', margin: 0 }}>Loading itinerary schedule...</p>
          </div>
        )}

        {!loading && error && (
          <div
            style={{
              padding: '14px 18px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '10px',
              color: '#991b1b',
              fontSize: '0.9rem'
            }}
          >
            {error}
          </div>
        )}

        {!loading && !error && itinerary && (
          <div>
            {activities.length === 0 ? (
              <div
                style={{
                  background: '#ffffff',
                  border: '1px dashed rgba(15, 23, 42, 0.15)',
                  borderRadius: '16px',
                  padding: '48px 24px',
                  textAlign: 'center'
                }}
              >
                <p style={{ color: '#64748b', fontSize: '0.92rem', margin: 0 }}>No activities found for this candidate.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
                {sortedDayNumbers.map((dayNum) => (
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
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingBottom: '12px',
                        marginBottom: '16px',
                        borderBottom: '1px solid rgba(15, 23, 42, 0.06)'
                      }}
                    >
                      <h3 style={{ color: '#0f172a', fontSize: '1.15rem', fontWeight: '700', margin: 0 }}>
                        Day {dayNum}
                      </h3>
                      <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '500' }}>
                        {groupedActivities[dayNum]?.length || 0} activities
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {groupedActivities[dayNum].map((act) => (
                        <div
                          key={act._id}
                          style={{
                            background: act.isCompleted ? 'rgba(240, 253, 244, 0.7)' : '#f8fafc',
                            padding: '14px 18px',
                            borderRadius: '12px',
                            border: act.isCompleted
                              ? '1px solid #bbf7d0'
                              : '1px solid rgba(15, 23, 42, 0.06)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ color: '#ea580c', fontWeight: '700', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <Clock size={13} /> {formatTimeTo12Hour(act.time) || 'Flexible Time'}
                            </span>
                            <span
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: '600',
                                padding: '3px 9px',
                                borderRadius: '50px',
                                background: act.isCompleted ? '#dcfce7' : 'rgba(15, 23, 42, 0.06)',
                                color: act.isCompleted ? '#166534' : '#64748b',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              {act.isCompleted ? <><CheckCircle2 size={11} /> Completed</> : <><Circle size={11} /> Pending</>}
                            </span>
                          </div>

                          <h4
                            style={{
                              color: act.isCompleted ? '#64748b' : '#0f172a',
                              fontSize: '1rem',
                              fontWeight: '700',
                              marginBottom: '4px',
                              textDecoration: act.isCompleted ? 'line-through' : 'none'
                            }}
                          >
                            {act.title}
                          </h4>

                          {act.description && (
                            <p style={{ color: '#475569', fontSize: '0.875rem', marginBottom: '8px', lineHeight: '1.5' }}>
                              {act.description}
                            </p>
                          )}

                          <div style={{ display: 'flex', gap: '16px', fontSize: '0.82rem', color: '#64748b', flexWrap: 'wrap' }}>
                            {act.location?.name && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <MapPin size={12} style={{ color: '#ea580c' }} /> {act.location.name}
                              </span>
                            )}
                            {act.estimatedCost !== undefined && (
                              <span>Cost: <strong>₹{Number(act.estimatedCost).toLocaleString('en-IN')}</strong></span>
                            )}
                            {act.estimatedDurationMinutes !== undefined && (
                              <span>Duration: <strong>{act.estimatedDurationMinutes} min</strong></span>
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

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px', flexWrap: 'wrap' }}>
          <Link to={`/dashboard/trip/${tripId}/itineraries`} className="tp-action-btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={16} /> Back to All Candidates
          </Link>
          <Link to={`/dashboard/trip/${tripId}`} className="tp-action-btn-secondary">
            Trip Workspace
          </Link>
        </div>
      </div>
    </div>
  );
}
