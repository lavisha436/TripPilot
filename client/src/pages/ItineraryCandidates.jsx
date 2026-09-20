import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/axios.js';
import { formatDateToDisplay } from '../utils/dateUtils.js';
import {
  Layers,
  Scale,
  Sparkles,
  Star,
  Trash2,
  Eye,
  Calendar,
  IndianRupee,
  Loader2,
  AlertTriangle
} from 'lucide-react';

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
    <div className="tp-workspace-subpage">
      <div className="tp-subpage-container" style={{ maxWidth: '820px' }}>
        {/* Subpage Header */}
        <div className="tp-subpage-header">
          <div className="tp-trip-overview-eyebrow">
            <span className="tp-trip-overview-line" />
            <span>ITINERARY VERSIONS</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginTop: '6px', width: '100%' }}>
            <div>
              <h1 className="tp-subpage-title" style={{ margin: '0 0 4px 0' }}>
                Itinerary Versions
              </h1>
              <p className="tp-subpage-subtitle" style={{ margin: 0 }}>
                Select two candidates to compare side-by-side or manage saved plans
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleCompare}
                disabled={selectedIds.length !== 2}
                className="tp-action-btn-primary"
                style={{
                  fontSize: '0.85rem',
                  padding: '8px 18px',
                  opacity: selectedIds.length !== 2 ? 0.5 : 1,
                  cursor: selectedIds.length !== 2 ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Scale size={15} /> Compare Selected ({selectedIds.length}/2)
              </button>
              <Link
                to={`/dashboard/trip/${tripId}/generate-itinerary`}
                className="tp-action-btn-secondary"
                style={{ fontSize: '0.85rem', padding: '8px 18px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Sparkles size={15} /> Generate New
              </Link>
            </div>
          </div>
        </div>

        {selectionError && (
          <div
            style={{
              marginBottom: '16px',
              padding: '12px 16px',
              background: '#fffbeb',
              border: '1px solid #fef3c7',
              borderRadius: '10px',
              color: '#92400e',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <AlertTriangle size={16} />
            {selectionError}
          </div>
        )}

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
            <p style={{ color: '#64748b', fontSize: '0.92rem', margin: 0 }}>Loading itinerary candidates...</p>
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

        {!loading && !error && itineraries.length === 0 && (
          <div
            style={{
              background: '#ffffff',
              border: '1px dashed rgba(15, 23, 42, 0.15)',
              borderRadius: '16px',
              padding: '48px 24px',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'rgba(234, 88, 12, 0.08)',
                color: '#ea580c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px auto'
              }}
            >
              <Layers size={24} />
            </div>
            <h3 style={{ color: '#0f172a', fontSize: '1.1rem', fontWeight: '700', marginBottom: '6px' }}>
              No saved itineraries yet
            </h3>
            <p style={{ color: '#64748b', marginBottom: '22px', fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto 22px auto', lineHeight: '1.5' }}>
              Generate custom day-by-day travel plans using TripPilot.
            </p>
            <Link
              to={`/dashboard/trip/${tripId}/generate-itinerary`}
              className="tp-action-btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Sparkles size={16} /> Generate your first itinerary
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
                  style={{
                    background: '#ffffff',
                    border: isSelected
                      ? '2px solid #ea580c'
                      : item.isActive
                      ? '1.5px solid rgba(234, 88, 12, 0.35)'
                      : '1px solid rgba(15, 23, 42, 0.08)',
                    borderRadius: '16px',
                    padding: '22px',
                    boxShadow: isSelected
                      ? '0 6px 20px rgba(234, 88, 12, 0.1)'
                      : '0 2px 10px rgba(15, 23, 42, 0.03)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <input
                        type="checkbox"
                        id={`select-${item._id}`}
                        checked={isSelected}
                        onChange={() => handleToggleSelect(item._id)}
                        style={{
                          width: '18px',
                          height: '18px',
                          marginTop: '3px',
                          cursor: 'pointer',
                          accentColor: '#ea580c'
                        }}
                      />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                          <label htmlFor={`select-${item._id}`} style={{ color: '#0f172a', fontSize: '1.15rem', fontWeight: '700', cursor: 'pointer', margin: 0 }}>
                            {item.title}
                          </label>
                          {item.isActive && (
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

                        <span style={{ fontSize: '0.82rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={13} style={{ color: '#94a3b8' }} />
                          {item.source === 'AI_GENERATED' ? 'Smart Plan' : 'Manual Plan'} • Created {formatDateToDisplay(item.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '20px', fontSize: '0.88rem', color: '#475569', marginBottom: '16px', paddingLeft: '30px', flexWrap: 'wrap' }}>
                    <span>
                      Activities: <strong style={{ color: '#0f172a' }}>{item.activityCount}</strong>
                    </span>
                    <span>
                      Estimated Cost: <strong style={{ color: '#0f172a' }}>₹{Number(item.totalEstimatedCost || 0).toLocaleString('en-IN')}</strong>
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', paddingLeft: '30px', flexWrap: 'wrap' }}>
                    <Link
                      to={`/dashboard/trip/${tripId}/itineraries/${item._id}`}
                      className="tp-action-btn-secondary"
                      style={{ fontSize: '0.82rem', padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                    >
                      <Eye size={13} /> View Itinerary
                    </Link>

                    {!item.isActive && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCandidate(item._id)}
                        disabled={deleteLoadingId === item._id}
                        className="tp-action-btn-danger"
                        style={{
                          fontSize: '0.82rem',
                          padding: '6px 14px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          cursor: deleteLoadingId === item._id ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <Trash2 size={13} />
                        {deleteLoadingId === item._id ? 'Deleting...' : 'Delete'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
