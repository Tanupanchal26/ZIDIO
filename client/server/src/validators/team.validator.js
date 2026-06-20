const Joi = require('joi');

const mongoId = Joi.string().hex().length(24);

const createTeam = {
  body: Joi.object({
    name:        Joi.string().trim().min(2).max(80).required(),
    description: Joi.string().max(500).allow('').optional(),
    avatar:      Joi.string().uri().allow('').optional(),
    isPrivate:   Joi.boolean().default(false),
    settings: Joi.object({
      allowGuestInvite: Joi.boolean(),
      notifyOnMessage:  Joi.boolean(),
    }).optional(),
  }),
};

const updateTeam = {
  params: Joi.object({ id: mongoId.required() }),
  body: Joi.object({
    name:        Joi.string().trim().min(2).max(80),
    description: Joi.string().max(500).allow(''),
    avatar:      Joi.string().uri().allow(''),
    isPrivate:   Joi.boolean(),
    settings: Joi.object({
      allowGuestInvite: Joi.boolean(),
      notifyOnMessage:  Joi.boolean(),
    }),
  }).min(1),
};

const teamParam = {
  params: Joi.object({ id: mongoId.required() }),
};

const memberParam = {
  params: Joi.object({ id: mongoId.required(), userId: mongoId.required() }),
};

const inviteMember = {
  params: Joi.object({ id: mongoId.required() }),
  body: Joi.object({
    userId: mongoId.required(),
    role:   Joi.string().valid('admin', 'member', 'guest').default('member'),
  }),
};

const updateMemberRole = {
  params: Joi.object({ id: mongoId.required(), userId: mongoId.required() }),
  body: Joi.object({
    role: Joi.string().valid('admin', 'member', 'guest').required(),
  }),
};

module.exports = { createTeam, updateTeam, teamParam, memberParam, inviteMember, updateMemberRole };
