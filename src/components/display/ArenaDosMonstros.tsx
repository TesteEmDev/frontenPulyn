// Palco do Caça ao Monstro no telão: um card por equipe, com o monstro 3D dela, a energia e quem já atacou.
// Usado pelo DisplayMain (dentro do FitToBox do palco) e pela demo local /demo/arena-monstros.
import Monster3D from './Monster3D';
import BotaoSomDosMonstros from './monstros/BotaoSomDosMonstros';
import { monstroDaEquipe } from './monstros/catalogo';

export interface MonstroNaArena {
  teamId: string;
  teamName: string;
  teamColor: string;
  // Monstro sorteado para a equipe neste jogo (o servidor garante que não se repete)
  monsterType?: string | null;
  monsterColor?: string | null;
  monsterHp: number;
  monsterMaxHp: number;
  monsterDefeated?: boolean;
  victory?: boolean;
  scanned: number;
  total: number;
  complete: boolean;
  version?: number;
}

// `danoDeTeste`: dano simulado pelo modo de teste do telão (?teste=1), por equipe, somado ao que o servidor informa
export default function ArenaDosMonstros({ monstros, danoDeTeste = {}, modoDeTeste = false }: {
  monstros: MonstroNaArena[];
  danoDeTeste?: Record<string, number>;
  modoDeTeste?: boolean;
}) {
  return (
    <div className="mx-auto max-w-6xl rounded-3xl border-2 border-danger/70 bg-gradient-to-br from-red-950/80 via-dark-surface/90 to-purple-950/70 p-5 shadow-2xl shadow-danger/20 sm:p-6" aria-live="polite">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-danger">Caça ao Monstro</p>
          <h2 className="font-display text-4xl font-bold text-white">Um monstro para cada equipe</h2>
        </div>
        <div className="flex items-center gap-3">
          <BotaoSomDosMonstros />
          <div className="rounded-full border border-danger/40 bg-danger/10 px-4 py-2 text-sm font-bold text-red-100">
            {monstros.filter(monster => monster.monsterDefeated).length}/{monstros.length} derrotados
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {monstros.map((monster, indice) => {
          const escolhido = monstroDaEquipe(monster.monsterType, monster.monsterColor, indice);
          const maxHp = Number(monster.monsterMaxHp || 500);
          // No modo de teste o dano simulado se soma ao que o servidor informa
          const hp = Math.max(0, Number(monster.monsterHp || 0) - (danoDeTeste[monster.teamId] || 0));
          const defeated = Boolean(monster.monsterDefeated || monster.victory || (modoDeTeste && hp <= 0));
          const progressPercent = maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0;
          return (
            <article key={monster.teamId} className="overflow-hidden rounded-2xl border border-white/10 bg-black/25" style={{ borderColor: `${monster.teamColor || '#ef4444'}66` }}>
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Equipe</p>
                  <h3 className="truncate font-display text-2xl font-bold" style={{ color: monster.teamColor || '#f87171' }}>{monster.teamName}</h3>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${defeated ? 'bg-success/15 text-success' : 'bg-danger/15 text-red-200'}`}>
                  {defeated ? 'Monstro derrotado' : 'Em batalha'}
                </span>
              </div>
              <div className="p-3">
                <Monster3D
                  hp={hp}
                  maxHp={maxHp}
                  defeated={defeated}
                  teamName={monster.teamName}
                  teamColor={monster.teamColor}
                  winnerTeamName={defeated ? monster.teamName : null}
                  winnerTeamColor={monster.teamColor}
                  tipo={escolhido.tipo}
                  cor={escolhido.cor}
                  leve={monstros.length > 2}
                />
                <div className="mt-3 flex items-center justify-between text-sm font-semibold text-gray-200">
                  <span>Energia do monstro</span>
                  <span>{hp}/{maxHp} HP</span>
                </div>
                <div className="mt-2 h-4 overflow-hidden rounded-full border border-white/10 bg-black/50 p-0.5">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progressPercent}%`, backgroundColor: monster.teamColor || '#ef4444' }} />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                  <span>{monster.scanned}/{monster.total} participantes atacaram</span>
                  <span>{monster.complete ? 'Ataque especial liberado' : 'Ataques em andamento'}</span>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
