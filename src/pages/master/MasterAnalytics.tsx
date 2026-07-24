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
  TrendingUp,
  DollarSign,
  Zap,
  MapPin,
  Gamepad2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import Sidebar from '../../components/layout/Sidebar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
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

const clientGrowthData = [
  { month: 'Jun 25', clients: 2 },
  { month: 'Jul 25', clients: 3 },
  { month: 'Ago 25', clients: 3 },
  { month: 'Set 25', clients: 4 },
  { month: 'Out 25', clients: 5 },
  { month: 'Nov 25', clients: 6 },
  { month: 'Dez 25', clients: 6 },
  { month: 'Jan 26', clients: 7 },
  { month: 'Fev 26', clients: 7 },
  { month: 'Mar 26', clients: 8 },
  { month: 'Abr 26', clients: 9 },
  { month: 'Mai 26', clients: 10 },
];

const eventsPerMonthData = [
  { month: 'Jun 25', events: 8 },
  { month: 'Jul 25', events: 15 },
  { month: 'Ago 25', events: 12 },
  { month: 'Set 25', events: 22 },
  { month: 'Out 25', events: 28 },
  { month: 'Nov 25', events: 35 },
  { month: 'Dez 25', events: 42 },
  { month: 'Jan 26', events: 38 },
  { month: 'Fev 26', events: 45 },
  { month: 'Mar 26', events: 52 },
  { month: 'Abr 26', events: 48 },
  { month: 'Mai 26', events: 55 },
];

const checkpointsOverTimeData = [
  { month: 'Jun 25', checkpoints: 6 },
  { month: 'Jul 25', checkpoints: 9 },
  { month: 'Ago 25', checkpoints: 9 },
  { month: 'Set 25', checkpoints: 14 },
  { month: 'Out 25', checkpoints: 18 },
  { month: 'Nov 25', checkpoints: 22 },
  { month: 'Dez 25', checkpoints: 24 },
  { month: 'Jan 26', checkpoints: 28 },
  { month: 'Fev 26', checkpoints: 30 },
  { month: 'Mar 26', checkpoints: 34 },
  { month: 'Abr 26', checkpoints: 38 },
  { month: 'Mai 26', checkpoints: 41 },
];

const tooltipStyle = {
  backgroundColor: '#1E1B2E',
  border: '1px solid rgba(30,155,215,0.3)',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '12px',
};

