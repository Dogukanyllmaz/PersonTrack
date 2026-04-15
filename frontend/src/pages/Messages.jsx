import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChatHub } from '../hooks/useChatHub';
import {
  getConversations, startConversation,
  getMessages, deleteMessage, deleteConversation, getMessageUsers
} from '../services/api';
import { useToast } from '../context/ToastContext';
import ConfirmDialog from '../components/ConfirmDialog';

// ── helpers ───────────────────────────────────────────────────────────────────
function formatTime(dt) {
  const d = new Date(dt);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
}

function Avatar({ name, size = 'sm' }) {
  const initials = (name ?? '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const colors = ['bg-blue-500','bg-purple-500','bg-green-500','bg-orange-500','bg-pink-500','bg-teal-500'];
  const color = colors[(name ?? '').charCodeAt(0) % colors.length];
  const sz = size === 'lg' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs';
  return (
    <div className={`${sz} ${color} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}>
      {initials}
    </div>
  );
}

// ── New Conversation Modal ─────────────────────────────────────────────────────
function NewConvModal({ onStart, onClose }) {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    getMessageUsers().then(r => setUsers(r.data)).catch(() => {});
  }, []);

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(filter.toLowerCase()) ||
    u.email.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-900">Yeni Konuşma</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-4">
          <input
            value={filter} onChange={e => setFilter(e.target.value)}
            placeholder="Kullanıcı ara..."
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            autoFocus
          />
        </div>
        <div className="max-h-72 overflow-y-auto px-2 pb-3 space-y-0.5">
          {filtered.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-6">Kullanıcı bulunamadı</p>
          )}
          {filtered.map(u => (
            <button key={u.id} onClick={() => onStart(u.id, u.username)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 text-left">
              <Avatar name={u.username} />
              <div>
                <p className="text-sm font-medium text-gray-900">{u.username}</p>
                <p className="text-xs text-gray-400">{u.email} · {u.role}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Message bubble ─────────────────────────────────────────────────────────────
function Bubble({ msg, isOwn, onDelete }) {
  const [hover, setHover] = useState(false);
  return (
    <div className={`flex gap-2 group ${isOwn ? 'flex-row-reverse' : ''}`}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      {!isOwn && <Avatar name={msg.senderName} size="sm" />}
      <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
        {!isOwn && <p className="text-xs text-gray-400 px-1">{msg.senderName}</p>}
        <div className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
          isOwn
            ? 'bg-blue-600 text-white rounded-tr-sm'
            : 'bg-white border text-gray-800 rounded-tl-sm shadow-sm'
        }`}>
          {msg.content}
        </div>
        <p className="text-[10px] text-gray-400 px-1">{formatTime(msg.createdAt)}</p>
      </div>
      {isOwn && hover && (
        <button onClick={() => onDelete(msg.id)}
          className="self-center text-gray-300 hover:text-red-400 text-sm opacity-0 group-hover:opacity-100 transition-opacity p-1">
          🗑️
        </button>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function Messages() {
  const { user } = useAuth();
  const toast = useToast();
  const [conversations, setConversations]     = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [activeId, setActiveId]               = useState(null);
  const [messages, setMessages]               = useState([]);
  const [input, setInput]                     = useState('');
  const [loadingMsgs, setLoadingMsgs]         = useState(false);
  const [showNewConv, setShowNewConv]         = useState(false);
  const [sending, setSending]                 = useState(false);
  const [confirmMsg, setConfirmMsg]           = useState(null);
  const [confirmDelConv, setConfirmDelConv]   = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);
  const activeIdRef    = useRef(null);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  // ── SignalR ────────────────────────────────────────────────────────────
  const handleIncomingMessage = useCallback((msg) => {
    // Normalize IDs to numbers for reliable comparison
    const msgSenderId  = Number(msg.senderId  ?? msg.SenderId);
    const msgConvId    = Number(msg.conversationId ?? msg.ConversationId);
    const myId         = Number(user?.id);
    const normalizedMsg = {
      id:             Number(msg.id ?? msg.Id),
      conversationId: msgConvId,
      content:        msg.content ?? msg.Content ?? '',
      createdAt:      msg.createdAt ?? msg.CreatedAt,
      senderId:       msgSenderId,
      senderName:     msg.senderName ?? msg.SenderName ?? '?',
    };

    // Add to active conversation's messages
    const curActiveId = activeIdRef.current;
    if (msgConvId === Number(curActiveId)) {
      setMessages(prev =>
        prev.find(m => m.id === normalizedMsg.id) ? prev : [...prev, normalizedMsg]
      );
    } else if (msgSenderId !== myId) {
      // Show toast for messages in OTHER conversations
      toast.info(`💬 ${normalizedMsg.senderName}: ${normalizedMsg.content.slice(0, 60)}`, 5000);
    }

    // Update conversation list preview + unread
    setConversations(prev => prev.map(c => {
      if (c.conversationId !== msgConvId) return c;
      const isActiveConv = msgConvId === Number(curActiveId);
      return {
        ...c,
        lastMessage: { content: normalizedMsg.content, createdAt: normalizedMsg.createdAt, senderId: msgSenderId },
        unreadCount: isActiveConv ? 0 : (c.unreadCount ?? 0) + (msgSenderId !== myId ? 1 : 0),
        lastActivity: normalizedMsg.createdAt
      };
    }));
  }, [user?.id, toast]);

  const handleRead = useCallback(({ conversationId }) => {
    setConversations(prev => prev.map(c =>
      c.conversationId === conversationId ? { ...c, unreadCount: 0 } : c
    ));
  }, []);

  const { sendMessage, markRead } = useChatHub({ onMessage: handleIncomingMessage, onRead: handleRead });

  // ── Load conversations ─────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    setConversationsLoading(true);
    try {
      const res = await getConversations();
      setConversations(res.data);
    } catch {}
    finally { setConversationsLoading(false); }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // ── Open conversation ──────────────────────────────────────────────────
  const openConversation = useCallback(async (convId) => {
    setActiveId(convId);
    setLoadingMsgs(true);
    try {
      const res = await getMessages(convId, { page: 1, pageSize: 100 });
      setMessages(res.data.messages);
      markRead(convId);
      setConversations(prev => prev.map(c =>
        c.conversationId === convId ? { ...c, unreadCount: 0 } : c
      ));
    } catch {}
    finally { setLoadingMsgs(false); }
    inputRef.current?.focus();
  }, [markRead]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send ───────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const content = input.trim();
    if (!content || !activeId || sending) return;
    setInput('');
    setSending(true);

    try {
      await sendMessage(activeId, content);
      // Hub broadcasts ReceiveMessage back to sender too — message appears via SignalR
    } catch {
      setInput(content); // restore on failure
    } finally { setSending(false); }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Delete message ─────────────────────────────────────────────────────
  const handleDeleteMessage = async (msgId) => {
    try {
      await deleteMessage(msgId);
      setMessages(prev => prev.filter(m => m.id !== msgId));
    } catch {}
  };

  // ── Delete conversation ────────────────────────────────────────────────
  const handleDeleteConversation = async (convId) => {
    try {
      await deleteConversation(convId);
      setConversations(prev => prev.filter(c => c.conversationId !== convId));
      if (activeId === convId) { setActiveId(null); setMessages([]); }
    } catch {}
    setConfirmDelConv(null);
  };

  // ── Start new conversation ─────────────────────────────────────────────
  const handleStartConversation = async (targetUserId) => {
    setShowNewConv(false);
    try {
      const res = await startConversation(targetUserId);
      const convId = res.data.conversationId;
      await loadConversations();
      openConversation(convId);
    } catch {}
  };

  const activeConv = conversations.find(c => c.conversationId === activeId);

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white rounded-2xl border shadow-sm overflow-hidden">
      {/* ── Left panel: conversation list ── */}
      <div className="w-72 border-r flex flex-col flex-shrink-0">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Mesajlar</h2>
            <button onClick={() => setShowNewConv(true)}
              className="w-7 h-7 bg-blue-600 text-white rounded-full text-lg leading-none hover:bg-blue-700 flex items-center justify-center">
              +
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversationsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">
              <p className="text-2xl mb-2">💬</p>
              <p className="font-medium">Henüz mesaj yok</p>
              <p className="text-xs mt-1">Yeni konuşma başlatmak için + butonuna tıklayın</p>
            </div>
          ) : null}
          {conversations.map(conv => {
            const other = conv.otherUsers?.[0];
            const isActive = conv.conversationId === activeId;
            const myId = Number(user?.id);
            return (
              <div key={conv.conversationId} className={`relative group border-b border-gray-50 ${isActive ? 'bg-blue-50 border-r-2 border-r-blue-500' : ''}`}>
                <button
                  onClick={() => openConversation(conv.conversationId)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left transition-colors pr-10">
                  <div className="relative flex-shrink-0">
                    <Avatar name={other?.username ?? '?'} />
                    {(conv.unreadCount ?? 0) > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm truncate ${(conv.unreadCount ?? 0) > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-800'}`}>
                        {other?.username ?? 'Bilinmeyen'}
                      </p>
                      {conv.lastMessage && (
                        <p className="text-[10px] text-gray-400 flex-shrink-0 ml-1">
                          {formatTime(conv.lastMessage.createdAt)}
                        </p>
                      )}
                    </div>
                    <p className={`text-xs truncate mt-0.5 ${(conv.unreadCount ?? 0) > 0 ? 'text-gray-700' : 'text-gray-400'}`}>
                      {conv.lastMessage
                        ? (Number(conv.lastMessage.senderId) === myId ? 'Sen: ' : '') + conv.lastMessage.content
                        : 'Henüz mesaj yok'}
                    </p>
                  </div>
                </button>
                {/* Delete conversation button — visible on hover */}
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDelConv(conv.conversationId); }}
                  title="Konuşmayı sil"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all">
                  🗑️
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right panel: chat area ── */}
      <div className="flex-1 flex flex-col">
        {!activeId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <p className="text-5xl mb-4">💬</p>
            <p className="font-medium text-gray-600">Bir konuşma seçin</p>
            <p className="text-sm mt-1">veya yeni bir konuşma başlatın</p>
            <button onClick={() => setShowNewConv(true)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700">
              Yeni konuşma başlat
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-5 py-3 border-b flex items-center gap-3 bg-white">
              <Avatar name={activeConv?.otherUsers?.[0]?.username} size="lg" />
              <div>
                <p className="font-semibold text-gray-900">
                  {activeConv?.otherUsers?.[0]?.username ?? 'Konuşma'}
                </p>
                <p className="text-xs text-gray-400">
                  {activeConv?.otherUsers?.[0]?.email}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-gray-50">
              {loadingMsgs ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full flex-col gap-2 text-gray-400">
                  <p className="text-3xl">👋</p>
                  <p className="text-sm">Konuşmayı başlatın</p>
                </div>
              ) : (
                messages.map(msg => (
                  <Bubble
                    key={msg.id}
                    msg={msg}
                    isOwn={Number(msg.senderId) === Number(user?.id)}
                    onDelete={(id) => setConfirmMsg(id)}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t bg-white">
              <div className="flex items-end gap-2 bg-gray-100 rounded-2xl px-4 py-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Mesaj yaz... (Enter göndermek için, Shift+Enter yeni satır)"
                  rows={1}
                  className="flex-1 bg-transparent text-sm resize-none outline-none py-1 max-h-32 leading-relaxed"
                  style={{ height: 'auto', minHeight: '24px' }}
                  onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 mb-0.5"
                >
                  <svg className="w-4 h-4 rotate-90" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M2 21L23 12 2 3v7l15 2-15 2v7z"/>
                  </svg>
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5 px-1">
                Enter göndermek için · Shift+Enter yeni satır
              </p>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmMsg}
        title="Mesajı Sil"
        message="Bu mesaj kalıcı olarak silinecek."
        confirmLabel="Sil"
        variant="danger"
        onConfirm={() => { handleDeleteMessage(confirmMsg); setConfirmMsg(null); }}
        onCancel={() => setConfirmMsg(null)}
      />
      <ConfirmDialog
        open={!!confirmDelConv}
        title="Konuşmayı Sil"
        message="Bu konuşma listenizden kaldırılacak. Diğer katılımcı etkilenmez."
        confirmLabel="Sil"
        variant="danger"
        onConfirm={() => handleDeleteConversation(confirmDelConv)}
        onCancel={() => setConfirmDelConv(null)}
      />

      {/* New conversation modal */}
      {showNewConv && (
        <NewConvModal
          onStart={handleStartConversation}
          onClose={() => setShowNewConv(false)}
        />
      )}
    </div>
  );
}
