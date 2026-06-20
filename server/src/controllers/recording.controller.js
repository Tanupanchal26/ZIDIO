const recordingService = require('../services/recording.service');
const asyncHandler = require('../utils/asyncHandler');

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
