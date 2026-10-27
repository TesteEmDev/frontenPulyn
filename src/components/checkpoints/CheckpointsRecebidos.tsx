import { useCallback, useEffect, useState } from 'react';
import { Check, Inbox, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, type CheckpointRecebido } from '../../services/api';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface EventoOpcao {
  eventoId: string;
  nome?: string;
}

interface Props {
  events: EventoOpcao[];
  /** Chamado quando um checkpoint entra num evento, para a lista da tela recarregar. */
  onChange: () => void;
}

interface Rascunho {
  numCheck: string;
  eventoId: string;
}

const SELECT_CLASSES =
  'w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white font-body text-sm cursor-pointer';

/**
 * Checkpoints que o super admin transferiu para este buffet.
 * - Pendentes: o admin define o número, escolhe (se quiser) o evento e aceita, ou recusa.
 * - Aceitos sem evento: ficam aqui até serem colocados em um evento.
 * Some quando não há nada a fazer.
 */
export default function CheckpointsRecebidos({ events, onChange }: Props) {
  const [pendentes, setPendentes] = useState<CheckpointRecebido[]>([]);
  const [semEvento, setSemEvento] = useState<CheckpointRecebido[]>([]);
  const [rascunhos, setRascunhos] = useState<Record<string, Rascunho>>({});
  const [ocupado, setOcupado] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([api.getCheckpointsPendentes(), api.getCheckpointsSemEvento()]);
      setPendentes(p);
      setSemEvento(s);
    } catch (err) {
      // Backend sem as rotas novas ou sem permissão: a tela segue sem esta seção.
      console.warn('Checkpoints recebidos indisponíveis:', err);
      setPendentes([]);
      setSemEvento([]);
    }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  const rascunhoDe = (cp: CheckpointRecebido): Rascunho =>
    rascunhos[cp.checkpointId] ?? { numCheck: cp.numCheck ?? '', eventoId: '' };

  const editar = (cp: CheckpointRecebido, parte: Partial<Rascunho>) =>
    setRascunhos((atual) => ({ ...atual, [cp.checkpointId]: { ...rascunhoDe(cp), ...parte } }));

  // Roda uma ação do checkpoint com o botão travado, avisa o resultado e recarrega as listas.
  const executar = async (cp: CheckpointRecebido, acao: () => Promise<unknown>, sucesso: string, mudouEvento = false) => {
    setOcupado(cp.checkpointId);
    try {
      await acao();
      toast.success(sucesso);
      await carregar();
      if (mudouEvento) onChange();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível concluir');
    } finally {
      setOcupado(null);
    }
  };

  const aceitar = (cp: CheckpointRecebido) => {
    const { numCheck, eventoId } = rascunhoDe(cp);
    if (!numCheck.trim()) {
      toast.error('Informe o número do checkpoint');
      return;
    }
    void executar(cp, () => api.aceitarCheckpoint(cp.checkpointId, numCheck.trim(), eventoId || null),
      `Checkpoint ${numCheck.trim()} aceito`, Boolean(eventoId));
  };

  const recusar = (cp: CheckpointRecebido) => {
    if (!confirm(`Recusar o checkpoint "${cp.nome}"? Ele volta para o super admin.`)) return;
    void executar(cp, () => api.recusarCheckpoint(cp.checkpointId), 'Checkpoint devolvido');
  };

  const salvarNumero = (cp: CheckpointRecebido) => {
    const { numCheck } = rascunhoDe(cp);
    if (!numCheck.trim()) {
      toast.error('Informe o número do checkpoint');
      return;
    }
    void executar(cp, () => api.alterarNumeroCheckpoint(cp.checkpointId, numCheck.trim()), `Número alterado para ${numCheck.trim()}`);
  };

  const atribuir = (cp: CheckpointRecebido) => {
    const { eventoId } = rascunhoDe(cp);
    if (!eventoId) return;
    void executar(cp, () => api.atribuirEventoCheckpoint(cp.checkpointId, eventoId), 'Checkpoint colocado no evento', true);
  };

  if (pendentes.length === 0 && semEvento.length === 0) return null;

  const opcoesDeEvento = (
    <>
      <option value="" style={{ backgroundColor: '#1a1a2e', color: '#fff' }}>Sem evento por enquanto</option>
      {events.map((e) => (
        <option key={e.eventoId} value={e.eventoId} style={{ backgroundColor: '#1a1a2e', color: '#fff' }}>
          {e.nome || `Evento ${e.eventoId}`}
        </option>
      ))}
    </>
  );

  return (
    <Card variant="glow">
      <div className="flex items-center gap-3 mb-4">
        <Inbox size={20} className="text-primary-400" />
        <h2 className="text-lg font-display font-semibold text-white">Checkpoints recebidos</h2>
        {pendentes.length > 0 && <Badge variant="warning">{pendentes.length} para aceitar</Badge>}
      </div>

      {pendentes.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-400">
            O super admin enviou estes checkpoints para o seu buffet. Defina o número de cada um e aceite.
          </p>
          {pendentes.map((cp) => {
            const rascunho = rascunhoDe(cp);
            const travado = ocupado === cp.checkpointId;
            return (
              <div key={cp.checkpointId} className="grid gap-3 rounded-xl border border-white/[0.08] bg-dark-surface/60 p-3 md:grid-cols-[1.4fr_9rem_1.2fr_auto] md:items-end">
                <div>
                  <p className="text-sm font-semibold text-white">{cp.nome}</p>
                  <p className="text-xs text-gray-400">
                    {cp.tipo}
                    {cp.macAddress && <> · MAC <span className="font-mono text-gray-300">{cp.macAddress}</span></>}
                  </p>
                </div>
                <Input
                  label="Número"
                  placeholder="Ex: 12"
                  value={rascunho.numCheck}
                  onChange={(e) => editar(cp, { numCheck: e.target.value.toUpperCase() })}
                  disabled={travado}
                />
                <div>
                  <label className="mb-1.5 block text-sm font-body font-semibold text-gray-300">Evento</label>
                  <select
                    value={rascunho.eventoId}
                    onChange={(e) => editar(cp, { eventoId: e.target.value })}
                    disabled={travado}
                    className={SELECT_CLASSES}
                  >
                    {opcoesDeEvento}
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" onClick={() => aceitar(cp)} disabled={travado}>
                    <Check size={14} className="mr-1" />
                    Aceitar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => recusar(cp)} disabled={travado} aria-label={`Recusar ${cp.nome}`}>
                    <X size={14} className="mr-1" />
                    Recusar
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {semEvento.length > 0 && (
        <div className={`space-y-3 ${pendentes.length > 0 ? 'mt-6' : ''}`}>
          <p className="text-sm text-gray-400">
            Aceitos e ainda fora de qualquer evento. Coloque cada um no evento em que vai ser usado.
          </p>
          {semEvento.map((cp) => {
            const rascunho = rascunhoDe(cp);
            const travado = ocupado === cp.checkpointId;
            const numeroMudou = rascunho.numCheck.trim() !== (cp.numCheck ?? '');
            return (
              <div key={cp.checkpointId} className="grid gap-3 rounded-xl border border-white/[0.08] bg-dark-surface/60 p-3 md:grid-cols-[1.4fr_11rem_1.2fr_auto] md:items-end">
                <div>
                  <p className="text-sm font-semibold text-white">{cp.nome}</p>
                  <p className="text-xs text-gray-400">
                    {cp.tipo}
                    {cp.macAddress && <> · MAC <span className="font-mono text-gray-300">{cp.macAddress}</span></>}
                  </p>
                </div>
                <div className="flex items-end gap-2">
                  <Input
                    label="Número"
                    value={rascunho.numCheck}
                    onChange={(e) => editar(cp, { numCheck: e.target.value.toUpperCase() })}
                    disabled={travado}
                  />
                  <Button variant="ghost" size="sm" onClick={() => salvarNumero(cp)} disabled={travado || !numeroMudou}>
                    Salvar
                  </Button>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-body font-semibold text-gray-300">Evento</label>
                  <select
                    value={rascunho.eventoId}
                    onChange={(e) => editar(cp, { eventoId: e.target.value })}
                    disabled={travado}
                    className={SELECT_CLASSES}
                  >
                    <option value="" style={{ backgroundColor: '#1a1a2e', color: '#fff' }}>Escolha o evento</option>
                    {events.map((e) => (
                      <option key={e.eventoId} value={e.eventoId} style={{ backgroundColor: '#1a1a2e', color: '#fff' }}>
                        {e.nome || `Evento ${e.eventoId}`}
                      </option>
                    ))}
                  </select>
                </div>
                <Button variant="primary" size="sm" onClick={() => atribuir(cp)} disabled={travado || !rascunho.eventoId}>
                  Colocar no evento
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
