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
  Wifi,
  WifiOff,
  Clock,
  AlertTriangle,
  Server,
  Gauge,
  Zap,
  TrendingUp,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../../services/api';
import Sidebar from '../../components/layout/Sidebar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import StatusDot from '../../components/ui/StatusDot';

const masterNavItems = [
  { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/master' },
  { icon: <Users size={20} />, label: 'Clientes', path: '/master/clients' },
  { icon: <CreditCard size={20} />, label: 'Planos', path: '/master/plans' },
  { icon: <Activity size={20} />, label: 'Monitoramento', path: '/master/monitoring' },
  { icon: <ScrollText size={20} />, label: 'Logs', path: '/master/logs' },
  { icon: <LifeBuoy size={20} />, label: 'Suporte', path: '/master/support' },
  { icon: <BarChart3 size={20} />, label: 'Analytics', path: '/master/analytics' },
];

function generateUptimeData(uptime: number) {
  return [{ time: 'Atual', uptime }];
}

export default function MasterMonitoring() {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [units, setUnits] = useState<any[]>([]);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [unitsData, statusData] = await Promise.all([
          api.getMonitoringUnits(),
          api.getSystemStatus()
        ]);
        setUnits(unitsData);
        setSystemStatus(statusData);
      } catch (error) {
        console.error('Erro ao buscar dados de monitoramento:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const onlineUnits = systemStatus?.onlineUnits || 0;
  const offlineUnits = systemStatus?.offlineUnits || 0;
  const totalAlerts = systemStatus?.totalAlerts || 0;
  const avgLatency = systemStatus?.avgLatency || 0;

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
            title="Monitoramento Técnico"
            description="Status das unidades e infraestrutura em tempo real"
            icon={<Activity size={28} />}
            action={
              <div className="flex items-center gap-3">
                <Badge variant="success">{onlineUnits} online</Badge>
                {offlineUnits > 0 && <Badge variant="danger">{offlineUnits} offline</Badge>}
                {totalAlerts > 0 && <Badge variant="accent">{totalAlerts} alertas</Badge>}
              </div>
            }
          />

          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="text-center">
              <Wifi size={20} className="text-success mx-auto mb-1" />
              <p className="font-display text-2xl text-success font-bold">{onlineUnits}</p>
              <p className="text-sm text-gray-400">Unidades online</p>
            </Card>
            <Card className="text-center">
              <WifiOff size={20} className="text-danger mx-auto mb-1" />
              <p className="font-display text-2xl text-danger font-bold">{offlineUnits}</p>
              <p className="text-sm text-gray-400">Unidades offline</p>
            </Card>
            <Card className="text-center">
              <Gauge size={20} className="text-secondary mx-auto mb-1" />
              <p className="font-display text-2xl text-secondary font-bold">{avgLatency}ms</p>
              <p className="text-sm text-gray-400">Latência média</p>
            </Card>
            <Card className="text-center">
              <AlertTriangle size={20} className="text-accent mx-auto mb-1" />
              <p className="font-display text-2xl text-accent font-bold">{totalAlerts}</p>
              <p className="text-sm text-gray-400">Alertas ativos</p>
            </Card>
          </div>

          {/* Active Alerts */}
          {totalAlerts > 0 && (
            <Card variant="glow" className="mb-6 border-danger/30">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={20} className="text-danger" />
                <h3 className="font-display text-lg text-white">Alertas Ativos</h3>
                <Badge variant="danger">{totalAlerts}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {units.filter(u => u.alerts.length > 0).map(unit => (
                  unit.alerts.map((alert: string, i: number) => (
                    <div
                      key={`${unit.id}-${i}`}
                      className="flex items-center gap-3 p-3 rounded-lg bg-danger/10 border border-danger/20"
                    >
                      <StatusDot status="offline" size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-danger">{alert}</p>
                        <p className="text-xs text-gray-500">{unit.name} - {unit.city}</p>
                      </div>
                    </div>
                  ))
                ))}
              </div>
            </Card>
          )}

          {/* Unit Grid and Uptime Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Unit Cards Grid */}
            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {units.map(unit => (
                  <Card
                    key={unit.id}
                    variant={selectedUnit?.id === unit.id ? 'glow' : 'default'}
                    className={unit.status === 'offline' ? 'border-danger/30' : ''}
                    onClick={() => setSelectedUnit(unit)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <StatusDot status={unit.status === 'online' ? 'online' : 'offline'} size="md" />
                        <span className="font-semibold text-white text-sm truncate">{unit.name}</span>
                      </div>
                      <Badge variant={unit.status === 'online' ? 'success' : 'danger'}>
                        {unit.status === 'online' ? 'Online' : 'Offline'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <Server size={12} className="text-gray-500" />
                        <span className="text-gray-400">CPs:</span>
                        <span className="text-white font-mono">{unit.checkpointsActive}/{unit.checkpointsTotal}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={12} className="text-gray-500" />
                        <span className="text-gray-400">Latência:</span>
                        <span className={`font-mono ${Number(unit.latency) > 30 ? 'text-accent' : 'text-white'}`}>{unit.latency == null ? '—' : `${unit.latency}ms`}</span>
                      </div>
                      <div className="flex items-center gap-1 col-span-2">
                        <Zap size={12} className="text-gray-500" />
                        <span className="text-gray-400">Último evento:</span>
                        <span className="text-gray-300 truncate">{unit.lastEvent}</span>
                      </div>
                    </div>
                    {unit.alerts && unit.alerts.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border">
                        <div className="flex items-center gap-1">
                          <AlertTriangle size={12} className="text-danger" />
                          <span className="text-xs text-danger">{unit.alerts.length} alerta{unit.alerts.length > 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    )}
                    <div className="mt-2 pt-2 border-t border-border flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <TrendingUp size={12} className="text-gray-500" />
                        <span className="text-xs text-gray-400">Uptime:</span>
                      </div>
                      <span className={`text-xs font-mono font-bold ${parseFloat(unit.uptime) >= 99 ? 'text-success' : parseFloat(unit.uptime) >= 95 ? 'text-accent' : 'text-danger'}`}>
                        {unit.uptime == null ? '—' : `${unit.uptime}%`}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Uptime Chart */}
            <Card className="lg:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={20} className="text-primary" />
                <h3 className="font-display text-lg text-white">
                  Uptime - {selectedUnit ? selectedUnit.name : 'Selecione uma unidade'}
                </h3>
              </div>
              {loading ? (
                <div className="flex items-center justify-center h-[300px] text-gray-500 text-sm">Carregando monitoramento...</div>
              ) : selectedUnit && Number.isFinite(Number(selectedUnit.uptime)) ? (
                <div>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={generateUptimeData(parseFloat(selectedUnit.uptime))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="time" stroke="#6B7280" tick={{ fontSize: 10 }} />
                      <YAxis domain={[90, 100]} stroke="#6B7280" tick={{ fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1E1B2E',
                          border: '1px solid rgba(30,155,215,0.3)',
                          borderRadius: '8px',
                          color: '#fff',
                        }}
                        formatter={(value: unknown) => [`${Number(value).toFixed(1)}%`, 'Uptime']}
                      />
                      <Line
                        type="monotone"
                        dataKey="uptime"
                        stroke="#1E9BD7"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: '#1E9BD7' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Uptime médio</span>
                      <span className="font-mono text-white">{selectedUnit.uptime == null ? '—' : `${selectedUnit.uptime}%`}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Latência atual</span>
                      <span className="font-mono text-white">{selectedUnit.latency == null ? '—' : `${selectedUnit.latency}ms`}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Checkpoints</span>
                      <span className="font-mono text-white">{selectedUnit.checkpointsActive}/{selectedUnit.checkpointsTotal}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Alertas</span>
                      <span className="font-mono text-danger">{selectedUnit.alerts ? selectedUnit.alerts.length : 0}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-gray-500 text-sm">
                  Clique em uma unidade para ver o gráfico
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
