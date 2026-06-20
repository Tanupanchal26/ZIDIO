// @ts-nocheck
const BaseRepository = require('./base.repository');
const Meeting = require('../models/Meeting');
const ApiError = require('../utils/ApiError');
const { MEETING_STATUS } = require('../constants');

class MeetingRepository extends BaseRepository {
  constructor() { super(Meeting); }

  findByRoomId(roomId) {
    return Meeting.findOne({ roomId });
  }

  findUpcoming(tenantId, userId, limit = 5) {
    return Meeting.find({
      tenantId,
      status: MEETING_STATUS.SCHEDULED,
      scheduledAt: { $gte: new Date() },
      $or: [{ host: userId }, { participants: userId }, { 'invitees.user': userId }],
    })
      .populate('host', 'name avatar')
      .sort({ scheduledAt: 1 })
      .limit(limit);
  }

  findActive(tenantId) {
    return Meeting.find({ tenantId, status: MEETING_STATUS.ACTIVE })
      .populate('host participants', 'name avatar')
      .sort({ startedAt: -1 });
  }

  async addParticipant(meetingId, tenantId, userId) {
    return Meeting.findOneAndUpdate(
      { _id: meetingId, tenantId },
      { $addToSet: { participants: userId } },
      { new: true }
    );
  }

  async removeParticipant(meetingId, tenantId, userId) {
    return Meeting.findOneAndUpdate(
      { _id: meetingId, tenantId },
      { $pull: { participants: userId } },
      { new: true }
    );
  }

  async addInvitee(meetingId, tenantId, invitee) {
    return Meeting.findOneAndUpdate(
      { _id: meetingId, tenantId },
      { $addToSet: { invitees: invitee } },
      { new: true }
    );
  }

  async updateInviteeStatus(meetingId, userId, status) {
    return Meeting.findOneAndUpdate(
      { _id: meetingId, 'invitees.user': userId },
      { $set: { 'invitees.$.status': status } },
      { new: true }
    );
  }

  async startMeeting(meetingId, tenantId) {
    return Meeting.findOneAndUpdate(
      { _id: meetingId, tenantId, status: MEETING_STATUS.SCHEDULED },
      { $set: { status: MEETING_STATUS.ACTIVE, startedAt: new Date() } },
      { new: true }
    );
  }

  async endMeeting(meetingId, tenantId) {
    const now = new Date();
    const meeting = await Meeting.findOneAndUpdate(
      { _id: meetingId, tenantId, status: MEETING_STATUS.ACTIVE },
      {
        $set: {
          status: MEETING_STATUS.ENDED,
          endedAt: now,
        },
      },
      { new: true }
    );
    if (!meeting) throw ApiError.notFound('Active meeting not found');
    // Compute duration in minutes
    if (meeting.startedAt) {
      meeting.duration = Math.round((now - meeting.startedAt) / 60000);
      await meeting.save();
    }
    return meeting;
  }

  listPaginated(tenantId, filter, options) {
    return this.findAll(tenantId, filter, {
      ...options,
      populate: [
        { path: 'host', select: 'name avatar' },
        { path: 'participants', select: 'name avatar' },
      ],
    });
  }
}

module.exports = new MeetingRepository();

export {};
