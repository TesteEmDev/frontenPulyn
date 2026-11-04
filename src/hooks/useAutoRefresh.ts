import { useCallback, useEffect, useRef, useState } from 'react';
import { assinarDados, observarConexao } from '../services/feedDados';

interface AutoRefreshOptions {
  /** Intervalo de segurança entre as atualizações, em milissegundos (padrão 20 s). Com o tempo real conectado ele é bem maior. */
  intervaloMs?: number;
  /** Pausa as atualizações (ex.: com um formulário ou modal aberto). */
  pausado?: boolean;
  /**
   * Assuntos que esta tela acompanha em tempo real ('checkpoints', 'clientes', 'eventos'...; '*' = qualquer mudança).
   * Quando o servidor avisa que um deles mudou, a tela recarrega na hora, sem esperar o intervalo.
   */
  topicos?: string[];
}

// Com o tempo real conectado o intervalo vira só uma rede de segurança (mudanças que não geram aviso).
const INTERVALO_COM_TEMPO_REAL_MS = 60_000;

/**
 * Mantém os dados de uma tela sempre atuais, sem precisar de F5.
 *
 * - tempo real: o servidor avisa quando um assunto muda (`topicos`) e a tela recarrega na hora;
 * - rede de segurança: roda também a cada `intervaloMs` (mais espaçado com o tempo real conectado), só com a aba visível;
 * - ao voltar para a aba, ao focar a janela, quando a internet volta ou quando o tempo real reconecta, atualiza na hora;
 * - nunca roda duas atualizações ao mesmo tempo, e erros da atualização automática não derrubam a tela.
 *
 * `recarregar` deve ser uma atualização "silenciosa": sem ligar o carregando da tela e sem mostrar aviso de erro, para a
 * tela não piscar nem perder o que a pessoa está fazendo.
 */
export function useAutoRefresh(recarregar: () => unknown | Promise<unknown>, { intervaloMs = 20_000, pausado = false, topicos }: AutoRefreshOptions = {}) {
  const funcao = useRef(recarregar);
  useEffect(() => { funcao.current = recarregar; });
  const [tempoReal, setTempoReal] = useState(false);
  // Os efeitos não podem depender da lista (um array novo a cada render): usam o texto dela
  const assuntos = topicos ? [...topicos].sort().join(',') : '';

  // Com a tela pausada (formulário aberto) o aviso não recarrega, mas fica anotado: ao despausar, atualiza uma vez
  const pausadoRef = useRef(pausado);
  const perdeu = useRef(false);

  // Uma atualização por vez; se chega outro pedido durante ela, roda mais uma depois para não perder a mudança
  const rodando = useRef(false);
  const pendente = useRef(false);
  const rodar = useCallback(async () => {
    if (pausadoRef.current) { perdeu.current = true; return; }
    if (rodando.current) { pendente.current = true; return; }
    if (document.hidden) return;
    rodando.current = true;
    try {
      await funcao.current();
    } catch (error) {
      console.warn('Atualização automática falhou:', error);
    } finally {
      rodando.current = false;
      if (pendente.current) { pendente.current = false; void rodar(); }
    }
  }, []);

  useEffect(() => {
    pausadoRef.current = pausado;
    if (!pausado && perdeu.current) { perdeu.current = false; void rodar(); }
  }, [pausado, rodar]);

  // Acompanha se o tempo real está conectado; ao (re)conectar atualiza, para pegar o que mudou enquanto estava fora
  const jaConectou = useRef(false);
  useEffect(() => {
    if (!assuntos) return undefined;
    return observarConexao((conectado) => {
      setTempoReal(conectado);
      if (conectado && jaConectou.current) void rodar();
      if (conectado) jaConectou.current = true;
    });
  }, [assuntos, rodar]);

  // Tempo real: o aviso do servidor recarrega a tela na hora (avisos seguidos viram um recarregamento só)
  useEffect(() => {
    if (!assuntos) return undefined;
    const lista = assuntos.split(',');
    let esperar: ReturnType<typeof setTimeout> | null = null;
    const cancelar = assinarDados((mudaram) => {
      if (!lista.includes('*') && !mudaram.some((t) => lista.includes(t))) return;
      if (esperar) return;
      esperar = setTimeout(() => { esperar = null; void rodar(); }, 150);
    });
    return () => {
      if (esperar) clearTimeout(esperar);
      cancelar();
    };
  }, [assuntos, rodar]);

  // Rede de segurança: intervalo + voltar para a aba / focar a janela / internet de volta
  useEffect(() => {
    if (pausado) return undefined;
    const intervalo = setInterval(() => void rodar(), tempoReal ? Math.max(intervaloMs, INTERVALO_COM_TEMPO_REAL_MS) : intervaloMs);
    const aoVoltar = () => { if (!document.hidden) void rodar(); };
    document.addEventListener('visibilitychange', aoVoltar);
    window.addEventListener('focus', aoVoltar);
    window.addEventListener('online', aoVoltar);
    return () => {
      clearInterval(intervalo);
      document.removeEventListener('visibilitychange', aoVoltar);
      window.removeEventListener('focus', aoVoltar);
      window.removeEventListener('online', aoVoltar);
    };
  }, [intervaloMs, pausado, tempoReal, rodar]);
}
