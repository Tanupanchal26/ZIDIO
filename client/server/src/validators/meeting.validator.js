const Joi = require('joi');
const { MEETING_STATUS } = require('../constants');

const mongoId = Joi.string().hex().length(24);

const createMeeting = {
  body: Joi.object({
    title:        Joi.string().trim().min(3).max(120).required(),
    description:  Joi.string().max(1000).allow('').optional(),
    scheduledAt:  Joi.date().iso().optional(),
    maxDuration:  Joi.number().integer().min(5).max(480).default(60),
    participants: Joi.array().items(mongoId).max(100).optional(),
    invitees:     Joi.array().items(Joi.object({ email: Joi.string().email() })).optional(),
    team:         mongoId.optional(),
    agenda: Joi.array().items(Joi.object({
      title:    Joi.string().max(200).required(),
      duration: Joi.number().min(1).default(5),
      order:    Joi.number().default(0),
    })).optional(),
    isRecurring: Joi.boolean().optional(),
    recurrence: Joi.when('isRecurring', {
      is: true,
      then: Joi.object({
        frequency: Joi.string().valid('daily', 'weekly', 'biweekly', 'monthly').required(),
        until:     Joi.date().iso().optional(),
      }),
    }),
    settings: Joi.object({
      waitingRoom:      Joi.boolean(),
      muteOnEntry:      Joi.boolean(),
      recordingEnabled: Joi.boolean(),
      chatEnabled:      Joi.boolean(),
      password:         Joi.string().max(50).allow(''),
    }).optional(),
  }),
};

const updateMeeting = {
  params: Joi.object({ id: mongoId.required() }),
  body: Joi.object({
    title:       Joi.string().trim().min(3).max(120),
    description: Joi.string().max(1000).allow(''),
    scheduledAt: Joi.date().iso(),
    maxDuration: Joi.number().integer().min(5).max(480),
    agenda:      Joi.array().items(Joi.object({
      title:    Joi.string().max(200).required(),
      duration: Joi.number().min(1),
      order:    Joi.number(),
    })),
    settings: Joi.object({
      waitingRoom:      Joi.boolean(),
      muteOnEntry:      Joi.boolean(),
      recordingEnabled: Joi.boolean(),
      chatEnabled:      Joi.boolean(),
    }),
  }).min(1),
};

const getMeeting = {
  params: Joi.object({ id: mongoId.required() }),
};

const listMeetings = {
  query: Joi.object({
    page:   Joi.number().integer().min(1).default(1),
    limit:  Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid(...Object.values(MEETING_STATUS)).optional(),
    search: Joi.string().max(100).allow('').optional(),
  }),
};

const inviteParticipants = {
  params: Joi.object({ id: mongoId.required() }),
  body: Joi.object({
    userIds: Joi.array().items(mongoId).min(1).max(50).required(),
  }),
};

const respondToInvite = {
  params: Joi.object({ id: mongoId.required() }),
  body: Joi.object({
    status: Joi.string().valid('accepted', 'declined').required(),
  }),
};

const upsertNote = {
  params: Joi.object({ id: mongoId.required() }),
  body: Joi.object({
    content:     Joi.string().max(50000).allow(''),
    agenda:      Joi.array().items(Joi.object({
      title:       Joi.string().max(200).required(),
      description: Joi.string().max(500).allow(''),
      duration:    Joi.number().min(0),
      isDone:      Joi.boolean(),
      order:       Joi.number(),
    })),
    actionItems: Joi.array().items(Joi.object({
      text:    Joi.string().max(300).required(),
      dueDate: Joi.date().iso().optional(),
    })),
    isPrivate:  Joi.boolean(),
    sharedWith: Joi.array().items(mongoId),
  }),
};

module.exports = {
  createMeeting, updateMeeting, getMeeting,
  listMeetings, inviteParticipants, respondToInvite, upsertNote,
};
