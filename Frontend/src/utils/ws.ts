export function createWebSocket(token: string, topics: string[]) {
	return new WebSocket("http://localhost:8080/ws?token=" + token + "&topics=" + topics.join());
}