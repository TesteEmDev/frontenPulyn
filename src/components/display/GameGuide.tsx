import { useCallback, useEffect, useState } from 'react';
import { Clock, Gamepad2, Users, User } from 'lucide-react';
import Card from '../ui/Card';
import FitToBox from './FitToBox';

export interface GuideGame {
  id: string;
  name: string;
  description?: string | null;
  rules?: string | null;
  type?: string | null;
  duration?: number | null;
}

// As regras são cadastradas como texto livre, em geral uma por linha (com ou sem "-", "•" ou "1.").
export const parseGuideRules = (rules: string | null | undefined): string[] =>
  String(rules || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-•*–]+|\d+\s*[.)\-–:])\s*/, '').trim())
    .filter(Boolean);

// Quanto mais texto, mais tempo o jogo fica na tela (com mínimo e máximo; o máximo dá tempo de ler as duas partes das regras longas).
export const guideSlideDuration = (game: GuideGame) => {
  const chars = (game.description || '').length + (game.rules || '').length + game.name.length;
  return Math.min(Math.max(9000 + chars * 45, 10000), 45000);
};

// Divide as regras em duas partes de tamanho parecido (pelo total de letras), sem separar uma regra no meio.
const splitRulesInTwo = (rules: string[]): [string[], string[]] => {
  const total = rules.reduce((sum, rule) => sum + rule.length, 0);
  let bestCut = 1;
  let bestGap = Number.POSITIVE_INFINITY;
  let acc = 0;
  for (let cut = 1; cut < rules.length; cut += 1) {
    acc += rules[cut - 1].length;
    const gap = Math.abs(acc - total / 2);
    if (gap < bestGap) {
      bestGap = gap;
      bestCut = cut;
    }
  }
  return [rules.slice(0, bestCut), rules.slice(bestCut)];
};

const RULE_TEXT = 'text-[clamp(0.8rem,1.6vh,1.15rem)]';
const RULES_LABEL = 'text-[clamp(0.6rem,1.15vh,0.8rem)] font-bold uppercase tracking-[0.25em] text-primary-300';

// Lista numerada das regras; `offset` continua a numeração na segunda parte.
function RuleList({ rules, offset = 0, spacing }: { rules: string[]; offset?: number; spacing: string }) {
  if (rules.length === 1 && offset === 0) {
    return <p className={`leading-snug text-white ${RULE_TEXT}`}>{rules[0]}</p>;
  }
  return (
    <ol className={spacing}>
      {rules.map((rule, position) => (
        <li key={`${offset + position}-${rule}`} className={`flex gap-3 leading-snug text-white ${RULE_TEXT}`}>
          <span className="mt-0.5 flex h-[1.6em] w-[1.6em] shrink-0 items-center justify-center rounded-full bg-primary-500/20 text-[0.8em] font-bold text-primary-300">
            {offset + position + 1}
          </span>
          <span>{rule}</span>
        </li>
      ))}
    </ol>
  );
}

// Nome do jogo com tipo e duração
function GameTitleRow({ game, isNext }: { game: GuideGame; isNext: boolean }) {
  const isTeam = String(game.type || 'team').toLowerCase() !== 'individual';
  const chip = 'inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-0.5 text-[clamp(0.7rem,1.35vh,0.9rem)] text-gray-300';
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <h3 className="font-display text-[clamp(1.3rem,3.3vh,2.5rem)] font-bold leading-tight text-white">{game.name}</h3>
      <span className={chip}>
        {isTeam ? <Users size={16} /> : <User size={16} />}
        {isTeam ? 'Em equipe' : 'Individual'}
      </span>
      {game.duration ? (
        <span className={chip}>
          <Clock size={16} />
          {game.duration} min
        </span>
      ) : null}
      {isNext && (
        <span className="rounded-full border border-warning-400/30 bg-warning-500/15 px-3 py-0.5 text-[clamp(0.65rem,1.25vh,0.85rem)] font-bold uppercase tracking-wide text-warning-300">
          Próximo jogo
        </span>
      )}
    </div>
  );
}

