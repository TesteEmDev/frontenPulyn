import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link2, Search, RefreshCw, Unlink, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import ReceptionSidebar from '../../components/layout/ReceptionSidebar';
import ReceptionTopBar from '../../components/layout/ReceptionTopBar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import Avatar from '../../components/ui/Avatar';

type LinkStatus = 'approved' | 'pending' | 'inactive' | 'rejected';

interface FamilyLink {
  link_id: string;
  link_status: LinkStatus;
  relationship: string;
  requested_at: string;
  approved_at: string | null;
  loginId: string;
  email: string;
  nomeFamilia: string | null;
  crianca_id: string;
  crianca_name: string;
  nickname: string | null;
  age: number | null;
  avatar: string | null;
  bracelet_code: string | null;
  eventoId: string;
  evento_name: string;
  time_name: string | null;
  time_color: string | null;
}

interface ChildGroup {
  id: string;
  name: string;
  nickname: string;
  age: number | null;
  avatar: string | null;
  braceletCode: string | null;
  eventName: string;
  teamName: string | null;
  teamColor: string | null;
  links: FamilyLink[];
}

const STATUS_LABEL: Record<LinkStatus, { label: string; variant: 'success' | 'warning' | 'muted' | 'danger' }> = {
  approved: { label: 'Vinculado', variant: 'success' },
  pending: { label: 'Pendente (antigo)', variant: 'warning' },
  inactive: { label: 'Desvinculado', variant: 'muted' },
  rejected: { label: 'Rejeitado', variant: 'danger' },
};

// Filtros da tela: "Ativos" é o que importa no dia a dia (vinculados).
const STATUS_FILTERS = [
  { value: 'active', label: 'Ativos' },
  { value: 'approved', label: 'Somente vinculados' },
  { value: 'inactive', label: 'Desvinculados' },
  { value: 'rejected', label: 'Rejeitados' },
  { value: 'all', label: 'Todos' },
];

const matchesStatus = (status: LinkStatus, filter: string) => {
  if (filter === 'all') return true;
  if (filter === 'active') return status === 'approved' || status === 'pending';
  return status === filter;
};

const formatDate = (value: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('pt-BR');
};

