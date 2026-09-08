import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios.js';

/**
 * ✨ TripSummary Page Component: Displays a polished After-the-Trip AI Travel Recap & Summary.
 * Supports persistent one-time generation and saved summary retrieval.
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
        err.response?.data?.message || 'Failed to generate AI travel summary. Please try again.';
      setError(errorMessage);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    checkSavedSummary();
  }, [tripId]);

  return (
    <div className="landing-container" style={{ padding: '40px 20px' }}>
      <div className="glass-card" style={{ maxWidth: '1200px', width: '100%', textAlign: 'left' }}>
        
        {/* Loading State on initial GET check */}
        {loading && (
          <div className="placeholder-box" style={{ textAlign: 'center', padding: '50px 20px', borderRadius: '16px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🔍</div>
            <h3 style={{ color: '#38bdf8', fontSize: '1.2rem', fontWeight: '600', marginBottom: '8px' }}>
              Checking Trip Workspace...
            </h3>
            <p style={{ color: '#cbd5e1', fontSize: '0.95rem', margin: 0 }}>
              Retrieving your saved After-the-Trip AI Travel Summary.
            </p>
          </div>
        )}

        {/* Generating State on manual button click */}
        {generating && (
          <div className="placeholder-box" style={{ textAlign: 'center', padding: '50px 20px', borderRadius: '16px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🤖</div>
            <h3 style={{ color: '#38bdf8', fontSize: '1.25rem', fontWeight: '600', marginBottom: '8px' }}>
              Crafting Your AI Travel Recap...
            </h3>
            <p style={{ color: '#cbd5e1', fontSize: '0.95rem', maxWidth: '500px', margin: '0 auto', lineHeight: '1.5' }}>
              Gathering your trip itinerary highlights, expense statistics, and shared photo gallery memories into a permanent after-the-trip narrative.
            </p>
          </div>
        )}

        {/* Error State */}
        {!loading && !generating && error && (
          <div className="alert alert-error" style={{ marginBottom: '24px', padding: '20px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '1.05rem' }}>⚠️ Action Failed</h4>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.95rem', color: '#fca5a5' }}>{error}</p>
            <button type="button" onClick={summary ? checkSavedSummary : handleGenerateSummary} className="btn btn-secondary btn-sm">
              🔄 Try Again
            </button>
          </div>
        )}

        {/* Empty State: No Summary Generated Yet */}
        {!loading && !generating && !error && !summary && (
          <div
            className="placeholder-box"
            style={{
              textAlign: 'center',
              padding: '48px 24px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.7) 100%)',
              border: '1px solid rgba(56, 189, 248, 0.3)'
            }}
          >
            <div className="badge" style={{ marginBottom: '16px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8' }}>
              ✨ AI Travel Summary
            </div>
            <h2 style={{ color: '#ffffff', fontSize: '1.8rem', fontWeight: '700', marginBottom: '12px' }}>
              Generate Your After-the-Trip AI Travel Recap
            </h2>
            <p style={{ color: '#cbd5e1', fontSize: '1rem', maxWidth: '560px', margin: '0 auto 28px auto', lineHeight: '1.6' }}>
              Synthesize your completed itinerary activities, logged budget expenses, and shared photo gallery memories into a permanent, shareable trip summary.
            </p>
            <button
              type="button"
              onClick={handleGenerateSummary}
              className="btn btn-primary"
              style={{ fontSize: '1.05rem', padding: '12px 28px' }}
            >
              ✨ Generate AI Travel Summary
            </button>
          </div>
        )}

        {/* Success / Saved Summary View */}
        {!loading && !generating && !error && summary && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* 1. HERO SECTION */}
            <div
              className="placeholder-box"
              style={{
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%)',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                borderRadius: '16px',
                padding: '32px 28px',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)'
              }}
            >
              <div className="badge" style={{ marginBottom: '14px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8' }}>
                ✨ After-the-Trip Summary
              </div>
              <h1 style={{ color: '#ffffff', fontSize: '2.2rem', fontWeight: '800', lineHeight: '1.25', margin: '0 0 16px 0' }}>
                {summary.headline}
              </h1>

              {/* Stat / Badge Cards Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '14px',
                  marginTop: '20px'
                }}
              >
                {/* Persona Card */}
                <div
                  style={{
                    background: 'rgba(168, 85, 247, 0.15)',
                    border: '1px solid rgba(168, 85, 247, 0.35)',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <span style={{ color: '#c084fc', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    🧭 Your Traveler Persona
                  </span>
                  <span style={{ color: '#ffffff', fontSize: '1.1rem', fontWeight: '700' }}>
                    {summary.travelerPersona || 'Explorer'}
                  </span>
                </div>

                {/* Photo Memories Card */}
                <div
                  style={{
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.35)',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <span style={{ color: '#38bdf8', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    📸 Shared Memories
                  </span>
                  <span style={{ color: '#ffffff', fontSize: '1.1rem', fontWeight: '700' }}>
                    {summary.photoMemoriesCount || 0} Photos & Videos
                  </span>
                </div>
              </div>
            </div>

            {/* 2. OVERVIEW / YOUR JOURNEY */}
            <div
              className="placeholder-box"
              style={{
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '16px',
                padding: '24px'
              }}
            >
              <h2 style={{ color: '#ffffff', fontSize: '1.35rem', fontWeight: '700', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ✈️ Your Journey
              </h2>
              <p style={{ color: '#e2e8f0', fontSize: '1.02rem', lineHeight: '1.7', margin: 0 }}>
                {summary.overview}
              </p>
            </div>

            {/* 3. KEY HIGHLIGHTS SECTION */}
            {summary.keyHighlights && summary.keyHighlights.length > 0 && (
              <div
                className="placeholder-box"
                style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '16px',
                  padding: '24px'
                }}
              >
                <h2 style={{ color: '#ffffff', fontSize: '1.35rem', fontWeight: '700', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🌟 Key Trip Highlights
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {summary.keyHighlights.map((highlight, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'rgba(30, 41, 59, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '10px',
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px'
                      }}
                    >
                      <span style={{ color: '#38bdf8', fontSize: '1.1rem', marginTop: '1px' }}>✦</span>
                      <span style={{ color: '#cbd5e1', fontSize: '0.95rem', lineHeight: '1.5' }}>
                        {highlight}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. FINANCIAL & BUDGET RECAP */}
            {summary.financialRecap && (
              <div
                className="placeholder-box"
                style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '16px',
                  padding: '24px'
                }}
              >
                <h2 style={{ color: '#ffffff', fontSize: '1.35rem', fontWeight: '700', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  💰 Financial & Budget Recap
                </h2>
                <div
                  style={{
                    background: 'rgba(30, 41, 59, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    padding: '14px 16px'
                  }}
                >
                  <p style={{ color: '#cbd5e1', fontSize: '0.95rem', margin: 0, lineHeight: '1.6' }}>
                    {summary.financialRecap}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ marginTop: '28px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link to={`/dashboard/trip/${tripId}`} className="btn btn-secondary">
            ← Back to Trip Workspace
          </Link>
        </div>

      </div>
    </div>
  );
}

