import { request } from './request';

export interface LoginPayload { email: string; password: string; }
export interface RegisterPayload { name: string; email: string; password: string; }

export const authService = {
  login: (data: LoginPayload) => request.post('/auth/login', data),
  register: (data: RegisterPayload) => request.post('/auth/signup', data),
  logout: () => request.post('/auth/logout'),
  me: () => request.get('/users/me'),
};
