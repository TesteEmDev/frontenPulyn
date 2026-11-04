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
  ShieldBan,
  ShieldCheck,
  MoreHorizontal,
  Building2,
  MapPin,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Cpu,
} from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import { PLANOS_SELECIONAVEIS } from '../../utils/planos';
import type { PlanoId } from '../../utils/planos';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import ClientDetailsModal from './ClientDetailsModal';

import { api, type ResumoExclusaoCliente } from '../../services/api';

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

interface Client {
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
  // Cliente com o modal de detalhes aberto (o objeto vem da lista, então o status acompanha as alterações)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
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

  const selectedClient = clients.find(c => c.id === selectedClientId) || null;

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
    setSelectedClientId(client.id);
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
        nome: newName,
        cidade: newCity,
        estado: newState,
        plan: newPlan,
        email: newEmail,
        senha: newPassword,
        telefone: newPhone
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

  // Exclusão em duas confirmações: 1) o que será apagado; 2) digitar o nome do cliente.
  const [excluindo, setExcluindo] = useState<{ client: Client; resumo: ResumoExclusaoCliente | null; etapa: 1 | 2; digitado: string; enviando: boolean } | null>(null);

  const handleDeleteClient = async (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    setOpenMenuId(null);
    if (!client) return;
    setExcluindo({ client, resumo: null, etapa: 1, digitado: '', enviando: false });
    try {
      const resumo = await api.getResumoExclusaoCliente(clientId);
      setExcluindo(atual => (atual && atual.client.id === clientId ? { ...atual, resumo } : atual));
    } catch (err) {
      setExcluindo(null);
      setError(err instanceof Error ? err.message : 'Não foi possível consultar o que será apagado');
    }
  };

