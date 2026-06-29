import { v2 as cloudinary } from 'cloudinary';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const config = require('../../config/env');

cloudinary.config({
  cloud_name: config.cloudinary.name,
  api_key:    config.cloudinary.key,
  api_secret: config.cloudinary.secret,
});

export const uploadToCloudinary = async (filePath: string) => {
  return await cloudinary.uploader.upload(filePath, {
    folder: config.cloudinary.folder || 'intellmeet',
  });
};

export const deleteFromCloudinary = async (publicId: string) => {
  return await cloudinary.uploader.destroy(publicId);
};
