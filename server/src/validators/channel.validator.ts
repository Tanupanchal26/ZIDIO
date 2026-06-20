// @ts-nocheck
const Joi = require('joi');

const mongoId = Joi.string().hex().length(24);

const createChannel = {
  params: Joi.object({ teamId: mongoId.required() }),
  body: Joi.object({
    name:        Joi.string().trim().min(1).max(80).required(),
    description: Joi.string().max(300).allow('').optional(),
    topic:       Joi.string().max(200).allow('').optional(),
    type:        Joi.string().valid('public', 'private', 'announcement').default('public'),
  }),
};

const updateChannel = {
  params: Joi.object({ id: mongoId.required() }),
  body: Joi.object({
    name:        Joi.string().trim().min(1).max(80),
    description: Joi.string().max(300).allow(''),
    topic:       Joi.string().max(200).allow(''),
  }).min(1),
};

const channelParam = {
  params: Joi.object({ id: mongoId.required() }),
};

const sendMessage = {
  params: Joi.object({ id: mongoId.required() }),
  body: Joi.object({
    content:     Joi.string().min(1).max(4000).required(),
    mentions:    Joi.array().items(mongoId).optional(),
    attachments: Joi.array().items(Joi.object({
      url:      Joi.string().uri().required(),
      name:     Joi.string().required(),
      mimeType: Joi.string().optional(),
      size:     Joi.number().optional(),
    })).optional(),
    parentId: mongoId.optional(),
  }),
};

const editMessage = {
  params: Joi.object({ id: mongoId.required(), msgId: mongoId.required() }),
  body: Joi.object({
    content: Joi.string().min(1).max(4000).required(),
  }),
};

const reaction = {
  params: Joi.object({ id: mongoId.required(), msgId: mongoId.required() }),
  body: Joi.object({
    emoji: Joi.string().min(1).max(10).required(),
  }),
};

const listMessages = {
  params: Joi.object({ id: mongoId.required() }),
  query: Joi.object({
    page:   Joi.number().integer().min(1).default(1),
    limit:  Joi.number().integer().min(1).max(100).default(50),
    before: Joi.string().isoDate().optional(),
  }),
};

module.exports = { createChannel, updateChannel, channelParam, sendMessage, editMessage, reaction, listMessages };

export {};
