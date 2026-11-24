import { useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Settings, UserRound, ShieldCheck, Mail, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { api } from '../../services/api';
import { useAuth, roleLabels } from '../../hooks/useAuth';
import { masterNavItems } from './masterNav';

const MINIMO_SENHA = 6;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Aba = 'perfil' | 'seguranca';
const ABAS: { id: Aba; rotulo: string; icone: React.ReactNode }[] = [
  { id: 'perfil', rotulo: 'Perfil', icone: <UserRound size={16} /> },
  { id: 'seguranca', rotulo: 'Segurança', icone: <ShieldCheck size={16} /> },
];

// Força da senha de 0 a 4: tamanho e variedade de caracteres (só orienta, quem barra é o mínimo de caracteres)
function forcaDaSenha(senha: string): { nivel: number; rotulo: string; cor: string } {
  if (!senha) return { nivel: 0, rotulo: '', cor: '#6B8BA4' };
  let pontos = 0;
  if (senha.length >= MINIMO_SENHA) pontos += 1;
  if (senha.length >= 10) pontos += 1;
  if (/[a-z]/.test(senha) && /[A-Z]/.test(senha)) pontos += 1;
  if (/\d/.test(senha) && /[^A-Za-z0-9]/.test(senha)) pontos += 1;
  else if (/\d/.test(senha) || /[^A-Za-z0-9]/.test(senha)) pontos += 0.5;
  const nivel = Math.max(1, Math.min(4, Math.round(pontos)));
  return [
    { nivel, rotulo: 'Fraca', cor: '#EF4444' },
    { nivel, rotulo: 'Razoável', cor: '#F59E0B' },
    { nivel, rotulo: 'Boa', cor: '#1E9BD7' },
    { nivel, rotulo: 'Forte', cor: '#22C55E' },
  ][nivel - 1];
}

function Aviso({ tipo, children }: { tipo: 'erro' | 'ok'; children: React.ReactNode }) {
  const erro = tipo === 'erro';
  return (
    <p
      role={erro ? 'alert' : 'status'}
      className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${erro ? 'border-danger/30 bg-danger/10 text-danger' : 'border-success/30 bg-success/10 text-success'}`}
    >
      {erro ? <AlertCircle size={16} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0" />}
      <span>{children}</span>
    </p>
  );
}

// Campo de senha com botão de mostrar/ocultar
function CampoSenha({ label, value, onChange, autoComplete, error }: {
  label: string; value: string; onChange: (valor: string) => void; autoComplete: string; error?: string;
}) {
  const [visivel, setVisivel] = useState(false);
  return (
    <div className="flex items-end gap-2">
      <div className="min-w-0 flex-1">
        <Input label={label} type={visivel ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} error={error} />
      </div>
      <Button
        type="button"
        variant="ghost"
        className="mb-0.5 border border-border"
        onClick={() => setVisivel((atual) => !atual)}
        title={visivel ? 'Ocultar senha' : 'Mostrar senha'}
        aria-label={`${visivel ? 'Ocultar' : 'Mostrar'} ${label.toLowerCase()}`}
      >
        {visivel ? <EyeOff size={16} /> : <Eye size={16} />}
      </Button>
    </div>
  );
}

function AbaPerfil() {
  const user = useAuth((state) => state.user);
  const atualizarPerfil = useAuth((state) => state.atualizarPerfil);
  const [nome, setNome] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [senhaAtual, setSenhaAtual] = useState('');
  const [erros, setErros] = useState<{ nome?: string; email?: string; senhaAtual?: string }>({});
  const [erroGeral, setErroGeral] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [salvando, setSalvando] = useState(false);

  const nomeMudou = nome.trim() !== (user?.name ?? '');
  const emailMudou = email.trim().toLowerCase() !== (user?.email ?? '').toLowerCase();
  const alterado = nomeMudou || emailMudou;

  const mudar = (definir: (valor: string) => void, campo: 'nome' | 'email' | 'senhaAtual') => (valor: string) => {
    definir(valor);
    setErros((atual) => ({ ...atual, [campo]: undefined }));
    setErroGeral('');
    setSucesso('');
  };

  const descartar = () => {
    setNome(user?.name ?? '');
    setEmail(user?.email ?? '');
    setSenhaAtual('');
    setErros({});
    setErroGeral('');
  };

  const salvar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!alterado || salvando) return;
    const encontrados: typeof erros = {};
    if (!nome.trim()) encontrados.nome = 'Informe o nome';
    if (!email.trim()) encontrados.email = 'Informe o e-mail';
    else if (!EMAIL_PATTERN.test(email.trim())) encontrados.email = 'E-mail inválido';
    if (emailMudou && !senhaAtual) encontrados.senhaAtual = 'Informe a senha atual para trocar o e-mail';
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    setSalvando(true);
    setErroGeral('');
    setSucesso('');
    try {
      const resposta = await api.atualizarPerfil({
        ...(nomeMudou ? { nome: nome.trim() } : {}),
        ...(emailMudou ? { email: email.trim(), senhaAtual } : {}),
      });
      atualizarPerfil(resposta.token, { name: resposta.user.name, email: resposta.user.email });
      setNome(resposta.user.name);
      setEmail(resposta.user.email);
      setSenhaAtual('');
      setSucesso(emailMudou ? 'Perfil atualizado. Use o novo e-mail na próxima vez que entrar.' : 'Perfil atualizado.');
    } catch (erro) {
      setErroGeral(erro instanceof Error ? erro.message : 'Não foi possível salvar o perfil.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <form onSubmit={salvar} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Nome de exibição" value={nome} onChange={(e) => mudar(setNome, 'nome')(e.target.value)} maxLength={100} placeholder="Como você aparece no menu" error={erros.nome} />
        <Input label="E-mail (login)" type="email" value={email} onChange={(e) => mudar(setEmail, 'email')(e.target.value)} maxLength={100} autoComplete="email" error={erros.email} />
      </div>

      {emailMudou && (
        <div className="space-y-3 rounded-xl border border-warning/30 bg-warning/10 p-4">
          <p className="flex items-start gap-2 text-sm text-gray-200">
            <Mail size={16} className="mt-0.5 shrink-0 text-warning" />
            Você está trocando o e-mail com que entra no Pulyn. Confirme com a sua senha atual.
          </p>
          <div className="max-w-sm">
            <CampoSenha label="Senha atual" value={senhaAtual} onChange={mudar(setSenhaAtual, 'senhaAtual')} autoComplete="current-password" error={erros.senhaAtual} />
          </div>
        </div>
      )}

      {erroGeral && <Aviso tipo="erro">{erroGeral}</Aviso>}
      {sucesso && <Aviso tipo="ok">{sucesso}</Aviso>}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="primary" disabled={!alterado || salvando}>
          {salvando && <Loader2 size={16} className="mr-2 animate-spin" />}
          {salvando ? 'Salvando...' : 'Salvar alterações'}
        </Button>
        {alterado && !salvando && <Button type="button" variant="ghost" onClick={descartar}>Descartar</Button>}
      </div>
    </form>
  );
}

function AbaSeguranca() {
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
  const forca = forcaDaSenha(novaSenha);

  const mudar = (definir: (valor: string) => void) => (valor: string) => {
    definir(valor);
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
    <form onSubmit={trocarSenha} className="max-w-md space-y-4">
      <CampoSenha label="Senha atual" value={senhaAtual} onChange={mudar(setSenhaAtual)} autoComplete="current-password" />
      <CampoSenha label="Nova senha" value={novaSenha} onChange={mudar(setNovaSenha)} autoComplete="new-password" />
      {novaSenha && (
        <div aria-live="polite">
          <div className="flex gap-1.5" aria-hidden="true">
            {[1, 2, 3, 4].map((faixa) => (
              <span key={faixa} className="h-1.5 flex-1 rounded-full transition-colors" style={{ background: faixa <= forca.nivel ? forca.cor : 'rgba(255,255,255,0.08)' }} />
            ))}
          </div>
          <p className="mt-1 text-xs" style={{ color: forca.cor }}>Senha {forca.rotulo.toLowerCase()}</p>
        </div>
      )}
      <CampoSenha label="Repita a nova senha" value={confirmacao} onChange={mudar(setConfirmacao)} autoComplete="new-password" />
      <ul className="space-y-1 text-xs">
        {regras.map((regra) => (
          <li key={regra.texto} className={regra.ok ? 'text-success' : 'text-gray-500'}>{regra.ok ? '✓' : '•'} {regra.texto}</li>
        ))}
      </ul>
      <p className="text-xs text-gray-500">Ao trocar a senha, as suas outras sessões abertas são encerradas.</p>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {sucesso && <Aviso tipo="ok">Senha alterada com sucesso.</Aviso>}
      <Button type="submit" variant="primary" disabled={!valido || enviando}>
        {enviando && <Loader2 size={16} className="mr-2 animate-spin" />}
        {enviando ? 'Salvando...' : 'Alterar senha'}
      </Button>
    </form>
  );
}

// Configurações da conta do master: os dados dele ficam aqui (e não na lista de clientes).
export default function MasterSettings() {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const user = useAuth((state) => state.user);
  const [aba, setAba] = useState<Aba>('perfil');
  const botoes = useRef<Record<string, HTMLButtonElement | null>>({});

  // Setas esquerda/direita trocam de aba (padrão de abas acessíveis)
  const navegarAbas = (evento: React.KeyboardEvent) => {
    const direcao = evento.key === 'ArrowRight' ? 1 : evento.key === 'ArrowLeft' ? -1 : 0;
    if (!direcao) return;
    evento.preventDefault();
    const proxima = ABAS[(ABAS.findIndex((a) => a.id === aba) + direcao + ABAS.length) % ABAS.length];
    setAba(proxima.id);
    botoes.current[proxima.id]?.focus();
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

          <Card className="mb-6">
            <div className="flex items-center gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #1E9BD7, #29B6F6)' }}
                aria-hidden="true"
              >
                {(user?.name || user?.email || '?').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="break-words font-display text-lg text-white">{user?.name || '—'}</p>
                <p className="break-words text-sm text-gray-400">{user?.email}</p>
                <div className="mt-1.5"><Badge variant="primary">{roleLabels[user?.role ?? ''] ?? user?.role}</Badge></div>
              </div>
            </div>
          </Card>

          <div role="tablist" aria-label="Seções das configurações" onKeyDown={navegarAbas} className="mb-5 flex gap-1 border-b border-white/[0.08]">
            {ABAS.map((item) => {
              const ativa = aba === item.id;
              return (
                <button
                  key={item.id}
                  ref={(el) => { botoes.current[item.id] = el; }}
                  role="tab"
                  id={`aba-${item.id}`}
                  aria-selected={ativa}
                  aria-controls={`painel-${item.id}`}
                  tabIndex={ativa ? 0 : -1}
                  onClick={() => setAba(item.id)}
                  className={`-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 ${ativa ? 'border-primary text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
                >
                  {item.icone}
                  {item.rotulo}
                </button>
              );
            })}
          </div>

          <Card>
            <div role="tabpanel" id={`painel-${aba}`} aria-labelledby={`aba-${aba}`}>
              {aba === 'perfil' ? <AbaPerfil /> : <AbaSeguranca />}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
