// Estado da partida de Resgate do Refém, atualizado a cada segundo, e relógio local para as contagens
// regressivas (o servidor manda o tempo restante; entre uma consulta e outra a tela continua contando).
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import type { RefemEstado } from '../services/api';

export function useRefemEstado(eventoId: string | null | undefined, ativo = true, intervaloMs = 1000) {
  const [estado, setEstado] = useState<RefemEstado | null>(null);
  const [erro, setErro] = useState('');
  const [recebidoEm, setRecebidoEm] = useState(() => Date.now());
  const [, setRelogio] = useState(0);
  const emCurso = useRef(false);

  const recarregar = useCallback(async () => {
    if (!eventoId || emCurso.current) return;
    emCurso.current = true;
    try {
      const novo = await api.getRefemEstado(eventoId);
      setEstado(novo);
      setRecebidoEm(Date.now());
      setErro('');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar a partida');
    } finally {
      emCurso.current = false;
    }
  }, [eventoId]);

  useEffect(() => {
    if (!eventoId || !ativo) return;
    recarregar();
    const consulta = window.setInterval(recarregar, intervaloMs);
    return () => window.clearInterval(consulta);
  }, [eventoId, ativo, intervaloMs, recarregar]);

  // Redesenha 4x por segundo para a contagem regressiva andar suave.
  useEffect(() => {
    if (!ativo) return;
    const relogio = window.setInterval(() => setRelogio(valor => valor + 1), 250);
    return () => window.clearInterval(relogio);
  }, [ativo]);

  // Tempo restante (ms) ajustado pelo que já passou desde a última resposta do servidor.
  const restante = useCallback((ms: number | null | undefined) => (
    ms === null || ms === undefined ? null : Math.max(0, ms - (Date.now() - recebidoEm))
  ), [recebidoEm]);

  return { estado, erro, recarregar, restante };
}
