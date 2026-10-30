import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Loader2, Tv } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const REPETIR_SEM_CONEXAO_MS = 5000;
const PAPEIS_DA_EQUIPE = ['admin', 'reception', 'game_master'];

// Entrada do telão sem tela de login. Dois caminhos:
//  - /telao/<código>: link do telão (TV própria). Troca o código por uma sessão de telão e abre /display.
//  - /telao: aberto pela equipe logada (botão "Abrir telão" da recepção). Pede a sessão de telão do mesmo buffet e a guarda
//    só nesta aba, então a recepção continua logada nas outras abas.
// A TV pode ligar antes do Wi-Fi: sem conexão a página tenta de novo sozinha; link recusado mostra o aviso.
export default function TelaoEntrada() {
  const { codigo = '' } = useParams();
  const { user, isAuthenticated, entrarComoTelao, abrirTelaoDaEquipe } = useAuth();
  const papel = isAuthenticated ? user?.role : undefined;
  const [pronto, setPronto] = useState(false);
  const [aviso, setAviso] = useState('');
  const [recusado, setRecusado] = useState(false);

  const codigoGuardado = typeof window !== 'undefined' ? localStorage.getItem('telaoCodigo') : null;
  const pelaEquipe = !codigo && papel !== undefined && PAPEIS_DA_EQUIPE.includes(papel);

  useEffect(() => {
    if (!codigo && !pelaEquipe) return;
    let vivo = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tentar = async () => {
      const resultado = codigo
        ? await entrarComoTelao(codigo)
        : { ...(await abrirTelaoDaEquipe()), semConexao: false };
      if (!vivo) return;
      if (resultado.success) {
        setPronto(true);
      } else if (resultado.semConexao) {
        setAviso('Sem conexão com o servidor. Tentando de novo...');
        timer = setTimeout(tentar, REPETIR_SEM_CONEXAO_MS);
      } else {
        setRecusado(true);
        setAviso(resultado.error || 'Link do telão inválido ou desativado');
      }
    };
    tentar();

    return () => {
      vivo = false;
      if (timer) clearTimeout(timer);
    };
    // pelaEquipe vira falso quando a sessão passa a ser a de telão; o efeito não deve rodar de novo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo]);

  if (pronto || (!codigo && papel === 'display')) return <Navigate to="/display" replace />;

  // Sem link e sem sessão: a TV que já abriu por link volta pelo código guardado; o resto precisa entrar antes
  if (!codigo && !pelaEquipe) {
    if (codigoGuardado) return <Navigate to={`/telao/${encodeURIComponent(codigoGuardado)}`} replace />;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-dark px-6 text-center text-white">
        <Tv size={56} className="text-primary-300" />
        <h1 className="font-display text-2xl">Abra o telão pela recepção</h1>
        <p className="max-w-md text-gray-400">
          Entre como recepção, recreação ou administrador e use o botão &quot;Abrir telão&quot;, ou use o link do telão
          que o administrador copia em Configurações.
        </p>
        <Link to="/login" className="rounded-lg bg-primary-500 px-5 py-2 font-semibold text-white">Entrar</Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-dark px-6 text-center text-white">
      <Tv size={56} className="text-primary-300" />
      {recusado ? (
        <>
          <h1 className="font-display text-2xl">Não foi possível abrir o telão</h1>
          <p className="max-w-md text-gray-400">{aviso}. {codigo ? 'Peça um link novo ao administrador do buffet.' : 'Feche esta aba e tente de novo pela recepção.'}</p>
        </>
      ) : (
        <>
          <Loader2 size={32} className="animate-spin text-primary-300" />
          <p className="text-gray-300">{aviso || 'Abrindo o telão...'}</p>
        </>
      )}
    </div>
  );
}
