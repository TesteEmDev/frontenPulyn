import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Users, Gamepad2, MapPin, Map,
  FileText, RefreshCw, Settings, X, UserPlus, Loader2, Eye, EyeOff
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import Sidebar from '../../components/layout/Sidebar';
import TopBar from '../../components/layout/TopBar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import StatusDot from '../../components/ui/StatusDot';
import Modal from '../../components/ui/Modal';

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

type UserRole = 'admin' | 'reception' | 'game_master' | 'display' | 'family' | 'kiosk' | 'score_kiosk';

interface User {
  id: string;
  email: string;
  role: UserRole;
  status: 'active' | 'inactive';
  created_at: string;
}

const roleConfig: Record<UserRole, { label: string; description: string; variant: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'danger' | 'muted' }> = {
  admin: { label: 'Administrador', description: 'Acesso total ao painel', variant: 'danger' },
  reception: { label: 'Recepcionista', description: 'Check-in e cadastro', variant: 'secondary' },
  game_master: { label: 'Game Master', description: 'Controle do jogo', variant: 'accent' },
  display: { label: 'Telão', description: 'Exibição de placar', variant: 'muted' },
  family: { label: 'Familiar', description: 'Acesso ao app', variant: 'success' },
  kiosk: { label: 'Autoatendimento', description: 'Totem de cadastro de crianças', variant: 'primary' },
  score_kiosk: { label: 'Consulta de pontuação', description: 'Totem para consultar pontos', variant: 'accent' },
};

export default function AdminUsers() {
  const location = useLocation();
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    role: 'reception' as UserRole,
  });

  // Carregar usuários
  const loadUsers = async () => {
    if (!user?.empresa_id) {
      setError('Empresa não identificada');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await api.getUsers(user.empresa_id);
      setUsers(data);
    } catch (err) {
      console.error('❌ Erro ao carregar usuários:', err);
      setError('Não foi possível carregar os usuários');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [user]);

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.password || !user?.empresa_id) {
      setError('Preencha email, senha e selecione um perfil');
      return;
    }

    if (newUser.password.length < 6) {
      setError('Senha deve ter no mínimo 6 caracteres');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const createdUser = await api.createUser({
        email: newUser.email,
        password: newUser.password,
        role: newUser.role,
        empresa_id: user.empresa_id
      });

      setUsers(prev => [...prev, createdUser]);
      setNewUser({ email: '', password: '', role: 'reception' });
      setShowAddModal(false);
      
    } catch (err: any) {
      console.error('❌ Erro ao criar usuário:', err);
      setError(err.message || 'Erro ao criar usuário. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover este usuário? Esta ação não pode ser desfeita!')) return;

    try {
      await api.deleteUser(id);
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (err) {
      console.error('❌ Erro ao remover usuário:', err);
      setError('Erro ao remover usuário');
    }
  };

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

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Gestão do Buffet" subtitle="Equipe" />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <PageHeader
            title="Usuários"
            description="Crie e gerencie os usuários da sua equipe"
            icon={<Users size={28} />}
            action={
              <Button variant="primary" onClick={() => setShowAddModal(true)}>
                <UserPlus size={16} className="mr-1.5" />
                Novo Usuário
              </Button>
            }
          />

          {error && (
            <div className="bg-danger/10 border border-danger/30 rounded-lg px-4 py-3 text-danger text-sm">
              {error}
            </div>
          )}

          <Card>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={32} className="animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="pb-3 text-sm font-body font-semibold text-gray-400">Email</th>
                        <th className="pb-3 text-sm font-body font-semibold text-gray-400">Perfil</th>
                        <th className="pb-3 text-sm font-body font-semibold text-gray-400">Status</th>
                        <th className="pb-3 text-sm font-body font-semibold text-gray-400">Criado em</th>
                        <th className="pb-3 text-sm font-body font-semibold text-gray-400">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {users.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-500">
                            Nenhum usuário criado. Crie o primeiro usuário para começar!
                          </td>
                        </tr>
                      ) : (
                        users.map(userData => {
                          const config = roleConfig[userData.role];
                          return (
                            <tr key={userData.id} className="hover:bg-surface/50 transition-colors">
                              <td className="py-3 pr-4">
                                <p className="text-sm font-semibold text-white">{userData.email}</p>
                              </td>
                              <td className="py-3 pr-4">
                                <div>
                                  <Badge variant={config.variant}>{config.label}</Badge>
                                  <p className="text-xs text-gray-400 mt-1">{config.description}</p>
                                </div>
                              </td>
                              <td className="py-3 pr-4">
                                <div className="flex items-center gap-2">
                                  <StatusDot status={userData.status === 'active' ? 'online' : 'offline'} />
                                  <span className="text-sm text-gray-300 capitalize">
                                    {userData.status === 'active' ? 'Ativo' : 'Inativo'}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 pr-4">
                                <p className="text-sm text-gray-300">
                                  {new Date(userData.created_at).toLocaleDateString('pt-BR')}
                                </p>
                              </td>
                              <td className="py-3">
                                <div className="flex items-center gap-1">
                                  <button
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-surface transition-colors"
                                    title="Editar"
                                    disabled
                                  >
                                    <Settings size={16} />
                                  </button>
                                  <button
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-danger hover:bg-surface transition-colors"
                                    title="Remover"
                                    onClick={() => handleDeleteUser(userData.id)}
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                {users.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm text-gray-500">{users.length} usuário(s) criado(s)</p>
                  </div>
                )}
              </>
            )}
          </Card>

          {/* Add User Modal */}
          <Modal
            isOpen={showAddModal}
            onClose={() => {
              setShowAddModal(false);
              setNewUser({ email: '', password: '', role: 'reception' });
              setError(null);
            }}
            title="Criar Novo Usuário"
          >
            <div className="space-y-4">
              <Input
                label="Email *"
                placeholder="Ex: recreacionista@buffet.com"
                type="email"
                value={newUser.email}
                onChange={e => setNewUser(prev => ({ ...prev, email: e.target.value }))}
              />
              
              <div className="relative">
                <Input
                  label="Senha *"
                  placeholder="Mínimo 6 caracteres"
                  type={showPassword ? 'text' : 'password'}
                  value={newUser.password}
                  onChange={e => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-10 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <Select
                label="Perfil *"
                options={Object.entries(roleConfig).map(([key, val]) => ({
                  value: key,
                  label: `${val.label} - ${val.description}`,
                }))}
                value={newUser.role}
                onChange={e => setNewUser(prev => ({ ...prev, role: e.target.value as UserRole }))}
              />

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <p className="text-xs text-blue-200">
                  💡 <strong>Dica:</strong> Escolha o perfil baseado na função:
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button 
                  variant="ghost" 
                  onClick={() => setShowAddModal(false)}
                  disabled={submitting}
                >
                  Cancelar
                </Button>
                <Button 
                  variant="primary" 
                  onClick={handleAddUser}
                  disabled={!newUser.email || !newUser.password || submitting}
                >
                  {submitting ? (
                    <><Loader2 size={16} className="mr-2 animate-spin" /> Criando...</>
                  ) : (
                    'Criar Usuário'
                  )}
                </Button>
              </div>
            </div>
          </Modal>
        </main>
      </div>
    </div>
  );
}
