import { useState, useEffect, useMemo, useCallback } from 'react';
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
  Cpu,
  MapPin,
  Zap,
  ArrowLeft,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import Sidebar from '../../components/layout/Sidebar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import StatusDot from '../../components/ui/StatusDot';

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

interface AlertaMonitoramento {
  id: string;
  tipo: 'checkpoint_offline' | 'evento_sem_checkpoint' | 'cliente_inativo';
  gravidade: 'alta' | 'media';
  mensagem: string;
  detalhe: string;
  checkpointId: string | null;
}

interface CheckpointMonitorado {
  id: string;
  numero: string | null;
  name: string;
  status: 'online' | 'offline';
  lastSeen: string | null;
  semSinal: string | null;
  ip: string | null;
  zone: string | null;
  reception: boolean;
  eventoNome: string | null;
  eventoAtivo: boolean;
}

type Situacao = 'online' | 'parcial' | 'offline' | 'sem_checkpoints';

interface Unidade {
  id: string;
  name: string;
  cidade: string | null;
  estado: string | null;
  situacao: Situacao;
  checkpointsActive: number;
  checkpointsTotal: number;
  lastEvent: string;
  alerts: AlertaMonitoramento[];
  pontoVerificacao: CheckpointMonitorado[];
}

const SITUACAO: Record<Situacao, { rotulo: string; variante: 'success' | 'warning' | 'danger' | 'muted'; cor: string }> = {
  online: { rotulo: 'Tudo online', variante: 'success', cor: 'text-success' },
  parcial: { rotulo: 'Parcial', variante: 'warning', cor: 'text-accent' },
  offline: { rotulo: 'Sem sinal', variante: 'danger', cor: 'text-danger' },
  sem_checkpoints: { rotulo: 'Sem checkpoints', variante: 'muted', cor: 'text-gray-400' },
};

const TODOS = '';
const ATUALIZA_A_CADA_MS = 30_000;

const SELECT_CLASSES =
  'w-full min-h-[48px] px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white font-body text-base cursor-pointer';

const quantosAlertas = (n: number) => `${n} ${n === 1 ? 'alerta' : 'alertas'}`;

const formatarVisto = (visto: string | null) =>
  visto ? new Date(visto).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'nunca';

