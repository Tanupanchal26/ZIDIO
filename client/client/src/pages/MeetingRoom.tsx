import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Users, Brain, FileText, Zap,
  ChevronRight, WifiOff, Wifi, Signal, GripVertical,
} from 'lucide-react';
import { clsx } from 'clsx';
import VideoGrid from '../components/meeting/VideoGrid';
import Controls from '../components/meeting/Controls';
import ChatBox from '../components/meeting/ChatBox';
import ParticipantList from '../components/meeting/ParticipantList';
import TranscriptPanel from '../components/ai/TranscriptPanel';
import SummaryCard from '../components/ai/SummaryCard';
import ActionItems from '../components/ai/ActionItems';
import AIAssistant from '../components/ai/AIAssistant';
import Badge from '../components/common/Badge';
import { useMeetingStore } from '../store/meeting.store';
import { useWebRTC } from '../hooks/useWebRTC';
import { useAppSelector } from '../hooks/useAppDispatch';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useChat } from '../hooks/useChat';

type Panel = 'chat' | 'participants' | 'ai' | 'notes';
type AITab = 'summary' | 'transcript' | 'actions' | 'assistant';

// ── Connection quality indicator ─────────────────────────────────────────────
type Quality = 'good' | 'fair' | 'poor' | 'offline';

const useConnectionQuality = (): Quality => {
  const [quality, setQuality] = useState<Quality>('good');
  useEffect(() => {
    const update = () => setQuality(navigator.onLine ? 'good' : 'offline');
    window.addEventListener('online',  update);
    window.addEventListener('offline', update);
    if ('connection' in navigator) {
      const conn = (navigator as any).connection;
      const checkConn = () => {
        if (!navigator.onLine)                setQuality('offline');
        else if (conn.effectiveType === '2g') setQuality('poor');
        else if (conn.effectiveType === '3g') setQuality('fair');
        else                                  setQuality('good');
      };
      conn.addEventListener('change', checkConn);
      checkConn();
      return () => conn.removeEventListener('change', checkConn);
    }
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  return quality;
};

const QualityIndicator = memo(({ quality }: { quality: Quality }) => {
  const map: Record<Quality, { icon: typeof Wifi; color: string; label: string }> = {
    good:    { icon: Wifi,    color: 'text-emerald-400', label: 'Good connection' },
    fair:    { icon: Signal,  color: 'text-amber-400',   label: 'Fair connection' },
    poor:    { icon: Signal,  color: 'text-red-400',     label: 'Poor connection' },
    offline: { icon: WifiOff, color: 'text-red-500',     label: 'No connection'  },
  };
  const { icon: Icon, color, label } = map[quality];
  return (
    <button
      aria-label={label}
      title={label}
      className={clsx('p-1.5 rounded-md transition-colors hover:bg-white/[0.05]', color)}
    >
      <Icon size={13} aria-hidden="true" />
    </button>
  );
});

// ── Reconnect banner ─────────────────────────────────────────────────────────
const ReconnectBanner = memo(({ show }: { show: boolean }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      >
        <div
          role="alert"
          aria-live="assertive"
          className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-500/15 border-b border-amber-500/20 text-amber-400 text-xs font-semibold"
        >
          <WifiOff size={12} aria-hidden="true" />
          Connection lost — reconnecting…
          <div className="w-3 h-3 border border-amber-400/40 border-t-amber-400 rounded-full animate-spin" aria-hidden="true" />
        </div>
      </motion.div>
    )}
  </AnimatePresence>
));

// ── AI sub-panel ─────────────────────────────────────────────────────────────
const AI_TABS: { id: AITab; label: string }[] = [
  { id: 'summary',    label: 'Summary'    },
  { id: 'transcript', label: 'Transcript' },
  { id: 'actions',    label: 'Actions'    },
  { id: 'assistant',  label: 'Chat'       },
];

