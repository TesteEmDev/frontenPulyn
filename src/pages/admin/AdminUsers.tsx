import { useState, useEffect } from 'react';
import {
  Users, Settings, X, UserPlus, Loader2, Eye, EyeOff, Wand2, Check
} from 'lucide-react';
import { api } from '../../services/api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { useAuth } from '../../hooks/useAuth';
import AdminSidebar from '../../components/layout/AdminSidebar';
import BuffetTopBar from '../../components/layout/BuffetTopBar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import StatusDot from '../../components/ui/StatusDot';
import Modal from '../../components/ui/Modal';

type UserRole = 'admin' | 'reception' | 'game_master' | 'display' | 'family' | 'kiosk' | 'score_kiosk';

interface User {
  loginId: string;
  email: string;
  perfil: UserRole;
  // Áreas que a conta pode usar: o perfil principal primeiro, depois as extras.
  papeis?: UserRole[];
  status: 'active' | 'inactive';
  criadoEm: string;
}

const roleConfig: Record<UserRole, { label: string; description: string; variant: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'danger' | 'muted' }> = {
  admin: { label: 'Administrador', description: 'Acesso total ao painel', variant: 'danger' },
  reception: { label: 'Recepcionista', description: 'Check-in e cadastro', variant: 'secondary' },
  game_master: { label: 'Recreacionista', description: 'Controle do jogo', variant: 'accent' },
  display: { label: 'Telão', description: 'Exibição de placar', variant: 'muted' },
  family: { label: 'Familiar', description: 'Acesso ao app', variant: 'success' },
  kiosk: { label: 'Autoatendimento', description: 'Totem de cadastro de crianças', variant: 'primary' },
  score_kiosk: { label: 'Consulta de pontuação', description: 'Totem para consultar pontos', variant: 'accent' },
};

const USUARIOS_POR_PAGINA = 10;

// Papéis ao criar um usuário: o principal (o que ele abre ao entrar) e os extras que ele também pode usar.
const GRUPOS_DE_PAPEL: { titulo: string; papeis: UserRole[] }[] = [
  { titulo: 'Equipe', papeis: ['admin', 'reception', 'game_master'] },
  // O telão abre por link (sem conta) e as contas de família se cadastram sozinhas: nenhum dos dois é criado aqui
  { titulo: 'Equipamentos', papeis: ['kiosk', 'score_kiosk'] },
];
const MINIMO_SENHA = 6;
// Sem caracteres que se confundem (0/O, 1/l/I), para a senha poder ser ditada ou digitada sem erro
const ALFABETO_SENHA = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const gerarSenha = (tamanho = 10) => {
  const sorteio = new Uint32Array(tamanho);
  crypto.getRandomValues(sorteio);
  return Array.from(sorteio, (n) => ALFABETO_SENHA[n % ALFABETO_SENHA.length]).join('');
};

// Só a equipe acumula áreas (mesma regra do backend, utils/papeis.js).
const PAPEIS_ACUMULAVEIS: UserRole[] = ['admin', 'reception', 'game_master'];

// Mesma regra do backend (utils/unitEmail.js): minúsculas, números e . _ - entre letras/números.
const USERNAME_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;

// Deixa só o que cabe antes do @: minúsculas, sem espaços; se colarem um e-mail, usa o que vem antes do @.
const sanitizeUsername = (value: string) =>
  value.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 64);

