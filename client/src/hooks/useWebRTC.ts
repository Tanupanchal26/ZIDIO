import { useEffect, useRef, useState, useCallback } from 'react';
import { useMeetingStore } from '../store/meeting/meeting.store';
import { getSocket } from '../utils/socket';

interface WebRTCConfig { roomId: string; userId: string; }

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export const useWebRTC = ({ roomId, userId }: WebRTCConfig) => {
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const { isVideoOff, isMuted, setScreenSharing } = useMeetingStore();

  const socket = getSocket();

  // Create a new peer connection for a remote user
  const createPeerConnection = useCallback((remoteSocketId: string, isInitiator: boolean) => {
    if (peersRef.current.has(remoteSocketId)) return peersRef.current.get(remoteSocketId)!;

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peersRef.current.set(remoteSocketId, pc);

    // Add local tracks to the connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle remote tracks
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

    // ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('meeting:signal', {
          roomId,
          to: remoteSocketId,
          signal: { type: 'candidate', candidate: event.candidate },
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        if (isInitiator) {
          pc.createOffer({ iceRestart: true })
            .then(offer => pc.setLocalDescription(offer))
            .then(() => {
              socket.emit('meeting:signal', {
                roomId,
                to: remoteSocketId,
                signal: { type: 'offer', sdp: pc.localDescription },
              });
            })
            .catch(err => console.error('ICE restart failed:', err));
        } else {
          // Responder waits for the new offer, or closes if it takes too long
          setTimeout(() => {
            if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
              closePeerConnection(remoteSocketId);
            }
          }, 5000);
        }
      }
    };

    // If we are the initiator, create and send offer
    if (isInitiator) {
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          socket.emit('meeting:signal', {
            roomId,
            to: remoteSocketId,
            signal: { type: 'offer', sdp: pc.localDescription },
          });
        })
        .catch(err => console.error('Error creating offer:', err));
    }

    return pc;
  }, [roomId, socket]);

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

  // Initial Audio + Video Setup
  useEffect(() => {
    let isMounted = true;
    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        if (!isMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        stream.getAudioTracks().forEach(t => { t.enabled = !isMuted; });
        stream.getVideoTracks().forEach(t => { t.enabled = true; });
        localStreamRef.current = stream;
        setLocalStream(new MediaStream(stream.getTracks()));
      } catch (err) {
        console.warn("Camera not available, falling back to audio only", err);
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (!isMounted) { audioStream.getTracks().forEach(t => t.stop()); return; }
          audioStream.getAudioTracks().forEach(t => { t.enabled = !isMuted; });
          localStreamRef.current = audioStream;
          setLocalStream(new MediaStream(audioStream.getTracks()));
        } catch (audioErr) {
          console.error("Failed to get any media stream", audioErr);
        }
      }
    };
    initMedia();

    return () => {
      isMounted = false;
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      peersRef.current.forEach(pc => pc.close());
      peersRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Socket event handlers for WebRTC signaling
  useEffect(() => {
    if (!socket || !roomId) return;

    // When a new user joins, create a peer connection as initiator
    const handleUserJoined = ({ socketId }: { socketId: string }) => {
      if (socketId !== socket.id) {
        createPeerConnection(socketId, true);
      }
    };

    // When receiving a signal (offer, answer, or ICE candidate)
    const handleSignal = async ({ signal, from }: { signal: any; from: string }) => {
      let pc = peersRef.current.get(from);
      
      if (signal.type === 'offer') {
        // Create peer connection as responder
        pc = createPeerConnection(from, false);
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('meeting:signal', {
            roomId,
            to: from,
            signal: { type: 'answer', sdp: pc.localDescription },
          });
        } catch (err) {
          console.error('Error handling offer:', err);
        }
      } else if (signal.type === 'answer' && pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        } catch (err) {
          console.error('Error handling answer:', err);
        }
      } else if (signal.type === 'candidate' && pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        } catch (err) {
          console.error('Error adding ICE candidate:', err);
        }
      }
    };

    // When a user leaves, close their peer connection
    const handleUserLeft = ({ socketId }: { socketId: string }) => {
      closePeerConnection(socketId);
    };

    socket.on('meeting:user-joined', handleUserJoined);
    socket.on('meeting:signal', handleSignal);
    socket.on('meeting:user-left', handleUserLeft);

    // Join the meeting room
    socket.emit('meeting:join', roomId);

    return () => {
      socket.off('meeting:user-joined', handleUserJoined);
      socket.off('meeting:signal', handleSignal);
      socket.off('meeting:user-left', handleUserLeft);
      socket.emit('meeting:leave', roomId);
    };
  }, [socket, roomId, createPeerConnection, closePeerConnection]);

  // Handle Video Toggle
  useEffect(() => {
    const toggleCamera = async () => {
      if (isVideoOff) {
        // Soft-disable: just disable the track, keep it alive so re-enable is instant
        localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = false; });
        setLocalStream(prev => prev ? new MediaStream(prev.getTracks()) : null);
      } else {
        const existingTrack = localStreamRef.current?.getVideoTracks()[0];
        if (existingTrack) {
          // Re-enable existing track
          existingTrack.enabled = true;
          setLocalStream(prev => prev ? new MediaStream(prev.getTracks()) : null);
        } else {
          // Track was stopped — request a new one
          try {
            const vStream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (!localStreamRef.current) return;
            const vTrack = vStream.getVideoTracks()[0];
            localStreamRef.current.addTrack(vTrack);
            setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
            // Replace track in all peer connections
            peersRef.current.forEach(pc => {
              const sender = pc.getSenders().find(s => s.track?.kind === 'video');
              if (sender) sender.replaceTrack(vTrack);
              else pc.addTrack(vTrack, localStreamRef.current!);
            });
          } catch (err) {
            console.error('Failed to turn on camera:', err);
          }
        }
      }
      // Broadcast media state
      if (socket?.connected && roomId) {
        socket.emit('meeting:media-state', { roomId, isMuted, isVideoOff, isScreenSharing: false });
      }
    };
    toggleCamera();
  }, [isVideoOff, socket, roomId, isMuted]);

  // Handle Audio Toggle
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !isMuted; });
    }

    // Broadcast media state
    if (socket?.connected && roomId) {
      socket.emit('meeting:media-state', { roomId, isMuted, isVideoOff, isScreenSharing: false });
    }
  }, [isMuted, socket, roomId, isVideoOff]);

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }
    setScreenSharing(false);

    // Broadcast screen share stopped
    if (socket?.connected && roomId) {
      socket.emit('meeting:screen-share', { roomId, isSharing: false });
    }

    // Restore camera track to local stream
    if (localStreamRef.current) {
      const cameraVideoTrack = localStreamRef.current.getVideoTracks()[0];
      
      // Update peers with camera track (or null if camera is off)
      peersRef.current.forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(cameraVideoTrack || null);
      });

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
        if (sender) {
          sender.replaceTrack(screenVideoTrack);
        } else {
          pc.addTrack(screenVideoTrack, screenStream);
        }
      });

      // Show screen share in local preview
      const previewStream = new MediaStream([screenVideoTrack]);
      if (localStreamRef.current) {
        const audioTrack = localStreamRef.current.getAudioTracks()[0];
        if (audioTrack) previewStream.addTrack(audioTrack);
      }
      setLocalStream(previewStream);
      setScreenSharing(true);

      // Broadcast screen share started
      if (socket?.connected && roomId) {
        socket.emit('meeting:screen-share', { roomId, isSharing: true });
      }
    } catch (err) {
      console.error("Failed to start screen share", err);
      setScreenSharing(false);
    }
  };

  return { localStreamRef, localStream, remoteStreams, peersRef, startScreenShare, stopScreenShare };
};
