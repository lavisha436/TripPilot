import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios.js';
import {
  ArrowLeft,
  Compass,
  MapPin,
  Calendar,
  Users,
  Wallet,
  IndianRupee,
  Plane,
  Train,
  Hotel,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Check,
  Plus,
  X
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
 * 📝 CreateTrip Component: Light travel workspace form for creating a new trip.
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
        err.response?.data?.message || 'Failed to generate budget estimate. Please verify your inputs.';
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

  // Calculations for Step 2
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
    <div className="tp-create-trip-page">
      {/* 🧭 Subtle travel backdrop decorative accents (editorial route lines & soft warm ambient glows) */}
      <div className="tp-create-trip-bg-decor" aria-hidden="true">
        <div className="tp-create-trip-decor-glow tp-decor-glow-tr" />
        <div className="tp-create-trip-decor-glow tp-decor-glow-bl" />
        <svg className="tp-create-trip-route-svg" viewBox="0 0 1440 900" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M-50 160 C 260 80, 480 320, 820 180 C 1120 40, 1340 220, 1500 130"
            stroke="#f97316"
            strokeWidth="1.2"
            strokeDasharray="6 8"
            strokeOpacity="0.2"
          />
          <path
            d="M-80 560 C 300 440, 680 720, 1060 510 C 1340 370, 1420 560, 1540 500"
            stroke="#ea580c"
            strokeWidth="1"
            strokeDasharray="5 7"
            strokeOpacity="0.14"
          />
          <circle cx="820" cy="180" r="3.5" fill="#f97316" fillOpacity="0.35" />
          <circle cx="1060" cy="510" r="3" fill="#ea580c" fillOpacity="0.3" />
        </svg>
      </div>

      <div className="tp-create-trip-container">
        {/* ========================================================= */}
        {/* 🧭 1. TOP BRAND UTILITY BAR */}
        {/* ========================================================= */}
        <div className="tp-create-trip-top-bar">
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

          <Link to="/dashboard" className="tp-create-trip-back-btn" title="Back to Dashboard">
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        {/* ========================================================= */}
        {/* 📋 2. PAGE HEADER */}
        {/* ========================================================= */}
        <header className="tp-create-trip-header">
          <span className="tp-create-trip-eyebrow">
            {currentStep === 1 ? 'CREATE YOUR TRIP' : 'BUDGET ALLOCATION'}
          </span>
          <h1 className="tp-create-trip-title">
            {currentStep === 1 ? 'Create a New Trip' : 'Budget Planning Preview'}
          </h1>
          <p className="tp-create-trip-subtitle">
            {currentStep === 1
              ? "Tell us a few details and we'll build your trip workspace."
              : `Review and adjust estimated baseline allocations for your trip to ${formData.destination || 'your destination'}.`}
          </p>
        </header>

        {/* Global Error Banner */}
        {error && (
          <div className="tp-create-trip-alert tp-create-trip-alert-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* ========================================================= */}
        {/* 🗺️ 3. MAIN CONTENT LAYOUT (Form Column + Supporting Panel) */}
        {/* ========================================================= */}
        <div className="tp-create-trip-layout">
          {/* LEFT: MAIN FORM COLUMN (Approx 70–75%) */}
          <div className="tp-create-trip-main-col">
            {currentStep === 1 && (
              <form onSubmit={handleStep1Submit} className="tp-create-trip-form">
                {/* 1. Trip Details Card */}
                <section className="tp-create-trip-card">
                  <div className="tp-create-trip-card-header">
                    <div className="tp-create-trip-icon-box tp-icon-box-orange">
                      <Compass size={18} />
                    </div>
                    <div>
                      <h2 className="tp-create-trip-card-title">Trip Details</h2>
                      <p className="tp-create-trip-card-desc">
                        Let's start with the basics of your trip.
                      </p>
                    </div>
                  </div>

                  <div className="tp-create-trip-fields">
                    {/* Trip Title */}
                    <div className="tp-create-trip-field-group">
                      <label htmlFor="title" className="tp-create-trip-label">
                        Trip Title <span className="tp-create-trip-required">*</span>
                      </label>
                      <div className="tp-create-trip-input-wrapper">
                        <Compass size={16} className="tp-create-trip-input-icon" />
                        <input
                          id="title"
                          name="title"
                          type="text"
                          className="tp-create-trip-input"
                          value={formData.title}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>

                    {/* Destination & Starting Location */}
                    <div className="tp-create-trip-grid-2">
                      <div className="tp-create-trip-field-group">
                        <label htmlFor="destination" className="tp-create-trip-label">
                          Destination <span className="tp-create-trip-required">*</span>
                        </label>
                        <div className="tp-create-trip-input-wrapper">
                          <MapPin size={16} className="tp-create-trip-input-icon" />
                          <input
                            id="destination"
                            name="destination"
                            type="text"
                            className="tp-create-trip-input"
                            value={formData.destination}
                            onChange={handleChange}
                            required
                          />
                        </div>
                      </div>

                      <div className="tp-create-trip-field-group">
                        <label htmlFor="startingLocation" className="tp-create-trip-label">
                          Starting Location <span className="tp-create-trip-required">*</span>
                        </label>
                        <div className="tp-create-trip-input-wrapper">
                          <MapPin size={16} className="tp-create-trip-input-icon" />
                          <input
                            id="startingLocation"
                            name="startingLocation"
                            type="text"
                            className="tp-create-trip-input"
                            value={formData.startingLocation}
                            onChange={handleChange}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Start Date & End Date */}
                    <div className="tp-create-trip-grid-2">
                      <div className="tp-create-trip-field-group">
                        <label htmlFor="startDate" className="tp-create-trip-label">
                          Start Date <span className="tp-create-trip-required">*</span>
                        </label>
                        <div className="tp-create-trip-input-wrapper">
                          <Calendar size={16} className="tp-create-trip-input-icon" />
                          <input
                            id="startDate"
                            name="startDate"
                            type="date"
                            className="tp-create-trip-input"
                            value={formData.startDate}
                            onChange={handleChange}
                            required
                          />
                        </div>
                      </div>

                      <div className="tp-create-trip-field-group">
                        <label htmlFor="endDate" className="tp-create-trip-label">
                          End Date <span className="tp-create-trip-required">*</span>
                        </label>
                        <div className="tp-create-trip-input-wrapper">
                          <Calendar size={16} className="tp-create-trip-input-icon" />
                          <input
                            id="endDate"
                            name="endDate"
                            type="date"
                            className="tp-create-trip-input"
                            value={formData.endDate}
                            onChange={handleChange}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 2. Travel & Stay Card */}
                <section className="tp-create-trip-card">
                  <div className="tp-create-trip-card-header">
                    <div className="tp-create-trip-icon-box tp-icon-box-orange">
                      <Plane size={18} />
                    </div>
                    <div>
                      <h2 className="tp-create-trip-card-title">Travel & Stay</h2>
                      <p className="tp-create-trip-card-desc">
                        Help us understand your travel style.
                      </p>
                    </div>
                  </div>

                  <div className="tp-create-trip-fields">
                    {/* Companion & Budget Type */}
                    <div className="tp-create-trip-grid-2">
                      <div className="tp-create-trip-field-group">
                        <label htmlFor="travelCompanion" className="tp-create-trip-label">
                          Travel Companion <span className="tp-create-trip-required">*</span>
                        </label>
                        <div className="tp-create-trip-input-wrapper">
                          <Users size={16} className="tp-create-trip-input-icon" />
                          <select
                            id="travelCompanion"
                            name="travelCompanion"
                            className="tp-create-trip-select"
                            value={formData.travelCompanion}
                            onChange={handleChange}
                            required
                          >
                            <option value="SOLO">Solo Traveler</option>
                            <option value="COUPLE">Couple</option>
                            <option value="FRIENDS">Friends Group</option>
                            <option value="FAMILY">Family Trip</option>
                            <option value="BUSINESS">Business Trip</option>
                          </select>
                        </div>
                      </div>

                      <div className="tp-create-trip-field-group">
                        <label htmlFor="budgetType" className="tp-create-trip-label">
                          Budget Type <span className="tp-create-trip-required">*</span>
                        </label>
                        <div className="tp-create-trip-input-wrapper">
                          <Wallet size={16} className="tp-create-trip-input-icon" />
                          <select
                            id="budgetType"
                            name="budgetType"
                            className="tp-create-trip-select"
                            value={formData.budgetType}
                            onChange={handleChange}
                            required
                          >
                            <option value="BUDGET">Budget (Cost-Conscious)</option>
                            <option value="MID_RANGE">Mid-Range (Balanced)</option>
                            <option value="LUXURY">Luxury (Premium)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Transportation & Accommodation */}
                    <div className="tp-create-trip-grid-2">
                      <div className="tp-create-trip-field-group">
                        <label htmlFor="transportationMode" className="tp-create-trip-label">
                          Transportation Mode <span className="tp-create-trip-required">*</span>
                        </label>
                        <div className="tp-create-trip-input-wrapper">
                          <Train size={16} className="tp-create-trip-input-icon" />
                          <select
                            id="transportationMode"
                            name="transportationMode"
                            className="tp-create-trip-select"
                            value={formData.transportationMode}
                            onChange={handleChange}
                            required
                          >
                            <option value="">Select Transportation</option>
                            <option value="FLIGHT">Flight</option>
                            <option value="TRAIN">Train</option>
                            <option value="BUS">Bus</option>
                            <option value="OWN_VEHICLE">Personal Vehicle</option>
                          </select>
                        </div>
                      </div>

                      <div className="tp-create-trip-field-group">
                        <label htmlFor="accommodationType" className="tp-create-trip-label">
                          Accommodation Preference <span className="tp-create-trip-required">*</span>
                        </label>
                        <div className="tp-create-trip-input-wrapper">
                          <Hotel size={16} className="tp-create-trip-input-icon" />
                          <select
                            id="accommodationType"
                            name="accommodationType"
                            className="tp-create-trip-select"
                            value={formData.accommodationType}
                            onChange={handleChange}
                            required
                          >
                            <option value="">Select Accommodation</option>
                            <option value="BUDGET">Budget Hostels / Homestays</option>
                            <option value="THREE_STAR">3-Star Standard Hotel</option>
                            <option value="FOUR_STAR">4-Star Comfort Resort</option>
                            <option value="FIVE_STAR">5-Star Luxury Stay</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Estimated Budget, Currency, & Traveler Count */}
                    <div className="tp-create-trip-grid-3">
                      <div className="tp-create-trip-field-group">
                        <label htmlFor="estimatedBudget" className="tp-create-trip-label">
                          Est. Total Budget <span className="tp-create-trip-required">*</span>
                        </label>
                        <div className="tp-create-trip-input-wrapper">
                          <IndianRupee size={15} className="tp-create-trip-input-icon" />
                          <input
                            id="estimatedBudget"
                            name="estimatedBudget"
                            type="number"
                            min="0"
                            className="tp-create-trip-input"
                            value={formData.estimatedBudget}
                            onChange={handleChange}
                            required
                          />
                        </div>
                      </div>

                      <div className="tp-create-trip-field-group">
                        <label htmlFor="currency" className="tp-create-trip-label">
                          Currency
                        </label>
                        <input
                          id="currency"
                          name="currency"
                          type="text"
                          className="tp-create-trip-input"
                          value={formData.currency}
                          onChange={handleChange}
                        />
                      </div>

                      <div className="tp-create-trip-field-group">
                        <label htmlFor="travelerCount" className="tp-create-trip-label">
                          Travelers <span className="tp-create-trip-required">*</span>
                        </label>
                        <div className="tp-create-trip-input-wrapper">
                          <Users size={15} className="tp-create-trip-input-icon" />
                          <input
                            id="travelerCount"
                            name="travelerCount"
                            type="number"
                            min="1"
                            className="tp-create-trip-input"
                            value={formData.travelerCount}
                            onChange={handleChange}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 3. Trip Description Card */}
                <section className="tp-create-trip-card">
                  <div className="tp-create-trip-card-header">
                    <div className="tp-create-trip-icon-box tp-icon-box-orange">
                      <FileText size={18} />
                    </div>
                    <div>
                      <h2 className="tp-create-trip-card-title">Trip Description</h2>
                      <p className="tp-create-trip-card-desc">
                        Add some notes about your trip goals, plans or anything specific you want to remember.
                      </p>
                    </div>
                  </div>

                  <div className="tp-create-trip-field-group">
                    <textarea
                      id="description"
                      name="description"
                      className="tp-create-trip-textarea"
                      value={formData.description}
                      onChange={handleChange}
                      rows={3}
                    />
                  </div>
                </section>

                {/* 4. Interests Card */}
                <section className="tp-create-trip-card">
                  <div className="tp-create-trip-card-header">
                    <div className="tp-create-trip-icon-box tp-icon-box-orange">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <div className="tp-create-trip-title-badge-row">
                        <h2 className="tp-create-trip-card-title">Interests</h2>
                        <span className="tp-create-trip-badge-pill">Select at least one</span>
                      </div>
                      <p className="tp-create-trip-card-desc">
                        Help us personalize your experience.
                      </p>
                    </div>
                  </div>

                  <div className="tp-create-trip-interests-container">
                    <div className="tp-create-trip-pills-row">
                      {/* Predefined Interest Options */}
                      {INTEREST_OPTIONS.map((interest) => {
                        const selected = formData.interests.includes(interest);
                        return (
                          <button
                            key={interest}
                            type="button"
                            onClick={() => toggleInterest(interest)}
                            className={`tp-create-trip-pill ${selected ? 'active' : ''}`}
                          >
                            {selected ? (
                              <>
                                <Check size={13} />
                                <span>{interest}</span>
                              </>
                            ) : (
                              <>
                                <Plus size={13} />
                                <span>{interest}</span>
                              </>
                            )}
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
                            className="tp-create-trip-pill active"
                          >
                            <Check size={13} />
                            <span>{customInt}</span>
                          </button>
                        ))}

                      {/* Custom Interest Toggle Button */}
                      <button
                        type="button"
                        onClick={() => setShowCustomInput((prev) => !prev)}
                        className="tp-create-trip-pill tp-create-trip-pill-custom"
                      >
                        {showCustomInput ? (
                          <>
                            <X size={13} />
                            <span>Close Custom</span>
                          </>
                        ) : (
                          <>
                            <Plus size={13} />
                            <span>Custom Interest</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Custom Interest Input Field */}
                    {showCustomInput && (
                      <div className="tp-create-trip-custom-input-row">
                        <input
                          type="text"
                          className="tp-create-trip-input"
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
                          className="tp-create-trip-btn-add-custom"
                        >
                          Add
                        </button>
                      </div>
                    )}
                  </div>
                </section>

                {/* Form Action Buttons */}
                <div className="tp-create-trip-actions-row">
                  <Link to="/dashboard" className="tp-create-trip-btn-cancel">
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={loading}
                    className="tp-create-trip-btn-submit"
                  >
                    {loading ? (
                      <span>Estimating Budget...</span>
                    ) : (
                      <span>Next: Budget Plan →</span>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: BUDGET PLANNING PREVIEW */}
            {currentStep === 2 && (
              <div className="tp-create-trip-step2-wrapper">
                {/* Total Budget Overview Card */}
                <div className="tp-create-trip-card tp-create-trip-step2-summary-card">
                  <div className="tp-create-trip-budget-stat">
                    <span className="tp-create-trip-budget-label">Total Estimated Budget</span>
                    <span className="tp-create-trip-budget-amount">
                      {currSymbol}{totalBudgetNum.toLocaleString()}
                    </span>
                  </div>
                  <div className="tp-create-trip-travelers-badge">
                    <Users size={15} />
                    <span>{formData.travelerCount} Traveler(s)</span>
                  </div>
                </div>

                {isOverReserved && (
                  <div className="tp-create-trip-alert tp-create-trip-alert-warning">
                    <AlertCircle size={18} />
                    <span>
                      Reserved baseline total ({currSymbol}{reservedTotal.toLocaleString()}) exceeds your total estimated trip budget ({currSymbol}{totalBudgetNum.toLocaleString()}). Your itinerary budget is set to 0. You may adjust your estimates below.
                    </span>
                  </div>
                )}

                {/* Editable Baseline Allocations Card */}
                <section className="tp-create-trip-card">
                  <div className="tp-create-trip-card-header">
                    <div className="tp-create-trip-icon-box tp-icon-box-orange">
                      <Wallet size={18} />
                    </div>
                    <div>
                      <h2 className="tp-create-trip-card-title">Baseline Budget Allocations</h2>
                      <p className="tp-create-trip-card-desc">
                        Review and customize the estimated baseline reserves for transportation, accommodation, and contingencies.
                      </p>
                    </div>
                  </div>

                  <div className="tp-create-trip-fields">
                    <div className="tp-create-trip-field-group">
                      <label htmlFor="intercityTransport" className="tp-create-trip-label">
                        Intercity Transportation (Round Trip) <span className="tp-create-trip-required">*</span>
                      </label>
                      <div className="tp-create-trip-input-wrapper">
                        <Train size={16} className="tp-create-trip-input-icon" />
                        <input
                          id="intercityTransport"
                          name="intercityTransport"
                          type="number"
                          min="0"
                          className="tp-create-trip-input"
                          value={budgetEstimate.intercityTransport}
                          onChange={handleEstimateChange}
                        />
                      </div>
                    </div>

                    <div className="tp-create-trip-field-group">
                      <label htmlFor="accommodation" className="tp-create-trip-label">
                        Accommodation Estimate <span className="tp-create-trip-required">*</span>
                      </label>
                      <div className="tp-create-trip-input-wrapper">
                        <Hotel size={16} className="tp-create-trip-input-icon" />
                        <input
                          id="accommodation"
                          name="accommodation"
                          type="number"
                          min="0"
                          className="tp-create-trip-input"
                          value={budgetEstimate.accommodation}
                          onChange={handleEstimateChange}
                        />
                      </div>
                    </div>

                    <div className="tp-create-trip-field-group">
                      <label htmlFor="buffer" className="tp-create-trip-label">
                        Emergency / Miscellaneous Buffer <span className="tp-create-trip-required">*</span>
                      </label>
                      <div className="tp-create-trip-input-wrapper">
                        <Wallet size={16} className="tp-create-trip-input-icon" />
                        <input
                          id="buffer"
                          name="buffer"
                          type="number"
                          min="0"
                          className="tp-create-trip-input"
                          value={budgetEstimate.buffer}
                          onChange={handleEstimateChange}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Calculations Summary Box */}
                  <div className="tp-create-trip-calculations-box">
                    <div className="tp-create-trip-calc-item">
                      <span className="tp-create-trip-calc-label">Reserved Total</span>
                      <span className={`tp-create-trip-calc-val ${isOverReserved ? 'over' : ''}`}>
                        {currSymbol}{reservedTotal.toLocaleString()}
                      </span>
                    </div>

                    <div className="tp-create-trip-calc-item">
                      <span className="tp-create-trip-calc-label">Available Itinerary Budget</span>
                      <span className="tp-create-trip-calc-val success">
                        {currSymbol}{itineraryBudget.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </section>

                {/* Step 2 Action Buttons */}
                <div className="tp-create-trip-actions-row">
                  <button
                    type="button"
                    onClick={handleBackToStep1}
                    disabled={loading}
                    className="tp-create-trip-btn-cancel"
                  >
                    ← Back to Details
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmCreateTrip}
                    disabled={loading}
                    className="tp-create-trip-btn-submit"
                  >
                    {loading ? (
                      <span>Creating Workspace...</span>
                    ) : (
                      <span>Confirm & Create Trip Workspace</span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: SUPPORTING TRAVEL TIPS PANEL (Approx 25–30%) */}
          <aside className="tp-create-trip-tips-panel">
            <div className="tp-create-trip-tips-card">
              <div className="tp-create-trip-tips-header">
                <div className="tp-create-trip-icon-box tp-icon-box-orange">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="tp-create-trip-tips-title">Plan Better</h3>
                  <span className="tp-create-trip-tips-subtitle">Travel Together</span>
                </div>
              </div>

              <div className="tp-create-trip-tips-list">
                <div className="tp-create-trip-tip-item">
                  <div className="tp-create-trip-tip-icon-box">
                    <CheckCircle2 size={16} />
                  </div>
                  <div className="tp-create-trip-tip-text">
                    <h4 className="tp-create-trip-tip-heading">Stay Organized</h4>
                    <p className="tp-create-trip-tip-desc">Keep all your plans, bookings, and lists in one unified place.</p>
                  </div>
                </div>

                <div className="tp-create-trip-tip-item">
                  <div className="tp-create-trip-tip-icon-box">
                    <Compass size={16} />
                  </div>
                  <div className="tp-create-trip-tip-text">
                    <h4 className="tp-create-trip-tip-heading">Travel Smarter</h4>
                    <p className="tp-create-trip-tip-desc">Get personalized recommendations tailored to your style and budget.</p>
                  </div>
                </div>

                <div className="tp-create-trip-tip-item">
                  <div className="tp-create-trip-tip-icon-box">
                    <Users size={16} />
                  </div>
                  <div className="tp-create-trip-tip-text">
                    <h4 className="tp-create-trip-tip-heading">Make Memories</h4>
                    <p className="tp-create-trip-tip-desc">Plan and collaborate seamlessly with your travel companions.</p>
                  </div>
                </div>
              </div>

              {/* Decorative Accent Divider */}
              <div className="tp-create-trip-tips-divider">
                <svg viewBox="0 0 120 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="tp-create-trip-flight-line">
                  <path d="M0 6H48" stroke="#f97316" strokeWidth="1" strokeDasharray="3 3" opacity="0.35" />
                  <path d="M72 6H120" stroke="#f97316" strokeWidth="1" strokeDasharray="3 3" opacity="0.35" />
                  <polygon points="56,3 64,6 56,9 58,6" fill="#ea580c" opacity="0.75" />
                </svg>
              </div>

              <div className="tp-create-trip-tips-footer">
                <span className="tp-create-trip-tagline">Plan • Explore • Belong</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