const AIPanel = memo(({ meetingId }: { meetingId: string }) => {
  const [tab, setTab] = useState<AITab>('summary');
  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-1 px-2 pt-2 pb-1 shrink-0" role="tablist" aria-label="AI panel tabs">
        {AI_TABS.map(({ id, label }) => (
          <button key={id} role="tab" id={`ai-tab-${id}`} aria-selected={tab === id}
            aria-controls={`ai-panel-${id}`} onClick={() => setTab(id)}
            className={clsx('flex-1 py-2 min-h-[40px] text-[10px] font-semibold rounded-lg transition-all',
              tab === id ? 'text-indigo-300 bg-indigo-500/10' : 'text-[#2D3A4A] hover:text-[#64748B] hover:bg-white/[0.03]'
            )}>
            {label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto" role="tabpanel" id={`ai-panel-${tab}`} aria-labelledby={`ai-tab-${tab}`}>
        <AnimatePresence mode="wait">
          <motion.div key={tab} className="h-full"
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            {tab === 'transcript' && <TranscriptPanel />}
            {tab === 'summary'    && <SummaryCard meetingId={meetingId} />}
            {tab === 'actions'    && <ActionItems meetingId={meetingId} />}
            {tab === 'assistant'  && <AIAssistant meetingId={meetingId} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
});

// ── Notes sub-panel ──────────────────────────────────────────────────────────
const NotesPanel = memo(() => {
  const [notes, setNotes] = useState('');
  return (
    <div className="p-3 h-full flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-[#2D3A4A] uppercase tracking-[0.1em]">Meeting Notes</p>
        <button className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
          aria-label="Save meeting notes">Save</button>
      </div>
      <label htmlFor="meeting-notes" className="sr-only">Meeting notes</label>
      <textarea
        id="meeting-notes"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Type your notes here…"
        className="flex-1 resize-none text-xs text-[#CBD5E1] leading-relaxed bg-transparent border-none outline-none placeholder:text-[#2D3A4A]"
        style={{ minHeight: 200 }}
      />
    </div>
  );
});

// ── Resizable panel hook ────────────────────────────────────────────────────
const MIN_W = 220;
const MAX_W = 480;
const DEFAULT_W = 296;

function useResizablePanel(enabled: boolean) {
  const [width, setWidth] = useState(DEFAULT_W);
  const dragging = useRef(false);
  const startX   = useRef(0);
  const startW   = useRef(DEFAULT_W);

  useEffect(() => {
    if (!enabled) return;
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = startX.current - e.clientX;
      setWidth(Math.min(MAX_W, Math.max(MIN_W, startW.current + delta)));
    };
    const onUp = () => { dragging.current = false; document.body.style.cursor = ''; document.body.style.userSelect = ''; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [enabled]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    startX.current   = e.clientX;
    startW.current   = width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  }, [width]);

  return { width, onMouseDown };
}

// ── Main component ───────────────────────────────────────────────────────────
const MeetingRoom = () => {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user     = useAppSelector((s) => s.auth.user);

  const [activePanel, setActivePanel] = useState<Panel>('chat');
  const [panelOpen,   setPanelOpen]   = useState(true);
  // On mobile: panel renders as a bottom sheet
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, panelOpen);
  const { width: panelWidth, onMouseDown: startResize } = useResizablePanel(panelOpen);

  const quality     = useConnectionQuality();
  const disconnected = quality === 'offline';

  const { setCurrentMeeting, isRecording, currentMeeting } = useMeetingStore();
  const { messages, typingUsers } = useChat(id ?? '');
  useWebRTC({ roomId: id ?? '', userId: user?.id ?? '' });

  // Unread message count while chat is not the active panel
  const [lastSeenCount, setLastSeenCount] = useState(0);
  const unreadCount = activePanel !== 'chat' || !panelOpen
    ? Math.max(0, messages.length - lastSeenCount)
    : 0;

  const handlePanelSelect = useCallback((p: Panel) => {
    setActivePanel(p);
    if (p === 'chat') setLastSeenCount(messages.length);
    setPanelOpen(true);
    setMobilePanelOpen(true);
  }, [messages.length]);

  // Close mobile panel on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobilePanelOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (id) setCurrentMeeting({ id, title: 'Live Meeting', roomId: id, host: user?.id ?? '' });
    return () => setCurrentMeeting(null);
  }, [id, user?.id, setCurrentMeeting]);

  const meetingTitle = currentMeeting?.title ?? 'Meeting';
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const PANELS: { id: Panel; label: string; icon: React.ElementType; badge?: number | boolean }[] = [
    { id: 'chat',         label: 'Chat',    icon: MessageSquare, badge: unreadCount > 0 ? unreadCount : (typingUsers.length > 0 ? true : undefined) },
    { id: 'participants', label: 'People',  icon: Users },
    { id: 'ai',           label: 'AI',      icon: Brain },
    { id: 'notes',        label: 'Notes',   icon: FileText },
  ];

  const SidePanelContent = (
    <motion.div
      ref={panelRef}
      className="flex flex-col border-l border-[rgba(255,255,255,0.05)] bg-[#09090E] shrink-0 overflow-hidden relative"
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: panelWidth, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
      style={{ minWidth: 0, width: panelWidth }}
      role="complementary"
      aria-label="Meeting side panel"
    >
      {/* Resize handle */}
      <div
        onMouseDown={startResize}
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500/30 transition-colors group z-10"
        aria-hidden="true"
        title="Drag to resize panel"
      >
        <div className="absolute left-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical size={12} className="text-[#2D3A4A]" />
        </div>
      </div>
      {/* Tab bar */}
      <div className="flex border-b border-[rgba(255,255,255,0.05)] shrink-0" role="tablist" aria-label="Panel sections">
        {PANELS.map(({ id: pid, label, icon: Icon, badge }) => (
          <button key={pid} role="tab" id={`panel-tab-${pid}`}
            aria-selected={activePanel === pid} aria-controls={`panel-${pid}`}
            onClick={() => handlePanelSelect(pid)}
            className={clsx('flex-1 flex flex-col items-center gap-1 py-2.5 min-h-[44px] transition-all relative',
              activePanel === pid ? 'text-indigo-300' : 'text-[#2D3A4A] hover:text-[#64748B]'
            )}
            aria-label={label}
          >
            {activePanel === pid && (
              <motion.span layoutId="panelIndicator"
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-[2px] bg-indigo-500 rounded-full"
                aria-hidden="true" />
            )}
            <div className="relative">
              <Icon size={13} aria-hidden="true" />
              {/* Unread / typing badge */}
              {badge !== undefined && badge !== false && (
                <span aria-label={typeof badge === 'number' ? `${badge} unread messages` : 'Someone is typing'}
                  className={clsx(
                    'absolute -top-1.5 -right-2 min-w-[14px] h-[14px] rounded-full text-[8px] font-bold flex items-center justify-center',
                    typeof badge === 'boolean'
                      ? 'bg-indigo-500 w-2 h-2 min-w-0 top-0 -right-1'
                      : 'bg-red-500 text-white px-[3px]'
                  )}>
                  {typeof badge === 'number' ? (badge > 9 ? '9+' : badge) : ''}
                </span>
              )}
            </div>
            <span className="text-[9px] font-semibold leading-none" aria-hidden="true">{label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden" role="tabpanel" id={`panel-${activePanel}`} aria-labelledby={`panel-tab-${activePanel}`}>
        <AnimatePresence mode="wait">
          <motion.div key={activePanel} className="h-full"
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
            {activePanel === 'chat'         && <ChatBox meetingId={id ?? ''} />}
            {activePanel === 'participants' && <ParticipantList />}
            {activePanel === 'ai'           && <AIPanel meetingId={id ?? ''} />}
            {activePanel === 'notes'        && <NotesPanel />}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );

  return (
    <div className="fixed inset-0 flex flex-col bg-[#050810] overflow-hidden" style={{ zIndex: 'var(--z-max)' as any }}>

      {/* Reconnect banner */}
      <ReconnectBanner show={disconnected} />

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-[rgba(255,255,255,0.05)] shrink-0"
        style={{ background: 'rgba(7,7,12,0.9)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-500 flex items-center justify-center shadow-[0_0_12px_rgba(99,102,241,0.3)]">
              <Zap size={12} className="text-white" strokeWidth={2.5} aria-hidden="true" />
            </div>
            <span className="text-xs font-bold text-[#CBD5E1] hidden sm:block tracking-tight">IntellMeet</span>
          </div>
          <div className="w-px h-4 bg-[rgba(255,255,255,0.08)]" aria-hidden="true" />
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-[#F1F5F9] hidden sm:block tracking-tight truncate max-w-[200px]">{meetingTitle}</p>
            {id && (
              <code className="text-[10px] text-[#2D3A4A] bg-white/[0.04] border border-white/[0.06] rounded-md px-1.5 py-0.5">
                #{id.slice(0, 8)}
              </code>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {isRecording && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-red-500/22 bg-red-500/7 text-red-400 text-[10px] font-semibold" role="status" aria-live="polite">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-record" aria-hidden="true" />
              REC
            </div>
          )}
          <Badge variant="live" dot pulse>Live</Badge>
          <QualityIndicator quality={quality} />
          <span className="text-xs text-[#3F4D5C] tabular-nums hidden sm:block" aria-label={`Current time: ${now}`}>{now}</span>

          {/* Mobile panel toggle — relative wrapper fixes badge overflow */}
          <div className="relative md:hidden">
          <button
            onClick={() => setMobilePanelOpen(v => !v)}
            className="p-1.5 rounded-md text-[#3F4D5C] hover:bg-white/[0.05] hover:text-[#94A3B8] transition-colors"
            aria-label={mobilePanelOpen ? 'Close panel' : `Open ${activePanel} panel`}
            aria-expanded={mobilePanelOpen}
            aria-haspopup="dialog"
          >
            <MessageSquare size={14} aria-hidden="true" />
          </button>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center" aria-hidden="true">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          </div>

          {/* Desktop panel toggle */}
          <button
            onClick={() => setPanelOpen(v => !v)}
            className="p-1.5 rounded-md text-[#3F4D5C] hover:bg-white/[0.05] hover:text-[#94A3B8] transition-colors hidden md:flex"
            aria-label={panelOpen ? 'Close side panel' : 'Open side panel'}
            aria-expanded={panelOpen}
          >
            <ChevronRight size={14} className={clsx('transition-transform duration-200', panelOpen && 'rotate-180')} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Video area */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          <div className="flex-1 relative overflow-hidden">
            <VideoGrid />
          </div>
          <Controls />
        </div>

        {/* Desktop side panel */}
        <AnimatePresence>
          {panelOpen && (
            <div className="hidden md:flex">
              {SidePanelContent}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Mobile bottom-sheet panel ── */}
      <AnimatePresence>
        {mobilePanelOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobilePanelOpen(false)}
              aria-hidden="true"
            />
            {/* Sheet */}
            <motion.div
              className="fixed inset-x-0 bottom-0 z-50 md:hidden bg-[#09090E] rounded-t-2xl border-t border-[rgba(255,255,255,0.08)] flex flex-col"
              style={{ height: '70vh', maxHeight: '70vh' }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              role="dialog"
              aria-label="Meeting panel"
              aria-modal="true"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full bg-[rgba(255,255,255,0.1)]" aria-hidden="true" />
              </div>
              {/* Tab bar */}
              <div className="flex border-b border-[rgba(255,255,255,0.05)] shrink-0" role="tablist" aria-label="Panel sections">
                {PANELS.map(({ id: pid, label, icon: Icon, badge }) => (
                  <button key={pid} role="tab" aria-selected={activePanel === pid}
                    onClick={() => { setActivePanel(pid); if (pid === 'chat') setLastSeenCount(messages.length); }}
                    className={clsx('flex-1 flex flex-col items-center gap-1 py-3 min-h-[48px] transition-all relative',
                      activePanel === pid ? 'text-indigo-300' : 'text-[#2D3A4A] hover:text-[#64748B]')}>
                    {activePanel === pid && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-[2px] bg-indigo-500 rounded-full" aria-hidden="true" />}
                    <div className="relative">
                      <Icon size={15} aria-hidden="true" />
                      {badge !== undefined && badge !== false && (
                        <span className={clsx('absolute -top-1.5 -right-2 min-w-[14px] h-[14px] rounded-full text-[8px] font-bold flex items-center justify-center',
                          typeof badge === 'boolean' ? 'bg-indigo-500 w-2 h-2 min-w-0 top-0 -right-1' : 'bg-red-500 text-white px-[3px]')}>
                          {typeof badge === 'number' ? (badge > 9 ? '9+' : badge) : ''}
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] font-semibold leading-none" aria-hidden="true">{label}</span>
                  </button>
                ))}
              </div>
              {/* Content */}
              <div className="flex-1 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div key={activePanel} className="h-full"
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                    {activePanel === 'chat'         && <ChatBox meetingId={id ?? ''} />}
                    {activePanel === 'participants' && <ParticipantList />}
                    {activePanel === 'ai'           && <AIPanel meetingId={id ?? ''} />}
                    {activePanel === 'notes'        && <NotesPanel />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MeetingRoom;
