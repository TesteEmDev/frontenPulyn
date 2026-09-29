import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Activity,
  ScrollText,
  LifeBuoy,
  BarChart3,
  MapPin,
  Bell,
  AlertTriangle,
  Wifi,
  WifiOff,
  Clock,
  Zap,
} from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import StatusDot from '../../components/ui/StatusDot';
import { api } from '../../services/api';
import { BRAZIL_STATES, BRAZIL_MAP_VIEWBOX, type BrazilStateShape } from './brazilMapData';

const masterNavItems = [
  { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/master' },
  { icon: <Users size={20} />, label: 'Clientes', path: '/master/clients' },
  { icon: <CreditCard size={20} />, label: 'Planos', path: '/master/plans' },
  { icon: <Activity size={20} />, label: 'Monitoramento', path: '/master/monitoring' },
  { icon: <ScrollText size={20} />, label: 'Logs', path: '/master/logs' },
  { icon: <LifeBuoy size={20} />, label: 'Suporte', path: '/master/support' },
  { icon: <BarChart3 size={20} />, label: 'Analytics', path: '/master/analytics' },
];

interface MasterClient {
  id: string;
  name: string;
  city: string;
  state: string;
  status: 'active' | 'blocked' | 'trial';
  plan: 'starter' | 'professional' | 'enterprise';
}

interface MasterAlert {
  id: string;
  type: 'offline' | 'sync_error' | 'warning';
  message: string;
  client: string;
  time: string;
}

const normalizeText = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

// O cadastro guarda o estado como o usuário digitou ("sp", "SP", "São Paulo"),
// então aceita sigla ou nome completo, sem depender de maiúscula/acento.
const findStateShape = (raw: string | null | undefined) => {
  if (!raw) return undefined;
  const key = normalizeText(raw);
  return BRAZIL_STATES.find((s) => s.uf.toLowerCase() === key || normalizeText(s.name) === key);
};

const STATUS_COLORS: Record<string, string> = {
  active: '#22C55E',
  blocked: '#EF4444',
  trial: '#F59E0B',
};

function BrazilMap({ clients }: { clients: MasterClient[] }) {
  const clientsToRender = Array.isArray(clients) ? clients : [];

  const placed: { client: MasterClient; shape: BrazilStateShape }[] = [];
  let unplaced = 0;
  clientsToRender.forEach((client) => {
    const shape = findStateShape(client.state);
    if (shape) placed.push({ client, shape });
    else unplaced += 1;
  });
  const statesWithClients = new Set(placed.map((p) => p.shape.uf));

  // Vários clientes no mesmo estado ficam em espiral ao redor do centro do
  // estado em vez de empilhados no mesmo ponto.
  const seenPerState: Record<string, number> = {};

  return (
    <div>
      <svg viewBox={BRAZIL_MAP_VIEWBOX} className="w-full h-auto max-h-[440px] mx-auto" role="img" aria-label="Mapa do Brasil com a localização dos clientes">
        {BRAZIL_STATES.map((state) => {
          const hasClients = statesWithClients.has(state.uf);
          return (
            <path
              key={state.uf}
              d={state.path}
              fill={hasClients ? 'rgba(30,155,215,0.28)' : 'rgba(30,155,215,0.07)'}
              stroke="rgba(30,155,215,0.55)"
              strokeWidth="1"
              strokeLinejoin="round"
            >
              <title>{state.name}</title>
            </path>
          );
        })}
        {placed.map(({ client, shape }) => {
          const indexInState = seenPerState[shape.uf] || 0;
          seenPerState[shape.uf] = indexInState + 1;
          const angle = indexInState * 2.4;
          const radius = indexInState === 0 ? 0 : 14 + indexInState * 5;
          const cx = shape.cx + Math.cos(angle) * radius;
          const cy = shape.cy + Math.sin(angle) * radius;
          const color = STATUS_COLORS[client.status] || STATUS_COLORS.trial;
          return (
            <g key={client.id}>
              <title>{`${client.name} — ${client.city || 'cidade não informada'}/${shape.uf}`}</title>
              <circle cx={cx} cy={cy} r="9" fill={color} opacity="0.3">
                <animate attributeName="r" values="9;16;9" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.3;0.08;0.3" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx={cx} cy={cy} r="5" fill={color} stroke="#0B1220" strokeWidth="1.5" />
              <text x={cx + 9} y={cy + 4} fill="rgba(255,255,255,0.9)" fontSize="13" fontFamily="sans-serif" paintOrder="stroke" stroke="#0B1220" strokeWidth="3">
                {client.city || shape.uf}
              </text>
            </g>
          );
        })}
      </svg>
      {unplaced > 0 && (
        <p className="text-xs text-gray-500 text-center mt-2">
          {unplaced} {unplaced === 1 ? 'cliente sem estado cadastrado não aparece' : 'clientes sem estado cadastrado não aparecem'} no mapa
        </p>
      )}
    </div>
  );
}

export default function MasterDashboard() {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    activeClients: 0,
    activeEvents: 0,
    onlineCheckpoints: 0,
    activeChildren: 0,
    offlineCheckpoints: 0,
    totalClients: 0,
  });
  const [clients, setClients] = useState<MasterClient[]>([]);
  const [activeEvents, setActiveEvents] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<MasterAlert[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const [dashboard, clientsData, eventsData, alertsData] = await Promise.all([
        api.getMasterDashboard(),
        api.getMasterClients(),
        api.getMasterActiveEvents(),
        api.getMasterAlerts(),
      ]);

      setDashboardData(dashboard);
      setClients(clientsData || []);
      setActiveEvents(eventsData || []);
      setAlerts(alertsData || []);
    } catch (error) {
      console.error('❌ Error loading dashboard:', error);
    }
  };

  const activeClients = dashboardData.activeClients;
  const activeEventsCount = dashboardData.activeEvents;
  const onlineCheckpoints = dashboardData.onlineCheckpoints;
  const activeChildrenToday = dashboardData.activeChildren;
  const offlineCheckpointsCount = dashboardData.offlineCheckpoints;
  const totalClientsCount = dashboardData.totalClients;

  const kpis = [
    { label: 'Clientes ativos', value: activeClients, icon: <Users size={20} />, color: 'text-primary' },
    { label: 'Eventos em andamento', value: activeEventsCount, icon: <Zap size={20} />, color: 'text-secondary' },
    { label: 'Checkpoints online', value: onlineCheckpoints, icon: <Wifi size={20} />, color: 'text-success' },
    { label: 'Crianças ativas hoje', value: activeChildrenToday, icon: <Clock size={20} />, color: 'text-accent' },
  ];

  return (
    <div className="flex h-screen bg-dark text-white overflow-hidden">
      <Sidebar
        items={masterNavItems}
        activePath={location.pathname}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        accentColor="#1E9BD7"
      />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">
          <PageHeader
            title="Painel Master"
            description="Visão global da plataforma Pulyn"
            icon={<LayoutDashboard size={28} />}
            action={
              <div className="flex items-center gap-3">
                <Badge variant="success">Todos os sistemas operacionais</Badge>
                <span className="text-sm text-gray-400 font-mono">
                  {currentTime.toLocaleTimeString('pt-BR')}
                </span>
              </div>
            }
          />

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Array.isArray(kpis) && kpis.map(kpi => (
              <Card key={kpi.label} variant="glow" className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className={kpi.color}>{kpi.icon}</span>
                  <p className="text-sm font-body text-gray-400">{kpi.label}</p>
                </div>
                <p className={`font-display text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
              </Card>
            ))}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Brazil Map */}
            <Card variant="glow" className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <MapPin size={20} className="text-primary" />
                <h3 className="font-display text-lg text-white">Clientes no Brasil</h3>
                <Badge variant="primary">{clients.length} unidades</Badge>
              </div>
              <div className="flex items-center justify-center py-4">
                <div className="w-full max-w-md">
                  <BrazilMap clients={clients} />
                  <div className="flex items-center justify-center gap-6 mt-4">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-success" />
                      <span className="text-xs text-gray-400">Ativo</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-accent" />
                      <span className="text-xs text-gray-400">Trial</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-danger" />
                      <span className="text-xs text-gray-400">Bloqueado</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* System Alerts */}
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={20} className="text-danger" />
                <h3 className="font-display text-lg text-white">Alertas do Sistema</h3>
                <Badge variant="danger">{alerts.length}</Badge>
              </div>
              <div className="space-y-3">
                {Array.isArray(alerts) && alerts.length > 0 ? (
                  alerts.map(alert => (
                    <div
                      key={alert.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-surface/50 border border-danger/20"
                    >
                      <StatusDot
                        status={alert.type === 'offline' ? 'offline' : 'warning'}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">{alert.message}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{alert.client}</p>
                      </div>
                      <span className="text-xs text-gray-500 shrink-0">{alert.time}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-400 text-sm">
                    Nenhum alerta no momento
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Active Events */}
          <Card variant="secondary" className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap size={20} className="text-secondary" />
                <h3 className="font-display text-lg text-white">Eventos em Andamento</h3>
              </div>
              <Badge variant="success">{activeEvents.length} ativos</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.isArray(activeEvents) && activeEvents.length > 0 ? (
                activeEvents.map((event: any) => {
                  const client = clients.find(c => c.name === event.client);
                  return (
                    <div
                      key={event.id}
                      className="rounded-lg border border-border p-4 bg-surface/30 hover:bg-surface/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <StatusDot status="online" size="sm" />
                        <span className="text-sm font-semibold text-white truncate">{event.name}</span>
                      </div>
                      <p className="text-xs text-gray-400 mb-1">{event.client}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">{event.childrenCount} crianças</span>
                        <span className="text-xs text-secondary font-mono">{event.elapsed}min</span>
                      </div>
                      {client && (
                        <Badge
                          variant={client.plan === 'enterprise' ? 'primary' : client.plan === 'professional' ? 'secondary' : 'muted'}
                          className="mt-2"
                        >
                          {client.plan}
                        </Badge>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full text-center py-8 text-gray-400">
                  Nenhum evento ativo no momento
                </div>
              )}
            </div>
          </Card>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <Card className="text-center">
              <WifiOff size={24} className="text-danger mx-auto mb-2" />
              <p className="font-display text-2xl text-danger font-bold">{offlineCheckpointsCount}</p>
              <p className="text-sm text-gray-400">Checkpoints offline</p>
            </Card>
            <Card className="text-center">
              <Bell size={24} className="text-accent mx-auto mb-2" />
              <p className="font-display text-2xl text-accent font-bold">{alerts.length}</p>
              <p className="text-sm text-gray-400">Alertas pendentes</p>
            </Card>
            <Card className="text-center">
              <Users size={24} className="text-primary mx-auto mb-2" />
              <p className="font-display text-2xl text-primary font-bold">{totalClientsCount}</p>
              <p className="text-sm text-gray-400">Total de clientes</p>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
