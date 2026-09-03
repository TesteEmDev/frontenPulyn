import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Users, Gamepad2, MapPin, Map,
  FileText, RefreshCw, Settings, Plus, Search, ChevronRight
} from 'lucide-react';
import { usePulynStore } from '../../store/mockData';
import Sidebar from '../../components/layout/Sidebar';
import TopBar from '../../components/layout/TopBar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Avatar from '../../components/ui/Avatar';
import Select from '../../components/ui/Select';

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

export default function AdminChildren() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { children = [], teams = [], loadChildren, loadTeams } = usePulynStore();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Carregar dados da API
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadChildren(), loadTeams()]);
      setLoading(false);
    };
    loadData();
  }, [loadChildren, loadTeams]);

  const safeChildren = Array.isArray(children) ? children : [];
  const safeTeams = Array.isArray(teams) ? teams : [];

  const filtered = safeChildren.filter(child => {
    const matchesSearch = !search ||
      child.name?.toLowerCase().includes(search.toLowerCase()) ||
      child.nickname?.toLowerCase().includes(search.toLowerCase());
    const matchesTeam = !filterTeam || (child.teamId === filterTeam || child.team_id === filterTeam);
    const matchesStatus = !filterStatus || child.status === filterStatus;
    return matchesSearch && matchesTeam && matchesStatus;
  });

  const getTeam = (teamId: string | null) => {
    if (!teamId) return null;
    return safeTeams.find(t => t.id === teamId);
  };

  if (loading) {
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
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-400">Carregando crianças...</p>
          </div>
        </div>
      </div>
    );
  }

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
        <TopBar title="Gestão do Buffet" subtitle="Crianças e Famílias" />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <PageHeader
            title="Crianças"
            description="Gerencie cadastros de crianças e famílias"
            icon={<Users size={28} />}
            action={
              <Button variant="primary" onClick={() => navigate('/reception/checkin')}>
                <Plus size={16} className="mr-1.5" />
                Novo Cadastro
              </Button>
            }
          />

          {/* Search & Filters */}
          <Card>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                placeholder="Buscar por nome ou apelido..."
                icon={<Search size={16} />}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <Select
                options={[
                  { value: '', label: 'Todos os times' },
                  ...safeTeams.map(t => ({ value: t.id, label: t.name }))
                ]}
                value={filterTeam}
                onChange={e => setFilterTeam(e.target.value)}
              />
              <Select
                options={[
                  { value: '', label: 'Todos os status' },
                  { value: 'active', label: 'Ativo' },
                  { value: 'pending', label: 'Pendente' },
                  { value: 'inactive', label: 'Inativo' },
                ]}
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
              />
            </div>
          </Card>

          {/* Children Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-3 text-sm font-body font-semibold text-gray-400"></th>
                    <th className="pb-3 text-sm font-body font-semibold text-gray-400">Nome</th>
                    <th className="pb-3 text-sm font-body font-semibold text-gray-400">Apelido</th>
                    <th className="pb-3 text-sm font-body font-semibold text-gray-400">Idade</th>
                    <th className="pb-3 text-sm font-body font-semibold text-gray-400">Time</th>
                    <th className="pb-3 text-sm font-body font-semibold text-gray-400">Pulseira</th>
                    <th className="pb-3 text-sm font-body font-semibold text-gray-400">Pontos</th>
                    <th className="pb-3 text-sm font-body font-semibold text-gray-400"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(child => {
                    const team = getTeam(child.teamId ?? child.team_id ?? null);
                    const braceletCode = child.bracelet_code || child.bracelet;
                    return (
                      <tr
                        key={child.id}
                        className="hover:bg-surface/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/admin/children/${child.id}`)}
                      >
                        <td className="py-3 pr-2">
                          <Avatar emoji={child.avatar || '👤'} size="sm" />
                        </td>
                        <td className="py-3 pr-4">
                          <p className="text-sm font-semibold text-white">{child.name}</p>
                        </td>
                        <td className="py-3 pr-4">
                          <p className="text-sm text-gray-300">{child.nickname || child.name}</p>
                        </td>
                        <td className="py-3 pr-4">
                          <p className="text-sm text-gray-300">{child.age} anos</p>
                        </td>
                        <td className="py-3 pr-4">
                          {team ? (
                            <span
                              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-body font-semibold"
                              style={{ backgroundColor: team.color + '20', color: team.color }}
                            >
                              👥 {team.name}
                            </span>
                          ) : (
                            <Badge variant="muted">Sem time</Badge>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          {braceletCode ? (
                            <Badge variant="success">{braceletCode}</Badge>
                          ) : (
                            <Badge variant="warning">Sem pulseira</Badge>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <p className="text-sm font-bold text-primary">{child.scores || 0}</p>
                        </td>
                        <td className="py-3">
                          <ChevronRight size={16} className="text-gray-500" />
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-500 text-sm">
                        Nenhuma criança encontrada
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}