// O Lumi "explicando" as regras do próximo jogo no telão: chega convidando, lê as regras (que entram uma a uma ao lado,
// no GameGuide) e termina com um joinha. As imagens são as poses animadas do pacote do mascote (mascote/Lumi2D/animados),
// copiadas para public/mascote/lumi. Todas ficam carregadas desde o começo e só a da fase atual aparece (sem piscar ao trocar).
import { useEffect, useState } from 'react';
import { FALA_FINAL, FALA_LENDO, FALA_SEM_REGRAS, falaDeAbertura, type LinhaDoTempo } from './lumiTempos';
import { calar, falar } from './vozDoLumi';

// Depois do joinha "falando", fica só piscando
const JOINHA_FALANDO_MS = 3500;

type Fase = 'chegando' | 'lendo' | 'joinha' | 'parado';

const POSES: Record<Fase, string> = {
  chegando: '/mascote/lumi/convidando_falando.webp',
  lendo: '/mascote/lumi/lendo_falando.webp',
  joinha: '/mascote/lumi/joinha_falando.webp',
  parado: '/mascote/lumi/joinha_piscar.webp',
};

// `tempo`: a linha do tempo (linhaDoTempo em lumiTempos.ts). `voz`: o Lumi fala a abertura, cada regra quando ela entra
// e o "Boa diversão!" (áudios gravados com a voz do Lumi, vozDoLumi.ts).
export default function LumiExplicaRegras({ nomeJogo, regras, tempo, voz = false }: {
  nomeJogo: string;
  regras: string[];
  tempo: LinhaDoTempo;
  voz?: boolean;
}) {
  const [fase, setFase] = useState<Fase>('chegando');
  const temRegras = regras.length > 0;

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setFase('lendo'), tempo.chegada),
      window.setTimeout(() => setFase('joinha'), tempo.fim),
      window.setTimeout(() => setFase('parado'), tempo.fim + JOINHA_FALANDO_MS),
    ];
    if (voz) {
      calar();
      falar(falaDeAbertura(nomeJogo));
      const falas: [number, string][] = [
        [tempo.chegada, temRegras ? FALA_LENDO : FALA_SEM_REGRAS],
        ...regras.map((regra, i): [number, string] => [tempo.entradas[i], regra]),
        [tempo.fim, FALA_FINAL],
      ];
      falas.forEach(([em, texto]) => timers.push(window.setTimeout(() => falar(texto), em)));
    }
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      if (voz) calar();
    };
    // as regras e o nome vêm junto com a linha do tempo (o pai recria o componente ao trocar de jogo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tempo, voz]);

  const fala = fase === 'chegando'
    ? <>Oi, pessoal! Vou explicar o próximo jogo: <strong className="text-primary-200">{nomeJogo}</strong></>
    : fase === 'lendo'
      ? (temRegras ? FALA_LENDO : FALA_SEM_REGRAS)
      : FALA_FINAL;

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
