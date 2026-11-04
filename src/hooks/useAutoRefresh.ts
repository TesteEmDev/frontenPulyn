import { useEffect, useRef } from 'react';

interface AutoRefreshOptions {
  /** Intervalo entre as atualizações, em milissegundos (padrão 20 s). */
  intervaloMs?: number;
  /** Pausa as atualizações (ex.: com um formulário ou modal aberto). */
  pausado?: boolean;
}

/**
 * Atualiza os dados de uma tela sozinho, sem precisar de F5.
 *
 * - roda `recarregar` a cada `intervaloMs`, só com a aba visível (aba em segundo plano não gasta o servidor);
 * - ao voltar para a aba, ao focar a janela ou quando a internet volta, atualiza na hora;
 * - nunca roda duas atualizações ao mesmo tempo, e erros da atualização automática não derrubam a tela.
 *
 * `recarregar` deve ser uma atualização "silenciosa": sem ligar o carregando da tela e sem mostrar aviso de erro, para a
 * tela não piscar nem perder o que a pessoa está fazendo.
 */
export function useAutoRefresh(recarregar: () => unknown | Promise<unknown>, { intervaloMs = 20_000, pausado = false }: AutoRefreshOptions = {}) {
  const funcao = useRef(recarregar);
  useEffect(() => { funcao.current = recarregar; });

  useEffect(() => {
    if (pausado) return undefined;
    let rodando = false;
    const rodar = async () => {
      if (rodando || document.hidden) return;
      rodando = true;
      try {
        await funcao.current();
      } catch (error) {
        console.warn('Atualização automática falhou:', error);
      } finally {
        rodando = false;
      }
    };
    const intervalo = setInterval(() => void rodar(), intervaloMs);
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
  }, [intervaloMs, pausado]);
}
