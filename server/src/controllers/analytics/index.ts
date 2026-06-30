// @ts-nocheck
const { getDashboardMetrics, getAnalytics } = require('../../services/analytics.service');
const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse  = require('../../utils/ApiResponse');

exports.getDashboard = asyncHandler(async (req, res) => {
  const data = await getDashboardMetrics(req.tenantId, req.user._id);
  ApiResponse.ok(res, data, 'Dashboard metrics retrieved');
});

exports.getAnalyticsData = asyncHandler(async (req, res) => {
  const data = await getAnalytics(req.tenantId, req.user._id);
  ApiResponse.ok(res, data, 'Analytics retrieved');
});

export {};
