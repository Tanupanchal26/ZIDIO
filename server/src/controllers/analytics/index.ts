// @ts-nocheck
const { getDashboardMetrics, getAnalytics } = require('../../services/analytics.service');
const asyncHandler = require('../../utils/asyncHandler');
const ApiError = require('../../utils/ApiError');

exports.getDashboard = asyncHandler(async (req, res) => {
  const data = await getDashboardMetrics(req.tenantId, req.user._id);
  res.status(200).json({ success: true, data });
});

exports.getAnalyticsData = asyncHandler(async (req, res) => {
  const data = await getAnalytics(req.tenantId, req.user._id);
  res.status(200).json({ success: true, data });
});

export {};
