const Recording = require('../models/Recording.model');
const Meeting = require('../models/Meeting.model');
const ApiError = require('../utils/ApiError');
const cloudinary = require('../config/cloudinary');
const { Readable } = require('stream');

exports.uploadRecording = async (meetingId, tenantId, ownerId, buffer, sizeBytes) => {
  const meeting = await Meeting.findOne({ _id: meetingId, tenantId });
  if (!meeting) throw ApiError.notFound('Meeting not found');

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: 'video', folder: `intellmeet/recordings/${tenantId}` },
      async (error, result) => {
        if (error) return reject(new ApiError(500, 'Cloudinary upload failed'));

        const recording = await Recording.create({
          tenantId,
          meetingId,
          ownerId,
          url: result.secure_url,
          status: 'ready',
          duration: Math.round(result.duration || 0),
          sizeBytes: sizeBytes || result.bytes
        });

        resolve(recording);
      }
    );

    const readable = new Readable();
    readable._read = () => {};
    readable.push(buffer);
    readable.push(null);
    readable.pipe(stream);
  });
};

// In a real application, upload logic would use AWS S3 or similar.
// For this local architecture, we'll assume files are saved to local disk or a dummy URL.
exports.startRecording = async (meetingId, tenantId, ownerId) => {
  const meeting = await Meeting.findOne({ _id: meetingId, tenantId });
  if (!meeting) throw ApiError.notFound('Meeting not found');

  // Logic to actually trigger a headless browser or server-side recorder goes here
  // For now, we mock the creation of a recording metadata entry.
  const recording = await Recording.create({
    tenantId,
    meetingId,
    ownerId,
    url: `http://localhost:5000/uploads/recording-${meetingId}.webm`, // Mock URL
    status: 'processing'
  });

  return recording;
};

exports.stopRecording = async (recordingId, tenantId) => {
  const recording = await Recording.findOne({ _id: recordingId, tenantId });
  if (!recording) throw ApiError.notFound('Recording not found');

  // Mock processing finished
  recording.status = 'ready';
  recording.duration = 3600; // Mock 1 hour
  recording.sizeBytes = 10485760; // Mock 10 MB
  await recording.save();

  return recording;
};

exports.getRecordings = async (tenantId, ownerId) => {
  return Recording.find({ tenantId, ownerId }).sort({ createdAt: -1 }).populate('meetingId', 'title');
};
