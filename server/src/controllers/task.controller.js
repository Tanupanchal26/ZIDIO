const Task = require('../models/Task.model');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');

exports.getTasks = asyncHandler(async (req, res) => {
  const filter = { tenantId: req.tenantId };
  
  if (req.query.meetingId) {
    filter.meeting = req.query.meetingId;
  } else {
    // Show tasks assigned to or created by the user
    filter.$or = [
      { assignedTo: req.user._id },
      { createdBy: req.user._id },
    ];
  }

  if (req.query.status) filter.status = req.query.status;
  if (req.query.priority) filter.priority = req.query.priority;

  const tasks = await Task.find(filter)
    .populate('assignedTo', 'name email avatar')
    .populate('createdBy', 'name email avatar')
    .populate('meeting', 'title')
    .sort({ createdAt: -1 });
  
  ApiResponse.ok(res, tasks);
});

exports.createTask = asyncHandler(async (req, res) => {
  const task = await Task.create({
    ...req.body,
    tenantId: req.tenantId,
    createdBy: req.user._id,
  });
  const populated = await task.populate([
    { path: 'assignedTo', select: 'name email avatar' },
    { path: 'createdBy', select: 'name email avatar' },
  ]);
  ApiResponse.created(res, populated, 'Task created');
});

exports.updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId },
    req.body,
    { new: true }
  ).populate('assignedTo', 'name email avatar')
   .populate('createdBy', 'name email avatar');
  
  if (!task) {
    return res.status(404).json({ success: false, message: 'Task not found' });
  }
  ApiResponse.ok(res, task, 'Task updated');
});

exports.deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findOneAndDelete({
    _id: req.params.id,
    tenantId: req.tenantId,
  });
  if (!task) {
    return res.status(404).json({ success: false, message: 'Task not found' });
  }
  ApiResponse.ok(res, {}, 'Task deleted');
});
