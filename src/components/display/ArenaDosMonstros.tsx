// Palco do Caça ao Monstro no telão: um card por equipe, com o monstro 3D dela, a energia e quem já atacou.
// Ocupa todo o palco: a grade escolhe quantas colunas e linhas usar pelo espaço disponível e pela quantidade de equipes
// (o arranjo em que cada card fica maior, numa proporção boa), em vez de só empilhar linhas para baixo.
// Usado pelo DisplayMain e pela demo local /demo/arena-monstros.
import { useEffect, useRef, useState } from 'react';
import Monster3D from './Monster3D';
import BotaoSomDosMonstros from './monstros/BotaoSomDosMonstros';
import { MONSTROS, monstroDaEquipe } from './monstros/catalogo';

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

// Proporção (largura ÷ altura) em que o card fica bonito: o monstro em cima e as barras embaixo
const PROPORCAO_DO_CARD = 0.95;
const ESPACO_PX = 16;

// Colunas e linhas em que cabe o maior card possível nessa proporção
function melhorGrade(quantos: number, largura: number, altura: number): { colunas: number; linhas: number } {
  if (quantos <= 0) return { colunas: 1, linhas: 1 };
  if (!largura || !altura) {
    const colunas = Math.ceil(Math.sqrt(quantos));
    return { colunas, linhas: Math.ceil(quantos / colunas) };
  }
  let melhor = { colunas: 1, linhas: quantos, tamanho: -1 };
  for (let colunas = 1; colunas <= quantos; colunas += 1) {
    const linhas = Math.ceil(quantos / colunas);
    const larguraDoCard = (largura - (colunas - 1) * ESPACO_PX) / colunas;
    const alturaDoCard = (altura - (linhas - 1) * ESPACO_PX) / linhas;
    if (larguraDoCard <= 0 || alturaDoCard <= 0) continue;
    // Altura do maior card na proporção que cabe na célula
    const tamanho = Math.min(larguraDoCard / PROPORCAO_DO_CARD, alturaDoCard);
    if (tamanho > melhor.tamanho + 0.5) melhor = { colunas, linhas, tamanho };
  }
  return { colunas: melhor.colunas, linhas: melhor.linhas };
}

// `danoDeTeste`: dano simulado pelo modo de teste do telão (?teste=1), por equipe, somado ao que o servidor informa
export default function ArenaDosMonstros({ monstros, danoDeTeste = {}, modoDeTeste = false }: {
  monstros: MonstroNaArena[];
  danoDeTeste?: Record<string, number>;
  modoDeTeste?: boolean;
}) {
  const gradeRef = useRef<HTMLDivElement>(null);
  const [espaco, setEspaco] = useState({ largura: 0, altura: 0 });

  useEffect(() => {
    const grade = gradeRef.current;
    if (!grade) return undefined;
    const medir = () => setEspaco((atual) => {
      const largura = grade.clientWidth;
      const altura = grade.clientHeight;
      return Math.abs(atual.largura - largura) < 1 && Math.abs(atual.altura - altura) < 1 ? atual : { largura, altura };
    });
    const observador = new ResizeObserver(medir);
    observador.observe(grade);
    medir();
    return () => observador.disconnect();
  }, []);

  const { colunas, linhas } = melhorGrade(monstros.length, espaco.largura, espaco.altura);
  // Cards pequenos (muitas equipes): textos e espaços menores
  const compacto = linhas > 1 && colunas > 2;

  return (
    <div className="flex h-full min-h-0 flex-col rounded-3xl border-2 border-danger/70 bg-gradient-to-br from-red-950/80 via-dark-surface/90 to-purple-950/70 p-3 shadow-2xl shadow-danger/20 sm:p-4" aria-live="polite">
      <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-danger">Caça ao Monstro</p>
          <h2 className="font-display text-[clamp(1.4rem,3.6vh,2.6rem)] font-bold leading-tight text-white">Um monstro para cada equipe</h2>
        </div>
        <div className="flex items-center gap-3">
          <BotaoSomDosMonstros />
          <div className="rounded-full border border-danger/40 bg-danger/10 px-4 py-2 text-sm font-bold text-red-100">
            {monstros.filter(monster => monster.monsterDefeated).length}/{monstros.length} derrotados
          </div>
        </div>
      </div>

      <div ref={gradeRef} className="min-h-0 flex-1">
        <div
          className="grid h-full"
          style={{
            gap: ESPACO_PX,
            gridTemplateColumns: `repeat(${colunas}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${linhas}, minmax(0, 1fr))`,
          }}
        >
          {monstros.map((monster, indice) => {
            const escolhido = monstroDaEquipe(monster.monsterType, monster.monsterColor, indice);
            const maxHp = Number(monster.monsterMaxHp || 500);
            // No modo de teste o dano simulado se soma ao que o servidor informa
            const hp = Math.max(0, Number(monster.monsterHp || 0) - (danoDeTeste[monster.teamId] || 0));
            const defeated = Boolean(monster.monsterDefeated || monster.victory || (modoDeTeste && hp <= 0));
            const progressPercent = maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0;
            return (
              <article key={monster.teamId} className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/25" style={{ borderColor: `${monster.teamColor || '#ef4444'}66` }}>
                <div className={`flex shrink-0 items-center justify-between gap-2 border-b border-white/10 ${compacto ? 'px-3 py-2' : 'px-4 py-3'}`}>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Equipe</p>
                    <h3 className={`truncate font-display font-bold ${compacto ? 'text-lg' : 'text-2xl'}`} style={{ color: monster.teamColor || '#f87171' }}>{monster.teamName}</h3>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${defeated ? 'bg-success/15 text-success' : 'bg-danger/15 text-red-200'}`}>
                    {defeated ? 'Monstro derrotado' : 'Em batalha'}
                  </span>
                </div>
                <div className={`flex min-h-0 flex-1 flex-col ${compacto ? 'p-2' : 'p-3'}`}>
                  <div className="min-h-0 flex-1">
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
                      preencher
                      semLegenda
                    />
                  </div>
                  <div className="shrink-0">
                    <div className={`flex items-center justify-between font-semibold text-gray-200 ${compacto ? 'mt-2 text-xs' : 'mt-3 text-sm'}`}>
                      <span className="truncate">{MONSTROS[escolhido.tipo].nome}</span>
                      <span>{hp}/{maxHp} HP</span>
                    </div>
                    <div className={`mt-1.5 overflow-hidden rounded-full border border-white/10 bg-black/50 p-0.5 ${compacto ? 'h-3' : 'h-4'}`}>
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progressPercent}%`, backgroundColor: monster.teamColor || '#ef4444' }} />
                    </div>
                    <div className={`flex items-center justify-between text-slate-400 ${compacto ? 'mt-1.5 text-[10px]' : 'mt-3 text-xs'}`}>
                      <span>{monster.scanned}/{monster.total} participantes atacaram</span>
                      <span>{monster.complete ? 'Ataque especial liberado' : 'Ataques em andamento'}</span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
