import { createWebSocket } from '@/utils/ws';

export interface WsPacket {
  packet_type: string;
  payload: unknown;
}

type Listener = (packet: WsPacket) => void;

let socket: WebSocket | null = null;
const listeners = new Set<Listener>();

export function connectWebSocket(token: string): WebSocket {
  if (socket && socket.readyState === WebSocket.OPEN) {
    return socket;
  }
  socket = createWebSocket(token, ['generic', 'notification']);
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
  };
  return socket;
}

export function disconnectWebSocket() {
  socket?.close();
  socket = null;
}

export function subscribeToWebSocket(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
