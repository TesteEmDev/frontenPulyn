// hooks/useGameWebSocket.ts - WebSocket genérico para eventos do jogo
import { useEffect, useRef, useState, useCallback } from 'react';
import { API_URL } from '../services/api';
import { createAuthenticatedWebSocket, getWebSocketServerUrl } from '../services/websocket';

export interface GameEvent {
  type: string;
  payload?: any;
  timestamp?: string;
}

type ConnectionStatus = 'offline' | 'connecting' | 'connected' | 'reconnecting';

export function useGameWebSocket(
  eventoId: string | null,
  onEvent: (event: GameEvent) => void,
  autoConnect = true
) {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('offline');
  const [lastMessageAt, setLastMessageAt] = useState<Date | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const reconnectAttemptsRef = useRef(0);
  const disposedRef = useRef(false);
  const lastEventKeyRef = useRef<string | null>(null);
  const onEventRef = useRef(onEvent);

  onEventRef.current = onEvent;

  // A origem é normalizada para evitar caminhos REST, query strings ou hosts duplicados.
  const getServerUrl = useCallback(() => getWebSocketServerUrl(API_URL), []);

  const connect = useCallback(() => {
    if (disposedRef.current) return;

    if (!eventoId) {
      setConnectionStatus('offline');
      console.log('⚠️ WebSocket: evento_id não definido ainda');
      return;
    }

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      console.log('✅ WebSocket já está conectado');
      return;
    }

    try {
      setConnectionStatus(reconnectAttemptsRef.current > 0 ? 'reconnecting' : 'connecting');
      const serverUrl = getServerUrl();
      const query = new URLSearchParams({ evento_id: eventoId });
      const wsUrl = `${serverUrl}?${query.toString()}`;
      const token = localStorage.getItem('authToken');
      const ws = createAuthenticatedWebSocket(wsUrl, token);

      console.log(`🔗 Conectando ao WebSocket do evento ${eventoId}`);

      ws.onopen = () => {
        if (disposedRef.current || socketRef.current !== ws) return;

        console.log(`✅ WebSocket conectado com sucesso (evento: ${eventoId})`);
        setIsConnected(true);
        setConnectionStatus('connected');
        setReconnectAttempt(0);
        reconnectAttemptsRef.current = 0;
        
        // Enviar heartbeat
        ws.send(JSON.stringify({
          type: 'HEARTBEAT',
          payload: { evento_id: eventoId, timestamp: new Date().toISOString() }
        }));
      };

      ws.onmessage = (event) => {
        if (disposedRef.current || socketRef.current !== ws) return;

        try {
          const msg = JSON.parse(event.data);
          const isHeartbeat = msg.type === 'HEARTBEAT' || msg.type === 'PONG';

          if (!isHeartbeat) {
            setLastMessageAt(new Date());
            console.log(`📨 Evento recebido: ${msg.type}`);
          }

          // O backend pode enviar o mesmo evento global e por sala. Evitar
          // repetir feedback e recarregamentos para o mesmo evento recebido.
          const eventMarker = msg.payload?.timestamp || msg.payload?.startedAt || msg.payload?.stoppedAt;
          const eventKey = eventMarker ? `${msg.type}:${eventMarker}` : null;
          if (!isHeartbeat && eventKey && lastEventKeyRef.current === eventKey) return;
          if (eventKey) lastEventKeyRef.current = eventKey;

          onEventRef.current(msg);
        } catch (e) {
          console.error('❌ Erro ao processar mensagem WebSocket:', e);
        }
      };

      ws.onerror = (error) => {
        if (disposedRef.current || socketRef.current !== ws) return;
        console.error('❌ Erro no WebSocket:', error);
        setIsConnected(false);
        setConnectionStatus('reconnecting');
      };

      ws.onclose = () => {
        if (disposedRef.current || socketRef.current !== ws) return;

        console.log('⚠️ WebSocket desconectado');
        socketRef.current = null;
        setIsConnected(false);
        setConnectionStatus(autoConnect ? 'reconnecting' : 'offline');

        if (autoConnect && eventoId) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current++;
          setReconnectAttempt(reconnectAttemptsRef.current);
          console.log(`🔄 Reconectando em ${delay}ms (tentativa ${reconnectAttemptsRef.current})`);
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        }
      };

      socketRef.current = ws;
    } catch (error) {
      console.error('❌ Erro ao conectar WebSocket:', error);
      setIsConnected(false);
      setConnectionStatus(autoConnect ? 'reconnecting' : 'offline');
    }
  }, [eventoId, getServerUrl, autoConnect]);

  // Conectar novamente sempre que o evento mudar.
  useEffect(() => {
    disposedRef.current = false;
    lastEventKeyRef.current = null;
    setLastMessageAt(null);
    setReconnectAttempt(0);

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }
    reconnectAttemptsRef.current = 0;

    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setIsConnected(false);

    if (autoConnect && eventoId) {
      setConnectionStatus('connecting');
      connect();
    } else {
      setConnectionStatus('offline');
    }

    return () => {
      disposedRef.current = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = undefined;
      }
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [eventoId, autoConnect, connect]);

  // Função para enviar mensagem
  const send = useCallback((type: string, payload?: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type,
        payload,
        timestamp: new Date().toISOString()
      }));
    } else {
      console.warn('⚠️ WebSocket não está conectado. Não é possível enviar:', type);
    }
  }, []);

  return {
    isConnected,
    connectionStatus,
    lastMessageAt,
    reconnectAttempt,
    send,
    socket: socketRef.current
  };
}
