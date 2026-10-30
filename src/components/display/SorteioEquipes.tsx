// Telão durante o sorteio das equipes: "Sorteando..." por um instante e, em seguida, cada equipe aparece com os apelidos dos
// participantes que caíram nela. Fica na tela o tempo de revelar tudo e de dar para ler; depois avisa a tela para sair.
import { useEffect, useState } from 'react';
import { Shuffle } from 'lucide-react';
import Avatar from '../ui/Avatar';
import { DEFAULT_AVATAR_ID } from '../../avatar/adventurerAvatars';
import FitToBox from './FitToBox';

export interface MembroSorteado {
  id: string;
  nickname: string;
  avatar?: string | null;
  // Foi sorteado agora (mudou de time neste sorteio)
  novo?: boolean;
}

export interface EquipeSorteada {
  id: string;
  name: string;
  color?: string | null;
  members: MembroSorteado[];
}

export interface SorteioDasEquipes {
  // Muda a cada sorteio: reinicia a animação quando sai outro sorteio
  chave: number;
  teams: EquipeSorteada[];
}

const INTRO_MS = 2200;        // "Sorteando as equipes..."
const ENTRE_EQUIPES_MS = 900; // uma equipe aparece a cada tanto
const ENTRE_MEMBROS_MS = 130; // os membros de cada equipe, um a um
const LEITURA_MS = 25000;     // depois de tudo na tela, tempo para ler antes de sair

const CORES_PADRAO = ['#1E9BD7', '#F59E0B', '#22C55E', '#A78BFA', '#EF4444', '#06B6D4', '#EC4899', '#84CC16'];

const corDaEquipe = (equipe: EquipeSorteada, indice: number) => equipe.color || CORES_PADRAO[indice % CORES_PADRAO.length];

// Quanto tempo o sorteio fica na tela (revelação + leitura)
export function duracaoDoSorteioMs(equipes: EquipeSorteada[]): number {
  const maiorEquipe = equipes.reduce((maior, equipe) => Math.max(maior, equipe.members.length), 0);
  return INTRO_MS + equipes.length * ENTRE_EQUIPES_MS + maiorEquipe * ENTRE_MEMBROS_MS + LEITURA_MS;
}

export default function SorteioEquipes({ sorteio, onTerminar }: { sorteio: SorteioDasEquipes; onTerminar: () => void }) {
  const { teams } = sorteio;
  // "Sorteando..." cobre a tela só no começo; depois as equipes vão aparecendo
  const [sorteando, setSorteando] = useState(true);

  useEffect(() => {
    setSorteando(true);
    const fimDaIntro = window.setTimeout(() => setSorteando(false), INTRO_MS);
    const sair = window.setTimeout(onTerminar, duracaoDoSorteioMs(teams));
    return () => {
      window.clearTimeout(fimDaIntro);
      window.clearTimeout(sair);
    };
  }, [sorteio.chave, teams, onTerminar]);

  const total = teams.reduce((soma, equipe) => soma + equipe.members.length, 0);

  return (
    <section
      aria-label="Sorteio das equipes"
      className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-primary-400/20 bg-dark-card/60 p-3 sm:p-4"
    >
      <div className="mb-2 flex shrink-0 items-center gap-3 border-b border-white/[0.06] pb-2">
        <div className="rounded-xl border border-primary-400/20 bg-primary-500/10 p-2 text-primary-300"><Shuffle size={20} /></div>
        <div>
          <h2 className="font-display text-[clamp(1.1rem,2.6vh,1.8rem)] font-bold text-white">Sorteio das equipes</h2>
          <p className="text-[clamp(0.65rem,1.4vh,0.9rem)] text-gray-500">{teams.length} equipes · {total} participantes</p>
        </div>
      </div>

      {/* Instante de "sorteando": some quando a primeira equipe aparece */}
      {sorteando && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 flex animate-fade-in flex-col items-center justify-center gap-3 bg-dark-card/95"
        >
          <Shuffle size={64} className="animate-pulse text-primary-300" />
          <p className="font-display text-[clamp(1.4rem,4vh,3rem)] font-bold text-white">Sorteando as equipes...</p>
        </div>
      )}

      <div className="min-h-0 flex-1" aria-live="polite">
        <FitToBox key={sorteio.chave} align="center" scrollOverflow minScale={0.4} maxScale={1.2}>
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(Math.max(teams.length, 1), 4)}, minmax(15rem, 1fr))` }}>
            {teams.map((equipe, indice) => {
              const cor = corDaEquipe(equipe, indice);
              const atraso = INTRO_MS + indice * ENTRE_EQUIPES_MS;
              return (
                <article
                  key={equipe.id}
                  className="animate-bounce-in overflow-hidden rounded-2xl border bg-black/25"
                  style={{ borderColor: `${cor}99`, animationDelay: `${atraso}ms`, animationFillMode: 'both' }}
                >
                  <header className="flex items-center justify-between gap-2 px-4 py-2" style={{ backgroundColor: `${cor}33` }}>
                    <h3 className="truncate font-display text-[clamp(1.1rem,2.6vh,1.9rem)] font-bold" style={{ color: cor }}>{equipe.name}</h3>
                    <span className="shrink-0 rounded-full bg-black/30 px-2.5 py-0.5 text-[clamp(0.7rem,1.5vh,1rem)] font-bold text-white">
                      {equipe.members.length}
                    </span>
                  </header>
                  <ul className="space-y-1 p-3">
                    {equipe.members.length === 0 && <li className="text-sm text-gray-500">Nenhum participante</li>}
                    {equipe.members.map((membro, posicao) => (
                      <li
                        key={membro.id}
                        className={`animate-fade-in flex items-center gap-2.5 rounded-lg px-2 py-1 ${membro.novo ? 'bg-white/[0.08]' : ''}`}
                        style={{ animationDelay: `${atraso + 300 + posicao * ENTRE_MEMBROS_MS}ms`, animationFillMode: 'both' }}
                      >
                        <Avatar emoji={membro.avatar || DEFAULT_AVATAR_ID} size="sm" decorative />
                        <span className="truncate text-[clamp(0.85rem,2vh,1.35rem)] font-semibold text-white">{membro.nickname}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </FitToBox>
      </div>
    </section>
  );
}
