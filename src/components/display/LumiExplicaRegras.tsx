// O Lumi "explicando" as regras do próximo jogo no telão: chega convidando, lê as regras (que entram uma a uma ao lado,
// no GameGuide) e termina com um joinha. As imagens são as poses animadas do pacote do mascote (mascote/Lumi2D/animados),
// copiadas para public/mascote/lumi. Todas ficam carregadas desde o começo e só a da fase atual aparece (sem piscar ao trocar).
import { useEffect, useState } from 'react';
import { LUMI_CHEGADA_MS, atrasoDaRegra } from './lumiTempos';

// Depois do joinha "falando", fica só piscando
const JOINHA_FALANDO_MS = 3500;

type Fase = 'chegando' | 'lendo' | 'joinha' | 'parado';

const POSES: Record<Fase, string> = {
  chegando: '/mascote/lumi/convidando_falando.webp',
  lendo: '/mascote/lumi/lendo_falando.webp',
  joinha: '/mascote/lumi/joinha_falando.webp',
  parado: '/mascote/lumi/joinha_piscar.webp',
};

export default function LumiExplicaRegras({ nomeJogo, totalRegras }: { nomeJogo: string; totalRegras: number }) {
  const [fase, setFase] = useState<Fase>('chegando');

  useEffect(() => {
    const fimDasRegras = totalRegras > 0 ? atrasoDaRegra(totalRegras - 1) + 1500 : LUMI_CHEGADA_MS + 1500;
    const timers = [
      window.setTimeout(() => setFase('lendo'), LUMI_CHEGADA_MS),
      window.setTimeout(() => setFase('joinha'), fimDasRegras),
      window.setTimeout(() => setFase('parado'), fimDasRegras + JOINHA_FALANDO_MS),
    ];
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [totalRegras]);

  const fala = fase === 'chegando'
    ? <>Oi, pessoal! Vou explicar o próximo jogo: <strong className="text-primary-200">{nomeJogo}</strong></>
    : fase === 'lendo'
      ? (totalRegras > 0 ? 'Prestem atenção nas regras!' : 'Olhem só como funciona!')
      : 'Entenderam? Boa diversão!';

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col items-center justify-end" aria-hidden="true">
      {/* Balão de fala: troca (e anima) a cada fase */}
      <div className="relative z-10 mb-3 w-full max-w-[22rem] shrink-0">
        <div
          key={fase === 'parado' ? 'joinha' : fase}
          className="animate-balao-entra rounded-2xl border border-primary-300/30 bg-[#1a2536] px-4 py-3 text-center font-display text-[clamp(0.9rem,2.1vh,1.5rem)] font-semibold leading-snug text-white shadow-lg motion-reduce:animate-none"
        >
          {fala}
        </div>
        <span className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b border-r border-primary-300/30 bg-[#1a2536]" />
      </div>

      {/* O Lumi: entra uma vez e fica parado (só a boca e os olhos das imagens se mexem); as poses ficam empilhadas */}
      <div className="relative min-h-0 w-full flex-1 animate-lumi-chega motion-reduce:animate-none">
        <div className="relative h-full w-full">
          {(Object.keys(POSES) as Fase[]).map((chave) => (
            <img
              key={chave}
              src={POSES[chave]}
              alt=""
              draggable={false}
              className={`absolute inset-0 h-full w-full object-contain object-bottom drop-shadow-[0_10px_30px_rgba(30,155,215,0.35)] transition-opacity duration-200 ${chave === fase ? 'opacity-100' : 'opacity-0'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
