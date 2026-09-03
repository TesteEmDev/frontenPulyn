import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Users, Gamepad2, MapPin, Map,
  FileText, RefreshCw, Settings, Plus, ToggleLeft, ToggleRight, Trash2
} from 'lucide-react';
import { usePulynStore } from '../../store/mockData';
import { api } from '../../services/api';
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
  const [deletingGameId, setDeletingGameId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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
    setLocalGames(Array.isArray(brincadeiras) ? brincadeiras : []);
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

  const handleDeleteGame = async (game: any) => {
    const confirmed = window.confirm(
      `Arquivar o jogo "${game.name}"? Ele sairá da lista, mas o histórico de leituras e pontuações será preservado.`
    );
    if (!confirmed) return;

    setDeletingGameId(game.id);
    setFeedback(null);
    try {
      await api.deleteBrincadeira(game.id);
      await loadBrincadeiras();
      setFeedback({ type: 'success', message: `Jogo "${game.name}" arquivado com sucesso.` });
    } catch (error) {
      const status = typeof error === 'object' && error !== null && 'status' in error
        ? Number((error as { status?: number }).status)
        : 0;
      const message = error instanceof Error ? error.message : 'Não foi possível arquivar o jogo.';
      setFeedback({
        type: 'error',
        message: status === 409
          ? message
          : message || 'Não foi possível arquivar o jogo.',
      });
    } finally {
      setDeletingGameId(null);
    }
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

          {feedback && (
            <div
              role="status"
              className={`rounded-lg border px-4 py-3 text-sm ${
                feedback.type === 'success'
                  ? 'border-success/40 bg-success/10 text-success'
                  : 'border-danger/40 bg-danger/10 text-danger'
              }`}
            >
              {feedback.message}
            </div>
          )}

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
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
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
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            void handleDeleteGame(game);
                          }}
                          disabled={deletingGameId === game.id}
                          className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-danger/10 hover:text-danger disabled:cursor-wait disabled:opacity-50"
                          title="Arquivar jogo"
                          aria-label={`Arquivar jogo ${game.name}`}
                        >
                          <Trash2 size={19} />
                        </button>
                      </div>
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
