import { API_BASE_URL } from '../utils/constants';

export const exportService = {
  downloadPDF: (meetingId: string, token: string) => {
    // Open in new tab so browser handles download natively.
    // In a real app with JWT interceptors, you might fetch a blob instead.
    window.open(`${API_BASE_URL}/export/${meetingId}/pdf?token=${token}`, '_blank');
  },
  downloadCSV: (meetingId: string, token: string) => {
    window.open(`${API_BASE_URL}/export/${meetingId}/csv?token=${token}`, '_blank');
  }
};
