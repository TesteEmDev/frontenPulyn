import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Users, Gamepad2, MapPin, Map,
  FileText, RefreshCw, Settings, Server, Clock, AlertTriangle, CheckCircle2, Activity
} from 'lucide-react';
import { usePulynStore } from '../../store/mockData';
import { api, API_URL } from '../../services/api';
import Sidebar from '../../components/layout/Sidebar';
import TopBar from '../../components/layout/TopBar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
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

function timeAgo(dateStr: string | null) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'agora mesmo';
  if (seconds < 3600) return `há ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `há ${Math.floor(seconds / 3600)}h`;
  return date.toLocaleString('pt-BR');
}

export default function AdminSync() {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { events = [], loadEvents } = usePulynStore();

  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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

  const safeEvents = Array.isArray(events) ? events : [];

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

  const fetchStatus = useCallback(async () => {
    const apiCheck = fetch(`${API_URL}/test`).then((res) => res.ok).catch(() => false);

    if (!selectedEventId) {
      setApiOnline(await apiCheck);
      setLastChecked(new Date());
      setCheckpoints([]);
      setActivity([]);
      return;
    }

    const [online, checkpointsData, activityData] = await Promise.all([
      apiCheck,
      api.getCheckpoints(selectedEventId).catch(() => []),
      api.getScoreHistory(selectedEventId, 15).catch(() => []),
    ]);
    setApiOnline(online);
    setCheckpoints(Array.isArray(checkpointsData) ? checkpointsData : []);
    setActivity(Array.isArray(activityData) ? activityData : []);
    setLastChecked(new Date());
  }, [selectedEventId]);

  // Atualiza sozinho a cada 10s — é status ao vivo, não uma foto parada.
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleRefreshNow = async () => {
    setRefreshing(true);
    await fetchStatus();
    setRefreshing(false);
  };

  const eventOptions = useMemo(() => (
    [...safeEvents]
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .map((e) => ({ value: e.id, label: `${e.name || 'Evento'} — ${e.date || 'sem data'}` }))
  ), [safeEvents]);

  const safeCheckpoints = Array.isArray(checkpoints) ? checkpoints : [];
  const onlineCheckpoints = safeCheckpoints.filter((cp) => cp?.status === 'online');
  const offlineCheckpoints = safeCheckpoints.filter((cp) => cp?.status !== 'online');
  const lastActivityAt = activity[0]?.created_at || null;
  const systemHealthy = apiOnline && (safeCheckpoints.length === 0 || onlineCheckpoints.length > 0);

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
        <TopBar title="Gestão do Buffet" subtitle="Status do Sistema" />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <PageHeader
            title="Status do Sistema"
            description="Saúde da API e dos checkpoints do evento, em tempo real"
            icon={<Activity size={28} />}
            action={
              <Button variant="primary" onClick={handleRefreshNow} disabled={refreshing}>
                <RefreshCw size={16} className={`mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
                Atualizar agora
              </Button>
            }
          />

          {/* Event Selector */}
          {!loading && safeEvents.length > 0 && (
            <Card>
              <Select
                label="Selecionar Evento"
                options={eventOptions}
                value={selectedEventId}
                onChange={e => setSelectedEventId(e.target.value)}
              />
            </Card>
          )}

          {loading ? (
            <Card>
              <p className="text-gray-500 text-sm text-center py-6">Carregando...</p>
            </Card>
          ) : !selectedEventId ? (
            <Card>
              <p className="text-gray-500 text-sm text-center py-6">Nenhum evento cadastrado ainda.</p>
            </Card>
          ) : (
            <>
              {/* Status Indicator */}
              <Card variant={systemHealthy ? 'glow' : 'default'}>
                <div className="flex items-center gap-4">
                  {systemHealthy ? (
                    <>
                      <CheckCircle2 size={40} className="text-success" />
                      <div>
                        <h2 className="font-display text-xl text-white">Tudo funcionando</h2>
                        <p className="text-sm text-gray-400">API respondendo e checkpoints online</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={40} className="text-accent" />
                      <div>
                        <h2 className="font-display text-xl text-white">Atenção necessária</h2>
                        <p className="text-sm text-gray-400">
                          {!apiOnline ? 'API não respondeu' : 'Nenhum checkpoint online'}
                        </p>
                      </div>
                    </>
                  )}
                  <Badge variant={systemHealthy ? 'success' : 'warning'} className="ml-auto">
                    {systemHealthy ? 'Operacional' : 'Com problemas'}
                  </Badge>
                </div>
              </Card>

              {/* Status Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="text-center">
                  <Server size={24} className="text-primary mx-auto mb-2" />
                  <p className="text-sm text-gray-400">API</p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <StatusDot status={apiOnline ? 'online' : 'offline'} />
                    <span className={`text-sm font-semibold ${apiOnline ? 'text-success' : 'text-danger'}`}>
                      {apiOnline === null ? 'Verificando...' : apiOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </Card>
                <Card className="text-center">
                  <MapPin size={24} className="text-secondary mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Checkpoints online</p>
                  <p className="text-2xl font-display font-bold text-white mt-1">
                    {onlineCheckpoints.length}/{safeCheckpoints.length}
                  </p>
                </Card>
                <Card className="text-center">
                  <Clock size={24} className="text-accent mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Última leitura</p>
                  <p className="text-sm text-white font-semibold mt-2">
                    {timeAgo(lastActivityAt) || 'Nenhuma ainda'}
                  </p>
                  {lastChecked && (
                    <p className="text-xs text-gray-500">verificado {lastChecked.toLocaleTimeString('pt-BR')}</p>
                  )}
                </Card>
              </div>

              {/* Offline Checkpoints */}
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle size={20} className="text-accent" />
                  <h3 className="font-display text-lg text-white">Checkpoints Offline</h3>
                  {offlineCheckpoints.length > 0 && <Badge variant="warning">{offlineCheckpoints.length}</Badge>}
                </div>
                {offlineCheckpoints.length > 0 ? (
                  <div className="space-y-2">
                    {offlineCheckpoints.map(cp => (
                      <div key={cp.id} className="flex items-center gap-3 p-3 rounded-lg bg-surface/50">
                        <StatusDot status="offline" />
                        <div className="flex-1">
                          <p className="text-sm text-white">{cp.name}</p>
                          <p className="text-xs text-gray-500">{cp.zone || 'Sem zona'}</p>
                        </div>
                        <Badge variant="danger">Offline</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm text-center py-4">
                    {safeCheckpoints.length > 0 ? 'Todos os checkpoints estão online' : 'Nenhum checkpoint cadastrado'}
                  </p>
                )}
              </Card>

              {/* Recent Activity */}
              <Card>
                <h3 className="font-display text-lg text-white mb-4">Atividade Recente</h3>
                <div className="space-y-2">
                  {activity.length > 0 ? (
                    activity.map(entry => (
                      <div key={entry.id} className="flex items-center gap-3 p-2 rounded-lg bg-surface/30">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: entry.team_color || '#1E9BD7' }}
                        />
                        <div className="flex-1">
                          <p className="text-sm text-white">
                            {entry.child_nickname || entry.child_name || 'Participante'} conquistou {entry.checkpoint_name || 'checkpoint'}
                          </p>
                        </div>
                        <span className="text-xs text-gray-500 font-mono">{timeAgo(entry.created_at)}</span>
                        <Badge variant="primary">+{entry.points ?? 0}</Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm text-center py-4">Nenhuma atividade registrada ainda</p>
                  )}
                </div>
              </Card>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
