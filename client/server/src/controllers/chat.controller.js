const Message     = require('../models/Message.model');
const ApiResponse = require('../utils/ApiResponse');
const ApiError    = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

exports.getMessages = asyncHandler(async (req, res) => {
  const page  = parseInt(req.query.page  ?? 1, 10);
  const limit = parseInt(req.query.limit ?? 50, 10);
  const skip  = (page - 1) * limit;

  const [data, total] = await Promise.all([
    Message.find({ meeting: req.params.meetingId })
      .sort({ createdAt: -1 })
      .skip(skip).limit(limit)
      .populate('sender', 'name avatar')
      .lean(),
    Message.countDocuments({ meeting: req.params.meetingId }),
  ]);

  ApiResponse.paginated(res, data, { page, limit, total });
});

exports.sendMessage = asyncHandler(async (req, res) => {
  const message = await Message.create({
    meeting: req.params.meetingId,
    sender:  req.user._id,
    content: req.body.content,
    type:    'text',
  });
  const populated = await message.populate('sender', 'name avatar');
  ApiResponse.created(res, populated);
});

exports.deleteMessage = asyncHandler(async (req, res) => {
  const msg = await Message.findOneAndDelete({
    _id:    req.params.messageId,
    sender: req.user._id,
  });
  if (!msg) throw ApiError.notFound('Message not found or not authorised');
  ApiResponse.noContent(res);
});
