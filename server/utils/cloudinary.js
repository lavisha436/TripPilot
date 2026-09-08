import { v2 as cloudinary } from 'cloudinary';
import { ENV } from '../config/env.js';
import { ApiError } from './ApiError.js';

/**
 * ☁️ Cloudinary Utility Module: Configures Cloudinary SDK and provides helper methods
 * for streaming buffer uploads and destroying assets.
 */
cloudinary.config({
  cloud_name: ENV.CLOUDINARY_CLOUD_NAME,
  api_key: ENV.CLOUDINARY_API_KEY,
  api_secret: ENV.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Streams an in-memory buffer to Cloudinary.
 * 
 * @param {Buffer} fileBuffer - In-memory file buffer from Multer.
 * @param {string} [folder='trippilot/gallery'] - Cloudinary target directory.
 * @param {string} [resourceType='auto'] - Resource type ('image', 'video', or 'auto').
 * @returns {Promise<Object>} Cloudinary upload API response object containing secure_url and public_id.
 */
export const uploadToCloudinary = (fileBuffer, folder = 'trippilot/gallery', resourceType = 'auto') => {
  return new Promise((resolve, reject) => {
    if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
      return reject(new ApiError(400, 'Invalid file buffer provided for Cloudinary upload.'));
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType
      },
      (error, result) => {
        if (error) {
          console.error('[Cloudinary Upload Error Details]:', {
            message: error.message,
            http_code: error.http_code,
            name: error.name,
            errorObj: JSON.stringify(error)
          });
          return reject(
            new ApiError(502, `Cloudinary upload failed: ${error.message || 'Media storage error'}`)
          );
        }
        resolve(result);
      }
    );

    uploadStream.end(fileBuffer);
  });
};

/**
 * Removes an asset from Cloudinary storage by public ID.
 * 
 * @param {string} publicId - Cloudinary asset public ID.
 * @param {string} [resourceType='image'] - Cloudinary resource type ('image' or 'video').
 * @returns {Promise<Object>} Cloudinary destruction result object.
 */
export const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  if (!publicId) return null;
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });
    return result;
  } catch (error) {
    console.error('[Cloudinary Delete Error]:', error.message);
    return null;
  }
};
