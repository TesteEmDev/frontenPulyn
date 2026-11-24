// Coluna ao lado do jogo no telão: as últimas leituras ficam sempre em cima (nenhuma leitura passa sem ser vista) e,
// embaixo, o ranking da partida, que alterna com o "Top" do outro lado. Jogo em equipe: equipes no jogo ↔ top
// participantes. Individual: participantes no jogo ↔ top equipes. Os rankings aparecem desde o início (todo mundo
// zerado); só um evento sem equipes (ou sem crianças) deixa aquele ranking de fora.
import { useEffect, useMemo, useState } from 'react';
import UltimasLeituras, { type LeituraDoJogo } from './UltimasLeituras';
import RankingDaPartida, { type LinhaDaPartida } from './RankingDaPartida';

// Tempo de cada ranking embaixo das leituras
const TROCA_DE_RANKING_MS = 10000;

type Ranking = 'principal' | 'top';

export default function ColunaDoJogo({ leituras, equipes, participantes, individual, semTop = false, intervaloMs = TROCA_DE_RANKING_MS }: {
  leituras: LeituraDoJogo[];
  // Pontos ganhos na partida (não o total do evento)
  equipes: LinhaDaPartida[];
  participantes: LinhaDaPartida[];
  individual: boolean;
  // Só o ranking principal (ex.: Caça ao Monstro, em que as crianças não pontuam durante o jogo)
  semTop?: boolean;
  // Tempo de cada ranking (a demo local usa menos para não esperar)
  intervaloMs?: number;
}) {
  const principal = individual ? participantes : equipes;
  const top = individual ? equipes : participantes;
  const temPrincipal = principal.length > 0;
  const temTop = !semTop && top.length > 0;
  const rankings = useMemo<Ranking[]>(() => {
    const lista: Ranking[] = [];
    if (temPrincipal) lista.push('principal');
    if (temTop) lista.push('top');
    return lista;
  }, [temPrincipal, temTop]);
  const [ranking, setRanking] = useState<Ranking>('principal');

  useEffect(() => {
    if (rankings.length < 2) return undefined;
    const intervalo = window.setInterval(() => {
      setRanking((atual) => rankings[(Math.max(rankings.indexOf(atual), 0) + 1) % rankings.length]);
    }, intervaloMs);
    return () => window.clearInterval(intervalo);
  }, [rankings, intervaloMs]);

  const visivel = rankings.includes(ranking) ? ranking : rankings[0];

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      {/* As 6 últimas leituras em ~45% da altura; o ranking fica com o resto */}
      <div className={`min-h-0 ${visivel ? 'flex-[9]' : 'flex-1'}`}>
        <UltimasLeituras leituras={leituras} />
      </div>
      {visivel && (
        <div className="min-h-0 flex-[11]">
          {visivel === 'principal'
            ? <RankingDaPartida modo={individual ? 'participantes' : 'equipes'} linhas={principal} />
            : <RankingDaPartida modo={individual ? 'equipes' : 'participantes'} linhas={top} top />}
        </div>
      )}
    </div>
  );
}
