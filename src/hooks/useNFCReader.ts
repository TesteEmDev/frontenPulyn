// hooks/useNFCReader.ts
import { useEffect, useRef, useState } from 'react';

export function useNFCReader(
  onBraceletDetected: (code: string) => void,
  mode: string = 'default',
  eventoId?: string | null,
) {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttemptsRef = useRef(0);

  useEffect(() => {
    let disposed = false;

    const connect = () => {
      if (disposed || socketRef.current?.readyState === WebSocket.OPEN) {
        return;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const eventQuery = eventoId ? `?evento_id=${encodeURIComponent(eventoId)}` : '';
      const ws = new WebSocket(`${protocol}://${window.location.hostname}:3001${eventQuery}`);
      socketRef.current = ws;

      ws.onopen = () => {
        if (disposed || socketRef.current !== ws) return;

        console.log('✅ WebSocket NFC conectado com sucesso');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        ws.send(JSON.stringify({ type: 'SET_MODE', mode }));
        console.log(`📡 Modo enviado: ${mode}${eventoId ? ` (evento: ${eventoId})` : ''}`);
      };

      ws.onmessage = (event) => {
        if (disposed || socketRef.current !== ws) return;

        try {
          const msg = JSON.parse(event.data);
          console.log('📨 Mensagem NFC recebida:', msg.type);

          if (msg.type === 'NFC_READING_DETECTED' || msg.type === 'BRACELET_DETECTED') {
            const code = msg.payload?.braceletCode || msg.payload?.code;
            console.log('📱 NFC detectado:', code);
            if (code) onBraceletDetected(code);
          }
        } catch (e) {
          console.error('❌ Erro ao processar mensagem NFC:', e);
        }
      };

      ws.onerror = (error) => {
        if (disposed || socketRef.current !== ws) return;
        console.error('❌ Erro WebSocket NFC:', error);
        setIsConnected(false);
      };

      ws.onclose = () => {
        if (disposed || socketRef.current !== ws) return;

        console.log('⚠️ WebSocket NFC desconectado');
        setIsConnected(false);
        socketRef.current = null;

        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        reconnectAttemptsRef.current += 1;
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      const socket = socketRef.current;
      socketRef.current = null;
      setIsConnected(false);
      if (socket && socket.readyState !== WebSocket.CLOSED) socket.close();
    };
  }, [onBraceletDetected, mode, eventoId]);

  return { isConnected };
}
