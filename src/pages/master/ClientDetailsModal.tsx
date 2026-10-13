import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Building2,
  Calendar,
  Loader2,
  ShieldBan,
  ShieldCheck,
  AlertCircle,
  Users,
  Baby,
  CalendarDays,
  LifeBuoy,
} from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import { planoBadge } from '../../utils/planos';
import type { PlanoId } from '../../utils/planos';
import Button from '../../components/ui/Button';
import ProgressBar from '../../components/ui/ProgressBar';
import { api } from '../../services/api';
import { maskCnpj } from '../../utils/cnpj';

// Dados que a lista de clientes já tem (mostrados na hora, enquanto os detalhes carregam)
export interface ClientSummary {
  id: string;
  name: string;
  city: string;
  state: string;
  plan: PlanoId;
  status: 'active' | 'blocked' | 'trial';
  eventsDone: number;
  lastAccess: string;
  email: string;
  phone: string;
  createdAt: string;
}

interface ClientEventRow {
  id: string;
  name: string;
  date: string | null;
  time: string | null;
  duration: number | null;
  status: string;
  responsibleName: string | null;
  childrenCount: number;
  checkpointsCount: number;
}

interface ClientUserRow {
  id: string;
  email: string;
  role: string;
  status: string;
  lastAccess: string | null;
}

interface ClientDetails {
  id: string;
  origin: 'empresa' | 'cliente';
  cnpj: string | null;
  lastAccess: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  planInfo: {
    id: string;
    name: string;
    price: number;
    checkpointLimit: number;
    eventsPerMonth: number;
    features: string[];
  } | null;
  usage: {
    eventsTotal: number;
    eventsActive: number;
    eventsScheduled: number;
    eventsFinished: number;
    eventsThisMonth: number;
    childrenTotal: number;
    maxCheckpointsPerEvent: number;
    usersTotal: number;
  };
  users: ClientUserRow[];
  events: ClientEventRow[];
  support: { open: number; total: number };
}

const statusBadgeVariant: Record<string, 'success' | 'danger' | 'accent'> = {
  active: 'success',
  blocked: 'danger',
  trial: 'accent',
};
const statusLabel: Record<string, string> = { active: 'Ativo', blocked: 'Bloqueado', trial: 'Trial' };

const eventStatus = (status: string): { label: string; variant: 'success' | 'accent' | 'muted' } => {
  if (status === 'active' || status === 'ongoing') return { label: 'Em andamento', variant: 'success' };
  if (status === 'scheduled') return { label: 'Agendado', variant: 'accent' };
  if (status === 'finished' || status === 'completed') return { label: 'Encerrado', variant: 'muted' };
  return { label: status || '—', variant: 'muted' };
};

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  reception: 'Recepção',
  game_master: 'Game Master',
  kiosk: 'Totem',
  score_kiosk: 'Placar',
  master: 'Master',
};

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const formatDateTime = (iso: string | null | undefined) => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

const formatDay = (iso: string | null | undefined) => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('pt-BR');
};

// A data do evento vem como AAAA-MM-DD (sem fuso): formata pelo texto para não deslocar o dia.
const formatEventDay = (value: string | null) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '—';
};

const usageColor = (used: number, limit: number) => {
  if (limit <= 0) return '#1E9BD7';
  const ratio = used / limit;
  if (ratio >= 1) return '#EF4444';
  if (ratio >= 0.8) return '#F59E0B';
  return '#1E9BD7';
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <div className="text-sm text-white break-words">{children}</div>
    </div>
  );
}

const Empty = () => <span className="text-gray-500">—</span>;

