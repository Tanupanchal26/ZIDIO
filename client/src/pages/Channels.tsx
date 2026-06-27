import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Hash, Lock, Plus, Send, Users, ChevronLeft, Trash2, Circle } from 'lucide-react';
import { teamService, type Team, type Channel } from '../api/team.api';
import { channelService } from '../api/channel.api';
import { useAppSelector } from '../hooks/useAppDispatch';
import { useSocket, safeEmit } from '../hooks/useSocket';
import { useChatStore, type ChannelMessage } from '../store/chat/chat.store';
import { usePresence } from '../hooks/usePresence';
import { toChannel } from '../constants';
import { Button } from '../shared/ui/Button';
import { Modal } from '../shared/ui/Modal';
import Loader from '../components/common/Loader';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

const EMOJIS = ['👍', '❤️', '😂', '🎉', '🔥', '👀'];

/* ─── Delivery icon ────────────────────────────────────────────────────────── */
const DeliveryIcon = ({ state }: { state?: string }) => {
  if (state === 'sending')   return <span className="text-[9px] text-[var(--color-text-dim)]">⏳</span>;
  if (state === 'sent')      return <span className="text-[9px] text-[var(--color-text-dim)]">✓</span>;
  if (state === 'delivered') return <span className="text-[9px] text-[var(--color-text-muted)]">✓✓</span>;
  if (state === 'read')      return <span className="text-[9px] text-indigo-650">✓✓</span>;
  if (state === 'failed')    return <span className="text-[9px] text-red-500 font-bold">!</span>;
  return null;
};

/* ─── Typing indicator ─────────────────────────────────────────────────────── */
const TypingIndicator = ({ names }: { names: string[] }) => {
  if (!names.length) return null;
  const label = names.length === 1
    ? `${names[0]} is typing…`
    : `${names.slice(0, 2).join(', ')} are typing…`;
  return (
    <div className="flex items-center gap-2 px-5 py-1.5 bg-[var(--color-bg-tertiary)]/40 border-t border-[var(--color-border)]">
      <div className="flex gap-0.5">
        {[0, 1, 2].map(i => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)] animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
      <span className="text-[11px] text-[var(--color-text-muted)]">{label}</span>
    </div>
  );
};

