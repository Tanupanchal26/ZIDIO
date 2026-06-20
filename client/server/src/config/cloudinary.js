const cloudinary = require('cloudinary').v2;
const config = require('./env');

// Only configure if credentials are provided
if (config.cloudinary.name && config.cloudinary.key && config.cloudinary.secret) {
  cloudinary.config({
    cloud_name: config.cloudinary.name,
    api_key:    config.cloudinary.key,
    api_secret: config.cloudinary.secret,
    secure:     true,
  });
}

module.exports = cloudinary;
