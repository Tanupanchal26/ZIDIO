import { useEffect } from 'react';
import { useSocket, safeEmit } from './useSocket';
import { useChatStore } from '../store/chat/chat.store';
import type { ChatMessage } from '../store/chat/chat.store';

export const useChat = (meetingId: string) => {
  const { socket } = useSocket();
  const { messages, typingUsers, addMessage, setTyping } = useChatStore();

  useEffect(() => {
    if (!socket || !meetingId) return;
    socket.emit('chat:join', meetingId);

    const onMsg    = (msg: ChatMessage) => addMessage(msg);
    const onTyping = ({ name, isTyping }: { name: string; isTyping: boolean }) =>
      setTyping(name, isTyping);

    socket.on('chat:message', onMsg);
    socket.on('chat:typing',  onTyping);

    return () => {
      socket.off('chat:message', onMsg);
      socket.off('chat:typing',  onTyping);
      socket.emit('chat:leave', meetingId);
    };
  }, [meetingId, socket]);

  const sendMessage = (content: string, sender: { id: string; name: string }) => {
    const msg: ChatMessage = {
      id: Date.now().toString(),
      senderId: sender.id,
      senderName: sender.name,
      content,
      timestamp: new Date().toISOString(),
    };
    safeEmit('chat:message', { meetingId, content });
    addMessage(msg);
  };

  const sendTyping = (name: string, isTyping: boolean) =>
    safeEmit('chat:typing', { meetingId, name, isTyping });

  return { messages, typingUsers, sendMessage, sendTyping };
};
