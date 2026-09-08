import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
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
 * ✏️ EditTrip Component: Allows editing metadata of an existing trip workspace.
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
            estimatedBudget: trip.budget?.estimated !== undefined ? trip.budget.estimated : '',
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

  return (
    <div className="landing-container" style={{ padding: '40px 20px' }}>
      <div className="glass-card" style={{ maxWidth: '640px', width: '100%', textAlign: 'left' }}>
        <div className="badge">✏️ Edit Workspace</div>
        <h1 className="page-title" style={{ fontSize: '2.2rem' }}>Edit Trip</h1>
        <p className="hero-subtitle" style={{ fontSize: '1rem', marginBottom: '24px' }}>
          Update your trip details, budget, and preferences
        </p>

        {pageLoading && (
          <div className="placeholder-box" style={{ textAlign: 'center' }}>
            <p>Loading trip...</p>
          </div>
        )}

        {!pageLoading && error && (
          <div className="alert alert-error">{error}</div>
        )}

        {!pageLoading && (
          <form onSubmit={handleSubmit} className="auth-form">
            {/* 1. Title */}
            <div className="form-group">
              <label htmlFor="title">Trip Title *</label>
              <input
                id="title"
                name="title"
                type="text"
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

            {/* 6. Travel Companion, 7. Budget Type & Status */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
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

              <div className="form-group">
                <label htmlFor="status">Status *</label>
                <select
                  id="status"
                  name="status"
                  style={selectStyle}
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

            {/* Transportation & Accommodation Preferences */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div className="form-group">
                <label htmlFor="transportationMode">How will you travel to/from the destination? *</label>
                <select
                  id="transportationMode"
                  name="transportationMode"
                  style={selectStyle}
                  value={formData.transportationMode}
                  onChange={handleChange}
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
                  value={formData.estimatedBudget}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="currency">Currency *</label>
                <select
                  id="currency"
                  name="currency"
                  style={selectStyle}
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

            {/* 11. Description */}
            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                style={textareaStyle}
                value={formData.description}
                onChange={handleChange}
              />
            </div>

            {/* 12. Interests (Multi-select Chips) */}
            <div className="form-group">
              <label>Select Interests</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                {INTEREST_OPTIONS.map((interest) => {
                  const isSelected = formData.interests.includes(interest);
                  return (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => toggleInterest(interest)}
                      className="feature-pill"
                      style={{
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(6, 182, 212, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                        borderColor: isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.08)',
                        color: isSelected ? '#ffffff' : '#cbd5e1',
                        fontWeight: isSelected ? '600' : '500'
                      }}
                    >
                      {isSelected ? `✓ ${interest}` : `+ ${interest}`}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={submitting}
              style={{ marginTop: '16px' }}
            >
              {submitting ? 'Updating Trip...' : 'Update Trip'}
            </button>
          </form>
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
