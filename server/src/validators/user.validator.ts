import Joi from 'joi';

export const updateProfile = {
  body: Joi.object({
    name: Joi.string().trim().min(2).max(50),
  }).min(1).messages({
    'object.min': 'At least one field is required',
  }),
};
