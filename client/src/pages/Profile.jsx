import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import api from '../api/axios.js';
import { formatDateToDisplay } from '../utils/dateUtils.js';
import {
  ArrowLeft,
  User,
  Mail,
  Shield,
  Lock,
  Edit3,
  Check,
  X,
  LogOut,
  Key,
  CheckCircle2,
  AlertCircle,
  Calendar
} from 'lucide-react';

/**
 * 👤 Profile Page Component: Dedicated account management workspace for TripPilot.
 * Displays user identity, allows profile name updates, password changes, and session logout.
 */
export default function Profile() {
  const { user, setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [nameInput, setNameInput] = useState(user?.name || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Logout State
  const [logoutLoading, setLogoutLoading] = useState(false);

  // Synchronize name input if user changes externally
  React.useEffect(() => {
    if (user?.name && !isEditingProfile) {
      setNameInput(user.name);
    }
  }, [user?.name, isEditingProfile]);

  // Handle Profile Update
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    const trimmedName = nameInput.trim();
    if (!trimmedName) {
      setProfileError('Name cannot be empty.');
      return;
    }

    if (trimmedName === user?.name) {
      setIsEditingProfile(false);
      return;
    }

    setProfileLoading(true);
    try {
      const response = await api.put('/auth/profile', { name: trimmedName });
      if (response.data && response.data.success && response.data.data?.user) {
        setUser(response.data.data.user);
        setProfileSuccess('Profile name updated successfully.');
        setIsEditingProfile(false);
      } else {
        setProfileError('Failed to update profile. Please try again.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update profile details.';
      setProfileError(msg);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setNameInput(user?.name || '');
    setProfileError('');
    setIsEditingProfile(false);
  };

  // Handle Password Update
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      const response = await api.put('/auth/update-password', {
        currentPassword,
        newPassword
      });

      if (response.data && response.data.success) {
        setPasswordSuccess('Password updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordError('Failed to update password. Please check your credentials.');
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Failed to change password. Please verify your current password.';
      setPasswordError(msg);
    } finally {
      setPasswordLoading(false);
    }
  };

  // Handle Logout (Reuses existing mechanism)
  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setLogoutLoading(false);
      navigate('/login');
    }
  };

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';
  const roleLabel = user?.role === 'ADMIN' ? 'Administrator' : 'Traveler';
  const formattedMemberSince = user?.createdAt ? formatDateToDisplay(user.createdAt) : null;

  return (
    <div className="tp-profile-page">
      <div className="tp-profile-container">
        {/* ========================================================= */}
        {/* 🧭 1. TOP UTILITY BAR (Brand + Single Back to Dashboard) */}
        {/* ========================================================= */}
        <div className="tp-profile-top-bar">
          <Link to="/dashboard" className="tp-brand" title="TripPilot Dashboard">
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

          <Link to="/dashboard" className="tp-profile-back-btn" title="Return to Dashboard">
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        {/* ========================================================= */}
        {/* 📋 2. PAGE HEADER */}
        {/* ========================================================= */}
        <header className="tp-profile-header">
          <span className="tp-profile-eyebrow">YOUR ACCOUNT</span>
          <h1 className="tp-profile-title">Profile</h1>
          <p className="tp-profile-subtitle">
            Manage your account details and security settings.
          </p>
        </header>

        {/* ========================================================= */}
        {/* 🪪 3. USER IDENTITY SUMMARY CARD */}
        {/* ========================================================= */}
        <section className="tp-profile-card tp-profile-identity-card">
          <div className="tp-profile-identity-layout">
            <div className="tp-profile-identity-main">
              <div className="tp-profile-avatar-wrapper">
                {user?.avatar?.url ? (
                  <img
                    src={user.avatar.url}
                    alt={user?.name || 'User Avatar'}
                    className="tp-profile-avatar-img"
                  />
                ) : (
                  <div className="tp-profile-avatar-initial">{userInitial}</div>
                )}
              </div>

              <div className="tp-profile-identity-info">
                <div className="tp-profile-identity-header">
                  <h2 className="tp-profile-name">{user?.name || 'TripPilot Traveler'}</h2>
                  <span className="tp-profile-role-badge">
                    <Shield size={12} />
                    <span>{roleLabel}</span>
                  </span>
                </div>

                <div className="tp-profile-meta-row">
                  <span className="tp-profile-email-badge">
                    <Mail size={14} className="tp-profile-meta-icon" />
                    <span>{user?.email || 'No email attached'}</span>
                  </span>
                </div>
              </div>
            </div>

            {formattedMemberSince && (
              <div className="tp-profile-identity-aside">
                <div className="tp-profile-member-pill">
                  <Calendar size={15} className="tp-profile-member-icon" />
                  <div className="tp-profile-member-details">
                    <span className="tp-profile-member-label">Member Since</span>
                    <span className="tp-profile-member-date">{formattedMemberSince}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ========================================================= */}
        {/* ✏️ 4. PERSONAL INFORMATION (EDIT PROFILE) */}
        {/* ========================================================= */}
        <section className="tp-profile-card">
          <div className="tp-profile-card-header">
            <div>
              <h3 className="tp-profile-card-title">Personal Information</h3>
              <p className="tp-profile-card-desc">
                Update your display name across your travel workspaces.
              </p>
            </div>
            {!isEditingProfile && (
              <button
                type="button"
                className="tp-profile-btn-secondary"
                onClick={() => {
                  setIsEditingProfile(true);
                  setProfileError('');
                  setProfileSuccess('');
                }}
              >
                <Edit3 size={15} />
                <span>Edit Profile</span>
              </button>
            )}
          </div>

          {profileSuccess && (
            <div className="tp-profile-alert tp-profile-alert-success">
              <CheckCircle2 size={16} />
              <span>{profileSuccess}</span>
            </div>
          )}

          {profileError && (
            <div className="tp-profile-alert tp-profile-alert-error">
              <AlertCircle size={16} />
              <span>{profileError}</span>
            </div>
          )}

          {isEditingProfile ? (
            <form onSubmit={handleProfileSubmit} className="tp-profile-form">
              <div className="tp-profile-field-group">
                <label htmlFor="profileName" className="tp-profile-label">
                  Full Name <span className="tp-profile-required">*</span>
                </label>
                <div className="tp-profile-input-wrapper">
                  <User size={16} className="tp-profile-input-icon" />
                  <input
                    id="profileName"
                    type="text"
                    className="tp-profile-input"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div className="tp-profile-field-group">
                <label className="tp-profile-label">Email Address</label>
                <div className="tp-profile-input-wrapper tp-profile-input-disabled">
                  <Mail size={16} className="tp-profile-input-icon" />
                  <input
                    type="email"
                    className="tp-profile-input"
                    value={user?.email || ''}
                    disabled
                    readOnly
                  />
                </div>
                <span className="tp-profile-field-hint">
                  Email is linked to your login credentials and cannot be changed here.
                </span>
              </div>

              <div className="tp-profile-form-actions">
                <button
                  type="submit"
                  className="tp-profile-btn-primary"
                  disabled={profileLoading}
                >
                  {profileLoading ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="tp-profile-btn-ghost"
                  onClick={handleCancelEdit}
                  disabled={profileLoading}
                >
                  <X size={16} />
                  <span>Cancel</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="tp-profile-details-grid">
              <div className="tp-profile-detail-item">
                <span className="tp-profile-detail-label">Full Name</span>
                <span className="tp-profile-detail-value">{user?.name || '—'}</span>
              </div>
              <div className="tp-profile-detail-item">
                <span className="tp-profile-detail-label">Email Address</span>
                <span className="tp-profile-detail-value">{user?.email || '—'}</span>
              </div>
            </div>
          )}
        </section>

        {/* ========================================================= */}
        {/* ========================================================= */}
        {/* 🔒 5. SECURITY */}
        {/* ========================================================= */}
        <section className="tp-profile-card tp-profile-security-card">
          <div className="tp-profile-card-header">
            <div className="tp-profile-card-title-group">
              <div className="tp-profile-header-icon-box tp-icon-box-orange">
                <Lock size={17} />
              </div>
              <div>
                <h3 className="tp-profile-card-title">Security</h3>
                <p className="tp-profile-card-desc">
                  Ensure your account is using a long, random password to stay secure.
                </p>
              </div>
            </div>
          </div>

          {passwordSuccess && (
            <div className="tp-profile-alert tp-profile-alert-success">
              <CheckCircle2 size={16} />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="tp-profile-alert tp-profile-alert-error">
              <AlertCircle size={16} />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="tp-profile-form">
            <div className="tp-profile-field-group">
              <label htmlFor="currentPassword" className="tp-profile-label">
                Current Password <span className="tp-profile-required">*</span>
              </label>
              <div className="tp-profile-input-wrapper">
                <Lock size={16} className="tp-profile-input-icon" />
                <input
                  id="currentPassword"
                  type="password"
                  className="tp-profile-input"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <div className="tp-profile-field-row">
              <div className="tp-profile-field-group">
                <label htmlFor="newPassword" className="tp-profile-label">
                  New Password <span className="tp-profile-required">*</span>
                </label>
                <div className="tp-profile-input-wrapper">
                  <Key size={16} className="tp-profile-input-icon" />
                  <input
                    id="newPassword"
                    type="password"
                    className="tp-profile-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              <div className="tp-profile-field-group">
                <label htmlFor="confirmPassword" className="tp-profile-label">
                  Confirm New Password <span className="tp-profile-required">*</span>
                </label>
                <div className="tp-profile-input-wrapper">
                  <Key size={16} className="tp-profile-input-icon" />
                  <input
                    id="confirmPassword"
                    type="password"
                    className="tp-profile-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="tp-profile-form-actions">
              <button
                type="submit"
                className="tp-profile-btn-primary"
                disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
              >
                {passwordLoading ? (
                  <span>Updating...</span>
                ) : (
                  <>
                    <Lock size={15} />
                    <span>Update Password</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* ========================================================= */}
        {/* 🚪 6. ACCOUNT & LOGOUT */}
        {/* ========================================================= */}
        <section className="tp-profile-card tp-profile-account-card">
          <div className="tp-profile-card-header">
            <div className="tp-profile-card-title-group">
              <div className="tp-profile-header-icon-box tp-icon-box-peach">
                <User size={17} />
              </div>
              <div>
                <h3 className="tp-profile-card-title">Account</h3>
                <p className="tp-profile-card-desc">
                  Sign out of your active TripPilot session on this browser.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="tp-profile-btn-logout"
              onClick={handleLogout}
              disabled={logoutLoading}
              title="Sign Out of TripPilot"
            >
              <LogOut size={15} />
              <span>{logoutLoading ? 'Logging out...' : 'Log Out'}</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
