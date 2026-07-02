import type { NextFunction, Request, Response } from 'express';

const meetingService = require('../../services/meeting.service') as {
  createMeeting: (...args: unknown[]) => Promise<unknown>;
  listMeetings: (...args: unknown[]) => Promise<{ data: unknown; page: number; limit: number; total: number }>;
  getMeeting: (...args: unknown[]) => Promise<unknown>;
  updateMeeting: (...args: unknown[]) => Promise<unknown>;
  deleteMeeting: (...args: unknown[]) => Promise<void>;
  inviteParticipants: (...args: unknown[]) => Promise<unknown>;
  respondToInvite: (...args: unknown[]) => Promise<unknown>;
  startMeeting: (...args: unknown[]) => Promise<unknown>;
  endMeeting: (...args: unknown[]) => Promise<unknown>;
  getMeetingNote: (...args: unknown[]) => Promise<unknown>;
  upsertMeetingNote: (...args: unknown[]) => Promise<unknown>;
  joinByRoomId: (...args: unknown[]) => Promise<unknown>;
};
const ApiResponse = require('../../utils/ApiResponse').default;
const asyncHandler = require('../../utils/asyncHandler').default as (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => void;

exports.createMeeting = asyncHandler(async (req: Request, res: Response) => {
  const meeting = await meetingService.createMeeting(req.tenantId, req.user?._id, req.body);
  ApiResponse.created(res, meeting, 'Meeting created');
});

exports.listMeetings = asyncHandler(async (req: Request, res: Response) => {
  const result = await meetingService.listMeetings(req.tenantId, req.user?._id, req.query);
  ApiResponse.paginated(res, result.data, result);
});

exports.getMeeting = asyncHandler(async (req: Request, res: Response) => {
  const meeting = await meetingService.getMeeting(req.params.id, req.tenantId, req.user?._id);
  ApiResponse.ok(res, meeting);
});

exports.updateMeeting = asyncHandler(async (req: Request, res: Response) => {
  const meeting = await meetingService.updateMeeting(req.params.id, req.tenantId, req.user?._id, req.body, req.user?.role);
  ApiResponse.ok(res, meeting, 'Meeting updated');
});

exports.deleteMeeting = asyncHandler(async (req: Request, res: Response) => {
  await meetingService.deleteMeeting(req.params.id, req.tenantId, req.user?._id, req.user?.role);
  ApiResponse.noContent(res);
});

exports.inviteParticipants = asyncHandler(async (req: Request, res: Response) => {
  const meeting = await meetingService.inviteParticipants(req.params.id, req.tenantId, req.user?._id, (req.body as { userIds?: unknown[] }).userIds);
  ApiResponse.ok(res, meeting, 'Participants invited');
});

exports.respondToInvite = asyncHandler(async (req: Request, res: Response) => {
  const meeting = await meetingService.respondToInvite(req.params.id, req.user?._id, (req.body as { status?: string }).status);
  ApiResponse.ok(res, meeting, 'Response recorded');
});

exports.startMeeting = asyncHandler(async (req: Request, res: Response) => {
  const meeting = await meetingService.startMeeting(req.params.id, req.tenantId, req.user?._id);
  ApiResponse.ok(res, meeting, 'Meeting started');
});

exports.endMeeting = asyncHandler(async (req: Request, res: Response) => {
  const meeting = await meetingService.endMeeting(req.params.id, req.tenantId, req.user?._id, req.user?.role);
  ApiResponse.ok(res, meeting, 'Meeting ended');
});

exports.getMeetingNote = asyncHandler(async (req: Request, res: Response) => {
  const note = await meetingService.getMeetingNote(req.params.id, req.tenantId, req.user?._id);
  ApiResponse.ok(res, note);
});

exports.upsertMeetingNote = asyncHandler(async (req: Request, res: Response) => {
  const note = await meetingService.upsertMeetingNote(req.params.id, req.tenantId, req.user?._id, req.body);
  ApiResponse.ok(res, note, 'Notes saved');
});

exports.joinMeeting = asyncHandler(async (req: Request, res: Response) => {
  const meeting = await meetingService.joinByRoomId((req.body as { roomId?: string }).roomId, req.tenantId, req.user?._id);
  ApiResponse.ok(res, meeting, 'Joined meeting');
});

export {};
