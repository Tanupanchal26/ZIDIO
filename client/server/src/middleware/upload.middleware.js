const multer      = require('multer');
const path        = require('path');
const cloudinary  = require('../config/cloudinary');
const ApiError    = require('../utils/ApiError');
const logger      = require('../utils/logger');

// ── Allowed MIME types ────────────────────────────────────────────────────────
const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'video/mp4', 'video/webm',
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// ── Multer config (memory storage — stream straight to Cloudinary) ─────────
const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(ApiError.badRequest(`File type '${file.mimetype}' is not allowed`), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});

// ── Cloudinary cleanup helper ─────────────────────────────────────────────────
/**
 * Delete a Cloudinary asset by public_id.
 * Fire-and-forget safe — logs errors but does not throw.
 */
const deleteCloudinaryAsset = async (publicId, resourceType = 'image') => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    logger.info(`[CLOUDINARY] Deleted asset: ${publicId}`);
  } catch (err) {
    logger.error(`[CLOUDINARY] Failed to delete asset ${publicId}: ${err.message}`);
  }
};

module.exports = { upload, deleteCloudinaryAsset };
