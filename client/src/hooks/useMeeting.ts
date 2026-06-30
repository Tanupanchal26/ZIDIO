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
  const { addParticipant, removeParticipant, setInCall, resetMeeting, updateParticipant } = useMeetingStore();
  const { appendTranscript } = useAIStore();

  useEffect(() => {
    if (!socket || !roomId) return;

    const onUserJoined  = (data: any)          => addParticipant(data);
    const onUserLeft    = ({ socketId }: any)   => removeParticipant(socketId);
    const onTranscript  = (chunk: string)       => appendTranscript(chunk);
    const onMediaState  = ({ socketId, isMuted, isVideoOff }: any) =>
      updateParticipant(socketId, { isMuted, isVideoOff });
    const onRaiseHand   = ({ socketId, raised }: any) =>
      updateParticipant(socketId, { isMuted: raised }); // piggyback existing field for now

    socket.on('meeting:user-joined',  onUserJoined);
    socket.on('meeting:user-left',    onUserLeft);
    socket.on('ai:transcript',        onTranscript);
    socket.on('meeting:media-state',  onMediaState);
    socket.on('meeting:raise-hand',   onRaiseHand);
    setInCall(true);

    return () => {
      socket.off('meeting:user-joined',  onUserJoined);
      socket.off('meeting:user-left',    onUserLeft);
      socket.off('ai:transcript',        onTranscript);
      socket.off('meeting:media-state',  onMediaState);
      socket.off('meeting:raise-hand',   onRaiseHand);
    };
  }, [socket, roomId, addParticipant, removeParticipant, setInCall, appendTranscript, updateParticipant]);

  const leaveMeeting = async (meetingId?: string) => {
    socket?.emit('meeting:leave', roomId);
    if (meetingId) await meetingService.end(meetingId).catch(() => {});
    resetMeeting();
    toast('You left the meeting', { icon: '👋' });
    navigate(ROUTES.LOBBY);
  };

  return { leaveMeeting };
};
