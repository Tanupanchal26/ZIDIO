const Joi = require('joi');

const mongoId = Joi.string().hex().length(24);

const listNotifications = {
  query: Joi.object({
    page:       Joi.number().integer().min(1).default(1),
    limit:      Joi.number().integer().min(1).max(100).default(20),
    unreadOnly: Joi.boolean().default(false),
  }),
};

const notifParam = {
  params: Joi.object({ id: mongoId.required() }),
};

module.exports = { listNotifications, notifParam };
