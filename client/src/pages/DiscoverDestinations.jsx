import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios.js';
import {
  ArrowLeft,
  Compass,
  MapPin,
  Calendar,
  IndianRupee,
  Wallet,
  Users,
  Sparkles,
  Globe,
  CheckCircle2,
  Check,
  Plus,
  X,
  AlertCircle,
  ArrowRight
} from 'lucide-react';

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
 * 🔎 DiscoverDestinations Component: Light travel workspace for discovering destinations.
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
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInterestInput, setCustomInterestInput] = useState('');

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

  const handleAddCustomInterest = () => {
    const trimmed = customInterestInput.trim();
    if (!trimmed) return;

    setFormData((prev) => {
      const alreadyExists = prev.interests.some(
        (item) => item.toLowerCase() === trimmed.toLowerCase()
      );
      if (alreadyExists) return prev;
      return {
        ...prev,
        interests: [...prev.interests, trimmed]
      };
    });

    setCustomInterestInput('');
  };

  // Find Destinations via backend service
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
        err.response?.data?.message || 'Failed to fetch destination recommendations. Please try again.';
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


  return (
    <div className="tp-discover-page">
      {/* 🧭 Subtle travel backdrop decorative accents */}
      <div className="tp-discover-bg-decor" aria-hidden="true">
        <div className="tp-discover-decor-glow tp-decor-glow-tr" />
        <div className="tp-discover-decor-glow tp-decor-glow-bl" />
        <svg className="tp-discover-route-svg" viewBox="0 0 1440 900" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M-50 160 C 260 80, 480 320, 820 180 C 1120 40, 1340 220, 1500 130"
            stroke="#f97316"
            strokeWidth="1.2"
            strokeDasharray="6 8"
            strokeOpacity="0.18"
          />
          <path
            d="M-80 560 C 300 440, 680 720, 1060 510 C 1340 370, 1420 560, 1540 500"
            stroke="#ea580c"
            strokeWidth="1"
            strokeDasharray="5 7"
            strokeOpacity="0.12"
          />
          <circle cx="820" cy="180" r="3.5" fill="#f97316" fillOpacity="0.3" />
          <circle cx="1060" cy="510" r="3" fill="#ea580c" fillOpacity="0.25" />
        </svg>
      </div>

      <div className="tp-discover-container">
        {/* ========================================================= */}
        {/* 🧭 1. TOP BRAND UTILITY BAR */}
        {/* ========================================================= */}
        <div className="tp-discover-top-bar">
          <Link to="/" className="tp-brand" title="TripPilot Home">
            <div className="tp-brand-icon-plane">
              <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="tp-plane-svg">
                <path d="M2.5 13L25.5 2.5L14 25.5L10.5 16L2.5 13Z" fill="#1e293b" />
                <path d="M10.5 16L25.5 2.5L14 25.5L10.5 16Z" fill="#0f172a" />
                <path d="M25.5 2.5L10.5 16" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
                <path d="M10.5 16V21.5L13.5 18.5" fill="#334155" stroke="#334155" strokeWidth="1" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="tp-brand-text-group">
              <span className="tp-brand-name">TripPilot</span>
              <span className="tp-brand-tagline">Plan • Explore • Belong</span>
            </div>
          </Link>

          <Link to="/dashboard" className="tp-discover-back-btn" title="Back to Dashboard">
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        {/* ========================================================= */}
        {/* 📋 2. PAGE HEADER */}
        {/* ========================================================= */}
        <header className="tp-discover-header">
          <span className="tp-discover-eyebrow">DESTINATION DISCOVERY</span>
          <h1 className="tp-create-trip-title">Find Your Next Destination</h1>
          <p className="tp-discover-subtitle">
            Share your budget, dates, and travel style to receive tailored destination recommendations curated for your journey.
          </p>
        </header>

        {error && (
          <div className="tp-discover-alert tp-discover-alert-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* ========================================================= */}
        {/* 🗺️ 3. MAIN TWO-COLUMN LAYOUT */}
        {/* ========================================================= */}
        <div className="tp-discover-layout">
          {/* LEFT: MAIN DESTINATION PREFERENCE FORM */}
          <div className="tp-discover-main-col">
            <form onSubmit={handleFindDestinations} className="tp-discover-card">
              <div className="tp-discover-card-header">
                <div className="tp-discover-icon-box tp-icon-box-orange">
                  <Compass size={18} />
                </div>
                <div>
                  <h2 className="tp-discover-card-title">Trip Preferences</h2>
                  <p className="tp-discover-card-desc">
                    Set your starting point, estimated budget, dates, and interests.
                  </p>
                </div>
              </div>

              <div className="tp-discover-fields">
                {/* Row 1: Starting Location & Estimated Budget */}
                <div className="tp-discover-grid-2">
                  <div className="tp-discover-field-group">
                    <label htmlFor="startingLocation" className="tp-discover-label">
                      Starting Location <span className="tp-discover-required">*</span>
                    </label>
                    <div className="tp-discover-input-wrapper">
                      <MapPin size={16} className="tp-discover-input-icon" />
                      <input
                        id="startingLocation"
                        name="startingLocation"
                        type="text"
                        className="tp-discover-input"
                        value={formData.startingLocation}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="tp-discover-field-group">
                    <label htmlFor="estimatedBudget" className="tp-discover-label">
                      Total Estimated Budget (₹) <span className="tp-discover-required">*</span>
                    </label>
                    <div className="tp-discover-input-wrapper">
                      <IndianRupee size={16} className="tp-discover-input-icon" />
                      <input
                        id="estimatedBudget"
                        name="estimatedBudget"
                        type="number"
                        min="1"
                        className="tp-discover-input"
                        value={formData.estimatedBudget}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Row 2: Start Date & End Date */}
                <div className="tp-discover-grid-2">
                  <div className="tp-discover-field-group">
                    <label htmlFor="startDate" className="tp-discover-label">
                      Start Date <span className="tp-discover-required">*</span>
                    </label>
                    <div className="tp-discover-input-wrapper">
                      <Calendar size={16} className="tp-discover-input-icon" />
                      <input
                        id="startDate"
                        name="startDate"
                        type="date"
                        className="tp-discover-input"
                        value={formData.startDate}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="tp-discover-field-group">
                    <label htmlFor="endDate" className="tp-discover-label">
                      End Date <span className="tp-discover-required">*</span>
                    </label>
                    <div className="tp-discover-input-wrapper">
                      <Calendar size={16} className="tp-discover-input-icon" />
                      <input
                        id="endDate"
                        name="endDate"
                        type="date"
                        className="tp-discover-input"
                        value={formData.endDate}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Row 3: Budget Tier, Companion, Travelers */}
                <div className="tp-discover-grid-3">
                  <div className="tp-discover-field-group">
                    <label htmlFor="budgetType" className="tp-discover-label">
                      Budget Tier <span className="tp-discover-required">*</span>
                    </label>
                    <div className="tp-discover-input-wrapper">
                      <Wallet size={16} className="tp-discover-input-icon" />
                      <select
                        id="budgetType"
                        name="budgetType"
                        className="tp-discover-select"
                        value={formData.budgetType}
                        onChange={handleChange}
                        required
                      >
                        <option value="BUDGET">Budget</option>
                        <option value="MID_RANGE">Mid Range</option>
                        <option value="LUXURY">Luxury</option>
                      </select>
                    </div>
                  </div>

                  <div className="tp-discover-field-group">
                    <label htmlFor="travelCompanion" className="tp-discover-label">
                      Companion <span className="tp-discover-required">*</span>
                    </label>
                    <div className="tp-discover-input-wrapper">
                      <Users size={16} className="tp-discover-input-icon" />
                      <select
                        id="travelCompanion"
                        name="travelCompanion"
                        className="tp-discover-select"
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
                  </div>

                  <div className="tp-discover-field-group">
                    <label htmlFor="travelerCount" className="tp-discover-label">
                      Travelers <span className="tp-discover-required">*</span>
                    </label>
                    <div className="tp-discover-input-wrapper">
                      <Users size={16} className="tp-discover-input-icon" />
                      <input
                        id="travelerCount"
                        name="travelerCount"
                        type="number"
                        min="1"
                        className="tp-discover-input"
                        value={formData.travelerCount}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Interests Chips */}
                <div className="tp-discover-field-group">
                  <label className="tp-discover-label">
                    Interests <span className="tp-discover-required">*</span> (Select at least one)
                  </label>
                  <div className="tp-discover-interests-chips">
                    {/* Predefined Interest Options */}
                    {INTEREST_OPTIONS.map((interest) => {
                      const selected = formData.interests.includes(interest);
                      return (
                        <button
                          key={interest}
                          type="button"
                          onClick={() => toggleInterest(interest)}
                          className={`tp-discover-interest-chip ${selected ? 'selected' : ''}`}
                        >
                          {selected ? <Check size={14} /> : <Plus size={14} />}
                          <span>{interest}</span>
                        </button>
                      );
                    })}

                    {/* Selected Custom Interest Chips */}
                    {formData.interests
                      .filter((item) => !INTEREST_OPTIONS.includes(item))
                      .map((customInt) => (
                        <button
                          key={customInt}
                          type="button"
                          onClick={() => toggleInterest(customInt)}
                          className="tp-discover-interest-chip selected"
                        >
                          <Check size={14} />
                          <span>{customInt}</span>
                        </button>
                      ))}

                    {/* Custom Interest Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setShowCustomInput((prev) => !prev)}
                      className="tp-discover-interest-chip tp-discover-interest-chip-custom"
                    >
                      {showCustomInput ? (
                        <>
                          <X size={14} />
                          <span>Close Custom</span>
                        </>
                      ) : (
                        <>
                          <Plus size={14} />
                          <span>Custom Interest</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Custom Interest Input Field */}
                  {showCustomInput && (
                    <div className="tp-discover-custom-input-row">
                      <input
                        type="text"
                        className="tp-discover-input"
                        value={customInterestInput}
                        onChange={(e) => setCustomInterestInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomInterest();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomInterest}
                        className="tp-discover-btn-add-custom"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>

                {/* Primary Action Button */}
                <button
                  type="submit"
                  disabled={discovering}
                  className="tp-discover-btn-submit"
                >
                  {discovering ? (
                    <>
                      <span className="tp-discover-spinner" />
                      <span>Discovering Destinations...</span>
                    </>
                  ) : (
                    <>
                      <Compass size={18} />
                      <span>Find Destinations</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* RIGHT: COMPACT INSPIRATION PANEL */}
          <aside className="tp-discover-side-panel">
            <div className="tp-discover-side-card">
              <div className="tp-discover-side-header">
                <div className="tp-discover-icon-box tp-icon-box-orange">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="tp-discover-side-title">Explore More</h3>
                  <span className="tp-discover-side-subtitle">Trip Insights</span>
                </div>
              </div>

              <div className="tp-discover-side-list">
                <div className="tp-discover-side-item">
                  <div className="tp-discover-side-icon-box">
                    <Compass size={16} />
                  </div>
                  <div className="tp-discover-side-text">
                    <h4 className="tp-discover-side-heading">Personalized Suggestions</h4>
                    <p className="tp-discover-side-desc">
                      Get destination ideas based on your budget, interests, and travel style.
                    </p>
                  </div>
                </div>

                <div className="tp-discover-side-item">
                  <div className="tp-discover-side-icon-box">
                    <Globe size={16} />
                  </div>
                  <div className="tp-discover-side-text">
                    <h4 className="tp-discover-side-heading">Discover New Places</h4>
                    <p className="tp-discover-side-desc">
                      Explore destinations that match what you want from your trip.
                    </p>
                  </div>
                </div>

                <div className="tp-discover-side-item">
                  <div className="tp-discover-side-icon-box">
                    <CheckCircle2 size={16} />
                  </div>
                  <div className="tp-discover-side-text">
                    <h4 className="tp-discover-side-heading">Plan with Confidence</h4>
                    <p className="tp-discover-side-desc">
                      Find a destination that fits your travel preferences.
                    </p>
                  </div>
                </div>
              </div>

              {/* Decorative Accent Divider */}
              <div className="tp-discover-side-divider">
                <svg viewBox="0 0 120 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="tp-discover-flight-line">
                  <path d="M0 6H48" stroke="#f97316" strokeWidth="1" strokeDasharray="3 3" opacity="0.35" />
                  <path d="M72 6H120" stroke="#f97316" strokeWidth="1" strokeDasharray="3 3" opacity="0.35" />
                  <polygon points="56,3 64,6 56,9 58,6" fill="#ea580c" opacity="0.75" />
                </svg>
              </div>

              <div className="tp-discover-side-footer">
                <span className="tp-discover-tagline">Plan • Explore • Belong</span>
              </div>
            </div>
          </aside>
        </div>

        {/* ========================================================= */}
        {/* ⏳ 4. LOADING STATE */}
        {/* ========================================================= */}
        {discovering && (
          <div className="tp-discover-loading-card">
            <div className="tp-discover-loading-spinner" />
            <h3 className="tp-discover-loading-title">
              TripPilot is discovering top destinations...
            </h3>
            <p className="tp-discover-loading-desc">
              Calculating transportation, lodging, food, and activity costs for your trip.
            </p>
          </div>
        )}

        {/* ========================================================= */}
        {/* 📍 5. RECOMMENDATIONS SECTION */}
        {/* ========================================================= */}
        {!discovering && recommendations.length > 0 && (
          <div className="tp-discover-results-section">
            <div className="tp-discover-results-header">
              <span className="tp-discover-eyebrow">TAILORED RECOMMENDATIONS</span>
              <h2 className="tp-discover-results-title">
                Recommended Destinations ({recommendations.length})
              </h2>
              <p className="tp-discover-results-subtitle">
                Based on your preferences, here are some destinations we think you'll love.
              </p>
            </div>

            {/* Clean 2-Column x 2-Row Results Grid */}
            <div className="tp-discover-results-grid">
              {recommendations.map((dest, idx) => (
                <div key={idx} className="tp-discover-dest-card">
                  <div className="tp-dest-card-main">
                    {/* Destination Image (if available) */}
                    {dest.image && (
                      <div className="tp-dest-card-img-wrap">
                        <img src={dest.image} alt={dest.destination} className="tp-dest-card-img" />
                      </div>
                    )}

                    {/* Top Row: Match Badge & Est. Budget */}
                    <div className="tp-dest-card-top">
                      <span className="tp-dest-match-badge">
                        <CheckCircle2 size={13} />
                        <span>{dest.matchPercentage}% Match</span>
                      </span>
                      <div className="tp-dest-cost-chip">
                        <span className="tp-dest-cost-prefix">Est.</span>
                        <span className="tp-dest-cost-amount">₹{dest.estimatedBudgetCost?.toLocaleString('en-IN') || 0}</span>
                      </div>
                    </div>

                    {/* Destination Title & Location */}
                    <div className="tp-dest-card-heading-group">
                      <h3 className="tp-dest-card-title">{dest.destination}</h3>
                      <p className="tp-dest-card-location">
                        <MapPin size={14} className="tp-dest-loc-icon" />
                        <span>{dest.location?.city}, {dest.location?.state}, {dest.location?.country}</span>
                      </p>
                    </div>

                    {/* Short Description */}
                    <p className="tp-dest-card-desc">{dest.shortDescription}</p>

                    {/* Compact Pros & Cons Columns (Side-by-Side) */}
                    {(dest.pros?.length > 0 || dest.cons?.length > 0) && (
                      <div className="tp-dest-card-pros-cons-grid">
                        {dest.pros && dest.pros.length > 0 && (
                          <div className="tp-dest-pros-box">
                            <span className="tp-dest-pros-title">
                              <Check size={12} />
                              <span>PROS</span>
                            </span>
                            <ul className="tp-dest-pros-list">
                              {dest.pros.map((p, i) => (
                                <li key={i} className="tp-dest-pro-item">
                                  <Check size={11} className="tp-pro-bullet" />
                                  <span>{p}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {dest.cons && dest.cons.length > 0 && (
                          <div className="tp-dest-cons-box">
                            <span className="tp-dest-cons-title">
                              <AlertCircle size={12} />
                              <span>CONS</span>
                            </span>
                            <ul className="tp-dest-cons-list">
                              {dest.cons.map((c, i) => (
                                <li key={i} className="tp-dest-con-item">
                                  <span className="tp-con-bullet">✕</span>
                                  <span>{c}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Best Time to Visit (Placed Below Pros/Cons) */}
                    {dest.bestTimeToVisit && (
                      <div className="tp-dest-meta-pill">
                        <Calendar size={13} className="tp-dest-meta-icon" />
                        <span className="tp-dest-meta-label">Best Time to Visit:</span>
                        <span className="tp-dest-meta-val">{dest.bestTimeToVisit}</span>
                      </div>
                    )}
                  </div>

                  {/* Create Trip Action Button */}
                  <button
                    type="button"
                    className="tp-dest-card-btn-action"
                    onClick={() => handleCreateTripWithDestination(dest)}
                  >
                    <span>Create Trip with This Destination</span>
                    <ArrowRight size={16} />
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
