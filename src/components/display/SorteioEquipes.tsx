// Telão durante o sorteio das equipes: o sistema "escolhe" um participante por vez e o coloca na equipe dele.
// As equipes aparecem com os lugares vazios; para cada sorteado os nomes giram por um instante, o escolhido é anunciado
// com a equipe e entra no lugar. Quem já tinha equipe (sorteio só dos que estavam sem time) já aparece no lugar.
// Depois do último, a tela fica um tempo para dar para ler e avisa a tela para sair.
import { useEffect, useMemo, useState } from 'react';
import { Shuffle } from 'lucide-react';
import Avatar from '../ui/Avatar';
import { DEFAULT_AVATAR_ID } from '../../avatar/adventurerAvatars';
import FitToBox from './FitToBox';

export interface MembroSorteado {
  id: string;
  nickname: string;
  avatar?: string | null;
  // Foi sorteado agora (mudou de equipe neste sorteio)
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
  // 'all' sorteia todo mundo de novo; 'unassigned' só quem estava sem equipe
  mode?: string;
  teams: EquipeSorteada[];
}

const INTRO_MS = 1800;        // "Sorteando as equipes..."
const TOTAL_ESCOLHAS_MS = 40000; // tempo máximo para sortear todos (com muita gente, cada escolha fica mais curta)
const MIN_ESCOLHA_MS = 450;
const MAX_ESCOLHA_MS = 1500;
const GIRAR_ATE_MS = 800;     // escolhas mais curtas que isso não giram os nomes
const GIRO_TROCA_MS = 70;     // troca de nome enquanto gira
const LEITURA_MS = 25000;     // depois de tudo no lugar, tempo para ler antes de sair

const CORES_PADRAO = ['#1E9BD7', '#F59E0B', '#22C55E', '#A78BFA', '#EF4444', '#06B6D4', '#EC4899', '#84CC16'];
const corDaEquipe = (equipe: EquipeSorteada, indice: number) => equipe.color || CORES_PADRAO[indice % CORES_PADRAO.length];

interface Escolha {
  membro: MembroSorteado;
  equipeIndice: number;
}

// Quanto cada escolha dura: o sorteio todo cabe em TOTAL_ESCOLHAS_MS, sem ficar lento nem corrido demais.
function duracaoDaEscolhaMs(quantidade: number): number {
  if (quantidade <= 0) return MAX_ESCOLHA_MS;
  return Math.min(MAX_ESCOLHA_MS, Math.max(MIN_ESCOLHA_MS, Math.round(TOTAL_ESCOLHAS_MS / quantidade)));
}

// Quem entra no sorteio e em que ordem (embaralhado): todos no modo 'all'; só os novos nos outros modos.
function montarEscolhas(equipes: EquipeSorteada[], mode?: string, aleatorio: () => number = Math.random): { escolhas: Escolha[]; jaNoLugar: Set<string> } {
  const todos: Escolha[] = equipes.flatMap((equipe, equipeIndice) => equipe.members.map((membro) => ({ membro, equipeIndice })));
  const sorteados = mode === 'all' ? todos : todos.filter((e) => e.membro.novo);
  const ids = new Set(sorteados.map((e) => e.membro.id));
  const embaralhado = [...sorteados];
  for (let i = embaralhado.length - 1; i > 0; i -= 1) {
    const j = Math.floor(aleatorio() * (i + 1));
    [embaralhado[i], embaralhado[j]] = [embaralhado[j], embaralhado[i]];
  }
  return { escolhas: embaralhado, jaNoLugar: new Set(todos.filter((e) => !ids.has(e.membro.id)).map((e) => e.membro.id)) };
}

// Quanto tempo o sorteio fica na tela (introdução + escolhas + leitura)
function duracaoDoSorteioMs(quantidadeEscolhas: number): number {
  return INTRO_MS + quantidadeEscolhas * duracaoDaEscolhaMs(quantidadeEscolhas) + LEITURA_MS;
}

