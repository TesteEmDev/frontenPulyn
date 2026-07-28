// hooks/useNFCReader.ts
import { useEffect, useRef, useState } from 'react';
import { API_URL } from '../services/api';

export function useNFCReader(
  onBraceletDetected: (code: string) => void,
  mode: string = 'default',
  eventoId?: string | null,
) {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onBraceletDetectedRef = useRef(onBraceletDetected);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttemptsRef = useRef(0);

  useEffect(() => {
    onBraceletDetectedRef.current = onBraceletDetected;
  }, [onBraceletDetected]);

  useEffect(() => {
    let disposed = false;

    const connect = () => {
      if (disposed || !eventoId || socketRef.current?.readyState === WebSocket.OPEN) {
        return;
      }

      const configuredUrl = import.meta.env.VITE_WS_URL?.trim();
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      let serverUrl = configuredUrl;

      if (!serverUrl) {
        try {
          const apiUrl = new URL(API_URL);
          serverUrl = `${apiUrl.protocol === 'https:' ? 'wss:' : 'ws:'}//${apiUrl.host}`;
        } catch {
          serverUrl = `${protocol}//${window.location.hostname}:3001`;
        }
      }

      serverUrl = serverUrl.replace(/\/+$/, '');
      const eventQuery = `?evento_id=${encodeURIComponent(eventoId)}`;
      const ws = new WebSocket(`${serverUrl}${eventQuery}`);
      socketRef.current = ws;

      console.log(`🔗 Conectando WebSocket NFC ao evento ${eventoId}: ${serverUrl}`);

      ws.onopen = () => {
        if (disposed || socketRef.current !== ws) return;

        console.log(`✅ WebSocket NFC conectado com sucesso (evento: ${eventoId})`);
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        ws.send(JSON.stringify({ type: 'SET_MODE', mode }));
        console.log(`📡 Modo enviado: ${mode} (evento: ${eventoId})`);
      };

      ws.onmessage = (event) => {
        if (disposed || socketRef.current !== ws) return;

        try {
          const msg = JSON.parse(event.data);
          console.log('📨 Mensagem NFC recebida:', msg.type);

          if (msg.type === 'NFC_READING_DETECTED' || msg.type === 'BRACELET_DETECTED') {
            const code = msg.payload?.braceletCode || msg.payload?.code;
            console.log('📱 NFC detectado:', code);
            if (code) onBraceletDetectedRef.current(code);
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

    if (eventoId) {
      connect();
    } else {
      setIsConnected(false);
      console.log('⚠️ WebSocket NFC aguardando evento selecionado');
    }

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
  }, [mode, eventoId]);

  return { isConnected };
}
