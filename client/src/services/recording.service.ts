import api from './api';

export const recordingService = {
  startRecording: (meetingId: string) => api.post('/recordings/start', { meetingId }),
  stopRecording: (recordingId: string) => api.post(`/recordings/${recordingId}/stop`),
  listRecordings: () => api.get('/recordings'),
};