export default function SorteioEquipes({ sorteio, onTerminar }: { sorteio: SorteioDasEquipes; onTerminar: () => void }) {
  const { teams } = sorteio;
  const { escolhas, jaNoLugar } = useMemo(() => montarEscolhas(teams, sorteio.mode), [teams, sorteio.mode, sorteio.chave]); // eslint-disable-line react-hooks/exhaustive-deps
  const porEscolha = duracaoDaEscolhaMs(escolhas.length);
  const girar = porEscolha >= GIRAR_ATE_MS;
  const nomesParaGirar = useMemo(() => teams.flatMap((equipe) => equipe.members), [teams]);

  // colocados: quantos já entraram na equipe | atual: a escolha em andamento (nomes girando ou escolhido anunciado)
  const [colocados, setColocados] = useState(0);
  const [atual, setAtual] = useState<{ indice: number; girando: boolean } | null>(null);
  const [nomeGirando, setNomeGirando] = useState<MembroSorteado | null>(null);
  // Introdução "Sorteando as equipes..." antes da primeira escolha
  const [intro, setIntro] = useState(true);

  useEffect(() => {
    setColocados(0);
    setAtual(null);
    setIntro(true);
    let vivo = true;
    const timers: number[] = [];
    const depois = (ms: number, fn: () => void) => { timers.push(window.setTimeout(() => { if (vivo) fn(); }, ms)); };

    const escolher = (i: number) => {
      if (i >= escolhas.length) {
        setAtual(null);
        return;
      }
      const giro = girar ? Math.round(porEscolha * 0.55) : 0;
      setAtual({ indice: i, girando: girar });
      depois(giro, () => {
        setAtual({ indice: i, girando: false });
        setColocados(i + 1);
        depois(porEscolha - giro, () => escolher(i + 1));
      });
    };
    depois(INTRO_MS, () => { setIntro(false); escolher(0); });
    depois(duracaoDoSorteioMs(escolhas.length), onTerminar);

    return () => {
      vivo = false;
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [sorteio.chave, escolhas, porEscolha, girar, onTerminar]);

  // Enquanto "gira", troca o nome mostrado
  useEffect(() => {
    if (!atual?.girando || nomesParaGirar.length === 0) return undefined;
    const id = window.setInterval(() => {
      setNomeGirando(nomesParaGirar[Math.floor(Math.random() * nomesParaGirar.length)]);
    }, GIRO_TROCA_MS);
    return () => window.clearInterval(id);
  }, [atual?.girando, nomesParaGirar]);

  const total = teams.reduce((soma, equipe) => soma + equipe.members.length, 0);
  const escolhaAtual = atual && !atual.girando ? escolhas[atual.indice] : null;
  const sorteando = intro;
  const terminou = !intro && !atual && colocados >= escolhas.length;

  // Cada equipe tem todos os lugares desde o começo (os de quem ainda vai ser sorteado ficam vazios), para a tela não "pular".
  const lugares = (equipe: EquipeSorteada) => {
    // quem já estava na equipe aparece desde o começo; quem foi sorteado entra na ordem em que foi escolhido
    const fixos = equipe.members.filter((m) => jaNoLugar.has(m.id));
    const sorteadosAqui = escolhas.slice(0, colocados).filter((e) => e.equipeIndice === teams.indexOf(equipe)).map((e) => e.membro);
    const preenchidos = [...fixos, ...sorteadosAqui];
    return Array.from({ length: equipe.members.length }, (_, posicao) => preenchidos[posicao] ?? null);
  };

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

      {/* Quem está sendo escolhido agora */}
      <div className="mb-2 flex h-[clamp(3.2rem,9vh,5.5rem)] shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/25 px-4" aria-live="polite">
        {sorteando && (
          <p className="flex animate-pulse items-center gap-3 font-display text-[clamp(1.1rem,3vh,2rem)] font-bold text-white">
            <Shuffle size={28} className="text-primary-300" /> Sorteando as equipes...
          </p>
        )}
        {atual?.girando && (
          <p className="flex items-center gap-3 font-display text-[clamp(1.1rem,3vh,2rem)] font-bold text-gray-300">
            <Avatar emoji={nomeGirando?.avatar || DEFAULT_AVATAR_ID} size="md" decorative />
            {nomeGirando?.nickname ?? '...'}
          </p>
        )}
        {escolhaAtual && (
          <p key={escolhaAtual.membro.id} className="flex animate-bounce-in items-center gap-3 font-display text-[clamp(1.1rem,3vh,2rem)] font-bold text-white">
            <Avatar emoji={escolhaAtual.membro.avatar || DEFAULT_AVATAR_ID} size="md" decorative />
            <span className="truncate">{escolhaAtual.membro.nickname}</span>
            <span className="text-gray-400">vai para</span>
            <span style={{ color: corDaEquipe(teams[escolhaAtual.equipeIndice], escolhaAtual.equipeIndice) }}>{teams[escolhaAtual.equipeIndice].name}</span>
          </p>
        )}
        {terminou && (
          <p className="animate-bounce-in font-display text-[clamp(1.1rem,3vh,2rem)] font-bold text-success">Equipes formadas!</p>
        )}
      </div>

      <div className="min-h-0 flex-1">
        <FitToBox key={sorteio.chave} align="center" scrollOverflow minScale={0.4} maxScale={1.2}>
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(Math.max(teams.length, 1), 4)}, minmax(15rem, 1fr))` }}>
            {teams.map((equipe, indice) => {
              const cor = corDaEquipe(equipe, indice);
              const slots = lugares(equipe);
              const dentro = slots.filter(Boolean).length;
              return (
                <article key={equipe.id} className="overflow-hidden rounded-2xl border bg-black/25" style={{ borderColor: `${cor}99` }}>
                  <header className="flex items-center justify-between gap-2 px-4 py-2" style={{ backgroundColor: `${cor}33` }}>
                    <h3 className="truncate font-display text-[clamp(1.1rem,2.6vh,1.9rem)] font-bold" style={{ color: cor }}>{equipe.name}</h3>
                    <span className="shrink-0 rounded-full bg-black/30 px-2.5 py-0.5 text-[clamp(0.7rem,1.5vh,1rem)] font-bold text-white">
                      {dentro}/{equipe.members.length}
                    </span>
                  </header>
                  <ul className="space-y-1 p-3">
                    {equipe.members.length === 0 && <li className="text-sm text-gray-500">Nenhum participante</li>}
                    {slots.map((membro, posicao) => (
                      membro ? (
                        <li
                          key={`${equipe.id}-${membro.id}`}
                          className="flex animate-bounce-in items-center gap-2.5 rounded-lg bg-white/[0.06] px-2 py-1"
                        >
                          <Avatar emoji={membro.avatar || DEFAULT_AVATAR_ID} size="sm" decorative />
                          <span className="truncate text-[clamp(0.85rem,2vh,1.35rem)] font-semibold text-white">{membro.nickname}</span>
                        </li>
                      ) : (
                        <li key={`${equipe.id}-vazio-${posicao}`} aria-hidden="true" className="flex h-[1.9em] items-center rounded-lg border border-dashed border-white/10 px-2 text-[clamp(0.85rem,2vh,1.35rem)]">
                          <span className="text-white/10">·····</span>
                        </li>
                      )
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
