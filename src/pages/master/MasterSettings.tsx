import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Settings, UserRound, KeyRound, Loader2, CheckCircle2 } from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { api } from '../../services/api';
import { useAuth, roleLabels } from '../../hooks/useAuth';
import { masterNavItems } from './masterNav';

const MINIMO_SENHA = 6;

// Configurações da conta do master: os dados dele ficam aqui (e não na lista de clientes) e a senha se troca por aqui.
export default function MasterSettings() {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const user = useAuth((state) => state.user);
  const concluirTrocaDeSenha = useAuth((state) => state.concluirTrocaDeSenha);

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);

  const regras = [
    { ok: novaSenha.length >= MINIMO_SENHA, texto: `Pelo menos ${MINIMO_SENHA} caracteres` },
    { ok: novaSenha.length > 0 && novaSenha !== senhaAtual, texto: 'Diferente da senha atual' },
    { ok: novaSenha.length > 0 && novaSenha === confirmacao, texto: 'As duas senhas novas conferem' },
  ];
  const valido = senhaAtual.length > 0 && regras.every((regra) => regra.ok);

  const mudar = (definir: (valor: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    definir(e.target.value);
    setErro('');
    setSucesso(false);
  };

  const trocarSenha = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!valido || enviando) return;
    setEnviando(true);
    setErro('');
    setSucesso(false);
    try {
      const resposta = await api.alterarSenha(senhaAtual, novaSenha);
      // O servidor devolve o token novo da sessão: guarda para continuar logado
      concluirTrocaDeSenha(resposta.token);
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmacao('');
      setSucesso(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível trocar a senha. Tente novamente.');
    } finally {
      setEnviando(false);
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
        <div className="max-w-3xl mx-auto">
          <PageHeader title="Configurações" description="Sua conta de master da plataforma" icon={<Settings size={28} />} />

          <div className="space-y-6">
            <Card>
              <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary-300">
                <UserRound size={16} /> Minha conta
              </h2>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="min-w-0">
                  <dt className="mb-1 text-xs text-gray-500">Nome</dt>
                  <dd className="break-words text-sm text-white">{user?.name || '—'}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="mb-1 text-xs text-gray-500">E-mail (login)</dt>
                  <dd className="break-words text-sm text-white">{user?.email || '—'}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="mb-1 text-xs text-gray-500">Perfil</dt>
                  <dd className="text-sm text-white">{roleLabels[user?.role ?? ''] ?? user?.role ?? '—'}</dd>
                </div>
              </dl>
            </Card>

            <Card>
              <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary-300">
                <KeyRound size={16} /> Alterar senha
              </h2>
              <form onSubmit={trocarSenha} className="max-w-md space-y-4">
                <Input label="Senha atual" type="password" value={senhaAtual} onChange={mudar(setSenhaAtual)} autoComplete="current-password" />
                <Input label="Nova senha" type="password" value={novaSenha} onChange={mudar(setNovaSenha)} autoComplete="new-password" />
                <Input label="Repita a nova senha" type="password" value={confirmacao} onChange={mudar(setConfirmacao)} autoComplete="new-password" />
                <ul className="space-y-1 text-xs">
                  {regras.map((regra) => (
                    <li key={regra.texto} className={regra.ok ? 'text-success' : 'text-gray-500'}>{regra.ok ? '✓' : '•'} {regra.texto}</li>
                  ))}
                </ul>
                {erro && <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>}
                {sucesso && (
                  <p role="status" className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
                    <CheckCircle2 size={16} /> Senha alterada com sucesso.
                  </p>
                )}
                <Button type="submit" variant="primary" disabled={!valido || enviando}>
                  {enviando && <Loader2 size={16} className="mr-2 animate-spin" />}
                  {enviando ? 'Salvando...' : 'Alterar senha'}
                </Button>
              </form>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
