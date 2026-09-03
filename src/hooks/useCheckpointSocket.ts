// hooks/useCheckpointSocket.ts
import { useEffect, useCallback, useRef } from 'react';
import { API_URL } from '../services/api';
import { getWebSocketServerUrl } from '../services/websocket';
import { usePulynStore } from '../store/mockData';

export function useCheckpointSocket() {
  const { addScoreWithReason, updateCheckpointStatus, addReadingLog } = usePulynStore();
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) return;

    const WS_URL = getWebSocketServerUrl(API_URL);
    
    socketRef.current = new WebSocket(WS_URL);

    socketRef.current.onopen = () => {
      updateCheckpointStatus('server', 'online');
    };

    socketRef.current.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        
        if (msg.type === 'NEW_READING') {
          const { checkpointId, uid, authorized, signal, timestamp, id } = msg.payload;
          
          // Adiciona ao log de leituras
          addReadingLog({
            id: id || Date.now().toString(),
            checkpointId,
            uid,
            authorized: authorized || false,
            signal: signal || -45,
            timestamp: new Date(timestamp).toLocaleTimeString('pt-BR'),
            gameId: 'g1'
          });
          
          // Se autorizado, adiciona pontuação
          if (authorized) {
            // Usa addScoreWithReason em vez de addScore
            addScoreWithReason(uid, checkpointId, 10, 'Leitura automática do checkpoint');
          }
        }
        
        if (msg.type === 'HISTORY') {
          msg.payload.forEach((reading: any) => {
            addReadingLog({
              ...reading,
              timestamp: new Date(reading.timestamp).toLocaleTimeString('pt-BR')
            });
          });
        }
        
        if (msg.type === 'CHECKPOINT_UPDATED') {
          updateCheckpointStatus(msg.payload.id, 'configured');
        }
        
      } catch (error) {
        console.error('Erro ao processar mensagem:', error);
      }
    };

    socketRef.current.onclose = () => {
      updateCheckpointStatus('server', 'offline');
      
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    socketRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }, [addScoreWithReason, updateCheckpointStatus, addReadingLog]);

  useEffect(() => {
    connect();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  return socketRef.current;
}