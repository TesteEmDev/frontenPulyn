import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Plus, Search, ChevronRight
} from 'lucide-react';
import { usePulynStore } from '../../store/mockData';
import { useEvento } from '../../contexts/EventoContext';
import { api } from '../../services/api';
import AdminSidebar from '../../components/layout/AdminSidebar';
import BuffetTopBar from '../../components/layout/BuffetTopBar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Avatar from '../../components/ui/Avatar';
import Select from '../../components/ui/Select';

const ALL_EVENTS = 'all';
const NO_TEAM = '__no_team__';
const STORAGE_KEY = 'admin.children.event';

const readStoredSelection = () => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const formatEventDate = (value?: string | null) => {
  const day = String(value || '').split('T')[0];
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
};

// Mesma normalização que o store aplica às crianças (times, pontos e pulseira)
const normalizeChild = (child: any) => ({
  ...child,
  teamId: child.teamId ?? child.team_id ?? child.time_id ?? null,
  scores: Number(child.scores ?? child.score ?? 0),
  bracelet: child.bracelet ?? child.bracelet_code ?? null,
});

export default function AdminChildren() {
  const navigate = useNavigate();
  const { events = [], loadEventos, eventoAtualId } = usePulynStore();
  const { setEventoAtualId } = useEvento();

  const [loadingEvents, setLoadingEvents] = useState(true);
  const [selection, setSelection] = useState<string | null>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const safeEvents = useMemo(() => (Array.isArray(events) ? events : []), [events]);

  useEffect(() => {
    const loadData = async () => {
      setLoadingEvents(true);
      await loadEventos();
      setLoadingEvents(false);
    };
    loadData();
  }, [loadEventos]);

  // Escolha inicial do evento: a última usada nesta tela, senão o evento atual, senão todos.
  useEffect(() => {
    if (loadingEvents || selection !== null) return;
    const known = (id: string | null | undefined) => !!id && safeEvents.some((e) => e.id === id);
    const stored = readStoredSelection();
    if (stored === ALL_EVENTS || known(stored)) setSelection(stored);
    else if (known(eventoAtualId)) setSelection(eventoAtualId);
    else setSelection(ALL_EVENTS);
  }, [loadingEvents, selection, safeEvents, eventoAtualId]);

  // Carrega as crianças do evento escolhido (ou de todos)
  useEffect(() => {
    if (selection === null) return undefined;
    let disposed = false;
    const load = async () => {
      setLoadingChildren(true);
      setLoadError('');
      try {
        const data = selection === ALL_EVENTS ? await api.getAllCriancas() : await api.getCriancas(selection);
        if (disposed) return;
        setChildren((Array.isArray(data) ? data : []).map(normalizeChild));
      } catch (error) {
        if (disposed) return;
        setChildren([]);
        setLoadError(error instanceof Error ? error.message : 'Não foi possível carregar as crianças.');
      } finally {
        if (!disposed) setLoadingChildren(false);
      }
    };
    load();
    return () => { disposed = true; };
  }, [selection]);

  const handleSelectEvent = (value: string) => {
    setSelection(value);
    setFilterTeam('');
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // preferência opcional
    }
  };

  const eventOptions = useMemo(() => [
    { value: ALL_EVENTS, label: 'Todos os eventos' },
    ...[...safeEvents]
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
      .map((e) => ({
        value: e.id,
        label: `${e.name || 'Evento'}${formatEventDate(e.date) ? ` — ${formatEventDate(e.date)}` : ''}`,
      })),
  ], [safeEvents]);

  // Times existentes na lista atual, por nome (o mesmo nome em eventos diferentes vira uma opção só)
  const teamOptions = useMemo(() => {
    const names = new Set<string>();
    let hasNoTeam = false;
    for (const child of children) {
      if (child.time_name) names.add(child.time_name);
      else hasNoTeam = true;
    }
    return [
      { value: '', label: 'Todos os times' },
      ...[...names].sort((a, b) => a.localeCompare(b, 'pt-BR')).map((name) => ({ value: name, label: name })),
      ...(hasNoTeam ? [{ value: NO_TEAM, label: 'Sem time' }] : []),
    ];
  }, [children]);

  const filtered = children.filter((child) => {
    const term = search.toLowerCase();
    const matchesSearch = !search
      || child.name?.toLowerCase().includes(term)
      || child.nickname?.toLowerCase().includes(term);
    const matchesTeam = !filterTeam
      || (filterTeam === NO_TEAM ? !child.time_name : child.time_name === filterTeam);
    const matchesStatus = !filterStatus || child.status === filterStatus;
    return matchesSearch && matchesTeam && matchesStatus;
  });

  const showEventColumn = selection === ALL_EVENTS;
  const columnCount = showEventColumn ? 9 : 8;

  // O perfil da criança lê o evento "atual" do sistema; ao abrir uma criança de
  // outro evento, esse evento vira o atual para o perfil encontrá-la.
  const openChild = (child: any) => {
    if (child.evento_id && child.evento_id !== eventoAtualId) setEventoAtualId(child.evento_id);
    navigate(`/admin/children/${child.id}`);
  };

  if (loadingEvents || selection === null) {
    return (
      <div className="flex h-screen bg-dark text-white overflow-hidden">
        <AdminSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-400">Carregando crianças...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-dark text-white overflow-hidden">
      <AdminSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <BuffetTopBar subtitle="Crianças e Famílias" />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <PageHeader
            title="Crianças"
            description="Gerencie cadastros de crianças e famílias"
            icon={<Users size={28} />}
            action={
              <Button variant="primary" onClick={() => navigate('/reception/checkin')}>
                <Plus size={16} className="mr-1.5" />
                Novo Cadastro
              </Button>
            }
          />

          {/* Evento + busca e filtros */}
          <Card>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Select
                label="Evento"
                options={eventOptions}
                value={selection}
                onChange={e => handleSelectEvent(e.target.value)}
              />
              <div>
                <p className="mb-1.5 block text-sm font-body font-medium text-gray-300">Buscar</p>
                <Input
                  placeholder="Nome ou apelido..."
                  icon={<Search size={16} />}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <Select
                label="Time"
                options={teamOptions}
                value={filterTeam}
                onChange={e => setFilterTeam(e.target.value)}
              />
              <Select
                label="Status"
                options={[
                  { value: '', label: 'Todos os status' },
                  { value: 'active', label: 'Ativo' },
                  { value: 'pending', label: 'Pendente' },
                  { value: 'inactive', label: 'Inativo' },
                ]}
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
              />
            </div>
            <p className="mt-3 text-xs text-gray-500" aria-live="polite">
              {loadingChildren
                ? 'Carregando...'
                : `${filtered.length} ${filtered.length === 1 ? 'criança' : 'crianças'}${
                    filtered.length !== children.length ? ` de ${children.length}` : ''
                  } · ${showEventColumn ? 'todos os eventos' : 'evento selecionado'}`}
            </p>
          </Card>

          {/* Children Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-3 text-sm font-body font-semibold text-gray-400"></th>
                    <th className="pb-3 text-sm font-body font-semibold text-gray-400">Nome</th>
                    <th className="pb-3 text-sm font-body font-semibold text-gray-400">Apelido</th>
                    <th className="pb-3 text-sm font-body font-semibold text-gray-400">Idade</th>
                    {showEventColumn && (
                      <th className="pb-3 text-sm font-body font-semibold text-gray-400">Evento</th>
                    )}
                    <th className="pb-3 text-sm font-body font-semibold text-gray-400">Time</th>
                    <th className="pb-3 text-sm font-body font-semibold text-gray-400">Pulseira</th>
                    <th className="pb-3 text-sm font-body font-semibold text-gray-400">Pontos</th>
                    <th className="pb-3 text-sm font-body font-semibold text-gray-400"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {!loadingChildren && filtered.map(child => {
                    const braceletCode = child.bracelet_code || child.bracelet;
                    return (
                      <tr
                        key={child.id}
                        className="hover:bg-surface/50 transition-colors cursor-pointer"
                        onClick={() => openChild(child)}
                      >
                        <td className="py-3 pr-2">
                          <Avatar emoji={child.avatar || '👤'} size="sm" />
                        </td>
                        <td className="py-3 pr-4">
                          <p className="text-sm font-semibold text-white">{child.name}</p>
                        </td>
                        <td className="py-3 pr-4">
                          <p className="text-sm text-gray-300">{child.nickname || child.name}</p>
                        </td>
                        <td className="py-3 pr-4">
                          <p className="text-sm text-gray-300">{child.age} anos</p>
                        </td>
                        {showEventColumn && (
                          <td className="py-3 pr-4">
                            <p className="text-sm text-gray-300">{child.evento_name || '-'}</p>
                            {formatEventDate(child.evento_date) && (
                              <p className="text-xs text-gray-500">{formatEventDate(child.evento_date)}</p>
                            )}
                          </td>
                        )}
                        <td className="py-3 pr-4">
                          {child.time_name ? (
                            <span
                              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-body font-semibold"
                              style={{ backgroundColor: (child.time_color || '#888888') + '20', color: child.time_color || '#9CA3AF' }}
                            >
                              👥 {child.time_name}
                            </span>
                          ) : (
                            <Badge variant="muted">Sem time</Badge>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          {braceletCode ? (
                            <Badge variant="success">{braceletCode}</Badge>
                          ) : (
                            <Badge variant="warning">Sem pulseira</Badge>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <p className="text-sm font-bold text-primary">{child.scores || 0}</p>
                        </td>
                        <td className="py-3">
                          <ChevronRight size={16} className="text-gray-500" />
                        </td>
                      </tr>
                    );
                  })}
                  {(loadingChildren || loadError || filtered.length === 0) && (
                    <tr>
                      <td colSpan={columnCount} className="py-8 text-center text-sm">
                        {loadingChildren ? (
                          <span className="text-gray-500">Carregando crianças...</span>
                        ) : loadError ? (
                          <span role="alert" className="text-danger">{loadError}</span>
                        ) : safeEvents.length === 0 ? (
                          <span className="text-gray-500">Nenhum evento cadastrado ainda</span>
                        ) : (
                          <span className="text-gray-500">Nenhuma criança encontrada</span>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