export default function MasterAnalytics() {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);
  const [revenueByPlan, setRevenueByPlan] = useState<any[]>([]);
  const [clientGrowthData, setClientGrowthData] = useState<any[]>([]);
  const [eventsPerMonthData, setEventsPerMonthData] = useState<any[]>([]);
  const [checkpointsOverTimeData, setCheckpointsOverTimeData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      const metricsData = await api.getMetricsAnalytics();
      
      const growthData = await api.getClientGrowth();
      
      const eventsData = await api.getEventsPerMonth();
      
      const checkpointsData = await api.getCheckpointsOverTime();
      
      const revenueData = await api.getRevenueByPlan();
      
      const mrrData = api.getMRR ? await api.getMRR() : { mrr: 45000 };
      
      setMetrics({
        ...metricsData,
        mrr: mrrData?.mrr || 45000,
      });
      setRevenueByPlan(revenueData || []);
      setClientGrowthData(growthData || []);
      setEventsPerMonthData(eventsData || []);
      setCheckpointsOverTimeData(checkpointsData || []);
    } catch (error) {
      console.error('❌ Error loading analytics:', error);
      setMetrics({
        mrr: 45000,
        activeClients: 0,
        totalClients: 0,
        totalEvents: 0,
        totalCheckpoints: 0,
        avgEventsPerClient: 0,
        totalChildren: 0,
      });
      setRevenueByPlan([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-dark text-white items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">Carregando analytics...</p>
        </div>
      </div>
    );
  }

  const mrr = metrics?.mrr || 45000;
  const activeClients = metrics?.activeClients || 0;
  const avgRevenuePerClient = metrics?.mrr && metrics?.activeClients ? Math.round(metrics.mrr / metrics.activeClients) : 0;
  const totalEvents = metrics?.totalEvents || 0;
  const totalCheckpoints = metrics?.totalCheckpoints || 0;
  const avgEventsPerClient = metrics?.avgEventsPerClient || 0;
  const activeChildrenTotal = metrics?.totalChildren || 0;

  const engagementKpis = [
    { label: 'MRR', value: `R$ ${mrr.toLocaleString('pt-BR')}`, icon: <DollarSign size={20} />, color: 'text-primary' },
    { label: 'Clientes ativos', value: activeClients, icon: <Users size={20} />, color: 'text-secondary' },
    { label: 'Crescimento YoY', value: '+400%', icon: <TrendingUp size={20} />, color: 'text-success' },
    { label: 'Eventos total', value: totalEvents, icon: <Zap size={20} />, color: 'text-accent' },
    { label: 'Checkpoints ativos', value: totalCheckpoints, icon: <MapPin size={20} />, color: 'text-primary' },
    { label: 'Média por cliente', value: `R$ ${avgRevenuePerClient.toLocaleString('pt-BR')}`, icon: <CreditCard size={20} />, color: 'text-secondary' },
    { label: 'Eventos/cliente', value: avgEventsPerClient, icon: <Gamepad2 size={20} />, color: 'text-accent' },
    { label: 'Crianças ativas', value: activeChildrenTotal, icon: <Users size={20} />, color: 'text-success' },
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

      <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <PageHeader
            title="Analytics SaaS"
            description="Métricas e indicadores de crescimento da plataforma"
            icon={<BarChart3 size={28} />}
            action={
              <div className="text-right">
                <p className="text-xs text-gray-500">Monthly Recurring Revenue</p>
                <p className="font-display text-2xl text-primary font-bold">
                  R$ {mrr.toLocaleString('pt-BR')}
                </p>
              </div>
            }
          />

          {/* Engagement KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {engagementKpis.map(kpi => (
              <Card key={kpi.label} className="text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <span className={kpi.color}>{kpi.icon}</span>
                </div>
                <p className={`font-display text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{kpi.label}</p>
              </Card>
            ))}
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Client Growth - Area Chart */}
            <Card variant="glow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp size={20} className="text-primary" />
                  <h3 className="font-display text-lg text-white">Crescimento de Clientes</h3>
                </div>
                <Badge variant="success">+400% YoY</Badge>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={clientGrowthData && clientGrowthData.length > 0 ? clientGrowthData : []}>
                  <defs>
                    <linearGradient id="clientGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1E9BD7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#1E9BD7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" stroke="#6B7280" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="clients"
                    stroke="#1E9BD7"
                    strokeWidth={2}
                    fill="url(#clientGradient)"
                    dot={{ r: 3, fill: '#1E9BD7' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            {/* Events per Month - Bar Chart */}
            <Card variant="secondary">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Zap size={20} className="text-secondary" />
                  <h3 className="font-display text-lg text-white">Eventos por Mês</h3>
                </div>
                <Badge variant="secondary">+350% YoY</Badge>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={eventsPerMonthData && eventsPerMonthData.length > 0 ? eventsPerMonthData : []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" stroke="#6B7280" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="events" fill="#29B6F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Full Width Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Checkpoints Over Time - Line Chart */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MapPin size={20} className="text-success" />
                  <h3 className="font-display text-lg text-white">Checkpoints Ativos ao Longo do Tempo</h3>
                </div>
                <Badge variant="success">{totalCheckpoints}</Badge>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={checkpointsOverTimeData && checkpointsOverTimeData.length > 0 ? checkpointsOverTimeData : []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" stroke="#6B7280" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line
                    type="monotone"
                    dataKey="checkpoints"
                    stroke="#22C55E"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#22C55E' }}
                    activeDot={{ r: 5, fill: '#22C55E' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* Revenue Breakdown */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <DollarSign size={20} className="text-primary" />
                  <h3 className="font-display text-lg text-white">Receita por Plano</h3>
                </div>
                <Badge variant="primary">MRR</Badge>
              </div>
              <div className="space-y-6 py-4">
                {revenueByPlan.length > 0 ? (
                  <>
                    {revenueByPlan.map((plan) => {
                      const totalRevenue = revenueByPlan.reduce((sum, p) => sum + (p.revenue || 0), 0);
                      const percentage = totalRevenue > 0 ? ((plan.revenue || 0) / totalRevenue) * 100 : 0;
                      const planColor = plan.plan === 'enterprise' ? 'bg-primary' : 
                                       plan.plan === 'professional' ? 'bg-secondary' : 'bg-gray-500';
                      
                      return (
                        <div key={plan.plan}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`w-3 h-3 rounded-full ${planColor}`} />
                              <span className="text-sm text-white font-semibold capitalize">{plan.plan}</span>
                              <span className="text-xs text-gray-500">{plan.clientCount} cliente(s)</span>
                            </div>
                            <span className="text-sm font-mono text-gray-300">R$ {(plan.revenue || 0).toLocaleString('pt-BR')}</span>
                          </div>
                          <div className="w-full bg-dark-surface rounded-full h-2">
                            <div className={`${planColor} rounded-full h-2`} style={{ width: `${percentage}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <>
                    {/* Enterprise */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-primary" />
                          <span className="text-sm text-white font-semibold">Enterprise</span>
                          <span className="text-xs text-gray-500">2 clientes</span>
                        </div>
                        <span className="text-sm font-mono text-primary">R$ 4,994</span>
                      </div>
                      <div className="w-full bg-surface rounded-full h-2">
                        <div className="bg-primary rounded-full h-2" style={{ width: '55%' }} />
                      </div>
                    </div>
                    {/* Professional */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-secondary" />
                          <span className="text-sm text-white font-semibold">Professional</span>
                          <span className="text-xs text-gray-500">4 clientes</span>
                        </div>
                        <span className="text-sm font-mono text-secondary">R$ 3,988</span>
                      </div>
                      <div className="w-full bg-surface rounded-full h-2">
                        <div className="bg-secondary rounded-full h-2" style={{ width: '44%' }} />
                      </div>
                    </div>
                    {/* Starter */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-gray-500" />
                          <span className="text-sm text-white font-semibold">Starter</span>
                          <span className="text-xs text-gray-500">4 clientes</span>
                        </div>
                        <span className="text-sm font-mono text-gray-400">R$ 1,988</span>
                      </div>
                      <div className="w-full bg-surface rounded-full h-2">
                        <div className="bg-gray-500 rounded-full h-2" style={{ width: '22%' }} />
                      </div>
                    </div>
                  </>
                )}
                {/* Total */}
                <div className="pt-4 border-t border-dark-border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Total MRR</span>
                    <span className="font-display text-xl text-primary font-bold">
                      R$ {mrr.toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
