import { useEffect, useRef, useState } from 'react';
import { useMeetingStore } from '../store/meeting.store';

interface WebRTCConfig { roomId: string; userId: string; }

export const useWebRTC = ({ roomId, userId }: WebRTCConfig) => {
  const localStreamRef = useRef<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const { isVideoOff, isMuted } = useMeetingStore();

  // Initial Audio Setup
  useEffect(() => {
    const initAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getAudioTracks().forEach(t => { t.enabled = !isMuted; });
        localStreamRef.current = stream;
        setLocalStream(new MediaStream(stream.getTracks()));
      } catch (err) {
        console.error("Failed to get audio stream", err);
      }
    };
    initAudio();

    return () => {
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      peersRef.current.forEach(pc => pc.close());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle Video Toggle (Hardware level)
  useEffect(() => {
    if (isVideoOff) {
      // Turn off hardware camera completely
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach(t => {
          t.stop();
          localStreamRef.current?.removeTrack(t);
        });
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      }
    } else {
      // Turn on hardware camera
      const hasVideo = localStreamRef.current?.getVideoTracks().length;
      if (!hasVideo) {
        navigator.mediaDevices.getUserMedia({ video: true }).then(vStream => {
          if (!localStreamRef.current) return;
          const vTrack = vStream.getVideoTracks()[0];
          localStreamRef.current.addTrack(vTrack);
          setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        }).catch(err => console.error("Failed to turn on camera:", err));
      }
    }
  }, [isVideoOff]);

  // Handle Audio Toggle
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !isMuted; });
    }
  }, [isMuted]);

  return { localStreamRef, localStream, peersRef };
};
