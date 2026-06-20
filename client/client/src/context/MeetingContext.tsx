import React, { createContext, useContext, useState } from 'react';

interface MeetingContextType {
  roomCode: string | null;
  setRoomCode: (code: string | null) => void;
  isAudioEnabled: boolean;
  setAudioEnabled: (enabled: boolean) => void;
  isVideoEnabled: boolean;
  setVideoEnabled: (enabled: boolean) => void;
}

const MeetingContext = createContext<MeetingContextType | null>(null);

export const MeetingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [isAudioEnabled, setAudioEnabled] = useState(true);
  const [isVideoEnabled, setVideoEnabled] = useState(true);

  return (
    <MeetingContext.Provider value={{
      roomCode,
      setRoomCode,
      isAudioEnabled,
      setAudioEnabled,
      isVideoEnabled,
      setVideoEnabled
    }}>
      {children}
    </MeetingContext.Provider>
  );
};

export const useMeetingContext = () => {
  const ctx = useContext(MeetingContext);
  if (!ctx) throw new Error('useMeetingContext must be used within a MeetingProvider');
  return ctx;
};
