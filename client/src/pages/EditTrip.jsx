import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/axios.js';
import NotificationBell from '../components/NotificationBell.jsx';
import {
  Compass,
  MapPin,
  Navigation,
  Calendar,
  Users,
  Wallet,
  Coins,
  Plane,
  Hotel,
  FileText,
  Sparkles,
  Check,
  CheckCircle2,
  AlertCircle,
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
 * ✏️ EditTrip Component: Polished light travel workspace page for editing an existing trip.
 * Preserves all existing business logic, validation, API handling, and workspace routing.
 */
export default function EditTrip() {
  const { tripId } = useParams();
  const navigate = useNavigate();

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
    status: 'PLANNED',
    estimatedBudget: '',
    currency: 'INR',
    travelerCount: 1,
    description: '',
    interests: []
  });

  const [pageLoading, setPageLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInterestInput, setCustomInterestInput] = useState('');

  useEffect(() => {
    const fetchExistingTrip = async () => {
      try {
        const response = await api.get(`/trips/${tripId}`);
        const trip = response.data?.data?.trip;

        if (trip) {
          const formatDateForInput = (dateString) => {
            if (!dateString) return '';
            return new Date(dateString).toISOString().split('T')[0];
          };

          setFormData({
            title: trip.title || '',
            destination: trip.destination || '',
            startingLocation: trip.startingLocation || '',
            startDate: formatDateForInput(trip.startDate),
            endDate: formatDateForInput(trip.endDate),
            travelCompanion: trip.travelCompanion || 'SOLO',
            budgetType: trip.budgetType || 'MID_RANGE',
            transportationMode: trip.transportationMode || '',
            accommodationType: trip.accommodationType || '',
            status: trip.status || 'PLANNED',
            estimatedBudget:
              trip.budget?.estimated !== undefined ? trip.budget.estimated : '',
            currency: trip.budget?.currency || 'INR',
            travelerCount: trip.travelerCount || 1,
            description: trip.description || '',
            interests: trip.interests || []
          });
        }
      } catch (err) {
        const errorMessage =
          err.response?.data?.message || 'Failed to fetch trip details for editing.';
        setError(errorMessage);
      } finally {
        setPageLoading(false);
      }
    };

    fetchExistingTrip();
  }, [tripId]);

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
    setShowCustomInput(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.transportationMode || !formData.accommodationType) {
      setError('Please select both transportation mode and accommodation preference.');
      return;
    }

    setSubmitting(true);

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
      status: formData.status,
      budget: {
        estimated: Number(formData.estimatedBudget),
        currency: formData.currency || 'INR'
      },
      description: formData.description,
      travelerCount: Number(formData.travelerCount),
      interests: formData.interests
    };

    try {
      await api.put(`/trips/${tripId}`, requestBody);
      navigate(`/dashboard/trip/${tripId}`);
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || 'Failed to update trip. Please check your inputs.';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="tp-workspace-content-inner tp-edit-trip-container" style={{ maxWidth: '880px' }}>
      {/* 📋 1. PAGE HEADER */}
      <header className="tp-trip-overview-header" style={{ marginBottom: '24px' }}>
        <div className="tp-trip-overview-header-left">
          <div className="tp-trip-overview-eyebrow">
            <span className="tp-trip-overview-line" />
            <span>EDIT TRIP</span>
          </div>
          <h1 className="tp-subpage-title">Edit Your Trip</h1>
          <p className="tp-subpage-subtitle">
            Update your trip details and preferences.
          </p>
        </div>

        <div className="tp-trip-overview-header-right">
          <div className="tp-workspace-bell-wrap">
            <NotificationBell tripId={tripId} />
          </div>
        </div>
      </header>

      {/* Loading Skeleton Box */}
      {pageLoading && (
        <div className="tp-workspace-loading-box">
          <p>Loading trip details...</p>
        </div>
      )}

      {/* Global Error Banner */}
      {!pageLoading && error && (
        <div className="tp-create-trip-alert tp-create-trip-alert-error" role="alert">
          <AlertCircle size={17} />
          <span>{error}</span>
        </div>
      )}

      {/* 📝 2. EDIT FORM */}
      {!pageLoading && (
        <form onSubmit={handleSubmit} className="tp-create-trip-form">
          {/* ========================================================= */}
          {/* SECTION 1: Trip Details                                   */}
          {/* ========================================================= */}
          <section className="tp-create-trip-card">
            <div className="tp-create-trip-card-header">
              <div className="tp-create-trip-icon-box tp-icon-box-orange">
                <Compass size={18} />
              </div>
              <div>
                <h2 className="tp-create-trip-card-title">Trip Details</h2>
                <p className="tp-create-trip-card-desc">
                  Update the basic details of your journey.
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
                    <Navigation size={16} className="tp-create-trip-input-icon" />
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

              {/* Start Date, End Date, & Status */}
              <div className="tp-create-trip-grid-3">
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

                <div className="tp-create-trip-field-group">
                  <label htmlFor="status" className="tp-create-trip-label">
                    Status <span className="tp-create-trip-required">*</span>
                  </label>
                  <div className="tp-create-trip-input-wrapper">
                    <CheckCircle2 size={16} className="tp-create-trip-input-icon" />
                    <select
                      id="status"
                      name="status"
                      className="tp-create-trip-select"
                      value={formData.status}
                      onChange={handleChange}
                      required
                    >
                      <option value="PLANNED">Planned</option>
                      <option value="ONGOING">Ongoing</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ========================================================= */}
          {/* SECTION 2: Travel & Stay                                  */}
          {/* ========================================================= */}
          <section className="tp-create-trip-card">
            <div className="tp-create-trip-card-header">
              <div className="tp-create-trip-icon-box tp-icon-box-orange">
                <Plane size={18} />
              </div>
              <div>
                <h2 className="tp-create-trip-card-title">Travel & Stay</h2>
                <p className="tp-create-trip-card-desc">
                  Update your travel preferences.
                </p>
              </div>
            </div>

            <div className="tp-create-trip-fields">
              {/* Transportation & Accommodation */}
              <div className="tp-create-trip-grid-2">
                <div className="tp-create-trip-field-group">
                  <label htmlFor="transportationMode" className="tp-create-trip-label">
                    Transportation Mode <span className="tp-create-trip-required">*</span>
                  </label>
                  <div className="tp-create-trip-input-wrapper">
                    <Plane size={16} className="tp-create-trip-input-icon" />
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
                      <option value="OWN_VEHICLE">Own Vehicle</option>
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
                      <option value="BUDGET">Budget</option>
                      <option value="THREE_STAR">3-Star</option>
                      <option value="FOUR_STAR">4-Star</option>
                      <option value="FIVE_STAR">5-Star</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Companion & Travelers */}
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
                      <option value="SOLO">Solo</option>
                      <option value="FRIENDS">Friends</option>
                      <option value="FAMILY">Family</option>
                      <option value="COUPLE">Couple</option>
                      <option value="BUSINESS">Business</option>
                    </select>
                  </div>
                </div>

                <div className="tp-create-trip-field-group">
                  <label htmlFor="travelerCount" className="tp-create-trip-label">
                    Number of Travelers <span className="tp-create-trip-required">*</span>
                  </label>
                  <div className="tp-create-trip-input-wrapper">
                    <Users size={16} className="tp-create-trip-input-icon" />
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

              {/* Budget Type, Currency & Estimated Budget */}
              <div className="tp-create-trip-grid-3">
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
                      <option value="BUDGET">Budget</option>
                      <option value="MID_RANGE">Mid Range</option>
                      <option value="LUXURY">Luxury</option>
                    </select>
                  </div>
                </div>

                <div className="tp-create-trip-field-group">
                  <label htmlFor="currency" className="tp-create-trip-label">
                    Currency <span className="tp-create-trip-required">*</span>
                  </label>
                  <div className="tp-create-trip-input-wrapper">
                    <Coins size={16} className="tp-create-trip-input-icon" />
                    <select
                      id="currency"
                      name="currency"
                      className="tp-create-trip-select"
                      value={formData.currency}
                      onChange={handleChange}
                      required
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                </div>

                <div className="tp-create-trip-field-group">
                  <label htmlFor="estimatedBudget" className="tp-create-trip-label">
                    Estimated Budget <span className="tp-create-trip-required">*</span>
                  </label>
                  <div className="tp-create-trip-input-wrapper">
                    <Wallet size={16} className="tp-create-trip-input-icon" />
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
              </div>
            </div>
          </section>

          {/* ========================================================= */}
          {/* SECTION 3: Trip Description                               */}
          {/* ========================================================= */}
          <section className="tp-create-trip-card">
            <div className="tp-create-trip-card-header">
              <div className="tp-create-trip-icon-box tp-icon-box-orange">
                <FileText size={18} />
              </div>
              <div>
                <h2 className="tp-create-trip-card-title">Trip Description</h2>
                <p className="tp-create-trip-card-desc">
                  Notes, highlights, or reminders for your journey.
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
                rows={4}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  {formData.description ? formData.description.length : 0} characters
                </span>
              </div>
            </div>
          </section>

          {/* ========================================================= */}
          {/* SECTION 4: Interests                                      */}
          {/* ========================================================= */}
          <section className="tp-create-trip-card">
            <div className="tp-create-trip-card-header">
              <div className="tp-create-trip-icon-box tp-icon-box-orange">
                <Sparkles size={18} />
              </div>
              <div>
                <h2 className="tp-create-trip-card-title">Interests</h2>
                <p className="tp-create-trip-card-desc">
                  Update activities and themes for this trip.
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

              {/* Custom Interest Input Row */}
              {showCustomInput && (
                <div className="tp-create-trip-custom-input-row" style={{ marginTop: '8px' }}>
                  <input
                    type="text"
                    value={customInterestInput}
                    onChange={(e) => setCustomInterestInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomInterest();
                      }
                    }}
                    className="tp-create-trip-input"
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

          {/* ========================================================= */}
          {/* SECTION 5: Action Buttons                                 */}
          {/* ========================================================= */}
          <div className="tp-create-trip-actions-row">
            <Link
              to={`/dashboard/trip/${tripId}`}
              className="tp-create-trip-btn-cancel"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="tp-create-trip-btn-submit"
              disabled={submitting}
            >
              <Check size={16} />
              <span>{submitting ? 'Saving Changes...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
