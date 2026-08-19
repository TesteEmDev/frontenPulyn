// hooks/useNFCReader.ts
import { useEffect, useRef, useState } from 'react';
import { API_URL } from '../services/api';

export function useNFCReader(
  onBraceletDetected: (code: string) => void,
  mode: string = 'default',
  eventoId?: string | null,
  expectedSource?: string,
  pollingEnabled = true,
) {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onBraceletDetectedRef = useRef(onBraceletDetected);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttemptsRef = useRef(0);
  const pollingEnabledRef = useRef(pollingEnabled);

  useEffect(() => {
    onBraceletDetectedRef.current = onBraceletDetected;
  }, [onBraceletDetected]);

  useEffect(() => {
    pollingEnabledRef.current = pollingEnabled;
  }, [pollingEnabled]);

  useEffect(() => {
    let disposed = false;

    const pollReceptionReadings = async (since: number) => {
      if (disposed || !pollingEnabledRef.current || expectedSource !== 'reception' || !eventoId) return since;

      try {
        const token = localStorage.getItem('authToken');
        if (!token) return since;

        const response = await fetch(
          `${API_URL}/kiosk/events/${encodeURIComponent(eventoId)}/reception-readings?since=${since}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!response.ok || !pollingEnabledRef.current || disposed) return since;

        const data = await response.json();
        if (!pollingEnabledRef.current || disposed) return since;
        const readings = Array.isArray(data.readings) ? data.readings : [];
        let latest = since;
        readings.forEach((reading: any) => {
          const receivedAt = Number(reading.receivedAt || 0);
          latest = Math.max(latest, receivedAt);
          const code = reading.braceletCode || reading.code || reading.uid;
          if (code) onBraceletDetectedRef.current(code);
        });
        return latest;
      } catch (error) {
        console.warn('⚠️ Não foi possível recuperar leituras NFC:', error);
        return since;
      }
    };

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
      const token = expectedSource === 'reception' ? localStorage.getItem('authToken') : null;
      const eventQuery = new URLSearchParams({ evento_id: eventoId });
      if (token) eventQuery.set('token', token);
      const ws = new WebSocket(`${serverUrl}?${eventQuery.toString()}`);
      socketRef.current = ws;

      console.log(`🔗 Conectando WebSocket NFC ao evento ${eventoId}: ${serverUrl}`);

      ws.onopen = () => {
        if (disposed || socketRef.current !== ws) return;

        console.log(`✅ WebSocket NFC conectado com sucesso (evento: ${eventoId})`);
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        if (expectedSource !== 'reception') {
          ws.send(JSON.stringify({ type: 'SET_MODE', mode }));
          console.log(`📡 Modo enviado: ${mode} (evento: ${eventoId})`);
        } else {
          console.log(`📡 Kiosk conectado ao canal de recepção (evento: ${eventoId})`);
        }
      };

      ws.onmessage = (event) => {
        if (disposed || socketRef.current !== ws) return;

        try {
          const msg = JSON.parse(event.data);
          if (import.meta.env.DEV) console.debug('📨 Mensagem NFC recebida:', msg.type);

          const isNfcMessage = msg.type === 'NFC_READING_DETECTED' || msg.type === 'BRACELET_DETECTED';
          const messageEventId = msg.payload?.eventoId || msg.payload?.eventId;
          const belongsToSelectedEvent = !messageEventId
            || String(messageEventId).trim().toLowerCase() === String(eventoId).trim().toLowerCase();
          const isLegacyReceptionMessage = expectedSource === 'reception'
            && (msg.type === 'BRACELET_DETECTED'
              || (msg.type === 'NFC_READING_DETECTED' && !msg.payload?.source));
          const isExpectedReceptionMessage = !expectedSource
            || msg.payload?.source === expectedSource
            || isLegacyReceptionMessage;

          if (isNfcMessage && belongsToSelectedEvent && isExpectedReceptionMessage) {
            const code = msg.payload?.braceletCode || msg.payload?.code || msg.payload?.uid;
            if (import.meta.env.DEV) console.debug('📱 NFC detectado:', code);
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

    let receptionSince = Date.now();
    let receptionPoll: ReturnType<typeof setInterval> | null = null;
    let receptionPollInFlight = false;

    if (eventoId) {
      connect();
      if (expectedSource === 'reception') {
        // O WebSocket continua sendo o canal principal. Esta recuperação evita
        // perder uma leitura feita durante reconexão ou antes do handshake.
        const poll = async () => {
          if (receptionPollInFlight || !pollingEnabledRef.current) return;
          receptionPollInFlight = true;
          try {
            receptionSince = await pollReceptionReadings(receptionSince);
          } finally {
            receptionPollInFlight = false;
          }
        };
        poll();
        receptionPoll = setInterval(poll, 2000);
      }
    } else {
      setIsConnected(false);
      console.log('⚠️ WebSocket NFC aguardando evento selecionado');
    }

    return () => {
      if (receptionPoll) clearInterval(receptionPoll);
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
  }, [mode, eventoId, expectedSource]);

  return { isConnected };
}
