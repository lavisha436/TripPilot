import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios.js';
import { AuthContext } from '../context/AuthContext.jsx';
import NotificationBell from '../components/NotificationBell.jsx';
import {
  MapPin,
  Image as ImageIcon,
  Video as VideoIcon,
  UploadCloud,
  Trash2,
  ExternalLink,
  X,
  User,
  Loader2,
  Play
} from 'lucide-react';

/**
 * 📸 Gallery Page Component: Displays shared trip media photos and videos in a responsive grid
 * with integrated full-size Lightbox modal viewer, media upload form, and role-authorized deletion.
 */
export default function Gallery() {
  const { tripId } = useParams();
  const { user } = useContext(AuthContext);

  const [trip, setTrip] = useState(null);
  const [members, setMembers] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Upload Form State
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const fileInputRef = useRef(null);

  // Delete State
  const [mediaToDelete, setMediaToDelete] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  // Lightbox Modal State
  const [selectedMedia, setSelectedMedia] = useState(null);

  const fetchTripAndGallery = async () => {
    setLoading(true);
    setError('');

    try {
      const [tripRes, galleryRes] = await Promise.all([
        api.get(`/trips/${tripId}`),
        api.get(`/trips/${tripId}/gallery`)
      ]);
      setTrip(tripRes.data?.data?.trip || null);
      setMembers(tripRes.data?.data?.members || []);
      setGallery(galleryRes.data?.data?.gallery || []);
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || 'Failed to fetch trip gallery media. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchGallery = async () => {
    try {
      const response = await api.get(`/trips/${tripId}/gallery`);
      setGallery(response.data?.data?.gallery || []);
    } catch (err) {
      // Quiet background refresh
    }
  };

  useEffect(() => {
    fetchTripAndGallery();
  }, [tripId]);

  // Determine user role and permissions in this trip workspace
  const currentMember =
    user &&
    members.find((m) => {
      const memberUserId = m.userId?._id ? m.userId._id.toString() : m.userId?.toString();
      return memberUserId === user._id?.toString();
    });

  const tripCreatedBy = trip?.createdBy?._id
    ? trip.createdBy._id.toString()
    : trip?.createdBy?.toString();
  const isCreator = user && tripCreatedBy === user._id?.toString();

  const userRole = currentMember ? currentMember.role : isCreator ? 'OWNER' : 'VIEWER';
  const isOwner = userRole === 'OWNER';

  // Check if current user is authorized to delete a specific gallery item
  const canDeleteMedia = (item) => {
    if (!user) return false;
    if (isOwner) return true;
    const uploaderIdStr = item.uploaderId?._id
      ? item.uploaderId._id.toString()
      : item.uploaderId?.toString();
    return uploaderIdStr === user._id?.toString();
  };

  const openDeleteModal = (item) => {
    setMediaToDelete(item);
    setDeleteError('');
  };

  const handleConfirmDelete = async () => {
    if (!mediaToDelete) return;

    const item = mediaToDelete;
    setDeletingId(item._id);
    setDeleteError('');

    try {
      await api.delete(`/trips/${tripId}/gallery/${item._id}`);
      setMediaToDelete(null);
      fetchGallery();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete media item. Please try again.';
      setDeleteError(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setUploadError('Please select an image or video file to upload.');
      return;
    }

    setUploading(true);
    setUploadError('');
    setUploadSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (caption.trim()) {
        formData.append('caption', caption.trim());
      }

      await api.post(`/trips/${tripId}/gallery`, formData);

      setUploadSuccess('Media uploaded to trip gallery successfully!');
      setFile(null);
      setCaption('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Refresh gallery media list
      fetchGallery();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to upload media. Please try again.';
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleMediaClick = (item) => {
    setSelectedMedia(item);
  };

  const closeLightbox = () => {
    setSelectedMedia(null);
  };

  return (
    <div className="tp-gallery-container">
      {/* 🧭 Main Header matching Trip Workspace visual hierarchy */}
      <header className="tp-expenses-header">
        <div className="tp-expenses-header-left">
          <div className="tp-trip-overview-eyebrow">
            <span className="tp-trip-overview-line" />
            <span>PHOTO GALLERY</span>
          </div>

          <h1 className="tp-trip-overview-title" style={{ fontSize: '2.4rem', marginBottom: '8px' }}>
            Trip Gallery
          </h1>

          <div className="tp-trip-overview-location" style={{ marginBottom: 0 }}>
            <MapPin size={16} className="tp-trip-overview-pin" />
            <span>
              {trip?.destination
                ? `Shared memories and moments from ${trip.destination}`
                : 'Shared photos and videos from your journey'}
            </span>
          </div>
        </div>

        <div className="tp-expenses-header-right">
          <div className="tp-workspace-bell-wrap">
            <NotificationBell tripId={tripId} />
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 📤 COMPACT MEDIA UPLOAD CARD */}
      {/* ========================================================= */}
      <div className="tp-gallery-upload-card">
        <div className="tp-gallery-upload-header">
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '9px',
              background: '#fff7ed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ea580c',
              flexShrink: 0
            }}
          >
            <UploadCloud size={18} />
          </div>
          <div>
            <h3 style={{ color: '#0f172a', fontSize: '0.98rem', fontWeight: '700', margin: 0 }}>
              Upload Photos & Videos
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.78rem', margin: '2px 0 0 0' }}>
              Share high-resolution travel memories with all members of this trip
            </p>
          </div>
        </div>

        {uploadError && (
          <div
            style={{
              marginBottom: '12px',
              padding: '9px 12px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#991b1b',
              fontSize: '0.84rem'
            }}
          >
            {uploadError}
          </div>
        )}

        {uploadSuccess && (
          <div
            style={{
              marginBottom: '12px',
              padding: '9px 12px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              color: '#166534',
              fontSize: '0.84rem'
            }}
          >
            ✓ {uploadSuccess}
          </div>
        )}

        <form onSubmit={handleUploadSubmit}>
          {/* Subtle Dash Dropzone */}
          <div className={`tp-gallery-dropzone ${file ? 'has-file' : ''}`}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/heic,video/mp4,video/quicktime,video/webm"
              onChange={handleFileChange}
              disabled={uploading}
              className="tp-gallery-file-input"
              title="Click to choose a file"
            />
            <UploadCloud size={22} style={{ color: '#ea580c', marginBottom: '2px' }} />
            <p style={{ margin: 0, fontWeight: '600', fontSize: '0.86rem', color: '#0f172a' }}>
              {file ? file.name : 'Choose photos or videos'}
            </p>
            <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b' }}>
              JPG, PNG, WEBP, GIF, HEIC, MP4, MOV, WEBM
            </p>
          </div>

          {/* Caption input & Upload button in a clean compact horizontal layout */}
          <div className="tp-gallery-upload-bottom">
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              disabled={uploading}
              className="tp-form-input"
              style={{ flex: 1, minWidth: '220px' }}
            />
            <button
              type="submit"
              disabled={uploading || !file}
              className="tp-btn-primary"
              style={{ opacity: uploading || !file ? 0.6 : 1, whiteSpace: 'nowrap' }}
            >
              {uploading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <UploadCloud size={15} />
                  <span>Upload Media</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ========================================================= */}
      {/* 🖼️ GALLERY MEDIA GRID */}
      {/* ========================================================= */}
      {deleteError && (
        <div
          style={{
            marginBottom: '16px',
            padding: '10px 14px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#991b1b',
            fontSize: '0.85rem'
          }}
        >
          {deleteError}
        </div>
      )}

      {loading && (
        <div className="tp-workspace-loading-box" style={{ marginBottom: '32px' }}>
          <Loader2 size={26} className="animate-spin" style={{ color: '#ea580c', margin: '0 auto 10px auto' }} />
          <p style={{ margin: 0, color: '#64748b' }}>Loading trip gallery memories...</p>
        </div>
      )}

      {!loading && error && (
        <div className="alert alert-error" style={{ marginBottom: '24px' }}>
          {error}
        </div>
      )}

      {!loading && !error && gallery.length === 0 && (
        <div
          style={{
            background: '#ffffff',
            border: '1px dashed rgba(15, 23, 42, 0.15)',
            borderRadius: '16px',
            padding: '48px 24px',
            textAlign: 'center',
            marginBottom: '32px'
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: '#fff7ed',
              color: '#ea580c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px auto'
            }}
          >
            <ImageIcon size={22} />
          </div>
          <h3 style={{ color: '#0f172a', fontSize: '1.05rem', fontWeight: '700', marginBottom: '4px' }}>
            No media uploaded yet
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem', maxWidth: '380px', margin: '0 auto', lineHeight: '1.45' }}>
            Be the first to share photos and travel moments from this journey.
          </p>
        </div>
      )}

      {!loading && !error && gallery.length > 0 && (
        <div className="tp-gallery-grid">
          {gallery.map((item) => (
            <div key={item._id} className="tp-gallery-item-card">
              {/* Media Thumbnail Container */}
              <div
                className="tp-gallery-thumb-wrap"
                onClick={() => handleMediaClick(item)}
                title="Click to view full size"
              >
                {item.mediaType === 'VIDEO' ? (
                  <div className="tp-gallery-video-preview">
                    <div className="tp-gallery-video-play-badge">
                      <Play size={20} fill="#ea580c" style={{ marginLeft: '3px' }} />
                    </div>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '8px', fontWeight: '600' }}>
                      Watch Video
                    </span>
                  </div>
                ) : (
                  <img
                    src={item.mediaUrl}
                    alt={item.caption || 'Trip photo'}
                    className="tp-gallery-thumb-img"
                    loading="lazy"
                  />
                )}

                <span className="tp-gallery-type-badge">
                  {item.mediaType === 'VIDEO' ? (
                    <>
                      <VideoIcon size={11} style={{ color: '#ea580c' }} /> VIDEO
                    </>
                  ) : (
                    <>
                      <ImageIcon size={11} style={{ color: '#ea580c' }} /> PHOTO
                    </>
                  )}
                </span>
              </div>

              {/* Media Metadata Container */}
              <div className="tp-gallery-card-body">
                <div>
                  <div className="tp-gallery-card-top-row">
                    <span className="tp-gallery-uploader" title={item.uploaderId?.name || item.uploaderId?.email}>
                      <User size={13} style={{ color: '#94a3b8', flexShrink: 0 }} />
                      <span>{item.uploaderId?.name || item.uploaderId?.email || 'Member'}</span>
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <a
                        href={item.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open original media link"
                        style={{
                          color: '#64748b',
                          padding: '3px',
                          display: 'flex',
                          alignItems: 'center',
                          transition: 'color 0.2s'
                        }}
                      >
                        <ExternalLink size={13} />
                      </a>

                      {canDeleteMedia(item) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteModal(item);
                          }}
                          disabled={deletingId === item._id}
                          className="tp-btn-icon-danger"
                          style={{ padding: '3px 7px', fontSize: '0.72rem' }}
                          title="Delete Media"
                        >
                          <Trash2 size={11} />
                          <span>{deletingId === item._id ? '...' : 'Delete'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {item.caption && (
                    <p className="tp-gallery-caption">
                      {item.caption}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================= */}
      {/* 🖼️ FULL-SIZE LIGHTBOX MODAL */}
      {/* ========================================================= */}
      {selectedMedia && (
        <div
          className="tp-modal-backdrop"
          onClick={closeLightbox}
          style={{ background: 'rgba(15, 23, 42, 0.88)' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: '#ffffff',
              border: '1px solid rgba(15, 23, 42, 0.1)',
              borderRadius: '16px',
              padding: '18px',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.4)'
            }}
          >
            <button
              type="button"
              onClick={closeLightbox}
              style={{
                position: 'absolute',
                top: '-12px',
                right: '-12px',
                zIndex: 100,
                background: '#ffffff',
                border: '1px solid rgba(15, 23, 42, 0.12)',
                color: '#0f172a',
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(15, 23, 42, 0.15)'
              }}
              title="Close Full View"
            >
              <X size={16} />
            </button>

            {selectedMedia.mediaType === 'VIDEO' ? (
              <video
                src={selectedMedia.mediaUrl}
                controls
                autoPlay
                playsInline
                style={{
                  maxWidth: '85vw',
                  maxHeight: '72vh',
                  borderRadius: '10px',
                  display: 'block',
                  outline: 'none'
                }}
              />
            ) : (
              <img
                src={selectedMedia.mediaUrl}
                alt={selectedMedia.caption || 'Full view photo'}
                style={{
                  maxWidth: '85vw',
                  maxHeight: '72vh',
                  objectFit: 'contain',
                  borderRadius: '10px',
                  display: 'block'
                }}
              />
            )}

            <div style={{ marginTop: '12px', textAlign: 'center', width: '100%' }}>
              <p style={{ color: '#0f172a', fontWeight: '700', fontSize: '0.92rem', margin: '0 0 2px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <User size={13} style={{ color: '#ea580c' }} />
                <span>{selectedMedia.uploaderId?.name || selectedMedia.uploaderId?.email || 'Member'}</span>
              </p>
              {selectedMedia.caption && (
                <p style={{ color: '#64748b', fontSize: '0.84rem', margin: 0 }}>
                  {selectedMedia.caption}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 🗑️ DELETE CONFIRMATION MODAL OVERLAY */}
      {/* ========================================================= */}
      {mediaToDelete && (
        <div className="tp-modal-backdrop" onClick={() => setMediaToDelete(null)}>
          <div
            className="tp-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '420px' }}
          >
            <div className="tp-modal-header" style={{ marginBottom: '12px' }}>
              <h2 className="tp-modal-title" style={{ color: '#dc2626', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Trash2 size={18} />
                <span>Delete Media</span>
              </h2>
              <button
                type="button"
                className="tp-modal-close-btn"
                onClick={() => setMediaToDelete(null)}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {deleteError && (
              <div
                style={{
                  marginBottom: '14px',
                  padding: '9px 12px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  color: '#991b1b',
                  fontSize: '0.84rem'
                }}
              >
                {deleteError}
              </div>
            )}

            <p style={{ color: '#475569', fontSize: '0.9rem', margin: '0 0 16px 0', lineHeight: '1.5' }}>
              Are you sure you want to delete this {mediaToDelete.mediaType === 'VIDEO' ? 'video' : 'photo'}? This action cannot be undone.
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setMediaToDelete(null)}
                disabled={deletingId === mediaToDelete._id}
                className="tp-btn-modal-cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deletingId === mediaToDelete._id}
                className="tp-btn-delete-confirm"
                style={{ opacity: deletingId === mediaToDelete._id ? 0.6 : 1 }}
              >
                {deletingId === mediaToDelete._id ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
