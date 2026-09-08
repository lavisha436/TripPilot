import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/axios.js';
import { AuthContext } from '../context/AuthContext.jsx';
import NotificationBell from '../components/NotificationBell.jsx';

/**
 * 🗺️ Itinerary Page Component: Displays day-wise activities for the trip's active itinerary
 * with full Activity Management (Add, Edit, Delete with Custom Modal, Reorder, and Mark Complete).
 */
export default function Itinerary() {
  const { tripId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [trip, setTrip] = useState(null);
  const [members, setMembers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Modal / Form state for Add/Edit Activity
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formMode, setFormMode] = useState('ADD'); // 'ADD' | 'EDIT'
  const [editingActivityId, setEditingActivityId] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Custom Delete Confirmation Modal state
  const [deletingActivity, setDeletingActivity] = useState(null);
  const [deletingLoading, setDeletingLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Form Fields
  const [formData, setFormData] = useState({
    dayNumber: 1,
    time: '09:00',
    title: '',
    description: '',
    locationName: '',
    estimatedCost: 0,
    estimatedDurationMinutes: 60
  });

  const fetchItineraryData = async () => {
    setLoading(true);
    setError('');

    try {
      const [activitiesRes, tripRes] = await Promise.all([
        api.get(`/trips/${tripId}/activities`),
        api.get(`/trips/${tripId}`)
      ]);
      setActivities(activitiesRes.data?.data?.activities || []);
      setTrip(tripRes.data?.data?.trip || null);
      setMembers(tripRes.data?.data?.members || []);
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || 'Failed to fetch trip itinerary. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItineraryData();
  }, [tripId]);

  // Determine current user's role in this trip workspace
  const currentMember = user && members.find((m) => m.userId?._id?.toString() === user._id.toString());
  const userRole = currentMember
    ? currentMember.role
    : user && trip && ((trip.createdBy?._id && trip.createdBy._id.toString() === user._id.toString()) || (trip.createdBy && trip.createdBy.toString() === user._id.toString()))
    ? 'OWNER'
    : 'VIEWER';

  const isOwner = userRole === 'OWNER';
  const isEditor = userRole === 'EDITOR';
  const isViewer = userRole === 'VIEWER';

  // Permission flag: OWNER and EDITOR can add, edit, delete, reorder, and toggle completion. VIEWER is read-only for controls.
  const canModifyActivities = isOwner || isEditor;

  // -------------------------------------------------------------
  // Presentation-only helper for 12-hour AM/PM time formatting
  // -------------------------------------------------------------
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
    if (location.state?.weatherOptimizedSuccess) {
      setSuccessMessage('🤖 Itinerary schedule was successfully re-optimized for weather by TripPilot AI!');
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  // Open Modal for Creating a New Activity (OWNER & EDITOR only)
  const handleOpenAddModal = (defaultDay = 1) => {
    if (!canModifyActivities) return;
    setFormMode('ADD');
    setEditingActivityId(null);
    setFormError('');
    setFormData({
      dayNumber: defaultDay,
      time: '09:00',
      title: '',
      description: '',
      locationName: '',
      estimatedCost: 0,
      estimatedDurationMinutes: 60
    });
    setIsModalOpen(true);
  };

  // Open Modal for Editing an Existing Activity (OWNER & EDITOR only)
  const handleOpenEditModal = (act) => {
    if (!canModifyActivities) return;
    setFormMode('EDIT');
    setEditingActivityId(act._id);
    setFormError('');
    setFormData({
      dayNumber: act.dayNumber || 1,
      time: act.time || '09:00',
      title: act.title || '',
      description: act.description || '',
      locationName: act.location?.name || '',
      estimatedCost: act.estimatedCost || 0,
      estimatedDurationMinutes: act.estimatedDurationMinutes || 60
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (formSubmitting) return;
    setIsModalOpen(false);
    setFormError('');
  };

  // Form Submit Handler (Add or Edit)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!canModifyActivities) return;
    if (!formData.title.trim()) {
      setFormError('Activity title is required.');
      return;
    }

    setFormSubmitting(true);
    setFormError('');

    const payload = {
      dayNumber: Number(formData.dayNumber) || 1,
      time: formData.time || '09:00',
      title: formData.title.trim(),
      description: formData.description.trim(),
      location: {
        name: formData.locationName.trim()
      },
      estimatedCost: Number(formData.estimatedCost) || 0,
      estimatedDurationMinutes: Number(formData.estimatedDurationMinutes) || 60
    };

    try {
      if (formMode === 'ADD') {
        await api.post(`/trips/${tripId}/activities`, payload);
        setSuccessMessage('Activity added successfully!');
      } else {
        await api.put(`/trips/${tripId}/activities/${editingActivityId}`, payload);
        setSuccessMessage('Activity updated successfully!');
      }

      setIsModalOpen(false);
      await fetchItineraryData();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || 'Failed to save activity. Please try again.';
      setFormError(errorMessage);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Initiate Custom Delete Modal
  const handleInitiateDelete = (act) => {
    if (!canModifyActivities) return;
    setDeleteError('');
    setDeletingActivity(act);
  };

  // Cancel Delete
  const handleCancelDelete = () => {
    if (deletingLoading) return;
    setDeletingActivity(null);
    setDeleteError('');
  };

  // Confirm Delete Handler (Invokes API)
  const handleConfirmDelete = async () => {
    if (!canModifyActivities || !deletingActivity || !deletingActivity._id) return;
    setDeletingLoading(true);
    setDeleteError('');

    try {
      await api.delete(`/trips/${tripId}/activities/${deletingActivity._id}`);
      setSuccessMessage('Activity deleted successfully.');
      setDeletingActivity(null);
      await fetchItineraryData();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || 'Failed to delete activity. Please try again.';
      setDeleteError(errorMessage);
    } finally {
      setDeletingLoading(false);
    }
  };

  // Toggle Activity Completion Status (OWNER & EDITOR only)
  const handleToggleComplete = async (activityId) => {
    if (!canModifyActivities) return;

    // Optimistic UI update
    setActivities((prev) =>
      prev.map((act) =>
        act._id === activityId ? { ...act, isCompleted: !act.isCompleted } : act
      )
    );

    try {
      await api.patch(`/trips/${tripId}/activities/${activityId}/toggle-complete`);
    } catch (err) {
      // Revert optimistic update on failure
      fetchItineraryData();
      const errorMessage =
        err.response?.data?.message || 'Failed to update completion status.';
      setError(errorMessage);
    }
  };

  // Move Activity Up or Down in Day Schedule (OWNER & EDITOR only)
  const handleMoveActivity = async (dayActivities, currentIndex, direction) => {
    if (!canModifyActivities) return;
    const targetIndex = direction === 'UP' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= dayActivities.length) return;

    // Swap items locally
    const reorderedDay = [...dayActivities];
    const temp = reorderedDay[currentIndex];
    reorderedDay[currentIndex] = reorderedDay[targetIndex];
    reorderedDay[targetIndex] = temp;

    // Construct reorder payload with new order indexes
    const reorderPayload = reorderedDay.map((act, index) => ({
      activityId: act._id,
      dayNumber: act.dayNumber,
      order: index
    }));

    try {
      await api.patch(`/trips/${tripId}/activities/reorder`, reorderPayload);
      await fetchItineraryData();
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || 'Failed to reorder activities. Please try again.';
      setError(errorMessage);
    }
  };

  // Group activities by dayNumber and sort by order asc
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
      <div className="glass-card" style={{ maxWidth: '1200px', width: '100%', textAlign: 'left' }}>
        <div className="badge">🗺️ Active Itinerary</div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
          <div>
            <h1 className="page-title" style={{ fontSize: '2.2rem', marginBottom: '4px' }}>
              Trip Itinerary Management
            </h1>
            <p className="hero-subtitle" style={{ fontSize: '0.95rem', margin: 0 }}>
              Add, edit, reorder, or track activities on your active itinerary
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <NotificationBell />
            {canModifyActivities && (
              <button
                type="button"
                onClick={() => handleOpenAddModal(sortedDayNumbers.length > 0 ? sortedDayNumbers[0] : 1)}
                className="btn btn-primary"
                style={{ fontSize: '0.9rem' }}
              >
                ➕ Add Activity
              </button>
            )}
            <Link to={`/dashboard/trip/${tripId}/itineraries`} className="btn btn-secondary" style={{ fontSize: '0.9rem' }}>
              📋 Candidates
            </Link>
          </div>
        </div>

        {successMessage && (
          <div className="alert alert-success" style={{ marginBottom: '16px' }}>
            ✓ {successMessage}
          </div>
        )}

        {loading && (
          <div className="placeholder-box" style={{ textAlign: 'center', padding: '32px 20px' }}>
            <p>Loading itinerary activities...</p>
          </div>
        )}

        {!loading && error && (
          <div className="alert alert-error">{error}</div>
        )}

        {!loading && !error && activities.length === 0 && (
          <div className="placeholder-box" style={{ textAlign: 'center', padding: '40px 20px', borderStyle: 'solid' }}>
            <h3 style={{ color: '#ffffff', fontSize: '1.2rem', marginBottom: '8px' }}>
              No activities planned yet.
            </h3>
            <p style={{ color: '#cbd5e1', marginBottom: '20px', fontSize: '0.95rem' }}>
              Add your custom activities or generate a full schedule using TripPilot AI.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {canModifyActivities ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleOpenAddModal(1)}
                    className="btn btn-primary"
                  >
                    ➕ Add First Activity
                  </button>
                  <Link to={`/dashboard/trip/${tripId}/generate-itinerary`} className="btn btn-secondary">
                    🤖 Generate Itinerary
                  </Link>
                </>
              ) : (
                <Link to={`/dashboard/trip/${tripId}`} className="btn btn-secondary">
                  ← Back to Workspace
                </Link>
              )}
            </div>
          </div>
        )}

        {!loading && !error && activities.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '24px' }}>
            {sortedDayNumbers.map((dayNum) => {
              const dayActivities = groupedActivities[dayNum];
              const totalDayCount = dayActivities.length;
              const completedDayCount = dayActivities.filter((a) => a.isCompleted).length;
              const dayProgressPercent = totalDayCount > 0 ? Math.round((completedDayCount / totalDayCount) * 100) : 0;

              return (
                <div
                  key={dayNum}
                  className="placeholder-box"
                  style={{ marginBottom: '0', textAlign: 'left', borderStyle: 'solid' }}
                >
                  {/* Day Header with Daily Activity Completion Progress */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <h3 style={{ color: '#38bdf8', fontSize: '1.2rem', margin: 0 }}>
                        Day {dayNum}
                      </h3>
                      <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: '600', background: 'rgba(255, 255, 255, 0.05)', padding: '2px 10px', borderRadius: '50px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                        {completedDayCount} / {totalDayCount} activities completed ({dayProgressPercent}%)
                      </span>
                    </div>

                    {canModifyActivities && (
                      <button
                        type="button"
                        onClick={() => handleOpenAddModal(dayNum)}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                      >
                        ➕ Add to Day {dayNum}
                      </button>
                    )}
                  </div>

                  {/* Day Activities List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {dayActivities.map((act, index) => (
                      <div
                        key={act._id}
                        style={{
                          background: act.isCompleted ? 'rgba(34, 197, 94, 0.08)' : 'rgba(15, 23, 42, 0.65)',
                          padding: '14px 18px',
                          borderRadius: '12px',
                          border: act.isCompleted
                            ? '1px solid rgba(34, 197, 94, 0.3)'
                            : '1px solid rgba(255, 255, 255, 0.08)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {/* Header Bar */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <span style={{ color: '#38bdf8', fontWeight: '700', fontSize: '0.85rem' }}>
                              ⏰ {formatTimeTo12Hour(act.time) || 'Schedule'}
                            </span>

                            {/* Completion Status Control: Interactive for OWNER & EDITOR; Read-only for VIEWER */}
                            {canModifyActivities ? (
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  padding: '3px 10px',
                                  borderRadius: '50px',
                                  background: act.isCompleted ? 'rgba(34, 197, 94, 0.2)' : 'rgba(148, 163, 184, 0.15)',
                                  color: act.isCompleted ? '#86efac' : '#94a3b8',
                                  cursor: 'pointer'
                                }}
                                onClick={() => handleToggleComplete(act._id)}
                                title="Click to toggle completion status"
                              >
                                {act.isCompleted ? '✓ Completed' : '○ Pending'}
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  padding: '3px 10px',
                                  borderRadius: '50px',
                                  background: act.isCompleted ? 'rgba(34, 197, 94, 0.2)' : 'rgba(148, 163, 184, 0.15)',
                                  color: act.isCompleted ? '#86efac' : '#94a3b8',
                                  cursor: 'default'
                                }}
                              >
                                {act.isCompleted ? '✓ Completed' : '○ Pending'}
                              </span>
                            )}

                            {act.isWeatherOptimized && (
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  padding: '3px 10px',
                                  borderRadius: '50px',
                                  background: 'rgba(56, 189, 248, 0.2)',
                                  color: '#38bdf8',
                                  border: '1px solid rgba(56, 189, 248, 0.4)'
                                }}
                              >
                                🤖 Optimized for Weather
                              </span>
                            )}
                          </div>

                          {/* Action Controls: Edit, Delete, Reorder (OWNER & EDITOR only) */}
                          {canModifyActivities && (
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleMoveActivity(dayActivities, index, 'UP')}
                                disabled={index === 0}
                                title="Move Up"
                                style={{
                                  background: 'rgba(255, 255, 255, 0.1)',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '3px 8px',
                                  fontSize: '0.8rem',
                                  cursor: index === 0 ? 'not-allowed' : 'pointer',
                                  opacity: index === 0 ? 0.3 : 1
                                }}
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveActivity(dayActivities, index, 'DOWN')}
                                disabled={index === dayActivities.length - 1}
                                title="Move Down"
                                style={{
                                  background: 'rgba(255, 255, 255, 0.1)',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '3px 8px',
                                  fontSize: '0.8rem',
                                  cursor: index === dayActivities.length - 1 ? 'not-allowed' : 'pointer',
                                  opacity: index === dayActivities.length - 1 ? 0.3 : 1
                                }}
                              >
                                ▼
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(act)}
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '0.75rem', padding: '3px 10px' }}
                              >
                                ✏️ Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleInitiateDelete(act)}
                                className="btn btn-sm"
                                style={{
                                  fontSize: '0.75rem',
                                  padding: '3px 10px',
                                  background: 'rgba(239, 68, 68, 0.2)',
                                  color: '#fca5a5',
                                  border: '1px solid rgba(239, 68, 68, 0.4)'
                                }}
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Title & Description */}
                        <h4
                          style={{
                            color: act.isCompleted ? '#cbd5e1' : '#ffffff',
                            textDecoration: act.isCompleted ? 'line-through' : 'none',
                            fontSize: '1.1rem',
                            marginBottom: '6px'
                          }}
                        >
                          {act.title}
                        </h4>

                        {act.description && (
                          <p style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '10px', lineHeight: '1.4' }}>
                            {act.description}
                          </p>
                        )}

                        {/* Meta: Location, Cost, Duration */}
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
              );
            })}
          </div>
        )}

        <div className="auth-footer" style={{ textAlign: 'center', marginTop: '16px' }}>
          <Link to={`/dashboard/trip/${tripId}`} className="btn btn-secondary btn-sm">
            ← Back to Trip Details
          </Link>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 📝 ADD / EDIT ACTIVITY MODAL */}
      {/* ========================================================= */}
      {isModalOpen && canModifyActivities && (
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
              maxWidth: '520px',
              width: '100%',
              textAlign: 'left',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
            }}
          >
            <h2 style={{ color: '#ffffff', fontSize: '1.4rem', marginBottom: '16px' }}>
              {formMode === 'ADD' ? '➕ Add New Activity' : '✏️ Edit Activity'}
            </h2>

            {formError && (
              <div className="alert alert-error" style={{ marginBottom: '16px' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>
                    Day Number
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={formData.dayNumber}
                    onChange={(e) => setFormData({ ...formData, dayNumber: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="form-label" style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>
                    Time (HH:MM 24hr)
                  </label>
                  <input
                    type="time"
                    className="form-input"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="form-label" style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>
                  Activity Title
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Scuba Diving at Grand Island"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="form-label" style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>
                  Location / Venue Name
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Baga Beach Jetty"
                  value={formData.locationName}
                  onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>
                    Estimated Cost (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={formData.estimatedCost}
                    onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min="15"
                    step="15"
                    className="form-input"
                    value={formData.estimatedDurationMinutes}
                    onChange={(e) => setFormData({ ...formData, estimatedDurationMinutes: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="form-label" style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>
                  Description / Notes
                </label>
                <textarea
                  className="form-input"
                  rows="3"
                  placeholder="Additional details, tickets info, or notes..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={formSubmitting}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="btn btn-primary"
                  style={{ opacity: formSubmitting ? 0.6 : 1 }}
                >
                  {formSubmitting ? 'Saving...' : formMode === 'ADD' ? 'Add Activity' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ⚠️ DELETE CONFIRMATION MODAL */}
      {/* ========================================================= */}
      {deletingActivity && canModifyActivities && (
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
              maxWidth: '460px',
              width: '100%',
              textAlign: 'left',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
            }}
          >
            <h2 style={{ color: '#fca5a5', fontSize: '1.3rem', marginBottom: '12px' }}>
              ⚠️ Delete Activity?
            </h2>

            {deleteError && (
              <div className="alert alert-error" style={{ marginBottom: '16px' }}>
                {deleteError}
              </div>
            )}

            <p style={{ color: '#cbd5e1', fontSize: '0.95rem', marginBottom: '20px', lineHeight: '1.5' }}>
              Are you sure you want to delete <strong>"{deletingActivity.title}"</strong> from Day {deletingActivity.dayNumber}? This action cannot be undone.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleCancelDelete}
                disabled={deletingLoading}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deletingLoading}
                className="btn"
                style={{ background: '#ef4444', color: '#ffffff', opacity: deletingLoading ? 0.6 : 1 }}
              >
                {deletingLoading ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
