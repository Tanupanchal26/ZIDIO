import api from './api';

export const analyticsService = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getAnalytics: () => api.get('/analytics'),
};
