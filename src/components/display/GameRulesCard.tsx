import { BookOpen } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { GameGuideContent, type GuideGame } from './GameGuide';

// Regras do jogo que está rodando agora, ao lado do ranking
export default function GameRulesCard({ game }: { game: GuideGame }) {
  return (
    <Card variant="secondary" className="overflow-hidden p-4 sm:p-5" >
      <div className="mb-5 flex items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-secondary-400/20 bg-secondary-500/10 p-2 text-secondary-300"><BookOpen size={20} /></div>
          <div>
            <h2 className="font-display text-xl font-bold text-white">Como jogar</h2>
            <p className="mt-0.5 text-xs text-gray-500">Regras do jogo em andamento</p>
          </div>
        </div>
        <Badge variant="success">Em andamento</Badge>
      </div>
      <section aria-label="Regras do jogo em andamento">
        <GameGuideContent game={game} compact />
      </section>
    </Card>
  );
}
