// hooks/useNFCReader_otimizado.ts - VERSÃO ULTRA OTIMIZADA
import { useEffect, useRef, useState } from 'react';
import { API_URL } from '../services/api';
import { createAuthenticatedWebSocket, getWebSocketServerUrl } from '../services/websocket';

export function useNFCOtimizado(
  onBraceletDetected: (code: string) => void,
  mode: string = 'default',
  eventoId?: string | null,
  expectedSource?: string,
  pollingEnabled = true,
  pollingApiBase = 'kiosk',
) {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onBraceletDetectedRef = useRef(onBraceletDetected);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttemptsRef = useRef(0);
  const pollingEnabledRef = useRef(pollingEnabled);
  const lastBraceletRef = useRef<string>('');
  const lastBraceletTimeRef = useRef<number>(0);

  useEffect(() => {
    onBraceletDetectedRef.current = onBraceletDetected;
  }, [onBraceletDetected]);

  useEffect(() => {
    pollingEnabledRef.current = pollingEnabled;
  }, [pollingEnabled]);

  // Cache para evitar processamento duplicado
  const shouldProcessBracelet = (code: string): boolean => {
    const now = Date.now();
    const cooldownMs = expectedSource === 'score-kiosk' ? 1500 : 2000;
    
    if (code === lastBraceletRef.current && (now - lastBraceletTimeRef.current) < cooldownMs) {
      return false;
    }
    
    lastBraceletRef.current = code;
    lastBraceletTimeRef.current = now;
    return true;
  };

  const handleBraceletDetectedOptimized = (code: string) => {
    if (!shouldProcessBracelet(code)) {
      console.log('🔁 Pulando releitura rápida:', code);
      return;
    }
    
    // Debounce rápido para evitar flood
    setTimeout(() => {
      onBraceletDetectedRef.current(code);
    }, 10);
  };

  useEffect(() => {
    let disposed = false;

    const pollSourceReadings = async (since: number) => {
      const supportsPollingSource = expectedSource === 'reception' || expectedSource === 'score-kiosk';
      if (disposed || !pollingEnabledRef.current || !supportsPollingSource || !eventoId) return since;

      try {
        const token = localStorage.getItem('authToken');
        if (!token) return since;

        const readingPath = expectedSource === 'score-kiosk' ? 'score-readings' : 'reception-readings';
        const response = await fetch(
          `${API_URL}/${pollingApiBase}/events/${encodeURIComponent(eventoId)}/${readingPath}?since=${since}`,
          { 
            headers: { Authorization: `Bearer ${token}` },
            signal: AbortSignal.timeout(2000) // Timeout rápido
          }
        );
        
        if (!response.ok || !pollingEnabledRef.current || disposed) return since;

        const data = await response.json();
        if (!pollingEnabledRef.current || disposed) return since;
        
        const readings = Array.isArray(data.readings) ? data.readings : [];
        let latest = since;
        
        // Processar leituras em batch
        const uniqueReadings = new Set<string>();
        readings.forEach((reading: any) => {
          const receivedAt = Number(reading.receivedAt || 0);
          latest = Math.max(latest, receivedAt);
          const code = reading.braceletCode || reading.code || reading.uid;
          if (code) uniqueReadings.add(code);
        });
        
        // Processar leituras únicas
        uniqueReadings.forEach(code => {
          if (shouldProcessBracelet(code)) {
            handleBraceletDetectedOptimized(code);
          }
        });
        
        return latest;
      } catch (error) {
        console.warn('⚠️ Polling NFC:', error);
        return since;
      }
    };

    const connect = () => {
      if (disposed || !eventoId || socketRef.current?.readyState === WebSocket.OPEN) {
        return;
      }

      const serverUrl = getWebSocketServerUrl(API_URL);
      const token = (expectedSource === 'reception' || expectedSource === 'score-kiosk')
        ? localStorage.getItem('authToken')
        : null;
      const eventQuery = new URLSearchParams({ evento_id: eventoId });
      const wsUrl = `${serverUrl}?${eventQuery.toString()}`;
      const ws = createAuthenticatedWebSocket(wsUrl, token);
      socketRef.current = ws;

      console.log(`🔗 NFC WS: evento ${eventoId}`);

      ws.onopen = () => {
        if (disposed || socketRef.current !== ws) return;

        console.log(`✅ NFC conectado (evento: ${eventoId})`);
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        
        if (expectedSource !== 'reception' && expectedSource !== 'score-kiosk') {
          ws.send(JSON.stringify({ type: 'SET_MODE', mode }));
        }
      };

      // Handler otimizado
      ws.onmessage = (event) => {
        if (disposed || socketRef.current !== ws) return;

        try {
          const msg = JSON.parse(event.data);
          
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
            if (code && shouldProcessBracelet(code)) {
              handleBraceletDetectedOptimized(code);
            }
          }
        } catch (e) {
          console.error('❌ Erro mensagem NFC:', e);
        }
      };

      ws.onerror = (error) => {
        if (disposed || socketRef.current !== ws) return;
        console.error('❌ WS NFC error:', error);
        setIsConnected(false);
      };

      ws.onclose = () => {
        if (disposed || socketRef.current !== ws) return;

        console.log('⚠️ WS NFC desconectado');
        setIsConnected(false);
        socketRef.current = null;

        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000); // Reduzido
        reconnectAttemptsRef.current += 1;
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      };
    };

    let receptionSince = Date.now();
    let receptionPoll: ReturnType<typeof setInterval> | null = null;
    let receptionPollInFlight = false;

    if (eventoId) {
      connect();
      if (expectedSource === 'reception' || expectedSource === 'score-kiosk') {
        const poll = async () => {
          const socketState = socketRef.current?.readyState;
          if (
            receptionPollInFlight
            || !pollingEnabledRef.current
            || socketState === WebSocket.OPEN
            || socketState === WebSocket.CONNECTING
          ) return;
          
          receptionPollInFlight = true;
          try {
            receptionSince = await pollSourceReadings(receptionSince);
          } finally {
            receptionPollInFlight = false;
          }
        };
        
        // Poll mais frequente mas com menos dados
        poll();
        receptionPoll = setInterval(poll, 1500); // Reduzido de 2000
      }
    } else {
      setIsConnected(false);
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
  }, [mode, eventoId, expectedSource, pollingApiBase]);

  return { isConnected };
}