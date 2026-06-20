import { useEffect, useRef, useState } from 'react';
import { useMeetingStore } from '../store/meeting.store';

interface WebRTCConfig { roomId: string; userId: string; }

export const useWebRTC = ({ roomId, userId }: WebRTCConfig) => {
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const { isVideoOff, isMuted, setScreenSharing } = useMeetingStore();

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

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }
    setScreenSharing(false);

    // Restore camera track to local stream
    if (localStreamRef.current) {
      const cameraVideoTrack = localStreamRef.current.getVideoTracks()[0];
      
      // Update peers with camera track (or null if camera is off)
      peersRef.current.forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(cameraVideoTrack || null);
      });

      // We don't replace the local preview video track directly because localStream is already 
      // showing localStreamRef. If the camera was off, it's fine.
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
    }
  };

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = screenStream;
      const screenVideoTrack = screenStream.getVideoTracks()[0];

      // Listen for browser "Stop sharing" button
      screenVideoTrack.onended = () => stopScreenShare();

      // Replace outgoing video track for all peers
      peersRef.current.forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(screenVideoTrack);
      });

      // Temporarily show screen share in local preview (optional, but good UX)
      // We create a mixed stream to preview
      const previewStream = new MediaStream([screenVideoTrack]);
      if (localStreamRef.current) {
        const audioTrack = localStreamRef.current.getAudioTracks()[0];
        if (audioTrack) previewStream.addTrack(audioTrack);
      }
      setLocalStream(previewStream);
      setScreenSharing(true);
    } catch (err) {
      console.error("Failed to start screen share", err);
      setScreenSharing(false);
    }
  };

  return { localStreamRef, localStream, peersRef, startScreenShare, stopScreenShare };
};
