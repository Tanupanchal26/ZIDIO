const notifService = require('../services/notification.service');
const ApiResponse   = require('../utils/ApiResponse');
const asyncHandler  = require('../utils/asyncHandler');

exports.getNotifications = asyncHandler(async (req, res) => {
  const result = await notifService.getUserNotifications(req.user._id, req.query);
  ApiResponse.paginated(res, result.data, result);
});

exports.markRead = asyncHandler(async (req, res) => {
  const notif = await notifService.markRead(req.params.id, req.user._id);
  ApiResponse.ok(res, notif, 'Marked as read');
});

exports.markAllRead = asyncHandler(async (req, res) => {
  await notifService.markAllRead(req.user._id);
  ApiResponse.ok(res, null, 'All notifications marked as read');
});

exports.deleteNotification = asyncHandler(async (req, res) => {
  const notifRepo = require('../repositories/notification.repository');
  await notifRepo.Model.findOneAndDelete({ _id: req.params.id, recipient: req.user._id });
  ApiResponse.noContent(res);
});
