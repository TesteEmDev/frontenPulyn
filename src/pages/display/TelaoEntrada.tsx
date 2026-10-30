import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Loader2, Tv } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const REPETIR_SEM_CONEXAO_MS = 5000;

// Entrada do telão sem login: /telao/<código>. Troca o código por uma sessão de telão e abre /display.
// A TV pode ligar antes do Wi-Fi: sem conexão a página tenta de novo sozinha; código recusado mostra o aviso.
export default function TelaoEntrada() {
  const { codigo = '' } = useParams();
  const entrarComoTelao = useAuth((state) => state.entrarComoTelao);
  const [pronto, setPronto] = useState(false);
  const [aviso, setAviso] = useState('');
  const [recusado, setRecusado] = useState(false);

  useEffect(() => {
    let vivo = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tentar = async () => {
      const resultado = await entrarComoTelao(codigo);
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
  }, [codigo, entrarComoTelao]);

  if (pronto) return <Navigate to="/display" replace />;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-dark px-6 text-center text-white">
      <Tv size={56} className="text-primary-300" />
      {recusado ? (
        <>
          <h1 className="font-display text-2xl">Não foi possível abrir o telão</h1>
          <p className="max-w-md text-gray-400">{aviso}. Peça um link novo ao administrador do buffet.</p>
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