/* ─── ChannelView ──────────────────────────────────────────────────────────── */
const ChannelView = ({ channel }: { channel: Channel }) => {
  const qc      = useQueryClient();
  const user    = useAppSelector((s) => s.auth.user);
  const { socket } = useSocket();
  const store   = useChatStore();
  const { isOnline } = usePresence();

  const [content,     setContent]     = useState('');
  const [showEmoji,   setShowEmoji]   = useState<string | null>(null);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const messages    = store.channelMessages[channel._id] ?? [];
  const typingNames = store.channelTyping[channel._id]   ?? [];

  /* ── Initial load ── */
  const { isLoading } = useQuery({
    queryKey: ['messages', channel._id],
    queryFn: () => channelService.getMessages(channel._id).then((r: any) => {
      const msgs: ChannelMessage[] = r.data?.data ?? r.data ?? [];
      store.initChannel(channel._id, msgs);
      return msgs;
    }),
    staleTime: Infinity, // socket keeps it fresh — no re-fetch
  });

  /* ── Socket room join/leave + event wiring ── */
  useEffect(() => {
    if (!socket || !channel._id) return;

    socket.emit('channel:join', channel._id);
    store.clearUnread(channel._id);

    // Mark last message as read
    const last = messages[messages.length - 1];
    if (last && user?.id) {
      safeEmit('channel:read', { channelId: channel._id, messageId: last._id });
      store.markChannelRead(channel._id, user.id, last._id);
    }

    const onMessage = (msg: ChannelMessage) => {
      store.appendChannelMsg(channel._id, msg);
      safeEmit('channel:delivered', { channelId: channel._id, messageId: msg._id });
    };
    const onTyping   = ({ userId, name, isTyping }: { userId: string; name: string; isTyping: boolean }) =>
      store.setChannelTyping(channel._id, userId, name, isTyping);
    const onReaction = ({ messageId, reactions }: any) =>
      store.updateMsgReactions(channel._id, messageId, reactions);
    const onDeleted  = ({ messageId }: { messageId: string }) =>
      store.setMessageDeleted(channel._id, messageId);
    const onEdited   = (msg: ChannelMessage) =>
      store.setMessageEdited(channel._id, msg);
    const onDelivery = ({ messageId, state }: { messageId: string; state: any }) =>
      store.updateMsgDelivery(channel._id, messageId, state);
    const onRead     = ({ userId, messageId }: { userId: string; messageId: string }) =>
      store.markChannelRead(channel._id, userId, messageId);

    socket.on('channel:message',   onMessage);
    socket.on('channel:typing',    onTyping);
    socket.on('chat:reaction',     onReaction);
    socket.on('chat:deleted',      onDeleted);
    socket.on('chat:edited',       onEdited);
    socket.on('channel:delivery',  onDelivery);
    socket.on('channel:read',      onRead);

    return () => {
      socket.off('channel:message',  onMessage);
      socket.off('channel:typing',   onTyping);
      socket.off('chat:reaction',    onReaction);
      socket.off('chat:deleted',     onDeleted);
      socket.off('chat:edited',      onEdited);
      socket.off('channel:delivery', onDelivery);
      socket.off('channel:read',     onRead);
      socket.emit('channel:leave',   channel._id);
    };
  }, [socket, channel._id]);

  /* ── Auto-scroll ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });

    const last = messages[messages.length - 1];
    if (last && user?.id) {
      safeEmit('channel:read', { channelId: channel._id, messageId: last._id });
      store.markChannelRead(channel._id, user.id, last._id);
    }
  }, [messages.length]);

  /* ── Typing ── */
  const handleTyping = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      safeEmit('channel:typing', { channelId: channel._id, isTyping: true });
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      isTypingRef.current = false;
      safeEmit('channel:typing', { channelId: channel._id, isTyping: false });
    }, 2000);
  }, [channel._id]);

  /* ── Send ── */
  const handleSend = useCallback(() => {
    const text = content.trim();
    if (!text || !user) return;

    if (isTypingRef.current) {
      isTypingRef.current = false;
      safeEmit('channel:typing', { channelId: channel._id, isTyping: false });
      if (typingTimer.current) clearTimeout(typingTimer.current);
    }

    const tempId = `temp_${Date.now()}`;
    const optimistic: ChannelMessage = {
      _id: tempId,
      content: text,
      sender: { _id: user.id, name: user.name },
      type: 'text',
      reactions: [],
      isEdited: false,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      delivery: 'sending',
    };
    store.appendChannelMsg(channel._id, optimistic);
    setContent('');

    safeEmit('channel:message', { channelId: channel._id, content: text });
  }, [content, user, channel._id]);

  /* ── React ── */
  const handleReact = useCallback((msgId: string, emoji: string) => {
    safeEmit('chat:react', { channelId: channel._id, messageId: msgId, emoji });
    setShowEmoji(null);
  }, [channel._id]);

  /* ── Delete ── */
  const deleteMutation = useMutation({
    mutationFn: (msgId: string) => channelService.deleteMessage(channel._id, msgId),
    onMutate: (msgId) => store.setMessageDeleted(channel._id, msgId),
    onError: () => toast.error('Delete failed'),
  });

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 bg-[var(--color-bg)]/10">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]/30 backdrop-blur-md flex-shrink-0">
        {channel.type === 'private'
          ? <Lock size={16} className="text-[var(--color-text-secondary)]" />
          : <Hash size={16} className="text-[var(--color-text-secondary)]" />}
        <div className="flex-1">
          <p className="font-bold text-[var(--color-text)] text-sm">{channel.name}</p>
          {channel.description && <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{channel.description}</p>}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4 min-h-0 scrollbar-thin">
        {isLoading ? (
          <div className="flex items-center justify-center h-full"><Loader /></div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center opacity-60">
            <Hash size={32} className="text-[var(--color-text-dim)]" />
            <p className="text-sm text-[var(--color-text-muted)]">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender._id === user?.id;
            return (
              <div key={msg._id} className={clsx('flex gap-3 group relative', isMine && 'flex-row-reverse')}>
                {/* Avatar with online dot */}
                <div className="relative flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6366F1] to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                    {msg.sender.name.charAt(0).toUpperCase()}
                  </div>
                  {isOnline(msg.sender._id) && (
                    <Circle size={8} className="absolute -bottom-0.5 -right-0.5 text-emerald-500 fill-emerald-500 ring-2 ring-[var(--color-bg-secondary)]" />
                  )}
                </div>

                <div className={clsx('flex flex-col gap-1 max-w-[70%]', isMine && 'items-end')}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--color-text-secondary)]">{msg.sender.name}</span>
                    <span className="text-[10px] text-[var(--color-text-dim)]">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isMine && <DeliveryIcon state={msg.delivery} />}
                  </div>

                  <div className={clsx(
                    'px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed transition-all border',
                    msg.isDeleted
                      ? 'italic text-[var(--color-text-dim)] bg-transparent border-dashed border-[var(--color-border)]'
                      : isMine
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm rounded-tr-none'
                        : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text)] border-[var(--color-border)] rounded-tl-none'
                  )}>
                    {msg.content}
                    {msg.isEdited && !msg.isDeleted && <span className="text-[10px] opacity-60 ml-1.5">(edited)</span>}
                  </div>

                  {/* Reactions */}
                  {msg.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {msg.reactions.map((r) => (
                        <button key={r.emoji} onClick={() => handleReact(msg._id, r.emoji)}
                          className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[11px] hover:border-[var(--color-border-strong)] text-[var(--color-text-secondary)] transition-colors cursor-pointer">
                          <span>{r.emoji}</span>
                          <span className="text-[var(--color-text-muted)] font-bold">{r.users.length}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Hover actions */}
                {!msg.isDeleted && (
                  <div className={clsx(
                    'absolute top-2.5 opacity-0 group-hover:opacity-100 flex items-center gap-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-2 py-1 shadow-md transition-opacity z-10',
                    isMine ? 'right-10' : 'left-10'
                  )}>
                    {/* Emoji quick-pick */}
                    <div className="relative">
                      <button onClick={() => setShowEmoji(showEmoji === msg._id ? null : msg._id)}
                        className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors text-xs cursor-pointer">
                        😊
                      </button>
                      {showEmoji === msg._id && (
                        <div className="absolute bottom-8 left-0 flex gap-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-2.5 py-1.5 shadow-lg z-20">
                          {EMOJIS.map((e) => (
                            <button key={e} onClick={() => handleReact(msg._id, e)}
                              className="text-base hover:scale-125 transition-transform cursor-pointer">{e}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    {isMine && (
                      <button onClick={() => deleteMutation.mutate(msg._id)}
                        className="p-1 text-[var(--color-text-muted)] hover:text-red-650 transition-colors cursor-pointer">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Typing indicator */}
      <TypingIndicator names={typingNames} />

      {/* Input */}
      <div className="px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)]/20 flex-shrink-0">
        <div className="flex items-end gap-3 bg-[var(--color-bg-tertiary)]/70 border border-[var(--color-border)] focus-within:border-[var(--color-border-strong)] focus-within:shadow-[0_0_0_3px_rgba(66,67,65,0.08)] rounded-2xl px-4 py-3 transition-all">
          <textarea
            value={content}
            onChange={(e) => { setContent(e.target.value); handleTyping(); }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={`Message #${channel.name}`}
            rows={1}
            className="flex-1 bg-transparent text-[13px] text-[var(--color-text)] placeholder-[var(--color-text-dim)] resize-none outline-none max-h-32"
          />
          <button onClick={handleSend} disabled={!content.trim()}
            className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-30 disabled:hover:bg-indigo-600 transition-all flex-shrink-0 shadow-[0_2px_8px_rgba(99,102,241,0.2)] cursor-pointer">
            <Send size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Channels (page) ───────────────────────────────────────────────────────── */
const Channels = () => {
  const { id: teamId, channelId } = useParams<{ id: string; channelId: string }>();
  const navigate  = useNavigate();
  const qc        = useQueryClient();
  const { unreadCounts } = useChatStore();
  const isAdmin = useAppSelector((s) => {
    const role = s.auth.user?.role;
    return role === 'admin' || role === 'super_admin';
  });
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', type: 'public' as 'public' | 'private' | 'announcement' });

  // Local state for when loaded via `/channels` (no URL parameters)
  const [localTeamId, setLocalTeamId] = useState<string | null>(null);
  const [localChannelId, setLocalChannelId] = useState<string | null>(null);

  // Fetch all teams to populate workspace dropdown on /channels
  const { data: allTeams = [], isLoading: allTeamsLoading } = useQuery<Team[]>({
    queryKey: ['teams'],
    queryFn: () => teamService.list().then((r: any) => r.data),
  });

  // Resolve active team: URL parameter takes priority, otherwise local selection or first team
  const activeTeamId = teamId ?? localTeamId ?? (allTeams.length > 0 ? allTeams[0]._id : null);

  // Set default team locally if on /channels
  useEffect(() => {
    if (!teamId && allTeams.length > 0 && !localTeamId) {
      setLocalTeamId(allTeams[0]._id);
    }
  }, [allTeams, teamId, localTeamId]);

  // Fetch active team details
  const { data: team, isLoading: teamLoading } = useQuery<Team>({
    queryKey: ['team', activeTeamId],
    queryFn: () => teamService.getById(activeTeamId!).then((r: any) => r.data),
    enabled: !!activeTeamId,
  });

  // Fetch channels of active team
  const { data: channels = [], isLoading: chLoading } = useQuery<Channel[]>({
    queryKey: ['channels', activeTeamId],
    queryFn: () => teamService.listChannels(activeTeamId!).then((r: any) => r.data),
    enabled: !!activeTeamId,
  });

  // Resolve active channel
  const activeChannel = channels.find((c) => c._id === (channelId ?? localChannelId)) ?? channels[0] ?? null;

  // Auto-redirect to first channel if on team-specific route
  useEffect(() => {
    if (teamId && !channelId && channels.length > 0) {
      navigate(toChannel(teamId, channels[0]._id), { replace: true });
    }
  }, [channels, channelId, teamId, navigate]);

  // Set default active channel locally if on /channels route
  useEffect(() => {
    if (!teamId && channels.length > 0 && !localChannelId) {
      setLocalChannelId(channels[0]._id);
    }
  }, [channels, teamId, localChannelId]);

  const createChannelMutation = useMutation({
    mutationFn: (data: typeof form) => teamService.createChannel(activeTeamId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['channels', activeTeamId] });
      toast.success('Channel created!');
      setShowCreate(false);
      setForm({ name: '', description: '', type: 'public' });
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to create channel'),
  });

  const handleChannelClick = (ch: Channel) => {
    if (teamId) {
      navigate(toChannel(teamId, ch._id));
    } else {
      setLocalChannelId(ch._id);
    }
  };

  const isLoading = (teamId ? teamLoading : (allTeamsLoading || teamLoading)) || chLoading;
  if (isLoading) return <Loader fullPage />;

  return (
    <div className="flex h-full animate-fade-in border border-[var(--color-border)] rounded-2xl overflow-hidden bg-[var(--color-surface)] shadow-md">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 flex flex-col bg-[var(--color-bg-secondary)]/50 border-r border-[var(--color-border)]">
        <div className="flex items-center gap-2 px-4 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-bg-tertiary)]/30">
          {teamId && (
            <button onClick={() => navigate('/teams')} className="p-1 rounded-lg hover:bg-black/5 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors cursor-pointer">
              <ChevronLeft size={15} />
            </button>
          )}
          <p className="font-bold text-sm text-[var(--color-text)] truncate flex-1">
            {teamId ? team?.name : (allTeams.find((t) => t._id === activeTeamId)?.name ?? 'Channels')}
          </p>
          <Users size={13} className="text-[var(--color-text-dim)]" />
        </div>

        {/* Workspace Dropdown for /channels route */}
        {!teamId && allTeams.length > 0 && (
          <div className="px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]/20">
            <label className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">Select Workspace</label>
            <select
              value={activeTeamId ?? ''}
              onChange={(e) => {
                setLocalTeamId(e.target.value);
                setLocalChannelId(null);
              }}
              className="w-full text-xs font-semibold bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3 py-2 outline-none focus:border-[var(--color-primary)] text-[var(--color-text)] cursor-pointer shadow-sm hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              {allTeams.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
          <div className="flex items-center justify-between px-2.5 py-1.5 mb-1">
            <span className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Channels</span>
            {isAdmin && (
              <button onClick={() => setShowCreate(true)} className="p-1 rounded-lg hover:bg-black/5 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors cursor-pointer">
                <Plus size={13} />
              </button>
            )}
          </div>

          <div className="flex flex-col gap-0.5">
            {channels.map((ch) => {
              const unread = unreadCounts[ch._id] ?? 0;
              const isActive = ch._id === activeChannel?._id;
              return (
                <button key={ch._id} onClick={() => handleChannelClick(ch)}
                  className={clsx(
                    'flex items-center gap-2 w-full px-3 py-2 rounded-xl text-[13px] transition-all text-left border cursor-pointer',
                    isActive
                      ? 'bg-indigo-50 text-indigo-750 border-indigo-150 font-bold shadow-sm'
                      : 'text-[var(--color-text-secondary)] hover:bg-black/5 hover:text-[var(--color-text)] border-transparent'
                  )}>
                  {ch.type === 'private' ? <Lock size={13} /> : <Hash size={13} />}
                  <span className="truncate flex-1">{ch.name}</span>
                  {unread > 0 && (
                    <span className="ml-auto text-[9px] bg-indigo-600 text-white rounded-full px-1.5 py-0.5 font-bold shadow-sm">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                  {ch.isDefault && !unread && (
                    <span className="ml-auto text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-150 px-1.5 py-0.5 rounded-full">default</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-4 py-3 border-t border-[var(--color-border)] bg-[var(--color-bg-tertiary)]/30">
          <p className="text-xs text-[var(--color-text-secondary)] flex items-center gap-2 font-semibold">
            <Users size={13} className="text-indigo-600" />
            {team?.members?.length ?? 0} members
          </p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 bg-[var(--color-bg)]/5">
        {activeChannel ? (
          <ChannelView channel={activeChannel} />
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center opacity-70">
            <Hash size={36} className="text-[var(--color-text-dim)]" />
            <p className="text-[var(--color-text-muted)] text-sm font-semibold">Select a channel</p>
            {isAdmin && (
              <Button onClick={() => setShowCreate(true)} className="gap-2"><Plus size={14} /> Create Channel</Button>
            )}
          </div>
        )}
      </main>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Channel">
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 block uppercase tracking-wider">Channel Name *</label>
            <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. general" className="input-light" />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 block uppercase tracking-wider">Description</label>
            <input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="What is this channel for?" className="input-light" />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 block uppercase tracking-wider">Type</label>
            <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as any }))} className="input-light bg-white border-[var(--color-border)] w-full">
              <option value="public">Public</option>
              <option value="private">Private</option>
              <option value="announcement">Announcement</option>
            </select>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button className="flex-1" onClick={() => createChannelMutation.mutate(form)}
              disabled={!form.name.trim() || createChannelMutation.isPending}>
              {createChannelMutation.isPending ? 'Creating...' : 'Create Channel'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Channels;
