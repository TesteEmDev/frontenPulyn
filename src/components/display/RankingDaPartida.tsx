// Coluna do telão durante o jogo: quem está na frente NA PARTIDA (pontos ganhos desde que ela começou, não o total do evento).
// `modo` escolhe entre as equipes e os participantes.
import { Medal, Trophy } from 'lucide-react';
import FitToBox from './FitToBox';

export interface LinhaDaPartida {
  id: string;
  nome: string;
  pontos: number;
  cor: string | null;
}

export default function RankingDaPartida({ modo, linhas }: { modo: 'equipes' | 'participantes'; linhas: LinhaDaPartida[] }) {
  const titulo = modo === 'equipes' ? 'Equipes no jogo' : 'Participantes no jogo';
  const Icone = modo === 'equipes' ? Trophy : Medal;
  const lista = linhas.slice(0, 5);

  return (
    <aside
      aria-label={titulo}
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-warning-400/20 bg-dark-card/70 p-2.5"
    >
      <div className="mb-2 flex shrink-0 items-center gap-2 border-b border-white/[0.06] pb-2">
        <Icone size={18} className="text-warning-300" />
        <h2 className="font-display text-[clamp(0.9rem,2.1vh,1.4rem)] font-bold text-white">{titulo}</h2>
      </div>

      <div className="min-h-0 flex-1" aria-live="polite">
        {lista.length === 0 ? (
          <p className="py-4 text-center text-[clamp(0.7rem,1.6vh,1rem)] text-gray-500">Ninguém pontuou ainda</p>
        ) : (
          <FitToBox minScale={0.5} maxScale={1}>
            <ol className="space-y-1.5">
              {lista.map((linha, posicao) => (
                <li
                  key={linha.id}
                  className={`flex items-center gap-2 rounded-lg border-l-4 px-2 py-1.5 ${posicao === 0 ? 'bg-yellow-300/10' : 'bg-white/[0.03]'}`}
                  style={{ borderLeftColor: linha.cor || '#1E9BD7' }}
                >
                  <span className="w-6 shrink-0 text-center text-[clamp(0.85rem,2vh,1.3rem)] font-bold text-gray-300">{posicao + 1}º</span>
                  <p className="min-w-0 flex-1 truncate text-[clamp(0.85rem,2vh,1.3rem)] font-semibold leading-tight text-white">{linha.nome}</p>
                  <span className={`shrink-0 text-[clamp(0.9rem,2.1vh,1.4rem)] font-bold ${posicao === 0 ? 'text-yellow-300' : 'text-white'}`}>
                    {linha.pontos} <span className="text-[0.6em] font-semibold text-gray-400">pts</span>
                  </span>
                </li>
              ))}
            </ol>
          </FitToBox>
        )}
      </div>
    </aside>
  );
}
