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
  /** Evento que a tela está mostrando: já vem escolhido ao aceitar, para o checkpoint cair na lista que você vê. */
  eventoPadrao?: string | null;
  /** Chamado depois de aceitar, para a lista de checkpoints da tela recarregar. */
  onChange: () => void;
}

interface Rascunho {
  numCheck: string;
  eventoId: string;
}

const SELECT_CLASSES =
  'w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white font-body text-sm cursor-pointer';

/**
 * Checkpoints que o super admin transferiu para este buffet e que esperam o aceite.
 * O admin define o número, escolhe (se quiser) o evento e aceita ou recusa. Depois de aceito o checkpoint sai daqui e
 * passa a aparecer na lista de checkpoints da tela. Some quando não há nada a aceitar.
 */
export default function CheckpointsRecebidos({ events, eventoPadrao, onChange }: Props) {
  const [pendentes, setPendentes] = useState<CheckpointRecebido[]>([]);
  const [rascunhos, setRascunhos] = useState<Record<string, Rascunho>>({});
  const [ocupado, setOcupado] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setPendentes(await api.getCheckpointsPendentes());
    } catch (err) {
      // Backend sem as rotas novas ou sem permissão: a tela segue sem este cartão.
      console.warn('Checkpoints recebidos indisponíveis:', err);
      setPendentes([]);
    }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  // O evento só vira "padrão" se ainda existir na lista (a opção "todos os eventos" não é um evento).
  const eventoInicial = eventoPadrao && events.some((e) => e.eventoId === eventoPadrao) ? eventoPadrao : '';

  const rascunhoDe = (cp: CheckpointRecebido): Rascunho =>
    rascunhos[cp.checkpointId] ?? { numCheck: cp.numCheck ?? '', eventoId: eventoInicial };

  const editar = (cp: CheckpointRecebido, parte: Partial<Rascunho>) =>
    setRascunhos((atual) => ({ ...atual, [cp.checkpointId]: { ...rascunhoDe(cp), ...parte } }));

  const aceitar = async (cp: CheckpointRecebido) => {
    const { numCheck, eventoId } = rascunhoDe(cp);
    const numero = numCheck.trim();
    if (!numero) {
      toast.error('Informe o número do checkpoint');
      return;
    }
    setOcupado(cp.checkpointId);
    try {
      await api.aceitarCheckpoint(cp.checkpointId, numero, eventoId || null);
      toast.success(eventoId
        ? `Checkpoint ${numero} aceito e colocado no evento`
        : `Checkpoint ${numero} aceito. Está na lista em "Todos os eventos", sem evento ainda`);
      await carregar();
      onChange();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível aceitar');
    } finally {
      setOcupado(null);
    }
  };

  const recusar = async (cp: CheckpointRecebido) => {
    if (!confirm(`Recusar o checkpoint "${cp.nome}"? Ele volta para o super admin.`)) return;
    setOcupado(cp.checkpointId);
    try {
      await api.recusarCheckpoint(cp.checkpointId);
      toast.success('Checkpoint devolvido');
      await carregar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível recusar');
    } finally {
      setOcupado(null);
    }
  };

  if (pendentes.length === 0) return null;

  return (
    <Card variant="glow">
      <div className="flex items-center gap-3 mb-4">
        <Inbox size={20} className="text-primary-400" />
        <h2 className="text-lg font-display font-semibold text-white">Checkpoints recebidos</h2>
        <Badge variant="warning">{pendentes.length} para aceitar</Badge>
      </div>

      <div className="space-y-3">
        <p className="text-sm text-gray-400">
          O super admin enviou estes checkpoints para o seu buffet. Defina o número de cada um e aceite: ele entra na lista de checkpoints abaixo.
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
                  <option value="" style={{ backgroundColor: '#1a1a2e', color: '#fff' }}>Sem evento por enquanto</option>
                  {events.map((e) => (
                    <option key={e.eventoId} value={e.eventoId} style={{ backgroundColor: '#1a1a2e', color: '#fff' }}>
                      {e.nome || `Evento ${e.eventoId}`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button variant="primary" size="sm" onClick={() => void aceitar(cp)} disabled={travado}>
                  <Check size={14} className="mr-1" />
                  Aceitar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => void recusar(cp)} disabled={travado} aria-label={`Recusar ${cp.nome}`}>
                  <X size={14} className="mr-1" />
                  Recusar
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
