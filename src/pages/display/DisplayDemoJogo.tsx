import { useEffect, useMemo, useState } from 'react';
import ColunaDoJogo from '../../components/display/ColunaDoJogo';
import { type LeituraDoJogo } from '../../components/display/UltimasLeituras';
import { type LinhaDaPartida } from '../../components/display/RankingDaPartida';

// Página de demonstração: o telão com um jogo rolando e a coluna ao lado (últimas leituras e ranking da partida), com
// leituras simuladas. Nada do evento é lido nem gravado.
const EQUIPES = [
  { id: 'e1', nome: 'Equipe Azul', cor: '#1E9BD7' },
  { id: 'e2', nome: 'Equipe Laranja', cor: '#F59E0B' },
  { id: 'e3', nome: 'Equipe Verde', cor: '#22C55E' },
  { id: 'e4', nome: 'Equipe Roxa', cor: '#A78BFA' },
];
const CRIANCAS = [
  { id: 'c1', apelido: 'Bia', equipe: 'e1' }, { id: 'c2', apelido: 'Léo', equipe: 'e2' },
  { id: 'c3', apelido: 'Nina', equipe: 'e1' }, { id: 'c4', apelido: 'Davi', equipe: 'e3' },
  { id: 'c5', apelido: 'Duda', equipe: 'e4' }, { id: 'c6', apelido: 'Theo', equipe: 'e2' },
  { id: 'c7', apelido: 'Lara', equipe: 'e3' }, { id: 'c8', apelido: 'Gabi', equipe: 'e4' },
];
const CHECKPOINTS = Array.from({ length: 10 }, (_, i) => ({ numero: String(i + 1), nome: `Checkpoint ${i + 1}` }));
const PONTOS_POR_LEITURA = 10;
const MAX_LEITURAS = 8;
const AUTOMATICO_MS = 2000;

const sortear = <T,>(lista: T[]) => lista[Math.floor(Math.random() * lista.length)];
const corDaEquipe = (id: string) => EQUIPES.find((e) => e.id === id)?.cor ?? '#1E9BD7';

export default function DisplayDemoJogo() {
  const [individual, setIndividual] = useState(false);
  const [leituras, setLeituras] = useState<LeituraDoJogo[]>([]);
  const [pontos, setPontos] = useState<Record<string, number>>({});
  const [automatico, setAutomatico] = useState(false);
  const [rapido, setRapido] = useState(true);
  const [chave, setChave] = useState(1);

  const simular = (vezes = 1) => {
    for (let i = 0; i < vezes; i += 1) {
      const crianca = sortear(CRIANCAS);
      const checkpoint = sortear(CHECKPOINTS);
      const leitura: LeituraDoJogo = {
        id: `${Date.now()}-${Math.random()}`,
        apelido: crianca.apelido,
        checkpoint: checkpoint.numero,
        checkpointNome: checkpoint.nome,
        pontos: PONTOS_POR_LEITURA,
        cor: corDaEquipe(crianca.equipe),
      };
      setLeituras((atual) => [leitura, ...atual].slice(0, MAX_LEITURAS));
      setPontos((atual) => ({ ...atual, [crianca.id]: (atual[crianca.id] || 0) + PONTOS_POR_LEITURA }));
    }
  };

  const zerar = () => { setLeituras([]); setPontos({}); setChave((c) => c + 1); };

  useEffect(() => {
    if (!automatico) return undefined;
    const intervalo = window.setInterval(() => simular(1), AUTOMATICO_MS);
    return () => window.clearInterval(intervalo);
  }, [automatico]);

  // Mesma soma do servidor (pontos-da-partida): por participante e por equipe
  const participantes = useMemo<LinhaDaPartida[]>(() => CRIANCAS
    .map((c) => ({ id: c.id, nome: c.apelido, cor: corDaEquipe(c.equipe), pontos: pontos[c.id] || 0 }))
    .filter((l) => l.pontos > 0)
    .sort((a, b) => b.pontos - a.pontos), [pontos]);
  const equipes = useMemo<LinhaDaPartida[]>(() => EQUIPES
    .map((e) => ({ id: e.id, nome: e.nome, cor: e.cor, pontos: CRIANCAS.filter((c) => c.equipe === e.id).reduce((s, c) => s + (pontos[c.id] || 0), 0) }))
    .filter((l) => l.pontos > 0)
    .sort((a, b) => b.pontos - a.pontos), [pontos]);

  const botao = 'rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1 text-sm font-semibold text-white hover:bg-white/[0.12]';
  const ativo = 'border-primary-400/60 bg-primary-500/25';
  return (
    <div className="flex h-screen flex-col bg-[#08111f] p-3 text-white">
      <div className="mb-2 flex shrink-0 flex-wrap items-center gap-2">
        <span className="rounded-full bg-warning/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-warning">Prévia · leituras simuladas</span>
        <button className={`${botao} ${!individual ? ativo : ''}`} onClick={() => { setIndividual(false); setChave((c) => c + 1); }}>Jogo em equipe</button>
        <button className={`${botao} ${individual ? ativo : ''}`} onClick={() => { setIndividual(true); setChave((c) => c + 1); }}>Jogo individual</button>
        <span className="mx-1 h-5 w-px bg-white/15" />
        <button className={botao} onClick={() => simular(1)}>Simular leitura</button>
        <button className={botao} onClick={() => simular(5)}>Simular 5 leituras</button>
        <button className={`${botao} ${automatico ? ativo : ''}`} onClick={() => setAutomatico((a) => !a)}>
          {automatico ? '⏸ Parar leituras automáticas' : '▶ Leituras automáticas'}
        </button>
        <button className={botao} onClick={zerar}>Zerar partida</button>
        <span className="mx-1 h-5 w-px bg-white/15" />
        <button className={`${botao} ${rapido ? ativo : ''}`} onClick={() => { setRapido((r) => !r); setChave((c) => c + 1); }}>
          {rapido ? 'Troca de tela: 4 s (prévia)' : 'Troca de tela: 10 s (telão)'}
        </button>
      </div>
      <div className="flex min-h-0 flex-1 gap-2">
        <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] text-center text-gray-400">
          <div>
            <p className="font-display text-2xl font-bold text-gray-300">{individual ? 'Zona - Individual (exemplo)' : 'Zona - Equipe (exemplo)'}</p>
            <p className="mt-1 text-sm">Aqui fica o jogo (mapa, monstro, tesouro…). A coluna à direita é a do telão de verdade.</p>
          </div>
        </div>
        <div className="w-[clamp(13rem,19vw,21rem)] shrink-0">
          <ColunaDoJogo
            key={chave}
            leituras={leituras}
            equipes={equipes}
            participantes={participantes}
            individual={individual}
            intervaloMs={rapido ? 4000 : 10000}
          />
        </div>
      </div>
    </div>
  );
}
