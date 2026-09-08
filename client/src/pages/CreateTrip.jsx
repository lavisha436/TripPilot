import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
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
 * 📝 CreateTrip Component: Form for creating a new travel workspace.
 */
export default function CreateTrip() {
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    title: '',
    destination: '',
    startingLocation: '',
    startDate: '',
    endDate: '',
    travelCompanion: 'SOLO',
    budgetType: 'MID_RANGE',
    transportationMode: '',
    accommodationType: '',
    estimatedBudget: '',
    currency: 'INR',
    travelerCount: 1,
    description: '',
    interests: []
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [budgetEstimate, setBudgetEstimate] = useState({
    intercityTransport: 0,
    accommodation: 0,
    buffer: 0
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInterestInput, setCustomInterestInput] = useState('');

  // Pre-fill form data if passed from Destination Discovery page
  useEffect(() => {
    if (location.state?.selectedDestination) {
      const destName = location.state.selectedDestination;
      setFormData((prev) => ({
        ...prev,
        destination: destName || prev.destination,
        startingLocation: location.state.startingLocation || prev.startingLocation,
        startDate: location.state.startDate || prev.startDate,
        endDate: location.state.endDate || prev.endDate,
        travelCompanion: location.state.travelCompanion || prev.travelCompanion,
        budgetType: location.state.budgetType || prev.budgetType,
        transportationMode: location.state.transportationMode || prev.transportationMode,
        accommodationType: location.state.accommodationType || prev.accommodationType,
        estimatedBudget: location.state.estimatedBudget || prev.estimatedBudget,
        travelerCount: location.state.travelerCount || prev.travelerCount,
        interests: Array.isArray(location.state.interests) ? location.state.interests : prev.interests,
        title: prev.title || `Trip to ${destName}`
      }));
    }
  }, [location.state]);

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

  const handleEstimateChange = (e) => {
    const { name, value } = e.target;
    const numVal = Math.max(0, Number(value) || 0);
    setBudgetEstimate((prev) => ({
      ...prev,
      [name]: numVal
    }));
  };

  // Step 1 Submit: Fetch AI Budget Estimate & move to Step 2
  const handleStep1Submit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.transportationMode || !formData.accommodationType) {
      setError('Please select both transportation mode and accommodation preference.');
      return;
    }

    if (!formData.estimatedBudget || Number(formData.estimatedBudget) <= 0) {
      setError('Please enter a valid estimated total budget greater than zero.');
      return;
    }

    setLoading(true);

    const payload = {
      startingLocation: formData.startingLocation,
      destination: formData.destination,
      startDate: formData.startDate,
      endDate: formData.endDate,
      travelerCount: Number(formData.travelerCount),
      transportationMode: formData.transportationMode,
      accommodationType: formData.accommodationType,
      totalBudget: Number(formData.estimatedBudget),
      currency: formData.currency || 'INR'
    };

    try {
      const response = await api.post('/ai/estimate-budget', payload);
      const est = response.data?.data?.estimate || {};

      setBudgetEstimate({
        intercityTransport: Number(est.intercityTransport) || 0,
        accommodation: Number(est.accommodation) || 0,
        buffer: Number(est.buffer) || 0
      });

      setCurrentStep(2);
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || 'Failed to generate AI budget estimate. Please verify your inputs.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToStep1 = () => {
    setError('');
    setCurrentStep(1);
  };

  // Step 2 Submit: Final Trip Creation
  const handleConfirmCreateTrip = async () => {
    setError('');
    setLoading(true);

    const requestBody = {
      title: formData.title,
      destination: formData.destination,
      startingLocation: formData.startingLocation,
      startDate: formData.startDate,
      endDate: formData.endDate,
      travelCompanion: formData.travelCompanion,
      budgetType: formData.budgetType,
      transportationMode: formData.transportationMode,
      accommodationType: formData.accommodationType,
      budget: {
        estimated: Number(formData.estimatedBudget),
        currency: formData.currency || 'INR',
        reserved: {
          intercityTransport: Number(budgetEstimate.intercityTransport) || 0,
          accommodation: Number(budgetEstimate.accommodation) || 0,
          buffer: Number(budgetEstimate.buffer) || 0
        }
      },
      description: formData.description,
      travelerCount: Number(formData.travelerCount),
      interests: formData.interests
    };

    try {
      const response = await api.post('/trips', requestBody);
      const newTripId = response.data?.data?.trip?._id;

      if (newTripId) {
        navigate(`/dashboard/trip/${newTripId}`);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || 'Failed to create trip. Please verify your inputs.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
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

  const textareaStyle = {
    width: '100%',
    padding: '12px 16px',
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '12px',
    color: '#f8fafc',
    fontSize: '0.95rem',
    outline: 'none',
    resize: 'vertical',
    minHeight: '80px'
  };

  // Preview calculations for Step 2
  const totalBudgetNum = Number(formData.estimatedBudget) || 0;
  const intercityTransportNum = Number(budgetEstimate.intercityTransport) || 0;
  const accommodationNum = Number(budgetEstimate.accommodation) || 0;
  const bufferNum = Number(budgetEstimate.buffer) || 0;

  const reservedTotal = intercityTransportNum + accommodationNum + bufferNum;
  const itineraryBudget = Math.max(0, totalBudgetNum - reservedTotal);
  const isOverReserved = reservedTotal > totalBudgetNum;
  const currCode = (formData.currency || 'INR').toUpperCase();
  const currSymbol = currCode === 'INR' ? '₹' : `${currCode} `;

  return (
    <div className="landing-container" style={{ padding: '40px 20px' }}>
      <div className="glass-card" style={{ maxWidth: '640px', width: '100%', textAlign: 'left' }}>
        <div className="badge">
          {currentStep === 1 ? '✈️ Step 1 of 2: Trip Details' : '📊 Step 2 of 2: Budget Planning'}
        </div>

        {currentStep === 1 && (
          <>
            <h1 className="page-title" style={{ fontSize: '2.2rem' }}>Create a New Trip</h1>
            <p className="hero-subtitle" style={{ fontSize: '1rem', marginBottom: '24px' }}>
              Fill in your travel details to set up your AI workspace
            </p>

            {error && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{error}</div>}

            <form onSubmit={handleStep1Submit} className="auth-form">
              {/* 1. Title */}
              <div className="form-group">
                <label htmlFor="title">Trip Title *</label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  placeholder="e.g. Summer Vacation in Goa"
                  value={formData.title}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* 2. Destination & 3. Starting Location */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="destination">Destination *</label>
                  <input
                    id="destination"
                    name="destination"
                    type="text"
                    placeholder="e.g. Goa, India"
                    value={formData.destination}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="startingLocation">Starting Location *</label>
                  <input
                    id="startingLocation"
                    name="startingLocation"
                    type="text"
                    placeholder="e.g. Mumbai"
                    value={formData.startingLocation}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {/* 4. Start Date & 5. End Date */}
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

              {/* 6. Travel Companion & 7. Budget Type */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="travelCompanion">Travel Companion *</label>
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
                  <label htmlFor="budgetType">Budget Type *</label>
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
              </div>

              {/* 7b. Transportation & Accommodation Preferences */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="transportationMode">How will you travel to/from the destination? *</label>
                  <select
                    id="transportationMode"
                    name="transportationMode"
                    style={selectStyle}
                    value={formData.transportationMode}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Transportation</option>
                    <option value="FLIGHT">Flight</option>
                    <option value="TRAIN">Train</option>
                    <option value="BUS">Bus</option>
                    <option value="OWN_VEHICLE">Own Vehicle</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="accommodationType">What type of accommodation do you prefer? *</label>
                  <select
                    id="accommodationType"
                    name="accommodationType"
                    style={selectStyle}
                    value={formData.accommodationType}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Accommodation</option>
                    <option value="BUDGET">Budget</option>
                    <option value="THREE_STAR">3-Star</option>
                    <option value="FOUR_STAR">4-Star</option>
                    <option value="FIVE_STAR">5-Star</option>
                  </select>
                </div>
              </div>

              {/* 8. Estimated Budget, 9. Currency, & 10. Traveler Count */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="estimatedBudget">Est. Budget *</label>
                  <input
                    id="estimatedBudget"
                    name="estimatedBudget"
                    type="number"
                    min="0"
                    placeholder="e.g. 25000"
                    value={formData.estimatedBudget}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="currency">Currency</label>
                  <input
                    id="currency"
                    name="currency"
                    type="text"
                    placeholder="INR"
                    value={formData.currency}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="travelerCount">Travelers</label>
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

              {/* 11. Description */}
              <div className="form-group">
                <label htmlFor="description">Trip Description</label>
                <textarea
                  id="description"
                  name="description"
                  placeholder="Add optional notes about your trip goals..."
                  style={textareaStyle}
                  value={formData.description}
                  onChange={handleChange}
                />
              </div>

              {/* 12. Interests Selector */}
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label style={{ marginBottom: '10px' }}>Interests * (Select at least one)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                  {/* Predefined Interest Options */}
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

                  {/* Selected Custom Interest Pills */}
                  {formData.interests
                    .filter((item) => !INTEREST_OPTIONS.includes(item))
                    .map((customInt) => (
                      <button
                        key={customInt}
                        type="button"
                        onClick={() => toggleInterest(customInt)}
                        className="feature-pill"
                        style={{
                          cursor: 'pointer',
                          background: 'rgba(56, 189, 248, 0.2)',
                          border: '1px solid #38bdf8',
                          color: '#38bdf8',
                          fontWeight: '600',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        ✓ {customInt}
                      </button>
                    ))}

                  {/* Custom Interest Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setShowCustomInput((prev) => !prev)}
                    className="feature-pill"
                    style={{
                      cursor: 'pointer',
                      background: showCustomInput ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      border: showCustomInput ? '1px dashed #38bdf8' : '1px dashed rgba(255, 255, 255, 0.2)',
                      color: showCustomInput ? '#38bdf8' : '#cbd5e1',
                      fontWeight: '500',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {showCustomInput ? '✕ Close Custom' : '＋ Custom Interest'}
                  </button>
                </div>

                {/* Custom Interest Input Field */}
                {showCustomInput && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <input
                      type="text"
                      placeholder="Enter your interest (e.g. Street Photography)"
                      value={customInterestInput}
                      onChange={(e) => setCustomInterestInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomInterest();
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        background: '#1e293b',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '10px',
                        color: '#f8fafc',
                        fontSize: '0.9rem',
                        outline: 'none'
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomInterest}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '8px 16px', borderRadius: '10px' }}
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>

              {/* Form Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <Link to="/dashboard" className="btn btn-secondary">
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ opacity: loading ? 0.6 : 1 }}
                >
                  {loading ? 'Estimating AI Budget...' : 'Next: Budget Plan →'}
                </button>
              </div>
            </form>
          </>
        )}

        {currentStep === 2 && (
          <>
            <h1 className="page-title" style={{ fontSize: '2.2rem' }}>Budget Planning Preview</h1>
            <p className="hero-subtitle" style={{ fontSize: '1rem', marginBottom: '24px' }}>
              Review and adjust AI-estimated baseline allocations for your trip to{' '}
              <strong style={{ color: '#38bdf8' }}>{formData.destination}</strong>
            </p>

            {error && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{error}</div>}

            {isOverReserved && (
              <div
                className="alert"
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#fca5a5',
                  marginBottom: '20px'
                }}
              >
                ⚠️ Reserved baseline total ({currSymbol}{reservedTotal.toLocaleString()}) exceeds your total estimated trip budget ({currSymbol}{totalBudgetNum.toLocaleString()}). Your itinerary budget is set to 0. You may adjust your estimates below.
              </div>
            )}

            <div className="auth-form">
              {/* Total Budget Card (Read only) */}
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  marginBottom: '20px',
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem', display: 'block' }}>Total Estimated Budget</span>
                  <span style={{ color: '#f8fafc', fontSize: '1.4rem', fontWeight: '700' }}>
                    {currSymbol}{totalBudgetNum.toLocaleString()}
                  </span>
                </div>
                <div style={{ color: '#38bdf8', fontSize: '0.9rem', fontWeight: '600' }}>
                  {formData.travelerCount} Traveler(s)
                </div>
              </div>

              {/* Editable Baseline Allocations */}
              <div className="form-group">
                <label htmlFor="intercityTransport">Intercity Transportation (Round Trip) *</label>
                <input
                  id="intercityTransport"
                  name="intercityTransport"
                  type="number"
                  min="0"
                  value={budgetEstimate.intercityTransport}
                  onChange={handleEstimateChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="accommodation">Accommodation Estimate *</label>
                <input
                  id="accommodation"
                  name="accommodation"
                  type="number"
                  min="0"
                  value={budgetEstimate.accommodation}
                  onChange={handleEstimateChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="buffer">Emergency / Miscellaneous Buffer *</label>
                <input
                  id="buffer"
                  name="buffer"
                  type="number"
                  min="0"
                  value={budgetEstimate.buffer}
                  onChange={handleEstimateChange}
                />
              </div>

              {/* Summary Calculations Card */}
              <div
                style={{
                  background: 'rgba(30, 41, 59, 0.7)',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid rgba(56, 189, 248, 0.2)',
                  marginBottom: '24px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px'
                }}
              >
                <div>
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem', display: 'block' }}>Reserved Total</span>
                  <span style={{ color: isOverReserved ? '#ef4444' : '#38bdf8', fontSize: '1.3rem', fontWeight: '700' }}>
                    {currSymbol}{reservedTotal.toLocaleString()}
                  </span>
                </div>

                <div>
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem', display: 'block' }}>Itinerary Budget</span>
                  <span style={{ color: itineraryBudget > 0 ? '#4ade80' : '#94a3b8', fontSize: '1.3rem', fontWeight: '700' }}>
                    {currSymbol}{itineraryBudget.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Step 2 Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
                <button
                  type="button"
                  onClick={handleBackToStep1}
                  disabled={loading}
                  className="btn btn-secondary"
                >
                  ← Back
                </button>

                <button
                  type="button"
                  onClick={handleConfirmCreateTrip}
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ opacity: loading ? 0.6 : 1 }}
                >
                  {loading ? 'Creating Workspace...' : '🚀 Confirm & Create Trip Workspace'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

