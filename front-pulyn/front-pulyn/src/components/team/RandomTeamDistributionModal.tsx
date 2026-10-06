import { useEffect, useState } from 'react';
import { Shuffle } from 'lucide-react';
import { api } from '../../services/api';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

type Mode = 'unassigned' | 'all';
type Result = Awaited<ReturnType<typeof api.distributeChildrenRandomly>>;

interface RandomTeamDistributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventoId: string;
  teamCount: number;
  totalChildren: number;
  unassignedCount: number;
  onDistributed: () => void | Promise<void>;
}

// Sorteia as crianças do evento entre os times, deixando-os com tamanhos equilibrados.
export default function RandomTeamDistributionModal({
  isOpen,
  onClose,
  eventoId,
  teamCount,
  totalChildren,
  unassignedCount,
  onDistributed,
}: RandomTeamDistributionModalProps) {
  const [mode, setMode] = useState<Mode>('unassigned');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setMode(unassignedCount > 0 ? 'unassigned' : 'all');
    setError('');
    setResult(null);
    // Só reinicia ao abrir; a contagem muda sozinha após o sorteio e não deve apagar o resultado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const affected = mode === 'all' ? totalChildren : unassignedCount;
  const notEnoughTeams = teamCount < 2;
  const canSubmit = !submitting && !notEnoughTeams && affected > 0;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      setResult(await api.distributeChildrenRandomly(eventoId, mode));
      await onDistributed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível distribuir os participantes.');
    } finally {
      setSubmitting(false);
    }
  };

  const option = (value: Mode, title: string, description: string, disabled = false) => (
    <label
      className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
        mode === value ? 'border-primary bg-primary/10' : 'border-dark-border hover:border-primary/40'
      } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
    >
      <input
        type="radio"
        name="distribution-mode"
        className="mt-1"
        checked={mode === value}
        disabled={disabled}
        onChange={() => setMode(value)}
      />
      <span>
        <span className="block text-sm font-semibold text-white">{title}</span>
        <span className="block text-xs text-gray-400">{description}</span>
      </span>
    </label>
  );

  return (
    <Modal isOpen={isOpen} onClose={submitting ? () => undefined : onClose} title="Sortear times" size="md">
      {result ? (
        <div>
          <p className="mb-4 text-sm text-gray-300">
            {result.distributed === 0
              ? 'Todos já estavam distribuídos de forma equilibrada.'
              : `${result.distributed} participante${result.distributed !== 1 ? 's foram sorteados' : ' foi sorteado'} entre os times.`}
          </p>
          <ul className="mb-5 space-y-2">
            {result.teams.map(team => (
              <li key={team.id} className="flex items-center justify-between rounded-lg bg-surface/30 px-3 py-2 text-sm">
                <span className="text-white">{team.name}</span>
                <span className="font-semibold text-gray-300">{team.members} membro{team.members !== 1 ? 's' : ''}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-end">
            <Button variant="primary" onClick={onClose}>Concluir</Button>
          </div>
        </div>
      ) : (
        <div>
          <p className="mb-4 text-sm text-gray-400">
            Os participantes são sorteados entre os {teamCount} times do evento, e os times ficam com o mesmo número de membros (diferença de no máximo 1).
          </p>
          {notEnoughTeams && (
            <p className="mb-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
              Crie pelo menos 2 times antes de sortear.
            </p>
          )}
          <div className="space-y-2">
            {option('unassigned', `Só quem está sem time (${unassignedCount})`, 'Mantém quem já tem time e distribui os demais, equilibrando os times.', unassignedCount === 0)}
            {option('all', `Todos os participantes (${totalChildren})`, 'Refaz a divisão do zero. Quem já tem time pode mudar.')}
          </div>
          {mode === 'all' && totalChildren > unassignedCount && (
            <p className="mt-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
              Atenção: participantes que já estão em um time podem trocar de time, e a pontuação dos times será recalculada. Evite fazer isso com o jogo em andamento.
            </p>
          )}
          {error && <p role="alert" className="mt-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          <div className="mt-5 flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancelar</Button>
            <Button variant="primary" onClick={handleSubmit} disabled={!canSubmit}>
              <Shuffle size={16} className="mr-1.5" />
              {submitting ? 'Sorteando...' : `Sortear ${affected} participante${affected !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
