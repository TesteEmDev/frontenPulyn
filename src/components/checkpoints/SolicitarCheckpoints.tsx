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

interface Linha {
  chave: number;
  tipo: string;
  quantidade: string;
}

let proximaChave = 1;
const novaLinha = (tipo = 'NFC'): Linha => ({ chave: proximaChave++, tipo, quantidade: '1' });

/** Botão "Solicitar checkpoints" do admin: abre um modal com tipo e quantidade e envia o pedido para o suporte do master. */
export default function SolicitarCheckpoints() {
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

  // Tipos que ainda não têm linha: o botão de adicionar só aparece enquanto sobrar algum
  const livres = TIPOS.filter((t) => !linhas.some((l) => l.tipo === t.value));

  const enviar = async () => {
    const itens = linhas.map((l) => ({ tipo: l.tipo, quantidade: Number(l.quantidade) }));
    if (itens.some((i) => !Number.isInteger(i.quantidade) || i.quantidade < 1)) {
      setErro('Informe uma quantidade de 1 ou mais em cada linha.');
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      await api.solicitarCheckpoints(itens, observacao.trim());
      toast.success('Solicitação enviada ao suporte. Os checkpoints aparecem aqui quando forem enviados para você.');
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
        Solicitar checkpoints
      </Button>

      <Modal isOpen={aberto} onClose={fechar} title="Solicitar checkpoints" size="md">
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Diga quantos checkpoints de cada tipo você precisa. O pedido vai para o suporte, que envia os checkpoints para a sua conta.
          </p>

          <div className="space-y-3">
            {linhas.map((linha) => (
              <div key={linha.chave} className="flex items-end gap-3">
                <div className="flex-1">
                  <Select
                    label="Tipo"
                    options={TIPOS.filter((t) => t.value === linha.tipo || !linhas.some((l) => l.tipo === t.value))}
                    value={linha.tipo}
                    onChange={(e) => mudar(linha.chave, { tipo: e.target.value })}
                  />
                </div>
                <div className="w-28">
                  <Input
                    label="Quantidade"
                    type="number"
                    min={1}
                    max={500}
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

          {livres.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setLinhas((atual) => [...atual, novaLinha(livres[0].value)])}>
              <Plus size={16} className="mr-1" />
              Adicionar outro tipo
            </Button>
          )}

          <div className="w-full">
            <label htmlFor="sc-obs" className="mb-1.5 block text-sm font-body font-medium text-gray-300">Observação (opcional)</label>
            <textarea
              id="sc-obs"
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
