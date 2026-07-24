import { usePulynStore } from '../../store/mockData';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import BottomNav from '../../components/layout/BottomNav';
import PageHeader from '../../components/layout/PageHeader';
import {
  Home,
  MapPin,
  Trophy,
  Star,
  Gamepad2,
  Lock,
  Award,
  Calendar,
  Zap,
  Target,
  Crown,
  Flame,
  Shield,
} from 'lucide-react';

const navItems = [
  { icon: <Home size={20} />, label: 'Home', path: '/family' },
  { icon: <MapPin size={20} />, label: 'Localização', path: '/family/location' },
  { icon: <Star size={20} />, label: 'Pontuação', path: '/family/scores' },
  { icon: <Trophy size={20} />, label: 'Conquistas', path: '/family/achievements' },
  { icon: <Gamepad2 size={20} />, label: 'Perfil', path: '/family/profile' },
];

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
  unlockedAt?: string;
  childName?: string;
  color: string;
}

const achievements: Achievement[] = [
  {
    id: 'a1',
    name: 'Primeiro Ponto',
    description: 'Marque seu primeiro ponto em um checkpoint',
    icon: <Zap size={24} />,
    unlocked: true,
    unlockedAt: '14:30',
    childName: 'Pedro',
    color: '#F59E0B',
  },
  {
    id: 'a2',
    name: '10 Checkpoints',
    description: 'Visite 10 checkpoints em um único evento',
    icon: <Target size={24} />,
    unlocked: true,
    unlockedAt: '14:35',
    childName: 'Sofia',
    color: '#22C55E',
  },
  {
    id: 'a3',
    name: 'Melhor do Time',
    description: 'Seja o jogador com mais pontos do seu time',
    icon: <Crown size={24} />,
    unlocked: true,
    unlockedAt: '14:38',
    childName: 'Ana Júlia',
    color: '#1E9BD7',
  },
  {
    id: 'a4',
    name: 'Velocista',
    description: 'Visite 5 checkpoints em 5 minutos',
    icon: <Flame size={24} />,
    unlocked: true,
    unlockedAt: '14:40',
    childName: 'Lucas',
    color: '#E53935',
  },
  {
    id: 'a5',
    name: 'Explorador',
    description: 'Visite todas as zonas do evento',
    icon: <MapPin size={24} />,
    unlocked: false,
    color: '#4CAF50',
  },
  {
    id: 'a6',
    name: 'Centurião',
    description: 'Acumule 1000 pontos no total',
    icon: <Shield size={24} />,
    unlocked: false,
    color: '#EC4899',
  },
  {
    id: 'a7',
    name: 'Maratista',
    description: 'Participe de 5 eventos',
    icon: <Calendar size={24} />,
    unlocked: false,
    color: '#06B6D4',
  },
  {
    id: 'a8',
    name: 'Lenda Viva',
    description: 'Seja o primeiro colocado em 3 eventos',
    icon: <Award size={24} />,
    unlocked: false,
    color: '#F59E0B',
  },
];

const gameHistory = [
  { name: 'Festa do João', date: '18/05/2026', position: 2, points: 340, game: 'Caça ao Tesouro' },
  { name: 'Aniversário da Maria', date: '15/05/2026', position: 1, points: 510, game: 'Corrida Relâmpago' },
  { name: 'Colônia de Férias', date: '10/05/2026', position: 3, points: 280, game: 'Missão Cooperativa' },
];

export default function FamilyAchievements() {
  const { children } = usePulynStore();

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="min-h-screen bg-dark pb-24">
      <div className="max-w-md mx-auto px-4 pt-6">
        <PageHeader
          title="Conquistas"
          description={`${unlockedCount} de ${achievements.length} desbloqueadas`}
          icon={<Trophy size={24} />}
        />

        {/* Progress summary */}
        <Card variant="glow" className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400 font-body">Progresso geral</span>
            <span className="text-sm font-mono font-bold text-white">
              {unlockedCount}/{achievements.length}
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-surface overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
              style={{ width: `${(unlockedCount / achievements.length) * 100}%` }}
            />
          </div>
        </Card>

        {/* Achievement Grid */}
        <h3 className="text-white font-display font-semibold text-lg mb-3">
          Medalhas
        </h3>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {achievements.map((achievement) => (
            <Card
              key={achievement.id}
              className={`relative flex flex-col items-center text-center py-4 ${
                achievement.unlocked ? '' : 'opacity-50'
              }`}
            >
              {/* Lock overlay for locked */}
              {!achievement.unlocked && (
                <div className="absolute top-2 right-2">
                  <Lock size={14} className="text-gray-500" />
                </div>
              )}

              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mb-2"
                style={{
                  backgroundColor: achievement.unlocked
                    ? `${achievement.color}25`
                    : '#1a1a2e',
                  border: achievement.unlocked
                    ? `2px solid ${achievement.color}50`
                    : '2px solid #2d2d4a',
                }}
              >
                <span
                  style={{
                    color: achievement.unlocked ? achievement.color : '#4b5563',
                  }}
                >
                  {achievement.icon}
                </span>
              </div>

              <h4
                className={`text-sm font-display font-semibold mb-1 ${
                  achievement.unlocked ? 'text-white' : 'text-gray-500'
                }`}
              >
                {achievement.name}
              </h4>

              <p className="text-xs text-gray-400 leading-tight mb-2">
                {achievement.description}
              </p>

              {achievement.unlocked && (
                <div className="flex flex-col items-center gap-1">
                  <Badge variant="success">Desbloqueada</Badge>
                  <span className="text-[10px] text-gray-500">
                    {achievement.childName} - {achievement.unlockedAt}
                  </span>
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Game Participation History */}
        <Card className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={18} className="text-secondary" />
            <h3 className="text-white font-display font-semibold">
              Histórico de jogos
            </h3>
          </div>
          <div className="space-y-3">
            {gameHistory.map((game, i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-2 border-b border-border last:border-0"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    game.position === 1
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : game.position === 2
                      ? 'bg-gray-400/20 text-gray-300'
                      : 'bg-amber-600/20 text-amber-600'
                  }`}
                >
                  {game.position}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-body font-semibold truncate">
                    {game.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {game.game} - {game.date}
                  </p>
                </div>
                <span className="text-sm font-mono font-bold text-accent shrink-0">
                  {game.points} pts
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <BottomNav items={navItems} activePath="/family/achievements" />
    </div>
  );
}
