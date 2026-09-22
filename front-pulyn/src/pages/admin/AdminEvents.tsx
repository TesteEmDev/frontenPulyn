import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Users, Gamepad2, MapPin, Map,
  FileText, RefreshCw, Settings, Plus, Edit, Trash2
} from 'lucide-react';
import { usePulynStore } from '../../store/mockData';
import { useEvento } from '../../contexts/EventoContext';
import { api } from '../../services/api';
import Sidebar from '../../components/layout/Sidebar';
import TopBar from '../../components/layout/TopBar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

const navItems = [
  { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/admin' },
  { icon: <Calendar size={20} />, label: 'Eventos', path: '/admin/events' },
  { icon: <Users size={20} />, label: 'Crianças', path: '/admin/children' },
  { icon: <Gamepad2 size={20} />, label: 'Jogos', path: '/admin/games' },
  { icon: <MapPin size={20} />, label: 'Checkpoints', path: '/admin/checkpoints' },
  { icon: <Map size={20} />, label: 'Mapa', path: '/admin/map' },
  { icon: <Users size={20} />, label: 'Usuários', path: '/admin/users' },
  { icon: <Users size={20} />, label: 'Times', path: '/admin/teams' },
  { icon: <FileText size={20} />, label: 'Relatórios', path: '/admin/reports' },
  { icon: <RefreshCw size={20} />, label: 'Sincronização', path: '/admin/sync' },
  { icon: <Settings size={20} />, label: 'Configurações', path: '/admin/settings' },
];

type FilterTab = 'all' | 'scheduled' | 'active' | 'finished';

const statusBadgeVariant: Record<string, 'success' | 'primary' | 'muted'> = {
  active: 'success',
  scheduled: 'primary',
  finished: 'muted',
};

const statusLabel: Record<string, string> = {
  active: 'Ativo',
  scheduled: 'Agendado',
  finished: 'Encerrado',
};

export default function AdminEvents() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { events = [], loadEventos } = usePulynStore();
  const { setEventoAtualId } = useEvento();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

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

  const filteredEvents = activeTab === 'all'
    ? events
    : events.filter(e => e.status === activeTab);

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

  if (loading) {
    return (
      <div className="flex h-screen bg-dark text-white overflow-hidden">
        <Sidebar
          items={navItems}
          activePath={location.pathname}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
          title="Pulyn Admin"
          accentColor="#1E9BD7"
        />
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
      <Sidebar
        items={navItems}
        activePath={location.pathname}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
        accentColor="#1E9BD7"
      />

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
                    <th className="pb-3 text-sm font-body font-semibold text-gray-400">Nome</th>
                    <th className="pb-3 text-sm font-body font-semibold text-gray-400">Data</th>
                    <th className="pb-3 text-sm font-body font-semibold text-gray-400">Horário</th>
                    <th className="pb-3 text-sm font-body font-semibold text-gray-400">Status</th>
                    <th className="pb-3 text-sm font-body font-semibold text-gray-400">Ações</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredEvents.map(event => (
                    <tr 
                      key={event.id} 
                      className="hover:bg-surface/50 transition-colors cursor-pointer"
                      onClick={() => handleSelectEvento(event.id)}
                    >
                      <td className="py-3 pr-4">
                        <p className="text-sm font-semibold text-white">{event.name}</p>
                       </td>
                      <td className="py-3 pr-4">
                        <p className="text-sm text-gray-300">
                          {event.date ? (event.date.split('T')[0] || event.date) : '-'}
                        </p>
                       </td>
                      <td className="py-3 pr-4">
                        <p className="text-sm text-gray-300">{event.time || '-'}</p>
                       </td>
                      <td className="py-3 pr-4">
                        <Badge variant={statusBadgeVariant[event.status] || 'muted'}>
                          {statusLabel[event.status] || event.status}
                        </Badge>
                       </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
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
                  ))}
                  {filteredEvents.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500 text-sm">
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