import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/axios.js';
import { AuthContext } from '../context/AuthContext.jsx';
import NotificationBell from '../components/NotificationBell.jsx';
import { Clock, MapPin, Plus, Check } from 'lucide-react';

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
      setSuccessMessage('Itinerary schedule was successfully re-optimized for weather!');
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
    <div className="tp-workspace-subpage">
      <div className="tp-subpage-container">
        
        <div className="tp-subpage-header">
          <div>
            <div className="tp-trip-overview-eyebrow">
              <span className="tp-trip-overview-line" />
              <span>ACTIVE ITINERARY</span>
            </div>
            <h1 className="tp-subpage-title">
              Trip Itinerary
            </h1>
            <p className="tp-subpage-subtitle">
              Add, edit, reorder, or track activities on your active itinerary
            </p>
          </div>

          <div className="tp-subpage-actions">
            <NotificationBell />
            {canModifyActivities && (
              <button
                type="button"
                onClick={() => handleOpenAddModal(sortedDayNumbers.length > 0 ? sortedDayNumbers[0] : 1)}
                className="tp-action-btn-primary"
              >
                <Plus size={16} />
                <span>Add Activity</span>
              </button>
            )}
            <Link to={`/dashboard/trip/${tripId}/itineraries`} className="tp-action-btn-secondary">
              Itinerary Versions
            </Link>
          </div>
        </div>

        {successMessage && (
          <div className="alert alert-success" style={{ marginBottom: '16px' }}>
            ✓ {successMessage}
          </div>
        )}

        {loading && (
          <div className="tp-light-empty-card" style={{ padding: '36px 20px' }}>
            <p style={{ color: '#64748b' }}>Loading itinerary activities...</p>
          </div>
        )}

        {!loading && error && (
          <div className="alert alert-error" style={{ marginBottom: '20px' }}>{error}</div>
        )}

        {!loading && !error && activities.length === 0 && (
          <div className="tp-light-empty-card">
            <h3 className="tp-light-empty-title">
              No activities planned yet.
            </h3>
            <p className="tp-light-empty-text">
              Add your custom activities or generate a full schedule using TripPilot.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {canModifyActivities ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleOpenAddModal(1)}
                    className="tp-action-btn-primary"
                  >
                    <Plus size={16} />
                    <span>Add First Activity</span>
                  </button>
                  <Link to={`/dashboard/trip/${tripId}/generate-itinerary`} className="tp-action-btn-secondary">
                    Generate Itinerary
                  </Link>
                </>
              ) : (
                <Link to={`/dashboard/trip/${tripId}`} className="tp-action-btn-secondary">
                  Back to Workspace
                </Link>
              )}
            </div>
          </div>
        )}

        {!loading && !error && activities.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
            {sortedDayNumbers.map((dayNum) => {
              const dayActivities = groupedActivities[dayNum];
              const totalDayCount = dayActivities.length;
              const completedDayCount = dayActivities.filter((a) => a.isCompleted).length;
              const dayProgressPercent = totalDayCount > 0 ? Math.round((completedDayCount / totalDayCount) * 100) : 0;
              const isDayComplete = totalDayCount > 0 && completedDayCount === totalDayCount;

              return (
                <div key={dayNum} className="tp-itinerary-day-card">
                  {/* Day Header with Daily Activity Completion Progress */}
                  <div className="tp-itinerary-day-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <h3 className="tp-itinerary-day-title">
                        Day {dayNum}
                      </h3>
                      <span className={`tp-itinerary-progress-pill ${isDayComplete ? 'completed' : ''}`}>
                        {completedDayCount} / {totalDayCount} completed ({dayProgressPercent}%)
                      </span>
                    </div>

                    {canModifyActivities && (
                      <button
                        type="button"
                        onClick={() => handleOpenAddModal(dayNum)}
                        className="tp-action-btn-secondary"
                        style={{ fontSize: '0.8rem', padding: '5px 12px' }}
                      >
                        <Plus size={14} />
                        <span>Add to Day {dayNum}</span>
                      </button>
                    )}
                  </div>

                  {/* Day Activities List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {dayActivities.map((act, index) => (
                      <div
                        key={act._id}
                        className={`tp-activity-item ${act.isCompleted ? 'completed' : ''}`}
                      >
                        {/* Header Bar */}
                        <div className="tp-activity-header">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <span className="tp-activity-time">
                              <Clock size={14} />
                              <span>{formatTimeTo12Hour(act.time) || 'Schedule'}</span>
                            </span>

                            {/* Completion Status Control */}
                            {canModifyActivities ? (
                              <button
                                type="button"
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  padding: '3px 10px',
                                  borderRadius: '50px',
                                  background: act.isCompleted ? '#dcfce7' : '#f1f5f9',
                                  color: act.isCompleted ? '#15803d' : '#64748b',
                                  border: act.isCompleted ? '1px solid #bbf7d0' : '1px solid rgba(15, 23, 42, 0.08)',
                                  cursor: 'pointer'
                                }}
                                onClick={() => handleToggleComplete(act._id)}
                                title="Click to toggle completion status"
                              >
                                {act.isCompleted ? '✓ Completed' : '○ Pending'}
                              </button>
                            ) : (
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  padding: '3px 10px',
                                  borderRadius: '50px',
                                  background: act.isCompleted ? '#dcfce7' : '#f1f5f9',
                                  color: act.isCompleted ? '#15803d' : '#64748b',
                                  border: act.isCompleted ? '1px solid #bbf7d0' : '1px solid rgba(15, 23, 42, 0.08)'
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
                                  background: '#fff7ed',
                                  color: '#ea580c',
                                  border: '1px solid rgba(249, 115, 22, 0.25)'
                                }}
                              >
                                Optimized for Weather
                              </span>
                            )}
                          </div>

                          {/* Action Controls: Edit, Delete, Reorder */}
                          {canModifyActivities && (
                            <div className="tp-activity-actions">
                              <button
                                type="button"
                                onClick={() => handleMoveActivity(dayActivities, index, 'UP')}
                                disabled={index === 0}
                                title="Move Up"
                                style={{
                                  background: '#ffffff',
                                  color: '#0f172a',
                                  border: '1px solid rgba(15, 23, 42, 0.12)',
                                  borderRadius: '6px',
                                  padding: '2px 8px',
                                  fontSize: '0.78rem',
                                  cursor: index === 0 ? 'not-allowed' : 'pointer',
                                  opacity: index === 0 ? 0.35 : 1
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
                                  background: '#ffffff',
                                  color: '#0f172a',
                                  border: '1px solid rgba(15, 23, 42, 0.12)',
                                  borderRadius: '6px',
                                  padding: '2px 8px',
                                  fontSize: '0.78rem',
                                  cursor: index === dayActivities.length - 1 ? 'not-allowed' : 'pointer',
                                  opacity: index === dayActivities.length - 1 ? 0.35 : 1
                                }}
                              >
                                ▼
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(act)}
                                className="tp-action-btn-secondary"
                                style={{ fontSize: '0.75rem', padding: '3px 10px' }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleInitiateDelete(act)}
                                className="tp-action-btn-danger"
                                style={{ fontSize: '0.75rem', padding: '3px 10px' }}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Title & Description */}
                        <h4
                          className="tp-activity-title"
                          style={{
                            textDecoration: act.isCompleted ? 'line-through' : 'none',
                            color: act.isCompleted ? '#94a3b8' : '#0f172a'
                          }}
                        >
                          {act.title}
                        </h4>

                        {act.description && (
                          <p className="tp-activity-desc">
                            {act.description}
                          </p>
                        )}

                        {/* Meta: Location, Cost, Duration */}
                        <div className="tp-activity-meta-row">
                          {act.location?.name && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <MapPin size={13} color="#ea580c" />
                              <span>{act.location.name}</span>
                            </span>
                          )}
                          {act.estimatedCost !== undefined && (
                            <span>Estimated: ₹{act.estimatedCost}</span>
                          )}
                          {act.estimatedDurationMinutes !== undefined && (
                            <span>{act.estimatedDurationMinutes} min</span>
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

      </div>

      {/* ========================================================= */}
      {/* 📝 ADD / EDIT ACTIVITY MODAL */}
      {/* ========================================================= */}
      {isModalOpen && canModifyActivities && (
        <div className="tp-modal-backdrop">
          <div className="tp-modal-card">
            <div className="tp-modal-header">
              <h2 className="tp-modal-title">
                {formMode === 'ADD' ? 'Add New Activity' : 'Edit Activity'}
              </h2>
              <button
                type="button"
                onClick={handleCloseModal}
                className="tp-modal-close-btn"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="alert alert-error" style={{ marginBottom: '16px' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="tp-modal-form-group">
                  <label className="tp-modal-label">Day Number</label>
                  <input
                    type="number"
                    min="1"
                    className="tp-modal-input"
                    value={formData.dayNumber}
                    onChange={(e) => setFormData({ ...formData, dayNumber: e.target.value })}
                    required
                  />
                </div>

                <div className="tp-modal-form-group">
                  <label className="tp-modal-label">Time (HH:MM)</label>
                  <input
                    type="time"
                    className="tp-modal-input"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="tp-modal-form-group">
                <label className="tp-modal-label">Activity Title *</label>
                <input
                  type="text"
                  className="tp-modal-input"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="tp-modal-form-group">
                <label className="tp-modal-label">Location / Venue Name</label>
                <input
                  type="text"
                  className="tp-modal-input"
                  value={formData.locationName}
                  onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="tp-modal-form-group">
                  <label className="tp-modal-label">Estimated Cost (₹)</label>
                  <input
                    type="number"
                    min="0"
                    className="tp-modal-input"
                    value={formData.estimatedCost}
                    onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
                  />
                </div>

                <div className="tp-modal-form-group">
                  <label className="tp-modal-label">Duration (Minutes)</label>
                  <input
                    type="number"
                    min="15"
                    step="15"
                    className="tp-modal-input"
                    value={formData.estimatedDurationMinutes}
                    onChange={(e) => setFormData({ ...formData, estimatedDurationMinutes: e.target.value })}
                  />
                </div>
              </div>

              <div className="tp-modal-form-group">
                <label className="tp-modal-label">Description / Notes</label>
                <textarea
                  className="tp-modal-textarea"
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="tp-modal-actions">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={formSubmitting}
                  className="tp-action-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="tp-action-btn-primary"
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
        <div className="tp-modal-backdrop">
          <div className="tp-modal-card" style={{ maxWidth: '460px' }}>
            <div className="tp-modal-header">
              <h2 className="tp-modal-title" style={{ color: '#991b1b' }}>
                Delete Activity?
              </h2>
              <button
                type="button"
                onClick={handleCancelDelete}
                className="tp-modal-close-btn"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {deleteError && (
              <div className="alert alert-error" style={{ marginBottom: '16px' }}>
                {deleteError}
              </div>
            )}

            <p style={{ color: '#475569', fontSize: '0.92rem', marginBottom: '20px', lineHeight: '1.5' }}>
              Are you sure you want to delete <strong>"{deletingActivity.title}"</strong> from Day {deletingActivity.dayNumber}? This action cannot be undone.
            </p>

            <div className="tp-modal-actions">
              <button
                type="button"
                onClick={handleCancelDelete}
                disabled={deletingLoading}
                className="tp-action-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deletingLoading}
                className="tp-action-btn-danger"
                style={{ opacity: deletingLoading ? 0.6 : 1 }}
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
