// Telão aberto o dia todo: quando sai uma versão nova do site (atualizar.ps1, setup, atualização pela internet), a aba
// continuaria com o código antigo até alguém recarregar. Este hook confere de tempos em tempos o index.html publicado
// (o IIS não guarda ele em cache) e, se o script principal mudou (o nome tem o hash do build), recarrega a página.
// No servidor de desenvolvimento (vite) não há /assets/index-*.js e o hook não faz nada.
import { useEffect, useRef } from 'react';

const INTERVALO_MS = 60_000;
const CHAVE_TENTATIVA = 'pulyn:recarregou-para';
const SCRIPT_PRINCIPAL = /<script[^>]+src="([^"]*\/assets\/index-[^"]+\.js)"/;

function scriptCarregado(): string | null {
  const tag = document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/index-"]');
  return tag ? tag.getAttribute('src') : null;
}

// `podeRecarregar`: false enquanto a tela mostra algo que se perderia ao recarregar (ex.: a pontuação final, o
// sorteio das equipes). A versão nova fica esperando e entra assim que voltar a true.
// `ligado`: false desliga a conferência (ex.: o mapa embutido no DisplayMain, que já confere por ele).
export function useRecarregarComVersaoNova(podeRecarregar = true, ligado = true) {
  const versaoNova = useRef<string | null>(null);
  const podeRef = useRef(podeRecarregar);
  podeRef.current = podeRecarregar;

  useEffect(() => {
    const atual = ligado ? scriptCarregado() : null;
    if (!atual) return undefined;

    const recarregarSePuder = () => {
      const alvo = versaoNova.current;
      if (!alvo || !podeRef.current) return;
      // Evita recarregar em loop se, por algum motivo, a página nova ainda vier com o script antigo
      try {
        if (sessionStorage.getItem(CHAVE_TENTATIVA) === alvo) return;
        sessionStorage.setItem(CHAVE_TENTATIVA, alvo);
      } catch { /* sem sessionStorage: recarrega mesmo assim */ }
      window.location.reload();
    };

    let ativo = true;
    const conferir = async () => {
      try {
        const resposta = await fetch(`/?versao=${Date.now()}`, { cache: 'no-store', headers: { Accept: 'text/html' } });
        if (!resposta.ok) return;
        const publicado = (await resposta.text()).match(SCRIPT_PRINCIPAL)?.[1];
        if (!ativo || !publicado || publicado === atual) return;
        versaoNova.current = publicado;
        recarregarSePuder();
      } catch { /* sem rede ou servidor reiniciando: tenta de novo na próxima volta */ }
    };

    const intervalo = window.setInterval(conferir, INTERVALO_MS);
    const espera = window.setInterval(recarregarSePuder, 5_000);
    return () => { ativo = false; window.clearInterval(intervalo); window.clearInterval(espera); };
  }, [ligado]);
}
