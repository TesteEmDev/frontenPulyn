// Coluna ao lado do jogo no telão: alterna as últimas leituras com o ranking da partida. Em jogo em equipe o ranking é das
// equipes; em jogo individual, dos participantes. O ranking só entra na rotação depois que alguém pontua.
// Usada pelo DisplayMain e pela prévia /demo/jogo-em-andamento.
import { useEffect, useMemo, useState } from 'react';
import UltimasLeituras, { type LeituraDoJogo } from './UltimasLeituras';
import RankingDaPartida, { type LinhaDaPartida } from './RankingDaPartida';

const INTERVALO_PADRAO_MS = 10000;

type Tela = 'leituras' | 'ranking';

export default function ColunaDoJogo({ leituras, equipes, participantes, individual, intervaloMs = INTERVALO_PADRAO_MS }: {
  leituras: LeituraDoJogo[];
  // Pontos ganhos na partida (não o total do evento)
  equipes: LinhaDaPartida[];
  participantes: LinhaDaPartida[];
  individual: boolean;
  intervaloMs?: number;
}) {
  const ranking = individual ? participantes : equipes;
  const temRanking = ranking.some((linha) => linha.pontos > 0);
  const telas = useMemo<Tela[]>(() => (temRanking ? ['leituras', 'ranking'] : ['leituras']), [temRanking]);
  const [tela, setTela] = useState<Tela>('leituras');

  useEffect(() => {
    if (telas.length < 2) { setTela('leituras'); return undefined; }
    const intervalo = window.setInterval(() => setTela((atual) => (atual === 'leituras' ? 'ranking' : 'leituras')), intervaloMs);
    return () => window.clearInterval(intervalo);
  }, [telas, intervaloMs]);

  return tela === 'ranking' && temRanking
    ? <RankingDaPartida modo={individual ? 'participantes' : 'equipes'} linhas={ranking} />
    : <UltimasLeituras leituras={leituras} />;
}
