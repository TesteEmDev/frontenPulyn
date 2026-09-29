import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Calendar, Plus, Edit, Trash2, Play, Square, User
} from 'lucide-react';
import { usePulynStore } from '../../store/mockData';
import { useEvento } from '../../contexts/EventoContext';
import { api } from '../../services/api';
import AdminSidebar from '../../components/layout/AdminSidebar';
import TopBar from '../../components/layout/TopBar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

type FilterTab = 'all' | 'scheduled' | 'active' | 'finished';
type LifecycleStatus = 'scheduled' | 'active' | 'finished';

const statusBadgeVariant: Record<LifecycleStatus, 'success' | 'primary' | 'muted'> = {
  active: 'success',
  scheduled: 'primary',
  finished: 'muted',
};

const statusLabel: Record<LifecycleStatus, string> = {
  active: 'Ativo',
  scheduled: 'Agendado',
  finished: 'Encerrado',
};

// O backend só grava scheduled/active/finished, mas outros nomes ainda aparecem em dados antigos.
const toLifecycle = (status: string | undefined): LifecycleStatus => {
  const value = String(status || 'scheduled').toLowerCase();
  if (value === 'active' || value === 'ongoing') return 'active';
  if (['finished', 'completed', 'cancelled', 'canceled'].includes(value)) return 'finished';
  return 'scheduled';
};

