import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Users, Gamepad2, MapPin, Map,
  Star, FileText, RefreshCw, Settings, Plus, ToggleLeft, ToggleRight
} from 'lucide-react';
import { usePulynStore, Game } from '../../store/mockData';
import Sidebar from '../../components/layout/Sidebar';
import TopBar from '../../components/layout/TopBar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

const navItems = [
  { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/admin' },
  { icon: <Calendar size={20} />, label: 'Eventos', path: '/admin/events' },
  { icon: <Users size={20} />, label: 'Crianças', path: '/admin/children' },
  { icon: <Gamepad2 size={20} />, label: 'Jogos', path: '/admin/games' },
  { icon: <MapPin size={20} />, label: 'Checkpoints', path: '/admin/checkpoints' },
  { icon: <Map size={20} />, label: 'Mapa', path: '/admin/map' },
  { icon: <Users size={20} />, label: 'Usuários', path: '/admin/users' },
  { icon: <Users size={20} />, label: 'Times', path: '/admin/teams' },
  { icon: <FileText size={20} />, label: 'Relatórios', path: '/admin/reports' },
  { icon: <RefreshCw size={20} />, label: 'Sincronização', path: '/admin/sync' },
  { icon: <Settings size={20} />, label: 'Configurações', path: '/admin/settings' },
];

const typeBadge: Record<string, { variant: 'primary' | 'secondary' | 'accent'; label: string }> = {
  team: { variant: 'primary', label: 'Equipe' },
  individual: { variant: 'secondary', label: 'Individual' },
  cooperative: { variant: 'accent', label: 'Cooperativo' },
};

export default function AdminGames() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { brincadeiras, loadBrincadeiras } = usePulynStore();

  const [localGames, setLocalGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Carregar brincadeiras quando o componente monta
  useEffect(() => {
    const loadGames = async () => {
      setLoading(true);
      await loadBrincadeiras();
      setLoading(false);
    };
    loadGames();
  }, [loadBrincadeiras]);

  // Atualizar localGames quando brincadeiras mudar
  useEffect(() => {
    if (brincadeiras && brincadeiras.length > 0) {
      setLocalGames(brincadeiras);
    }
  }, [brincadeiras]);

  const toggleGameStatus = (gameId: string) => {
    setLocalGames(prev =>
      prev.map(g =>
        g.id === gameId
          ? { ...g, status: g.status === 'active' ? 'inactive' as const : 'active' as const }
          : g
      )
    );
  };

  return (
    <div className="flex h-screen bg-dark text-white overflow-hidden">
      <Sidebar
        items={navItems}
        activePath={location.pathname}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
        title="Pulyn Admin"
        accentColor="#1E9BD7"
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Gestão do Buffet" subtitle="Jogos" />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <PageHeader
            title="Jogos"
            description="Gerencie os jogos disponíveis no sistema"
            icon={<Gamepad2 size={28} />}
            action={
              <Button variant="primary" onClick={() => navigate('/admin/games/new')}>
                <Plus size={16} className="mr-1.5" />
                Criar Jogo
              </Button>
            }
          />

          {/* Game Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {loading ? (
              <div className="col-span-full text-center py-12 text-gray-400">
                Carregando jogos...
              </div>
            ) : localGames && localGames.length > 0 ? (
              localGames.map(game => {
                const typeInfo = typeBadge[game.type] || { variant: 'muted' as const, label: game.type };
                const isActive = game.status === 'active';

                return (
                  <Card
                    key={game.id}
                    variant={isActive ? 'glow' : 'default'}
                    className="cursor-pointer"
                    onClick={() => navigate(`/admin/games/${game.id}`)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-display text-lg text-white">{game.name}</h3>
                        <Badge variant={typeInfo.variant} className="mt-1">
                          {typeInfo.label}
                        </Badge>
                      </div>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          toggleGameStatus(game.id);
                        }}
                        className="text-gray-400 hover:text-white transition-colors"
                        title={isActive ? 'Desativar' : 'Ativar'}
                      >
                        {isActive ? (
                          <ToggleRight size={28} className="text-success" />
                        ) : (
                          <ToggleLeft size={28} className="text-gray-500" />
                        )}
                      </button>
                    </div>

                    <p className="text-sm text-gray-400 mb-4 line-clamp-2">{game.description}</p>

                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-xs text-gray-500">Duração</p>
                          <p className="text-sm text-white font-semibold">{game.duration}min</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Checkpoints</p>
                          <p className="text-sm text-white font-semibold">{game.checkpoints?.length || 0}</p>
                        </div>
                      </div>
                      <Badge variant={isActive ? 'success' : 'muted'}>
                        {isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </Card>
                );
              })
            ) : (
              <div className="col-span-full text-center py-12 text-gray-400">
                Nenhum jogo cadastrado ainda. Crie seu primeiro jogo!
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
