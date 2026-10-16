import { useEffect, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Avatar from '../ui/Avatar';
import type { Child } from '../../store/mockData';

interface AddTeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: { id: string; name: string; color: string } | null;
  // Todos os participantes do evento (quem já está neste time não aparece na lista)
  participants: Child[];
  // Nome do time de cada time do evento, para mostrar de onde o participante vai sair
  teamNames: Record<string, string>;
  onAssign: (criancaId: string, timeId: string) => Promise<void>;
}

const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Adiciona participantes a um time, um a um. A lista continua aberta para adicionar vários em sequência;
// quem está sem time aparece primeiro, e quem já está em outro time é movido para este.
export default function AddTeamMemberModal({
  isOpen,
  onClose,
  team,
  participants,
  teamNames,
  onAssign,
}: AddTeamMemberModalProps) {
  const [search, setSearch] = useState('');
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setSearch('');
    setError('');
    setWorkingId(null);
  }, [isOpen, team?.id]);

  const candidates = useMemo(() => {
    if (!team) return [];
    const term = normalizar(search);
    return participants
      .filter(child => child.timeId !== team.id)
      .filter(child => !term || normalizar(`${child.nickname || ''} ${child.name || ''}`).includes(term))
      .map(child => ({ child, currentTeam: child.timeId ? teamNames[child.timeId] || null : null }))
      .sort((a, b) => Number(Boolean(a.currentTeam)) - Number(Boolean(b.currentTeam))
        || (a.child.nickname || a.child.name).localeCompare(b.child.nickname || b.child.name, 'pt-BR'));
  }, [participants, search, team, teamNames]);

  const unassignedTotal = candidates.filter(item => !item.currentTeam).length;

  const handleAssign = async (criancaId: string) => {
    if (!team) return;
    setWorkingId(criancaId);
    setError('');
    try {
      await onAssign(criancaId, team.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível adicionar o participante.');
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <Modal isOpen={isOpen && Boolean(team)} onClose={onClose} title={team ? `Adicionar ao time ${team.name}` : ''} size="md">
      <div>
        <p className="mb-3 text-sm text-gray-400">
          Escolha os participantes que entram neste time. Quem já está em outro time é movido para cá.
        </p>
        <div className="relative mb-3">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar participante pelo nome ou apelido"
            aria-label="Buscar participante"
            className="w-full rounded-lg border border-dark-border bg-dark-surface py-2 pl-9 pr-3 text-sm text-white placeholder-gray-500 focus:border-primary focus:outline-none"
          />
        </div>
        {error && (
          <p role="alert" className="mb-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        )}
        <div className="max-h-[50dvh] space-y-2 overflow-y-auto pr-1">
          {candidates.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">
              {search ? 'Nenhum participante encontrado.' : 'Todos os participantes já estão neste time.'}
            </p>
          ) : candidates.map(({ child, currentTeam }) => (
            <div key={child.id} className="flex items-center justify-between gap-3 rounded-lg bg-surface/30 p-2">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar emoji={child.avatar || '👤'} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{child.nickname || child.name}</p>
                  <p className="truncate text-xs text-gray-500">
                    {child.nickname && child.nickname !== child.name ? `${child.name} · ` : ''}{child.age} anos
                    {' · '}
                    <span className={currentTeam ? 'text-warning' : 'text-success'}>
                      {currentTeam ? `está no time ${currentTeam}` : 'sem time'}
                    </span>
                  </p>
                </div>
              </div>
              <Button
                variant={currentTeam ? 'ghost' : 'primary'}
                size="sm"
                disabled={workingId !== null}
                onClick={() => handleAssign(child.id)}
              >
                <Plus size={14} className="mr-1" />
                {workingId === child.id ? 'Adicionando...' : currentTeam ? 'Mover para cá' : 'Adicionar'}
              </Button>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-xs text-gray-500">{unassignedTotal} sem time</span>
          <Button variant="primary" onClick={onClose}>Concluir</Button>
        </div>
      </div>
    </Modal>
  );
}
