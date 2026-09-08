import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios.js';

const INTEREST_OPTIONS = [
  'Nature',
  'Adventure',
  'Beaches',
  'Food',
  'Culture',
  'Nightlife',
  'Shopping',
  'Photography',
  'Trekking',
  'Wildlife'
];

/**
 * 🔎 DiscoverDestinations Component: Dedicated AI Destination Recommendation workspace.
 */
export default function DiscoverDestinations() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    startingLocation: '',
    estimatedBudget: '',
    budgetType: 'MID_RANGE',
    travelerCount: 1,
    travelCompanion: 'SOLO',
    startDate: '',
    endDate: '',
    interests: []
  });

  const [discovering, setDiscovering] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const toggleInterest = (interest) => {
    setFormData((prev) => {
      const exists = prev.interests.includes(interest);
      const updatedInterests = exists
        ? prev.interests.filter((item) => item !== interest)
        : [...prev.interests, interest];

      return {
        ...prev,
        interests: updatedInterests
      };
    });
  };

  // Find Destinations via Gemini AI
  const handleFindDestinations = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.startingLocation || !formData.startingLocation.trim()) {
      setError('Please enter a Starting Location.');
      return;
    }

    const budgetNum = Number(formData.estimatedBudget);
    if (isNaN(budgetNum) || budgetNum <= 0) {
      setError('Please enter a valid Estimated Budget (> 0).');
      return;
    }

    if (!formData.startDate) {
      setError('Please select a Start Date.');
      return;
    }

    if (!formData.endDate) {
      setError('Please select an End Date.');
      return;
    }

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      setError('End Date cannot be earlier than Start Date.');
      return;
    }

    if (!formData.interests || formData.interests.length === 0) {
      setError('Please select at least one Interest.');
      return;
    }

    const diffTime = end.getTime() - start.getTime();
    const durationDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);

    const payload = {
      budget: budgetNum,
      budgetType: formData.budgetType || 'MID_RANGE',
      travelerCount: Number(formData.travelerCount) || 1,
      travelCompanion: formData.travelCompanion || 'SOLO',
      durationDays,
      interests: formData.interests,
      startingLocation: formData.startingLocation.trim()
    };

    setDiscovering(true);

    try {
      const res = await api.post('/ai/discover-destinations', payload);
      const fetchedDestinations = res.data?.data?.destinations || [];
      setRecommendations(fetchedDestinations);
    } catch (err) {
      const msg =
        err.response?.data?.message || 'Failed to fetch AI destination recommendations. Please try again.';
      setError(msg);
    } finally {
      setDiscovering(false);
    }
  };

  // Navigate to Create Trip with Selected Destination
  const handleCreateTripWithDestination = (destObj) => {
    let formattedDestination = destObj.destination || '';
    const cityName = destObj.location?.city;

    if (
      cityName &&
      typeof cityName === 'string' &&
      !formattedDestination.toLowerCase().includes(cityName.toLowerCase())
    ) {
      formattedDestination = `${formattedDestination}, ${cityName}`;
    }

    navigate('/dashboard/create', {
      state: {
        selectedDestination: formattedDestination,
        startingLocation: formData.startingLocation,
        startDate: formData.startDate,
        endDate: formData.endDate,
        travelCompanion: formData.travelCompanion,
        budgetType: formData.budgetType,
        estimatedBudget: formData.estimatedBudget,
        travelerCount: formData.travelerCount,
        interests: formData.interests
      }
    });
  };

  const selectStyle = {
    width: '100%',
    padding: '12px 16px',
    background: '#1e293b',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '12px',
    color: '#f8fafc',
    fontSize: '0.95rem',
    outline: 'none'
  };

  return (
    <div className="landing-container" style={{ padding: '40px 20px' }}>
      <div className="glass-card" style={{ maxWidth: '860px', width: '100%', textAlign: 'left' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
          <div>
            <div className="badge" style={{ marginBottom: '6px' }}>🤖 AI Travel Discovery</div>
            <h1 className="page-title" style={{ fontSize: '2.2rem', marginBottom: '4px' }}>
              Discover Top Destinations
            </h1>
            <p className="hero-subtitle" style={{ fontSize: '0.95rem', margin: 0 }}>
              Let TripPilot AI analyze your budget, travel style, and interests to find your next ideal destination
            </p>
          </div>

          <Link to="/dashboard" className="btn btn-secondary" style={{ fontSize: '0.9rem' }}>
            ← Back to Dashboard
          </Link>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '20px' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Discovery Input Form */}
        <form onSubmit={handleFindDestinations} className="auth-form" style={{ marginBottom: '32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label htmlFor="startingLocation">Starting Location *</label>
              <input
                id="startingLocation"
                name="startingLocation"
                type="text"
                placeholder="e.g. Mumbai, India"
                value={formData.startingLocation}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="estimatedBudget">Total Est. Budget (₹) *</label>
              <input
                id="estimatedBudget"
                name="estimatedBudget"
                type="number"
                min="1"
                placeholder="e.g. 30000"
                value={formData.estimatedBudget}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label htmlFor="startDate">Start Date *</label>
              <input
                id="startDate"
                name="startDate"
                type="date"
                value={formData.startDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="endDate">End Date *</label>
              <input
                id="endDate"
                name="endDate"
                type="date"
                value={formData.endDate}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label htmlFor="budgetType">Budget Tier *</label>
              <select
                id="budgetType"
                name="budgetType"
                style={selectStyle}
                value={formData.budgetType}
                onChange={handleChange}
                required
              >
                <option value="BUDGET">Budget</option>
                <option value="MID_RANGE">Mid Range</option>
                <option value="LUXURY">Luxury</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="travelCompanion">Companion *</label>
              <select
                id="travelCompanion"
                name="travelCompanion"
                style={selectStyle}
                value={formData.travelCompanion}
                onChange={handleChange}
                required
              >
                <option value="SOLO">Solo</option>
                <option value="FRIENDS">Friends</option>
                <option value="FAMILY">Family</option>
                <option value="COUPLE">Couple</option>
                <option value="BUSINESS">Business</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="travelerCount">Travelers *</label>
              <input
                id="travelerCount"
                name="travelerCount"
                type="number"
                min="1"
                value={formData.travelerCount}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Interests */}
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label style={{ marginBottom: '10px' }}>Interests * (Select at least one)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {INTEREST_OPTIONS.map((interest) => {
                const selected = formData.interests.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className="feature-pill"
                    style={{
                      cursor: 'pointer',
                      background: selected ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      border: selected ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: selected ? '#38bdf8' : '#94a3b8',
                      fontWeight: selected ? '600' : 'normal',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {selected ? `✓ ${interest}` : `+ ${interest}`}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={discovering}
            className="btn btn-primary"
            style={{ width: '100%', fontSize: '1rem', opacity: discovering ? 0.6 : 1 }}
          >
            {discovering ? '🤖 Analyzing Travel Options...' : '✨ Find Destinations'}
          </button>
        </form>

        {/* Loading Indicator */}
        {discovering && (
          <div className="placeholder-box" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <p style={{ color: '#38bdf8', fontSize: '1.1rem', fontWeight: '600', marginBottom: '8px' }}>
              🤖 TripPilot AI is discovering top destinations...
            </p>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
              Calculating transportation, lodging, food, and activity costs for your trip.
            </p>
          </div>
        )}

        {/* Recommendations Section */}
        {!discovering && recommendations.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ color: '#ffffff', fontSize: '1.4rem', margin: 0, borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '10px' }}>
              ✨ Recommended Destinations ({recommendations.length})
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
              {recommendations.map((dest, idx) => (
                <div
                  key={idx}
                  className="placeholder-box"
                  style={{
                    marginBottom: 0,
                    textAlign: 'left',
                    borderStyle: 'solid',
                    borderColor: 'rgba(56, 189, 248, 0.25)',
                    background: 'rgba(15, 23, 42, 0.8)',
                    display: 'flex',
                    flexDirection: 'column',
                    justify: 'space-between',
                    padding: '20px'
                  }}
                >
                  <div>
                    {/* Header: Match & Cost */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span
                        style={{
                          background: 'rgba(34, 197, 94, 0.2)',
                          color: '#86efac',
                          border: '1px solid rgba(34, 197, 94, 0.4)',
                          padding: '3px 10px',
                          borderRadius: '50px',
                          fontWeight: '700',
                          fontSize: '0.8rem'
                        }}
                      >
                        🔥 {dest.matchPercentage}% Match
                      </span>
                      <span style={{ color: '#38bdf8', fontWeight: '700', fontSize: '1.05rem' }}>
                        Est. ₹{dest.estimatedBudgetCost?.toLocaleString('en-IN') || 0}
                      </span>
                    </div>

                    {/* Destination Title & Location */}
                    <h3 style={{ color: '#ffffff', fontSize: '1.3rem', marginBottom: '4px' }}>
                      {dest.destination}
                    </h3>
                    <p style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '12px' }}>
                      📍 {dest.location?.city}, {dest.location?.state}, {dest.location?.country}
                    </p>

                    {/* Short Description */}
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '14px' }}>
                      {dest.shortDescription}
                    </p>

                    {/* Pros & Cons */}
                    <div style={{ marginBottom: '14px', background: 'rgba(15, 23, 42, 0.5)', padding: '12px', borderRadius: '10px' }}>
                      {dest.pros && dest.pros.length > 0 && (
                        <div style={{ marginBottom: '8px' }}>
                          <strong style={{ color: '#86efac', fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>PROS:</strong>
                          <ul style={{ margin: 0, paddingLeft: '18px', color: '#cbd5e1', fontSize: '0.82rem' }}>
                            {dest.pros.map((p, i) => <li key={i}>{p}</li>)}
                          </ul>
                        </div>
                      )}
                      {dest.cons && dest.cons.length > 0 && (
                        <div>
                          <strong style={{ color: '#fca5a5', fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>CONS:</strong>
                          <ul style={{ margin: 0, paddingLeft: '18px', color: '#cbd5e1', fontSize: '0.82rem' }}>
                            {dest.cons.map((c, i) => <li key={i}>{c}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Best Time to Visit */}
                    {dest.bestTimeToVisit && (
                      <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 16px 0' }}>
                        🗓️ <strong>Best Time to Visit:</strong> {dest.bestTimeToVisit}
                      </p>
                    )}
                  </div>

                  {/* Create Trip Action Button */}
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ width: '100%', fontSize: '0.9rem', padding: '10px' }}
                    onClick={() => handleCreateTripWithDestination(dest)}
                  >
                    🚀 Create Trip with This Destination
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
