import { useState, useEffect } from 'react';
import {
  Users, Settings, X, UserPlus, Loader2, Eye, EyeOff
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import AdminSidebar from '../../components/layout/AdminSidebar';
import BuffetTopBar from '../../components/layout/BuffetTopBar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import StatusDot from '../../components/ui/StatusDot';
import Modal from '../../components/ui/Modal';

type UserRole = 'admin' | 'reception' | 'game_master' | 'display' | 'family' | 'kiosk' | 'score_kiosk';

interface User {
  loginId: string;
  email: string;
  perfil: UserRole;
  status: 'active' | 'inactive';
  criadoEm: string;
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

// Mesma regra do backend (utils/unitEmail.js): minúsculas, números e . _ - entre letras/números.
const USERNAME_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;

// Deixa só o que cabe antes do @: minúsculas, sem espaços; se colarem um e-mail, usa o que vem antes do @.
const sanitizeUsername = (value: string) =>
  value.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 64);

export default function AdminUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // O e-mail é "[usuario]@[domínio da unidade]": o admin digita só a parte antes do @.
  const [emailDomain, setEmailDomain] = useState<string | null | undefined>(undefined); // undefined = carregando
  const [modalError, setModalError] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'reception' as UserRole,
  });

  // Carregar usuários
  const loadUsers = async () => {
    if (!user?.empresaId) {
      setError('Empresa não identificada');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await api.getUsers(user.empresaId);
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

  useEffect(() => {
    let active = true;
    api.getEmpresa()
      .then(profile => { if (active) setEmailDomain(profile.emailDomain); })
      .catch(err => {
        console.error('❌ Erro ao carregar o domínio de e-mail da unidade:', err);
        if (active) setEmailDomain(null);
      });
    return () => { active = false; };
  }, []);

  const closeAddModal = () => {
    setShowAddModal(false);
    setNewUser({ username: '', password: '', role: 'reception' });
    setModalError(null);
    setShowPassword(false);
  };

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.password || !user?.empresaId) {
      setModalError('Preencha o usuário, a senha e selecione um perfil.');
      return;
    }

    if (!emailDomain) {
      setModalError('Defina o nome da unidade em Configurações para gerar o e-mail dos usuários.');
      return;
    }

    if (!USERNAME_PATTERN.test(newUser.username)) {
      setModalError('Use só letras, números, ponto, hífen ou sublinhado, sem espaços, e não comece nem termine com símbolo.');
      return;
    }

    if (newUser.password.length < 6) {
      setModalError('Senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setSubmitting(true);
    setModalError(null);

    try {
      const createdUser = await api.createUser({
        email: `${newUser.username}@${emailDomain}`,
        senha: newUser.password,
        role: newUser.role,
        empresaId: user.empresaId
      });

      setUsers(prev => [...prev, createdUser]);
      closeAddModal();
      
    } catch (err: any) {
      console.error('❌ Erro ao criar usuário:', err);
      setModalError(err.message || 'Erro ao criar usuário. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover este usuário? Esta ação não pode ser desfeita!')) return;

    try {
      await api.deleteUser(id);
      setUsers(prev => prev.filter(u => u.loginId !== id));
    } catch (err) {
      console.error('❌ Erro ao remover usuário:', err);
      setError('Erro ao remover usuário');
    }
  };

  return (
    <div className="flex h-screen bg-dark text-white overflow-hidden">
      <AdminSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <BuffetTopBar subtitle="Equipe" />

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
                          const config = roleConfig[userData.perfil];
                          return (
                            <tr key={userData.loginId} className="hover:bg-surface/50 transition-colors">
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
                                  {new Date(userData.criadoEm).toLocaleDateString('pt-BR')}
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
                                    onClick={() => handleDeleteUser(userData.loginId)}
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
            onClose={closeAddModal}
            title="Criar Novo Usuário"
          >
            <div className="space-y-4">
              <div>
                <label htmlFor="new-user-username" className="mb-1.5 block text-sm font-body font-semibold text-gray-300">
                  E-mail de acesso *
                </label>
                <div className="flex items-stretch rounded-xl border border-white/[0.10] bg-dark-card transition-all duration-200 focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-500/15">
                  <input
                    id="new-user-username"
                    value={newUser.username}
                    onChange={e => setNewUser(prev => ({ ...prev, username: sanitizeUsername(e.target.value) }))}
                    placeholder="recreacionista"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    maxLength={64}
                    aria-describedby="new-user-email-preview"
                    className="min-w-0 flex-1 rounded-l-xl bg-transparent px-3.5 py-3 font-body text-white placeholder-gray-500 focus:outline-none"
                  />
                  <span className="flex shrink-0 items-center rounded-r-xl border-l border-white/[0.10] bg-white/[0.04] px-3.5 font-body text-sm text-gray-300">
                    {emailDomain === undefined ? 'carregando...' : emailDomain ? `@${emailDomain}` : '@—'}
                  </span>
                </div>
                <p id="new-user-email-preview" className="mt-1.5 break-all text-xs text-gray-500">
                  {emailDomain === null
                    ? 'Defina o nome da unidade em Configurações para gerar o e-mail dos usuários.'
                    : newUser.username && emailDomain
                    ? `O usuário entrará com ${newUser.username}@${emailDomain}`
                    : 'O domínio vem do nome da unidade, sem espaços. Digite só o início do e-mail.'}
                </p>
              </div>
              
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

              {modalError && (
                <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                  {modalError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button 
                  variant="ghost" 
                  onClick={closeAddModal}
                  disabled={submitting}
                >
                  Cancelar
                </Button>
                <Button 
                  variant="primary" 
                  onClick={handleAddUser}
                  disabled={!newUser.username || !newUser.password || !emailDomain || submitting}
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
