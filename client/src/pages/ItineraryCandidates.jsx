import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/axios.js';
import { formatDateToDisplay } from '../utils/dateUtils.js';

/**
 * 📋 ItineraryCandidates Page Component: Lists all saved itinerary candidates for a trip
 * with multi-select comparison capabilities.
 */
export default function ItineraryCandidates() {
  const { tripId } = useParams();
  const navigate = useNavigate();

  const [itineraries, setItineraries] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectionError, setSelectionError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteLoadingId, setDeleteLoadingId] = useState(null);

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const response = await api.get(`/trips/${tripId}/itineraries`);
        setItineraries(response.data?.data?.itineraries || []);
      } catch (err) {
        const errorMessage =
          err.response?.data?.message || 'Failed to fetch itinerary candidates. Please try again.';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchCandidates();
  }, [tripId]);

  const handleToggleSelect = (id) => {
    setSelectionError('');
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      if (selectedIds.length >= 2) {
        setSelectionError('Please select only two itineraries to compare.');
        return;
      }
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleCompare = () => {
    if (selectedIds.length !== 2) return;
    navigate(`/dashboard/trip/${tripId}/itineraries/compare?ids=${selectedIds[0]},${selectedIds[1]}`);
  };

  const handleDeleteCandidate = async (itineraryId) => {
    if (!window.confirm('Are you sure you want to delete this itinerary candidate? This action cannot be undone.')) {
      return;
    }

    setDeleteLoadingId(itineraryId);
    try {
      await api.delete(`/trips/${tripId}/itineraries/${itineraryId}`);
      setItineraries((prev) => prev.filter((item) => item._id !== itineraryId));
      setSelectedIds((prev) => prev.filter((id) => id !== itineraryId));
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || 'Failed to delete itinerary candidate. Please try again.';
      alert(errorMessage);
    } finally {
      setDeleteLoadingId(null);
    }
  };

  return (
    <div className="landing-container" style={{ padding: '40px 20px' }}>
      <div className="glass-card" style={{ maxWidth: '720px', width: '100%', textAlign: 'left' }}>
        <div className="badge">📋 Itinerary Candidates</div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <h1 className="page-title" style={{ fontSize: '2.2rem', marginBottom: '4px' }}>
              Itinerary Candidates
            </h1>
            <p className="hero-subtitle" style={{ fontSize: '0.95rem', margin: 0 }}>
              Select two candidates to compare side-by-side
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleCompare}
              disabled={selectedIds.length !== 2}
              className="btn btn-primary"
              style={{
                fontSize: '0.9rem',
                opacity: selectedIds.length !== 2 ? 0.5 : 1,
                cursor: selectedIds.length !== 2 ? 'not-allowed' : 'pointer'
              }}
            >
              ⚖️ Compare Selected ({selectedIds.length}/2)
            </button>
            <Link to={`/dashboard/trip/${tripId}/generate-itinerary`} className="btn btn-secondary" style={{ fontSize: '0.9rem' }}>
              🤖 Generate New
            </Link>
          </div>
        </div>

        {selectionError && (
          <div className="alert alert-error" style={{ marginBottom: '16px' }}>
            ⚠️ {selectionError}
          </div>
        )}

        {loading && (
          <div className="placeholder-box" style={{ textAlign: 'center', padding: '32px 20px' }}>
            <p>Loading itinerary candidates...</p>
          </div>
        )}

        {!loading && error && (
          <div className="alert alert-error">{error}</div>
        )}

        {!loading && !error && itineraries.length === 0 && (
          <div className="placeholder-box" style={{ textAlign: 'center', padding: '40px 20px', borderStyle: 'solid' }}>
            <h3 style={{ color: '#ffffff', fontSize: '1.2rem', marginBottom: '8px' }}>
              No saved itineraries yet.
            </h3>
            <p style={{ color: '#cbd5e1', marginBottom: '20px', fontSize: '0.95rem' }}>
              Generate custom day-by-day travel plans using TripPilot AI.
            </p>
            <Link to={`/dashboard/trip/${tripId}/generate-itinerary`} className="btn btn-primary">
              🤖 Generate your first itinerary
            </Link>
          </div>
        )}

        {!loading && !error && itineraries.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            {itineraries.map((item) => {
              const isSelected = selectedIds.includes(item._id);
              return (
                <div
                  key={item._id}
                  className="placeholder-box"
                  style={{
                    marginBottom: '0',
                    textAlign: 'left',
                    borderStyle: 'solid',
                    borderColor: isSelected
                      ? '#38bdf8'
                      : item.isActive
                      ? 'rgba(56, 189, 248, 0.4)'
                      : 'rgba(255, 255, 255, 0.1)',
                    background: isSelected
                      ? 'rgba(56, 189, 248, 0.12)'
                      : item.isActive
                      ? 'rgba(56, 189, 248, 0.06)'
                      : 'rgba(15, 23, 42, 0.6)',
                    padding: '20px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <input
                        type="checkbox"
                        id={`select-${item._id}`}
                        checked={isSelected}
                        onChange={() => handleToggleSelect(item._id)}
                        style={{
                          width: '20px',
                          height: '20px',
                          marginTop: '3px',
                          cursor: 'pointer',
                          accentColor: '#38bdf8'
                        }}
                      />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                          <label htmlFor={`select-${item._id}`} style={{ color: '#ffffff', fontSize: '1.2rem', fontWeight: '700', cursor: 'pointer', margin: 0 }}>
                            {item.title}
                          </label>
                          {item.isActive && (
                            <span
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                padding: '3px 10px',
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

                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                          {item.source === 'AI_GENERATED' ? '✨ AI Generated' : '✍️ Manual Plan'} • Created {formatDateToDisplay(item.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '20px', fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '16px', paddingLeft: '32px', flexWrap: 'wrap' }}>
                    <span>🎯 <strong>{item.activityCount}</strong> Activities</span>
                    <span>💰 Estimated Cost: <strong>₹{item.totalEstimatedCost}</strong></span>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', paddingLeft: '32px', flexWrap: 'wrap' }}>
                    <Link
                      to={`/dashboard/trip/${tripId}/itineraries/${item._id}`}
                      className="btn btn-secondary btn-sm"
                    >
                      👁️ View Itinerary
                    </Link>

                    {!item.isActive && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCandidate(item._id)}
                        disabled={deleteLoadingId === item._id}
                        className="btn btn-sm"
                        style={{
                          background: 'rgba(239, 68, 68, 0.2)',
                          color: '#fca5a5',
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          cursor: deleteLoadingId === item._id ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {deleteLoadingId === item._id ? 'Deleting...' : '🗑️ Delete'}
                      </button>
                    )}
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
    </div>
  );
}