  const confirmarExclusao = async () => {
    if (!excluindo) return;
    const clientId = excluindo.client.id;
    setExcluindo({ ...excluindo, enviando: true });
    try {
      const resposta = await api.deleteCliente(clientId);
      setExcluindo(null);

      setClients(prev => prev.filter(c => c.id !== clientId));
      setSuccessMessage(resposta.message || 'Cliente excluído com sucesso!');
      if (selectedClientId === clientId) {
        setSelectedClientId(null);
      }
    } catch (err) {
      console.error('Erro ao excluir cliente:', err);
      setError(err instanceof Error ? err.message : 'Erro de conexão ao excluir cliente');
      setExcluindo(atual => (atual ? { ...atual, enviando: false } : atual));
    }
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
                    ...PLANOS_SELECIONAVEIS,
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
                        <tr
                          key={client.id}
                          onClick={() => handleViewDetails(client)}
                          onKeyDown={(e) => {
                            if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                              e.preventDefault();
                              handleViewDetails(client);
                            }
                          }}
                          tabIndex={0}
                          aria-label={`Ver detalhes de ${client.name}`}
                          className="border-b border-border/50 hover:bg-surface/30 focus:bg-surface/30 focus:outline-none transition-colors cursor-pointer"
                        >
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
                          <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={client.plan}
                              onChange={(e) => handleUpdatePlan(client.id, e.target.value)}
                              className="bg-transparent border-none text-sm focus:outline-none cursor-pointer"
                            >
                              {PLANOS_SELECIONAVEIS.map(item => (
                                <option key={item.value} value={item.value} className="bg-card">{item.label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={statusBadgeVariant[client.status]}>
                              {statusLabel[client.status]}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-gray-300">{client.eventsDone}</td>
                          <td className="py-3 px-4 text-gray-400 text-xs">{client.lastAccess}</td>
                          <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
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

          {/* Excluir cliente: duas confirmações, o que será apagado e o nome do cliente */}
          <Modal
            isOpen={Boolean(excluindo)}
            onClose={() => { if (!excluindo?.enviando) setExcluindo(null); }}
            title={excluindo?.etapa === 2 ? 'Última confirmação' : 'Excluir cliente'}
            size="lg"
          >
            {excluindo && (() => {
              const { client, resumo, etapa, digitado, enviando } = excluindo;
              const linhas: [number, string][] = resumo ? ([
                [resumo.eventos, resumo.eventosEmAndamento ? `evento(s), sendo ${resumo.eventosEmAndamento} em andamento (será encerrado antes)` : 'evento(s)'],
                [resumo.participantes, 'participante(s) e o que eles fizeram (pontos, leituras, conquistas)'],
                [resumo.times, 'time(s)'],
                [resumo.pulseiras, 'pulseira(s) cadastrada(s)'],
                [resumo.brincadeiras, 'brincadeira(s) cadastrada(s)'],
                [resumo.leituras + resumo.pontuacoes, 'registro(s) de leituras e pontos'],
                [resumo.checkpointsApagados, 'checkpoint(s) antigo(s), sem MAC'],
                [resumo.usuarios, 'usuário(s) de acesso (logins)'],
              ] as [number, string][]).filter(([n]) => n > 0) : [];
              const nomeConfere = digitado.trim().toLowerCase() === client.name.trim().toLowerCase();
              return (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 rounded-xl border border-danger/40 bg-danger/10 p-4">
                    <AlertCircle size={22} className="mt-0.5 shrink-0 text-danger" />
                    <p className="text-base text-white">
                      Você vai excluir <strong>{client.name}</strong> definitivamente. <strong>Não tem volta</strong>: nem o cliente nem os dados dele podem ser recuperados.
                    </p>
                  </div>

                  {etapa === 1 && (
                    <>
                      {!resumo ? (
                        <p className="text-gray-400">Verificando o que será apagado...</p>
                      ) : (
                        <>
                          <div>
                            <p className="mb-2 font-semibold text-white">Será apagado:</p>
                            <ul className="list-disc space-y-1 pl-6 text-gray-200">
                              <li>O cadastro do cliente e a conta dele</li>
                              {linhas.map(([n, texto]) => <li key={texto}><strong>{n}</strong> {texto}</li>)}
                            </ul>
                          </div>
                          {resumo.checkpointsParaEstoque > 0 && (
                            <p className="rounded-xl border border-success/40 bg-success/10 p-3 text-gray-200">
                              <strong>{resumo.checkpointsParaEstoque}</strong> checkpoint(s) <strong>não</strong> são apagados: voltam para o estoque do master, sem buffet, evento e número (as leituras e pontos deles neste cliente são apagados).
                            </p>
                          )}
                        </>
                      )}
                      <div className="flex justify-end gap-3 pt-2">
                        <Button variant="ghost" onClick={() => setExcluindo(null)}>Cancelar</Button>
                        <Button variant="danger" disabled={!resumo} onClick={() => setExcluindo({ ...excluindo, etapa: 2 })}>Entendi, continuar</Button>
                      </div>
                    </>
                  )}

                  {etapa === 2 && (
                    <>
                      <p className="text-gray-300">Para confirmar, digite o nome do cliente exatamente como aparece abaixo:</p>
                      <p className="rounded-lg bg-white/5 px-3 py-2 font-mono text-white">{client.name}</p>
                      <Input
                        value={digitado}
                        onChange={e => setExcluindo({ ...excluindo, digitado: e.target.value })}
                        placeholder="Nome do cliente"
                        autoFocus
                      />
                      <div className="flex justify-end gap-3 pt-2">
                        <Button variant="ghost" disabled={enviando} onClick={() => setExcluindo({ ...excluindo, etapa: 1, digitado: '' })}>Voltar</Button>
                        <Button variant="danger" disabled={!nomeConfere || enviando} onClick={() => void confirmarExclusao()}>
                          {enviando ? 'Excluindo...' : 'Excluir definitivamente'}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
          </Modal>

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
                options={PLANOS_SELECIONAVEIS}
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
          <ClientDetailsModal
            client={selectedClient}
            onClose={() => setSelectedClientId(null)}
            onToggleStatus={handleToggleStatus}
          />
        </div>
      </main>

      {renderToast()}
    </div>
  );
}