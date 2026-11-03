import { useCallback, useState } from 'react';
import PontuacaoFinal, { type FimDeJogo, type Linha } from '../../components/display/PontuacaoFinal';

// Página de demonstração: mostra a tela de pontuação final com dados de exemplo (nada do evento é lido nem gravado).
const EQUIPES: Linha[] = [
  { id: 'e1', nome: 'Equipe Azul', pontos: 120, cor: '#1E9BD7' },
  { id: 'e2', nome: 'Equipe Laranja', pontos: 95, cor: '#F59E0B' },
  { id: 'e3', nome: 'Equipe Verde', pontos: 80, cor: '#22C55E' },
  { id: 'e4', nome: 'Equipe Roxa', pontos: 40, cor: '#A78BFA' },
];
const PARTICIPANTES: Linha[] = [
  { id: 'p1', nome: 'Bia', pontos: 45, cor: '#1E9BD7', avatar: null },
  { id: 'p2', nome: 'Léo', pontos: 40, cor: '#F59E0B', avatar: null },
  { id: 'p3', nome: 'Nina', pontos: 38, cor: '#1E9BD7', avatar: null },
  { id: 'p4', nome: 'Davi', pontos: 31, cor: '#22C55E', avatar: null },
  { id: 'p5', nome: 'Duda', pontos: 27, cor: '#A78BFA', avatar: null },
];

export default function DisplayDemoPontuacao() {
  const [individual, setIndividual] = useState(false);
  const [chave, setChave] = useState(1);
  const repetir = useCallback(() => setChave((c) => c + 1), []);
  const fim: FimDeJogo = { chave, nomeJogo: individual ? 'Conquista Individual (exemplo)' : 'Caça ao Tesouro (exemplo)', individual };

  const botao = 'rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1 text-sm font-semibold text-white hover:bg-white/[0.12]';
  return (
    <div className="flex h-screen flex-col bg-[#08111f] p-3 text-white">
      <div className="mb-2 flex shrink-0 flex-wrap items-center gap-2">
        <span className="rounded-full bg-warning/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-warning">Prévia · dados de exemplo</span>
        <button className={botao} onClick={() => { setIndividual(false); repetir(); }}>Jogo em equipe</button>
        <button className={botao} onClick={() => { setIndividual(true); repetir(); }}>Jogo individual</button>
        <button className={botao} onClick={repetir}>Repetir animação</button>
      </div>
      <div className="min-h-0 flex-1">
        <PontuacaoFinal key={chave} fim={fim} onTerminar={repetir} exemplo={{ equipes: EQUIPES, participantes: PARTICIPANTES }} />
      </div>
    </div>
  );
}
