// @ts-nocheck
const { v4: uuidv4 } = require('uuid');
const meetingRepo     = require('../repositories/meeting.repository');
const meetingNoteRepo = require('../repositories/meetingNote.repository');
const notifService    = require('./notification.service');
const ApiError        = require('../utils/ApiError');
const { MEETING_STATUS, ROLES, PAGINATION } = require('../constants');

// ── RBAC guard ────────────────────────────────────────────────────────────────
const assertHost = (meeting, userId) => {
  if (meeting.host.toString() !== userId.toString()) {
    throw ApiError.forbidden('Only the meeting host can perform this action');
  }
};

// ── Create ────────────────────────────────────────────────────────────────────
const createMeeting = async (tenantId, userId, data) => {
  const { participants, ...rest } = data;
  const meeting = await meetingRepo.create({
    tenantId,
    host:   userId,
    roomId: uuidv4(),
    participants: participants?.length ? [...new Set([userId, ...participants])] : [userId],
    ...rest,
  });

  if (data.participants?.length) {
    const others = data.participants.filter(p => p.toString() !== userId.toString());
    notifService.notifyMeetingInvite(meeting, others, userId).catch(() => {});
  }

  return meetingRepo.findById(meeting._id, tenantId, [
    { path: 'host', select: 'name avatar' },
    { path: 'participants', select: 'name avatar' },
  ]);
};

// ── List ──────────────────────────────────────────────────────────────────────
const listMeetings = async (tenantId, userId, { page = 1, limit = 20, status, search } = {}) => {
  const filter = {
    $or: [{ host: userId }, { participants: userId }, { 'invitees.user': userId }],
  };
  if (status) filter.status = status;
  if (search) filter.title = { $regex: search, $options: 'i' };

  return meetingRepo.listPaginated(tenantId, filter, {
    page: parseInt(page),
    limit: Math.min(parseInt(limit), PAGINATION.MAX_LIMIT),
    sort: { scheduledAt: -1, createdAt: -1 },
  });
};

// ── Get single ────────────────────────────────────────────────────────────────
const getMeeting = async (meetingId, tenantId, userId) => {
  const meeting = await meetingRepo.findById(meetingId, tenantId, [
    { path: 'host', select: 'name email avatar' },
    { path: 'participants', select: 'name email avatar' },
    { path: 'invitees.user', select: 'name email avatar' },
  ]);
  const isMember =
    meeting.host._id.toString() === userId.toString() ||
    meeting.participants.some(p => p._id.toString() === userId.toString()) ||
    meeting.invitees.some(i => i.user?._id?.toString() === userId.toString());
  if (!isMember) throw ApiError.forbidden('You are not a participant of this meeting');
  return meeting;
};

// ── Update ────────────────────────────────────────────────────────────────────
const updateMeeting = async (meetingId, tenantId, userId, data, userRole) => {
  const meeting = await meetingRepo.findById(meetingId, tenantId);
  const isAdminOrAbove = [ROLES.ADMIN].includes(userRole);
  if (meeting.host.toString() !== userId.toString() && !isAdminOrAbove) {
    throw ApiError.forbidden('Only the host or an admin can edit this meeting');
  }
  if (meeting.status === MEETING_STATUS.ENDED) throw ApiError.badRequest('Cannot edit an ended meeting');
  return meetingRepo.updateById(meetingId, tenantId, data);
};

// ── Delete ────────────────────────────────────────────────────────────────────
const deleteMeeting = async (meetingId, tenantId, userId, userRole) => {
  const meeting = await meetingRepo.findById(meetingId, tenantId);
  const isAdmin = [ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(userRole);
  if (meeting.host.toString() !== userId.toString() && !isAdmin) {
    throw ApiError.forbidden('Only the host or admin can delete this meeting');
  }
  return meetingRepo.deleteById(meetingId, tenantId);
};

// ── Invite ────────────────────────────────────────────────────────────────────
const inviteParticipants = async (meetingId, tenantId, actorId, userIds) => {
  const meeting = await meetingRepo.findById(meetingId, tenantId);
  assertHost(meeting, actorId);
  for (const uid of userIds) {
    await meetingRepo.addInvitee(meetingId, tenantId, { user: uid, status: 'pending' });
    await meetingRepo.addParticipant(meetingId, tenantId, uid);
  }
  notifService.notifyMeetingInvite(meeting, userIds, actorId).catch(() => {});
  return meetingRepo.findById(meetingId, tenantId);
};

// ── RSVP ──────────────────────────────────────────────────────────────────────
const respondToInvite = async (meetingId, userId, status) => {
  if (!['accepted', 'declined'].includes(status)) throw ApiError.badRequest('Invalid status');
  return meetingRepo.updateInviteeStatus(meetingId, userId, status);
};

// ── Start / End ───────────────────────────────────────────────────────────────
const startMeeting = async (meetingId, tenantId, userId) => {
  const meeting = await meetingRepo.findById(meetingId, tenantId);
  assertHost(meeting, userId);
  const started = await meetingRepo.startMeeting(meetingId, tenantId);
  notifService.notifyMeetingStarted(
    meeting,
    meeting.participants.map(p => p.toString()).filter(p => p !== userId.toString())
  ).catch(() => {});
  return started;
};

const endMeeting = async (meetingId, tenantId, userId, userRole) => {
  const meeting = await meetingRepo.findById(meetingId, tenantId);
  const isAdmin = [ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(userRole);
  if (meeting.host.toString() !== userId.toString() && !isAdmin) {
    throw ApiError.forbidden('Only the host can end this meeting');
  }
  return meetingRepo.endMeeting(meetingId, tenantId);
};

// ── Meeting Notes ─────────────────────────────────────────────────────────────
const getMeetingNote = async (meetingId, tenantId, userId) => {
  await getMeeting(meetingId, tenantId, userId); // access check
  return meetingNoteRepo.findByMeeting(meetingId);
};

const upsertMeetingNote = async (meetingId, tenantId, userId, data) => {
  await getMeeting(meetingId, tenantId, userId); // access check
  return meetingNoteRepo.upsert(meetingId, tenantId, userId, data);
};

// ── Join by room code ─────────────────────────────────────────────────────────
const joinByRoomId = async (roomId, tenantId, userId) => {
  const Meeting = require('../models/Meeting');
  const meeting = await Meeting.findOne({ roomId, tenantId });
  if (!meeting) throw ApiError.notFound('Meeting not found. Check the room code.');
  if (meeting.status === MEETING_STATUS.ENDED) throw ApiError.badRequest('This meeting has already ended.');

  // Add user to participants if not already
  const isAlreadyParticipant = meeting.participants.some(
    p => p.toString() === userId.toString()
  );
  if (!isAlreadyParticipant) {
    meeting.participants.push(userId);
    await meeting.save();
  }

  return Meeting.findById(meeting._id)
    .populate('host', 'name email avatar')
    .populate('participants', 'name email avatar');
};

module.exports = {
  createMeeting, listMeetings, getMeeting,
  updateMeeting, deleteMeeting,
  inviteParticipants, respondToInvite,
  startMeeting, endMeeting,
  getMeetingNote, upsertMeetingNote,
  joinByRoomId,
};

export {};
