import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useFamilyData } from '../../hooks/useFamilyData';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import StatusDot from '../../components/ui/StatusDot';
import BottomNav from '../../components/layout/BottomNav';
import PageHeader from '../../components/layout/PageHeader';
import {
  Home,
  MapPin,
  Trophy,
  Star,
  Bell,
  Clock,
  Gamepad2,
  ChevronRight,
} from 'lucide-react';

const navItems = [
  { icon: <Home size={20} />, label: 'Home', path: '/family' },
  { icon: <MapPin size={20} />, label: 'Localização', path: '/family/location' },
  { icon: <Star size={20} />, label: 'Pontuação', path: '/family/scores' },
  { icon: <Trophy size={20} />, label: 'Conquistas', path: '/family/achievements' },
  { icon: <Gamepad2 size={20} />, label: 'Perfil', path: '/family/profile' },
];

const statusMap: Record<string, 'online' | 'offline' | 'warning'> = {
  active: 'online',
  pending: 'warning',
  inactive: 'offline',
};

const statusLabel: Record<string, string> = {
  active: 'Ativo',
  pending: 'Pendente',
  inactive: 'Inativo',
};




export default function FamilyHome() {
  const { children, loading, error } = useFamilyData();
  const [recentScores, setRecentScores] = useState<any[]>([]);

  useEffect(() => {
    Promise.all(children.map((child) => api.getFamilyChildScores(child.id).catch(() => ({ scores: [] }))))
      .then((results) => setRecentScores(results.flatMap((result, index) => (result.scores || []).map((score: any) => ({
        ...score,
        childName: children[index]?.nickname || children[index]?.name,
        checkpoint: score.checkpoint_name || 'Checkpoint',
        timestamp: score.created_at ? new Date(score.created_at).toLocaleString('pt-BR') : '',
      }))).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 10)))
      .catch(() => setRecentScores([]));
  }, [children]);

  const activeChild = children.find((child) => child.evento_status === 'active');
  const activeEvent = activeChild ? { name: activeChild.evento_name, time: '', duration: 0 } : null;
  const familyChildren = children.filter((child) => child.status === 'active');
  const latestScores = recentScores.slice(0, 3);
  const recentNotifications = latestScores.map((log) => ({
    id: log.id,
    text: `${log.childName} marcou ${log.points} pontos em ${log.checkpoint}.`,
    time: log.timestamp,
    icon: <Star size={16} className="text-accent" />,
  }));

  return (
    <div className="min-h-screen bg-dark pb-24">
      <div className="max-w-md mx-auto px-4 pt-6">
        <PageHeader
          title="Família"
          description="Acompanhe suas crianças em tempo real"
          action={
            <button className="relative p-2 rounded-lg bg-surface border border-border hover:border-primary/50 transition-colors">
              <Bell size={20} className="text-gray-300" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-danger text-[10px] text-white flex items-center justify-center font-bold">
                {latestScores.length}
              </span>
            </button>
          }
        />

        {/* Active Event */}
        {activeEvent && (
          <Card variant="glow" className="mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Gamepad2 size={20} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm text-gray-400 font-body">Evento ativo</p>
                  <h3 className="text-white font-display font-semibold">{activeEvent.name}</h3>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1.5 mb-1">
                  <StatusDot status="online" size="sm" />
                  <Badge variant="success">Em andamento</Badge>
                </div>
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock size={12} />
                  {activeChild?.evento_date ? new Date(activeChild.evento_date).toLocaleDateString('pt-BR') : 'Data não informada'}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Children Cards */}
        <h2 className="text-white font-display font-semibold text-lg mb-3">
          Crianças
        </h2>
        <div className="space-y-3 mb-6">
          {loading ? <Card><p className="text-gray-400">Carregando crianças vinculadas...</p></Card> : error ? <Card><p className="text-danger-500">{error}</p></Card> : familyChildren.length === 0 ? <Card><p className="text-gray-400">Nenhuma criança aprovada ainda.</p></Card> : familyChildren.slice(0, 5).map((child) => {
            const team = child.time_id ? { id: child.time_id, name: child.time_name, color: child.time_color || '#1E9BD7', icon: '👥' } : null;
            return (
              <Card key={child.id} className="flex items-center gap-3">
                <Avatar emoji={child.avatar || '👤'} bgColor={team ? `${team.color}30` : 'bg-primary/30'} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-body font-semibold truncate">
                      {child.name}
                    </p>
                    <StatusDot status={statusMap[child.status]} size="sm" />
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant={team ? 'primary' : 'muted'}>
                      {team ? team.icon : ''} {team?.name || 'Sem time'}
                    </Badge>
                    <span className="text-xs text-gray-400">{statusLabel[child.status]}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-white font-mono font-bold text-lg">{Number(child.scores || 0)}</p>
                  <p className="text-xs text-gray-400">pts</p>
                </div>
                <ChevronRight size={16} className="text-gray-500 shrink-0" />
              </Card>
            );
          })}
        </div>

        {/* Últimas Conquistas */}
        <Card variant="secondary" className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={18} className="text-secondary" />
            <h3 className="text-white font-display font-semibold">
              Últimas conquistas
            </h3>
          </div>
          <div className="space-y-2">
            {latestScores.map((log) => (
              <div key={log.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-accent font-bold text-sm">+{log.points}</span>
                  <span className="text-gray-300 text-sm">{log.childName}</span>
                </div>
                <div className="text-right">
                  <span className="text-gray-400 text-xs">{log.checkpoint}</span>
                  <span className="text-gray-500 text-xs ml-2">{log.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Notifications */}
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-primary" />
              <h3 className="text-white font-display font-semibold">
                Notificações recentes
              </h3>
            </div>
            <button className="text-xs text-primary hover:text-primary/80 font-body">
              Ver todas
            </button>
          </div>
          <div className="space-y-3">
            {recentNotifications.map((n) => (
              <div key={n.id} className="flex items-start gap-3">
                <div className="mt-0.5 p-1.5 rounded-lg bg-surface">{n.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-300 font-body">{n.text}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{n.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <BottomNav items={navItems} activePath="/family" />
    </div>
  );
}
