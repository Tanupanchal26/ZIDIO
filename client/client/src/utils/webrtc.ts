export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export const createPeerConnection = (
  onIceCandidate: (event: RTCPeerConnectionIceEvent) => void,
  onTrack: (event: RTCTrackEvent) => void
): RTCPeerConnection => {
  const pc = new RTCPeerConnection(RTC_CONFIG);
  pc.onicecandidate = onIceCandidate;
  pc.ontrack = onTrack;
  return pc;
};
