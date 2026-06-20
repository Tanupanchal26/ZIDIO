const Task        = require('../models/Task.model');
const ApiResponse = require('../utils/ApiResponse');
const ApiError    = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { TASK_STATUS, TASK_PRIORITY } = require('../constants');

const ALLOWED_CREATE = ['title', 'description', 'status', 'priority', 'dueDate', 'tags', 'assignedTo', 'meeting'];
const ALLOWED_UPDATE = ['title', 'description', 'status', 'priority', 'dueDate', 'tags', 'assignedTo'];

exports.getTasks = asyncHandler(async (req, res) => {
  const filter = { tenantId: req.tenantId };
  if (req.query.meetingId) filter.meeting = req.query.meetingId;
  else filter.createdBy = req.user._id;

  const tasks = await Task.find(filter)
    .populate('assignedTo', 'name email')
    .lean();
  ApiResponse.ok(res, tasks);
});

exports.createTask = asyncHandler(async (req, res) => {
  const data = { tenantId: req.tenantId, createdBy: req.user._id };
  for (const field of ALLOWED_CREATE) {
    if (req.body[field] !== undefined) data[field] = req.body[field];
  }
  const task = await Task.create(data);
  ApiResponse.created(res, task, 'Task created');
});

exports.updateTask = asyncHandler(async (req, res) => {
  const updates = {};
  for (const field of ALLOWED_UPDATE) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }
  if (!Object.keys(updates).length) throw ApiError.badRequest('No valid fields to update');

  const task = await Task.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId },
    updates,
    { new: true, runValidators: true }
  ).lean();
  if (!task) throw ApiError.notFound('Task not found');
  ApiResponse.ok(res, task, 'Task updated');
});

exports.deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findOneAndDelete({
    _id: req.params.id,
    tenantId: req.tenantId,
    createdBy: req.user._id,
  });
  if (!task) throw ApiError.notFound('Task not found or not authorised');
  ApiResponse.noContent(res);
});
