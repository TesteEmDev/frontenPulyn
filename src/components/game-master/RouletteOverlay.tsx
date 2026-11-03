import { useEffect, useState } from 'react';
import RouletteWheel from './RouletteWheel';

export interface RouletteData {
  segments: string[];
  winnerIndex: number;
  objectName: string;
  checkpointName?: string;
}

// A roleta some este tempo depois de o item ser selecionado; o objeto sorteado continua na tela.
export const RODA_SOME_APOS_MS = 1500;

interface RouletteOverlayProps {
  data: RouletteData;
  onClose: () => void;
  // Se informado, fecha sozinho depois do resultado (telão); sem isso o recreacionista fecha no botão.
  autoCloseSeconds?: number;
  // Telão: quando a roleta some, a tela cheia se fecha (o objeto vai para um lugar fixo, sem cobrir o mapa).
  onWheelGone?: () => void;
  title?: string;
}

// Objeto sorteado numa faixa compacta (cabeçalho do telão): fica fora do mapa e das informações do jogo.
export function RouletteResultBanner({ data }: { data: RouletteData }) {
  return (
    <div className="flex min-w-0 items-center justify-center gap-3 rounded-xl border border-accent/50 bg-accent/10 px-4 py-1 animate-bounce-in" role="status" aria-label="Objeto da brincadeira paralela">
      <span className="shrink-0 text-[clamp(1.2rem,3.2vh,2.2rem)]" aria-hidden="true">🔎</span>
      <div className="min-w-0 leading-tight">
        <p className="truncate font-display text-[clamp(1.1rem,3.2vh,2.4rem)] font-black text-accent">Achem: {data.objectName}</p>
        {data.checkpointName && (
          <p className="truncate text-[clamp(0.65rem,1.5vh,1rem)] text-gray-300">
            Levem até <strong className="text-white">{data.checkpointName}</strong> e leiam a pulseira · 1º, 2º e 3º: 50, 40 e 30 pontos
          </p>
        )}
      </div>
    </div>
  );
}

// Tela cheia com a roleta girando e, ao parar, o objeto que as crianças precisam achar.
export default function RouletteOverlay({ data, onClose, autoCloseSeconds, onWheelGone, title = 'Sorteando o objeto...' }: RouletteOverlayProps) {
  const [done, setDone] = useState(false);
  const [rodaVisivel, setRodaVisivel] = useState(true);

  // Item selecionado: a roleta some depois de 1,5 s, sobrando só o objeto a ser achado
  useEffect(() => {
    if (!done) return undefined;
    const timer = setTimeout(() => {
      setRodaVisivel(false);
      onWheelGone?.();
    }, RODA_SOME_APOS_MS);
    return () => clearTimeout(timer);
  }, [done, onWheelGone]);

  useEffect(() => {
    if (!done || !autoCloseSeconds) return undefined;
    const timer = setTimeout(onClose, autoCloseSeconds * 1000);
    return () => clearTimeout(timer);
  }, [done, autoCloseSeconds, onClose]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Roleta da brincadeira paralela">
      <div className="flex w-full max-w-xl flex-col items-center gap-6 text-center">
        <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">{done ? 'Achem este objeto!' : title}</h2>
        {rodaVisivel && <RouletteWheel segments={data.segments} winnerIndex={data.winnerIndex} onDone={() => setDone(true)} />}
        <div className="min-h-[7.5rem]">
          {done && (
            <div className="animate-in fade-in zoom-in duration-500">
              <p className="font-display text-4xl font-black text-accent sm:text-5xl">{data.objectName}</p>
              {data.checkpointName && (
                <p className="mt-3 text-base text-gray-300 sm:text-lg">
                  Levem até <strong className="text-white">{data.checkpointName}</strong> e leiam a pulseira. Os 3 primeiros ganham 50, 40 e 30 pontos!
                </p>
              )}
            </div>
          )}
        </div>
        {done && !autoCloseSeconds && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-primary px-6 py-3 font-semibold text-white transition hover:bg-primary/90"
          >
            Fechar
          </button>
        )}
      </div>
    </div>
  );
}
