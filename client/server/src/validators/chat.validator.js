const Joi = require('joi');

const mongoId = Joi.string().hex().length(24);

const sendMessage = {
  params: Joi.object({ meetingId: mongoId.required() }),
  body: Joi.object({
    content: Joi.string().min(1).max(4000).required(),
  }),
};

const getMessages = {
  params: Joi.object({ meetingId: mongoId.required() }),
  query: Joi.object({
    page:  Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
  }),
};

const deleteMessage = {
  params: Joi.object({ messageId: mongoId.required() }),
};

module.exports = { sendMessage, getMessages, deleteMessage };
