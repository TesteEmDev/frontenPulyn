import { BookOpen } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import PagedItems from './PagedItems';
import { GameTitleRow, buildGameItems, type GuideGame } from './GameGuide';

// Regras do jogo que está rodando agora, ao lado do ranking. Ocupa o mesmo espaço do ranking; se as
// regras não couberem de uma vez, passam em páginas, sem nada cortado.
export default function GameRulesCard({ game }: { game: GuideGame }) {
  return (
    <Card variant="secondary" className="flex h-full min-h-0 flex-col overflow-hidden p-3 sm:p-4">
      <div className="mb-2 flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] pb-2">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-secondary-400/20 bg-secondary-500/10 p-2 text-secondary-300"><BookOpen size={20} /></div>
          <div>
            <h2 className="font-display text-[clamp(1rem,2.4vh,1.5rem)] font-bold text-white">Como jogar</h2>
            <p className="text-[clamp(0.6rem,1.3vh,0.8rem)] text-gray-500">Regras do jogo em andamento</p>
          </div>
        </div>
        <Badge variant="success">Em andamento</Badge>
      </div>
      <section aria-label="Regras do jogo em andamento" className="flex min-h-0 flex-1 flex-col">
        <div className="mb-2 shrink-0">
          <GameTitleRow game={game} />
        </div>
        <div className="min-h-0 flex-1">
          <PagedItems items={buildGameItems(game)} resetKey={game.id} />
        </div>
      </section>
    </Card>
  );
}
