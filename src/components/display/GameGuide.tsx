import { useEffect, useState } from 'react';
import { Clock, Gamepad2, Users, User } from 'lucide-react';
import Card from '../ui/Card';

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
  const isTeam = String(current.type || 'team').toLowerCase() !== 'individual';
  const isNext = Boolean(highlightName) && current.name === highlightName;

  return (
    <section className="mb-8" aria-label="Guia dos jogos">
    <Card variant="glow" className="relative overflow-hidden p-5 sm:p-7">
      <style>{`@keyframes guide-progress { from { width: 0%; } to { width: 100%; } }`}</style>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-primary-400/20 bg-primary-500/10 p-2 text-primary-300">
            <Gamepad2 size={22} />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-white sm:text-2xl">Guia dos jogos</h2>
            <p className="mt-0.5 text-xs text-gray-500">Conheça as brincadeiras e as regras enquanto a próxima não começa</p>
          </div>
        </div>
        {count > 1 && (
          <div className="flex items-center gap-2" aria-hidden="true">
            {games.map((game, position) => (
              <span
                key={game.id}
                className={`h-2 rounded-full transition-all duration-300 ${position === index % count ? 'w-6 bg-primary-400' : 'w-2 bg-white/20'}`}
              />
            ))}
          </div>
        )}
      </div>

      <div key={current.id} className="animate-in fade-in slide-in-from-right-4 duration-500" aria-live="polite">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h3 className="font-display text-3xl font-bold text-white sm:text-5xl">{current.name}</h3>
          {isNext && (
            <span className="rounded-full border border-warning-400/30 bg-warning-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-warning-300">
              Próximo jogo
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-gray-300">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1">
            {isTeam ? <Users size={14} /> : <User size={14} />}
            {isTeam ? 'Em equipe' : 'Individual'}
          </span>
          {current.duration ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1">
              <Clock size={14} />
              {current.duration} min
            </span>
          ) : null}
          <span className="text-xs text-gray-500">Jogo {(index % count) + 1} de {count}</span>
        </div>

        {current.description ? (
          <p className="mt-5 max-w-4xl text-lg leading-relaxed text-gray-200 sm:text-2xl">{current.description}</p>
        ) : null}

        {rules.length > 0 && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-primary-300">Regras</p>
            {rules.length === 1 ? (
              <p className="text-lg leading-relaxed text-white sm:text-xl">{rules[0]}</p>
            ) : (
              <ol className="space-y-2.5">
                {rules.map((rule, position) => (
                  <li key={`${position}-${rule}`} className="flex gap-3 text-lg leading-snug text-white sm:text-xl">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-500/20 text-sm font-bold text-primary-300">
                      {position + 1}
                    </span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>

      {count > 1 && (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-white/[0.06]" aria-hidden="true">
          <div
            key={`${current.id}-${index}`}
            className="h-full bg-primary-400/70"
            style={{ animation: `guide-progress ${slideMs}ms linear forwards` }}
          />
        </div>
      )}
    </Card>
    </section>
  );
}
