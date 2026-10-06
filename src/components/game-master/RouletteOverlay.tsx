import { useEffect, useState } from 'react';
import RouletteWheel from './RouletteWheel';

export interface RouletteData {
  segments: string[];
  winnerIndex: number;
  objectName: string;
  checkpointName?: string;
}

interface RouletteOverlayProps {
  data: RouletteData;
  onClose: () => void;
  // Se informado, fecha sozinho depois do resultado (telão); sem isso o recreacionista fecha no botão.
  autoCloseSeconds?: number;
  title?: string;
}

// Tela cheia com a roleta girando e, ao parar, o objeto que as crianças precisam achar.
export default function RouletteOverlay({ data, onClose, autoCloseSeconds, title = 'Sorteando o objeto...' }: RouletteOverlayProps) {
  const [done, setDone] = useState(false);

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
        <RouletteWheel segments={data.segments} winnerIndex={data.winnerIndex} onDone={() => setDone(true)} />
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
