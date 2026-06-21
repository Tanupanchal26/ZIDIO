// @ts-nocheck
const mongoose = require('mongoose');
const { MEETING_STATUS } = require('../constants');

const inviteeSchema = new mongoose.Schema({
  user:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  email:  { type: String, default: '' },  // for external invites
  status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
}, { _id: false });

const meetingSchema = new mongoose.Schema({
  tenantId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  team:         { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  title:        { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
  description:  { type: String, default: '', maxlength: 1000 },
  host:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  invitees:     { type: [inviteeSchema], default: [] },

  roomId:       { type: String, required: true, unique: true },
  status:       { type: String, enum: Object.values(MEETING_STATUS), default: MEETING_STATUS.SCHEDULED },

  scheduledAt:  { type: Date, default: null },
  startedAt:    { type: Date, default: null },
  endedAt:      { type: Date, default: null },
  duration:     { type: Number, default: 0 },   // minutes (computed on end)
  maxDuration:  { type: Number, default: 60 },  // hard limit in minutes

  // Agenda (denormalised for quick display; full notes in MeetingNote)
  agenda: [{
    title:    { type: String, maxlength: 200 },
    duration: { type: Number, default: 5 },
    order:    { type: Number, default: 0 },
  }],

  // Recurring
  isRecurring:   { type: Boolean, default: false },
  recurrence: {
    frequency: { type: String, enum: ['daily', 'weekly', 'biweekly', 'monthly'], default: 'weekly' },
    until:     { type: Date, default: null },
  },

  // Settings
  settings: {
    waitingRoom:      { type: Boolean, default: false },
    muteOnEntry:      { type: Boolean, default: false },
    recordingEnabled: { type: Boolean, default: false },
    chatEnabled:      { type: Boolean, default: true },
    password:         { type: String, default: '', select: false },
  },

  recordingUrl:  { type: String, default: '' },
  transcript:    { type: String, default: '' },
  summary:       { type: String, default: '' },
  actionItems:   [{ text: String, assignee: String, dueDate: Date }],
  sentiment:     { type: String, default: '' },
}, { timestamps: true });

meetingSchema.index({ tenantId: 1, status: 1 });
meetingSchema.index({ tenantId: 1, scheduledAt: 1 });
meetingSchema.index({ tenantId: 1, host: 1 });
meetingSchema.index({ tenantId: 1, createdAt: -1 });

module.exports = mongoose.model('Meeting', meetingSchema);

export {};
