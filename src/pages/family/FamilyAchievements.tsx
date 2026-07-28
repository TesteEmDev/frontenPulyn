import { usePulynStore } from '../../store/mockData';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import BottomNav from '../../components/layout/BottomNav';
import PageHeader from '../../components/layout/PageHeader';
import { Home, MapPin, Trophy, Star, Gamepad2, Lock, Award } from 'lucide-react';

const navItems = [
  { icon: <Home size={20} />, label: 'Home', path: '/family' },
  { icon: <MapPin size={20} />, label: 'Localização', path: '/family/location' },
  { icon: <Star size={20} />, label: 'Pontuação', path: '/family/scores' },
  { icon: <Trophy size={20} />, label: 'Conquistas', path: '/family/achievements' },
  { icon: <Gamepad2 size={20} />, label: 'Perfil', path: '/family/profile' },
];

export default function FamilyAchievements() {
  const { children } = usePulynStore();
  const achievements = children.flatMap((child) =>
    (child.achievements || []).map((name, index) => ({
      id: `${child.id}-${index}`,
      name,
      childName: child.nickname || child.name,
    }))
  );
  const unlockedCount = achievements.length;

  return (
    <div className="min-h-screen bg-dark pb-24">
      <div className="max-w-md mx-auto px-4 pt-6">
        <PageHeader
          title="Conquistas"
          description={`${unlockedCount} conquista${unlockedCount !== 1 ? 's' : ''} registrada${unlockedCount !== 1 ? 's' : ''}`}
          icon={<Trophy size={24} />}
        />
        <Card variant="glow" className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400 font-body">Progresso geral</span>
            <span className="text-sm font-mono font-bold text-white">{unlockedCount}</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-surface overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary" style={{ width: unlockedCount ? '100%' : '0%' }} />
          </div>
        </Card>
        <h3 className="text-white font-display font-semibold text-lg mb-3">Medalhas</h3>
        {achievements.length === 0 ? (
          <Card className="mb-6 text-center">
            <Lock size={28} className="text-gray-500 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Nenhuma conquista registrada ainda.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 mb-6">
            {achievements.map((achievement) => (
              <Card key={achievement.id} className="relative flex flex-col items-center text-center py-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-2 bg-primary/10 border-2 border-primary/30">
                  <Award size={24} className="text-primary" />
                </div>
                <h4 className="text-sm font-display font-semibold mb-1 text-white">{achievement.name}</h4>
                <p className="text-xs text-gray-400 leading-tight mb-2">Conquista registrada para este participante.</p>
                <div className="flex flex-col items-center gap-1">
                  <Badge variant="success">Desbloqueada</Badge>
                  <span className="text-[10px] text-gray-500">{achievement.childName}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
        <Card className="mb-6">
          <p className="text-sm text-gray-500">O histórico de jogos será exibido quando houver eventos concluídos registrados.</p>
        </Card>
      </div>
      <BottomNav items={navItems} activePath="/family/achievements" />
    </div>
  );
}
