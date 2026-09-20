import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios.js';
import NotificationBell from '../components/NotificationBell.jsx';
import {
  Sparkles,
  Compass,
  Image as ImageIcon,
  Plane,
  Star,
  Wallet,
  RotateCcw,
  Loader2,
  AlertTriangle
} from 'lucide-react';

/**
 * ✨ TripSummary Page Component: Displays a polished After-the-Trip Travel Recap & Summary.
 * Matches the light Trip Workspace visual system with clean editorial surfaces and left-aligned header.
 */
export default function TripSummary() {
  const { tripId } = useParams();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Check for existing saved summary on page load via GET endpoint
  const checkSavedSummary = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get(`/ai/trips/${tripId}/summary`);
      setSummary(response.data?.data?.summary || null);
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || 'Failed to check trip summary. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Trigger manual one-time summary generation on user button click via POST endpoint
  const handleGenerateSummary = async () => {
    setGenerating(true);
    setError('');

    try {
      const response = await api.post(`/ai/trips/${tripId}/summary`);
      setSummary(response.data?.data?.summary || null);
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || 'Failed to generate travel summary. Please try again.';
      setError(errorMessage);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    checkSavedSummary();
  }, [tripId]);

  return (
    <div className="tp-summary-container">
      {/* 🧭 Main Left-Aligned Trip Workspace Header */}
      <header className="tp-expenses-header">
        <div className="tp-expenses-header-left">
          <div className="tp-trip-overview-eyebrow">
            <span className="tp-trip-overview-line" />
            <span>TRIP SUMMARY</span>
          </div>

          <h1 className="tp-trip-overview-title" style={{ fontSize: '2.4rem', marginBottom: '8px' }}>
            Trip Summary
          </h1>

          <p style={{ color: '#64748b', fontSize: '0.92rem', margin: 0, lineHeight: 1.5 }}>
            An editorial narrative celebrating your journey highlights, itinerary memories, and budget summary
          </p>
        </div>

        <div className="tp-expenses-header-right">
          <div className="tp-workspace-bell-wrap">
            <NotificationBell tripId={tripId} />
          </div>
        </div>
      </header>

      {/* Loading State on initial GET check */}
      {loading && (
        <div className="tp-summary-status-card">
          <Loader2 size={30} className="animate-spin" style={{ color: '#ea580c', margin: '0 auto 14px auto' }} />
          <h3 style={{ color: '#0f172a', fontSize: '1.1rem', fontWeight: '700', marginBottom: '4px' }}>
            Checking Trip Workspace...
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
            Retrieving your saved travel summary.
          </p>
        </div>
      )}

      {/* Generating State on manual button click */}
      {generating && (
        <div
          className="tp-summary-status-card"
          style={{
            borderColor: 'rgba(234, 88, 12, 0.25)',
            boxShadow: '0 2px 14px rgba(234, 88, 12, 0.06)'
          }}
        >
          <div className="tp-summary-icon-circle">
            <Loader2 size={24} className="animate-spin" />
          </div>
          <h3 style={{ color: '#0f172a', fontSize: '1.2rem', fontWeight: '700', marginBottom: '8px' }}>
            Crafting Your Travel Story...
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.92rem', maxWidth: '520px', margin: '0 auto', lineHeight: '1.6' }}>
            Bringing together your itinerary highlights, expense statistics, and shared photo gallery memories into an editorial narrative.
          </p>
        </div>
      )}

      {/* Error State */}
      {!loading && !generating && error && (
        <div
          style={{
            marginBottom: '20px',
            padding: '16px 20px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <AlertTriangle size={16} style={{ color: '#dc2626' }} />
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: '#991b1b' }}>Action Failed</h4>
          </div>
          <p style={{ margin: '0 0 14px 0', fontSize: '0.88rem', color: '#b91c1c' }}>{error}</p>
          <button
            type="button"
            onClick={summary ? checkSavedSummary : handleGenerateSummary}
            className="tp-btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '6px 12px' }}
          >
            <RotateCcw size={13} /> Try Again
          </button>
        </div>
      )}

      {/* Empty State: No Summary Generated Yet */}
      {!loading && !generating && !error && !summary && (
        <div className="tp-summary-status-card">
          <div className="tp-summary-icon-circle">
            <Sparkles size={22} />
          </div>
          <h2 style={{ color: '#0f172a', fontSize: '1.35rem', fontWeight: '700', marginBottom: '8px' }}>
            Generate Your After-the-Trip Travel Recap
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.92rem', maxWidth: '520px', margin: '0 auto 24px auto', lineHeight: '1.6' }}>
            Bring together your completed itinerary activities, logged budget expenses, and shared photo gallery memories into a permanent, shareable trip summary.
          </p>
          <button
            type="button"
            onClick={handleGenerateSummary}
            className="tp-btn-primary"
            style={{ fontSize: '0.9rem', padding: '10px 22px' }}
          >
            <Sparkles size={16} /> Generate Travel Summary
          </button>
        </div>
      )}

      {/* Success / Saved Summary View */}
      {!loading && !generating && !error && summary && (
        <div className="tp-summary-sections">
          {/* 1. HERO TRAVEL STORY SECTION */}
          <div className="tp-summary-hero-card">
            <div className="tp-summary-subtle-eyebrow">
              TRAVEL STORY
            </div>

            <h2 className="tp-summary-headline">
              {summary.headline}
            </h2>

            {/* Traveler Persona + Shared Memories Blocks */}
            <div className="tp-summary-meta-grid">
              {/* Persona Block */}
              <div className="tp-summary-persona-block">
                <span className="tp-summary-persona-label">
                  <Compass size={14} /> Traveler Persona
                </span>
                <span className="tp-summary-persona-val">
                  {summary.travelerPersona || 'Explorer'}
                </span>
              </div>

              {/* Photo Memories Block */}
              <div className="tp-summary-memory-block">
                <span className="tp-summary-memory-label">
                  <ImageIcon size={14} /> Shared Memories
                </span>
                <span className="tp-summary-memory-val">
                  {summary.photoMemoriesCount || 0} Photos & Videos
                </span>
              </div>
            </div>
          </div>

          {/* 2. OVERVIEW / YOUR JOURNEY */}
          <div className="tp-summary-section-card">
            <h2 className="tp-summary-card-title">
              <Plane size={18} style={{ color: '#ea580c' }} />
              Your Journey
            </h2>
            <p className="tp-summary-journey-text">
              {summary.overview}
            </p>
          </div>

          {/* 3. KEY TRIP HIGHLIGHTS */}
          {summary.keyHighlights && summary.keyHighlights.length > 0 && (
            <div className="tp-summary-section-card">
              <h2 className="tp-summary-card-title">
                <Star size={18} style={{ color: '#ea580c' }} />
                Key Trip Highlights
              </h2>
              <div className="tp-summary-highlights-list">
                {summary.keyHighlights.map((highlight, idx) => (
                  <div key={idx} className="tp-summary-highlight-row">
                    <span className="tp-summary-sparkle-dot">✦</span>
                    <span className="tp-summary-highlight-text">
                      {highlight}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. FINANCIAL & BUDGET RECAP */}
          {summary.financialRecap && (
            <div className="tp-summary-section-card">
              <h2 className="tp-summary-card-title">
                <Wallet size={18} style={{ color: '#ea580c' }} />
                Financial & Budget Recap
              </h2>
              <div className="tp-summary-recap-container">
                <p className="tp-summary-recap-text">
                  {summary.financialRecap}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
