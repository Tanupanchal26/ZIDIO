import { useEffect, useRef, useCallback } from 'react';
import { useMeetingStore } from '../store/meeting.store';

interface WebRTCConfig { roomId: string; userId: string; }

export const useWebRTC = ({ roomId, userId }: WebRTCConfig) => {
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef       = useRef<Map<string, RTCPeerConnection>>(new Map());

  // Read store values via refs so effects see current values without re-running
  const isMutedRef    = useRef(useMeetingStore.getState().isMuted);
  const isVideoOffRef = useRef(useMeetingStore.getState().isVideoOff);

  // Keep refs in sync with store
  useEffect(() => {
    return useMeetingStore.subscribe((state) => {
      isMutedRef.current    = state.isMuted;
      isVideoOffRef.current = state.isVideoOff;
    });
  }, []);

  const applyTrackStates = useCallback((stream: MediaStream) => {
    stream.getAudioTracks().forEach((t) => { t.enabled = !isMutedRef.current; });
    stream.getVideoTracks().forEach((t) => { t.enabled = !isVideoOffRef.current; });
  }, []);

  const getLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      applyTrackStates(stream);
      return stream;
    } catch {
      return null;
    }
  }, [applyTrackStates]);

  // Acquire stream once on mount; release on unmount
  useEffect(() => {
    getLocalStream();
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      peersRef.current.forEach((pc) => pc.close());
      peersRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync audio tracks when isMuted changes
  const { isMuted } = useMeetingStore();
  useEffect(() => {
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !isMuted; });
  }, [isMuted]);

  // Sync video tracks when isVideoOff changes
  const { isVideoOff } = useMeetingStore();
  useEffect(() => {
    localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = !isVideoOff; });
  }, [isVideoOff]);

  return { localStreamRef, peersRef, getLocalStream };
};
