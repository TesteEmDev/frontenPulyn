// Telão no fim de um jogo: "Fim de jogo!", o Pulyn comemorando e a pontuação final (equipes e, nos jogos individuais, os
// participantes). A pontuação vem do store e se atualiza sozinha se o bônus do vencedor chegar depois. Some depois de um tempo.
import { useEffect, useMemo } from 'react';
import { Crown, Medal, Trophy } from 'lucide-react';
import Avatar from '../ui/Avatar';
import { DEFAULT_AVATAR_ID } from '../../avatar/adventurerAvatars';
import { usePulynStore } from '../../store/mockData';
import FitToBox from './FitToBox';
import PulynComemorando from './PulynComemorando';

export interface FimDeJogo {
  // Muda a cada fim de jogo
  chave: number;
  nomeJogo: string | null;
  // Jogo individual: o destaque são os participantes, não as equipes
  individual: boolean;
}

const EXIBICAO_MS = 45000;
const MEDALHAS = ['#FACC15', '#CBD5E1', '#FB923C'];

interface Linha {
  id: string;
  nome: string;
  pontos: number;
  cor: string;
  avatar?: string | null;
}

function ListaDeRanking({ titulo, linhas, destacarPrimeiro = true }: { titulo: string; linhas: Linha[]; destacarPrimeiro?: boolean }) {
  return (
    <div>
      <p className="mb-2 text-[clamp(0.65rem,1.4vh,0.9rem)] font-bold uppercase tracking-[0.25em] text-primary-300">{titulo}</p>
      <ol className="space-y-2">
        {linhas.map((linha, posicao) => {
          const primeiro = destacarPrimeiro && posicao === 0;
          return (
            <li
              key={linha.id}
              className={`flex animate-bounce-in items-center gap-3 rounded-2xl border px-4 ${primeiro ? 'border-yellow-300/60 bg-yellow-300/10 py-3' : 'border-white/10 bg-white/[0.04] py-2'}`}
              style={{ animationDelay: `${posicao * 160}ms`, animationFillMode: 'both' }}
            >
              <span className="flex w-9 shrink-0 justify-center">
                {posicao === 0 ? <Crown size={primeiro ? 30 : 22} color={MEDALHAS[0]} /> : posicao < 3
                  ? <Medal size={22} color={MEDALHAS[posicao]} />
                  : <span className="text-lg font-bold text-gray-400">{posicao + 1}º</span>}
              </span>
              {linha.avatar !== undefined && <Avatar emoji={linha.avatar || DEFAULT_AVATAR_ID} size="sm" decorative />}
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: linha.cor }} />
              <span className={`min-w-0 flex-1 truncate font-display font-bold text-white ${primeiro ? 'text-[clamp(1.3rem,3.4vh,2.4rem)]' : 'text-[clamp(1rem,2.4vh,1.7rem)]'}`}>{linha.nome}</span>
              <span className={`shrink-0 font-display font-bold ${primeiro ? 'text-[clamp(1.4rem,3.6vh,2.6rem)] text-yellow-300' : 'text-[clamp(1.1rem,2.6vh,1.9rem)] text-white'}`}>
                {linha.pontos} <span className="text-[0.55em] font-semibold text-gray-400">pts</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function PontuacaoFinal({ fim, onTerminar }: { fim: FimDeJogo; onTerminar: () => void }) {
  const teams = usePulynStore((state) => state.teams);
  const children = usePulynStore((state) => state.children);

  useEffect(() => {
    const timer = window.setTimeout(onTerminar, EXIBICAO_MS);
    return () => window.clearTimeout(timer);
  }, [fim.chave, onTerminar]);

  const equipes = useMemo<Linha[]>(() => [...teams]
    .map((team: any) => ({ id: String(team.id), nome: String(team.name ?? team.nome ?? 'Equipe'), pontos: Number(team.points ?? team.score ?? 0), cor: String(team.color ?? team.cor ?? '#1E9BD7') }))
    .sort((a, b) => b.pontos - a.pontos)
    .slice(0, 5), [teams]);

  const participantes = useMemo<Linha[]>(() => {
    const corDaEquipe = new Map(teams.map((team: any) => [String(team.id), String(team.color ?? team.cor ?? '#1E9BD7')]));
    return [...children]
      .filter((child) => child.status === 'active')
      .map((child: any) => ({
        id: String(child.id),
        nome: String(child.nickname || child.name || 'Participante'),
        pontos: Number(child.scores ?? 0),
        cor: corDaEquipe.get(String(child.teamId ?? child.timeId ?? '')) ?? '#1E9BD7',
        avatar: child.avatar ?? null,
      }))
      .sort((a, b) => b.pontos - a.pontos)
      .slice(0, fim.individual ? 5 : 3);
  }, [children, teams, fim.individual]);

  const temPontos = [...equipes, ...participantes].some((linha) => linha.pontos > 0);

  return (
    <section aria-label="Pontuação final" className="relative grid h-full min-h-0 grid-cols-1 gap-3 overflow-hidden rounded-2xl border border-yellow-300/20 bg-dark-card/60 p-3 sm:p-4 lg:grid-cols-[2fr_3fr]">
      {/* O Pulyn comemorando */}
      <div className="relative flex min-h-[240px] flex-col items-center justify-end overflow-hidden rounded-2xl bg-gradient-to-b from-primary-500/10 via-transparent to-yellow-300/10 lg:min-h-0">
        <div className="absolute inset-x-0 top-3 z-10 text-center">
          <Trophy size={34} className="mx-auto text-yellow-300" />
          <h2 className="mt-1 font-display text-[clamp(1.6rem,4.6vh,3.4rem)] font-bold leading-tight text-white">Fim de jogo!</h2>
          {fim.nomeJogo && <p className="text-[clamp(0.8rem,1.9vh,1.3rem)] text-gray-300">{fim.nomeJogo}</p>}
        </div>
        <div className="h-[78%] w-full pt-6">
          <PulynComemorando />
        </div>
      </div>

      {/* Pontuação final */}
      <div className="flex min-h-0 flex-col">
        <h3 className="mb-2 shrink-0 font-display text-[clamp(1.2rem,3vh,2.2rem)] font-bold text-white">Pontuação final</h3>
        <div className="min-h-0 flex-1">
          {temPontos ? (
            <FitToBox align="center" scrollOverflow minScale={0.4} maxScale={1.3}>
              <div className="space-y-4">
                {fim.individual ? (
                  <ListaDeRanking titulo="Participantes" linhas={participantes} />
                ) : (
                  <>
                    <ListaDeRanking titulo="Equipes" linhas={equipes} />
                    {participantes.some((p) => p.pontos > 0) && <ListaDeRanking titulo="Destaques" linhas={participantes} destacarPrimeiro={false} />}
                  </>
                )}
              </div>
            </FitToBox>
          ) : (
            <p className="flex h-full items-center justify-center text-center text-[clamp(1rem,2.4vh,1.6rem)] text-gray-300">
              Obrigado por jogar! Os pontos aparecem aqui assim que forem somados.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
