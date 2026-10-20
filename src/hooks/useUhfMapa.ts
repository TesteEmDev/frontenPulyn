import { useCallback, useEffect, useRef, useState } from 'react';
import { API_URL, api, type ModoUhfMapa, type UhfMapa } from '../services/api';
import { createAuthenticatedWebSocket, getWebSocketServerUrl } from '../services/websocket';

export interface FiltrosUhfMapa {
  modo: ModoUhfMapa;
  balde?: string;      // momento passado (replay): não atualiza sozinho
  eventoId?: string;
  timeId?: string;
}

const ATUALIZACAO_PADRAO_MS = 5000;

// Mapa de calor que se atualiza sozinho a cada janela de 5 s. O aviso UHF_MAPA_ATUALIZADO pelo WebSocket da
// empresa adianta a atualização; se ele não chegar, a busca acontece no horário que o servidor indicou.
export function useUhfMapa(filtros: FiltrosUhfMapa) {
  const [mapa, setMapa] = useState<UhfMapa | null>(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [segundosParaAtualizar, setSegundosParaAtualizar] = useState<number | null>(null);
  const proximaRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { modo, balde, eventoId, timeId } = filtros;

  const carregar = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setCarregando(true);
    try {
      const dados = await api.getUhfMapa({ modo, balde, eventoId, timeId });
      setMapa(dados);
      setErro('');
      if (!balde) {
        const alvo = new Date(dados.proximaAtualizacaoEm).getTime();
        const espera = Number.isFinite(alvo) ? Math.max(2000, alvo - Date.now() + 500) : ATUALIZACAO_PADRAO_MS;
        proximaRef.current = Date.now() + espera;
        timerRef.current = setTimeout(() => carregarRef.current(), espera);
      } else {
        proximaRef.current = null;
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível carregar o mapa de calor.');
      if (!balde) {
        proximaRef.current = Date.now() + ATUALIZACAO_PADRAO_MS;
        timerRef.current = setTimeout(() => carregarRef.current(), ATUALIZACAO_PADRAO_MS);
      }
    } finally {
      setCarregando(false);
    }
  }, [modo, balde, eventoId, timeId]);

  const carregarRef = useRef(carregar);
  useEffect(() => { carregarRef.current = carregar; }, [carregar]);

  useEffect(() => {
    carregar();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [carregar]);

  // Contagem regressiva para a próxima atualização.
  useEffect(() => {
    const intervalo = setInterval(() => {
      setSegundosParaAtualizar(proximaRef.current ? Math.max(0, Math.ceil((proximaRef.current - Date.now()) / 1000)) : null);
    }, 1000);
    return () => clearInterval(intervalo);
  }, []);

  // Aviso em tempo real (canal da empresa). Só vale no modo ao vivo.
  useEffect(() => {
    if (balde) return undefined;
    const token = localStorage.getItem('authToken');
    if (!token) return undefined;
    let socket: WebSocket | null = null;
    let fechado = false;
    let reconectar: ReturnType<typeof setTimeout> | null = null;
    const conectar = () => {
      if (fechado) return;
      socket = createAuthenticatedWebSocket(`${getWebSocketServerUrl(API_URL)}?scope=company`, token);
      socket.onmessage = (evento) => {
        try {
          const mensagem = JSON.parse(evento.data);
          if (mensagem.type === 'UHF_MAPA_ATUALIZADO') setTimeout(() => carregarRef.current(), 3500);
        } catch {
          // Mensagens de outros tipos ou inválidas são ignoradas.
        }
      };
      socket.onclose = () => { if (!fechado) reconectar = setTimeout(conectar, 10000); };
    };
    conectar();
    return () => {
      fechado = true;
      if (reconectar) clearTimeout(reconectar);
      socket?.close();
    };
  }, [balde]);

  return { mapa, erro, carregando, segundosParaAtualizar, recarregar: carregar };
}
