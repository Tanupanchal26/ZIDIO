const meetingService = require('../services/meeting.service');
const ApiResponse    = require('../utils/ApiResponse');
const asyncHandler   = require('../utils/asyncHandler');

exports.createMeeting = asyncHandler(async (req, res) => {
  const meeting = await meetingService.createMeeting(req.tenantId, req.user._id, req.body);
  ApiResponse.created(res, meeting, 'Meeting created');
});

exports.listMeetings = asyncHandler(async (req, res) => {
  const result = await meetingService.listMeetings(req.tenantId, req.user._id, req.query);
  ApiResponse.paginated(res, result.data, result);
});

exports.getMeeting = asyncHandler(async (req, res) => {
  const meeting = await meetingService.getMeeting(req.params.id, req.tenantId, req.user._id);
  ApiResponse.ok(res, meeting);
});

exports.updateMeeting = asyncHandler(async (req, res) => {
  const meeting = await meetingService.updateMeeting(req.params.id, req.tenantId, req.user._id, req.body, req.user.role);
  ApiResponse.ok(res, meeting, 'Meeting updated');
});

exports.deleteMeeting = asyncHandler(async (req, res) => {
  await meetingService.deleteMeeting(req.params.id, req.tenantId, req.user._id, req.user.role);
  ApiResponse.noContent(res);
});

exports.inviteParticipants = asyncHandler(async (req, res) => {
  const meeting = await meetingService.inviteParticipants(req.params.id, req.tenantId, req.user._id, req.body.userIds);
  ApiResponse.ok(res, meeting, 'Participants invited');
});

exports.respondToInvite = asyncHandler(async (req, res) => {
  const meeting = await meetingService.respondToInvite(req.params.id, req.user._id, req.body.status);
  ApiResponse.ok(res, meeting, 'Response recorded');
});

exports.startMeeting = asyncHandler(async (req, res) => {
  const meeting = await meetingService.startMeeting(req.params.id, req.tenantId, req.user._id);
  ApiResponse.ok(res, meeting, 'Meeting started');
});

exports.endMeeting = asyncHandler(async (req, res) => {
  const meeting = await meetingService.endMeeting(req.params.id, req.tenantId, req.user._id, req.user.role);
  ApiResponse.ok(res, meeting, 'Meeting ended');
});

exports.getMeetingNote = asyncHandler(async (req, res) => {
  const note = await meetingService.getMeetingNote(req.params.id, req.tenantId, req.user._id);
  ApiResponse.ok(res, note);
});

exports.upsertMeetingNote = asyncHandler(async (req, res) => {
  const note = await meetingService.upsertMeetingNote(req.params.id, req.tenantId, req.user._id, req.body);
  ApiResponse.ok(res, note, 'Notes saved');
});
