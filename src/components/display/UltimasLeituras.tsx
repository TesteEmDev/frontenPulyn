// Coluna do telão durante o jogo: as últimas leituras de checkpoint, da mais nova para a mais antiga, com o checkpoint,
// o apelido de quem passou e a pontuação ganha. A leitura mais nova entra destacada.
import { Radio } from 'lucide-react';
import FitToBox from './FitToBox';

export interface LeituraDoJogo {
  id: string;
  apelido: string;
  // Número do checkpoint (o que o buffet vê) e o nome dele
  checkpoint: string;
  checkpointNome: string;
  pontos: number;
  cor: string;
}

export default function UltimasLeituras({ leituras }: { leituras: LeituraDoJogo[] }) {
  return (
    <aside
      aria-label="Últimas leituras"
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-primary-400/20 bg-dark-card/70 p-2.5"
    >
      <div className="mb-2 flex shrink-0 items-center gap-2 border-b border-white/[0.06] pb-2">
        <Radio size={18} className="text-primary-300" />
        <h2 className="font-display text-[clamp(0.9rem,2.1vh,1.4rem)] font-bold text-white">Últimas leituras</h2>
      </div>

      <div className="min-h-0 flex-1" aria-live="polite">
        {leituras.length === 0 ? (
          <p className="py-4 text-center text-[clamp(0.7rem,1.6vh,1rem)] text-gray-500">Nenhuma leitura ainda</p>
        ) : (
          <FitToBox minScale={0.5} maxScale={1}>
            <ul className="space-y-1.5">
              {leituras.map((leitura, posicao) => (
                <li
                  key={leitura.id}
                  className={`flex items-center gap-2 rounded-lg border-l-4 px-2 py-1.5 ${posicao === 0 ? 'animate-bounce-in bg-white/[0.09]' : 'bg-white/[0.03]'}`}
                  style={{ borderLeftColor: leitura.cor }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[clamp(0.85rem,2vh,1.3rem)] font-semibold leading-tight text-white">{leitura.apelido}</p>
                    <p className="truncate text-[clamp(0.6rem,1.3vh,0.85rem)] leading-tight text-gray-400">
                      Checkpoint {leitura.checkpoint}{leitura.checkpointNome ? ` · ${leitura.checkpointNome}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-[clamp(0.8rem,1.8vh,1.2rem)] font-bold text-success">
                    +{leitura.pontos}
                  </span>
                </li>
              ))}
            </ul>
          </FitToBox>
        )}
      </div>
    </aside>
  );
}
