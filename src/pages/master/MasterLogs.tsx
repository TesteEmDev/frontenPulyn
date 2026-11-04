import { Fragment, useState, useEffect, useMemo, useCallback } from 'react';
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
  Cpu,
  CalendarClock,
  KeyRound,
  Building2,
  Headset,
  Terminal,
  X,
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
  { icon: <Cpu size={20} />, label: 'Checkpoints', path: '/master/checkpoints' },
  { icon: <Activity size={20} />, label: 'Monitoramento', path: '/master/monitoring' },
  { icon: <ScrollText size={20} />, label: 'Logs', path: '/master/logs' },
  { icon: <LifeBuoy size={20} />, label: 'Suporte', path: '/master/support' },
  { icon: <BarChart3 size={20} />, label: 'Analytics', path: '/master/analytics' },
];

type LogType = 'error' | 'info' | 'warning' | 'sync';
type Categoria = 'cliente' | 'evento' | 'checkpoint' | 'acesso' | 'suporte' | 'sistema';

interface LogEntry {
  id: string;
  timestamp: string;
  client: string;
  type: LogType;
  categoria: Categoria;
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
  error: 'Erro',
  info: 'Info',
  warning: 'Alerta',
  sync: 'Andamento',
};

const categoriaInfo: Record<Categoria, { rotulo: string; icone: JSX.Element }> = {
  cliente: { rotulo: 'Cliente', icone: <Building2 size={14} /> },
  evento: { rotulo: 'Evento', icone: <CalendarClock size={14} /> },
  checkpoint: { rotulo: 'Checkpoint', icone: <Cpu size={14} /> },
  acesso: { rotulo: 'Acesso', icone: <KeyRound size={14} /> },
  suporte: { rotulo: 'Suporte', icone: <Headset size={14} /> },
  sistema: { rotulo: 'Sistema', icone: <Terminal size={14} /> },
};

const typeOptions = [
  { value: 'all', label: 'Todos os tipos' },
  { value: 'error', label: 'Erro' },
  { value: 'warning', label: 'Alerta' },
  { value: 'sync', label: 'Andamento' },
  { value: 'info', label: 'Info' },
];

const categoriaOptions = [
  { value: 'all', label: 'Todas as categorias' },
  ...(Object.keys(categoriaInfo) as Categoria[]).map((c) => ({ value: c, label: categoriaInfo[c].rotulo })),
];

const POR_PAGINA = 50;
const ATUALIZA_A_CADA_MS = 60_000;

const dia = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const formatarData = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { data: iso, hora: '' };
  return {
    data: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    hora: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
};

const haQuanto = (iso: string) => {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '';
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'agora há pouco';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 48) return `há ${h} h`;
  return `há ${Math.floor(h / 24)} dias`;
};

// CSV que abre certo no Excel: aspas escapadas, quebras de linha preservadas e BOM para os acentos
const celulaCsv = (valor: string) => `"${String(valor ?? '').replace(/"/g, '""')}"`;

