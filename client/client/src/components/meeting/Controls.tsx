import { Mic, MicOff, Video, VideoOff, Monitor, Circle, PhoneOff, Hand, Smile, MoreHorizontal } from 'lucide-react';
import { useMeetingStore } from '../../store/meeting.store';
import { useMeeting } from '../../hooks/useMeeting';
import { clsx } from 'clsx';
import { useParams } from 'react-router-dom';

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
        'focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-1 focus-visible:ring-offset-[#09090E]',
        danger
          ? 'bg-red-500 text-white hover:bg-red-600 shadow-[0_2px_8px_rgba(239,68,68,0.3)]'
          : active
          ? 'bg-indigo-500/12 text-indigo-300 border border-indigo-500/20'
          : 'bg-white/[0.04] text-[#94A3B8] border border-transparent hover:bg-white/[0.07] hover:text-[#F8FAFC]'
      )}
    >
      <DisplayIcon size={16} strokeWidth={active ? 2 : 1.75} aria-hidden="true" />
      <span className="text-[9px] font-medium leading-none" aria-hidden="true">{label}</span>
    </button>
  );
};

const Controls = () => {
  const { id: meetingId } = useParams();
  const {
    isMuted, isVideoOff, isScreenSharing, isRecording,
    toggleMute, toggleVideo, toggleScreenShare, toggleRecording,
    currentMeeting,
  } = useMeetingStore();
  const { leaveMeeting } = useMeeting(currentMeeting?.roomId);

  return (
    <div
      className={clsx(
        'flex items-center justify-center gap-2 py-3 px-4 shrink-0 flex-wrap',
        'bg-[#09090E]/90 backdrop-blur-md border-t border-[rgba(255,255,255,0.05)]',
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

      <div className="w-px h-8 bg-[rgba(255,255,255,0.06)] mx-1" />

      {/* Center group */}
      <div className="flex items-center gap-1.5">
        <ControlBtn
          icon={Monitor}
          label="Share"
          onClick={toggleScreenShare}
          active={isScreenSharing}
        />
        <ControlBtn
          icon={Circle}
          label={isRecording ? 'Stop' : 'Record'}
          onClick={toggleRecording}
          active={isRecording}
        />
        <ControlBtn
          icon={Hand}
          label="Hand"
          onClick={() => {}}
        />
        <ControlBtn
          icon={Smile}
          label="React"
          onClick={() => {}}
        />
        <ControlBtn
          icon={MoreHorizontal}
          label="More"
          onClick={() => {}}
        />
      </div>

      <div className="w-px h-8 bg-[rgba(255,255,255,0.06)] mx-1" />

      {/* Leave */}
      <ControlBtn
        icon={PhoneOff}
        label="Leave"
        onClick={() => leaveMeeting(meetingId)}
        danger
      />
    </div>
  );
};

export default Controls;
