import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios.js';
import { socket } from '../socket.js';

/**
 * 🔔 NotificationBell Component: Renders in-app notification bell icon with unread badge count
 * and a glassmorphic dropdown/drawer displaying real-time alerts.
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

  // Type Icons Configuration Map
  const TYPE_ICONS = {
    MEMBER_INVITE: '📩',
    MEMBER_ACCEPTED: '👥',
    BUDGET_WARNING: '💰',
    WEATHER_ALERT: '🌦️',
    AI_ITINERARY: '🤖',
    GALLERY_UPLOAD: '📸',
    ACTIVITY_REMINDER: '⏰',
    SYSTEM: '🔔'
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
    <div ref={drawerRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* 🔔 Interactive Notification Bell Button */}
      <button
        type="button"
        onClick={handleToggleDrawer}
        title="In-App Notifications"
        style={{
          position: 'relative',
          background: isOpen ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.08)',
          border: isOpen ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '50px',
          width: '42px',
          height: '42px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.25rem',
          color: '#ffffff',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          outline: 'none'
        }}
      >
        🔔
        {/* Unread Counter Badge (Only render if > 0) */}
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: '#ef4444',
              color: '#ffffff',
              fontSize: '0.75rem',
              fontWeight: '700',
              borderRadius: '50px',
              minWidth: '18px',
              height: '18px',
              padding: '0 4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(239, 68, 68, 0.6)',
              border: '2px solid #0f172a'
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* ========================================================= */}
      {/* 🔮 GLASSMORPHIC NOTIFICATION DROPDOWN / DRAWER */}
      {/* ========================================================= */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '52px',
            right: 0,
            width: '360px',
            maxWidth: '90vw',
            maxHeight: '480px',
            background: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
            zIndex: 1100,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            textAlign: 'left'
          }}
        >
          {/* Drawer Header */}
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center',
              background: 'rgba(255, 255, 255, 0.03)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.1rem' }}>🔔</span>
              <h3 style={{ color: '#ffffff', fontSize: '1rem', margin: 0, fontWeight: '700' }}>
                Notifications
              </h3>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={markingAll}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#38bdf8',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  cursor: markingAll ? 'not-allowed' : 'pointer',
                  opacity: markingAll ? 0.6 : 1,
                  padding: 0
                }}
              >
                {markingAll ? 'Marking...' : 'Mark all as read'}
              </button>
            )}
          </div>

          {/* Drawer Body Content */}
          <div style={{ padding: '12px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Loading State */}
            {loading && (
              <div style={{ textAlign: 'center', padding: '24px 12px', color: '#cbd5e1', fontSize: '0.9rem' }}>
                Loading notifications...
              </div>
            )}

            {/* Error State */}
            {!loading && error && (
              <div className="alert alert-error" style={{ fontSize: '0.85rem', padding: '10px 12px' }}>
                {error}
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && notifications.length === 0 && (
              <div style={{ textAlign: 'center', padding: '36px 16px', color: '#94a3b8' }}>
                <div style={{ fontSize: '2.2rem', marginBottom: '8px' }}>🔔</div>
                <h4 style={{ color: '#ffffff', fontSize: '1rem', marginBottom: '4px' }}>You're all caught up!</h4>
                <p style={{ fontSize: '0.85rem', margin: 0 }}>No new notifications.</p>
              </div>
            )}

            {/* Notifications Cards List */}
            {!loading && !error && notifications.length > 0 && (
              notifications.map((notif) => {
                const icon = TYPE_ICONS[notif.type] || TYPE_ICONS.SYSTEM;
                const isUnread = !notif.isRead;

                return (
                  <div
                    key={notif._id}
                    onClick={() => handleNotificationClick(notif)}
                    style={{
                      background: isUnread ? 'rgba(56, 189, 248, 0.12)' : 'rgba(15, 23, 42, 0.5)',
                      border: isUnread ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      position: 'relative'
                    }}
                  >
                    {/* Icon Badge */}
                    <div
                      style={{
                        fontSize: '1.25rem',
                        background: 'rgba(255, 255, 255, 0.08)',
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      {icon}
                    </div>

                    {/* Text Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '2px' }}>
                        <h4
                          style={{
                            color: isUnread ? '#ffffff' : '#cbd5e1',
                            fontSize: '0.9rem',
                            fontWeight: isUnread ? '700' : '600',
                            margin: 0,
                            lineHeight: '1.3'
                          }}
                        >
                          {notif.title}
                        </h4>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', whitespace: 'nowrap', flexShrink: 0 }}>
                          {getTimeAgo(notif.createdAt)}
                        </span>
                      </div>

                      <p
                        style={{
                          color: isUnread ? '#e2e8f0' : '#94a3b8',
                          fontSize: '0.82rem',
                          margin: 0,
                          lineHeight: '1.4',
                          wordBreak: 'break-word'
                        }}
                      >
                        {notif.message}
                      </p>
                    </div>

                    {/* Unread Indicator Dot */}
                    {isUnread && (
                      <div
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: '#38bdf8',
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          boxShadow: '0 0 6px #38bdf8'
                        }}
                      />
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
