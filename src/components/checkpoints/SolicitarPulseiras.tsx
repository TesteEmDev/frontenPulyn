import { useState } from 'react';
import { PackagePlus, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import Select from '../ui/Select';

const TIPOS = [
  { value: 'NFC', label: 'NFC/RFID' },
  { value: 'UHF', label: 'UHF longa distância' },
];

const MAX_LINHAS = 12;

interface Linha {
  chave: number;
  tipo: string;
  quantidade: string;
}

let proximaChave = 1;
const novaLinha = (): Linha => ({ chave: proximaChave++, tipo: 'NFC', quantidade: '1' });

/** Botão "Solicitar pulseiras" do admin: abre um modal com tipo e quantidade e envia o pedido para o suporte do master. */
export default function SolicitarPulseiras() {
  const [aberto, setAberto] = useState(false);
  const [linhas, setLinhas] = useState<Linha[]>(() => [novaLinha()]);
  const [observacao, setObservacao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const abrir = () => {
    setLinhas([novaLinha()]);
    setObservacao('');
    setErro(null);
    setAberto(true);
  };

  const fechar = () => { if (!enviando) setAberto(false); };

  const mudar = (chave: number, campos: Partial<Linha>) =>
    setLinhas((atual) => atual.map((l) => (l.chave === chave ? { ...l, ...campos } : l)));

  const enviar = async () => {
    const itens = linhas.map((l) => ({ tipo: l.tipo, quantidade: Number(l.quantidade) }));
    if (itens.some((i) => !Number.isInteger(i.quantidade) || i.quantidade < 1)) {
      setErro('Informe uma quantidade de 1 ou mais em cada linha.');
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      await api.solicitarPulseiras(itens, observacao.trim());
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

      <Modal isOpen={aberto} onClose={fechar} title="Solicitar pulseiras" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Diga quantas pulseiras você precisa e de que tipo. O pedido vai para o suporte, que envia as pulseiras para a sua conta. Você aceita o que chegar nesta tela.
          </p>

          <div className="space-y-3">
            {linhas.map((linha) => (
              <div key={linha.chave} className="flex flex-wrap items-end gap-3 sm:flex-nowrap">
                <div className="min-w-[8rem] flex-1">
                  <Select
                    label="Tipo"
                    options={TIPOS}
                    value={linha.tipo}
                    onChange={(e) => mudar(linha.chave, { tipo: e.target.value })}
                  />
                </div>
                <div className="w-28">
                  <Input
                    label="Quantidade"
                    type="number"
                    min={1}
                    max={5000}
                    value={linha.quantidade}
                    onChange={(e) => mudar(linha.chave, { quantidade: e.target.value })}
                  />
                </div>
                {linhas.length > 1 && (
                  <button
                    type="button"
                    aria-label="Remover esta linha"
                    onClick={() => setLinhas((atual) => atual.filter((l) => l.chave !== linha.chave))}
                    className="mb-1 rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-danger"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {linhas.length < MAX_LINHAS && (
            <Button variant="ghost" size="sm" onClick={() => setLinhas((atual) => [...atual, novaLinha()])}>
              <Plus size={16} className="mr-1" />
              Adicionar outra linha
            </Button>
          )}

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
