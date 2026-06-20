const Message = require('../models/Message.model');

exports.getMessages = async (req, res) => {
  const messages = await Message.find({ meeting: req.params.meetingId }).populate('sender', 'name avatar');
  res.json(messages);
};

exports.sendMessage = async (req, res) => {
  const message = await Message.create({ meeting: req.params.meetingId, sender: req.user.id, content: req.body.content });
  res.status(201).json(await message.populate('sender', 'name avatar'));
};

exports.deleteMessage = async (req, res) => {
  await Message.findByIdAndDelete(req.params.messageId);
  res.json({ message: 'Message deleted' });
};
