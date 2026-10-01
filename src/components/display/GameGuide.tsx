import { useEffect, useState } from 'react';
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

// Quanto mais texto, mais tempo o jogo fica na tela (com mínimo e máximo).
export const guideSlideDuration = (game: GuideGame) => {
  const chars = (game.description || '').length + (game.rules || '').length + game.name.length;
  return Math.min(Math.max(9000 + chars * 45, 10000), 30000);
};

// Nome do jogo com tipo e duração
function GameTitleRow({ game, isNext }: { game: GuideGame; isNext: boolean }) {
  const isTeam = String(game.type || 'team').toLowerCase() !== 'individual';
  const chip = 'inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-0.5 text-[clamp(0.75rem,1.7vh,1.05rem)] text-gray-300';
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <h3 className="font-display text-[clamp(1.6rem,4.6vh,3.4rem)] font-bold leading-tight text-white">{game.name}</h3>
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
        <span className="rounded-full border border-warning-400/30 bg-warning-500/15 px-3 py-0.5 text-[clamp(0.7rem,1.5vh,0.95rem)] font-bold uppercase tracking-wide text-warning-300">
          Próximo jogo
        </span>
      )}
    </div>
  );
}

// Guia em rodízio por todos os jogos, enquanto não há jogo rodando. Cada jogo aparece inteiro, com a
// descrição e TODAS as regras na mesma tela: se o texto for grande, ele é reduzido o necessário para caber.
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
  const slideMs = current ? guideSlideDuration(current) : 0;

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

  if (!current) return null;

  const rules = parseGuideRules(current.rules);
  const isNext = Boolean(highlightName) && current.name === highlightName;
  const ruleText = 'text-[clamp(0.9rem,2.1vh,1.55rem)]';

  return (
    <section aria-label="Guia dos jogos" className="h-full min-h-0">
      <Card variant="glow" className="flex h-full min-h-0 flex-col overflow-hidden p-4 sm:p-5">
        <div className="mb-3 flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-primary-400/20 bg-primary-500/10 p-2 text-primary-300">
              <Gamepad2 size={20} />
            </div>
            <div>
              <h2 className="font-display text-[clamp(1.1rem,2.6vh,1.8rem)] font-bold text-white">Guia dos jogos</h2>
              <p className="text-[clamp(0.65rem,1.4vh,0.9rem)] text-gray-500">Jogo {(index % count) + 1} de {count} · conheça as regras enquanto o próximo jogo não começa</p>
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

        {/* Painel dividido ao meio: o jogo (nome, tipo, descrição) à esquerda e as regras à direita */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:gap-0" aria-live="polite">
          <div className={`min-h-[200px] min-w-0 lg:min-h-0 ${rules.length > 0 ? 'lg:w-1/2 lg:pr-8' : 'lg:w-full'}`}>
            <FitToBox align="center" minScale={0.45} maxScale={1.2}>
              <div key={current.id} className="animate-in fade-in duration-500">
                <GameTitleRow game={current} isNext={isNext} />
                {current.description ? (
                  <p className="mt-4 leading-snug text-gray-200 text-[clamp(0.95rem,2.2vh,1.7rem)]">{current.description}</p>
                ) : null}
              </div>
            </FitToBox>
          </div>

          {rules.length > 0 && (
            <>
              <div className="hidden w-px shrink-0 bg-gradient-to-b from-transparent via-white/15 to-transparent lg:block" aria-hidden="true" />
              <div className="min-h-[240px] min-w-0 lg:min-h-0 lg:w-1/2 lg:pl-8">
                <FitToBox align="center" minScale={0.45} maxScale={1.2}>
                  <div key={current.id} className="animate-in fade-in duration-500">
                    <p className="mb-3 text-[clamp(0.65rem,1.4vh,0.9rem)] font-bold uppercase tracking-[0.25em] text-primary-300">Regras</p>
                    {rules.length === 1 ? (
                      <p className={`leading-snug text-white ${ruleText}`}>{rules[0]}</p>
                    ) : (
                      <ol className="space-y-3">
                        {rules.map((rule, position) => (
                          <li key={`${position}-${rule}`} className={`flex gap-3 leading-snug text-white ${ruleText}`}>
                            <span className="mt-0.5 flex h-[1.6em] w-[1.6em] shrink-0 items-center justify-center rounded-full bg-primary-500/20 text-[0.8em] font-bold text-primary-300">
                              {position + 1}
                            </span>
                            <span>{rule}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </FitToBox>
              </div>
            </>
          )}
        </div>
      </Card>
    </section>
  );
}
