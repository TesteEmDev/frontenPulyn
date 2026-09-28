import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Users, Gamepad2, MapPin, Map,
  FileText, RefreshCw, Settings, TrendingUp, Trophy, Shield
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { usePulynStore } from '../../store/mockData';
import { api, API_URL } from '../../services/api';
import Sidebar from '../../components/layout/Sidebar';
import TopBar from '../../components/layout/TopBar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import StatusDot from '../../components/ui/StatusDot';
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

const STATUS_LABELS: Record<string, { label: string; variant: 'success' | 'warning' | 'muted' }> = {
  active: { label: 'Ativo', variant: 'success' },
  ongoing: { label: 'Ativo', variant: 'success' },
  scheduled: { label: 'Agendado', variant: 'warning' },
  upcoming: { label: 'Agendado', variant: 'warning' },
  finished: { label: 'Finalizado', variant: 'muted' },
  completed: { label: 'Finalizado', variant: 'muted' },
};

export default function AdminDashboard() {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { events = [], loadEvents } = usePulynStore();

  const [loading, setLoading] = useState(true);
  const [loadingEventData, setLoadingEventData] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [children, setChildren] = useState<any[]>([]);
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [scoreLog, setScoreLog] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [territories, setTerritories] = useState<Record<string, any>>({});

  // Garantir que são arrays (segurança)
  const safeEvents = Array.isArray(events) ? events : [];
  const safeChildren = Array.isArray(children) ? children : [];
  const safeCheckpoints = Array.isArray(checkpoints) ? checkpoints : [];
  const safeGames = Array.isArray(games) ? games : [];
  const safeScoreLog = Array.isArray(scoreLog) ? scoreLog : [];
  const safeTeams = Array.isArray(teams) ? teams : [];

  // Carregar a lista de eventos da empresa (só para popular o dropdown)
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        if (loadEvents) await loadEvents();
      } catch (error) {
        console.error('Erro ao carregar eventos:', error);
      }
      setLoading(false);
    };
    loadData();
  }, [loadEvents]);

  // Selecionar um evento por padrão assim que a lista carregar: o ativo, ou
  // o mais recente por data, nunca "todos misturados".
  useEffect(() => {
    if (selectedEventId || safeEvents.length === 0) return;
    const active = safeEvents.find((e) => e?.status === 'active' || e?.status === 'ongoing');
    if (active) {
      setSelectedEventId(active.id);
      return;
    }
    const mostRecent = [...safeEvents].sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
    setSelectedEventId(mostRecent?.id || '');
  }, [safeEvents, selectedEventId]);

  // Carregar os dados do evento selecionado — direto da API, sem depender do
  // "eventoAtualId" global (que é o evento operacional em andamento em
  // outras telas, não necessariamente o que o admin quer analisar aqui).
  useEffect(() => {
    if (!selectedEventId) {
      setChildren([]);
      setCheckpoints([]);
      setGames([]);
      setScoreLog([]);
      setTeams([]);
      return;
    }

    let disposed = false;
    const loadEventData = async () => {
      setLoadingEventData(true);
      try {
        const [criancasData, checkpointsData, gamesData, historyData, timesData] = await Promise.all([
          api.getCriancas(selectedEventId).catch(() => []),
          api.getCheckpoints(selectedEventId).catch(() => []),
          api.getBrincadeiras(selectedEventId).catch(() => []),
          api.getScoreHistory(selectedEventId, 200).catch(() => []),
          api.getTimes(selectedEventId).catch(() => []),
        ]);
        if (disposed) return;
        setChildren(Array.isArray(criancasData) ? criancasData : []);
        setCheckpoints(Array.isArray(checkpointsData) ? checkpointsData : []);
        setGames(Array.isArray(gamesData) ? gamesData : []);
        setScoreLog(Array.isArray(historyData) ? historyData : []);
        setTeams(Array.isArray(timesData) ? timesData : []);
      } catch (error) {
        console.error('Erro ao carregar dados do evento:', error);
      } finally {
        if (!disposed) setLoadingEventData(false);
      }
    };
    loadEventData();
    return () => { disposed = true; };
  }, [selectedEventId]);

  // Carregar status dos territórios do evento selecionado
  useEffect(() => {
    const loadTerritories = async () => {
      const status: Record<string, any> = {};
      for (const cp of safeCheckpoints) {
        try {
          const res = await fetch(`${API_URL}/checkpoints/${cp.id}/territory`);
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
    setTerritories({});
  }, [safeCheckpoints]);

  const selectedEvent = safeEvents.find((e) => e.id === selectedEventId) || null;

  const eventOptions = useMemo(() => (
    [...safeEvents]
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .map((e) => ({ value: e.id, label: `${e.name || 'Evento'} — ${e.date || 'sem data'}` }))
  ), [safeEvents]);

  const handleSelectEvent = useCallback((eventId: string) => {
    setSelectedEventId(eventId);
  }, []);

  // Estatísticas do evento selecionado
  const totalEvents = safeEvents.length;
  const totalChildren = safeChildren.length;
  const activeCheckpoints = safeCheckpoints.filter(cp => cp?.status === 'online').length;
  const conqueredCheckpoints = Object.values(territories).filter(t => t?.isLocked).length;
  const totalScores = safeChildren.reduce((sum, c) => sum + (c?.scores ?? c?.score ?? 0), 0);

  // Jogos mais populares (baseado em checkpoints), dentro do evento selecionado
  const topGames = [...safeGames]
    .sort((a, b) => (b?.checkpoints?.length || 0) - (a?.checkpoints?.length || 0))
    .slice(0, 3);

  // Checkpoints mais acessados dentro do evento selecionado
  const topCheckpoints = [...safeCheckpoints]
    .sort((a, b) => {
      const aCount = safeScoreLog.filter(s => s?.checkpoint === a.id || s?.checkpoint_id === a.id).length;
      const bCount = safeScoreLog.filter(s => s?.checkpoint === b.id || s?.checkpoint_id === b.id).length;
      return bCount - aCount;
    })
    .slice(0, 5);

  // Participantes por time, dentro do evento selecionado (substitui a antiga
  // comparação "por evento", que não fazia mais sentido com um evento por vez).
  const participantsByTeamData = useMemo(() => {
    const teamById: Record<string, any> = {};
    for (const t of safeTeams) teamById[String(t.id)] = t;
    const counts: Record<string, number> = {};
    for (const child of safeChildren) {
      const teamId = child.teamId ?? child.team_id ?? child.time_id;
      const key = teamId ? String(teamId) : 'sem-time';
      counts[key] = (counts[key] || 0) + 1;
    }
    return Object.entries(counts).map(([teamId, count]) => ({
      name: teamId === 'sem-time' ? 'Sem time' : String(teamById[teamId]?.name || 'Time').substring(0, 15),
      participantes: count,
    }));
  }, [safeChildren, safeTeams]);

  // Dados de engajamento por hora (últimas 24h), dentro do evento selecionado
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
    { label: 'Total de eventos', value: totalEvents, color: 'text-primary', icon: <Calendar size={24} /> },
    { label: 'Crianças no evento', value: totalChildren, color: 'text-secondary', icon: <Users size={24} /> },
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
            description="Visão geral do evento selecionado"
            icon={<LayoutDashboard size={28} />}
            action={
              safeEvents.length > 0 ? (
                <div className="w-full sm:w-72">
                  <Select
                    options={eventOptions}
                    value={selectedEventId}
                    onChange={(e) => handleSelectEvent(e.target.value)}
                  />
                </div>
              ) : undefined
            }
          />

          {!selectedEventId ? (
            <Card>
              <p className="text-gray-500 text-sm text-center py-6">Nenhum evento cadastrado ainda.</p>
            </Card>
          ) : (
            <>
              {/* KPI Cards */}
              <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 ${loadingEventData ? 'opacity-60' : ''}`}>
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
                  <h3 className="font-display text-lg text-white mb-4">Participantes por Time</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={participantsByTeamData}>
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
                {/* Evento selecionado */}
                <Card variant="glow">
                  <div className="flex items-center gap-2 mb-3">
                    <StatusDot status={selectedEvent?.status === 'active' || selectedEvent?.status === 'ongoing' ? 'online' : 'offline'} size="lg" />
                    <h3 className="font-display text-lg text-white">Evento Selecionado</h3>
                  </div>
                  {selectedEvent ? (
                    <div className="space-y-2">
                      <p className="font-display text-xl text-white">{selectedEvent.name}</p>
                      <p className="text-sm text-gray-400">{selectedEvent.date}</p>
                      <p className="text-sm text-gray-400">{selectedEvent.location || 'Local não definido'}</p>
                      <div className="flex items-center gap-2 mt-3">
                        <Badge variant={STATUS_LABELS[selectedEvent.status]?.variant || 'muted'}>
                          {STATUS_LABELS[selectedEvent.status]?.label || selectedEvent.status}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Nenhum evento selecionado</p>
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
            </>
          )}
        </main>
      </div>
    </div>
  );
}
