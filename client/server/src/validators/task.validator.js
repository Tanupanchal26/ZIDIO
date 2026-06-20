const Joi = require('joi');
const { TASK_STATUS, TASK_PRIORITY } = require('../constants');

const mongoId = Joi.string().hex().length(24);

const createTask = {
  body: Joi.object({
    title:       Joi.string().trim().min(1).max(200).required(),
    description: Joi.string().max(2000).allow('').optional(),
    status:      Joi.string().valid(...Object.values(TASK_STATUS)).optional(),
    priority:    Joi.string().valid(...Object.values(TASK_PRIORITY)).optional(),
    dueDate:     Joi.date().iso().optional(),
    tags:        Joi.array().items(Joi.string().max(50)).max(20).optional(),
    assignedTo:  mongoId.optional(),
    meeting:     mongoId.optional(),
  }),
};

const updateTask = {
  params: Joi.object({ id: mongoId.required() }),
  body: Joi.object({
    title:       Joi.string().trim().min(1).max(200),
    description: Joi.string().max(2000).allow(''),
    status:      Joi.string().valid(...Object.values(TASK_STATUS)),
    priority:    Joi.string().valid(...Object.values(TASK_PRIORITY)),
    dueDate:     Joi.date().iso().allow(null),
    tags:        Joi.array().items(Joi.string().max(50)).max(20),
    assignedTo:  mongoId.allow(null),
  }).min(1),
};

const taskParam = {
  params: Joi.object({ id: mongoId.required() }),
};

const listTasks = {
  query: Joi.object({
    meetingId: mongoId.optional(),
  }),
};

module.exports = { createTask, updateTask, taskParam, listTasks };
