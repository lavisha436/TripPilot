import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
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
    <div className="landing-container" style={{ padding: '40px 20px' }}>
      <div className="glass-card" style={{ maxWidth: '1200px', width: '100%', textAlign: 'left' }}>
        
        {/* Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
          <div>
            <div className="badge" style={{ marginBottom: '6px' }}>🎒 Luggage & Gear</div>
            <h1 className="page-title" style={{ fontSize: '2.2rem', marginBottom: '4px' }}>
              Smart Packing List
            </h1>
            {trip && (
              <p style={{ color: '#38bdf8', fontSize: '1rem', margin: 0, fontWeight: '600' }}>
                📍 {trip.title} ({trip.destination})
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <NotificationBell />
            {canGeneratePackingList && (
              checklist.length > 0 ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={generating}
                  style={{ fontSize: '0.9rem', opacity: generating ? 0.6 : 1 }}
                  onClick={() => setShowReplaceConfirm(true)}
                >
                  {generating ? '🤖 Generating...' : '🔄 Regenerate List'}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={generating}
                  style={{ fontSize: '0.9rem', opacity: generating ? 0.6 : 1 }}
                  onClick={handleGeneratePackingList}
                >
                  {generating ? '🤖 Generating...' : '🤖 Generate AI Packing List'}
                </button>
              )
            )}

            <Link to={`/dashboard/trip/${tripId}`} className="btn btn-secondary" style={{ fontSize: '0.9rem' }}>
              ← Back to Workspace
            </Link>
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
          <div className="placeholder-box" style={{ textAlign: 'center', padding: '36px 20px' }}>
            <p style={{ color: '#cbd5e1' }}>Loading trip details & packing checklist...</p>
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
              <div
                className="placeholder-box"
                style={{
                  textAlign: 'left',
                  borderStyle: 'solid',
                  borderColor: 'rgba(56, 189, 248, 0.25)',
                  background: 'rgba(15, 23, 42, 0.75)',
                  marginBottom: '24px',
                  padding: '20px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h3 style={{ color: '#ffffff', fontSize: '1.1rem', margin: 0 }}>
                    📊 Personal Packing Progress
                  </h3>
                  <span style={{ color: '#38bdf8', fontWeight: '700', fontSize: '0.95rem' }}>
                    {packedCount} / {totalCount} items packed ({packedPercentage}%)
                  </span>
                </div>

                {/* Progress Bar */}
                <div style={{ background: 'rgba(255, 255, 255, 0.1)', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${packedPercentage}%`,
                      background: packedPercentage === 100 ? '#22c55e' : '#38bdf8',
                      height: '100%',
                      transition: 'width 0.4s ease'
                    }}
                  />
                </div>
              </div>
            )}

            {/* 2. EMPTY CHECKLIST STATE */}
            {checklist.length === 0 ? (
              <div
                className="placeholder-box"
                style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  borderStyle: 'solid'
                }}
              >
                <h3 style={{ color: '#ffffff', fontSize: '1.25rem', marginBottom: '8px' }}>
                  No packing items created yet.
                </h3>
                {canGeneratePackingList ? (
                  <>
                    <p style={{ color: '#cbd5e1', marginBottom: '24px', fontSize: '0.95rem' }}>
                      Let TripPilot AI generate a personalized packing checklist tailored to your trip destination ({trip?.destination}) and activities.
                    </p>
                    <button
                      type="button"
                      onClick={handleGeneratePackingList}
                      disabled={generating}
                      className="btn btn-primary"
                      style={{ fontSize: '1rem', padding: '10px 20px', opacity: generating ? 0.6 : 1 }}
                    >
                      {generating ? '🤖 Generating Packing List...' : '🤖 Generate AI Packing List'}
                    </button>
                  </>
                ) : (
                  <p style={{ color: '#cbd5e1', fontSize: '0.95rem' }}>
                    The trip owner or editor has not generated a packing list for this trip yet.
                  </p>
                )}
              </div>
            ) : (
              /* 3. CATEGORIZED CHECKLIST ITEMS */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {Object.keys(groupedChecklist).map((catName) => {
                  const items = groupedChecklist[catName];
                  const icon = CATEGORY_ICONS[catName] || '📦';
                  const catPacked = items.filter((i) => isItemPackedByUser(i)).length;

                  return (
                    <div
                      key={catName}
                      className="placeholder-box"
                      style={{
                        textAlign: 'left',
                        borderStyle: 'solid',
                        padding: '18px 20px',
                        marginBottom: 0
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '8px' }}>
                        <h3 style={{ color: '#38bdf8', fontSize: '1.1rem', margin: 0 }}>
                          {icon} {catName}
                        </h3>
                        <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: '600' }}>
                          {catPacked} / {items.length} packed
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {items.map((item) => {
                          const packedByUser = isItemPackedByUser(item);
                          return (
                            <div
                              key={item._id || item.item}
                              style={{
                                background: packedByUser ? 'rgba(34, 197, 94, 0.08)' : 'rgba(15, 23, 42, 0.6)',
                                padding: '12px 16px',
                                borderRadius: '10px',
                                border: packedByUser ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                transition: 'all 0.2s ease',
                                opacity: packedByUser ? 0.65 : 1
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={packedByUser}
                                disabled={togglingId === item._id}
                                onChange={() => handleToggleItem(item._id)}
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  cursor: 'pointer',
                                  accentColor: '#22c55e'
                                }}
                              />
                              <span
                                style={{
                                  color: packedByUser ? '#94a3b8' : '#ffffff',
                                  textDecoration: packedByUser ? 'line-through' : 'none',
                                  fontWeight: packedByUser ? '500' : '600',
                                  fontSize: '0.95rem'
                                }}
                              >
                                {item.item}
                              </span>
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
              ⚠️ Replace Existing Checklist?
            </h2>

            <p style={{ color: '#cbd5e1', fontSize: '0.95rem', marginBottom: '20px', lineHeight: '1.5' }}>
              Generating a new packing checklist using TripPilot AI will replace your current saved checklist. Any packed statuses will be reset for all members.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowReplaceConfirm(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGeneratePackingList}
                className="btn btn-primary"
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