export default function AdminUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  // Remover conta: pede a confirmação num modal (nada de confirm do navegador)
  const [removendo, setRemovendo] = useState<{ user: User; enviando: boolean; erro: string | null } | null>(null);
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
    confirmPassword: '',
    role: 'reception' as UserRole,
    // Áreas extras (só contas da equipe acumulam áreas)
    extras: [] as UserRole[],
  });
  const [senhaCriada, setSenhaCriada] = useState<string | null>(null);

  // Paginação da lista (a API devolve todos os usuários do buffet; a paginação é no navegador)
  const [pagina, setPagina] = useState(1);
  const totalPaginas = Math.max(1, Math.ceil(users.length / USUARIOS_POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const usuariosDaPagina = users.slice((paginaAtual - 1) * USUARIOS_POR_PAGINA, paginaAtual * USUARIOS_POR_PAGINA);
  const inicioPagina = users.length === 0 ? 0 : (paginaAtual - 1) * USUARIOS_POR_PAGINA + 1;
  const fimPagina = Math.min(paginaAtual * USUARIOS_POR_PAGINA, users.length);

  // Áreas extras de uma conta da equipe (modal de áreas)
  const [areasDe, setAreasDe] = useState<User | null>(null);
  const [areasSelecionadas, setAreasSelecionadas] = useState<string[]>([]);
  const [areasErro, setAreasErro] = useState<string | null>(null);
  const [salvandoAreas, setSalvandoAreas] = useState(false);

  const abrirAreas = (u: User) => {
    setAreasDe(u);
    setAreasSelecionadas((u.papeis ?? []).filter(p => p !== u.perfil));
    setAreasErro(null);
  };

  const alternarArea = (p: string) =>
    setAreasSelecionadas(prev => (prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]));

  const salvarAreas = async () => {
    if (!areasDe) return;
    setSalvandoAreas(true);
    setAreasErro(null);
    try {
      await api.definirPapeisLogin(areasDe.loginId, areasSelecionadas);
      setAreasDe(null);
      await loadUsers();
    } catch (err: any) {
      setAreasErro(err.message || 'Não foi possível salvar as áreas');
    } finally {
      setSalvandoAreas(false);
    }
  };

  // Carregar usuários
  // `silencioso`: atualização automática, sem o carregando e sem avisos de erro
  const loadUsers = async (silencioso = false) => {
    if (!user?.empresaId) {
      if (!silencioso) {
        setError('Empresa não identificada');
        setLoading(false);
      }
      return;
    }

    if (!silencioso) {
      setLoading(true);
      setError(null);
    }
    try {
      const data = await api.getUsers(user.empresaId);
      setUsers(data);
    } catch (err) {
      console.error('❌ Erro ao carregar usuários:', err);
      if (!silencioso) setError('Não foi possível carregar os usuários');
    } finally {
      if (!silencioso) setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [user]);

  useAutoRefresh(() => loadUsers(true), { topicos: ['usuarios'], intervaloMs: 30_000, pausado: showAddModal || removendo !== null });

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
    setNewUser({ username: '', password: '', confirmPassword: '', role: 'reception', extras: [] });
    setModalError(null);
    setShowPassword(false);
    setSenhaCriada(null);
  };

  // Trocar o papel principal: o extra que virou principal sai da lista, e perfis que não acumulam ficam sem extras
  const escolherPapelPrincipal = (role: UserRole) =>
    setNewUser(prev => ({
      ...prev,
      role,
      extras: PAPEIS_ACUMULAVEIS.includes(role) && role !== 'admin' ? prev.extras.filter(extra => extra !== role) : [],
    }));
  const alternarExtra = (role: UserRole) =>
    setNewUser(prev => ({ ...prev, extras: prev.extras.includes(role) ? prev.extras.filter(extra => extra !== role) : [...prev.extras, role] }));

  const regrasDaSenha = [
    { ok: newUser.password.length >= MINIMO_SENHA, texto: `Pelo menos ${MINIMO_SENHA} caracteres` },
    { ok: newUser.password.length > 0 && newUser.password === newUser.confirmPassword, texto: 'As duas senhas conferem' },
  ];
  const senhaValida = regrasDaSenha.every(regra => regra.ok);
  // O admin já acessa todas as áreas do buffet, então não há extras a escolher para ele
  const aceitaExtras = PAPEIS_ACUMULAVEIS.includes(newUser.role) && newUser.role !== 'admin';
  const extrasPossiveis = PAPEIS_ACUMULAVEIS.filter(role => role !== newUser.role);

  const handleAddUser = async () => {
    if (!newUser.username || !user?.empresaId) {
      setModalError('Informe o usuário (a parte do e-mail antes do @).');
      return;
    }
    if (!newUser.password) {
      setModalError('A senha é obrigatória. Digite uma ou use o botão Gerar.');
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

    if (newUser.password.length < MINIMO_SENHA) {
      setModalError(`A senha precisa ter no mínimo ${MINIMO_SENHA} caracteres.`);
      return;
    }
    if (newUser.password !== newUser.confirmPassword) {
      setModalError('As duas senhas não conferem.');
      return;
    }

    setSubmitting(true);
    setModalError(null);

    try {
      await api.createUser({
        email: `${newUser.username}@${emailDomain}`,
        senha: newUser.password,
        role: newUser.role,
        papeis: aceitaExtras ? newUser.extras : [],
        empresaId: user.empresaId
      });

      // Mostra o acesso criado para passar à pessoa e relê a lista (o retorno da criação não tem o formato das linhas)
      setSenhaCriada(newUser.password);
      void loadUsers(true);

    } catch (err: any) {
      console.error('❌ Erro ao criar usuário:', err);
      setModalError(err.message || 'Erro ao criar usuário. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = (id: string) => {
    const alvo = users.find(u => u.loginId === id);
    if (alvo) setRemovendo({ user: alvo, enviando: false, erro: null });
  };

  const confirmarRemocao = async () => {
    if (!removendo) return;
    const { user: alvo } = removendo;
    setRemovendo({ ...removendo, enviando: true, erro: null });
    try {
      await api.deleteUser(alvo.loginId);
      setUsers(prev => prev.filter(u => u.loginId !== alvo.loginId));
      setRemovendo(null);
    } catch (err) {
      console.error('❌ Erro ao remover usuário:', err);
      setRemovendo(atual => (atual ? { ...atual, enviando: false, erro: err instanceof Error && err.message ? err.message : 'Não foi possível remover o usuário. Tente novamente.' } : atual));
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
                        usuariosDaPagina.map(userData => {
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
                                  {(userData.papeis ?? []).slice(1).map(p => (
                                    <Badge key={p} variant="muted" className="mt-1 mr-1">{roleConfig[p].label}</Badge>
                                  ))}
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
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-surface transition-colors disabled:opacity-40"
                                    title={PAPEIS_ACUMULAVEIS.includes(userData.perfil) ? 'Áreas desta conta' : 'Esta conta não acumula áreas'}
                                    disabled={!PAPEIS_ACUMULAVEIS.includes(userData.perfil)}
                                    onClick={() => abrirAreas(userData)}
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
                  <div className="mt-4 pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-gray-500">
                      {inicioPagina}–{fimPagina} de {users.length} usuário(s)
                    </p>
                    {totalPaginas > 1 && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => setPagina(paginaAtual - 1)}
                          disabled={paginaAtual <= 1}
                        >
                          Anterior
                        </Button>
                        <span className="text-sm text-gray-400">
                          Página {paginaAtual} de {totalPaginas}
                        </span>
                        <Button
                          variant="secondary"
                          onClick={() => setPagina(paginaAtual + 1)}
                          disabled={paginaAtual >= totalPaginas}
                        >
                          Próxima
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </Card>

          {/* Áreas da conta: além do perfil principal, em quais outras áreas ela trabalha */}
          <Modal
            isOpen={Boolean(areasDe)}
            onClose={() => setAreasDe(null)}
            title={`Áreas de ${areasDe?.email ?? ''}`}
            size="md"
          >
            {areasDe && (
              <div className="space-y-4">
                <p className="text-sm text-gray-400">
                  Além de {roleConfig[areasDe.perfil].label}, esta conta pode trabalhar nestas áreas. Ela entra com o mesmo e-mail e escolhe a área depois do login.
                </p>
                <div className="space-y-2">
                  {PAPEIS_ACUMULAVEIS.filter(p => p !== areasDe.perfil).map(p => (
                    <label key={p} className="flex items-center gap-3 text-sm text-gray-200">
                      <input
                        type="checkbox"
                        checked={areasSelecionadas.includes(p)}
                        onChange={() => alternarArea(p)}
                      />
                      {roleConfig[p].label}
                    </label>
                  ))}
                </div>
                {areasErro && (
                  <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                    {areasErro}
                  </p>
                )}
                <div className="flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => setAreasDe(null)}>Cancelar</Button>
                  <Button variant="primary" onClick={salvarAreas} disabled={salvandoAreas}>
                    {salvandoAreas ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </div>
            )}
          </Modal>

          {/* Remover conta: confirmação */}
          <Modal
            isOpen={removendo !== null}
            onClose={() => { if (!removendo?.enviando) setRemovendo(null); }}
            title="Remover conta"
            size="md"
          >
            {removendo && (
              <div className="space-y-4">
                <p className="text-base text-gray-200">
                  Remover a conta <strong className="text-white">{removendo.user.email}</strong>
                  {roleConfig[removendo.user.perfil] ? ` (${roleConfig[removendo.user.perfil].label})` : ''}?
                </p>
                <ul className="list-disc space-y-1 pl-6 text-sm text-gray-300">
                  <li>Quem usa essa conta perde o acesso na hora.</li>
                  <li>Esta ação não pode ser desfeita: para voltar, é preciso criar a conta de novo.</li>
                </ul>
                {removendo.erro && (
                  <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{removendo.erro}</p>
                )}
                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="ghost" disabled={removendo.enviando} onClick={() => setRemovendo(null)}>Cancelar</Button>
                  <Button variant="danger" disabled={removendo.enviando} onClick={() => void confirmarRemocao()}>
                    {removendo.enviando ? 'Removendo...' : 'Remover conta'}
                  </Button>
                </div>
              </div>
            )}
          </Modal>

          {/* Add User Modal */}
          <Modal
            isOpen={showAddModal}
            onClose={closeAddModal}
            title={senhaCriada ? 'Usuário criado' : 'Criar Novo Usuário'}
            size="xl"
          >
            {senhaCriada ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-success/30 bg-success/10 p-4">
                  <p className="font-semibold text-white">{newUser.username}@{emailDomain} foi criado</p>
                  <p className="mt-1 text-sm text-gray-300">Passe o acesso abaixo para a pessoa. A senha não aparece de novo depois que você fechar esta janela.</p>
                </div>
                <dl className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-gray-500">E-mail (login)</dt>
                    <dd className="font-mono text-white">{newUser.username}@{emailDomain}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-gray-500">Senha</dt>
                    <dd className="font-mono text-lg text-white">{senhaCriada}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-gray-500">Papéis</dt>
                    <dd className="text-white">
                      {roleConfig[newUser.role].label}
                      {aceitaExtras && newUser.extras.length > 0 && <span className="text-gray-300"> + {newUser.extras.map(extra => roleConfig[extra].label).join(', ')}</span>}
                    </dd>
                  </div>
                </dl>
                <div className="flex justify-end">
                  <Button variant="primary" onClick={closeAddModal}>Concluir</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid gap-5 lg:grid-cols-2">
                  {/* Acesso */}
                  <fieldset className="space-y-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                    <legend className="px-1 text-xs font-bold uppercase tracking-wider text-primary-300">Acesso</legend>
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

                    <div>
                      <div className="flex items-end gap-2">
                        <div className="min-w-0 flex-1">
                          <Input
                            label="Senha *"
                            placeholder={`Mínimo ${MINIMO_SENHA} caracteres`}
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            value={newUser.password}
                            onChange={e => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                          />
                        </div>
                        <Button type="button" variant="ghost" className="mb-0.5 border border-border" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="mb-0.5 border border-border"
                          onClick={() => { const nova = gerarSenha(); setNewUser(prev => ({ ...prev, password: nova, confirmPassword: nova })); setShowPassword(true); }}
                        >
                          <Wand2 size={16} className="mr-1.5" />
                          Gerar
                        </Button>
                      </div>
                    </div>
                    <Input
                      label="Repita a senha *"
                      placeholder="Digite a senha de novo"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={newUser.confirmPassword}
                      onChange={e => setNewUser(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    />
                    <ul className="space-y-1" aria-live="polite">
                      {regrasDaSenha.map(regra => (
                        <li key={regra.texto} className={`flex items-center gap-2 text-xs ${regra.ok ? 'text-success' : 'text-gray-500'}`}>
                          <Check size={13} className={regra.ok ? 'opacity-100' : 'opacity-30'} />
                          {regra.texto}
                        </li>
                      ))}
                    </ul>
                  </fieldset>

                  {/* Papéis */}
                  <fieldset className="space-y-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                    <legend className="px-1 text-xs font-bold uppercase tracking-wider text-primary-300">Papel principal *</legend>
                    <p className="text-xs text-gray-500">É a área que abre quando a pessoa entra no sistema.</p>
                    <div className="space-y-3">
                      {GRUPOS_DE_PAPEL.map(grupo => (
                        <div key={grupo.titulo}>
                          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">{grupo.titulo}</p>
                          <div role="radiogroup" aria-label={`Papel principal: ${grupo.titulo}`} className="grid gap-1.5 sm:grid-cols-2">
                            {grupo.papeis.map(role => {
                              const ativo = newUser.role === role;
                              return (
                                <button
                                  key={role}
                                  type="button"
                                  role="radio"
                                  aria-checked={ativo}
                                  onClick={() => escolherPapelPrincipal(role)}
                                  className={`rounded-lg border px-3 py-2 text-left transition-colors ${ativo ? 'border-primary bg-primary/15' : 'border-white/10 bg-white/[0.03] hover:border-white/25'}`}
                                >
                                  <span className="block text-sm font-semibold text-white">{roleConfig[role].label}</span>
                                  <span className="block text-xs text-gray-400">{roleConfig[role].description}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </fieldset>
                </div>

                {/* Extras */}
                <fieldset className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                  <legend className="px-1 text-xs font-bold uppercase tracking-wider text-primary-300">Papéis extras (opcional)</legend>
                  {newUser.role === 'admin' ? (
                    <p className="text-sm text-gray-400">O administrador já acessa todas as áreas do buffet, então não há extras para escolher.</p>
                  ) : !aceitaExtras ? (
                    <p className="text-sm text-gray-400">{roleConfig[newUser.role].label} é um acesso próprio e não acumula outras áreas.</p>
                  ) : (
                    <>
                      <p className="mb-2 text-xs text-gray-500">Além de {roleConfig[newUser.role].label}, a pessoa também poderá abrir estas áreas (aparecem em "Outras áreas" no menu).</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {extrasPossiveis.map(role => {
                          const marcado = newUser.extras.includes(role);
                          return (
                            <label key={role} className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 transition-colors ${marcado ? 'border-primary bg-primary/10' : 'border-white/10 bg-white/[0.03] hover:border-white/25'}`}>
                              <input type="checkbox" checked={marcado} onChange={() => alternarExtra(role)} className="mt-1 h-4 w-4 cursor-pointer accent-primary" />
                              <span>
                                <span className="block text-sm font-semibold text-white">{roleConfig[role].label}</span>
                                <span className="block text-xs text-gray-400">{roleConfig[role].description}</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </>
                  )}
                  <p className="mt-3 text-xs text-gray-400">
                    Resumo: entra como <strong className="text-white">{roleConfig[newUser.role].label}</strong>
                    {newUser.role === 'admin' ? ' com acesso a todas as áreas' : aceitaExtras && newUser.extras.length > 0 ? <> e também poderá usar <strong className="text-white">{newUser.extras.map(extra => roleConfig[extra].label).join(', ')}</strong></> : ' e só poderá usar esta área'}.
                  </p>
                </fieldset>

                {modalError && (
                  <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                    {modalError}
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="ghost" onClick={closeAddModal} disabled={submitting}>
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleAddUser}
                    disabled={!newUser.username || !senhaValida || !emailDomain || submitting}
                  >
                    {submitting ? (
                      <><Loader2 size={16} className="mr-2 animate-spin" /> Criando...</>
                    ) : (
                      'Criar Usuário'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </Modal>
        </main>
      </div>
    </div>
  );
}
