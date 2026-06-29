const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export function createWebSocket(token: string, topics: string[]) {
	return new WebSocket(`${API_BASE_URL}/ws?token=${token}&topics=${topics.join()}`);
}