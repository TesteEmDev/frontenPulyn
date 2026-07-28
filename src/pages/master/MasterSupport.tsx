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
  Plus,
  Search,
  MessageSquare,
  Clock,
  User,
} from 'lucide-react';
import { api } from '../../services/api';
import Sidebar from '../../components/layout/Sidebar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';

const masterNavItems = [
  { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/master' },
  { icon: <Users size={20} />, label: 'Clientes', path: '/master/clients' },
  { icon: <CreditCard size={20} />, label: 'Planos', path: '/master/plans' },
  { icon: <Activity size={20} />, label: 'Monitoramento', path: '/master/monitoring' },
  { icon: <ScrollText size={20} />, label: 'Logs', path: '/master/logs' },
  { icon: <LifeBuoy size={20} />, label: 'Suporte', path: '/master/support' },
  { icon: <BarChart3 size={20} />, label: 'Analytics', path: '/master/analytics' },
];

type TicketStatus = 'aberto' | 'em_andamento' | 'resolvido';
type TicketPriority = 'alta' | 'media' | 'baixa';

interface Ticket {
  id: string;
  client: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  date: string;
  assignee: string;
  description: string;
}

const statusBadgeVariant: Record<TicketStatus, 'accent' | 'secondary' | 'success'> = {
  aberto: 'accent',
  em_andamento: 'secondary',
  resolvido: 'success',
};

const statusLabel: Record<TicketStatus, string> = {
  aberto: 'Aberto',
  em_andamento: 'Em andamento',
  resolvido: 'Resolvido',
};

const priorityBadgeVariant: Record<TicketPriority, 'danger' | 'accent' | 'muted'> = {
  alta: 'danger',
  media: 'accent',
  baixa: 'muted',
};

const priorityLabel: Record<TicketPriority, string> = {
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
};

export default function MasterSupport() {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // New ticket form
  const [newClient, setNewClient] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newPriority, setNewPriority] = useState('media');
  const [newDescription, setNewDescription] = useState('');
  const [newAssignee, setNewAssignee] = useState('');

  useEffect(() => {
    const loadTickets = async () => {
      try {
        const [ticketsData, clientsData] = await Promise.all([
          api.getTickets(),
          api.getMasterClients(),
        ]);
        setTickets(Array.isArray(ticketsData) ? ticketsData : []);
        setClients(Array.isArray(clientsData) ? clientsData : []);
      } catch (error) {
        console.error('Erro ao buscar tickets:', error);
      } finally {
        setLoading(false);
      }
    };
    loadTickets();
  }, []);

  const filteredTickets = tickets.filter(ticket => {
    const matchSearch = ticket.subject.toLowerCase().includes(search.toLowerCase()) ||
      ticket.client.toLowerCase().includes(search.toLowerCase()) ||
      ticket.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || ticket.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const openCount = tickets.filter(t => t.status === 'aberto').length;
  const inProgressCount = tickets.filter(t => t.status === 'em_andamento').length;
  const resolvedCount = tickets.filter(t => t.status === 'resolvido').length;

  const handleNewTicket = async () => {
    if (!newClient || !newSubject) return;
    try {
      const ticket = await api.createTicket({
        client: newClient,
        subject: newSubject,
        priority: newPriority,
        description: newDescription,
        assignee: newAssignee || 'Atribuir'
      });
      setTickets(prev => [ticket, ...prev]);
      setShowNewTicketModal(false);
      setNewClient('');
      setNewSubject('');
      setNewPriority('media');
      setNewDescription('');
      setNewAssignee('');
    } catch (error) {
      console.error('Erro ao criar ticket:', error);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      await api.updateTicketStatus(ticketId, newStatus);
      setTickets(prev => prev.map(t =>
        t.id === ticketId ? { ...t, status: newStatus } : t
      ));
    } catch (error) {
      console.error('Erro ao atualizar status do ticket:', error);
    }
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
            title="Central de Suporte"
            description="Gerenciamento de tickets e atendimento ao cliente"
            icon={<LifeBuoy size={28} />}
            action={
              <Button variant="primary" onClick={() => setShowNewTicketModal(true)}>
                <Plus size={18} className="mr-2" />
                Novo Ticket
              </Button>
            }
          />

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card className="text-center cursor-pointer" onClick={() => setFilterStatus('aberto')}>
              <MessageSquare size={20} className="text-accent mx-auto mb-1" />
              <p className="font-display text-2xl text-accent font-bold">{openCount}</p>
              <p className="text-sm text-gray-400">Abertos</p>
            </Card>
            <Card className="text-center cursor-pointer" onClick={() => setFilterStatus('em_andamento')}>
              <Clock size={20} className="text-secondary mx-auto mb-1" />
              <p className="font-display text-2xl text-secondary font-bold">{inProgressCount}</p>
              <p className="text-sm text-gray-400">Em andamento</p>
            </Card>
            <Card className="text-center cursor-pointer" onClick={() => setFilterStatus('resolvido')}>
              <LifeBuoy size={20} className="text-success mx-auto mb-1" />
              <p className="font-display text-2xl text-success font-bold">{resolvedCount}</p>
              <p className="text-sm text-gray-400">Resolvidos</p>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Buscar ticket, cliente ou assunto..."
                  icon={<Search size={18} />}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filterStatus === 'all' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setFilterStatus('all')}
                >
                  Todos
                </Button>
                <Button
                  variant={filterStatus === 'aberto' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setFilterStatus('aberto')}
                >
                  Abertos
                </Button>
                <Button
                  variant={filterStatus === 'em_andamento' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setFilterStatus('em_andamento')}
                >
                  Em andamento
                </Button>
                <Button
                  variant={filterStatus === 'resolvido' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setFilterStatus('resolvido')}
                >
                  Resolvidos
                </Button>
              </div>
            </div>
          </Card>

          {/* Ticket List */}
          <Card>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-gray-400">Carregando tickets...</p>
                </div>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-gray-400">
                    <th className="text-left py-3 px-4 font-semibold">ID</th>
                    <th className="text-left py-3 px-4 font-semibold">Cliente</th>
                    <th className="text-left py-3 px-4 font-semibold">Assunto</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Prioridade</th>
                    <th className="text-left py-3 px-4 font-semibold">Data</th>
                    <th className="text-left py-3 px-4 font-semibold">Responsável</th>
                    <th className="text-right py-3 px-4 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map(ticket => (
                    <tr key={ticket.id} className="border-b border-border/50 hover:bg-surface/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-primary">{ticket.id}</td>
                      <td className="py-3 px-4 text-gray-300">{ticket.client}</td>
                      <td className="py-3 px-4 text-white font-semibold">{ticket.subject}</td>
                      <td className="py-3 px-4">
                        <Badge variant={statusBadgeVariant[ticket.status]}>
                          {statusLabel[ticket.status]}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={priorityBadgeVariant[ticket.priority]}>
                          {priorityLabel[ticket.priority]}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-xs">{ticket.date}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <User size={12} className="text-gray-500" />
                          <span className="text-gray-300 text-xs">{ticket.assignee}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex gap-1 justify-end">
                          {ticket.status === 'aberto' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatusChange(ticket.id, 'em_andamento')}
                            >
                              Assumir
                            </Button>
                          )}
                          {ticket.status === 'em_andamento' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatusChange(ticket.id, 'resolvido')}
                            >
                              Resolver
                            </Button>
                          )}
                          {ticket.status === 'resolvido' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatusChange(ticket.id, 'aberto')}
                            >
                              Reabrir
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredTickets.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-500">
                        Nenhum ticket encontrado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
            <div className="mt-4 pt-4 border-t border-border text-sm text-gray-500">
              {filteredTickets.length} tickets | {openCount} abertos | {inProgressCount} em andamento | {resolvedCount} resolvidos
            </div>
          </Card>

          {/* New Ticket Modal */}
          <Modal isOpen={showNewTicketModal} onClose={() => setShowNewTicketModal(false)} title="Novo Ticket">
            <div className="space-y-4">
              <Select
                label="Cliente"
                options={[
                  { value: '', label: 'Selecione o cliente' },
                  ...clients.map((client) => ({ value: client.name, label: client.name })),
                ]}
                value={newClient}
                onChange={e => setNewClient(e.target.value)}
              />
              <Input
                label="Assunto"
                value={newSubject}
                onChange={e => setNewSubject(e.target.value)}
                placeholder="Descreva o problema resumidamente"
              />
              <Select
                label="Prioridade"
                options={[
                  { value: 'baixa', label: 'Baixa' },
                  { value: 'media', label: 'Média' },
                  { value: 'alta', label: 'Alta' },
                ]}
                value={newPriority}
                onChange={e => setNewPriority(e.target.value as TicketPriority)}
              />
              <Select
                label="Responsável"
                options={[
                  { value: 'Atribuir', label: 'Atribuir depois' },
                  { value: 'Carlos S.', label: 'Carlos S.' },
                  { value: 'Maria L.', label: 'Maria L.' },
                  { value: 'Ana P.', label: 'Ana P.' },
                ]}
                value={newAssignee || 'Atribuir'}
                onChange={e => setNewAssignee(e.target.value)}
              />
              <div className="w-full">
                <label className="mb-1.5 block text-sm font-body font-medium text-gray-300">
                  Descrição
                </label>
                <textarea
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="Descreva o problema em detalhes..."
                  rows={4}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-white placeholder-gray-500 font-body transition-colors duration-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="ghost" onClick={() => setShowNewTicketModal(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button variant="primary" onClick={handleNewTicket} className="flex-1">
                  Criar Ticket
                </Button>
              </div>
            </div>
          </Modal>
        </div>
      </main>
    </div>
  );
}
