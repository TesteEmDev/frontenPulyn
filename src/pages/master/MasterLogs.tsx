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
  Search,
  Download,
  Filter,
  AlertCircle,
  Info,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import { api } from '../../services/api';
import Sidebar from '../../components/layout/Sidebar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';

const masterNavItems = [
  { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/master' },
  { icon: <Users size={20} />, label: 'Clientes', path: '/master/clients' },
  { icon: <CreditCard size={20} />, label: 'Planos', path: '/master/plans' },
  { icon: <Activity size={20} />, label: 'Monitoramento', path: '/master/monitoring' },
  { icon: <ScrollText size={20} />, label: 'Logs', path: '/master/logs' },
  { icon: <LifeBuoy size={20} />, label: 'Suporte', path: '/master/support' },
  { icon: <BarChart3 size={20} />, label: 'Analytics', path: '/master/analytics' },
];

type LogType = 'error' | 'info' | 'warning' | 'sync';

interface LogEntry {
  id: string;
  timestamp: string;
  client: string;
  type: LogType;
  message: string;
  details: string;
}

const typeBadgeVariant: Record<LogType, 'danger' | 'primary' | 'accent' | 'secondary'> = {
  error: 'danger',
  info: 'primary',
  warning: 'accent',
  sync: 'secondary',
};

const typeLabel: Record<LogType, string> = {
  error: 'Error',
  info: 'Info',
  warning: 'Warning',
  sync: 'Sync',
};

const typeOptions = [
  { value: 'all', label: 'Todos os tipos' },
  { value: 'error', label: 'Error' },
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'sync', label: 'Sync' },
];

export default function MasterLogs() {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const [filterClient, setFilterClient] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const logs = await api.getLogs(100);
        setLogEntries((Array.isArray(logs) ? logs : []).map((log: any) => ({
          ...log,
          timestamp: log.timestamp || log.created_at || '—',
          client: log.client || log.empresa_nome || log.cliente_nome || '—',
          type: log.type || log.tipo || 'info',
          message: log.message || 'Log registrado',
          details: log.details || '',
        })));
      } catch (error) {
        console.error('Erro ao buscar logs:', error);
      } finally {
        setLoading(false);
      }
    };
    loadLogs();
  }, []);

  const clientOptions = [
    { value: 'all', label: 'Todos os clientes' },
    ...Array.from(new Set(logEntries.map((log) => log.client).filter(Boolean))).map((client) => ({
      value: client,
      label: client,
    })),
  ];

  const filteredLogs = logEntries.filter(log => {
    const matchSearch = log.message.toLowerCase().includes(search.toLowerCase()) ||
      log.client.toLowerCase().includes(search.toLowerCase());
    const matchClient = filterClient === 'all' || log.client === filterClient;
    const matchType = filterType === 'all' || log.type === filterType;
    const matchDate = !filterDate || log.timestamp.startsWith(filterDate);
    return matchSearch && matchClient && matchType && matchDate;
  });

  const handleExport = () => {
    const csv = [
      'Timestamp,Cliente,Tipo,Mensagem,Detalhes',
      ...filteredLogs.map(l =>
        `"${l.timestamp}","${l.client}","${l.type}","${l.message}","${l.details}"`
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pulyn-logs-${filterDate || 'all'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

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
            title="Logs Técnicos"
            description="Registro de atividades e eventos do sistema"
            icon={<ScrollText size={28} />}
            action={
              <div className="flex items-center gap-3">
                {(filteredLogs.filter(l => l.type === 'error').length) > 0 && <Badge variant="danger">{filteredLogs.filter(l => l.type === 'error').length} erros</Badge>}
                {(filteredLogs.filter(l => l.type === 'warning').length) > 0 && <Badge variant="accent">{filteredLogs.filter(l => l.type === 'warning').length} warnings</Badge>}
                <Button variant="ghost" size="sm" onClick={handleExport}>
                  <Download size={16} className="mr-1" />
                  Exportar
                </Button>
              </div>
            }
          />

          {/* Filters */}
          <Card className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter size={16} className="text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-400">Filtros</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-2">
                <Input
                  placeholder="Buscar nos logs..."
                  icon={<Search size={18} />}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <Select
                options={clientOptions}
                value={filterClient}
                onChange={e => setFilterClient(e.target.value)}
              />
              <Select
                options={typeOptions}
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
              />
              <Input
                type="date"
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
              />
            </div>
          </Card>

          {/* Log Table */}
          <Card>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-gray-400">Carregando logs...</p>
                </div>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-gray-400">
                    <th className="text-left py-3 px-4 font-semibold w-40">Timestamp</th>
                    <th className="text-left py-3 px-4 font-semibold">Cliente</th>
                    <th className="text-left py-3 px-4 font-semibold w-24">Tipo</th>
                    <th className="text-left py-3 px-4 font-semibold">Mensagem</th>
                    <th className="text-right py-3 px-4 font-semibold w-16">Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map(log => (
                    <>
                      <tr
                        key={log.id}
                        className="border-b border-border/50 hover:bg-surface/30 transition-colors cursor-pointer"
                        onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                      >
                        <td className="py-3 px-4 font-mono text-xs text-gray-400">{log.timestamp}</td>
                        <td className="py-3 px-4 text-gray-300">{log.client}</td>
                        <td className="py-3 px-4">
                          <Badge variant={typeBadgeVariant[log.type]}>{typeLabel[log.type]}</Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {log.type === 'error' && <AlertCircle size={14} className="text-danger shrink-0" />}
                            {log.type === 'warning' && <AlertTriangle size={14} className="text-accent shrink-0" />}
                            {log.type === 'info' && <Info size={14} className="text-primary shrink-0" />}
                            {log.type === 'sync' && <RefreshCw size={14} className="text-secondary shrink-0" />}
                            <span className="text-gray-200">{log.message}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <ChevronDown
                            size={14}
                            className={`text-gray-500 inline-block transition-transform ${expandedLog === log.id ? 'rotate-180' : ''}`}
                          />
                        </td>
                      </tr>
                      {expandedLog === log.id && (
                        <tr key={`${log.id}-detail`}>
                          <td colSpan={5} className="px-4 py-3 bg-surface/30">
                            <div className="pl-4 border-l-2 border-primary/30">
                              <p className="text-xs text-gray-400 mb-1">Detalhes:</p>
                              <p className="text-sm text-gray-300 font-mono">{log.details}</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                  {filteredLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">
                        Nenhum log encontrado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
              <span className="text-sm text-gray-500">{filteredLogs.length} registros</span>
              <Button variant="ghost" size="sm" onClick={handleExport}>
                <Download size={14} className="mr-1" />
                Exportar CSV
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
