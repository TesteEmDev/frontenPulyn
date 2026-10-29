import { useState } from 'react';
import Button from '../ui/Button';

interface EventoOpcao {
  eventoId: string;
  nome?: string;
}

interface Props {
  events: EventoOpcao[];
  /** Coloca o checkpoint no evento escolhido. Quem chama avisa o resultado (sucesso ou erro) ao usuário. */
  onAtribuir: (eventoId: string) => Promise<void>;
  nomeCheckpoint: string;
}

/** Na tabela de checkpoints: para quem ainda não tem evento, escolhe um e coloca. */
export default function AtribuirEvento({ events, onAtribuir, nomeCheckpoint }: Props) {
  const [eventoId, setEventoId] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const colocar = async () => {
    if (!eventoId) return;
    setOcupado(true);
    try {
      await onAtribuir(eventoId);
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={eventoId}
        onChange={(e) => setEventoId(e.target.value)}
        disabled={ocupado}
        aria-label={`Evento de ${nomeCheckpoint}`}
        className="min-w-[10rem] px-2 py-1.5 bg-gray-900 border border-gray-600 rounded-lg text-white font-body text-sm cursor-pointer"
      >
        <option value="" style={{ backgroundColor: '#1a1a2e', color: '#999' }}>Sem evento</option>
        {events.map((e) => (
          <option key={e.eventoId} value={e.eventoId} style={{ backgroundColor: '#1a1a2e', color: '#fff' }}>
            {e.nome || `Evento ${e.eventoId}`}
          </option>
        ))}
      </select>
      <Button variant="primary" size="sm" onClick={() => void colocar()} disabled={ocupado || !eventoId}>
        Colocar
      </Button>
    </div>
  );
}
