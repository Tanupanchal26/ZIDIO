// @ts-nocheck
const Joi = require('joi');
const { ROLES } = require('../constants');

// ── Reusable rules ─────────────────────────────────────────────────────────────
const passwordRules = Joi.string()
  .min(6)
  .max(64)
  .messages({
    'string.min':          'Password must be at least 6 characters',
    'string.max':          'Password must not exceed 64 characters',
  })
  .required();

const mongoId = Joi.string().hex().length(24);

// ── Schemas ────────────────────────────────────────────────────────────────────

const signup = {
  body: Joi.object({
    name:     Joi.string().trim().min(2).max(50).required()
              .messages({ 'string.min': 'Name must be at least 2 characters' }),
    email:    Joi.string().email().lowercase().required(),
    password: passwordRules,
    role:     Joi.string()
              .valid(ROLES.MEMBER)   // only safe roles on self-signup
              .default(ROLES.MEMBER),
  }),
};

const login = {
  body: Joi.object({
    email:    Joi.string().email().lowercase().required(),
    password: Joi.string().required(),
  }),
};

const refreshToken = {
  body: Joi.object({
    // Optional in body — prefer HTTP-only cookie, but accept body for mobile clients
    refreshToken: Joi.string().optional(),
  }),
};

const forgotPassword = {
  body: Joi.object({
    email: Joi.string().email().lowercase().required(),
  }),
};

const resetPassword = {
  params: Joi.object({
    token: Joi.string().required(),
  }),
  body: Joi.object({
    password:        passwordRules,
    confirmPassword: Joi.string()
      .valid(Joi.ref('password'))
      .required()
      .messages({ 'any.only': 'Passwords do not match' }),
  }),
};

const verifyEmail = {
  params: Joi.object({
    token: Joi.string().required(),
  }),
};

const changePassword = {
  body: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword:     passwordRules,
    confirmPassword: Joi.string()
      .valid(Joi.ref('newPassword'))
      .required()
      .messages({ 'any.only': 'Passwords do not match' }),
  }),
};

module.exports = {
  signup,
  login,
  refreshToken,
  forgotPassword,
  resetPassword,
  verifyEmail,
  changePassword,
};

export {};
