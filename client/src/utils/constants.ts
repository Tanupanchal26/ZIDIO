export const API_BASE_URL = ((import.meta as any).env?.VITE_API_BASE_URL as string) || 'http://localhost:5000/api';
export const SOCKET_URL = ((import.meta as any).env?.VITE_SOCKET_URL as string) || 'http://localhost:5000';

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  LOBBY: '/lobby',
  MEETING: '/meeting/:id',
  ANALYTICS: '/analytics',
  TASKS: '/tasks',
  SETTINGS: '/settings',
  PROFILE: '/profile',
  AI_SUMMARY: '/ai-summary',
  NOT_FOUND: '*',
};

export const MEETING_ROUTE = (id: string) => `/meeting/${id}`;