export default function MasterLogs() {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const [filterClient, setFilterClient] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterCategoria, setFilterCategoria] = useState('all');
  const [dataDe, setDataDe] = useState('');
  const [dataAte, setDataAte] = useState('');
  const [maisAntigoPrimeiro, setMaisAntigoPrimeiro] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizadoEm, setAtualizadoEm] = useState<Date | null>(null);
  const [visiveis, setVisiveis] = useState(POR_PAGINA);

  const carregar = useCallback(async () => {
    setAtualizando(true);
    try {
      const logs = await api.getLogs(1000);
      setLogEntries((Array.isArray(logs) ? logs : []).map((log: any) => ({
        id: String(log.id),
        timestamp: log.timestamp || log.created_at || '',
        client: log.cliente || log.client || '—',
        type: (log.type || log.tipo || 'info') as LogType,
        categoria: (log.categoria || 'sistema') as Categoria,
        message: log.message || 'Log registrado',
        details: log.details || '',
      })));
      setErro(null);
      setAtualizadoEm(new Date());
    } catch (error) {
      console.error('Erro ao buscar logs:', error);
      setErro('Não foi possível carregar os logs');
    } finally {
      setLoading(false);
      setAtualizando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
    const intervalo = setInterval(() => { if (!document.hidden) void carregar(); }, ATUALIZA_A_CADA_MS);
    return () => clearInterval(intervalo);
  }, [carregar]);

  const clientOptions = useMemo(() => [
    { value: 'all', label: 'Todos os clientes' },
    ...Array.from(new Set(logEntries.map((log) => log.client).filter((c) => c && c !== '—')))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
      .map((client) => ({ value: client, label: client })),
  ], [logEntries]);

  const filteredLogs = useMemo(() => {
    const busca = search.trim().toLowerCase();
    const lista = logEntries.filter((log) => {
      const matchSearch = !busca || `${log.message} ${log.client} ${log.details}`.toLowerCase().includes(busca);
      const matchClient = filterClient === 'all' || log.client === filterClient;
      const matchType = filterType === 'all' || log.type === filterType;
      const matchCategoria = filterCategoria === 'all' || log.categoria === filterCategoria;
      const dataLog = dia(new Date(log.timestamp));
      const matchDe = !dataDe || dataLog >= dataDe;
      const matchAte = !dataAte || dataLog <= dataAte;
      return matchSearch && matchClient && matchType && matchCategoria && matchDe && matchAte;
    });
    return maisAntigoPrimeiro ? [...lista].reverse() : lista;
  }, [logEntries, search, filterClient, filterType, filterCategoria, dataDe, dataAte, maisAntigoPrimeiro]);

  // Voltar para a primeira página quando os filtros mudam
  useEffect(() => { setVisiveis(POR_PAGINA); }, [search, filterClient, filterType, filterCategoria, dataDe, dataAte, maisAntigoPrimeiro]);

  const contagem = useMemo(() => {
    const ontem = Date.now() - 24 * 60 * 60 * 1000;
    return {
      erros: filteredLogs.filter((l) => l.type === 'error').length,
      alertas: filteredLogs.filter((l) => l.type === 'warning').length,
      ultimas24h: filteredLogs.filter((l) => new Date(l.timestamp).getTime() >= ontem).length,
      eventos: filteredLogs.filter((l) => l.categoria === 'evento').length,
    };
  }, [filteredLogs]);

  const temFiltro = Boolean(search || dataDe || dataAte) || filterClient !== 'all' || filterType !== 'all' || filterCategoria !== 'all';
  const limparFiltros = () => {
    setSearch(''); setFilterClient('all'); setFilterType('all'); setFilterCategoria('all'); setDataDe(''); setDataAte('');
  };

  const handleExport = () => {
    const linhas = [
      ['Data', 'Hora', 'Cliente', 'Categoria', 'Tipo', 'Mensagem', 'Detalhes'].map(celulaCsv).join(';'),
      ...filteredLogs.map((l) => {
        const { data, hora } = formatarData(l.timestamp);
        return [data, hora, l.client, categoriaInfo[l.categoria]?.rotulo ?? l.categoria, typeLabel[l.type] ?? l.type, l.message, l.details]
          .map(celulaCsv).join(';');
      }),
    ];
    const blob = new Blob(['﻿' + linhas.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pulyn-logs-${dia(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const mostrados = filteredLogs.slice(0, visiveis);

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
            description="Histórico do que acontece na plataforma: clientes, eventos, checkpoints, acessos e suporte"
            icon={<ScrollText size={28} />}
            action={
              <div className="flex items-center gap-3">
                {atualizadoEm && (
                  <span className="hidden text-xs text-gray-500 md:inline">
                    Atualizado às {atualizadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                <Button variant="ghost" size="sm" onClick={() => void carregar()} disabled={atualizando} aria-label="Atualizar logs">
                  <RefreshCw size={16} className={`mr-1 ${atualizando ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
                <Button variant="ghost" size="sm" onClick={handleExport} disabled={filteredLogs.length === 0}>
                  <Download size={16} className="mr-1" />
                  Exportar
                </Button>
              </div>
            }
          />

          {erro && <p className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{erro}</p>}

          {/* Resumo do que está filtrado */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <Card className="text-center">
              <ScrollText size={20} className="text-primary mx-auto mb-1" />
              <p className="font-display text-2xl text-primary font-bold">{filteredLogs.length}</p>
              <p className="text-sm text-gray-400">Registros</p>
            </Card>
            <Card className="text-center">
              <Activity size={20} className="text-secondary mx-auto mb-1" />
              <p className="font-display text-2xl text-secondary font-bold">{contagem.ultimas24h}</p>
              <p className="text-sm text-gray-400">Últimas 24 h</p>
            </Card>
            <Card className="text-center">
              <AlertCircle size={20} className={`${contagem.erros ? 'text-danger' : 'text-gray-500'} mx-auto mb-1`} />
              <p className={`font-display text-2xl font-bold ${contagem.erros ? 'text-danger' : 'text-gray-400'}`}>{contagem.erros}</p>
              <p className="text-sm text-gray-400">Erros</p>
            </Card>
            <Card className="text-center">
              <AlertTriangle size={20} className={`${contagem.alertas ? 'text-accent' : 'text-gray-500'} mx-auto mb-1`} />
              <p className={`font-display text-2xl font-bold ${contagem.alertas ? 'text-accent' : 'text-gray-400'}`}>{contagem.alertas}</p>
              <p className="text-sm text-gray-400">Alertas</p>
            </Card>
            <Card className="text-center col-span-2 lg:col-span-1">
              <CalendarClock size={20} className="text-primary mx-auto mb-1" />
              <p className="font-display text-2xl text-primary font-bold">{contagem.eventos}</p>
              <p className="text-sm text-gray-400">Registros de eventos</p>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-400">Filtros</h3>
              </div>
              {temFiltro && (
                <button
                  type="button"
                  onClick={limparFiltros}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-white/15 px-3 text-xs text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <X size={14} /> Limpar filtros
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2">
                <Input
                  label="Buscar"
                  placeholder="Mensagem, cliente ou detalhes..."
                  icon={<Search size={18} />}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <Select label="Cliente" options={clientOptions} value={filterClient} onChange={e => setFilterClient(e.target.value)} />
              <Select label="Categoria" options={categoriaOptions} value={filterCategoria} onChange={e => setFilterCategoria(e.target.value)} />
              <Select label="Tipo" options={typeOptions} value={filterType} onChange={e => setFilterType(e.target.value)} />
              <Input label="De" type="date" value={dataDe} max={dataAte || undefined} onChange={e => setDataDe(e.target.value)} />
              <Input label="Até" type="date" value={dataAte} min={dataDe || undefined} onChange={e => setDataAte(e.target.value)} />
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
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-gray-400">
                      <th className="text-left py-3 px-4 font-semibold w-44">
                        <button
                          type="button"
                          onClick={() => setMaisAntigoPrimeiro((v) => !v)}
                          className="inline-flex items-center gap-1 hover:text-white transition-colors"
                          title="Inverter a ordem"
                        >
                          Data e hora
                          <ChevronDown size={14} className={`transition-transform ${maisAntigoPrimeiro ? 'rotate-180' : ''}`} />
                        </button>
                      </th>
                      <th className="text-left py-3 px-4 font-semibold">Cliente</th>
                      <th className="text-left py-3 px-4 font-semibold w-36">Categoria</th>
                      <th className="text-left py-3 px-4 font-semibold w-28">Tipo</th>
                      <th className="text-left py-3 px-4 font-semibold">Mensagem</th>
                      <th className="text-right py-3 px-4 font-semibold w-16">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mostrados.map(log => {
                      const { data, hora } = formatarData(log.timestamp);
                      const aberto = expandedLog === log.id;
                      const cat = categoriaInfo[log.categoria] ?? categoriaInfo.sistema;
                      return (
                        <Fragment key={log.id}>
                          <tr
                            className="border-b border-border/50 hover:bg-surface/30 transition-colors cursor-pointer"
                            onClick={() => setExpandedLog(aberto ? null : log.id)}
                          >
                            <td className="py-3 px-4">
                              <p className="font-mono text-xs text-gray-300">{data} {hora}</p>
                              <p className="text-[11px] text-gray-500">{haQuanto(log.timestamp)}</p>
                            </td>
                            <td className="py-3 px-4 text-gray-300">{log.client}</td>
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center gap-1.5 text-gray-300">{cat.icone} {cat.rotulo}</span>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant={typeBadgeVariant[log.type] ?? 'primary'}>{typeLabel[log.type] ?? log.type}</Badge>
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
                                className={`text-gray-500 inline-block transition-transform ${aberto ? 'rotate-180' : ''}`}
                              />
                            </td>
                          </tr>
                          {aberto && (
                            <tr>
                              <td colSpan={6} className="px-4 py-3 bg-surface/30">
                                <div className="pl-4 border-l-2 border-primary/30">
                                  <p className="text-xs text-gray-400 mb-1">Detalhes:</p>
                                  <p className="text-sm text-gray-300 font-mono whitespace-pre-line">{log.details || 'Sem detalhes adicionais'}</p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                    {filteredLogs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-500">
                          {temFiltro ? 'Nenhum log com esses filtros' : 'Nenhum log encontrado'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-gray-500">
                Mostrando {Math.min(visiveis, filteredLogs.length)} de {filteredLogs.length} registros
              </span>
              <div className="flex items-center gap-3">
                {visiveis < filteredLogs.length && (
                  <Button variant="secondary" size="sm" onClick={() => setVisiveis((v) => v + POR_PAGINA)}>
                    Mostrar mais {Math.min(POR_PAGINA, filteredLogs.length - visiveis)}
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={handleExport} disabled={filteredLogs.length === 0}>
                  <Download size={14} className="mr-1" />
                  Exportar CSV
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
