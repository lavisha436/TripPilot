import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios.js';
import { AuthContext } from '../context/AuthContext.jsx';

/**
 * 📸 Gallery Page Component: Displays shared trip media photos and videos in a responsive glassmorphic grid
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
    <div className="landing-container" style={{ padding: '40px 20px' }}>
      <div className="glass-card" style={{ maxWidth: '1200px', width: '100%', textAlign: 'left' }}>
        <div className="badge" style={{ marginBottom: '12px' }}>📸 Collaborative Album</div>
        <h1 className="page-title" style={{ fontSize: '2.2rem', marginBottom: '24px' }}>
          📸 Trip Gallery
        </h1>

        {/* ========================================================= */}
        {/* 📤 MEDIA UPLOAD SECTION */}
        {/* ========================================================= */}
        <div
          className="placeholder-box"
          style={{
            marginBottom: '28px',
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '14px',
            padding: '20px'
          }}
        >
          <h3 style={{ color: '#ffffff', fontSize: '1.1rem', margin: '0 0 12px 0' }}>
            📤 Upload Media to Trip Gallery
          </h3>

          {uploadError && (
            <div className="alert alert-error" style={{ marginBottom: '14px' }}>
              {uploadError}
            </div>
          )}

          {uploadSuccess && (
            <div className="alert alert-success" style={{ marginBottom: '14px' }}>
              ✓ {uploadSuccess}
            </div>
          )}

          <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: '#cbd5e1', fontSize: '0.85rem', fontWeight: '500' }}>
                Select File (Images: JPEG, PNG, WEBP, GIF, HEIC | Videos: MP4, MOV, WEBM)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/heic,video/mp4,video/quicktime,video/webm"
                onChange={handleFileChange}
                disabled={uploading}
                style={{
                  color: '#ffffff',
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: '#cbd5e1', fontSize: '0.85rem', fontWeight: '500' }}>
                Caption (Optional)
              </label>
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption for this memory..."
                disabled={uploading}
                className="input-field"
                style={{
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={uploading || !file}
                className="btn btn-primary"
                style={{ fontSize: '0.9rem', padding: '10px 20px' }}
              >
                {uploading ? '⏳ Uploading Media...' : '📤 Upload Media'}
              </button>
            </div>
          </form>
        </div>

        {/* ========================================================= */}
        {/* 🖼️ GALLERY MEDIA GRID */}
        {/* ========================================================= */}
        {deleteError && (
          <div className="alert alert-error" style={{ marginBottom: '16px' }}>
            {deleteError}
          </div>
        )}

        {loading && (
          <div className="placeholder-box" style={{ textAlign: 'center' }}>
            <p style={{ color: '#cbd5e1' }}>Loading trip gallery...</p>
          </div>
        )}

        {!loading && error && (
          <div className="alert alert-error">{error}</div>
        )}

        {!loading && !error && gallery.length === 0 && (
          <div className="placeholder-box" style={{ textAlign: 'center', padding: '30px' }}>
            <p style={{ color: '#cbd5e1' }}>No media uploaded to this gallery yet.</p>
          </div>
        )}

        {!loading && !error && gallery.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '18px',
              marginBottom: '28px'
            }}
          >
            {gallery.map((item) => (
              <div
                key={item._id}
                className="placeholder-box"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '12px',
                  padding: '12px',
                  overflow: 'hidden'
                }}
              >
                {/* Media Thumbnail Container */}
                <div
                  onClick={() => handleMediaClick(item)}
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '180px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    background: '#090d16',
                    cursor: 'pointer'
                  }}
                >
                  {item.mediaType === 'VIDEO' ? (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(30, 41, 59, 0.8)',
                        color: '#38bdf8'
                      }}
                    >
                      <span style={{ fontSize: '2.5rem' }}>🎥</span>
                      <span style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '4px' }}>
                        Video File
                      </span>
                    </div>
                  ) : (
                    <img
                      src={item.mediaUrl}
                      alt={item.caption || 'Trip media photo'}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block'
                      }}
                    />
                  )}
                  <span
                    className="badge"
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      fontSize: '0.7rem',
                      padding: '3px 8px',
                      background: 'rgba(15, 23, 42, 0.85)',
                      backdropFilter: 'blur(4px)'
                    }}
                  >
                    {item.mediaType === 'VIDEO' ? '🎥 VIDEO' : '🖼️ IMAGE'}
                  </span>
                </div>

                {/* Media Metadata Container */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#ffffff', fontWeight: '600', fontSize: '0.85rem' }}>
                      👤 {item.uploaderId?.name || item.uploaderId?.email || 'Unknown Member'}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <a
                        href={item.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open full size media link"
                        style={{ color: '#38bdf8', fontSize: '0.8rem', textDecoration: 'none' }}
                      >
                        🔗 Link
                      </a>
                      {canDeleteMedia(item) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteModal(item);
                          }}
                          disabled={deletingId === item._id}
                          className="btn btn-sm"
                          style={{
                            fontSize: '0.75rem',
                            padding: '3px 8px',
                            background: 'rgba(239, 68, 68, 0.2)',
                            color: '#fca5a5',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            borderRadius: '6px',
                            cursor: deletingId === item._id ? 'not-allowed' : 'pointer'
                          }}
                          title="Delete Media"
                        >
                          {deletingId === item._id ? 'Deleting...' : '🗑️ Delete'}
                        </button>
                      )}
                    </div>
                  </div>

                  {item.caption && (
                    <p
                      style={{
                        color: '#cbd5e1',
                        fontSize: '0.85rem',
                        margin: '4px 0 0 0',
                        lineHeight: '1.3'
                      }}
                    >
                      {item.caption}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: '24px' }}>
          <Link to={`/dashboard/trip/${tripId}`} className="btn btn-secondary">
            ← Back to Trip Workspace
          </Link>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 🖼️ FULL-SIZE IMAGE LIGHTBOX MODAL OVERLAY */}
      {/* ========================================================= */}
      {selectedMedia && (
        <div
          onClick={closeLightbox}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.88)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px'
          }}
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
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)'
            }}
          >
            <button
              type="button"
              onClick={closeLightbox}
              style={{
                position: 'absolute',
                top: '-14px',
                right: '-14px',
                zIndex: 100,
                background: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                color: '#ffffff',
                fontSize: '1.4rem',
                fontWeight: 'bold',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
              }}
              title="Close Full Image View"
            >
              ✕
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
                  borderRadius: '8px',
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
                  borderRadius: '8px',
                  display: 'block'
                }}
              />
            )}

            <div style={{ marginTop: '14px', textAlign: 'center', width: '100%' }}>
              <p style={{ color: '#ffffff', fontWeight: '600', fontSize: '0.95rem', margin: '0 0 4px 0' }}>
                👤 {selectedMedia.uploaderId?.name || selectedMedia.uploaderId?.email || 'Unknown Member'}
              </p>
              {selectedMedia.caption && (
                <p style={{ color: '#cbd5e1', fontSize: '0.9rem', margin: 0 }}>
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
        <div
          onClick={() => setMediaToDelete(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-card"
            style={{
              maxWidth: '440px',
              width: '100%',
              textAlign: 'center',
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '24px',
              borderRadius: '16px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)'
            }}
          >
            <h3 style={{ color: '#ffffff', fontSize: '1.2rem', margin: '0 0 12px 0' }}>
              🗑️ Delete Media
            </h3>

            {deleteError && (
              <div className="alert alert-error" style={{ marginBottom: '14px', fontSize: '0.85rem' }}>
                {deleteError}
              </div>
            )}

            <p style={{ color: '#cbd5e1', fontSize: '0.95rem', margin: '0 0 8px 0' }}>
              Are you sure you want to delete this media?
            </p>
            <p style={{ color: '#fca5a5', fontSize: '0.85rem', margin: '0 0 20px 0' }}>
              This action cannot be undone.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setMediaToDelete(null)}
                disabled={deletingId === mediaToDelete._id}
                className="btn btn-secondary"
                style={{ minWidth: '100px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deletingId === mediaToDelete._id}
                className="btn"
                style={{
                  minWidth: '100px',
                  background: 'rgba(239, 68, 68, 0.25)',
                  color: '#fca5a5',
                  border: '1px solid rgba(239, 68, 68, 0.5)'
                }}
              >
                {deletingId === mediaToDelete._id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
