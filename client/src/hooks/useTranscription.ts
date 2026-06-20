import { useEffect, useRef } from 'react';
import { useMeetingStore } from '../store/meeting/meeting.store';
import { useAIStore } from '../store/ai/ai.store';
import { useAuthStore } from '../store/auth/auth.store';
import { getSocket } from '../utils/socket';

export const useTranscription = (meetingId: string) => {
  const { isMuted } = useMeetingStore();
  const { setTranscribing, appendTranscript } = useAIStore();
  const { user } = useAuthStore();
  const recognitionRef = useRef<any>(null);
  const socket = getSocket();

  // 1. Capture local speech
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition API not supported in this browser.');
      return;
    }

    if (isMuted) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        setTranscribing(false);
      }
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setTranscribing(true);
    
    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const transcript = event.results[current][0].transcript;
      
      // We do NOT append locally here because the socket will echo it back to us via meeting:transcript-chunk
      if (socket?.connected && meetingId) {
        socket.emit('meeting:transcript-chunk', { meetingId, chunk: transcript });
      }
    };

    recognition.onerror = (event: any) => console.error('Speech recognition error', event.error);
    
    recognition.onend = () => {
      // Auto restart if still unmuted
      if (!useMeetingStore.getState().isMuted) {
        try { recognition.start(); } catch (e) {}
      } else {
        setTranscribing(false);
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      console.error(e);
    }

    return () => {
      recognition.onend = null;
      try { recognition.stop(); } catch (e) {}
      setTranscribing(false);
    };
  }, [isMuted, meetingId, socket, setTranscribing]);

  // 2. Listen for network transcripts (from everyone, including ourselves)
  useEffect(() => {
    if (!socket || !meetingId) return;

    const handleChunk = ({ chunk, speaker }: { chunk: string; speaker: string }) => {
      const prefix = speaker === user?.name ? 'You' : speaker;
      appendTranscript(`${prefix}: ${chunk}`);
    };

    socket.on('meeting:transcript-chunk', handleChunk);
    return () => { socket.off('meeting:transcript-chunk', handleChunk); };
  }, [socket, meetingId, user?.name, appendTranscript]);
};
