import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader2, ShieldCheck, Check } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import PulynLogo from '../../components/ui/PulynLogo';

const MINIMO_SENHA = 6;

const INICIO_DA_AREA: Record<string, string> = {
  admin: '/admin', reception: '/reception', game_master: '/game-master', display: '/display',
  family: '/family', master: '/master', kiosk: '/reception/kiosk', score_kiosk: '/score-kiosk',
};

// Primeiro acesso: o master cadastrou o buffet com uma senha provisória, que precisa ser trocada antes de usar o sistema.
export default function TrocarSenhaPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, concluirTrocaDeSenha, logout } = useAuth();

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  // Depois de recarregar a página o início da área vem do papel (o token não guarda o redirect do admin)
  const inicio = (user?.redirect && user.redirect !== '/login' ? user.redirect : INICIO_DA_AREA[user?.role ?? '']) || '/login';
  // Quem não precisa trocar a senha não tem o que fazer aqui
  if (!user?.trocarSenha) return <Navigate to={inicio} replace />;

  const regras = [
    { ok: novaSenha.length >= MINIMO_SENHA, texto: `Pelo menos ${MINIMO_SENHA} caracteres` },
    { ok: novaSenha.length > 0 && novaSenha !== senhaAtual, texto: 'Diferente da senha provisória' },
    { ok: novaSenha.length > 0 && novaSenha === confirmacao, texto: 'As duas senhas novas conferem' },
  ];
  const valido = regras.every((regra) => regra.ok) && senhaAtual.length > 0;

  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!valido || enviando) return;
    setEnviando(true);
    setErro(null);
    try {
      const resposta = await api.alterarSenha(senhaAtual, novaSenha);
      concluirTrocaDeSenha(resposta.token);
      navigate(inicio, { replace: true });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível trocar a senha. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  const campo = (rotulo: string, valor: string, definir: (v: string) => void, autoComplete: string) => (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-white">{rotulo}</label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6B8BA4]" />
        <input
          type={mostrar ? 'text' : 'password'}
          value={valor}
          onChange={(e) => { definir(e.target.value); setErro(null); }}
          autoComplete={autoComplete}
          className="input-dark w-full rounded-lg py-3 pl-11 pr-4 text-white outline-none transition-all duration-200"
        />
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0D1B2A] px-6 py-12">
      <div className="w-full max-w-md animate-slide-up">
        <div className="mb-6 flex justify-center"><PulynLogo size="lg" clickable={false} /></div>
        <div className="mb-2 flex items-center gap-2 text-primary-300">
          <ShieldCheck size={22} />
          <span className="text-sm font-semibold uppercase tracking-wider">Primeiro acesso</span>
        </div>
        <h1 className="mb-2 font-display text-3xl font-bold text-white">Crie sua senha</h1>
        <p className="mb-6 text-[#6B8BA4]">
          Você entrou com a senha provisória que recebeu da Pulyn. Escolha uma senha só sua para continuar.
        </p>

        {erro && (
          <div role="alert" className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{erro}</div>
        )}

        <form onSubmit={enviar} className="space-y-5">
          {campo('Senha provisória', senhaAtual, setSenhaAtual, 'current-password')}
          {campo('Nova senha', novaSenha, setNovaSenha, 'new-password')}
          {campo('Repita a nova senha', confirmacao, setConfirmacao, 'new-password')}

          <button
            type="button"
            onClick={() => setMostrar((atual) => !atual)}
            className="flex items-center gap-2 text-sm text-[#6B8BA4] transition-colors hover:text-white"
          >
            {mostrar ? <EyeOff size={16} /> : <Eye size={16} />}
            {mostrar ? 'Ocultar senhas' : 'Mostrar senhas'}
          </button>

          <ul className="space-y-1.5" aria-live="polite">
            {regras.map((regra) => (
              <li key={regra.texto} className={`flex items-center gap-2 text-sm ${regra.ok ? 'text-success' : 'text-[#6B8BA4]'}`}>
                <Check size={14} className={regra.ok ? 'opacity-100' : 'opacity-30'} />
                {regra.texto}
              </li>
            ))}
          </ul>

          <button
            type="submit"
            disabled={!valido || enviando}
            className="w-full rounded-lg py-3 text-base font-semibold text-white transition-all duration-200 hover:shadow-lg hover:shadow-[#1E9BD7]/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #1E9BD7, #29B6F6)' }}
          >
            {enviando ? (
              <span className="flex items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin" />Salvando...</span>
            ) : 'Salvar e entrar'}
          </button>
        </form>

        <button type="button" onClick={logout} className="mt-5 w-full text-center text-sm text-[#6B8BA4] transition-colors hover:text-white">
          Sair
        </button>
      </div>
    </div>
  );
}
