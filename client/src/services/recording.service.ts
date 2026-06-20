import api from './api';

export const recordingService = {
  startRecording: (meetingId: string) => api.post('/recordings/start', { meetingId }),
  stopRecording: (recordingId: string) => api.post(`/recordings/${recordingId}/stop`),
  getRecordings: () => api.get('/recordings'),
  getRecording: (id: string) => api.get(`/recordings/${id}`),
  deleteRecording: (id: string) => api.delete(`/recordings/${id}`),
};
