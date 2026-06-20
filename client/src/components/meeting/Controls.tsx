import { Mic, MicOff, Video, VideoOff, Monitor, Circle, PhoneOff, Hand, Smile, MoreHorizontal } from 'lucide-react';
import { useMeetingStore } from '../../store/meeting/meeting.store';
import { useMeeting } from '../../hooks/useMeeting';
import { useRecording } from '../../hooks/useRecording';
import { getSocket } from '../../utils/socket';
import { clsx } from 'clsx';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useState } from 'react';

interface ControlBtnProps {
  icon: any;
  activeIcon?: any;
  label: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
}

const ControlBtn = ({ icon: Icon, activeIcon: ActiveIcon, label, onClick, active, danger, disabled }: ControlBtnProps) => {
  const DisplayIcon = active && ActiveIcon ? ActiveIcon : Icon;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={clsx(
        'meeting-control-btn flex flex-col items-center justify-center gap-1 min-w-[52px] px-3 py-2 rounded-xl transition-all duration-150',
        'select-none outline-none disabled:opacity-40 disabled:cursor-not-allowed active:scale-95',
        'focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-bg)]',
        danger
          ? 'bg-red-500 text-white hover:bg-red-600 shadow-[0_2px_8px_rgba(239,68,68,0.3)]'
          : active
          ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)] border border-[var(--color-primary-border)]'
          : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border border-transparent hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]'
      )}
    >
      <DisplayIcon size={16} strokeWidth={active ? 2 : 1.75} aria-hidden="true" />
      <span className="text-[9px] font-medium leading-none" aria-hidden="true">{label}</span>
    </button>
  );
};

interface ControlsProps {
  startScreenShare?: () => Promise<void>;
  stopScreenShare?: () => void;
}

const Controls = ({ startScreenShare, stopScreenShare }: ControlsProps) => {
  const { id: meetingId } = useParams();
  const {
    isMuted, isVideoOff, isScreenSharing, isRecording,
    toggleMute, toggleVideo, toggleScreenShare, toggleRecording,
    currentMeeting,
  } = useMeetingStore();
  const { leaveMeeting } = useMeeting(currentMeeting?.roomId);
  const { startRecording, stopRecording } = useRecording(meetingId ?? '');
  const [handRaised, setHandRaised] = useState(false);

  const handleRecordingToggle = async () => {
    try {
      if (isRecording) {
        stopRecording();
      } else {
        await startRecording();
      }
    } catch (err) {
      toast.error('Failed to toggle recording');
    }
  };

  const handleScreenShareToggle = async () => {
    if (isScreenSharing) {
      if (stopScreenShare) stopScreenShare();
    } else {
      if (startScreenShare) await startScreenShare();
    }
  };

  const handleRaiseHand = () => {
    const newState = !handRaised;
    setHandRaised(newState);
    const socket = getSocket();
    if (socket?.connected && meetingId) {
      socket.emit('meeting:raise-hand', { roomId: meetingId, raised: newState });
    }
    toast(newState ? '✋ Hand raised' : '✋ Hand lowered', { duration: 2000 });
  };

  const handleReaction = () => {
    toast('👍', { duration: 2000, icon: '🎉' });
  };

  return (
    <div className="px-4 pb-4 pt-2 shrink-0 bg-gradient-to-t from-[var(--color-bg)] to-transparent relative z-20">
      <div
        className={clsx(
          'flex items-center justify-center gap-2 sm:gap-3 py-3 px-4 sm:px-6 mx-auto w-fit flex-wrap',
          'bg-[var(--color-surface)]/90 backdrop-blur-xl border border-[var(--color-border)] rounded-2xl shadow-2xl',
        )}
        role="toolbar"
        aria-label="Meeting controls"
      >
      {/* Left group */}
      <div className="flex items-center gap-1.5">
        <ControlBtn
          icon={Mic} activeIcon={MicOff}
          label={isMuted ? 'Unmute' : 'Mute'}
          onClick={toggleMute}
          active={isMuted}
        />
        <ControlBtn
          icon={Video} activeIcon={VideoOff}
          label={isVideoOff ? 'Start' : 'Stop'}
          onClick={toggleVideo}
          active={isVideoOff}
        />
      </div>

      <div className="w-px h-8 bg-[var(--color-border)] mx-1" />

      {/* Center group */}
      <div className="flex items-center gap-1.5">
        <ControlBtn
          icon={Monitor}
          label="Share"
          onClick={handleScreenShareToggle}
          active={isScreenSharing}
        />
        <ControlBtn
          icon={Circle}
          label={isRecording ? 'Stop' : 'Record'}
          onClick={handleRecordingToggle}
          active={isRecording}
        />
        <ControlBtn
          icon={Hand}
          label="Hand"
          onClick={handleRaiseHand}
          active={handRaised}
        />
        <ControlBtn
          icon={Smile}
          label="React"
          onClick={handleReaction}
        />
      </div>

      <div className="w-px h-8 bg-[var(--color-border)] mx-1" />

      {/* Leave */}
      <ControlBtn
        icon={PhoneOff}
        label="Leave"
        onClick={() => leaveMeeting(meetingId)}
        danger
      />
      </div>
    </div>
  );
};

export default Controls;
