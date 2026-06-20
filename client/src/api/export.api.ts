import { API_BASE_URL } from '../constants';

export const exportService = {
  downloadSummaryPDF: (meetingId: string, token: string) => {
    window.open(`${API_BASE_URL}/export/summary/${meetingId}?token=${token}`, '_blank');
  },
  downloadActionItemsCSV: (meetingId: string, token: string) => {
    window.open(`${API_BASE_URL}/export/action-items/${meetingId}?token=${token}`, '_blank');
  },
  downloadAnalyticsCSV: (token: string) => {
    window.open(`${API_BASE_URL}/export/analytics?token=${token}`, '_blank');
  }
};
