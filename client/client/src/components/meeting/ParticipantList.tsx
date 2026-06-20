import { MicOff, VideoOff, Crown, UserX, Hand } from 'lucide-react';
import { useMeetingStore } from '../../store/meeting.store';
import { useAppSelector } from '../../hooks/useAppDispatch';
import { clsx } from 'clsx';

type ParticipantStatus = 'speaking' | 'muted' | 'away' | 'online';

const getStatus = (p: { isMuted: boolean; isVideoOff: boolean }): ParticipantStatus => {
  if (!p.isMuted && !p.isVideoOff) return 'speaking';
  if (p.isMuted) return 'muted';
  return 'online';
};

const STATUS_DOT: Record<ParticipantStatus, string> = {
  speaking: 'bg-emerald-400',
  muted:    'bg-amber-400',
  away:     'bg-yellow-400',
  online:   'bg-emerald-500',
};

const ParticipantList = () => {
  const { participants, currentMeeting, isMuted, isVideoOff } = useMeetingStore();
  const user = useAppSelector((s) => s.auth.user);
  const isHostUser = user?.id === currentMeeting?.host;

  const all = [
    {
      id: user?.id || 'local',
      name: user?.name || 'You',
      isMuted,
      isVideoOff,
      isHost: isHostUser ?? false,
      socketId: 'local',
      isLocal: true,
    },
    ...participants.map((p) => ({ ...p, isLocal: false })),
  ];

  return (
    <div className="p-3 flex flex-col gap-2" role="list" aria-label="Meeting participants">
      <p className="text-xs text-[var(--color-text-muted)] font-medium px-1">
        {all.length} participant{all.length !== 1 ? 's' : ''}
      </p>
      {all.map((p) => (
        <div
          key={p.socketId}
          role="listitem"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[var(--color-surface-2)] hover:bg-[var(--color-border)] transition-colors"
        >
          {/* Avatar with status dot */}
          <div className="relative shrink-0">
            <div
              className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-purple-500 flex items-center justify-center text-white text-sm font-bold"
              aria-hidden="true"
            >
              {p.name.charAt(0).toUpperCase()}
            </div>
            <span
              className={clsx(
                'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--color-surface-2)]',
                STATUS_DOT[getStatus(p)]
              )}
              aria-label={getStatus(p)}
            />
          </div>

          {/* Name + role */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--color-text)] truncate">
              {p.name}
              {p.isLocal && (
                <span className="text-[var(--color-text-dim)] text-xs ml-1">(You)</span>
              )}
            </p>
            {p.isHost && (
              <p className="text-[10px] text-[var(--color-primary)] font-semibold flex items-center gap-1">
                <Crown size={9} aria-hidden="true" />
                Host
              </p>
            )}
          </div>

          {/* Status icons */}
          <div className="flex items-center gap-1 shrink-0" aria-label={`${p.name} status`}>
            {p.isMuted && (
              <span title="Muted" aria-label="Muted">
                <MicOff size={13} className="text-[var(--color-danger)]" aria-hidden="true" />
              </span>
            )}
            {p.isVideoOff && (
              <span title="Camera off" aria-label="Camera off">
                <VideoOff size={13} className="text-[#475569]" aria-hidden="true" />
              </span>
            )}
          </div>

          {/* Host remove button */}
          {isHostUser && !p.isLocal && (
            <button
              className="p-1 rounded text-[var(--color-text-dim)] hover:text-[var(--color-danger)] hover:bg-red-500/10 transition-colors focus-visible:ring-2 focus-visible:ring-red-400"
              aria-label={`Remove ${p.name} from meeting`}
            >
              <UserX size={13} aria-hidden="true" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default ParticipantList;
