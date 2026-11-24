// Coluna ao lado do jogo no telão: alterna as últimas leituras com o ranking da partida e, depois dele, o "Top" do outro
// lado. Jogo em equipe: leituras → equipes → top participantes. Individual: leituras → participantes → top equipes.
// Cada ranking só entra na rotação depois que alguém pontua.
import { useEffect, useMemo, useState } from 'react';
import UltimasLeituras, { type LeituraDoJogo } from './UltimasLeituras';
import RankingDaPartida, { type LinhaDaPartida } from './RankingDaPartida';

// Tempo de cada tela na coluna
const TROCA_DE_TELA_MS = 10000;

type Tela = 'leituras' | 'principal' | 'top';

export default function ColunaDoJogo({ leituras, equipes, participantes, individual, intervaloMs = TROCA_DE_TELA_MS }: {
  leituras: LeituraDoJogo[];
  // Pontos ganhos na partida (não o total do evento)
  equipes: LinhaDaPartida[];
  participantes: LinhaDaPartida[];
  individual: boolean;
  // Tempo de cada tela (a demo local usa menos para não esperar)
  intervaloMs?: number;
}) {
  const principal = individual ? participantes : equipes;
  const top = individual ? equipes : participantes;
  const temPrincipal = principal.some((linha) => linha.pontos > 0);
  const temTop = top.some((linha) => linha.pontos > 0);
  const telas = useMemo<Tela[]>(() => {
    const lista: Tela[] = ['leituras'];
    if (temPrincipal) lista.push('principal');
    if (temTop) lista.push('top');
    return lista;
  }, [temPrincipal, temTop]);
  const [tela, setTela] = useState<Tela>('leituras');

  useEffect(() => {
    if (telas.length < 2) { setTela('leituras'); return undefined; }
    const intervalo = window.setInterval(() => {
      setTela((atual) => telas[(Math.max(telas.indexOf(atual), 0) + 1) % telas.length]);
    }, intervaloMs);
    return () => window.clearInterval(intervalo);
  }, [telas, intervaloMs]);

  const atual = telas.includes(tela) ? tela : 'leituras';
  if (atual === 'principal') return <RankingDaPartida modo={individual ? 'participantes' : 'equipes'} linhas={principal} />;
  if (atual === 'top') return <RankingDaPartida modo={individual ? 'equipes' : 'participantes'} linhas={top} top />;
  return <UltimasLeituras leituras={leituras} />;
}
