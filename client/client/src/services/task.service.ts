import api from './api';

export interface Task {
  _id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done';
  priority?: 'high' | 'medium' | 'low';
  assignedTo?: { name: string; email: string };
  dueDate?: string;
  createdAt: string;
}

export const taskService = {
  getAll: () => api.get('/tasks'),
  list:   () => api.get('/tasks'),
  create: (data: Partial<Task>) => api.post('/tasks', data),
  update: (id: string, data: Partial<Task>) => api.put(`/tasks/${id}`, data),
  delete: (id: string) => api.delete(`/tasks/${id}`),
};
