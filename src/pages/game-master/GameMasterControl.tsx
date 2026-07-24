import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Calendar, Users, Gamepad2, MapPin, Map,
  Star, FileText, RefreshCw, Settings, Trophy, Clock, CheckCircle, XCircle, Play, Square
} from 'lucide-react';
import { usePulynStore } from '../../store/mockData';
import { api, API_URL } from '../../services/api';
import Sidebar from '../../components/layout/Sidebar';
import TopBar from '../../components/layout/TopBar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import StatusDot from '../../components/ui/StatusDot';

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

export default function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { 
    children = [], 
    teams = [], 
    checkpoints = [], 
    events = [],
    loadTeams,
    loadChildren,
    loadCheckpoints,
    loadEvents
  } = usePulynStore();
  
  const [loading, setLoading] = useState(true);
  const [gameStatus, setGameStatus] = useState<any>(null);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);

  // Carregar dados da API
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        loadTeams(),
        loadChildren(),
        loadCheckpoints(),
        loadEvents && loadEvents(),
      ]);
      
      // Buscar status do jogo
      try {
        const response = await fetch(`${API_URL}/debug/game-status`);
        const data = await response.json();
        setGameStatus(data.status);
      } catch (err) {
        console.error('Erro ao buscar status do jogo:', err);
      }
      
      setLoading(false);
    };
    loadData();
  }, [loadTeams, loadChildren, loadCheckpoints, loadEvents]);

  const handleStartGame = async () => {
    if (!selectedGame) {
      alert('Selecione um jogo primeiro');
      return;
    }
    
    // Buscar evento ativo (ou primeiro evento disponível)
    let eventoId = activeEvent?.id;
    if (!eventoId && safeEvents.length > 0) {
      eventoId = safeEvents[0].id;
    }
    
    if (!eventoId) {
      alert('Nenhum evento disponível. Crie um evento primeiro.');
      return;
    }
    
    try {
      const data = await api.startGame(selectedGame, 'Jogo em Andamento', eventoId);
      setGameStatus(data.status);
      alert('✅ Jogo iniciado! Arduino foi notificado via WebSocket');
    } catch (err) {
      alert('❌ Erro ao iniciar jogo: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleStopGame = async () => {
    // Buscar evento ativo (ou primeiro evento disponível)
    let eventoId = activeEvent?.id;
    if (!eventoId && safeEvents.length > 0) {
      eventoId = safeEvents[0].id;
    }
    
    if (!eventoId) {
      alert('Nenhum evento disponível.');
      return;
    }
    
    try {
      const data = await api.stopGame(eventoId);
      setGameStatus(data.status);
      setSelectedGame(null);
      alert('✅ Jogo parado!');
    } catch (err) {
      alert('❌ Erro ao parar jogo: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Garantir que são arrays
  const safeCheckpoints = Array.isArray(checkpoints) ? checkpoints : [];
  const safeChildren = Array.isArray(children) ? children : [];
  const safeTeams = Array.isArray(teams) ? teams : [];
  const safeEvents = Array.isArray(events) ? events : [];

  // Estatísticas
  const totalChildren = safeChildren.length;
  const totalTeams = safeTeams.length;
  const totalCheckpoints = safeCheckpoints.length;
  const onlineCheckpoints = safeCheckpoints.filter(cp => cp.status === 'online').length;
  const activeChildren = safeChildren.filter(c => c.status === 'active').length;
  const withBracelet = safeChildren.filter(c => c.bracelet_code || c.bracelet).length;
  
  // Pontuação total
  const totalScores = safeChildren.reduce((sum, c) => sum + (c.scores || 0), 0);
  
  // Evento ativo
  const activeEvent = safeEvents.find(e => e.status === 'active' || e.status === 'ongoing');

  // Últimas crianças cadastradas
  const recentChildren = [...safeChildren].slice(-5).reverse();

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
            <p className="text-gray-400">Carregando dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  const kpis = [
    { 
      label: 'Crianças', 
      value: totalChildren, 
      subValue: `${activeChildren} ativas`,
      icon: <Users size={24} />, 
      color: 'text-primary',
      bg: 'bg-primary/10'
    },
    { 
      label: 'Times', 
      value: totalTeams, 
      subValue: 'equipes',
      icon: <Trophy size={24} />, 
      color: 'text-secondary',
      bg: 'bg-secondary/10'
    },
    { 
      label: 'Checkpoints', 
      value: `${onlineCheckpoints}/${totalCheckpoints}`, 
      subValue: 'online',
      icon: <MapPin size={24} />, 
      color: 'text-accent',
      bg: 'bg-accent/10'
    },
    { 
      label: 'Pontuação Total', 
      value: totalScores, 
      subValue: 'pontos acumulados',
      icon: <Star size={24} />, 
      color: 'text-warning',
      bg: 'bg-warning/10'
    },
    { 
      label: 'Pulseiras', 
      value: withBracelet, 
      subValue: `${totalChildren - withBracelet} sem pulseira`,
      icon: <CheckCircle size={24} />, 
      color: 'text-success',
      bg: 'bg-success/10'
    },
  ];

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
        <TopBar title="Painel Administrativo" subtitle="Visão geral do sistema" />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <PageHeader
            title="Dashboard"
            description="Visão geral do sistema Pulyn"
            icon={<LayoutDashboard size={28} />}
            action={
              <Button variant="primary" onClick={() => navigate('/admin/events/new')}>
                <Calendar size={16} className="mr-1.5" />
                Novo Evento
              </Button>
            }
          />

          {/* Active Event Card */}
          {activeEvent && (
            <Card variant="glow" className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <StatusDot status="online" size="lg" />
                <span className="text-sm font-body text-gray-400">Evento ativo</span>
              </div>
              <div className="flex-1">
                <h3 className="font-display text-lg text-white">{activeEvent.name}</h3>
                <p className="text-sm text-gray-400 font-body">
                  {activeEvent.date} &middot; {activeEvent.location || 'Local não definido'}
                </p>
              </div>
              <Badge variant="success">Ativo</Badge>
            </Card>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {kpis.map(kpi => (
              <Card key={kpi.label} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-lg ${kpi.bg}`}>
                    <div className={kpi.color}>{kpi.icon}</div>
                  </div>
                </div>
                <p className="text-2xl font-bold text-white">{kpi.value}</p>
                <p className="text-sm text-gray-400">{kpi.label}</p>
                <p className="text-xs text-gray-500 mt-1">{kpi.subValue}</p>
              </Card>
            ))}
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Children */}
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Users size={20} className="text-primary" />
                <h3 className="font-display text-lg text-white">Últimos Cadastros</h3>
              </div>
              <div className="space-y-3">
                {recentChildren.length > 0 ? (
                  recentChildren.map(child => {
                    const team = safeTeams.find(t => t.id === (child.teamId || child.team_id));
                    return (
                      <div
                        key={child.id}
                        className="flex items-center gap-3 p-2 rounded-lg bg-surface/50 hover:bg-surface/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/admin/children/${child.id}`)}
                      >
                        <Avatar emoji={child.avatar || '👤'} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">
                            {child.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {child.nickname || child.name} • {child.age || '?'} anos
                          </p>
                        </div>
                        {team && (
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: team.color }}
                            title={team.name}
                          />
                        )}
                        <Badge variant={child.bracelet_code || child.bracelet ? 'success' : 'warning'} className="text-xs">
                          {child.bracelet_code || child.bracelet || 'Sem pulseira'}
                        </Badge>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-500 text-sm text-center py-4">
                    Nenhuma criança cadastrada
                  </p>
                )}
              </div>
            </Card>

            {/* Checkpoint Status */}
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <MapPin size={20} className="text-secondary" />
                <h3 className="font-display text-lg text-white">Status dos Checkpoints</h3>
              </div>
              <div className="space-y-3">
                {safeCheckpoints.length > 0 ? (
                  safeCheckpoints.map(cp => (
                    <div
                      key={cp.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-surface/50"
                    >
                      <div className="flex items-center gap-3">
                        <StatusDot status={cp.status === 'online' ? 'online' : 'offline'} size="md" />
                        <div>
                          <p className="text-sm font-semibold text-white">{cp.name}</p>
                          <p className="text-xs text-gray-500">{cp.zone || 'Sem zona'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="primary" className="text-xs">
                          {cp.points || 10} pts
                        </Badge>
                        <Badge variant={cp.status === 'online' ? 'success' : 'danger'} className="text-xs">
                          {cp.status === 'online' ? 'Online' : cp.status === 'configured' ? 'Configurado' : 'Offline'}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm text-center py-4">
                    Nenhum checkpoint cadastrado
                  </p>
                )}
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Clock size={20} className="text-accent" />
              <h3 className="font-display text-lg text-white">Ações Rápidas</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="primary" onClick={() => navigate('/admin/children')} className="flex flex-col items-center py-4">
                <Users size={24} className="mb-2" />
                <span>Gerenciar Crianças</span>
              </Button>
              <Button variant="secondary" onClick={() => navigate('/admin/checkpoints')} className="flex flex-col items-center py-4">
                <MapPin size={24} className="mb-2" />
                <span>Configurar Checkpoints</span>
              </Button>
              <Button variant="accent" onClick={() => navigate('/admin/events')} className="flex flex-col items-center py-4">
                <Calendar size={24} className="mb-2" />
                <span>Gerenciar Eventos</span>
              </Button>
              <Button variant="ghost" onClick={() => navigate('/admin/reports')} className="flex flex-col items-center py-4 border border-border">
                <FileText size={24} className="mb-2" />
                <span>Gerar Relatórios</span>
              </Button>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}