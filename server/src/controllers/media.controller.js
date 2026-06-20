const mediaService = require('../services/media.service');
const asyncHandler = require('../utils/asyncHandler');

exports.upload = asyncHandler(async (req, res) => {
  const media = await mediaService.uploadMedia(req.file, req.tenantId, req.user._id);
  res.status(201).json({ success: true, data: media });
});

exports.list = asyncHandler(async (req, res) => {
  const list = await mediaService.getMediaList(req.tenantId);
  res.status(200).json({ success: true, data: list });
});

exports.delete = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await mediaService.deleteMedia(id, req.tenantId, req.user._id);
  res.status(200).json({ success: true, data: {} });
});
