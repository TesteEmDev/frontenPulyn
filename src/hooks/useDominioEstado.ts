// Estado da Zona (Domínio total): zonas, placar das equipes e vencedor. Consulta a cada 2 segundos.
import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import type { DominioEstado } from '../services/api';

export function useDominioEstado(eventoId: string | null | undefined, ativo = true, intervaloMs = 2000) {
  const [estado, setEstado] = useState<DominioEstado | null>(null);
  const emCurso = useRef(false);

  useEffect(() => {
    if (!eventoId || !ativo) { setEstado(null); return; }
    let cancelado = false;
    const carregar = async () => {
      if (emCurso.current) return;
      emCurso.current = true;
      try {
        const novo = await api.getDominioEstado(eventoId);
        if (!cancelado) setEstado(novo);
      } catch {
        // mantém o último estado: uma falha de rede passageira não apaga o placar
      } finally {
        emCurso.current = false;
      }
    };
    carregar();
    const consulta = window.setInterval(carregar, intervaloMs);
    return () => { cancelado = true; window.clearInterval(consulta); };
  }, [eventoId, ativo, intervaloMs]);

  return estado;
}
