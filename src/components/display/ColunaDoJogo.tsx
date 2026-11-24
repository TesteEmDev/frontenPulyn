// Coluna ao lado do jogo no telão: alterna as últimas leituras com o ranking da partida. Em jogo em equipe o ranking é das
// equipes; em jogo individual, dos participantes. O ranking só entra na rotação depois que alguém pontua.
import { useEffect, useMemo, useState } from 'react';
import UltimasLeituras, { type LeituraDoJogo } from './UltimasLeituras';
import RankingDaPartida, { type LinhaDaPartida } from './RankingDaPartida';

// Tempo de cada tela na coluna
const TROCA_DE_TELA_MS = 10000;

type Tela = 'leituras' | 'ranking';

export default function ColunaDoJogo({ leituras, equipes, participantes, individual }: {
  leituras: LeituraDoJogo[];
  // Pontos ganhos na partida (não o total do evento)
  equipes: LinhaDaPartida[];
  participantes: LinhaDaPartida[];
  individual: boolean;
}) {
  const ranking = individual ? participantes : equipes;
  const temRanking = ranking.some((linha) => linha.pontos > 0);
  const telas = useMemo<Tela[]>(() => (temRanking ? ['leituras', 'ranking'] : ['leituras']), [temRanking]);
  const [tela, setTela] = useState<Tela>('leituras');

  useEffect(() => {
    if (telas.length < 2) { setTela('leituras'); return undefined; }
    const intervalo = window.setInterval(() => setTela((atual) => (atual === 'leituras' ? 'ranking' : 'leituras')), TROCA_DE_TELA_MS);
    return () => window.clearInterval(intervalo);
  }, [telas]);

  return tela === 'ranking' && temRanking
    ? <RankingDaPartida modo={individual ? 'participantes' : 'equipes'} linhas={ranking} />
    : <UltimasLeituras leituras={leituras} />;
}
