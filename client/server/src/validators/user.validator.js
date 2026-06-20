const Joi = require('joi');

const updateProfile = {
  body: Joi.object({
    name:   Joi.string().trim().min(2).max(50).optional(),
    avatar: Joi.string().uri().allow('').optional(),
  }).min(1),
};

module.exports = { updateProfile };
