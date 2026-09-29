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

// empresas nunca teve (e não tem) colunas de latitude/longitude — a query
// que as lia quebrava em produção e o mapa nunca recebia nenhum cliente.
// Posicionamos pelo centroide aproximado do estado (UF), que é um dado que
// a empresa realmente preenche no cadastro.
const BRAZIL_STATE_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  AC: { lat: -9.0, lng: -70.5 }, AL: { lat: -9.6, lng: -36.6 }, AP: { lat: 1.4, lng: -51.8 },
  AM: { lat: -4.1, lng: -63.5 }, BA: { lat: -12.6, lng: -41.7 }, CE: { lat: -5.2, lng: -39.5 },
  DF: { lat: -15.8, lng: -47.9 }, ES: { lat: -19.6, lng: -40.6 }, GO: { lat: -15.9, lng: -49.8 },
  MA: { lat: -5.0, lng: -45.3 }, MT: { lat: -12.8, lng: -55.9 }, MS: { lat: -20.5, lng: -54.6 },
  MG: { lat: -18.6, lng: -44.5 }, PA: { lat: -3.9, lng: -52.5 }, PB: { lat: -7.2, lng: -36.5 },
  PR: { lat: -24.7, lng: -51.6 }, PE: { lat: -8.4, lng: -37.8 }, PI: { lat: -7.7, lng: -42.7 },
  RJ: { lat: -22.2, lng: -42.7 }, RN: { lat: -5.8, lng: -36.6 }, RS: { lat: -29.7, lng: -53.4 },
  RO: { lat: -10.9, lng: -62.8 }, RR: { lat: 2.0, lng: -61.4 }, SC: { lat: -27.3, lng: -50.2 },
  SP: { lat: -22.2, lng: -48.6 }, SE: { lat: -10.6, lng: -37.4 }, TO: { lat: -10.2, lng: -48.3 },
};

function BrazilMap({ clients }: { clients: MasterClient[] }) {
  const mapW = 400;
  const mapH = 380;

  const projectX = (lng: number) => ((lng + 74) / 58) * mapW;
  const projectY = (lat: number) => ((lat + 6) / 40) * mapH;

  const clientsToRender = Array.isArray(clients) ? clients : [];

  // Vários clientes podem estar no mesmo estado — separa os pontos com um
  // deslocamento pequeno e determinístico (mesmo cliente sempre no mesmo
  // lugar), em vez de empilhar tudo exatamente no mesmo pixel.
  const seenPerState: Record<string, number> = {};

  return (
    <svg viewBox={`0 0 ${mapW} ${mapH}`} className="w-full h-full max-w-md mx-auto">
      {/* Simplified Brazil outline */}
      <path
        d="M 130 10 L 180 5 L 230 15 L 270 25 L 300 40 L 330 55 L 345 80 L 350 100
           L 340 130 L 330 160 L 320 180 L 310 200 L 300 220 L 280 250 L 260 270
           L 240 285 L 220 295 L 200 300 L 180 295 L 160 280 L 140 260 L 120 235
           L 100 210 L 85 185 L 75 160 L 65 130 L 60 100 L 70 70 L 90 40 L 110 20 Z"
        fill="rgba(30,155,215,0.08)"
        stroke="rgba(30,155,215,0.3)"
        strokeWidth="1.5"
      />
      {/* State borders hint */}
      <line x1="200" y1="60" x2="220" y2="180" stroke="rgba(30,155,215,0.1)" strokeWidth="0.5" />
      <line x1="150" y1="120" x2="300" y2="160" stroke="rgba(30,155,215,0.1)" strokeWidth="0.5" />
      {/* Client dots */}
      {clientsToRender.map(client => {
        const uf = (client.state || '').trim().toUpperCase();
        const centroid = BRAZIL_STATE_CENTROIDS[uf];
        if (!centroid) return null; // sem UF cadastrada, não dá pra posicionar

        const indexInState = seenPerState[uf] || 0;
        seenPerState[uf] = indexInState + 1;
        // Espalha em círculo ao redor do centroide conforme repete no estado
        const angle = indexInState * 2.4; // radianos, espiral simples
        const radius = indexInState === 0 ? 0 : 6 + indexInState * 3;
        const cx = projectX(centroid.lng) + Math.cos(angle) * radius;
        const cy = projectY(centroid.lat) + Math.sin(angle) * radius;
        const color = client.status === 'active' ? '#22C55E' : client.status === 'blocked' ? '#EF4444' : '#F59E0B';
        return (
          <g key={client.id}>
            <circle cx={cx} cy={cy} r="6" fill={color} opacity="0.3">
              <animate attributeName="r" values="6;10;6" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx={cx} cy={cy} r="3" fill={color} />
            <text x={cx + 6} y={cy + 4} fill="rgba(255,255,255,0.7)" fontSize="8" fontFamily="sans-serif">
              {client.city}
            </text>
          </g>
        );
      })}
    </svg>
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
