import { useState } from 'react';
import { PackagePlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';

/** Botão "Solicitar pulseiras" do admin: abre um modal com tipo e quantidade e envia o pedido para o suporte do master. */
export default function SolicitarPulseiras() {
  const [aberto, setAberto] = useState(false);
  const [quantidade, setQuantidade] = useState('');
  const [observacao, setObservacao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const abrir = () => {
    setQuantidade('');
    setObservacao('');
    setErro(null);
    setAberto(true);
  };

  const fechar = () => { if (!enviando) setAberto(false); };

  const enviar = async () => {
    const total = Number(quantidade);
    if (!Number.isInteger(total) || total < 1 || total > 5000) {
      setErro('Informe uma quantidade de 1 a 5.000 pulseiras.');
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      await api.solicitarPulseiras(total, observacao.trim());
      toast.success('Solicitação enviada ao suporte. As pulseiras aparecem aqui, em "Aguardando seu aceite", quando forem enviadas para você.');
      setAberto(false);
    } catch (err) {
      setErro(err instanceof Error && err.message ? err.message : 'Não foi possível enviar a solicitação. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <Button variant="primary" onClick={abrir}>
        <PackagePlus size={18} className="mr-2" />
        Solicitar pulseiras
      </Button>

      <Modal isOpen={aberto} onClose={fechar} title="Solicitar pulseiras" size="md">
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Diga quantas pulseiras você precisa. O pedido vai para o suporte, que envia as pulseiras para a sua conta. Você aceita o que chegar nesta tela.
          </p>

          <div className="w-40">
            <Input
              label="Quantidade"
              type="number"
              min={1}
              max={5000}
              placeholder="Ex.: 100"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
            />
          </div>

          <div className="w-full">
            <label htmlFor="sp-obs" className="mb-1.5 block text-sm font-body font-medium text-gray-300">Observação (opcional)</label>
            <textarea
              id="sp-obs"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="Ex.: preciso até sexta, para o evento de sábado"
              className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-white placeholder-gray-500 font-body transition-colors duration-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>

          {erro && <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" disabled={enviando} onClick={fechar}>Cancelar</Button>
            <Button variant="primary" disabled={enviando} onClick={() => void enviar()}>
              {enviando ? 'Enviando...' : 'Enviar solicitação'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
