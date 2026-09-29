import { useState, useEffect, useRef } from 'react';
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
import { BRAZIL_STATES, type BrazilStateShape } from './brazilMapData';

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

const FULL_VIEW = { x: 0, y: 0, w: 613, h: 639 };
const MAP_ASPECT = FULL_VIEW.w / FULL_VIEW.h;

const viewForState = (shape: BrazilStateShape) => {
  const [x0, y0, x1, y1] = shape.bbox;
  // Margem em volta do estado; largura mínima evita zoom absurdo em estados
  // minúsculos como o DF.
  const w = Math.max((x1 - x0) * 1.35, (y1 - y0) * 1.35 * MAP_ASPECT, 150);
  const h = w / MAP_ASPECT;
  return { x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - h / 2, w, h };
};

const STATUS_LABELS: Record<string, string> = { active: 'Ativo', blocked: 'Bloqueado', trial: 'Trial' };

function BrazilMap({ clients }: { clients: MasterClient[] }) {
  const clientsToRender = Array.isArray(clients) ? clients : [];
  const [selectedUf, setSelectedUf] = useState<string | null>(null);
  const [hoveredUf, setHoveredUf] = useState<string | null>(null);
  const [view, setView] = useState(FULL_VIEW);
  const viewRef = useRef(FULL_VIEW);

  const placed: { client: MasterClient; shape: BrazilStateShape }[] = [];
  let unplaced = 0;
  clientsToRender.forEach((client) => {
    const shape = findStateShape(client.state);
    if (shape) placed.push({ client, shape });
    else unplaced += 1;
  });
  const statesWithClients = new Set(placed.map((p) => p.shape.uf));
  const selectedShape = BRAZIL_STATES.find((s) => s.uf === selectedUf) || null;
  const selectedClients = placed.filter((p) => p.shape.uf === selectedUf).map((p) => p.client);

  // Anima a câmera (viewBox) até o estado escolhido, ou de volta ao Brasil todo.
  useEffect(() => {
    const from = viewRef.current;
    const to = selectedShape ? viewForState(selectedShape) : FULL_VIEW;
    const duration = 450;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const next = {
        x: from.x + (to.x - from.x) * e,
        y: from.y + (to.y - from.y) * e,
        w: from.w + (to.w - from.w) * e,
        h: from.h + (to.h - from.h) * e,
      };
      viewRef.current = next;
      setView(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [selectedShape]);

  // Com o zoom, pontos e textos encolhem na mesma proporção para não ficarem gigantes.
  const k = view.w / FULL_VIEW.w;
  const seenPerState: Record<string, number> = {};

  return (
    <div>
      <div className="flex items-center justify-between min-h-[28px] mb-2">
        <p className="text-sm text-gray-400">
          {selectedShape ? (
            <>
              <span className="text-white font-medium">{selectedShape.name}</span>
              {' · '}
              {selectedClients.length} {selectedClients.length === 1 ? 'cliente' : 'clientes'}
            </>
          ) : (
            'Clique em um estado para dar zoom'
          )}
        </p>
        {selectedShape && (
          <button
            type="button"
            onClick={() => setSelectedUf(null)}
            className="text-xs px-3 py-1 rounded-md border border-primary/40 text-primary hover:bg-primary/10 transition-colors"
          >
            Ver Brasil inteiro
          </button>
        )}
      </div>

      <svg
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        className="w-full h-auto max-h-[440px] mx-auto"
        role="group"
        aria-label="Mapa do Brasil com a localização dos clientes"
        onClick={() => setSelectedUf(null)}
      >
        {BRAZIL_STATES.map((state) => {
          const hasClients = statesWithClients.has(state.uf);
          const isSelected = state.uf === selectedUf;
          const isHovered = state.uf === hoveredUf;
          const fill = isSelected
            ? 'rgba(30,155,215,0.38)'
            : isHovered
              ? 'rgba(30,155,215,0.30)'
              : hasClients
                ? 'rgba(30,155,215,0.24)'
                : 'rgba(30,155,215,0.07)';
          return (
            <path
              key={state.uf}
              d={state.path}
              fill={fill}
              stroke={isSelected ? 'rgba(30,155,215,1)' : 'rgba(30,155,215,0.55)'}
              strokeWidth={(isSelected ? 2 : 1) * k}
              strokeLinejoin="round"
              style={{ cursor: 'pointer', transition: 'fill 150ms' }}
              tabIndex={0}
              role="button"
              aria-label={`${state.name}${hasClients ? ' (com clientes)' : ''}`}
              aria-pressed={isSelected}
              onMouseEnter={() => setHoveredUf(state.uf)}
              onMouseLeave={() => setHoveredUf(null)}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedUf(isSelected ? null : state.uf);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedUf(isSelected ? null : state.uf);
                }
              }}
            >
              <title>{state.name}</title>
            </path>
          );
        })}
        {placed.map(({ client, shape }) => {
          const indexInState = seenPerState[shape.uf] || 0;
          seenPerState[shape.uf] = indexInState + 1;
          const angle = indexInState * 2.4;
          const radius = (indexInState === 0 ? 0 : 14 + indexInState * 5) * k;
          const cx = shape.cx + Math.cos(angle) * radius;
          const cy = shape.cy + Math.sin(angle) * radius;
          const color = STATUS_COLORS[client.status] || STATUS_COLORS.trial;
          return (
            <g key={client.id} style={{ pointerEvents: 'none' }}>
              <circle cx={cx} cy={cy} r={9 * k} fill={color} opacity="0.3">
                <animate attributeName="opacity" values="0.3;0.08;0.3" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx={cx} cy={cy} r={5 * k} fill={color} stroke="#0B1220" strokeWidth={1.5 * k} />
              <text
                x={cx + 9 * k}
                y={cy + 4 * k}
                fill="rgba(255,255,255,0.9)"
                fontSize={13 * k}
                fontFamily="sans-serif"
                paintOrder="stroke"
                stroke="#0B1220"
                strokeWidth={3 * k}
              >
                {client.city || shape.uf}
              </text>
            </g>
          );
        })}
      </svg>

      {selectedShape && (
        <div className="mt-3 border-t border-white/10 pt-3">
          {selectedClients.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum cliente em {selectedShape.name}.</p>
          ) : (
            <ul className="space-y-2">
              {selectedClients.map((client) => (
                <li key={client.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: STATUS_COLORS[client.status] || STATUS_COLORS.trial }} />
                    <span className="text-white truncate">{client.name}</span>
                    <span className="text-gray-500 truncate">{client.city}</span>
                  </span>
                  <Badge variant={client.status === 'active' ? 'success' : client.status === 'blocked' ? 'danger' : 'warning'}>
                    {STATUS_LABELS[client.status] || client.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

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