const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function ReceptionFamilyLinks() {
  const [events, setEvents] = useState<Array<{ eventoId: string; nome: string; status?: string }>>([]);
  const [eventId, setEventId] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [search, setSearch] = useState('');
  const [links, setLinks] = useState<FamilyLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [toUnlink, setToUnlink] = useState<FamilyLink | null>(null);
  const [unlinking, setUnlinking] = useState(false);
  const [unlinkError, setUnlinkError] = useState('');

  const loadLinks = useCallback(async (selectedEventId: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getFamilyLinks(selectedEventId || undefined);
      setLinks(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar as vinculações.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Começa no evento ativo (se houver); senão, mostra todos os eventos.
  useEffect(() => {
    let active = true;
    (async () => {
      let initialEventId = '';
      try {
        const eventData = await api.getEventos();
        if (!active) return;
        const list = Array.isArray(eventData) ? eventData : [];
        setEvents(list);
        initialEventId = list.find((item: any) => item.status === 'active' || item.status === 'ongoing')?.eventoId || '';
        setEventId(initialEventId);
      } catch (err) {
        console.error('Erro ao carregar eventos:', err);
      }
      if (active) await loadLinks(initialEventId);
    })();
    return () => { active = false; };
  }, [loadLinks]);

  const changeEvent = (value: string) => {
    setEventId(value);
    setNotice('');
    loadLinks(value);
  };

  const groups = useMemo<ChildGroup[]>(() => {
    const query = normalize(search.trim());
    const byChild = new Map<string, ChildGroup>();
    for (const link of links) {
      if (!matchesStatus(link.link_status, statusFilter)) continue;
      if (query) {
        const haystack = normalize([link.crianca_name, link.nickname, link.bracelet_code, link.email, link.nomeFamilia].filter(Boolean).join(' '));
        if (!haystack.includes(query)) continue;
      }
      const group = byChild.get(link.crianca_id) || {
        id: link.crianca_id,
        name: link.crianca_name,
        nickname: link.nickname || '',
        age: link.age,
        avatar: link.avatar,
        braceletCode: link.bracelet_code,
        eventName: link.evento_name,
        teamName: link.time_name,
        teamColor: link.time_color,
        links: [],
      };
      group.links.push(link);
      byChild.set(link.crianca_id, group);
    }
    return [...byChild.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [links, search, statusFilter]);

  const totals = useMemo(() => ({
    children: new Set(links.filter(l => l.link_status === 'approved').map(l => l.crianca_id)).size,
    approved: links.filter(l => l.link_status === 'approved').length,
  }), [links]);

  const confirmUnlink = async () => {
    if (!toUnlink) return;
    setUnlinking(true);
    setUnlinkError('');
    try {
      await api.unlinkFamilyLink(toUnlink.link_id);
      setNotice(`${toUnlink.nomeFamilia || toUnlink.email} foi desvinculado(a) de ${toUnlink.nickname || toUnlink.crianca_name}.`);
      setToUnlink(null);
      await loadLinks(eventId);
    } catch (err) {
      setUnlinkError(err instanceof Error ? err.message : 'Não foi possível desvincular.');
    } finally {
      setUnlinking(false);
    }
  };

  const eventOptions = [{ value: '', label: 'Todos os eventos' }, ...events.map(event => ({ value: event.eventoId, label: event.nome }))];

  return (
    <div className="flex h-screen bg-dark text-white overflow-hidden">
      <ReceptionSidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <ReceptionTopBar subtitle="Responsáveis vinculados às crianças" />

        <main className="flex-1 space-y-6 overflow-y-auto p-6">
          <PageHeader
            title="Vinculações"
            description="Veja quem é responsável por cada criança e desfaça um vínculo quando precisar"
            icon={<Link2 size={24} />}
            action={
              <Button variant="ghost" onClick={() => loadLinks(eventId)} disabled={loading}>
                {loading ? <Loader2 size={16} className="mr-1.5 animate-spin" /> : <RefreshCw size={16} className="mr-1.5" />}
                Atualizar
              </Button>
            }
          />

          {error && (
            <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>
          )}
          {notice && (
            <p role="status" className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">{notice}</p>
          )}

          <Card>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Select label="Evento" options={eventOptions} value={eventId} onChange={e => changeEvent(e.target.value)} />
              <Select label="Situação" options={STATUS_FILTERS} value={statusFilter} onChange={e => setStatusFilter(e.target.value)} />
              <Input
                label="Buscar"
                placeholder="Criança, responsável, e-mail ou pulseira"
                icon={<Search size={16} />}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <p className="mt-3 text-xs text-gray-500">
              {totals.children} criança{totals.children !== 1 ? 's' : ''} com responsável · {totals.approved} vínculo{totals.approved !== 1 ? 's' : ''}
              
            </p>
          </Card>

          {loading && links.length === 0 ? (
            <Card><p className="py-10 text-center text-gray-400">Carregando vinculações...</p></Card>
          ) : groups.length === 0 ? (
            <Card>
              <p className="py-10 text-center text-sm text-gray-500">
                {links.length === 0
                  ? 'Nenhum responsável vinculado ainda. Os vínculos aparecem aqui depois que a família lê o QR code da criança.'
                  : 'Nenhuma vinculação encontrada com esses filtros.'}
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {groups.map(group => (
                <Card key={group.id}>
                  <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] pb-3">
                    <Avatar emoji={group.avatar || '👤'} size="md" />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-display text-lg text-white">
                        {group.nickname && group.nickname !== group.name ? `${group.nickname} · ${group.name}` : group.name}
                      </h3>
                      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                        {group.age !== null && <span>{group.age} anos</span>}
                        {group.teamName && (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: group.teamColor || '#6B7280' }} aria-hidden="true" />
                            {group.teamName}
                          </span>
                        )}
                        {!eventId && <span>{group.eventName}</span>}
                        {group.braceletCode && <span className="font-mono">Pulseira {group.braceletCode}</span>}
                      </p>
                    </div>
                  </div>

                  <ul className="divide-y divide-white/[0.06]">
                    {group.links.map(link => {
                      const status = STATUS_LABEL[link.link_status];
                      const canUnlink = link.link_status === 'approved' || link.link_status === 'pending';
                      return (
                        <li key={link.link_id} className="flex flex-wrap items-center gap-3 py-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-white">{link.nomeFamilia || link.email}</p>
                            <p className="truncate text-xs text-gray-500">
                              {link.nomeFamilia ? `${link.email} · ` : ''}{link.relationship}
                              {formatDate(link.approved_at || link.requested_at) ? ` · desde ${formatDate(link.approved_at || link.requested_at)}` : ''}
                            </p>
                          </div>
                          <Badge variant={status.variant}>{status.label}</Badge>
                          {canUnlink && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setUnlinkError(''); setToUnlink(link); }}
                              aria-label={`Desvincular ${link.nomeFamilia || link.email} de ${group.nickname || group.name}`}
                            >
                              <Unlink size={15} className="mr-1.5" />
                              Desvincular
                            </Button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>

      <Modal isOpen={Boolean(toUnlink)} onClose={unlinking ? () => undefined : () => setToUnlink(null)} title="Desvincular responsável" size="sm">
        {toUnlink && (
          <div className="space-y-4">
            <p className="text-sm text-gray-300">
              Desvincular <strong className="text-white">{toUnlink.nomeFamilia || toUnlink.email}</strong> de{' '}
              <strong className="text-white">{toUnlink.nickname || toUnlink.crianca_name}</strong>?
            </p>
            <p className="text-xs text-gray-500">
              O responsável deixa de ver a criança no app. O histórico fica guardado e, se for preciso, ele pode se vincular de novo lendo o QR code da criança.
            </p>
            {unlinkError && (
              <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{unlinkError}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setToUnlink(null)} disabled={unlinking}>Cancelar</Button>
              <Button variant="danger" onClick={confirmUnlink} disabled={unlinking}>
                {unlinking ? <><Loader2 size={16} className="mr-2 animate-spin" /> Desvinculando...</> : 'Desvincular'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
