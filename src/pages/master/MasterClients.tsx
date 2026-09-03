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
  Plus,
  Eye,
  ShieldBan,
  ShieldCheck,
  MoreHorizontal,
  Building2,
  MapPin,
  Calendar,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';

import { api } from '../../services/api';
import type { Client } from '../../types/index';

const masterNavItems = [
  { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/master' },
  { icon: <Users size={20} />, label: 'Clientes', path: '/master/clients' },
  { icon: <CreditCard size={20} />, label: 'Planos', path: '/master/plans' },
  { icon: <Activity size={20} />, label: 'Monitoramento', path: '/master/monitoring' },
  { icon: <ScrollText size={20} />, label: 'Logs', path: '/master/logs' },
  { icon: <LifeBuoy size={20} />, label: 'Suporte', path: '/master/support' },
  { icon: <BarChart3 size={20} />, label: 'Analytics', path: '/master/analytics' },
];

interface ClientFormState {
  name: string;
  city: string;
  state: string;
  email: string;
  password: string;
}

const planBadgeVariant: Record<string, 'primary' | 'secondary' | 'muted'> = {
  enterprise: 'primary',
  professional: 'secondary',
  starter: 'muted',
};

const statusBadgeVariant: Record<string, 'success' | 'danger' | 'accent'> = {
  active: 'success',
  blocked: 'danger',
  trial: 'accent',
};

const statusLabel: Record<string, string> = {
  active: 'Ativo',
  blocked: 'Bloqueado',
  trial: 'Trial',
};

export default function MasterClients() {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // New client form state
  const [newName, setNewName] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newState, setNewState] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPlan, setNewPlan] = useState('starter');
  const [submitting, setSubmitting] = useState(false);

  // Fetch clients from API
  const fetchClients = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getClientes();
      
      if (Array.isArray(data)) {
        setClients(data);
      } else {
        setError('Erro ao carregar clientes');
      }
    } catch (err) {
      console.error('Erro ao buscar clientes:', err);
      setError('Não foi possível conectar ao servidor. Verifique se a API está rodando.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // Auto-dismiss success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const filteredClients = clients.filter(client => {
    const matchSearch = client.name.toLowerCase().includes(search.toLowerCase()) ||
      client.city.toLowerCase().includes(search.toLowerCase());
    const matchPlan = filterPlan === 'all' || client.plan === filterPlan;
    const matchStatus = filterStatus === 'all' || client.status === filterStatus;
    return matchSearch && matchPlan && matchStatus;
  });

  const handleToggleStatus = async (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    
    const newStatus = client.status === 'blocked' ? 'active' : 'blocked';
    
    try {
      const data = await api.updateCliente(clientId, { status: newStatus });
      
      if (data) {
        setClients(prev => prev.map(c => 
          c.id === clientId ? { ...c, status: newStatus as any } : c
        ));
        setSuccessMessage(`Cliente ${client.name} ${newStatus === 'active' ? 'ativado' : 'bloqueado'} com sucesso!`);
      } else {
        setError('Erro ao alterar status');
      }
    } catch (err) {
      console.error('Erro ao alterar status:', err);
      setError('Erro de conexão ao alterar status');
    }
    setOpenMenuId(null);
  };

  const handleViewDetails = (client: Client) => {
    setSelectedClient(client);
    setShowDetailsModal(true);
    setOpenMenuId(null);
  };

  const handleNewClient = async () => {
    if (!newName || !newCity || !newEmail || !newPassword) {
      setError('Preencha todos os campos obrigatórios (nome, cidade, e-mail e senha)');
      return;
    }

    if (newPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      const data = await api.createCliente({
        name: newName,
        city: newCity,
        state: newState,
        plan: newPlan,
        email: newEmail,
        password: newPassword,
        phone: newPhone
      });
      
      if (data) {
        setClients(prev => [data, ...prev]);
        setShowNewClientModal(false);
        setSuccessMessage(`Cliente ${newName} criado com sucesso! Acesso: ${newEmail}`);
        
        // Reset form
        setNewName('');
        setNewCity('');
        setNewState('');
        setNewEmail('');
        setNewPassword('');
        setNewPhone('');
        setNewPlan('starter');
      } else {
        setError('Erro ao criar cliente');
      }
    } catch (err) {
      console.error('Erro ao criar cliente:', err);
      setError('Erro de conexão ao criar cliente');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePlan = async (clientId: string, newPlan: string) => {
    try {
      const data = await api.updateCliente(clientId, { plan: newPlan });
      
      if (data) {
        setClients(prev => prev.map(c => 
          c.id === clientId ? { ...c, plan: newPlan as any } : c
        ));
        setSuccessMessage(`Plano atualizado com sucesso!`);
      }
    } catch (err) {
      console.error('Erro ao atualizar plano:', err);
      setError('Erro ao atualizar plano');
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este cliente?')) return;
    
    try {
      await api.deleteCliente(clientId);
      
      setClients(prev => prev.filter(c => c.id !== clientId));
      setSuccessMessage('Cliente excluído com sucesso!');
      if (selectedClient?.id === clientId) {
        setShowDetailsModal(false);
      }
    } catch (err) {
      console.error('Erro ao excluir cliente:', err);
      setError('Erro de conexão ao excluir cliente');
    }
    setOpenMenuId(null);
  };

  // Mensagem de sucesso/erro
  const renderToast = () => {
    if (!successMessage && !error) return null;
    
    return (
      <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-right-5 duration-300">
        {successMessage && (
          <div className="flex items-center gap-2 bg-success/10 text-success border border-success/20 rounded-lg px-4 py-3 shadow-lg">
            <CheckCircle size={18} />
            <span className="text-sm">{successMessage}</span>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 bg-danger/10 text-danger border border-danger/20 rounded-lg px-4 py-3 shadow-lg">
            <XCircle size={18} />
            <span className="text-sm">{error}</span>
          </div>
        )}
      </div>
    );
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
            title="Clientes"
            description="Gerenciamento de clientes da plataforma"
            icon={<Users size={28} />}
            action={
              <Button variant="primary" onClick={() => setShowNewClientModal(true)}>
                <Plus size={18} className="mr-2" />
                Novo Cliente
              </Button>
            }
          />

          {/* Filters */}
          <Card className="mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por nome ou cidade..."
                  icon={<Search size={18} />}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div className="w-full md:w-48">
                <Select
                  options={[
                    { value: 'all', label: 'Todos os planos' },
                    { value: 'starter', label: 'Starter' },
                    { value: 'professional', label: 'Professional' },
                    { value: 'enterprise', label: 'Enterprise' },
                  ]}
                  value={filterPlan}
                  onChange={e => setFilterPlan(e.target.value)}
                />
              </div>
              <div className="w-full md:w-48">
                <Select
                  options={[
                    { value: 'all', label: 'Todos os status' },
                    { value: 'active', label: 'Ativo' },
                    { value: 'blocked', label: 'Bloqueado' },
                    { value: 'trial', label: 'Trial' },
                  ]}
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                />
              </div>
            </div>
          </Card>

          {/* Clients Table */}
          <Card>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={32} className="animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-gray-400">
                        <th className="text-left py-3 px-4 font-semibold">Buffet</th>
                        <th className="text-left py-3 px-4 font-semibold">Cidade</th>
                        <th className="text-left py-3 px-4 font-semibold">Plano</th>
                        <th className="text-left py-3 px-4 font-semibold">Status</th>
                        <th className="text-right py-3 px-4 font-semibold">Eventos</th>
                        <th className="text-left py-3 px-4 font-semibold">Último acesso</th>
                        <th className="text-right py-3 px-4 font-semibold">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredClients.map(client => (
                        <tr key={client.id} className="border-b border-border/50 hover:bg-surface/30 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Building2 size={16} className="text-gray-500 shrink-0" />
                              <span className="font-semibold text-white">{client.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1">
                              <MapPin size={14} className="text-gray-500" />
                              <span className="text-gray-300">{client.city}</span>
                              <span className="text-gray-500">-{client.state}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={client.plan}
                              onChange={(e) => handleUpdatePlan(client.id, e.target.value)}
                              className="bg-transparent border-none text-sm focus:outline-none cursor-pointer"
                            >
                              <option value="starter" className="bg-card">Starter</option>
                              <option value="professional" className="bg-card">Professional</option>
                              <option value="enterprise" className="bg-card">Enterprise</option>
                            </select>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={statusBadgeVariant[client.status]}>
                              {statusLabel[client.status]}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-gray-300">{client.eventsDone}</td>
                          <td className="py-3 px-4 text-gray-400 text-xs">{client.lastAccess}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="relative inline-block">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setOpenMenuId(openMenuId === client.id ? null : client.id)}
                              >
                                <MoreHorizontal size={16} />
                              </Button>
                              {openMenuId === client.id && (
                                <div className="absolute right-0 top-8 z-10 w-48 rounded-lg border border-border bg-card shadow-xl py-1">
                                  <button
                                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-300 hover:bg-surface hover:text-white transition-colors"
                                    onClick={() => handleViewDetails(client)}
                                  >
                                    <Eye size={14} />
                                    Ver detalhes
                                  </button>
                                  <button
                                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-300 hover:bg-surface hover:text-white transition-colors"
                                    onClick={() => handleToggleStatus(client.id)}
                                  >
                                    {client.status === 'blocked' ? (
                                      <><ShieldCheck size={14} className="text-success" /> Ativar</>
                                    ) : (
                                      <><ShieldBan size={14} className="text-danger" /> Bloquear</>
                                    )}
                                  </button>
                                  <button
                                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-danger hover:bg-surface hover:text-danger transition-colors"
                                    onClick={() => handleDeleteClient(client.id)}
                                  >
                                    <AlertCircle size={14} />
                                    Excluir
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredClients.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-gray-500">
                            Nenhum cliente encontrado
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                  <span className="text-sm text-gray-500">{filteredClients.length} clientes encontrados</span>
                  <span className="text-sm text-gray-500">
                    {clients.filter(c => c.status === 'active').length} ativos | {clients.filter(c => c.status === 'trial').length} trial | {clients.filter(c => c.status === 'blocked').length} bloqueados
                  </span>
                </div>
              </>
            )}
          </Card>

          {/* New Client Modal */}
          <Modal isOpen={showNewClientModal} onClose={() => setShowNewClientModal(false)} title="Novo Cliente">
            <div className="space-y-4">
              <Input 
                label="Nome do buffet *" 
                value={newName} 
                onChange={e => setNewName(e.target.value)} 
                placeholder="Ex: Buffet Feliz" 
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="Cidade *" 
                  value={newCity} 
                  onChange={e => setNewCity(e.target.value)} 
                  placeholder="São Paulo" 
                  required
                />
                <Input 
                  label="Estado" 
                  value={newState} 
                  onChange={e => setNewState(e.target.value)} 
                  placeholder="SP" 
                />
              </div>
              <Input 
                label="E-mail (Login) *" 
                type="email" 
                value={newEmail} 
                onChange={e => setNewEmail(e.target.value)} 
                placeholder="contato@buffet.com.br" 
                required
              />
              <Input 
                label="Senha Inicial *" 
                type="password" 
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)} 
                placeholder="Digite uma senha segura" 
                required
              />
              <Input 
                label="Telefone" 
                value={newPhone} 
                onChange={e => setNewPhone(e.target.value)} 
                placeholder="(11) 98765-4321" 
              />
              <Select
                label="Plano"
                options={[
                  { value: 'starter', label: 'Starter' },
                  { value: 'professional', label: 'Professional' },
                  { value: 'enterprise', label: 'Enterprise' },
                ]}
                value={newPlan}
                onChange={e => setNewPlan(e.target.value)}
              />
              <div className="flex gap-3 pt-2">
                <Button variant="ghost" onClick={() => setShowNewClientModal(false)} className="flex-1">Cancelar</Button>
                <Button variant="primary" onClick={handleNewClient} disabled={submitting} className="flex-1">
                  {submitting ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                  Criar Cliente
                </Button>
              </div>
            </div>
          </Modal>

          {/* Client Details Modal */}
          <Modal isOpen={showDetailsModal} onClose={() => setShowDetailsModal(false)} title="Detalhes do Cliente">
            {selectedClient && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Building2 size={24} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg text-white">{selectedClient.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={statusBadgeVariant[selectedClient.status]}>{statusLabel[selectedClient.status]}</Badge>
                      <Badge variant={planBadgeVariant[selectedClient.plan]}>{selectedClient.plan}</Badge>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Cidade</p>
                    <p className="text-sm text-white">{selectedClient.city} - {selectedClient.state}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Eventos realizados</p>
                    <p className="text-sm text-white font-mono">{selectedClient.eventsDone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">E-mail</p>
                    <p className="text-sm text-white">{selectedClient.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Telefone</p>
                    <p className="text-sm text-white">{selectedClient.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Último acesso</p>
                    <p className="text-sm text-white">{selectedClient.lastAccess}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Cliente desde</p>
                    <div className="flex items-center gap-1">
                      <Calendar size={14} className="text-gray-500" />
                      <p className="text-sm text-white">{selectedClient.createdAt}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button
                    variant={selectedClient.status === 'blocked' ? 'primary' : 'danger'}
                    size="sm"
                    onClick={() => { 
                      handleToggleStatus(selectedClient.id); 
                      setSelectedClient({ ...selectedClient, status: selectedClient.status === 'blocked' ? 'active' : 'blocked' });
                    }}
                  >
                    {selectedClient.status === 'blocked' ? (
                      <><ShieldCheck size={14} className="mr-1" /> Ativar</>
                    ) : (
                      <><ShieldBan size={14} className="mr-1" /> Bloquear</>
                    )}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowDetailsModal(false)}>Fechar</Button>
                </div>
              </div>
            )}
          </Modal>
        </div>
      </main>
      
      {renderToast()}
    </div>
  );
}