import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Users, Gamepad2, MapPin, Map,
  FileText, RefreshCw, Settings, TrendingUp, Trophy, Star, Shield
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { usePulynStore } from '../../store/mockData';
import Sidebar from '../../components/layout/Sidebar';
import TopBar from '../../components/layout/TopBar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { 
    events = [], 
    children = [], 
    checkpoints = [], 
    games = [], 
    scoreLog = [],
    loadTeams,
    loadChildren,
    loadCheckpoints,
    loadEvents,
    loadGames
  } = usePulynStore();
  
  const [loading, setLoading] = useState(true);
  const [territories, setTerritories] = useState<Record<string, any>>({});

  // Garantir que são arrays (segurança)
  const safeEvents = Array.isArray(events) ? events : [];
  const safeChildren = Array.isArray(children) ? children : [];
  const safeCheckpoints = Array.isArray(checkpoints) ? checkpoints : [];
  const safeGames = Array.isArray(games) ? games : [];
  const safeScoreLog = Array.isArray(scoreLog) ? scoreLog : [];

  // Carregar dados da API
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        if (loadTeams) await loadTeams();
        if (loadChildren) await loadChildren();
        if (loadCheckpoints) await loadCheckpoints();
        if (loadEvents) await loadEvents();
        if (loadGames) await loadGames();
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      }
      setLoading(false);
    };
    loadData();
  }, [loadTeams, loadChildren, loadCheckpoints, loadEvents, loadGames]);

  // Carregar status dos territórios
  useEffect(() => {
    const loadTerritories = async () => {
      const status: Record<string, any> = {};
      for (const cp of safeCheckpoints) {
        try {
          const res = await fetch(`http://${window.location.hostname}:3001/api/checkpoints/${cp.id}/territory`);
          const data = await res.json();
          status[cp.id] = data;
        } catch (err) {
          console.error(`Erro ao carregar território ${cp.id}:`, err);
        }
      }
      setTerritories(status);
    };
    
    if (safeCheckpoints.length > 0) {
      loadTerritories();
      const interval = setInterval(loadTerritories, 5000);
      return () => clearInterval(interval);
    }
  }, [safeCheckpoints.length]);

  // Estatísticas
  const totalEvents = safeEvents.length;
  const totalChildren = safeChildren.length;
  const activeCheckpoints = safeCheckpoints.filter(cp => cp?.status === 'online').length;
  const availableGames = safeGames.filter(g => g?.status === 'active').length;
  const conqueredCheckpoints = Object.values(territories).filter(t => t?.isLocked).length;
  const totalScores = safeChildren.reduce((sum, c) => sum + (c?.scores || 0), 0);

  // Evento ativo
  const activeEvent = safeEvents.find(e => e?.status === 'active' || e?.status === 'ongoing');

  // Jogos mais populares (baseado em checkpoints)
  const topGames = [...safeGames]
    .sort((a, b) => (b?.checkpoints?.length || 0) - (a?.checkpoints?.length || 0))
    .slice(0, 3);

  // Checkpoints mais acessados
  const topCheckpoints = [...safeCheckpoints]
    .sort((a, b) => {
      const aCount = safeScoreLog.filter(s => s?.checkpoint === a.id || s?.checkpoint_id === a.id).length;
      const bCount = safeScoreLog.filter(s => s?.checkpoint === b.id || s?.checkpoint_id === b.id).length;
      return bCount - aCount;
    })
    .slice(0, 5);

  // Dados para gráficos (mockados ou reais)
  const participantByEventData = safeEvents.slice(0, 5).map(e => ({
    name: e.name?.substring(0, 15) || 'Evento',
    participantes: e.childrenCount || Math.floor(Math.random() * 50) + 10,
  }));

  // Dados de engajamento por hora (últimas 24h)
  const getEngagementData = () => {
    const hours = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
    const lastReadings = safeScoreLog.slice(-100);
    
    return hours.map(hour => {
      const hourNum = parseInt(hour.split(':')[0]);
      const count = lastReadings.filter(r => {
        const readingHour = r.created_at ? new Date(r.created_at).getHours() : hourNum;
        return readingHour === hourNum;
      }).length;
      return { hora: hour, pontuacoes: count };
    });
  };

  const engagementOverTimeData = getEngagementData();

  const kpis = [
    { label: 'Total eventos', value: totalEvents, color: 'text-primary', icon: <Calendar size={24} /> },
    { label: 'Crianças cadastradas', value: totalChildren, color: 'text-secondary', icon: <Users size={24} /> },
    { label: 'Checkpoints ativos', value: activeCheckpoints, color: 'text-success', icon: <MapPin size={24} /> },
    { label: 'Territórios conquistados', value: conqueredCheckpoints, color: 'text-accent', icon: <Shield size={24} /> },
    { label: 'Pontuação total', value: totalScores, color: 'text-warning', icon: <Trophy size={24} /> },
  ];

  if (loading) {
    return (
      <div className="flex h-screen bg-dark text-white overflow-hidden">
        <Sidebar
          items={navItems}
          activePath={location.pathname}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
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

  return (
    <div className="flex h-screen bg-dark text-white overflow-hidden">
      <Sidebar
        items={navItems}
        activePath={location.pathname}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
        accentColor="#1E9BD7"
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Gestão do Buffet" subtitle="Painel administrativo" />

        <main className="min-w-0 flex-1 overflow-y-auto p-4 space-y-6 sm:p-6">
          <PageHeader
            title="Dashboard"
            description="Visão geral da operação"
            icon={<LayoutDashboard size={28} />}
          />

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {kpis.map(kpi => (
              <Card key={kpi.label} className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-dark-surface">
                  <span className={kpi.color}>{kpi.icon}</span>
                </div>
                <div>
                  <p className="text-sm font-body text-gray-400">{kpi.label}</p>
                  <p className={`font-display text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                </div>
              </Card>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h3 className="font-display text-lg text-white mb-4">Participantes por Evento</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={participantByEventData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1E1B2E', border: '1px solid #374151', borderRadius: 8 }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="participantes" fill="#1E9BD7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <h3 className="font-display text-lg text-white mb-4">Engajamento ao Longo do Tempo</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={engagementOverTimeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="hora" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1E1B2E', border: '1px solid #374151', borderRadius: 8 }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="pontuacoes" stroke="#29B6F6" strokeWidth={2} dot={{ fill: '#29B6F6', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Evento Ativo */}
            <Card variant="glow">
              <div className="flex items-center gap-2 mb-3">
                <StatusDot status={activeEvent ? 'online' : 'offline'} size="lg" />
                <h3 className="font-display text-lg text-white">Evento Ativo</h3>
              </div>
              {activeEvent ? (
                <div className="space-y-2">
                  <p className="font-display text-xl text-white">{activeEvent.name}</p>
                  <p className="text-sm text-gray-400">{activeEvent.date}</p>
                  <p className="text-sm text-gray-400">{activeEvent.location || 'Local não definido'}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <Badge variant="success">Ativo</Badge>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Nenhum evento ativo no momento</p>
              )}
            </Card>

            {/* Jogos mais populares */}
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Trophy size={20} className="text-accent" />
                <h3 className="font-display text-lg text-white">Jogos disponíveis</h3>
              </div>
              <div className="space-y-3">
                {topGames.length > 0 ? (
                  topGames.map((game, index) => (
                    <div key={game.id} className="flex items-center gap-3 p-2 rounded-lg bg-surface/50">
                      <span className="font-mono text-lg font-bold text-gray-500 w-6 text-center">{index + 1}</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">{game.name}</p>
                        <p className="text-xs text-gray-500">
                          {game.type === 'team' ? 'Equipe' : game.type === 'individual' ? 'Individual' : 'Cooperativo'} 
                          &middot; {game.checkpoints?.length || 0} checkpoints
                        </p>
                      </div>
                      <Badge variant={game.status === 'active' ? 'success' : 'muted'}>
                        {game.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm text-center py-4">Nenhum jogo cadastrado</p>
                )}
              </div>
            </Card>

            {/* Checkpoints mais acessados */}
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={20} className="text-secondary" />
                <h3 className="font-display text-lg text-white">Checkpoints mais acessados</h3>
              </div>
              <div className="space-y-3">
                {topCheckpoints.length > 0 ? (
                  topCheckpoints.map((cp, index) => {
                    const accessCount = safeScoreLog.filter(s => s?.checkpoint === cp.id || s?.checkpoint_id === cp.id).length;
                    const territory = territories[cp.id];
                    const isLocked = territory?.isLocked || false;
                    return (
                      <div key={cp.id} className="flex items-center gap-3 p-2 rounded-lg bg-surface/50">
                        <span className="font-mono text-lg font-bold text-gray-500 w-6 text-center">{index + 1}</span>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-white">{cp.name}</p>
                          <p className="text-xs text-gray-500">
                            {cp.zone || 'Sem zona'} &middot; {accessCount} leituras
                          </p>
                        </div>
                        {isLocked ? (
                          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" title="Conquistado" />
                        ) : (
                          <StatusDot status={cp.status === 'online' ? 'online' : 'offline'} />
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-500 text-sm text-center py-4">Nenhum checkpoint cadastrado</p>
                )}
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}