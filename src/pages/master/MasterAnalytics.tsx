import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Activity,
  ScrollText,
  LifeBuoy,
  BarChart3,
  TrendingUp,
  DollarSign,
  Zap,
  MapPin,
  Gamepad2,
  Baby,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import {
  ComposedChart,
  Area,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import Sidebar from '../../components/layout/Sidebar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { COR_BARRA_POR_PLANO } from '../../utils/planos';
import Button from '../../components/ui/Button';
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

const tooltipStyle = {
  backgroundColor: '#1E1B2E',
  border: '1px solid rgba(30,155,215,0.3)',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '12px',
};

interface Metrics {
  totalClients: number;
  activeClients: number;
  trialClients: number;
  blockedClients: number;
  newClients30d: number;
  growthYoY: number | null;
  mrr: number;
  arpu: number;
  totalEvents: number;
  activeEvents: number;
  scheduledEvents: number;
  finishedEvents: number;
  avgEventsPerClient: number;
  totalCheckpoints: number;
  onlineCheckpoints: number;
  totalChildren: number;
  activeChildren: number;
}

interface PlanRevenue {
  plan: string;
  name: string;
  clientCount: number;
  price: number;
  revenue: number;
}

type SectionKey = 'metrics' | 'growth' | 'events' | 'checkpoints' | 'revenue';
const SECTION_LABELS: Record<SectionKey, string> = {
  metrics: 'indicadores',
  growth: 'crescimento de clientes',
  events: 'eventos por mês',
  checkpoints: 'checkpoints',
  revenue: 'receita por plano',
};

const planColors = COR_BARRA_POR_PLANO;

const money = (value: number) => `R$ ${value.toLocaleString('pt-BR')}`;

function ChartState({ error, empty }: { error?: string; empty: boolean }) {
  if (error) {
    return (
      <div className="flex h-[250px] items-center justify-center gap-2 text-sm text-danger">
        <AlertCircle size={16} /> Não foi possível carregar: {error}
      </div>
    );
  }
  if (empty) {
    return <div className="flex h-[250px] items-center justify-center text-sm text-gray-500">Ainda não há dados para mostrar.</div>;
  }
  return null;
}

export default function MasterAnalytics() {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [revenueByPlan, setRevenueByPlan] = useState<PlanRevenue[]>([]);
  const [clientGrowthData, setClientGrowthData] = useState<any[]>([]);
  const [eventsPerMonthData, setEventsPerMonthData] = useState<any[]>([]);
  const [checkpointsOverTimeData, setCheckpointsOverTimeData] = useState<any[]>([]);
  const [errors, setErrors] = useState<Partial<Record<SectionKey, string>>>({});
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const loadAnalyticsData = useCallback(async () => {
    setLoading(true);
    const requests: [SectionKey, Promise<any>][] = [
      ['metrics', api.getMetricsAnalytics()],
      ['growth', api.getClientGrowth()],
      ['events', api.getEventsPerMonth()],
      ['checkpoints', api.getCheckpointsOverTime()],
      ['revenue', api.getRevenueByPlan()],
    ];
    // Cada bloco carrega e falha sozinho: um erro não derruba os outros nem vira "zero".
    const results = await Promise.allSettled(requests.map(([, request]) => request));
    const nextErrors: Partial<Record<SectionKey, string>> = {};
    results.forEach((result, index) => {
      const key = requests[index][0];
      if (result.status === 'rejected') {
        console.error(`❌ Erro ao carregar ${SECTION_LABELS[key]}:`, result.reason);
        nextErrors[key] = result.reason instanceof Error ? result.reason.message : 'erro desconhecido';
        return;
      }
      const value = result.value;
      if (key === 'metrics') setMetrics(value);
      if (key === 'growth') setClientGrowthData(Array.isArray(value) ? value : []);
      if (key === 'events') setEventsPerMonthData(Array.isArray(value) ? value : []);
      if (key === 'checkpoints') setCheckpointsOverTimeData(Array.isArray(value) ? value : []);
      if (key === 'revenue') setRevenueByPlan(Array.isArray(value) ? value : []);
    });
    setErrors(nextErrors);
    setUpdatedAt(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  if (loading && !metrics) {
    return (
      <div className="flex h-screen bg-dark text-white items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">Carregando analytics...</p>
        </div>
      </div>
    );
  }

  const m = metrics;
  const metricValue = (value: string | number) => (errors.metrics || !m ? '—' : value);
  const yoy = m?.growthYoY ?? null;

  const kpis = [
    {
      label: 'MRR',
      value: metricValue(m ? money(m.mrr) : ''),
      hint: m ? `${m.activeClients} cliente(s) pagante(s)` : undefined,
      icon: <DollarSign size={20} />,
      color: 'text-primary',
    },
    {
      label: 'Clientes ativos',
      value: metricValue(m?.activeClients ?? 0),
      hint: m ? `de ${m.totalClients} · ${m.trialClients} trial · ${m.blockedClients} bloqueado(s)` : undefined,
      icon: <Users size={20} />,
      color: 'text-secondary',
    },
    {
      label: 'Crescimento em 12 meses',
      value: metricValue(yoy === null ? '—' : `${yoy > 0 ? '+' : ''}${yoy.toLocaleString('pt-BR')}%`),
      hint: m ? `${yoy === null ? 'sem 12 meses de histórico · ' : ''}${m.newClients30d} novo(s) em 30 dias` : undefined,
      icon: <TrendingUp size={20} />,
      color: 'text-success',
    },
    {
      label: 'Eventos',
      value: metricValue(m?.totalEvents ?? 0),
      hint: m ? `${m.activeEvents} em andamento · ${m.scheduledEvents} agendado(s) · ${m.finishedEvents} encerrado(s)` : undefined,
      icon: <Zap size={20} />,
      color: 'text-accent',
    },
    {
      label: 'Checkpoints online',
      value: metricValue(m ? `${m.onlineCheckpoints} de ${m.totalCheckpoints}` : ''),
      hint: 'cadastrados nos eventos dos clientes',
      icon: <MapPin size={20} />,
      color: 'text-primary',
    },
    {
      label: 'Receita média por cliente',
      value: metricValue(m ? money(m.arpu) : ''),
      hint: 'MRR ÷ clientes ativos',
      icon: <CreditCard size={20} />,
      color: 'text-secondary',
    },
    {
      label: 'Eventos por cliente',
      value: metricValue(m ? m.avgEventsPerClient.toLocaleString('pt-BR') : ''),
      hint: 'total de eventos ÷ total de clientes',
      icon: <Gamepad2 size={20} />,
      color: 'text-accent',
    },
    {
      label: 'Crianças ativas',
      value: metricValue(m?.activeChildren ?? 0),
      hint: m ? `de ${m.totalChildren} cadastradas` : undefined,
      icon: <Baby size={20} />,
      color: 'text-success',
    },
  ];

  const failed = (Object.keys(errors) as SectionKey[]).map((key) => SECTION_LABELS[key]);
  const totalRevenue = revenueByPlan.reduce((sum, p) => sum + p.revenue, 0);

  return (
    <div className="flex h-screen bg-dark text-white overflow-hidden">
      <Sidebar
        items={masterNavItems}
        activePath={location.pathname}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        accentColor="#1E9BD7"
      />

      <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <PageHeader
            title="Analytics SaaS"
            description="Métricas e indicadores de crescimento da plataforma"
            icon={<BarChart3 size={28} />}
            action={
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-gray-500">Monthly Recurring Revenue</p>
                  <p className="font-display text-2xl text-primary font-bold">{errors.metrics || !m ? '—' : money(m.mrr)}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={loadAnalyticsData} disabled={loading} title="Buscar os dados de novo">
                  <RefreshCw size={14} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              </div>
            }
          />

          {failed.length > 0 && (
            <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              <span className="flex items-center gap-2">
                <AlertCircle size={16} /> Não foi possível carregar: {failed.join(', ')}.
              </span>
              <Button variant="ghost" size="sm" onClick={loadAnalyticsData}>Tentar novamente</Button>
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {kpis.map((kpi) => (
              <Card key={kpi.label} className="text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <span className={kpi.color}>{kpi.icon}</span>
                </div>
                <p className={`font-display text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{kpi.label}</p>
                {kpi.hint && <p className="text-[11px] text-gray-500 mt-1 leading-snug">{kpi.hint}</p>}
              </Card>
            ))}
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Crescimento de clientes */}
            <Card variant="glow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp size={20} className="text-primary" />
                  <h3 className="font-display text-lg text-white">Crescimento de Clientes</h3>
                </div>
                {m && !errors.metrics && <Badge variant="primary">{m.totalClients} cliente(s)</Badge>}
              </div>
              {errors.growth || clientGrowthData.length === 0 ? (
                <ChartState error={errors.growth} empty={clientGrowthData.length === 0} />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <ComposedChart data={clientGrowthData}>
                    <defs>
                      <linearGradient id="clientGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1E9BD7" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#1E9BD7" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="month" stroke="#6B7280" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area
                      type="monotone"
                      dataKey="total"
                      name="Total de clientes"
                      stroke="#1E9BD7"
                      strokeWidth={2}
                      fill="url(#clientGradient)"
                      dot={{ r: 3, fill: '#1E9BD7' }}
                      isAnimationActive={false}
                    />
                    <Bar dataKey="clients" name="Novos no mês" fill="#29B6F6" radius={[4, 4, 0, 0]} barSize={18} isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Eventos por mês */}
            <Card variant="secondary">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Zap size={20} className="text-secondary" />
                  <h3 className="font-display text-lg text-white">Eventos por Mês</h3>
                </div>
                {m && !errors.metrics && <Badge variant="secondary">{m.totalEvents} no total</Badge>}
              </div>
              {errors.events || eventsPerMonthData.length === 0 ? (
                <ChartState error={errors.events} empty={eventsPerMonthData.length === 0} />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={eventsPerMonthData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="month" stroke="#6B7280" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="finished" name="Encerrados" stackId="events" fill="#29B6F6" isAnimationActive={false} />
                    <Bar dataKey="active" name="Em andamento" stackId="events" fill="#22C55E" isAnimationActive={false} />
                    <Bar dataKey="scheduled" name="Agendados" stackId="events" fill="#F59E0B" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Checkpoints */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MapPin size={20} className="text-success" />
                  <h3 className="font-display text-lg text-white">Checkpoints ao Longo do Tempo</h3>
                </div>
                {m && !errors.metrics && <Badge variant="success">{m.onlineCheckpoints}/{m.totalCheckpoints} online</Badge>}
              </div>
              {errors.checkpoints || checkpointsOverTimeData.length === 0 ? (
                <ChartState error={errors.checkpoints} empty={checkpointsOverTimeData.length === 0} />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <ComposedChart data={checkpointsOverTimeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="month" stroke="#6B7280" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="checkpoints" name="Novos no mês" fill="#166534" radius={[4, 4, 0, 0]} barSize={18} isAnimationActive={false} />
                    <Line
                      type="monotone"
                      dataKey="total"
                      name="Total cadastrado"
                      stroke="#22C55E"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#22C55E' }}
                      activeDot={{ r: 5, fill: '#22C55E' }}
                      isAnimationActive={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Receita por plano */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <DollarSign size={20} className="text-primary" />
                  <h3 className="font-display text-lg text-white">Receita por Plano</h3>
                </div>
                <Badge variant="primary">MRR</Badge>
              </div>
              <div className="space-y-6 py-4">
                {errors.revenue ? (
                  <ChartState error={errors.revenue} empty={false} />
                ) : revenueByPlan.length > 0 ? (
                  revenueByPlan.map((plan) => {
                    const percentage = totalRevenue > 0 ? (plan.revenue / totalRevenue) * 100 : 0;
                    const planColor = planColors[plan.plan] || 'bg-gray-500';
                    return (
                      <div key={plan.plan}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${planColor}`} />
                            <span className="text-sm text-white font-semibold">{plan.name}</span>
                            <span className="text-xs text-gray-500">{plan.clientCount} cliente(s) · {money(plan.price)}/mês</span>
                          </div>
                          <span className="text-sm font-mono text-gray-300">{money(plan.revenue)}</span>
                        </div>
                        <div className="w-full bg-dark-surface rounded-full h-2">
                          <div className={`${planColor} rounded-full h-2`} style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-gray-500 py-8 text-center">Nenhum cliente ativo em plano pago.</p>
                )}
                <div className="pt-4 border-t border-dark-border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Total MRR</span>
                    <span className="font-display text-xl text-primary font-bold">{errors.metrics || !m ? '—' : money(m.mrr)}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {updatedAt && (
            <p className="mt-4 text-center text-[11px] text-gray-500">
              Dados do banco, atualizados às {updatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
