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

const FINALIDADES = [
  { value: 'jogo', label: 'Jogo' },
  { value: 'pontuacao', label: 'Pontuação' },
  { value: 'recepcao', label: 'Recepção' },
];

const MAX_LINHAS = 12;

interface Linha {
  chave: number;
  tipo: string;
  finalidade: string;
  quantidade: string;
}

let proximaChave = 1;
const novaLinha = (): Linha => ({ chave: proximaChave++, tipo: 'NFC', finalidade: 'jogo', quantidade: '' });

/** Linhas preenchidas (quantidade informada); uma linha com quantidade inválida devolve o erro. */
function lerLinhas(linhas: Linha[], rotulo: string): { itens: Linha[]; erro?: string } {
  const preenchidas = linhas.filter((l) => l.quantidade.trim() !== '');
  for (const l of preenchidas) {
    const q = Number(l.quantidade);
    if (!Number.isInteger(q) || q < 1) return { itens: [], erro: `Informe uma quantidade de 1 ou mais em cada linha de ${rotulo}.` };
  }
  return { itens: preenchidas };
}

/**
 * Botão "Solicitar pulseiras e checkpoints" do admin: um modal com os dois pedidos (tipo e quantidade).
 * Cada pedido vai para o suporte do master como um chamado separado (pulseiras / checkpoints).
 */
export default function SolicitarEquipamentos({ rotulo = 'Solicitar pulseiras e checkpoints' }: { rotulo?: string }) {
  const [aberto, setAberto] = useState(false);
  const [pulseiras, setPulseiras] = useState<Linha[]>(() => [novaLinha()]);
  const [checkpoints, setCheckpoints] = useState<Linha[]>(() => [novaLinha()]);
  const [observacao, setObservacao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const abrir = () => {
    setPulseiras([novaLinha()]);
    setCheckpoints([novaLinha()]);
    setObservacao('');
    setErro(null);
    setAberto(true);
  };

  const fechar = () => { if (!enviando) setAberto(false); };

  const enviar = async () => {
    const p = lerLinhas(pulseiras, 'pulseiras');
    const c = lerLinhas(checkpoints, 'checkpoints');
    if (p.erro || c.erro) { setErro(p.erro || c.erro || null); return; }
    if (p.itens.length === 0 && c.itens.length === 0) {
      setErro('Informe a quantidade de pulseiras ou de checkpoints que você precisa.');
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      const obs = observacao.trim();
      if (p.itens.length > 0) {
        await api.solicitarPulseiras(p.itens.map((l) => ({ tipo: l.tipo, quantidade: Number(l.quantidade) })), obs);
      }
      if (c.itens.length > 0) {
        await api.solicitarCheckpoints(c.itens.map((l) => ({ tipo: l.tipo, finalidade: l.finalidade, quantidade: Number(l.quantidade) })), obs);
      }
      toast.success('Solicitação enviada ao suporte. O que for enviado aparece aqui para você aceitar.');
      setAberto(false);
    } catch (err) {
      setErro(err instanceof Error && err.message ? err.message : 'Não foi possível enviar a solicitação. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  const grupo = (
    titulo: string,
    linhas: Linha[],
    setLinhas: React.Dispatch<React.SetStateAction<Linha[]>>,
    comFinalidade: boolean,
  ) => {
    const mudar = (chave: number, campos: Partial<Linha>) =>
      setLinhas((atual) => atual.map((l) => (l.chave === chave ? { ...l, ...campos } : l)));
    return (
      <section className="space-y-3">
        <h3 className="font-display text-base text-white">{titulo}</h3>
        {linhas.map((linha) => (
          <div key={linha.chave} className="flex flex-wrap items-end gap-3 sm:flex-nowrap">
            <div className="min-w-[8rem] flex-1">
              <Select label="Tipo" options={TIPOS} value={linha.tipo} onChange={(e) => mudar(linha.chave, { tipo: e.target.value })} />
            </div>
            {comFinalidade && (
              <div className="min-w-[8rem] flex-1">
                <Select label="Finalidade" options={FINALIDADES} value={linha.finalidade} onChange={(e) => mudar(linha.chave, { finalidade: e.target.value })} />
              </div>
            )}
            <div className="w-28">
              <Input
                label="Quantidade"
                type="number"
                min={1}
                max={comFinalidade ? 500 : 5000}
                placeholder="0"
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
        {linhas.length < MAX_LINHAS && (
          <Button variant="ghost" size="sm" onClick={() => setLinhas((atual) => [...atual, novaLinha()])}>
            <Plus size={16} className="mr-1" />
            Adicionar outra linha
          </Button>
        )}
      </section>
    );
  };

  return (
    <>
      <Button variant="primary" onClick={abrir}>
        <PackagePlus size={18} className="mr-2" />
        {rotulo}
      </Button>

      <Modal isOpen={aberto} onClose={fechar} title="Solicitar pulseiras e checkpoints" size="lg">
        <div className="space-y-5">
          <p className="text-sm text-gray-400">
            Diga quantas pulseiras e quantos checkpoints você precisa. Preencha só o que for pedir: o pedido vai para o suporte, que envia tudo para a sua conta. Você aceita o que chegar nesta tela.
          </p>

          {grupo('Pulseiras', pulseiras, setPulseiras, false)}
          {grupo('Checkpoints', checkpoints, setCheckpoints, true)}

          <div className="w-full">
            <label htmlFor="se-obs" className="mb-1.5 block text-sm font-body font-medium text-gray-300">Observação (opcional)</label>
            <textarea
              id="se-obs"
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
