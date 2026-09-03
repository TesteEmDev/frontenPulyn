const WS_AUTH_PROTOCOL = 'pulyn-auth';

function hasRepeatedHost(hostname: string) {
  const host = hostname.toLowerCase();
  for (let partLength = 1; partLength <= host.length / 2; partLength += 1) {
    if (host.length % partLength !== 0) continue;
    const repetitions = host.length / partLength;
    if (repetitions > 1 && host === host.slice(0, partLength).repeat(repetitions)) {
      return true;
    }
  }
  return false;
}

function toWebSocketOrigin(value: string | undefined | null) {
  const rawValue = String(value || '').trim();
  if (!rawValue) return null;

  try {
    const parsed = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(rawValue) ? rawValue : `https://${rawValue}`);
    if (!['http:', 'https:', 'ws:', 'wss:'].includes(parsed.protocol)) return null;
    if (!parsed.hostname || hasRepeatedHost(parsed.hostname)) return null;

    const protocol = parsed.protocol === 'http:' || parsed.protocol === 'ws:' ? 'ws:' : 'wss:';
    return `${protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

export function getWebSocketServerUrl(fallbackApiUrl?: string) {
  const configuredUrl = toWebSocketOrigin(import.meta.env.VITE_WS_URL);
  if (configuredUrl) return configuredUrl;

  const apiUrl = toWebSocketOrigin(fallbackApiUrl);
  if (apiUrl) return apiUrl;

  return `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:3001`;
}

export function createAuthenticatedWebSocket(url: string, token?: string | null): WebSocket {
  if (!token) return new WebSocket(url);

  // O token não vai mais na URL. O servidor negocia somente o protocolo
  // fixo "pulyn-auth" e usa o segundo valor apenas durante o handshake.
  return new WebSocket(url, [WS_AUTH_PROTOCOL, token]);
}
