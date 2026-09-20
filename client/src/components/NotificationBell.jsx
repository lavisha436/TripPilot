import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios.js';
import { socket } from '../socket.js';
import {
  Bell,
  UserPlus,
  Users,
  Wallet,
  CloudSun,
  Sparkles,
  Image as ImageIcon,
  Clock,
  CheckCheck,
  Loader2,
  AlertTriangle
} from 'lucide-react';

/**
 * 🔔 NotificationBell Component: Renders in-app notification bell icon with unread badge count
 * and a light dropdown/drawer displaying real-time alerts.
 * Matches the TripPilot light visual system across all pages.
 * Automatically scopes notifications to currentTripId when inside a trip workspace.
 */
export default function NotificationBell({ tripId: propTripId }) {
  const navigate = useNavigate();
  const params = useParams();

  // Resolve current tripId from prop or URL route parameters (e.g. /dashboard/trip/:tripId)
  const currentTripId = propTripId || params.tripId || null;

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [markingAll, setMarkingAll] = useState(false);

  const drawerRef = useRef(null);

  // Type Icons Configuration Renderer using clean Lucide icons
  const renderTypeIcon = (type) => {
    switch (type) {
      case 'MEMBER_INVITE':
        return <UserPlus size={15} />;
      case 'MEMBER_ACCEPTED':
        return <Users size={15} />;
      case 'BUDGET_WARNING':
        return <Wallet size={15} />;
      case 'WEATHER_ALERT':
        return <CloudSun size={15} />;
      case 'AI_ITINERARY':
        return <Sparkles size={15} />;
      case 'GALLERY_UPLOAD':
        return <ImageIcon size={15} />;
      case 'ACTIVITY_REMINDER':
        return <Clock size={15} />;
      default:
        return <Bell size={15} />;
    }
  };

  // Helper for relative time formatting ("5 minutes ago", "2 hours ago", etc.)
  const getTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  // Fetch unread notification count badge (scoped to currentTripId when in trip workspace)
  const fetchUnreadCount = async () => {
    try {
      const endpoint = currentTripId
        ? `/notifications/unread-count?tripId=${currentTripId}`
        : '/notifications/unread-count';
      const response = await api.get(endpoint);
      setUnreadCount(response.data?.data?.unreadCount || 0);
    } catch (err) {
      // Quietly swallow badge fetch error to avoid disturbing user
    }
  };

  // Fetch notifications list when drawer opens (scoped to currentTripId when in trip workspace)
  const fetchNotifications = async () => {
    setLoading(true);
    setError('');

    try {
      const endpoint = currentTripId
        ? `/notifications?tripId=${currentTripId}&limit=20`
        : '/notifications?limit=20';
      const response = await api.get(endpoint);
      setNotifications(response.data?.data?.notifications || []);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load notifications.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Poll unread count every 30s
    return () => clearInterval(interval);
  }, [currentTripId]);

  // ⚡ Real-Time Socket.IO Notification Listener (Scoped to currentTripId when in trip workspace)
  useEffect(() => {
    const handleNewNotification = (newNotif) => {
      if (!newNotif || !newNotif._id) return;

      // Resolve tripId string from incoming notification (object or ID string)
      const notifTripId =
        typeof newNotif.tripId === 'object' && newNotif.tripId !== null
          ? newNotif.tripId._id?.toString()
          : newNotif.tripId?.toString();

      // If currently inside a specific trip workspace, ignore notifications belonging to other trips
      if (currentTripId) {
        if (!notifTripId || notifTripId !== currentTripId.toString()) {
          return;
        }
      }

      // 1. Instantly increment unread badge counter for matching scope
      setUnreadCount((prevCount) => prevCount + 1);

      // 2. Prepend new notification to current list (preventing duplicates)
      setNotifications((prevList) => {
        const exists = prevList.some((item) => item._id === newNotif._id);
        if (exists) return prevList;
        return [newNotif, ...prevList];
      });
    };

    socket.on('notification:new', handleNewNotification);

    // Clean up listener on unmount to prevent memory leaks and duplicate listeners
    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [currentTripId]);

  // Handle Bell Click Toggle
  const handleToggleDrawer = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      fetchNotifications();
    }
  };

  // Close drawer on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle Mark Single Notification as Read and Navigate
  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((item) => (item._id === notif._id ? { ...item, isRead: true } : item))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      try {
        await api.patch(`/notifications/${notif._id}/read`);
      } catch (err) {
        // Revert on error
        fetchUnreadCount();
      }
    }

    setIsOpen(false);

    if (notif.actionUrl && notif.actionUrl.trim()) {
      navigate(notif.actionUrl.trim());
    }
  };

  // Handle Mark All Notifications as Read
  const handleMarkAllAsRead = async () => {
    if (notifications.length === 0 || unreadCount === 0) return;
    setMarkingAll(true);

    // Optimistic update
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);

    try {
      await api.patch('/notifications/read-all');
    } catch (err) {
      fetchUnreadCount();
      fetchNotifications();
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div ref={drawerRef} className="tp-notification-wrapper">
      {/* 🔔 Interactive Notification Bell Trigger Button */}
      <button
        type="button"
        onClick={handleToggleDrawer}
        title="In-App Notifications"
        className={`tp-notification-bell-btn ${isOpen ? 'active' : ''}`}
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell size={18} />
        {/* Unread Counter Badge (Only render if > 0) */}
        {unreadCount > 0 && (
          <span className="tp-notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* ========================================================= */}
      {/* 🔔 LIGHT NOTIFICATION DROPDOWN / PANEL */}
      {/* ========================================================= */}
      {isOpen && (
        <div
          className="tp-notification-dropdown"
          role="dialog"
          aria-label="Notifications Panel"
        >
          {/* Dropdown Header */}
          <div className="tp-notification-header">
            <div className="tp-notification-header-left">
              <span className="tp-notification-header-icon">
                <Bell size={16} />
              </span>
              <h3 className="tp-notification-header-title">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="tp-notification-unread-pill">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={markingAll}
                className="tp-notification-mark-all-btn"
                title="Mark all notifications as read"
              >
                <CheckCheck size={14} />
                <span>{markingAll ? 'Marking...' : 'Mark all as read'}</span>
              </button>
            )}
          </div>

          {/* Dropdown Body Content */}
          <div className="tp-notification-body">
            {/* Loading State */}
            {loading && (
              <div className="tp-notification-status-box">
                <Loader2 size={22} className="animate-spin tp-notification-spinner" />
                <span>Loading notifications...</span>
              </div>
            )}

            {/* Error State */}
            {!loading && error && (
              <div className="tp-notification-error-box">
                <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && notifications.length === 0 && (
              <div className="tp-notification-empty-box">
                <div className="tp-notification-empty-icon">
                  <Bell size={20} />
                </div>
                <h4 className="tp-notification-empty-title">
                  You're all caught up!
                </h4>
                <p className="tp-notification-empty-text">
                  No new notifications right now.
                </p>
              </div>
            )}

            {/* Notifications Cards List */}
            {!loading && !error && notifications.length > 0 && (
              notifications.map((notif) => {
                const isUnread = !notif.isRead;

                return (
                  <div
                    key={notif._id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`tp-notification-item ${isUnread ? 'unread' : 'read'}`}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleNotificationClick(notif);
                      }
                    }}
                  >
                    {/* Icon Badge */}
                    <div className="tp-notification-item-icon">
                      {renderTypeIcon(notif.type)}
                    </div>

                    {/* Text Content */}
                    <div className="tp-notification-item-content">
                      <div className="tp-notification-item-top">
                        <h4 className="tp-notification-item-title">
                          {notif.title}
                        </h4>
                        <span className="tp-notification-item-time">
                          {getTimeAgo(notif.createdAt)}
                        </span>
                      </div>

                      <p className="tp-notification-item-message">
                        {notif.message}
                      </p>
                    </div>

                    {/* Unread Indicator Dot */}
                    {isUnread && (
                      <div className="tp-notification-unread-dot" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