const pad = (value: number) => String(value).padStart(2, '0');
const formatClock = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;
const formatDayMonth = (date: Date) => `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const formatEventDate = (value?: string) => {
  const day = (value || '').split('T')[0];
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : (value || '-');
};

const formatDuration = (minutes?: number | null) => {
  const total = Number(minutes);
  if (!Number.isFinite(total) || total <= 0) return '-';
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return `${rest}min`;
  return rest === 0 ? `${hours}h` : `${hours}h${pad(rest)}`;
};

// Linha pequena embaixo do status explicando o que vai acontecer com o evento.
function describeLifecycle(event: any, status: LifecycleStatus): string | null {
  if (status === 'scheduled') {
    if (!event.auto_start) return 'Início manual';
    const day = (event.date || '').split('T')[0];
    const time = String(event.time || '').slice(0, 5);
    if (!day || !time) return 'Inicia sozinho no horário';
    const start = new Date(`${day}T${time}:00`);
    if (Number.isNaN(start.getTime())) return 'Inicia sozinho no horário';
    return isSameDay(start, new Date())
      ? `Inicia sozinho hoje às ${time}`
      : `Inicia sozinho em ${formatDayMonth(start)} às ${time}`;
  }

  if (status === 'active') {
    if (!event.auto_end) return 'Encerramento manual';
    const started = event.started_at ? new Date(event.started_at) : null;
    const minutes = Number(event.duration);
    if (!started || Number.isNaN(started.getTime()) || !(minutes > 0)) return 'Encerra sozinho após a duração';
    const end = new Date(started.getTime() + minutes * 60000);
    return isSameDay(end, new Date())
      ? `Encerra sozinho às ${formatClock(end)}`
      : `Encerra sozinho em ${formatDayMonth(end)} às ${formatClock(end)}`;
  }

  if (event.ended_at) {
    const ended = new Date(event.ended_at);
    if (!Number.isNaN(ended.getTime())) return `Encerrado em ${formatDayMonth(ended)} às ${formatClock(ended)}`;
  }
  return null;
}

export default function AdminEvents() {
  const navigate = useNavigate();
  const { events = [], loadEventos } = usePulynStore();
  const { setEventoAtualId } = useEvento();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'scheduled', label: 'Agendados' },
    { key: 'active', label: 'Ativos' },
    { key: 'finished', label: 'Encerrados' },
  ];

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await loadEventos();
      setLoading(false);
    };
    loadData();
  }, [loadEventos]);

  // Eventos começam e terminam sozinhos no servidor; a lista se atualiza para refletir isso.
  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) loadEventos();
    }, 20000);
    return () => clearInterval(interval);
  }, [loadEventos]);

  const filteredEvents = activeTab === 'all'
    ? events
    : events.filter(e => toLifecycle(e.status) === activeTab);

  const handleSelectEvento = (eventoId: string) => {
    setEventoAtualId(eventoId);
    navigate('/admin');
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Tem certeza que deseja excluir este evento?')) {
      try {
        await api.deleteEvento(id);
        // Recarregar eventos após deletar
        await loadEventos();
      } catch (error) {
        console.error('Erro ao deletar evento:', error);
        alert('Erro ao deletar evento. Tente novamente.');
      }
    }
  };

  const runLifecycleAction = async (
    event: React.MouseEvent,
    eventItem: any,
    action: 'start' | 'finish',
  ) => {
    event.stopPropagation();
    if (busyId) return;

    const question = action === 'start'
      ? `Iniciar o evento "${eventItem.name}" agora?`
      : `Encerrar o evento "${eventItem.name}"?\n\nO jogo em andamento será parado e a recepção deixará de cadastrar participantes nele. Essa ação não pode ser desfeita.`;
    if (!confirm(question)) return;

    setBusyId(eventItem.id);
    try {
      if (action === 'start') await api.startEvento(eventItem.id);
      else await api.finishEvento(eventItem.id);
      await loadEventos();
      toast.success(action === 'start' ? 'Evento iniciado' : 'Evento encerrado');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível concluir a ação');
      // O estado pode ter mudado no servidor (ex.: o evento começou sozinho); atualiza a lista.
      await loadEventos();
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-dark text-white overflow-hidden">
        <AdminSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-400">Carregando eventos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-dark text-white overflow-hidden">
      <AdminSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Gestão do Buffet" subtitle="Eventos" />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <PageHeader
            title="Eventos"
            description="Gerencie todos os eventos do buffet"
            icon={<Calendar size={28} />}
            action={
              <Button variant="primary" onClick={() => navigate('/admin/events/new')}>
                <Plus size={16} className="mr-1.5" />
                Criar Evento
              </Button>
            }
          />

          {/* Filter Tabs */}
          <div className="flex gap-2">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-body font-semibold transition-colors duration-200 ${
                  activeTab === tab.key
                    ? 'bg-primary/20 text-primary'
                    : 'bg-surface text-gray-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Events Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-3 text-sm font-body font-semibold text-gray-400">Evento</th>
                    <th className="pb-3 text-sm font-body font-semibold text-gray-400">Data</th>
                    <th className="pb-3 text-sm font-body font-semibold text-gray-400">Horário</th>
                    <th className="pb-3 text-sm font-body font-semibold text-gray-400">Duração</th>
                    <th className="pb-3 text-sm font-body font-semibold text-gray-400">Status</th>
                    <th className="pb-3 text-sm font-body font-semibold text-gray-400">Ações</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredEvents.map(event => {
                    const status = toLifecycle(event.status);
                    const note = describeLifecycle(event, status);
                    const busy = busyId === event.id;
                    return (
                    <tr
                      key={event.id}
                      className="hover:bg-surface/50 transition-colors cursor-pointer"
                      onClick={() => handleSelectEvento(event.id)}
                    >
                      <td className="py-3 pr-4">
                        <p className="text-sm font-semibold text-white">{event.name}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
                          <User size={12} className="shrink-0" />
                          {event.responsible_name
                            ? <span title="Contratante/responsável">{event.responsible_name}</span>
                            : <span className="text-gray-600">Contratante não informado</span>}
                        </p>
                       </td>
                      <td className="py-3 pr-4">
                        <p className="text-sm text-gray-300">{formatEventDate(event.date)}</p>
                       </td>
                      <td className="py-3 pr-4">
                        <p className="text-sm text-gray-300">{event.time ? String(event.time).slice(0, 5) : '-'}</p>
                       </td>
                      <td className="py-3 pr-4">
                        <p className="text-sm text-gray-300">{formatDuration(event.duration)}</p>
                       </td>
                      <td className="py-3 pr-4">
                        <Badge variant={statusBadgeVariant[status]}>
                          {statusLabel[status]}
                        </Badge>
                        {note && <p className="mt-1 text-xs text-gray-500">{note}</p>}
                       </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          {status === 'scheduled' && (
                            <Button
                              size="sm"
                              variant="success"
                              disabled={busy}
                              title="Iniciar o evento agora"
                              onClick={(e) => runLifecycleAction(e, event, 'start')}
                            >
                              <Play size={14} className="mr-1.5" />
                              {busy ? 'Iniciando...' : 'Iniciar'}
                            </Button>
                          )}
                          {status === 'active' && (
                            <Button
                              size="sm"
                              variant="danger"
                              disabled={busy}
                              title="Encerrar o evento"
                              onClick={(e) => runLifecycleAction(e, event, 'finish')}
                            >
                              <Square size={14} className="mr-1.5" />
                              {busy ? 'Encerrando...' : 'Encerrar'}
                            </Button>
                          )}
                          <button
                            className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-surface transition-colors"
                            title="Editar"
                            onClick={(e) => { e.stopPropagation(); navigate(`/admin/events/${event.id}/edit`); }}
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            className="p-1.5 rounded-lg text-gray-400 hover:text-danger hover:bg-surface transition-colors"
                            title="Excluir"
                            onClick={(e) => handleDelete(event.id, e)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                       </td>
                    </tr>
                    );
                  })}
                  {filteredEvents.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500 text-sm">
                        Nenhum evento encontrado
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
