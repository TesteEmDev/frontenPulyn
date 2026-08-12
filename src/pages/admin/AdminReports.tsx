// src/pages/admin/AdminReports.tsx
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Users, Gamepad2, MapPin, Map as MapIcon,
  FileText, RefreshCw, Settings, Download, Trophy
} from 'lucide-react';
import {
  BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';
import { usePulynStore } from '../../store/mockData';
import Sidebar from '../../components/layout/Sidebar';
import TopBar from '../../components/layout/TopBar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';

const navItems = [
  { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/admin' },
  { icon: <Calendar size={20} />, label: 'Eventos', path: '/admin/events' },
  { icon: <Users size={20} />, label: 'Crianças', path: '/admin/children' },
  { icon: <Gamepad2 size={20} />, label: 'Jogos', path: '/admin/games' },
  { icon: <MapPin size={20} />, label: 'Checkpoints', path: '/admin/checkpoints' },
  { icon: <MapIcon size={20} />, label: 'Mapa', path: '/admin/map' },
  { icon: <Users size={20} />, label: 'Usuários', path: '/admin/users' },
  { icon: <Users size={20} />, label: 'Times', path: '/admin/teams' },
  { icon: <FileText size={20} />, label: 'Relatórios', path: '/admin/reports' },
  { icon: <RefreshCw size={20} />, label: 'Sincronização', path: '/admin/sync' },
  { icon: <Settings size={20} />, label: 'Configurações', path: '/admin/settings' },
];

export default function AdminReports() {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { 
    children = [], 
    teams = [], 
    checkpoints = [], 
    scoreLog = [], 
    games = [],
    events = [],
    loadChildren,
    loadTeams,
    loadCheckpoints,
    loadGames
  } = usePulynStore();
  
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [scoreByTeamData, setScoreByTeamData] = useState<any[]>([]);
  const [engagementByZoneData, setEngagementByZoneData] = useState<any[]>([]);

  // Carregar dados da API
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        loadChildren(),
        loadTeams(),
        loadCheckpoints(),
        loadGames(),
      ]);
      
      // Gerar dados reais dos times
      const safeTeams = Array.isArray(teams) ? teams : [];
      const teamScores = safeTeams.map(team => ({
        name: team.name,
        pontos: team.points || 0,
        color: team.color
      }));
      setScoreByTeamData(teamScores.sort((a, b) => b.pontos - a.pontos));
      
      // Gerar dados de engajamento por zona
      const safeCheckpoints = Array.isArray(checkpoints) ? checkpoints : [];
      const zoneMap = new Map<string, number>();
      safeCheckpoints.forEach(cp => {
        const zone = cp.zone || 'Sem zona';
        const current = zoneMap.get(zone) || 0;
        zoneMap.set(zone, current + 1);
      });
      const zoneData = Array.from(zoneMap.entries()).map(([zone, valor]) => ({
        zone,
        valor: Math.min(valor * 20, 100) // Normalizar para escala 0-100
      }));
      setEngagementByZoneData(zoneData);
      
      setLoading(false);
    };
    loadData();
  }, [loadChildren, loadTeams, loadCheckpoints, loadGames, teams, checkpoints]);

  const safeChildren = Array.isArray(children) ? children : [];
  const safeCheckpoints = Array.isArray(checkpoints) ? checkpoints : [];
  const safeScoreLog = Array.isArray(scoreLog) ? scoreLog : [];
  const safeGames = Array.isArray(games) ? games : [];
  const safeEvents = Array.isArray(events) ? events : [];

  const totalParticipants = safeChildren.length;
  const avgPoints = safeChildren.length > 0
    ? Math.round(safeChildren.reduce((sum, c) => sum + (c.scores || 0), 0) / safeChildren.length)
    : 0;

  // Checkpoints mais acessados
  const checkpointCounts = safeCheckpoints.map(cp => ({
    id: cp.id,
    name: cp.name,
    count: safeScoreLog.filter(s => s.checkpoint === cp.id || s.checkpoint_id === cp.id).length,
  }));
  const mostVisited = checkpointCounts.sort((a, b) => b.count - a.count)[0];

  // Jogos mais populares
  const gameCounts = safeGames.map(g => ({
    ...g,
    count: safeScoreLog.filter(s => s.game === g.name || s.game_id === g.id).length,
  }));
  const mostPopular = gameCounts.sort((a, b) => b.count - a.count)[0];

  // Ranking dos participantes
  const rankingData = [...safeChildren]
    .filter(c => c.status === 'active')
    .sort((a, b) => (b.scores || 0) - (a.scores || 0))
    .slice(0, 10);

  const handleExportCSV = () => {
    const headers = ['Posição', 'Nome', 'Apelido', 'Idade', 'Pontuação'];
    const rows = rankingData.map((child, i) =>
      [i + 1, child.name, child.nickname || child.name, child.age, child.scores || 0].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ranking.csv';
    link.click();
    URL.revokeObjectURL(url);
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
            <p className="text-gray-400">Carregando relatórios...</p>
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
        <TopBar title="Gestão do Buffet" subtitle="Relatórios" />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <PageHeader
            title="Relatórios"
            description="Análise de dados e métricas do evento"
            icon={<FileText size={28} />}
            action={
              <Button variant="accent" onClick={handleExportCSV}>
                <Download size={16} className="mr-1.5" />
                Exportar CSV
              </Button>
            }
          />

          {/* Event Selector */}
          {safeEvents.length > 0 && (
            <Card>
              <Select
                label="Selecionar Evento"
                options={[
                  { value: '', label: 'Todos os eventos' },
                  ...safeEvents.map(e => ({ value: e.id, label: e.name }))
                ]}
                value={selectedEvent}
                onChange={e => setSelectedEvent(e.target.value)}
              />
            </Card>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="text-center">
              <p className="text-sm font-body text-gray-400 mb-1">Total participantes</p>
              <p className="font-display text-3xl font-bold text-primary">{totalParticipants}</p>
            </Card>
            <Card className="text-center">
              <p className="text-sm font-body text-gray-400 mb-1">Média de pontos</p>
              <p className="font-display text-3xl font-bold text-secondary">{avgPoints}</p>
            </Card>
            <Card className="text-center">
              <p className="text-sm font-body text-gray-400 mb-1">Checkpoint + visitado</p>
              <p className="font-display text-lg font-bold text-accent">{mostVisited?.name || '--'}</p>
            </Card>
            <Card className="text-center">
              <p className="text-sm font-body text-gray-400 mb-1">Jogo + popular</p>
              <p className="font-display text-lg font-bold text-success">{mostPopular?.name || '--'}</p>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h3 className="font-display text-lg text-white mb-4">Pontuação por Equipe</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={scoreByTeamData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1E1B2E', border: '1px solid #374151', borderRadius: 8 }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="pontos" fill="#1E9BD7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <h3 className="font-display text-lg text-white mb-4">Engajamento por Zona</h3>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={engagementByZoneData}>
                  <PolarGrid stroke="#374151" />
                  <PolarAngleAxis dataKey="zone" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                  <PolarRadiusAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1E1B2E', border: '1px solid #374151', borderRadius: 8 }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Radar
                    name="Engajamento"
                    dataKey="valor"
                    stroke="#29B6F6"
                    fill="#29B6F6"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Ranking Table */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy size={20} className="text-accent" />
                <h3 className="font-display text-lg text-white">Ranking</h3>
              </div>
              <Badge variant="primary">Top 10</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-3 text-sm font-body font-semibold text-gray-400">#</th>
                    <th className="pb-3 text-sm font-body font-semibold text-gray-400">Nome</th>
                    <th className="pb-3 text-sm font-body font-semibold text-gray-400">Apelido</th>
                    <th className="pb-3 text-sm font-body font-semibold text-gray-400">Idade</th>
                    <th className="pb-3 text-sm font-body font-semibold text-gray-400">Pontuação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rankingData.map((child, index) => (
                    <tr key={child.id} className="hover:bg-surface/50 transition-colors">
                      <td className="py-3 pr-4">
                        <span className={`font-mono text-lg font-bold ${
                          index === 0 ? 'text-accent' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-amber-700' : 'text-gray-500'
                        }`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <p className="text-sm font-semibold text-white">{child.name}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <p className="text-sm text-gray-300">{child.nickname || child.name}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <p className="text-sm text-gray-300">{child.age}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <p className="text-sm font-bold text-primary">{child.scores || 0}</p>
                      </td>
                    </tr>
                  ))}
                  {rankingData.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">
                        Nenhum participante ativo
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