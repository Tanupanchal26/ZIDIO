const Task = require('../models/Task.model');

exports.getTasks = async (req, res) => {
  const query = req.query.meetingId ? { meeting: req.query.meetingId } : { createdBy: req.user.id };
  const tasks = await Task.find(query).populate('assignedTo', 'name email');
  res.json(tasks);
};

exports.createTask = async (req, res) => {
  const task = await Task.create({ ...req.body, createdBy: req.user.id });
  res.status(201).json(task);
};

exports.updateTask = async (req, res) => {
  const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(task);
};

exports.deleteTask = async (req, res) => {
  await Task.findByIdAndDelete(req.params.id);
  res.json({ message: 'Task deleted' });
};