function StatTile({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
        {icon}
        {label}
      </div>
      <p className="font-display text-2xl text-white leading-tight">{value}</p>
      {hint && <p className="text-[11px] text-gray-500 mt-0.5">{hint}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">{children}</h4>;
}

export default function ClientDetailsModal({
  client,
  onClose,
  onToggleStatus,
}: {
  client: ClientSummary | null;
  onClose: () => void;
  onToggleStatus: (clientId: string) => void;
}) {
  const [details, setDetails] = useState<ClientDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientId = client?.id ?? null;

  // Só a resposta da última chamada vale (ao trocar de cliente rápido, a antiga é descartada).
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    const request = ++requestRef.current;
    if (!clientId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getClienteDetalhes(clientId);
      if (request === requestRef.current) setDetails(data);
    } catch (err) {
      if (request === requestRef.current) setError(err instanceof Error ? err.message : 'Não foi possível carregar os detalhes');
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    // Ao abrir outro cliente, não mostra os números do anterior
    setDetails(null);
    setError(null);
    if (clientId) load();
    return () => { requestRef.current += 1; };
  }, [clientId, load]);

  const plan = details?.planInfo || null;
  const usage = details?.usage;
  const isLegacy = details?.origin === 'cliente';
  const eventsLimit = plan?.eventsPerMonth ?? 0;
  const checkpointLimit = plan?.checkpointLimit ?? 0;

  return (
    <Modal
      isOpen={!!client}
      onClose={onClose}
      title="Detalhes do Cliente"
      size="xl"
      className="max-h-[90vh] overflow-y-auto"
    >
      {client && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
              <Building2 size={24} className="text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-xl text-white break-words">{client.name}</h3>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <Badge variant={statusBadgeVariant[client.status]}>{statusLabel[client.status]}</Badge>
                <Badge variant={planoBadge(client.plan)}>{plan?.name || client.plan}</Badge>
                {isLegacy && <Badge variant="muted">Cadastro legado</Badge>}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                variant={client.status === 'blocked' ? 'primary' : 'danger'}
                size="sm"
                onClick={() => onToggleStatus(client.id)}
              >
                {client.status === 'blocked' ? (
                  <><ShieldCheck size={14} className="mr-1" /> Ativar</>
                ) : (
                  <><ShieldBan size={14} className="mr-1" /> Bloquear</>
                )}
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>Fechar</Button>
            </div>
          </div>

          <section>
            <SectionTitle>Dados cadastrais</SectionTitle>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label="Cidade">{client.city ? `${client.city}${client.state ? ` - ${client.state.toUpperCase()}` : ''}` : <Empty />}</Field>
              <Field label="E-mail (login)">{client.email || <Empty />}</Field>
              <Field label="Telefone">{client.phone || <Empty />}</Field>
              <Field label="CNPJ">
                {details ? (details.cnpj ? maskCnpj(details.cnpj) : <Empty />) : <span className="text-gray-500">{loading ? 'carregando…' : '—'}</span>}
              </Field>
              <Field label="Cliente desde">
                <span className="inline-flex items-center gap-1">
                  <Calendar size={14} className="text-gray-500" />
                  {client.createdAt}
                </span>
              </Field>
              <Field label="Último acesso">{client.lastAccess}</Field>
              {details?.updatedAt && <Field label="Cadastro atualizado em">{formatDay(details.updatedAt) || <Empty />}</Field>}
            </div>
          </section>

          {loading && !details && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-400">
              <Loader2 size={18} className="animate-spin text-primary" />
              Carregando informações completas…
            </div>
          )}

          {error && !details && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              <span className="flex items-center gap-2"><AlertCircle size={16} /> {error}</span>
              <Button variant="ghost" size="sm" onClick={load}>Tentar novamente</Button>
            </div>
          )}

          {details && usage && (
            <>
              <section>
                <SectionTitle>Plano e uso</SectionTitle>
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 space-y-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-white font-display text-lg">
                      {plan ? plan.name : client.plan}
                      {plan && <span className="ml-2 text-sm text-gray-400 font-body">{currency.format(plan.price)} / mês</span>}
                    </p>
                    {plan && <p className="text-xs text-gray-500">{plan.features.join(' · ')}</p>}
                  </div>
                  {plan && (
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Eventos neste mês</span>
                          <span className="text-white">{usage.eventsThisMonth} de {eventsLimit < 0 ? 'ilimitados' : eventsLimit}</span>
                        </div>
                        <ProgressBar value={eventsLimit < 0 ? 0 : (usage.eventsThisMonth / Math.max(eventsLimit, 1)) * 100} color={usageColor(usage.eventsThisMonth, eventsLimit)} />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Checkpoints no maior evento</span>
                          <span className="text-white">{usage.maxCheckpointsPerEvent} de {checkpointLimit < 0 ? 'ilimitados' : checkpointLimit}</span>
                        </div>
                        <ProgressBar value={checkpointLimit < 0 ? 0 : (usage.maxCheckpointsPerEvent / Math.max(checkpointLimit, 1)) * 100} color={usageColor(usage.maxCheckpointsPerEvent, checkpointLimit)} />
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section>
                <SectionTitle>Resumo</SectionTitle>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatTile
                    icon={<CalendarDays size={13} />}
                    label="Eventos"
                    value={usage.eventsTotal}
                    hint={`${usage.eventsActive} em andamento · ${usage.eventsScheduled} agendados · ${usage.eventsFinished} encerrados`}
                  />
                  <StatTile icon={<Baby size={13} />} label="Crianças cadastradas" value={usage.childrenTotal} />
                  <StatTile icon={<Users size={13} />} label="Usuários de acesso" value={usage.usersTotal} />
                  <StatTile
                    icon={<LifeBuoy size={13} />}
                    label="Chamados de suporte"
                    value={details.support.open}
                    hint={`em aberto · ${details.support.total} no total`}
                  />
                </div>
              </section>

              <section>
                <SectionTitle>Usuários de acesso ({details.users.length})</SectionTitle>
                {details.users.length === 0 ? (
                  <p className="text-sm text-gray-500">{isLegacy ? 'Cadastro legado, sem empresa e sem usuários vinculados.' : 'Nenhum usuário cadastrado.'}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-gray-400 text-xs">
                          <th className="text-left py-2 pr-3 font-semibold">E-mail</th>
                          <th className="text-left py-2 pr-3 font-semibold">Perfil</th>
                          <th className="text-left py-2 pr-3 font-semibold">Situação</th>
                          <th className="text-left py-2 font-semibold">Último acesso</th>
                        </tr>
                      </thead>
                      <tbody>
                        {details.users.map((user) => (
                          <tr key={user.id} className="border-b border-border/50">
                            <td className="py-2 pr-3 text-white">{user.email}</td>
                            <td className="py-2 pr-3 text-gray-300">{roleLabels[user.role] || user.role}</td>
                            <td className="py-2 pr-3">
                              <Badge variant={user.status === 'active' ? 'success' : 'muted'}>{user.status === 'active' ? 'Ativo' : user.status}</Badge>
                            </td>
                            <td className="py-2 text-gray-400 text-xs">{formatDateTime(user.lastAccess) || 'Nunca acessou'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section>
                <SectionTitle>Eventos ({details.events.length})</SectionTitle>
                {details.events.length === 0 ? (
                  <p className="text-sm text-gray-500">Nenhum evento criado por este cliente.</p>
                ) : (
                  <div className="overflow-x-auto max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-dark-card">
                        <tr className="border-b border-border text-gray-400 text-xs">
                          <th className="text-left py-2 pr-3 font-semibold">Evento</th>
                          <th className="text-left py-2 pr-3 font-semibold">Data</th>
                          <th className="text-left py-2 pr-3 font-semibold">Situação</th>
                          <th className="text-left py-2 pr-3 font-semibold">Contratante</th>
                          <th className="text-right py-2 pr-3 font-semibold">Crianças</th>
                          <th className="text-right py-2 font-semibold">Checkpoints</th>
                        </tr>
                      </thead>
                      <tbody>
                        {details.events.map((event) => {
                          const status = eventStatus(event.status);
                          return (
                            <tr key={event.id} className="border-b border-border/50">
                              <td className="py-2 pr-3 text-white font-medium">{event.name}</td>
                              <td className="py-2 pr-3 text-gray-300 whitespace-nowrap">
                                {formatEventDay(event.date)}{event.time ? ` às ${event.time}` : ''}
                              </td>
                              <td className="py-2 pr-3"><Badge variant={status.variant}>{status.label}</Badge></td>
                              <td className="py-2 pr-3 text-gray-300">{event.responsibleName || <Empty />}</td>
                              <td className="py-2 pr-3 text-right font-mono text-gray-300">{event.childrenCount}</td>
                              <td className="py-2 text-right font-mono text-gray-300">{event.checkpointsCount}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
