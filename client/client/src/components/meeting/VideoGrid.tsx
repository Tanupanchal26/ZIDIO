import { MicOff, VideoOff } from 'lucide-react';
import { useMeetingStore } from '../../store/meeting.store';
import { useAppSelector } from '../../hooks/useAppDispatch';
import { clsx } from 'clsx';

const VideoTile = ({ name, isMuted, isVideoOff, isActive, isLocal }: {
  name: string; isMuted: boolean; isVideoOff: boolean; isActive?: boolean; isLocal?: boolean;
}) => (
  <article
    className={clsx('video-tile flex items-center justify-center', isActive && 'video-tile--active')}
    aria-label={`${name}${isLocal ? ' (You)' : ''} — ${isMuted ? 'muted' : 'unmuted'}${isVideoOff ? ', video off' : ''}`}
  >
    <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-purple-500 flex items-center justify-center text-white font-bold text-xl" aria-hidden="true">
        {name.charAt(0).toUpperCase()}
      </div>
    </div>
    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between" aria-hidden="true">
      <span className="text-xs text-white bg-black/50 rounded px-1.5 py-0.5 backdrop-blur-sm">
        {name}{isLocal ? ' (You)' : ''}
      </span>
      <div className="flex gap-1">
        {isMuted    && <div className="w-5 h-5 rounded bg-red-500/80 flex items-center justify-center"><MicOff  size={11} className="text-white" /></div>}
        {isVideoOff && <div className="w-5 h-5 rounded bg-gray-600/80 flex items-center justify-center"><VideoOff size={11} className="text-white" /></div>}
      </div>
    </div>
  </article>
);

const VideoGrid = () => {
  const { participants, isVideoOff, isMuted } = useMeetingStore();
  const user = useAppSelector((s) => s.auth.user);
  const allTiles = [
    { id: 'local', name: user?.name || 'You', isMuted, isVideoOff, isLocal: true, isActive: true },
    ...participants.map(p => ({ id: p.socketId, name: p.name, isMuted: p.isMuted, isVideoOff: p.isVideoOff, isLocal: false, isActive: false }))
  ];
  const gridCols = allTiles.length <= 1 ? 'grid-cols-1' : allTiles.length <= 4 ? 'grid-cols-2' : 'grid-cols-3';
  return (
    <div className={`grid ${gridCols} gap-3 h-full p-3`} role="list" aria-label={`Participants (${allTiles.length})`}>
      {allTiles.map(tile => <VideoTile key={tile.id} {...tile} />)}
    </div>
  );
};

export default VideoGrid;
