import { useEffect, useRef } from 'react';
import { API_URL } from '../services/api';
import { createAuthenticatedWebSocket, getWebSocketServerUrl } from '../services/websocket';

export interface ControlledEventPayload {
  eventoId: string | null;
  eventName?: string | null;
  eventStatus?: string | null;
}

export function useEventControl(
  onEventSelected: (eventId: string | null, payload?: ControlledEventPayload) => void,
  enabled = true,
) {
  const callbackRef = useRef(onEventSelected);

  useEffect(() => {
    callbackRef.current = onEventSelected;
  }, [onEventSelected]);

  useEffect(() => {
    if (!enabled) return undefined;

    let disposed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempts = 0;
    let socket: WebSocket | null = null;

    const applyPayload = (payload: ControlledEventPayload | undefined) => {
      if (!payload) return;
      callbackRef.current(payload.eventoId ? String(payload.eventoId) : null, payload);
    };

    const loadCurrentEvent = async () => {
      const token = localStorage.getItem('authToken');
      if (!token || disposed) return;
      try {
        const response = await fetch(`${API_URL}/event-control/active`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok || disposed) return;
        const data = await response.json();
        applyPayload(data.event ? {
          eventoId: data.event.id,
          eventName: data.event.name,
          eventStatus: data.event.status,
        } : { eventoId: null });
      } catch {
        // O WebSocket continua tentando; a tela pode aguardar a conexão.
      }
    };

    const getServerUrl = () => getWebSocketServerUrl(API_URL);

    const connect = () => {
      if (disposed) return;
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const query = new URLSearchParams({ scope: 'company' });
      socket = createAuthenticatedWebSocket(`${getServerUrl()}?${query.toString()}`, token);
      socket.onopen = () => {
        reconnectAttempts = 0;
      };
      socket.onmessage = event => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'EVENT_SELECTED') applyPayload(message.payload);
        } catch {
          // Ignorar mensagens inválidas do canal de controle.
        }
      };
      socket.onerror = () => socket?.close();
      socket.onclose = () => {
        if (disposed) return;
        const delay = Math.min(1000 * 2 ** reconnectAttempts, 30000);
        reconnectAttempts += 1;
        reconnectTimer = setTimeout(connect, delay);
      };
    };

    loadCurrentEvent();
    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
      socket = null;
    };
  }, [enabled]);
}
