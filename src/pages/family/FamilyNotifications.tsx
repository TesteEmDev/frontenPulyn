import { useState } from 'react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import BottomNav from '../../components/layout/BottomNav';
import PageHeader from '../../components/layout/PageHeader';
import {
  Home,
  MapPin,
  Trophy,
  Star,
  Gamepad2,
  Bell,
  CheckCheck,
  Star as StarIcon,
  Gamepad2 as GamepadIcon,
  MapPin as MapPinIcon,
  AlertTriangle,
  Shield,
  Gift,
  Users,
} from 'lucide-react';

const navItems = [
  { icon: <Home size={20} />, label: 'Home', path: '/family' },
  { icon: <MapPin size={20} />, label: 'Localização', path: '/family/location' },
  { icon: <Star size={20} />, label: 'Pontuação', path: '/family/scores' },
  { icon: <Trophy size={20} />, label: 'Conquistas', path: '/family/achievements' },
  { icon: <Gamepad2 size={20} />, label: 'Perfil', path: '/family/profile' },
];

type NotificationType = 'score' | 'game' | 'location' | 'alert' | 'achievement' | 'reward' | 'team';

interface Notification {
  id: string;
  type: NotificationType;
  text: string;
  timestamp: string;
  read: boolean;
}

const notifications: Notification[] = [
  { id: '1', type: 'score', text: 'Pedro marcou 20 pontos no Escorregador Gigante!', timestamp: '14:32', read: false },
  { id: '2', type: 'game', text: 'O jogo Caça ao Tesouro está ativo! Participe agora.', timestamp: '14:30', read: false },
  { id: '3', type: 'location', text: 'Sofia chegou ao checkpoint Teia de Aranha.', timestamp: '14:28', read: false },
  { id: '4', type: 'team', text: 'Time Dragões lidera com 1240 pontos!', timestamp: '14:25', read: true },
  { id: '5', type: 'achievement', text: 'Ana Júlia desbloqueou a conquista "Melhor do Time"!', timestamp: '14:20', read: true },
  { id: '6', type: 'score', text: 'Lucas ganhou 50 pontos no checkpoint Teia de Aranha.', timestamp: '14:18', read: true },
  { id: '7', type: 'alert', text: 'Checkpoint Piscina de Bolinhas está offline.', timestamp: '14:15', read: true },
  { id: '8', type: 'reward', text: 'Quiz Disponível! Responda e ganhe até 50 pontos extras.', timestamp: '14:10', read: false },
  { id: '9', type: 'location', text: 'Mateus entrou na Área Verde.', timestamp: '14:05', read: true },
  { id: '10', type: 'team', text: 'Gabriel entrou para o time Trovões.', timestamp: '14:00', read: true },
];

const typeConfig: Record<
  NotificationType,
  { icon: React.ReactNode; color: string; bgColor: string }
> = {
  score: {
    icon: <StarIcon size={16} />,
    color: 'text-accent',
    bgColor: 'bg-accent/20',
  },
  game: {
    icon: <GamepadIcon size={16} />,
    color: 'text-primary',
    bgColor: 'bg-primary/20',
  },
  location: {
    icon: <MapPinIcon size={16} />,
    color: 'text-secondary',
    bgColor: 'bg-secondary/20',
  },
  alert: {
    icon: <AlertTriangle size={16} />,
    color: 'text-danger',
    bgColor: 'bg-danger/20',
  },
  achievement: {
    icon: <Trophy size={16} />,
    color: 'text-accent',
    bgColor: 'bg-accent/20',
  },
  reward: {
    icon: <Gift size={16} />,
    color: 'text-primary',
    bgColor: 'bg-primary/20',
  },
  team: {
    icon: <Users size={16} />,
    color: 'text-secondary',
    bgColor: 'bg-secondary/20',
  },
};

type FilterMode = 'all' | 'unread';

export default function FamilyNotifications() {
  const [filter, setFilter] = useState<FilterMode>('all');
  const [readState, setReadState] = useState<Record<string, boolean>>(
    Object.fromEntries(notifications.map((n) => [n.id, n.read]))
  );

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !readState[n.id];
    return true;
  });

  const unreadCount = Object.values(readState).filter((r) => !r).length;

  const markAllAsRead = () => {
    setReadState(
      Object.fromEntries(notifications.map((n) => [n.id, true]))
    );
  };

  const toggleRead = (id: string) => {
    setReadState((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="min-h-screen bg-dark pb-24">
      <div className="max-w-md mx-auto px-4 pt-6">
        <PageHeader
          title="Notificações"
          description={`${unreadCount} não lida${unreadCount !== 1 ? 's' : ''}`}
          icon={<Bell size={24} />}
          action={
            unreadCount > 0 ? (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-body font-semibold"
              >
                <CheckCheck size={14} />
                Marcar como lidas
              </button>
            ) : undefined
          }
        />

        {/* Filter Tabs */}
        <div className="flex rounded-lg bg-surface border border-border overflow-hidden mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-2.5 text-sm font-body font-semibold transition-colors ${
              filter === 'all'
                ? 'bg-primary text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`flex-1 py-2.5 text-sm font-body font-semibold transition-colors ${
              filter === 'unread'
                ? 'bg-primary text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Não lidas
            {unreadCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-danger text-[10px] text-white font-bold">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 rounded-full bg-surface mb-4">
              <Bell size={32} className="text-gray-500" />
            </div>
            <p className="text-gray-400 font-body">
              {filter === 'unread'
                ? 'Nenhuma notificação não lida'
                : 'Nenhuma notificação'}
            </p>
          </div>
        ) : (
          <div className="space-y-2 mb-6">
            {filteredNotifications.map((notification) => {
              const config = typeConfig[notification.type];
              const isUnread = !readState[notification.id];

              return (
                <Card
                  key={notification.id}
                  className={`flex items-start gap-3 transition-all ${
                    isUnread ? 'border-primary/30 bg-primary/5' : ''
                  }`}
                  onClick={() => toggleRead(notification.id)}
                >
                  {/* Unread dot indicator */}
                  <div className="flex flex-col items-center gap-2 pt-1">
                    {isUnread && (
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    )}
                  </div>

                  {/* Icon */}
                  <div
                    className={`p-2 rounded-lg shrink-0 ${config.bgColor} ${config.color}`}
                  >
                    {config.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-body leading-snug ${
                        isUnread
                          ? 'text-white font-semibold'
                          : 'text-gray-300'
                      }`}
                    >
                      {notification.text}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {notification.timestamp}
                    </p>
                  </div>

                  {/* Badge */}
                  {isUnread && (
                    <Badge variant="primary" className="shrink-0 mt-1">
                      Nova
                    </Badge>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav items={navItems} activePath="/family" />
    </div>
  );
}
