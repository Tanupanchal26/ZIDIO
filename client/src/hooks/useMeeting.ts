import { useEffect } from 'react';
import { useMeetingStore } from '../store/meeting/meeting.store';
import { useAIStore } from '../store/ai/ai.store';
import { useSocket } from './useSocket';
import { meetingService } from '../api/meeting.api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../constants';

export const useMeeting = (roomId?: string) => {
  const { socket } = useSocket();
  const navigate = useNavigate();
  const { addParticipant, removeParticipant, setInCall, resetMeeting } = useMeetingStore();
  const { appendTranscript } = useAIStore();

  useEffect(() => {
    if (!socket || !roomId) return;
    socket.emit('meeting:join', roomId);
    socket.on('meeting:user-joined', (data: any) => addParticipant(data));
    socket.on('meeting:user-left', ({ socketId }: any) => removeParticipant(socketId));
    socket.on('ai:transcript', (chunk: string) => appendTranscript(chunk));
    setInCall(true);
    return () => {
      socket.off('meeting:user-joined');
      socket.off('meeting:user-left');
      socket.off('ai:transcript');
    };
  }, [socket, roomId, addParticipant, removeParticipant, setInCall, appendTranscript]);

  const leaveMeeting = async (meetingId?: string) => {
    socket?.emit('meeting:leave', roomId);
    if (meetingId) await meetingService.end(meetingId).catch(() => { });
    resetMeeting();
    toast('You left the meeting');
    navigate(ROUTES.LOBBY);
  };

  return { leaveMeeting };
};
