import { useEffect, useState } from 'react';
import { Clock, Gamepad2, Users, User } from 'lucide-react';
import Card from '../ui/Card';
import PagedItems, { type PagedItem } from './PagedItems';

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

// Tamanhos de texto que acompanham a altura da tela (o telão é visto de longe)
const TEXT_DESCRIPTION = 'text-[clamp(0.9rem,2vh,1.5rem)]';
const TEXT_RULE = 'text-[clamp(0.85rem,1.9vh,1.4rem)]';

// Descrição e regras de um jogo como itens que o painel divide em páginas (nada fica cortado)
export const buildGameItems = (game: GuideGame): PagedItem[] => {
  const items: PagedItem[] = [];
  if (game.description) {
    items.push({
      key: 'description',
      chars: game.description.length,
      node: <p className={`leading-snug text-gray-200 ${TEXT_DESCRIPTION}`}>{game.description}</p>,
    });
  }
  const rules = parseGuideRules(game.rules);
  rules.forEach((rule, index) => {
    items.push({
      key: `rule-${index}`,
      chars: rule.length,
      node: (
        <div>
          {index === 0 && (
            <p className="mb-1.5 text-[clamp(0.6rem,1.3vh,0.8rem)] font-bold uppercase tracking-[0.25em] text-primary-300">Regras</p>
          )}
          {rules.length === 1 ? (
            <p className={`leading-snug text-white ${TEXT_RULE}`}>{rule}</p>
          ) : (
            <div className={`flex gap-2.5 leading-snug text-white ${TEXT_RULE}`}>
              <span className="mt-0.5 flex h-[1.6em] w-[1.6em] shrink-0 items-center justify-center rounded-full bg-primary-500/20 text-[0.8em] font-bold text-primary-300">
                {index + 1}
              </span>
              <span>{rule}</span>
            </div>
          )}
        </div>
      ),
    });
  });
  return items;
};

// Nome do jogo com tipo e duração
export function GameTitleRow({ game, isNext = false }: { game: GuideGame; isNext?: boolean }) {
  const isTeam = String(game.type || 'team').toLowerCase() !== 'individual';
  const chip = 'inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-0.5 text-[clamp(0.65rem,1.4vh,0.85rem)] text-gray-300';
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <h3 className="font-display text-[clamp(1.25rem,3.2vh,2.4rem)] font-bold leading-tight text-white">{game.name}</h3>
      <span className={chip}>
        {isTeam ? <Users size={12} /> : <User size={12} />}
        {isTeam ? 'Em equipe' : 'Individual'}
      </span>
      {game.duration ? (
        <span className={chip}>
          <Clock size={12} />
          {game.duration} min
        </span>
      ) : null}
      {isNext && (
        <span className="rounded-full border border-warning-400/30 bg-warning-500/15 px-2.5 py-0.5 text-[clamp(0.6rem,1.3vh,0.75rem)] font-bold uppercase tracking-wide text-warning-300">
          Próximo jogo
        </span>
      )}
    </div>
  );
}

// Guia em rodízio por todos os jogos (enquanto nenhum jogo foi iniciado no evento). Cada jogo fica o
// tempo de passar todas as suas páginas; depois segue para o próximo.
export default function GameGuide({
  games,
  highlightName,
}: {
  games: GuideGame[];
  // Jogo já escolhido pelo Game Master e ainda não iniciado: abre nele e recebe a etiqueta "Próximo jogo"
  highlightName?: string | null;
}) {
  const [index, setIndex] = useState(() => {
    const found = highlightName ? games.findIndex((g) => g.name === highlightName) : -1;
    return found >= 0 ? found : 0;
  });

  const count = games.length;
  const current = count > 0 ? games[index % count] : null;

  // Se o jogo escolhido mudar, o guia passa a mostrar ele
  useEffect(() => {
    if (!highlightName) return;
    const found = games.findIndex((g) => g.name === highlightName);
    if (found >= 0) setIndex(found);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightName]);

  if (!current) return null;

  const isNext = Boolean(highlightName) && current.name === highlightName;

  return (
    <section aria-label="Guia dos jogos" className="h-full min-h-0">
      <Card variant="glow" className="flex h-full min-h-0 flex-col overflow-hidden p-3 sm:p-4">
        <div className="mb-2 flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] pb-2">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-primary-400/20 bg-primary-500/10 p-2 text-primary-300">
              <Gamepad2 size={20} />
            </div>
            <div>
              <h2 className="font-display text-[clamp(1rem,2.4vh,1.5rem)] font-bold text-white">Guia dos jogos</h2>
              <p className="text-[clamp(0.6rem,1.3vh,0.8rem)] text-gray-500">Jogo {(index % count) + 1} de {count} · conheça as regras antes do primeiro jogo</p>
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

        <div className="mb-2 shrink-0" aria-live="polite">
          <GameTitleRow game={current} isNext={isNext} />
        </div>

        <div className="min-h-0 flex-1">
          <PagedItems
            items={buildGameItems(current)}
            resetKey={current.id}
            onCycle={() => setIndex((value) => (value + 1) % count)}
          />
        </div>
      </Card>
    </section>
  );
}