// Guia em rodízio por todos os jogos, enquanto não há jogo rodando. Cada jogo aparece com a descrição e as regras:
// o texto é reduzido o necessário para caber. Se mesmo assim não couber, as regras são mostradas em duas partes
// (a primeira metade e depois a outra) dentro do tempo do jogo na tela.
export default function GameGuide({
  games,
  highlightName,
  compact = false,
  heading,
  subheading,
}: {
  games: GuideGame[];
  // Jogo já escolhido pelo Game Master e ainda não iniciado: abre nele e recebe a etiqueta "Próximo jogo"
  highlightName?: string | null;
  // Metade da tela (dividindo com o placar): uma coluna só, em vez do painel dividido ao meio
  compact?: boolean;
  // Troca o título do painel (ex.: regras de um jogo só, antes dele começar) e esconde o "Jogo 1 de N"
  heading?: string;
  subheading?: string;
}) {
  const [index, setIndex] = useState(() => {
    const found = highlightName ? games.findIndex((g) => g.name === highlightName) : -1;
    return found >= 0 ? found : 0;
  });
  // Jogos cujas regras não cabem inteiras e passam a ser mostradas em duas partes. Vale até a tela mudar de tamanho.
  const [pagedGames, setPagedGames] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(0);

  const count = games.length;
  const current = count > 0 ? games[index % count] : null;
  const slideMs = current ? guideSlideDuration(current) : 0;
  const rules = parseGuideRules(current?.rules);
  const currentId = current?.id;
  const isPaged = Boolean(currentId && pagedGames[currentId]) && rules.length > 1;

  useEffect(() => {
    if (count < 2) return undefined;
    const timer = window.setTimeout(() => setIndex((value) => (value + 1) % count), slideMs);
    return () => window.clearTimeout(timer);
  }, [index, count, slideMs]);

  // Se o jogo escolhido mudar, o guia passa a mostrar ele
  useEffect(() => {
    if (!highlightName) return;
    const found = games.findIndex((g) => g.name === highlightName);
    if (found >= 0) setIndex(found);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightName]);

  // Em duas partes: cada uma fica metade do tempo do jogo na tela.
  useEffect(() => {
    setPage(0);
    if (!isPaged) return undefined;
    const timer = window.setTimeout(() => setPage(1), Math.max(slideMs / 2, 5000));
    return () => window.clearTimeout(timer);
  }, [currentId, isPaged, slideMs]);

  // A tela mudou de tamanho: mede de novo o que cabe.
  useEffect(() => {
    let timer = 0;
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setPagedGames({}), 300);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  // Só decide paginar com as regras inteiras na tela (depois de paginado, a medição não volta atrás).
  const handleOverflow = useCallback((overflowing: boolean) => {
    if (!overflowing || !currentId) return;
    setPagedGames((previous) => (previous[currentId] ? previous : { ...previous, [currentId]: true }));
  }, [currentId]);

  if (!current) return null;

  const isNext = Boolean(highlightName) && current.name === highlightName;
  const [firstHalf, secondHalf] = isPaged ? splitRulesInTwo(rules) : [rules, []];
  const visibleRules = isPaged ? (page === 0 ? firstHalf : secondHalf) : rules;
  const visibleOffset = isPaged && page === 1 ? firstHalf.length : 0;
  const pageLabel = isPaged ? ` · parte ${page + 1} de 2` : '';
  const overflowWatcher = isPaged ? undefined : handleOverflow;

  return (
    <section aria-label="Guia dos jogos" className="h-full min-h-0">
      <Card variant="glow" className="flex h-full min-h-0 flex-col overflow-hidden p-2.5 sm:p-3">
        <div className="mb-2 flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] pb-2">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-primary-400/20 bg-primary-500/10 p-2 text-primary-300">
              <Gamepad2 size={20} />
            </div>
            <div>
              <h2 className="font-display text-[clamp(1.1rem,2.6vh,1.8rem)] font-bold text-white">{heading ?? 'Guia dos jogos'}</h2>
              <p className="text-[clamp(0.65rem,1.4vh,0.9rem)] text-gray-500">
                {heading
                  ? subheading
                  : <>Jogo {(index % count) + 1} de {count}{compact ? '' : ' · conheça as regras enquanto o próximo jogo não começa'}</>}
              </p>
            </div>
          </div>
          {count > 1 && (
            <div className="flex items-center gap-1.5" aria-hidden="true">
              {games.map((game, position) => (
                <span
                  key={game.id}
                  className={`h-2 rounded-full transition-all duration-300 ${position === index % count ? 'w-6 bg-primary-400' : 'w-2 bg-white/20'}`}
                />
              ))}
            </div>
          )}
        </div>

        {compact ? (
          // Metade da tela: tudo numa coluna, reduzido o necessário para caber
          <div className="min-h-0 flex-1" aria-live="polite">
            <FitToBox key={`${current.id}-${page}`} scrollOverflow minScale={0.55} maxScale={1} onOverflowChange={overflowWatcher}>
              <div className="animate-in fade-in duration-500">
                <GameTitleRow game={current} isNext={isNext} />
                {current.description && (!isPaged || page === 0) ? (
                  <p className="mt-2 leading-snug text-gray-200 text-[clamp(0.8rem,1.55vh,1.1rem)]">{current.description}</p>
                ) : null}
                {visibleRules.length > 0 && (
                  <div className="mt-3">
                    <p className={`mb-2 ${RULES_LABEL}`}>Regras{pageLabel}</p>
                    <RuleList rules={visibleRules} offset={visibleOffset} spacing="space-y-1.5" />
                  </div>
                )}
              </div>
            </FitToBox>
          </div>
        ) : (
          // Painel dividido ao meio: o jogo (nome, tipo, descrição) à esquerda e as regras à direita
          <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row lg:gap-0" aria-live="polite">
            <div className={`min-h-[200px] min-w-0 lg:min-h-0 ${rules.length > 0 ? 'lg:w-1/2 lg:pr-5' : 'lg:w-full'}`}>
              <FitToBox key={current.id} align="center" scrollOverflow minScale={0.55} maxScale={1}>
                <div className="animate-in fade-in duration-500">
                  <GameTitleRow game={current} isNext={isNext} />
                  {current.description ? (
                    <p className="mt-3 leading-snug text-gray-200 text-[clamp(0.8rem,1.65vh,1.2rem)]">{current.description}</p>
                  ) : null}
                </div>
              </FitToBox>
            </div>

            {rules.length > 0 && (
              <>
                <div className="hidden w-px shrink-0 bg-gradient-to-b from-transparent via-white/15 to-transparent lg:block" aria-hidden="true" />
                <div className="min-h-[240px] min-w-0 lg:min-h-0 lg:w-1/2 lg:pl-5">
                  <FitToBox key={`${current.id}-${page}`} align="center" scrollOverflow minScale={0.55} maxScale={1} onOverflowChange={overflowWatcher}>
                    <div className="animate-in fade-in duration-500">
                      <p className={`mb-2 ${RULES_LABEL}`}>Regras{pageLabel}</p>
                      <RuleList rules={visibleRules} offset={visibleOffset} spacing="space-y-2" />
                    </div>
                  </FitToBox>
                </div>
              </>
            )}
          </div>
        )}
      </Card>
    </section>
  );
}
