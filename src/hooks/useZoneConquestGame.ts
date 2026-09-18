// hooks/useZoneConquestGame.ts - Hook para gerenciar estado do Zone Conquest INDIVIDUAL
import { useCallback, useEffect, useState, useRef } from 'react';
import { API_URL } from '../services/api';

export interface Participant {
  criancaId: string;
  name: string;
  color: string;
  totalPoints: number;
  checkpointsRead: number;
  ranking: number;
}

export interface CheckpointState {
  id: string;
  participantId: string | null;
  participantName: string | null;
  participantColor: string | null;
  protectedUntil: string | null;
  isProtected: boolean;
  lastReadAt: string | null;
}

export interface ZoneState {
  id: string;
  name: string;
  color: string;
  participantId: string | null;
  participantName: string | null;
  participantColor: string | null;
  status: 'livre' | 'dominada' | 'disputa';
  dominators: Array<{
    participantId: string;
    participantName: string;
    participantColor: string;
  }>;
}

export interface ZoneConquestStatus {
  gameRunning: boolean;
  mode: 'individual';
  createdAt: string;
  participants: Participant[];
  checkpoints: CheckpointState[];
  zones: ZoneState[];
}

export function useZoneConquestGame(eventoId: string | null) {
  const [status, setStatus] = useState<ZoneConquestStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout>();
  const [isIndividualMode, setIsIndividualMode] = useState(false);

  // Carregar status atual
  const loadStatus = useCallback(async () => {
    if (!eventoId) {
      setStatus(null);
      setIsIndividualMode(false);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API_URL}/leituras/${encodeURIComponent(eventoId)}/zone-conquest/status`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      if (data?.gameRunning && data?.mode === 'individual') {
        setStatus(data);
        setIsIndividualMode(true);
        setError(null);
      } else {
        setStatus(null);
        setIsIndividualMode(false);
      }
    } catch (err) {
      console.warn('⚠️ Erro ao carregar status de Zone Conquest:', err);
      setStatus(null);
      setIsIndividualMode(false);
      // Não considerar erro se o jogo simplesmente não está em modo INDIVIDUAL
    }
  }, [eventoId]);

  // Polling: atualizar status a cada 2 segundos
  useEffect(() => {
    if (!eventoId) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = undefined;
      }
      return;
    }

    // Carregar imediatamente na primeira vez
    loadStatus();

    // Depois polling a cada 2 segundos
    pollingIntervalRef.current = setInterval(loadStatus, 2000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = undefined;
      }
    };
  }, [eventoId, loadStatus]);

  return {
    status,
    loading,
    error,
    isIndividualMode,
    participants: status?.participants || [],
    checkpoints: status?.checkpoints || [],
    zones: status?.zones || [],
    ranking: status?.participants?.sort((a, b) => a.ranking - b.ranking) || [],
  };
}
