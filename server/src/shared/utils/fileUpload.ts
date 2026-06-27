// @ts-nocheck
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';

// Store files in ./uploads with random filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.resolve(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = crypto.randomBytes(16).toString('hex') + ext;
    cb(null, name);
  },
});

// Only accept JPEG images and limit size to 5 MB
const fileFilter = (req, file, cb) => {
  if (file.mimetype !== 'image/jpeg') {
    return cb(new Error('Only JPEG images are allowed'), false);
  }
  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
});
