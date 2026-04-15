import { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';

const HUB_URL = '/hubs/chat';

// ── Shared connection context ─────────────────────────────────────────────────
const ChatHubContext = createContext(null);

/**
 * Mount once at the app root (inside AuthProvider, after login).
 * All consumers share the single WebSocket connection.
 */
export function ChatHubProvider({ children }) {
  const connectionRef = useRef(null);
  // Sets of listener callbacks registered by consumers
  const messageListeners = useRef(new Set());
  const readListeners    = useRef(new Set());

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Track recently delivered message IDs to prevent any duplicate delivery
    const seenIds = new Set();

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        accessTokenFactory: () => localStorage.getItem('token') ?? '',
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    // Fan-out to all registered listeners — with server-side dedup guard
    connection.on('ReceiveMessage', (msg) => {
      if (seenIds.has(msg.id)) return;
      seenIds.add(msg.id);
      setTimeout(() => seenIds.delete(msg.id), 10000); // cleanup after 10s
      messageListeners.current.forEach(fn => fn(msg));
    });
    connection.on('MessagesRead', (data) => {
      readListeners.current.forEach(fn => fn(data));
    });

    connection.start().catch(err =>
      console.warn('[ChatHub] connection failed:', err)
    );
    connectionRef.current = connection;

    return () => { connection.stop(); };
  }, []);

  const sendMessage = useCallback((conversationId, content) => {
    const conn = connectionRef.current;
    if (conn?.state === signalR.HubConnectionState.Connected)
      return conn.invoke('SendMessage', conversationId, content);
    return Promise.reject(new Error('Hub not connected'));
  }, []);

  const markRead = useCallback((conversationId) => {
    const conn = connectionRef.current;
    if (conn?.state === signalR.HubConnectionState.Connected)
      return conn.invoke('MarkRead', conversationId);
    return Promise.resolve();
  }, []);

  return (
    <ChatHubContext.Provider value={{ sendMessage, markRead, messageListeners, readListeners }}>
      {children}
    </ChatHubContext.Provider>
  );
}

/**
 * Subscribe to hub events from any component.
 * Handlers are de-registered automatically on unmount.
 */
export function useChatHub({ onMessage, onRead } = {}) {
  const ctx = useContext(ChatHubContext);

  // Keep stable refs so we don't re-register on every render
  const onMessageRef = useRef(onMessage);
  const onReadRef    = useRef(onRead);
  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);
  useEffect(() => { onReadRef.current    = onRead;    }, [onRead]);

  useEffect(() => {
    if (!ctx) return;

    const msgFn  = (msg)  => onMessageRef.current?.(msg);
    const readFn = (data) => onReadRef.current?.(data);

    ctx.messageListeners.current.add(msgFn);
    ctx.readListeners.current.add(readFn);

    return () => {
      ctx.messageListeners.current.delete(msgFn);
      ctx.readListeners.current.delete(readFn);
    };
  }, [ctx]);

  return {
    sendMessage: ctx?.sendMessage ?? (() => Promise.reject()),
    markRead:    ctx?.markRead    ?? (() => Promise.resolve()),
  };
}
