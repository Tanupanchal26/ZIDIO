const recordingService = require('../services/recording.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

exports.uploadRecording = asyncHandler(async (req, res) => {
  const { meetingId } = req.body;
  if (!req.file) throw new ApiError(400, 'No video file provided');
  
  const recording = await recordingService.uploadRecording(
    meetingId,
    req.tenantId,
    req.user._id,
    req.file.buffer,
    req.file.size
  );
  
  res.status(201).json({ success: true, data: recording });
});

exports.startRecording = asyncHandler(async (req, res) => {
  const { meetingId } = req.body;
  const recording = await recordingService.startRecording(meetingId, req.tenantId, req.user._id);
  res.status(201).json({ success: true, data: recording });
});

exports.stopRecording = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const recording = await recordingService.stopRecording(id, req.tenantId);
  res.status(200).json({ success: true, data: recording });
});

exports.listRecordings = asyncHandler(async (req, res) => {
  const recordings = await recordingService.getRecordings(req.tenantId, req.user._id);
  res.status(200).json({ success: true, data: recordings });
});

exports.getRecording = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const recording = await recordingService.getRecording(id, req.tenantId, req.user._id);
  res.status(200).json({ success: true, data: recording });
});

exports.deleteRecording = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await recordingService.deleteRecording(id, req.tenantId, req.user._id);
  res.status(200).json({ success: true, data: {} });
});