export default function MasterMonitoring() {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [units, setUnits] = useState<Unidade[]>([]);
  const [selecionado, setSelecionado] = useState<string>(TODOS);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setUnits(await api.getMonitoringUnits());
      setErro(null);
    } catch (error) {
      console.error('Erro ao buscar dados de monitoramento:', error);
      setErro('Não foi possível carregar o monitoramento');
    } finally {
      setLoading(false);
    }
  }, []);

  // Os sinais das placas mudam o tempo todo: atualiza na hora (tempo real), sem piscar a tela
  useEffect(() => { void carregar(); }, [carregar]);
  useAutoRefresh(carregar, { topicos: ['checkpoints', 'eventos', 'clientes'], intervaloMs: ATUALIZA_A_CADA_MS });

  // Quem tem mais alertas aparece primeiro na escolha e na lista
  const ordenadas = useMemo(
    () => [...units].sort((a, b) => b.alerts.length - a.alerts.length || a.name.localeCompare(b.name, 'pt-BR')),
    [units],
  );
  const unidade = useMemo(() => units.find((u) => u.id === selecionado) ?? null, [units, selecionado]);
  // Se o cliente escolhido sumiu (excluído), volta para "todos"
  useEffect(() => {
    if (selecionado !== TODOS && !loading && !unidade) setSelecionado(TODOS);
  }, [selecionado, unidade, loading]);

  const escopo = unidade ? [unidade] : units;
  const cpsOnline = escopo.reduce((n, u) => n + u.checkpointsActive, 0);
  const cpsTotal = escopo.reduce((n, u) => n + u.checkpointsTotal, 0);
  const alertas = escopo.flatMap((u) => u.alerts.map((a) => ({ ...a, unidade: u })));
  const alertasAltos = alertas.filter((a) => a.gravidade === 'alta').length;
  const clientesComAlerta = units.filter((u) => u.alerts.length > 0).length;
  const totalTodosAlertas = units.reduce((n, u) => n + u.alerts.length, 0);

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
            description="Situação dos checkpoints de cada cliente, pelo último sinal das placas (atualiza sozinho a cada 30 s)"
            icon={<Activity size={28} />}
            action={
              <div className="flex items-center gap-3">
                <Badge variant="success">{cpsOnline} online</Badge>
                {cpsTotal - cpsOnline > 0 && <Badge variant="danger">{cpsTotal - cpsOnline} offline</Badge>}
                {alertas.length > 0 && <Badge variant="accent">{quantosAlertas(alertas.length)}</Badge>}
              </div>
            }
          />

          {erro && <p className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{erro}</p>}

          {/* Escolha do cliente: cada opção mostra quantos alertas ele tem */}
          <Card className="mb-6">
            <div className="flex flex-wrap items-end gap-4">
              <div className="min-w-[18rem] flex-1">
                <label htmlFor="mon-cliente" className="mb-1.5 block text-sm font-medium text-gray-300">Cliente / buffet</label>
                <select
                  id="mon-cliente"
                  value={selecionado}
                  onChange={(e) => setSelecionado(e.target.value)}
                  className={SELECT_CLASSES}
                  disabled={loading}
                >
                  <option value={TODOS} style={{ backgroundColor: '#1a1a2e', color: '#fff' }}>
                    Todos os clientes ({units.length}) — {quantosAlertas(totalTodosAlertas)}
                  </option>
                  {ordenadas.map((u) => (
                    <option key={u.id} value={u.id} style={{ backgroundColor: '#1a1a2e', color: '#fff' }}>
                      {u.name} — {quantosAlertas(u.alerts.length)}
                    </option>
                  ))}
                </select>
              </div>
              {unidade && (
                <div className="flex flex-wrap items-center gap-3 pb-1.5">
                  <Badge variant={SITUACAO[unidade.situacao].variante}>{SITUACAO[unidade.situacao].rotulo}</Badge>
                  <button
                    type="button"
                    onClick={() => setSelecionado(TODOS)}
                    className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-white/15 px-3 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    <ArrowLeft size={16} /> Ver todos os clientes
                  </button>
                </div>
              )}
            </div>
            {!unidade && clientesComAlerta > 0 && (
              <p className="mt-3 text-xs text-gray-400">
                {clientesComAlerta} de {units.length} clientes com alerta. Quem tem mais alertas aparece primeiro.
              </p>
            )}
          </Card>

          {/* KPIs do que está sendo visto (um cliente ou todos) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="text-center">
              <Wifi size={20} className="text-success mx-auto mb-1" />
              <p className="font-display text-2xl text-success font-bold">{cpsOnline}</p>
              <p className="text-sm text-gray-400">Checkpoints online</p>
              <p className="text-xs text-gray-500">de {cpsTotal}</p>
            </Card>
            <Card className="text-center">
              <WifiOff size={20} className={`${cpsTotal - cpsOnline > 0 ? 'text-danger' : 'text-gray-500'} mx-auto mb-1`} />
              <p className={`font-display text-2xl font-bold ${cpsTotal - cpsOnline > 0 ? 'text-danger' : 'text-gray-400'}`}>{cpsTotal - cpsOnline}</p>
              <p className="text-sm text-gray-400">Checkpoints offline</p>
            </Card>
            <Card className="text-center">
              <AlertTriangle size={20} className={`${alertas.length > 0 ? 'text-accent' : 'text-gray-500'} mx-auto mb-1`} />
              <p className={`font-display text-2xl font-bold ${alertas.length > 0 ? 'text-accent' : 'text-gray-400'}`}>{alertas.length}</p>
              <p className="text-sm text-gray-400">Alertas ativos</p>
              {alertasAltos > 0 && <p className="text-xs text-danger">{alertasAltos} de gravidade alta</p>}
            </Card>
            {unidade ? (
              <Card className="text-center">
                <Server size={20} className={`${SITUACAO[unidade.situacao].cor} mx-auto mb-1`} />
                <p className={`font-display text-2xl font-bold ${SITUACAO[unidade.situacao].cor}`}>{SITUACAO[unidade.situacao].rotulo}</p>
                <p className="text-sm text-gray-400">Situação do cliente</p>
              </Card>
            ) : (
              <Card className="text-center">
                <Users size={20} className="text-primary mx-auto mb-1" />
                <p className="font-display text-2xl text-primary font-bold">{clientesComAlerta}</p>
                <p className="text-sm text-gray-400">Clientes com alerta</p>
                <p className="text-xs text-gray-500">de {units.length}</p>
              </Card>
            )}
          </div>

          {/* Alertas reais: cada um vem do estado atual dos checkpoints, eventos e do cliente */}
          <Card variant="glow" className={`mb-6 ${alertas.length > 0 ? 'border-danger/30' : ''}`}>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={20} className={alertas.length > 0 ? 'text-danger' : 'text-success'} />
              <h3 className="font-display text-lg text-white">Alertas Ativos{unidade ? ` — ${unidade.name}` : ''}</h3>
              <Badge variant={alertas.length > 0 ? 'danger' : 'success'}>{alertas.length}</Badge>
            </div>
            {loading ? (
              <p className="py-4 text-center text-sm text-gray-500">Carregando monitoramento...</p>
            ) : alertas.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">Nenhum alerta no momento{unidade ? ' para este cliente' : ''}.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {alertas.map((alerta) => (
                  <div
                    key={`${alerta.unidade.id}-${alerta.id}`}
                    role={unidade ? undefined : 'button'}
                    tabIndex={unidade ? undefined : 0}
                    title={unidade ? undefined : `Ver ${alerta.unidade.name}`}
                    onClick={() => { if (!unidade) setSelecionado(alerta.unidade.id); }}
                    onKeyDown={(e) => { if (!unidade && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setSelecionado(alerta.unidade.id); } }}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      alerta.gravidade === 'alta' ? 'bg-danger/10 border-danger/30' : 'bg-accent/5 border-accent/25'
                    } ${unidade ? '' : 'cursor-pointer hover:bg-white/[0.04]'}`}
                  >
                    <StatusDot status={alerta.gravidade === 'alta' ? 'offline' : 'warning'} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${alerta.gravidade === 'alta' ? 'text-danger' : 'text-accent'}`}>{alerta.mensagem}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{alerta.detalhe}</p>
                      {!unidade && <p className="text-xs text-gray-500 mt-0.5">{alerta.unidade.name}</p>}
                    </div>
                    {alerta.gravidade === 'alta' && <Badge variant="danger">alta</Badge>}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Todos os clientes: cartões; um cliente: os checkpoints dele */}
          {!unidade ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {ordenadas.map((u) => (
                <Card key={u.id} onClick={() => setSelecionado(u.id)} className={u.alerts.length > 0 ? 'border-danger/30' : ''}>
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <span className="font-semibold text-white text-sm truncate">{u.name}</span>
                    <Badge variant={SITUACAO[u.situacao].variante}>{SITUACAO[u.situacao].rotulo}</Badge>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {(u.cidade || u.estado) && (
                      <div className="flex items-center gap-1.5 text-gray-400">
                        <MapPin size={12} className="text-gray-500" /> {[u.cidade, u.estado].filter(Boolean).join(' - ')}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Server size={12} className="text-gray-500" />
                      <span className="text-gray-400">Checkpoints online:</span>
                      <span className="text-white font-mono">{u.checkpointsActive}/{u.checkpointsTotal}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Zap size={12} className="text-gray-500" />
                      <span className="text-gray-400">Último evento:</span>
                      <span className="text-gray-300 truncate">{u.lastEvent}</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-border flex items-center gap-1.5">
                    <AlertTriangle size={12} className={u.alerts.length > 0 ? 'text-danger' : 'text-gray-600'} />
                    <span className={`text-xs ${u.alerts.length > 0 ? 'text-danger' : 'text-gray-500'}`}>{quantosAlertas(u.alerts.length)}</span>
                  </div>
                </Card>
              ))}
              {!loading && units.length === 0 && <p className="col-span-full py-8 text-center text-gray-500">Nenhum cliente cadastrado.</p>}
            </div>
          ) : (
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h3 className="font-display text-lg text-white">Checkpoints de {unidade.name}</h3>
                <p className="text-xs text-gray-400">
                  {[unidade.cidade, unidade.estado].filter(Boolean).join(' - ')}{(unidade.cidade || unidade.estado) ? ' · ' : ''}Último evento: {unidade.lastEvent}
                </p>
              </div>
              {unidade.pontoVerificacao.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">Este cliente ainda não tem checkpoints aceitos.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {unidade.pontoVerificacao.map((cp) => (
                    <div key={cp.id} className={`rounded-lg border p-3 ${cp.status === 'online' ? 'border-border bg-surface/30' : 'border-danger/30 bg-danger/5'}`}>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <StatusDot status={cp.status} size="sm" />
                          <span className="text-sm font-semibold text-white truncate">{cp.name}</span>
                        </div>
                        <Badge variant={cp.status === 'online' ? 'success' : 'danger'}>{cp.status === 'online' ? 'Online' : 'Offline'}</Badge>
                      </div>
                      <div className="space-y-1 text-xs text-gray-400">
                        <p>Nº <span className="font-mono text-gray-200">{cp.numero ?? '—'}</span>{cp.reception ? ' · recepção' : ''}{cp.zone ? ` · ${cp.zone}` : ''}</p>
                        <p className="flex items-center gap-1.5">
                          <Clock size={12} className="text-gray-500" />
                          {cp.status === 'online' ? `Último sinal: ${formatarVisto(cp.lastSeen)}` : <span className="text-danger">{cp.semSinal} ({formatarVisto(cp.lastSeen)})</span>}
                        </p>
                        {cp.ip && <p>IP <span className="font-mono text-gray-200">{cp.ip}</span></p>}
                        {cp.eventoNome && <p>Evento: <span className="text-gray-200">{cp.eventoNome}</span>{cp.eventoAtivo ? ' (em andamento)' : ''}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
