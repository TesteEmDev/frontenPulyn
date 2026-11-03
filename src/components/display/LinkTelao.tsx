import { useEffect, useState } from 'react';
import { Tv, Copy, RefreshCw, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import Card from '../ui/Card';
import Button from '../ui/Button';

// Link para abrir o telão (TV) sem login. Quem tem o link vê o telão deste buffet, então ele só aparece para o admin.
export default function LinkTelao() {
  const [codigo, setCodigo] = useState<string | null>(null);
  const [erro, setErro] = useState('');
  const [trocando, setTrocando] = useState(false);

  useEffect(() => {
    let vivo = true;
    api.getCodigoTelao()
      .then((c) => { if (vivo) setCodigo(c); })
      .catch((e) => { if (vivo) setErro(e.message || 'Não foi possível carregar o link do telão'); });
    return () => { vivo = false; };
  }, []);

  const link = codigo ? `${window.location.origin}/telao/${codigo}` : '';

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Link do telão copiado');
    } catch {
      toast.error('Não foi possível copiar. Selecione o link e copie à mão.');
    }
  };

  const trocar = async () => {
    if (!window.confirm('Gerar um novo link? O link atual deixa de abrir o telão. Telões já abertos continuam até a sessão deles vencer (7 dias).')) return;
    setTrocando(true);
    try {
      setCodigo(await api.renovarCodigoTelao());
      toast.success('Novo link gerado');
    } catch (e: any) {
      toast.error(e.message || 'Não foi possível gerar um novo link');
    } finally {
      setTrocando(false);
    }
  };

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Tv size={20} className="text-accent" />
        <h2 className="font-display text-lg text-white">Link do telão</h2>
      </div>
      <p className="text-sm text-gray-400 mb-3">
        Abra este link no navegador da TV: o telão entra sozinho, sem usuário e senha, e mostra só o seu buffet.
        Não compartilhe o link fora da equipe.
      </p>
      {erro && <p role="alert" className="text-sm text-danger">{erro}</p>}
      {!erro && !codigo && (
        <p className="flex items-center gap-2 text-sm text-gray-400"><Loader2 size={16} className="animate-spin" /> Carregando...</p>
      )}
      {codigo && (
        <div className="space-y-3">
          <input
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            aria-label="Link do telão"
            className="w-full rounded-lg border border-border bg-surface/50 px-3 py-2 font-mono text-xs text-white"
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={copiar}>
              <Copy size={16} className="mr-1.5" />
              Copiar link
            </Button>
            <Button variant="ghost" className="border border-border" onClick={trocar} disabled={trocando}>
              {trocando ? <Loader2 size={16} className="mr-1.5 animate-spin" /> : <RefreshCw size={16} className="mr-1.5" />}
              Gerar novo link
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
