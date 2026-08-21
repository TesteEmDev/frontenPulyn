const WS_AUTH_PROTOCOL = 'pulyn-auth';

export function createAuthenticatedWebSocket(url: string, token?: string | null): WebSocket {
  if (!token) return new WebSocket(url);

  // O token não vai mais na URL. O servidor negocia somente o protocolo
  // fixo "pulyn-auth" e usa o segundo valor apenas durante o handshake.
  return new WebSocket(url, [WS_AUTH_PROTOCOL, token]);
}
