import { createWebSocket } from '@/utils/ws';

export interface WsPacket {
  packet_type: string;
  payload: unknown;
}

type Listener = (packet: WsPacket) => void;

let socket: WebSocket | null = null;
let currentToken: string | null = null;
let reconnectAttempt = 0;
let reconnectTimer: number | null = null;
const listeners = new Set<Listener>();

const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 10000;

/* Nothing else ever detects a silently-dropped connection (idle/proxy
   timeout, laptop sleep, a backend restart) — readyState keeps reporting
   OPEN right up until the browser notices, so without this the page just
   goes dead until the user manually reloads. onopen re-broadcasts a
   synthetic packet so pages that depend on live state (e.g. the poker
   table) know to re-sync instead of sitting on a stale snapshot. */
export function connectWebSocket(token: string): WebSocket {
  currentToken = token;
  if (reconnectTimer !== null) {
    window.clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (socket && socket.readyState === WebSocket.OPEN) {
    return socket;
  }
  socket = createWebSocket(token, ['generic', 'notification', 'game']);
  socket.onopen = () => {
    reconnectAttempt = 0;
    listeners.forEach((listener) => listener({ packet_type: 'ws_reconnected', payload: {} }));
  };
  socket.onmessage = (e) => {
    try {
      const packet = JSON.parse(e.data) as WsPacket;
      listeners.forEach((listener) => listener(packet));
    } catch {
      // ignore malformed packet
    }
  };
  socket.onclose = () => {
    socket = null;
    scheduleReconnect();
  };
  return socket;
}

function scheduleReconnect() {
  if (!currentToken) return;
  const delay = Math.min(RECONNECT_BASE_DELAY_MS * 2 ** reconnectAttempt, RECONNECT_MAX_DELAY_MS);
  reconnectAttempt += 1;
  const token = currentToken;
  reconnectTimer = window.setTimeout(() => {
    if (currentToken === token) connectWebSocket(token);
  }, delay);
}

export function disconnectWebSocket() {
  currentToken = null;
  if (reconnectTimer !== null) {
    window.clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  socket?.close();
  socket = null;
}

export function subscribeToWebSocket(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function sendWebSocketPacket(packetType: string, payload: unknown = {}) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify({ packet_type: packetType, payload }));
}
