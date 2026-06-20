import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Hash, Lock, Plus, Send, Users, ChevronLeft, Trash2, Circle } from 'lucide-react';
import { teamService, type Team, type Channel } from '../services/team.service';
import { channelService } from '../services/channel.service';
import { useAppSelector } from '../hooks/useAppDispatch';
import { useSocket, safeEmit } from '../hooks/useSocket';
import { useChatStore, type ChannelMessage } from '../store/chat.store';
import { usePresence } from '../hooks/usePresence';
import { toChannel } from '../constants';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

const EMOJIS = ['👍', '❤️', '😂', '🎉', '🔥', '👀'];

/* ─── Delivery icon ────────────────────────────────────────────────────────── */
const DeliveryIcon = ({ state }: { state?: string }) => {
  if (state === 'sending')   return <span className="text-[9px] text-[var(--color-text-dim)]">⏳</span>;
  if (state === 'sent')      return <span className="text-[9px] text-[var(--color-text-dim)]">✓</span>;
  if (state === 'delivered') return <span className="text-[9px] text-[var(--color-text-muted)]">✓✓</span>;
  if (state === 'read')      return <span className="text-[9px] text-blue-400">✓✓</span>;
  if (state === 'failed')    return <span className="text-[9px] text-red-400">!</span>;
  return null;
};

