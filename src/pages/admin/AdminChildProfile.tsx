import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Users, Gamepad2, MapPin, Map,
  FileText, RefreshCw, Settings, Shield, Clock, Award
} from 'lucide-react';
import { usePulynStore } from '../../store/mockData';
import Sidebar from '../../components/layout/Sidebar';
import TopBar from '../../components/layout/TopBar';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
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

export default function AdminChildProfile() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { 
    children = [], 
    teams = [], 
    scoreLog = [], 
    events = [],
    loadChildren,
    loadTeams,
    loadScoreLog,
    loadEvents
  } = usePulynStore();
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        loadChildren(),
        loadTeams(),
        loadScoreLog && loadScoreLog(),
        loadEvents && loadEvents(),
      ]);
      setLoading(false);
    };
    loadData();
  }, [loadChildren, loadTeams, loadScoreLog, loadEvents]);

  const safeChildren = Array.isArray(children) ? children : [];
  const safeTeams = Array.isArray(teams) ? teams : [];
  const safeScoreLog = Array.isArray(scoreLog) ? scoreLog : [];
  const safeEvents = Array.isArray(events) ? events : [];

  const child = safeChildren.find(c => c.id === id);
  const team = child ? safeTeams.find(t => t.id === (child.teamId || child.team_id)) : null;
  const childScores = safeScoreLog.filter(s => s.childId === id || s.child_id === id);
  const braceletCode = child?.bracelet_code || child?.bracelet;

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
            <p className="text-gray-400">Carregando perfil...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!child) {
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
          <p className="text-gray-500">Criança não encontrada</p>
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
        <TopBar
          title={child.name}
          subtitle={child.nickname || child.name}
          onBack={() => navigate('/admin/children')}
        />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Header */}
          <Card variant="glow">
            <div className="flex items-center gap-4">
              <Avatar emoji={child.avatar || '👤'} size="lg" />
              <div className="flex-1">
                <h1 className="font-display text-2xl text-white">{child.name}</h1>
                <p className="text-sm text-gray-400">@{child.nickname || child.name} &middot; {child.age} anos</p>
                <div className="flex items-center gap-2 mt-2">
                  <StatusDot status={child.status === 'active' ? 'online' : child.status === 'pending' ? 'warning' : 'offline'} />
                  <span className="text-sm text-gray-400">
                    {child.status === 'active' ? 'Ativo' : child.status === 'pending' ? 'Pendente' : 'Inativo'}
                  </span>
                  {team && (
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-body font-semibold ml-2"
                      style={{ backgroundColor: team.color + '20', color: team.color }}
                    >
                      👥 {team.name}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Pontuação total</p>
                <p className="font-display text-3xl font-bold text-primary">{child.scores || 0}</p>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Família - Dados mockados (serão integrados depois) */}
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Users size={20} className="text-primary" />
                <h3 className="font-display text-lg text-white">Família</h3>
              </div>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-surface/50">
                  <p className="text-xs text-gray-500">Responsável</p>
                  <p className="text-sm text-white font-semibold">Maria Silva</p>
                  <p className="text-xs text-gray-400">(11) 99999-0001</p>
                </div>
                <div className="p-3 rounded-lg bg-surface/50">
                  <p className="text-xs text-gray-500">Autorizados para retirada</p>
                  <div className="space-y-1 mt-1">
                    <p className="text-sm text-gray-300">João Silva (pai)</p>
                    <p className="text-sm text-gray-300">Ana Costa (avó)</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Pulseira atual */}
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <MapPin size={20} className="text-secondary" />
                <h3 className="font-display text-lg text-white">Pulseira Atual</h3>
              </div>
              {braceletCode ? (
                <div className="p-4 rounded-lg bg-surface/50 text-center">
                  <p className="font-mono text-3xl font-bold text-secondary">{braceletCode}</p>
                  <Badge variant="success" className="mt-2">Vinculada</Badge>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-surface/50 text-center">
                  <p className="text-gray-500 text-sm">Nenhuma pulseira vinculada</p>
                  <Badge variant="warning" className="mt-2">Pendente</Badge>
                </div>
              )}
            </Card>

            {/* Consentimentos LGPD - Mockado */}
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Shield size={20} className="text-success" />
                <h3 className="font-display text-lg text-white">Consentimentos LGPD</h3>
              </div>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 rounded-lg bg-surface/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={true}
                    readOnly
                    className="w-4 h-4 rounded border-border bg-surface text-primary"
                  />
                  <div className="flex-1">
                    <p className="text-sm text-white">Uso de imagem</p>
                    <p className="text-xs text-gray-500">Autorizado em 15/05/2026</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg bg-surface/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={true}
                    readOnly
                    className="w-4 h-4 rounded border-border bg-surface text-primary"
                  />
                  <div className="flex-1">
                    <p className="text-sm text-white">Compartilhamento de dados</p>
                    <p className="text-xs text-gray-500">Autorizado em 15/05/2026</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg bg-surface/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={false}
                    readOnly
                    className="w-4 h-4 rounded border-border bg-surface text-primary"
                  />
                  <div className="flex-1">
                    <p className="text-sm text-white">Comunicações marketing</p>
                    <p className="text-xs text-gray-500">Não autorizado</p>
                  </div>
                </label>
              </div>
            </Card>

            {/* Score History */}
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Award size={20} className="text-accent" />
                <h3 className="font-display text-lg text-white">Histórico de Pontuação</h3>
              </div>
              {childScores.length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {childScores.map(score => (
                    <div key={score.id} className="flex items-center gap-3 p-2 rounded-lg bg-surface/50">
                      <span className="text-xs text-gray-500 whitespace-nowrap">{score.timestamp}</span>
                      <div className="flex-1">
                        <p className="text-sm text-white">{score.checkpoint || score.checkpoint_name}</p>
                      </div>
                      <Badge variant="success">+{score.points}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm text-center py-4">Nenhuma pontuação registrada</p>
              )}
            </Card>
          </div>

          {/* Timeline of Events */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Clock size={20} className="text-primary" />
              <h3 className="font-display text-lg text-white">Eventos Participados</h3>
            </div>
            <div className="space-y-3">
              {safeEvents.length > 0 ? (
                safeEvents.map(event => (
                  <div key={event.id} className="flex items-center gap-3 p-3 rounded-lg bg-surface/50">
                    <Calendar size={16} className="text-gray-500" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">{event.name}</p>
                      <p className="text-xs text-gray-500">{event.date}</p>
                    </div>
                    <Badge
                      variant={event.status === 'active' ? 'success' : event.status === 'scheduled' ? 'primary' : 'muted'}
                    >
                      {event.status === 'active' ? 'Ativo' : event.status === 'scheduled' ? 'Agendado' : 'Encerrado'}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm text-center py-4">Nenhum evento participado</p>
              )}
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}