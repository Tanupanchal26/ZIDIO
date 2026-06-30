import api from './axios';

export interface ActionItem {
  text: string;
  assignee: string | null;
  dueDate: string | null;
  priority: 'high' | 'medium' | 'low';
  done?: boolean;
}

export interface AIResult {
  meeting: string;
  transcript: string;
  summary: string;
  minutes: string;
  actionItems: ActionItem[];
}

export interface SearchResult {
  id: string;
  title: string;
  date: string;
  score: number;
}

export interface GeneratedTask {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimatedHours: number | null;
}

export const aiService = {
  getResult:       (meetingId: string) =>
    api.get<AIResult>(`/ai/${meetingId}`),

  generateSummary: (meetingId: string, transcript: string) =>
    api.post<{ summary: string }>(`/ai/${meetingId}/summary`, { transcript }),

  getTranscript:   (meetingId: string) =>
    api.get<{ transcript: string }>(`/ai/${meetingId}/transcript`),

  saveTranscript:  (meetingId: string, transcript: string) =>
    api.post(`/ai/${meetingId}/transcript`, { transcript }),

  getActionItems:  (meetingId: string) =>
    api.get<{ actionItems: ActionItem[] }>(`/ai/${meetingId}/action-items`),

  generateMinutes: (meetingId: string) =>
    api.post<{ minutes: string }>(`/ai/${meetingId}/minutes`),

  assistantChat:   (meetingId: string, message: string, history: { role: string; content: string }[] = []) =>
    api.post<{ reply: string }>(`/ai/${meetingId}/assistant`, { message, history }),

  generateTasks:   (meetingId: string, prompt?: string) =>
    api.post<{ tasks: GeneratedTask[] }>(`/ai/${meetingId}/tasks`, { prompt }),

  searchMeetings:  (query: string) =>
    api.get<{ results: SearchResult[] }>('/ai/search', { params: { q: query } }),

  extractAndSaveTasks: (meetingId: string) =>
    api.post<{ tasks: any[]; message: string }>(`/ai/${meetingId}/extract-tasks`),
};
