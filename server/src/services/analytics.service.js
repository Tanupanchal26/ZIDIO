const Meeting = require('../models/Meeting.model');
const Task = require('../models/Task.model');
const User = require('../models/User.model');
const mongoose = require('mongoose');

exports.getDashboardMetrics = async (tenantId, userId) => {
  // Aggregate tasks for the user
  const taskData = await Task.aggregate([
    { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), assignedTo: new mongoose.Types.ObjectId(userId) } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  
  const totalTasks = taskData.reduce((acc, curr) => acc + curr.count, 0);
  const doneTasks = taskData.find(t => t._id === 'done')?.count || 0;

  // Recent meetings
  const recentMeetings = await Meeting.find({ 
    tenantId, 
    participants: userId,
    status: { $in: ['ended', 'live'] }
  })
  .sort({ startedAt: -1 })
  .limit(5)
  .lean();

  // Upcoming meetings
  const upcomingMeetings = await Meeting.find({
    tenantId,
    participants: userId,
    status: 'scheduled',
    scheduledAt: { $gte: new Date() }
  })
  .sort({ scheduledAt: 1 })
  .limit(4)
  .lean();

  // Meetings this month
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const meetingsThisMonth = await Meeting.countDocuments({
    tenantId,
    participants: userId,
    startedAt: { $gte: startOfMonth }
  });

  return {
    metrics: {
      meetingsThisMonth,
      hoursSaved: Math.round(meetingsThisMonth * 0.5), // Approximation
      tasksCompleted: doneTasks,
      teamMembersOnline: await User.countDocuments({ tenantId, status: 'active' }), // Approximation of online
    },
    recentMeetings,
    upcomingMeetings,
    taskData,
  };
};

exports.getAnalytics = async (tenantId, userId) => {
  // Task completion pie chart data
  const taskStats = await Task.aggregate([
    { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), assignedTo: new mongoose.Types.ObjectId(userId) } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  const formatTaskStats = [
    { name: 'Done', value: taskStats.find(t => t._id === 'done')?.count || 0, color: '#10B981' },
    { name: 'In Progress', value: taskStats.find(t => t._id === 'in-progress')?.count || 0, color: '#AFA9B4' },
    { name: 'To Do', value: taskStats.find(t => t._id === 'todo')?.count || 0, color: '#AAAFAF' },
  ];

  // Weekly dummy/aggregated data (In a real app, group by day over the last 7 days)
  // For the sake of the exercise, creating a dynamic array for the last 7 days
  const weekly = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    weekly.push({
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      meetings: Math.floor(Math.random() * 5) + 1,
      tasks: Math.floor(Math.random() * 10) + 2
    });
  }

  // Productivity
  const productivity = [
    { week: 'W1', score: 72 }, { week: 'W2', score: 78 }, { week: 'W3', score: 83 },
    { week: 'W4', score: 80 }, { week: 'W5', score: 87 }, { week: 'W6', score: 91 },
  ];

  // Engagement
  const engagement = [
    { label: 'Avg Meeting Duration', value: '47 min', trend: '+5 min', up: true },
    { label: 'Participation Rate', value: '94%', trend: '+2%', up: true },
    { label: 'AI Summary Usage', value: '78%', trend: '+12%', up: true },
    { label: 'Action Item Completion', value: '61%', trend: '-4%', up: false },
  ];

  return {
    weekly,
    taskData: formatTaskStats,
    productivity,
    engagement,
  };
};
