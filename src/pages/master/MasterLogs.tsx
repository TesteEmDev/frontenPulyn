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

const logEntries: LogEntry[] = [
  { id: 'l1', timestamp: '2026-05-13 14:32:05', client: 'Buffet Alegria', type: 'error', message: 'Checkpoint CP03 offline - sem conexão', details: 'Timeout de conexão após 3 tentativas. IP: 192.168.1.103. Último heartbeat: 14:10:22' },
  { id: 'l2', timestamp: '2026-05-13 14:31:58', client: 'Buffet Festa Mágica', type: 'info', message: 'Score registrado: Pedro +20pts CP02', details: 'Caça ao Tesouro | Time Dragões | Bracelet PUL-001' },
  { id: 'l3', timestamp: '2026-05-13 14:31:45', client: 'Espaço Kids Divertido', type: 'sync', message: 'Sincronização concluída - 45 registros', details: 'Sync batch #1287 | 45 score logs | 0 errors | Duração: 1.2s' },
  { id: 'l4', timestamp: '2026-05-13 14:31:30', client: 'Buffet Festa Mágica', type: 'info', message: 'Score registrado: Mateus +10pts CP01', details: 'Caça ao Tesouro | Time Dragões | Bracelet PUL-003' },
  { id: 'l5', timestamp: '2026-05-13 14:28:15', client: 'Festas & Cia', type: 'warning', message: 'CPU usage acima de 90%', details: 'CPU: 92.3% | Memória: 78% | Processos ativos: 47 | Threshold: 90%' },
  { id: 'l6', timestamp: '2026-05-13 14:25:00', client: 'Espaço Kids Divertido', type: 'sync', message: 'Sync iniciado - batch #1287', details: 'Registros pendentes: 45 | Último sync: 14:20:00' },
  { id: 'l7', timestamp: '2026-05-13 14:20:30', client: 'Buffet Aventura', type: 'error', message: 'Unidade offline - sem heartbeat', details: 'Último heartbeat: 13:50:00 | Tentativas de reconexão: 5/5 | Status: CRITICAL' },
  { id: 'l8', timestamp: '2026-05-13 14:15:00', client: 'Espaço Kids Divertido', type: 'error', message: 'Erro de sincronização - dados não enviados', details: 'HTTP 503 | Endpoint: /api/v1/sync | Retry em 5min | Batch #1286' },
  { id: 'l9', timestamp: '2026-05-13 14:10:22', client: 'Buffet Alegria', type: 'warning', message: 'Checkpoint CP03 última leitura há 22min', details: 'IP: 192.168.1.103 | Zone: Área Azul | Tipo: UHF | Status: stale' },
  { id: 'l10', timestamp: '2026-05-13 14:05:00', client: 'Buffet Brasília', type: 'info', message: 'Evento iniciado: Colônia Férias', details: '32 crianças | 5 checkpoints | Duração: 240min | Game: Caça ao Tesouro' },
  { id: 'l11', timestamp: '2026-05-13 14:00:00', client: 'Pulyn Norte', type: 'sync', message: 'Sincronização concluída - 12 registros', details: 'Sync batch #892 | 12 score logs | 0 errors | Duração: 0.8s' },
  { id: 'l12', timestamp: '2026-05-13 13:55:00', client: 'Espaço Lúdico', type: 'info', message: 'Evento finalizado: Festa Escolar', details: '40 crianças | Duração: 180min | Total de scores: 850 | Checkpoints: 3/4' },
  { id: 'l13', timestamp: '2026-05-13 13:50:00', client: 'Buffet Aventura', type: 'error', message: 'Heartbeat timeout - unidade não responde', details: 'IP: 192.168.2.50 | Tentativa 1/5 | Próximo retry: 13:55:00' },
  { id: 'l14', timestamp: '2026-05-13 13:45:00', client: 'Mundo Encantado', type: 'warning', message: 'Trial expira em 3 dias', details: 'Expiração: 2026-05-16 | Plano: Starter | Contato: contato@mundoencantado.com.br' },
  { id: 'l15', timestamp: '2026-05-13 13:40:00', client: 'Buffet Brasília', type: 'info', message: 'Novo checkpoint registrado: CP06', details: 'Nome: Tobogã | Tipo: NFC+UHF | Zone: Área Externa | IP: 192.168.3.106' },
];

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

const clientOptions = [
  { value: 'all', label: 'Todos os clientes' },
  { value: 'Buffet Festa Mágica', label: 'Buffet Festa Mágica' },
  { value: 'Espaço Kids Divertido', label: 'Espaço Kids Divertido' },
  { value: 'Buffet Alegria', label: 'Buffet Alegria' },
  { value: 'Mundo Encantado', label: 'Mundo Encantado' },
  { value: 'Festas & Cia', label: 'Festas & Cia' },
  { value: 'Buffet Aventura', label: 'Buffet Aventura' },
  { value: 'Pulyn Norte', label: 'Pulyn Norte' },
  { value: 'Buffet Brasília', label: 'Buffet Brasília' },
  { value: 'Espaço Lúdico', label: 'Espaço Lúdico' },
  { value: 'Festas Goianas', label: 'Festas Goianas' },
];

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
  const [filterDate, setFilterDate] = useState('2026-05-13');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [logEntries, setLogEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const logs = await api.getLogs(100);
        setLogEntries(logs);
      } catch (error) {
        console.error('Erro ao buscar logs:', error);
      } finally {
        setLoading(false);
      }
    };
    loadLogs();
  }, []);

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