/* ─── Typing indicator ─────────────────────────────────────────────────────── */
const TypingIndicator = ({ names }: { names: string[] }) => {
  if (!names.length) return null;
  const label = names.length === 1
    ? `${names[0]} is typing…`
    : `${names.slice(0, 2).join(', ')} are typing…`;
  return (
    <div className="flex items-center gap-2 px-5 py-1.5">
      <div className="flex gap-0.5">
        {[0, 1, 2].map(i => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-dim)] animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
      <span className="text-[11px] text-[var(--color-text-dim)]">{label}</span>
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
      const msgs: ChannelMessage[] = r.data?.data ?? [];
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
    if (last && user?._id) {
      safeEmit('channel:read', { channelId: channel._id, messageId: last._id });
      store.markChannelRead(channel._id, user._id, last._id);
    }

    const onMessage = (msg: ChannelMessage) => {
      store.appendChannelMsg(channel._id, msg);
      // ACK delivery back to sender
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

    // Send read receipt for last message
    const last = messages[messages.length - 1];
    if (last && user?._id) {
      safeEmit('channel:read', { channelId: channel._id, messageId: last._id });
      store.markChannelRead(channel._id, user._id, last._id);
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

    // Stop typing indicator
    if (isTypingRef.current) {
      isTypingRef.current = false;
      safeEmit('channel:typing', { channelId: channel._id, isTyping: false });
      if (typingTimer.current) clearTimeout(typingTimer.current);
    }

    // Optimistic message
    const tempId = `temp_${Date.now()}`;
    const optimistic: ChannelMessage = {
      _id: tempId,
      content: text,
      sender: { _id: user._id!, name: user.name },
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
    <div className="flex flex-col flex-1 h-full min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-[var(--color-border)] flex-shrink-0">
        {channel.type === 'private'
          ? <Lock size={16} className="text-[var(--color-text-muted)]" />
          : <Hash size={16} className="text-[var(--color-text-muted)]" />}
        <div className="flex-1">
          <p className="font-semibold text-[var(--color-text)] text-sm">{channel.name}</p>
          {channel.description && <p className="text-xs text-[var(--color-text-dim)]">{channel.description}</p>}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full"><Loader /></div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <Hash size={32} className="text-[var(--color-text-dim)]" />
            <p className="text-sm text-[var(--color-text-muted)]">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender._id === user?._id;
            return (
              <div key={msg._id} className={clsx('flex gap-3 group relative', isMine && 'flex-row-reverse')}>
                {/* Avatar with online dot */}
                <div className="relative flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                    {msg.sender.name.charAt(0).toUpperCase()}
                  </div>
                  {isOnline(msg.sender._id) && (
                    <Circle size={8} className="absolute -bottom-0.5 -right-0.5 text-green-400 fill-green-400" />
                  )}
                </div>

                <div className={clsx('flex flex-col gap-1 max-w-[70%]', isMine && 'items-end')}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[var(--color-text-muted)]">{msg.sender.name}</span>
                    <span className="text-[10px] text-[var(--color-text-dim)]">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isMine && <DeliveryIcon state={msg.delivery} />}
                  </div>

                  <div className={clsx(
                    'px-3 py-2 rounded-xl text-sm',
                    msg.isDeleted
                      ? 'italic text-[var(--color-text-dim)] bg-transparent'
                      : isMine
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'bg-[var(--color-surface-2)] text-[var(--color-text)]'
                  )}>
                    {msg.content}
                    {msg.isEdited && !msg.isDeleted && <span className="text-[10px] opacity-60 ml-1">(edited)</span>}
                  </div>

                  {/* Reactions */}
                  {msg.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {msg.reactions.map((r) => (
                        <button key={r.emoji} onClick={() => handleReact(msg._id, r.emoji)}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-xs hover:border-[var(--color-primary)]/50 transition-colors">
                          <span>{r.emoji}</span>
                          <span className="text-[var(--color-text-dim)]">{r.users.length}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Hover actions */}
                {!msg.isDeleted && (
                  <div className={clsx(
                    'absolute top-0 opacity-0 group-hover:opacity-100 flex items-center gap-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-1.5 py-1 shadow-lg transition-opacity z-10',
                    isMine ? 'right-10' : 'left-10'
                  )}>
                    {/* Emoji quick-pick */}
                    <div className="relative">
                      <button onClick={() => setShowEmoji(showEmoji === msg._id ? null : msg._id)}
                        className="p-1 text-[var(--color-text-dim)] hover:text-[var(--color-text)] transition-colors text-xs">
                        😊
                      </button>
                      {showEmoji === msg._id && (
                        <div className="absolute bottom-7 left-0 flex gap-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-2 py-1.5 shadow-xl z-20">
                          {EMOJIS.map((e) => (
                            <button key={e} onClick={() => handleReact(msg._id, e)}
                              className="text-base hover:scale-125 transition-transform">{e}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    {isMine && (
                      <button onClick={() => deleteMutation.mutate(msg._id)}
                        className="p-1 text-[var(--color-text-dim)] hover:text-red-400 transition-colors">
                        <Trash2 size={11} />
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
      <div className="px-5 py-4 border-t border-[var(--color-border)] flex-shrink-0">
        <div className="flex items-end gap-3 bg-[var(--color-surface-2)] rounded-xl border border-[var(--color-border)] px-3 py-2 focus-within:border-[var(--color-primary)]/50 transition-colors">
          <textarea
            value={content}
            onChange={(e) => { setContent(e.target.value); handleTyping(); }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={`Message #${channel.name}`}
            rows={1}
            className="flex-1 bg-transparent text-sm text-[var(--color-text)] placeholder-[var(--color-text-dim)] resize-none outline-none max-h-32"
          />
          <button onClick={handleSend} disabled={!content.trim()}
            className="p-1.5 rounded-lg bg-[var(--color-primary)] text-white hover:opacity-90 disabled:opacity-40 transition-opacity flex-shrink-0">
            <Send size={14} />
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
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', type: 'public' as 'public' | 'private' | 'announcement' });

  const { data: team, isLoading: teamLoading } = useQuery<Team>({
    queryKey: ['team', teamId],
    queryFn: () => teamService.getById(teamId!).then((r: any) => r.data),
    enabled: !!teamId,
  });

  const { data: channels = [], isLoading: chLoading } = useQuery<Channel[]>({
    queryKey: ['channels', teamId],
    queryFn: () => teamService.listChannels(teamId!).then((r: any) => r.data),
    enabled: !!teamId,
  });

  const activeChannel = channels.find((c) => c._id === channelId) ?? channels[0] ?? null;

  useEffect(() => {
    if (!channelId && channels.length > 0 && teamId) {
      navigate(toChannel(teamId, channels[0]._id), { replace: true });
    }
  }, [channels, channelId, teamId]);

  const createChannelMutation = useMutation({
    mutationFn: (data: typeof form) => teamService.createChannel(teamId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['channels', teamId] });
      toast.success('Channel created!');
      setShowCreate(false);
      setForm({ name: '', description: '', type: 'public' });
    },
    onError: () => toast.error('Failed to create channel'),
  });

  if (teamLoading || chLoading) return <Loader fullPage />;

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-6 animate-fade-in">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 flex flex-col bg-[var(--color-surface)] border-r border-[var(--color-border)]">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border)]">
          <button onClick={() => navigate('/teams')} className="p-1 rounded hover:bg-[var(--color-surface-2)] text-[var(--color-text-dim)]">
            <ChevronLeft size={15} />
          </button>
          <p className="font-semibold text-sm text-[var(--color-text)] truncate flex-1">{team?.name}</p>
          <Users size={13} className="text-[var(--color-text-dim)]" />
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <div className="flex items-center justify-between px-2 py-1 mb-1">
            <span className="text-[10px] font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">Channels</span>
            <button onClick={() => setShowCreate(true)} className="p-0.5 rounded hover:bg-[var(--color-surface-2)] text-[var(--color-text-dim)]">
              <Plus size={13} />
            </button>
          </div>

          {channels.map((ch) => {
            const unread = unreadCounts[ch._id] ?? 0;
            return (
              <button key={ch._id} onClick={() => navigate(toChannel(teamId!, ch._id))}
                className={clsx(
                  'flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-sm transition-colors',
                  ch._id === activeChannel?._id
                    ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)] font-medium'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)]'
                )}>
                {ch.type === 'private' ? <Lock size={13} /> : <Hash size={13} />}
                <span className="truncate flex-1">{ch.name}</span>
                {unread > 0 && (
                  <span className="ml-auto text-[9px] bg-[var(--color-primary)] text-white rounded-full px-1.5 py-0.5 font-bold">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
                {ch.isDefault && !unread && (
                  <span className="ml-auto text-[9px] bg-[var(--color-primary)]/20 text-[var(--color-primary)] px-1.5 py-0.5 rounded-full">default</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="px-4 py-3 border-t border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-dim)] flex items-center gap-1.5">
            <Users size={12} />
            {team?.members?.length ?? 0} members
          </p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        {activeChannel ? (
          <ChannelView channel={activeChannel} />
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 gap-3">
            <Hash size={36} className="text-[var(--color-text-dim)]" />
            <p className="text-[var(--color-text-muted)]">Select or create a channel</p>
            <Button onClick={() => setShowCreate(true)} className="gap-2"><Plus size={14} /> Create Channel</Button>
          </div>
        )}
      </main>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Channel">
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium text-[var(--color-text-muted)] block mb-1.5">Channel Name *</label>
            <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. general" className="input-dark" />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--color-text-muted)] block mb-1.5">Description</label>
            <input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="What is this channel for?" className="input-dark" />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--color-text-muted)] block mb-1.5">Type</label>
            <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as any }))} className="input-dark">
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
