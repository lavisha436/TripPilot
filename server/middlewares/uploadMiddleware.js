import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

/**
 * 📤 UploadMiddleware: Multer Memory-Storage configuration for handling multipart/form-data.
 * Buffers media files directly in memory as `req.file.buffer` for streaming to Cloudinary.
 */

const storage = multer.memoryStorage();

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic'
];

const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm'
];

/**
 * MIME type filter callback. Accepts approved image and video formats.
 */
const fileFilter = (req, file, cb) => {
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.mimetype);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.mimetype);

  if (isImage || isVideo) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        400,
        `Unsupported file format (${file.mimetype}). Allowed image types: JPEG, PNG, WEBP, GIF, HEIC. Allowed video types: MP4, MOV, WEBM.`
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50 MB global cap
  }
});

/**
 * Express middleware to handle single media file upload.
 * Enforces 10 MB limit for images and 50 MB limit for videos.
 * 
 * @param {string} [fieldName='file'] - Form data file key.
 */
export const uploadSingleMedia = (fieldName = 'file') => {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new ApiError(413, 'File size exceeds maximum limit of 50 MB.'));
        }
        return next(new ApiError(400, `File upload error: ${err.message}`));
      } else if (err) {
        return next(err);
      }

      // Specific size validation: 10 MB for images
      if (req.file && ALLOWED_IMAGE_TYPES.includes(req.file.mimetype)) {
        if (req.file.size > 10 * 1024 * 1024) {
          return next(new ApiError(413, 'Image file size exceeds maximum limit of 10 MB.'));
        }
      }

      next();
    });
  };
};
