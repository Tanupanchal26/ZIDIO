import { useEffect, useRef, useState, useCallback } from 'react';
import { useMeetingStore } from '../store/meeting/meeting.store';
import { getSocket } from '../utils/socket';
import toast from 'react-hot-toast';

interface WebRTCConfig { roomId: string; userId: string; }

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export const useWebRTC = ({ roomId, userId }: WebRTCConfig) => {
  const localStreamRef   = useRef<MediaStream | null>(null);
  const screenStreamRef  = useRef<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  // Track whether initial media has been acquired
  const mediaReadyRef = useRef(false);

  const { isVideoOff, isMuted, setScreenSharing } = useMeetingStore();
  const socket = getSocket();

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const broadcastMediaState = useCallback((videoOff: boolean, muted: boolean) => {
    if (socket?.connected && roomId) {
      socket.emit('meeting:media-state', { roomId, isMuted: muted, isVideoOff: videoOff, isScreenSharing: false });
    }
  }, [socket, roomId]);

  const replaceVideoTrackInPeers = useCallback((track: MediaStreamTrack | null) => {
    peersRef.current.forEach(pc => {
      const sender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (sender) {
        sender.replaceTrack(track).catch(() => {});
      } else if (track && localStreamRef.current) {
        pc.addTrack(track, localStreamRef.current);
      }
    });
  }, []);

  // ── Peer connection ───────────────────────────────────────────────────────────

  const closePeerConnection = useCallback((remoteSocketId: string) => {
    const pc = peersRef.current.get(remoteSocketId);
    if (pc) {
      pc.close();
      peersRef.current.delete(remoteSocketId);
      setRemoteStreams(prev => {
        const next = new Map(prev);
        next.delete(remoteSocketId);
        return next;
      });
    }
  }, []);

  const createPeerConnection = useCallback((remoteSocketId: string, isInitiator: boolean) => {
    if (peersRef.current.has(remoteSocketId)) return peersRef.current.get(remoteSocketId)!;

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peersRef.current.set(remoteSocketId, pc);

    // Add current local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) {
        setRemoteStreams(prev => {
          const next = new Map(prev);
          next.set(remoteSocketId, remoteStream);
          return next;
        });
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('meeting:signal', {
          roomId, to: remoteSocketId,
          signal: { type: 'candidate', candidate: event.candidate },
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        if (isInitiator) {
          pc.createOffer({ iceRestart: true })
            .then(o => pc.setLocalDescription(o))
            .then(() => socket.emit('meeting:signal', {
              roomId, to: remoteSocketId,
              signal: { type: 'offer', sdp: pc.localDescription },
            }))
            .catch(() => {});
        } else {
          setTimeout(() => {
            if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
              closePeerConnection(remoteSocketId);
            }
          }, 5000);
        }
      }
    };

    if (isInitiator) {
      pc.createOffer()
        .then(o => pc.setLocalDescription(o))
        .then(() => socket.emit('meeting:signal', {
          roomId, to: remoteSocketId,
          signal: { type: 'offer', sdp: pc.localDescription },
        }))
        .catch(() => {});
    }

    return pc;
  }, [roomId, socket, closePeerConnection]);

  // ── Initial media setup ───────────────────────────────────────────────────────

  useEffect(() => {
    let isMounted = true;
    const initMedia = async () => {
      // Step 1: try camera + mic
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        if (!isMounted) { stream.getTracks().forEach(t => t.stop()); return; }
        stream.getAudioTracks().forEach(t => { t.enabled = !isMuted; });
        stream.getVideoTracks().forEach(t => { t.enabled = true; });
        localStreamRef.current = stream;
        mediaReadyRef.current = true;
        setLocalStream(new MediaStream(stream.getTracks()));
        return;
      } catch (err: any) {
        console.warn('[WebRTC] Camera+mic failed:', err?.name, err?.message);
      }

      // Step 2: try mic only (camera may be blocked or missing)
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (!isMounted) { audioStream.getTracks().forEach(t => t.stop()); return; }
        audioStream.getAudioTracks().forEach(t => { t.enabled = !isMuted; });
        localStreamRef.current = audioStream;
        mediaReadyRef.current = true;
        setLocalStream(new MediaStream(audioStream.getTracks()));
        toast('No camera found — joined with audio only', { icon: '🎤' });
        return;
      } catch (err: any) {
        console.warn('[WebRTC] Audio-only failed:', err?.name, err?.message);
      }

      // Step 3: try camera only (mic may be blocked)
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
        if (!isMounted) { videoStream.getTracks().forEach(t => t.stop()); return; }
        localStreamRef.current = videoStream;
        mediaReadyRef.current = true;
        setLocalStream(new MediaStream(videoStream.getTracks()));
        toast('No microphone found — joined with video only', { icon: '📷' });
        return;
      } catch (err: any) {
        console.warn('[WebRTC] Video-only failed:', err?.name, err?.message);
      }

      // Step 4: all failed — join without media (can still chat)
      if (isMounted) {
        mediaReadyRef.current = true; // still mark ready so toggles don't get stuck
        toast(
          '🚫 Camera & mic blocked. In Chrome: click the 🔒 lock icon → allow Camera & Microphone → refresh.',
          { duration: 8000 }
        );
      }
    };
    initMedia();

    return () => {
      isMounted = false;
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      peersRef.current.forEach(pc => pc.close());
      peersRef.current.clear();
      mediaReadyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Socket signaling ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!socket || !roomId) return;

    const handleUserJoined = ({ socketId }: { socketId: string }) => {
      if (socketId !== socket.id) createPeerConnection(socketId, true);
    };

    const handleSignal = async ({ signal, from }: { signal: any; from: string }) => {
      let pc = peersRef.current.get(from);
      if (signal.type === 'offer') {
        pc = createPeerConnection(from, false);
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('meeting:signal', { roomId, to: from, signal: { type: 'answer', sdp: pc.localDescription } });
        } catch (err) { console.error('Error handling offer:', err); }
      } else if (signal.type === 'answer' && pc) {
        try { await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp)); } catch {}
      } else if (signal.type === 'candidate' && pc) {
        try { await pc.addIceCandidate(new RTCIceCandidate(signal.candidate)); } catch {}
      }
    };

    const handleUserLeft = ({ socketId }: { socketId: string }) => closePeerConnection(socketId);

    socket.on('meeting:user-joined', handleUserJoined);
    socket.on('meeting:signal', handleSignal);
    socket.on('meeting:user-left', handleUserLeft);
    socket.emit('meeting:join', roomId);

    return () => {
      socket.off('meeting:user-joined', handleUserJoined);
      socket.off('meeting:signal', handleSignal);
      socket.off('meeting:user-left', handleUserLeft);
      socket.emit('meeting:leave', roomId);
    };
  }, [socket, roomId, createPeerConnection, closePeerConnection]);

  // ── Camera toggle — physically stop/start device camera ──────────────────────

  useEffect(() => {
    // Don't run until media is initialised
    if (!mediaReadyRef.current) return;

    const toggleCamera = async () => {
      if (isVideoOff) {
        // Stop every video track → camera light turns OFF
        const tracks = localStreamRef.current?.getVideoTracks() ?? [];
        tracks.forEach(t => {
          t.stop();
          localStreamRef.current?.removeTrack(t);
        });
        replaceVideoTrackInPeers(null);
        // Rebuild stream with audio only → VideoTile shows avatar
        const audio = localStreamRef.current?.getAudioTracks() ?? [];
        setLocalStream(audio.length ? new MediaStream(audio) : null);
      } else {
        // Re-acquire the physical camera
        try {
          const vStream = await navigator.mediaDevices.getUserMedia({ video: true });
          const vTrack  = vStream.getVideoTracks()[0];
          if (!vTrack) return;
          if (!localStreamRef.current) localStreamRef.current = new MediaStream();
          localStreamRef.current.addTrack(vTrack);
          replaceVideoTrackInPeers(vTrack);
          setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        } catch {
          toast.error('Could not turn on camera. Check browser permissions.');
        }
      }
      broadcastMediaState(isVideoOff, isMuted);
    };

    toggleCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVideoOff]);

  // ── Mic toggle ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!mediaReadyRef.current) return;
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !isMuted; });
    broadcastMediaState(isVideoOff, isMuted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMuted]);

  // ── Screen share ──────────────────────────────────────────────────────────────

  const stopScreenShare = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;
    setScreenSharing(false);
    if (socket?.connected && roomId) {
      socket.emit('meeting:screen-share', { roomId, isSharing: false });
    }
    // Restore camera (or audio-only) stream
    if (localStreamRef.current) {
      replaceVideoTrackInPeers(localStreamRef.current.getVideoTracks()[0] ?? null);
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
    }
  }, [socket, roomId, setScreenSharing, replaceVideoTrackInPeers]);

  const startScreenShare = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      screenStreamRef.current = screenStream;
      const screenTrack = screenStream.getVideoTracks()[0];

      // When user clicks browser "Stop sharing" button
      screenTrack.onended = () => stopScreenShare();

      replaceVideoTrackInPeers(screenTrack);

      // Local preview: screen + mic audio
      const preview = new MediaStream([screenTrack]);
      const audioTrack = localStreamRef.current?.getAudioTracks()[0];
      if (audioTrack) preview.addTrack(audioTrack);
      setLocalStream(preview);
      setScreenSharing(true);

      if (socket?.connected && roomId) {
        socket.emit('meeting:screen-share', { roomId, isSharing: true });
      }
    } catch {
      // User cancelled — no error toast needed
      setScreenSharing(false);
    }
  }, [socket, roomId, setScreenSharing, stopScreenShare, replaceVideoTrackInPeers]);

  // ── Expose stopAllTracks for clean leave ──────────────────────────────────────

  const stopAllTracks = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    peersRef.current.forEach(pc => pc.close());
    peersRef.current.clear();
  }, []);

  return { localStreamRef, localStream, remoteStreams, peersRef, startScreenShare, stopScreenShare, stopAllTracks };
};
