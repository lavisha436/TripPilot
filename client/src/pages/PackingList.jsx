import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios.js';
import { AuthContext } from '../context/AuthContext.jsx';
import NotificationBell from '../components/NotificationBell.jsx';

/**
 * 🎒 PackingList Page Component: Manages AI Smart Packing List generation,
 * item categorization, and individual per-user packed/unpacked state toggling.
 */
export default function PackingList() {
  const { tripId } = useParams();
  const { user } = useContext(AuthContext);

  const [trip, setTrip] = useState(null);
  const [members, setMembers] = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);

  const CATEGORY_ICONS = {
    Documents: '📄',
    Clothing: '👕',
    Electronics: '🔌',
    Toiletries: '🧴',
    Health: '🩹',
    Misc: '📦'
  };

  const CATEGORY_ORDER = ['Documents', 'Clothing', 'Electronics', 'Toiletries', 'Health', 'Misc'];

  // Calculate trip duration days
  const calculateDurationDays = (startDate, endDate) => {
    if (!startDate || !endDate) return 1;
    const diffTime = new Date(endDate) - new Date(startDate);
    return Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);
  };

  const fetchTripData = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await api.get(`/trips/${tripId}`);
      const tripData = res.data?.data?.trip || null;
      const memberList = res.data?.data?.members || [];
      setTrip(tripData);
      setMembers(memberList);
      setChecklist(tripData?.packingChecklist || []);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load trip details. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTripData();
  }, [tripId]);

  // Determine user's role in this trip
  const currentMember = user && members.find((m) => m.userId?._id?.toString() === user._id.toString());
  const userRole = currentMember
    ? currentMember.role
    : user && trip && ((trip.createdBy?._id && trip.createdBy._id.toString() === user._id.toString()) || (trip.createdBy && trip.createdBy.toString() === user._id.toString()))
    ? 'OWNER'
    : 'VIEWER';

  const canGeneratePackingList = userRole === 'OWNER' || userRole === 'EDITOR';

  // Helper to determine if an item is packed by the current logged-in user
  const isItemPackedByUser = (item) => {
    if (!item || !user) return false;
    if (Array.isArray(item.packedBy)) {
      return item.packedBy.some((id) => (id._id || id).toString() === user._id.toString());
    }
    // Fallback for legacy items before schema migration
    return !!item.isPacked;
  };

  // Handle AI Packing List Generation (OWNER & EDITOR only)
  const handleGeneratePackingList = async () => {
    if (!trip || !canGeneratePackingList) return;
    setShowReplaceConfirm(false);
    setGenerating(true);
    setError('');
    setSuccessMessage('');

    const durationDays = calculateDurationDays(trip.startDate, trip.endDate);

    const aiPayload = {
      destination: trip.destination,
      durationDays,
      travelCompanion: trip.travelCompanion || 'SOLO',
      interests: trip.interests && trip.interests.length > 0 ? trip.interests : ['Nature']
    };

    try {
      // 1. Request AI Checklist from Gemini
      const aiRes = await api.post('/ai/generate-packing-list', aiPayload);
      const generatedItems = aiRes.data?.data?.packingList || [];

      if (!Array.isArray(generatedItems) || generatedItems.length === 0) {
        throw new Error('AI service returned an empty packing list.');
      }

      // 2. Persist returned items to MongoDB on Trip document (packedBy initialized as [])
      const updateRes = await api.put(`/trips/${tripId}`, {
        packingChecklist: generatedItems.map((i) => ({
          item: typeof i === 'string' ? i : i.item,
          category: i.category || 'General',
          packedBy: []
        }))
      });

      const updatedTrip = updateRes.data?.data?.trip;
      setTrip(updatedTrip || trip);
      setChecklist(updatedTrip?.packingChecklist || []);
      setSuccessMessage('🤖 Smart Packing List generated & saved successfully!');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to generate packing list.';
      setError(msg);
    } finally {
      setGenerating(false);
    }
  };

  // Handle Individual User Checkbox Toggle
  const handleToggleItem = async (itemId) => {
    if (!user) return;
    setTogglingId(itemId);

    const itemObj = checklist.find((i) => i._id === itemId);
    const currentPacked = isItemPackedByUser(itemObj);
    const newPackedState = !currentPacked;

    // Optimistic UI update for current user
    setChecklist((prev) =>
      prev.map((item) => {
        if (item._id !== itemId) return item;
        const currentPackedBy = Array.isArray(item.packedBy) ? item.packedBy : [];
        let updatedPackedBy;
        if (newPackedState) {
          updatedPackedBy = [...currentPackedBy, user._id];
        } else {
          updatedPackedBy = currentPackedBy.filter((id) => (id._id || id).toString() !== user._id.toString());
        }
        return { ...item, packedBy: updatedPackedBy };
      })
    );

    try {
      const res = await api.patch(`/trips/${tripId}/packing/${itemId}`, {
        isPacked: newPackedState
      });
      const updatedList = res.data?.data?.packingChecklist;
      if (Array.isArray(updatedList)) {
        setChecklist(updatedList);
      }
    } catch (err) {
      fetchTripData();
      const msg = err.response?.data?.message || 'Failed to update item state.';
      setError(msg);
    } finally {
      setTogglingId(null);
    }
  };

  // Personal Packing Statistics for Current User
  const packedCount = checklist.filter((item) => isItemPackedByUser(item)).length;
  const totalCount = checklist.length;
  const packedPercentage = totalCount > 0 ? Math.round((packedCount / totalCount) * 100) : 0;

  // Group Checklist Items by Category
  const groupedChecklist = CATEGORY_ORDER.reduce((acc, cat) => {
    const items = checklist.filter((item) => item.category === cat);
    if (items.length > 0) {
      acc[cat] = items;
    }
    return acc;
  }, {});

  const categorizedSet = new Set(CATEGORY_ORDER);
  const uncategorizedItems = checklist.filter((item) => !categorizedSet.has(item.category));
  if (uncategorizedItems.length > 0) {
    groupedChecklist['Misc'] = [...(groupedChecklist['Misc'] || []), ...uncategorizedItems];
  }

  return (
    <div className="tp-workspace-subpage">
      <div className="tp-subpage-container">
        

        <div className="tp-subpage-header">
          <div>
            <h1 className="tp-subpage-title">
              Smart Packing List
            </h1>
            {trip && (
              <p className="tp-subpage-subtitle">
                {trip.title} • {trip.destination}
              </p>
            )}
          </div>

          <div className="tp-subpage-actions">
            <NotificationBell />
            {canGeneratePackingList && (
              checklist.length > 0 ? (
                <button
                  type="button"
                  className="tp-action-btn-primary"
                  disabled={generating}
                  style={{ opacity: generating ? 0.6 : 1 }}
                  onClick={() => setShowReplaceConfirm(true)}
                >
                  {generating ? 'Regenerating...' : 'Regenerate List'}
                </button>
              ) : (
                <button
                  type="button"
                  className="tp-action-btn-primary"
                  disabled={generating}
                  style={{ opacity: generating ? 0.6 : 1 }}
                  onClick={handleGeneratePackingList}
                >
                  {generating ? 'Generating...' : 'Generate Packing List'}
                </button>
              )
            )}
          </div>
        </div>

        {/* Success Alert Banner */}
        {successMessage && (
          <div className="alert alert-success" style={{ marginBottom: '16px' }}>
            ✓ {successMessage}
          </div>
        )}

        {/* Global Loading State */}
        {loading && (
          <div className="tp-light-empty-card" style={{ padding: '36px 20px' }}>
            <p style={{ color: '#64748b' }}>Loading trip details & packing checklist...</p>
          </div>
        )}

        {/* Global Error Alert */}
        {!loading && error && (
          <div className="alert alert-error" style={{ marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* 1. PERSONAL PACKING PROGRESS SUMMARY CARD */}
            {checklist.length > 0 && (
              <div className="tp-packing-summary-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 style={{ color: '#0f172a', fontFamily: 'var(--font-primary, Outfit)', fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                    Packing Checklist Progress
                  </h3>
                  <span style={{ color: packedPercentage === 100 ? '#16a34a' : '#ea580c', fontWeight: '700', fontSize: '0.92rem' }}>
                    {packedCount} / {totalCount} items packed ({packedPercentage}%)
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="tp-packing-bar-wrap">
                  <div
                    className={`tp-packing-bar-fill ${packedPercentage === 100 ? 'done' : ''}`}
                    style={{ width: `${packedPercentage}%` }}
                  />
                </div>
              </div>
            )}

            {/* 2. EMPTY CHECKLIST STATE */}
            {checklist.length === 0 ? (
              <div className="tp-light-empty-card">
                <h3 className="tp-light-empty-title">
                  No packing items created yet.
                </h3>
                {canGeneratePackingList ? (
                  <>
                    <p className="tp-light-empty-text">
                      Let TripPilot generate a personalized packing checklist tailored to your trip destination ({trip?.destination}) and activities.
                    </p>
                    <button
                      type="button"
                      onClick={handleGeneratePackingList}
                      disabled={generating}
                      className="tp-action-btn-primary"
                      style={{ opacity: generating ? 0.6 : 1 }}
                    >
                      {generating ? 'Generating Packing List...' : 'Generate Packing List'}
                    </button>
                  </>
                ) : (
                  <p className="tp-light-empty-text">
                    The trip owner or editor has not generated a packing list for this trip yet.
                  </p>
                )}
              </div>
            ) : (
              /* 3. CATEGORIZED CHECKLIST ITEMS */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {Object.keys(groupedChecklist).map((catName) => {
                  const items = groupedChecklist[catName];
                  const icon = CATEGORY_ICONS[catName] || '📦';
                  const catPacked = items.filter((i) => isItemPackedByUser(i)).length;

                  return (
                    <div key={catName} className="tp-packing-category-card">
                      <div className="tp-packing-category-header">
                        <h3 style={{ color: '#0f172a', fontFamily: 'var(--font-primary, Outfit)', fontSize: '1.05rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{icon}</span> <span>{catName}</span>
                        </h3>
                        <span style={{ color: '#64748b', fontSize: '0.82rem', fontWeight: '600' }}>
                          {catPacked} / {items.length} packed
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {items.map((item) => {
                          const packedByUser = isItemPackedByUser(item);
                          return (
                            <div
                              key={item._id || item.item}
                              className={`tp-packing-item-row ${packedByUser ? 'packed' : ''}`}
                            >
                              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', width: '100%' }}>
                                <input
                                  type="checkbox"
                                  checked={packedByUser}
                                  disabled={togglingId === item._id}
                                  onChange={() => handleToggleItem(item._id)}
                                  style={{
                                    width: '18px',
                                    height: '18px',
                                    cursor: 'pointer',
                                    accentColor: '#ea580c'
                                  }}
                                />
                                <span
                                  style={{
                                    color: packedByUser ? '#94a3b8' : '#0f172a',
                                    textDecoration: packedByUser ? 'line-through' : 'none',
                                    fontWeight: packedByUser ? '500' : '600',
                                    fontSize: '0.92rem',
                                    transition: 'color 0.2s ease'
                                  }}
                                >
                                  {item.item}
                                </span>
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ========================================================= */}
      {/* ⚠️ CONFIRM REGENERATE WARNING MODAL */}
      {/* ========================================================= */}
      {showReplaceConfirm && canGeneratePackingList && (
        <div className="tp-modal-backdrop">
          <div className="tp-modal-card" style={{ maxWidth: '460px' }}>
            <div className="tp-modal-header">
              <h2 className="tp-modal-title" style={{ color: '#991b1b' }}>
                Replace Existing Checklist?
              </h2>
              <button
                type="button"
                onClick={() => setShowReplaceConfirm(false)}
                className="tp-modal-close-btn"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <p style={{ color: '#475569', fontSize: '0.92rem', marginBottom: '20px', lineHeight: '1.5' }}>
              Generating a new packing checklist will replace your current saved checklist. Any packed statuses will be reset for all members.
            </p>

            <div className="tp-modal-actions">
              <button
                type="button"
                onClick={() => setShowReplaceConfirm(false)}
                className="tp-action-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGeneratePackingList}
                className="tp-action-btn-primary"
              >
                Yes, Generate New List
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
