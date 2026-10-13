import { Loader2, ArrowRight, CalendarDays } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';

export interface EventTeam {
  timeId: string;
  nome: string;
  cor: string;
  eventoId?: string | null;
  pontos?: number;
  members_count?: number | string;
}

export interface EventSummary {
  eventoId: string;
  nome: string;
  data: string;
}

interface AllEventsTeamsProps {
  events: EventSummary[];
  teams: EventTeam[];
  loading: boolean;
  onOpenEvent: (eventId: string) => void;
}

// "2026-10-05" (ou ISO completo) -> "05/10/2026", sem deslocar o dia por fuso horário.
function formatDate(value: string): string {
  const day = String(value || '').slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
}

// Todos os times da empresa, agrupados pelo evento a que pertencem (os modelos "padrão" ficam de fora).
export default function AllEventsTeams({ events, teams, loading, onOpenEvent }: AllEventsTeamsProps) {
  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-12">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  const eventTeams = teams.filter(team => team.eventoId);
  const knownIds = new Set(events.map(event => event.eventoId));
  const orphanTeams = eventTeams.filter(team => !knownIds.has(String(team.eventoId)));
  // Eventos mais recentes primeiro.
  const orderedEvents = [...events].sort((a, b) => String(b.data).localeCompare(String(a.data)));

  const renderTeams = (list: EventTeam[]) =>
    list.length === 0 ? (
      <p className="py-3 text-sm text-gray-500">Nenhum time neste evento.</p>
    ) : (
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {list.map(team => (
          <li key={team.timeId} className="flex items-center gap-3 rounded-lg border border-white/[0.08] bg-surface/30 px-3 py-2.5">
            <span className="h-5 w-5 shrink-0 rounded-full border border-white/30" style={{ backgroundColor: team.cor }} aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-white">{team.nome}</span>
              <span className="block text-xs text-gray-500">
                {Number(team.members_count || 0)} membro{Number(team.members_count || 0) !== 1 ? 's' : ''}
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block font-mono text-sm font-bold text-white">{Number(team.pontos || 0)}</span>
              <span className="block text-[10px] uppercase tracking-wide text-gray-500">pontos</span>
            </span>
          </li>
        ))}
      </ul>
    );

  if (events.length === 0 && orphanTeams.length === 0) {
    return (
      <Card>
        <p className="py-8 text-center text-gray-500">Nenhum evento cadastrado ainda.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        {eventTeams.length} time{eventTeams.length !== 1 ? 's' : ''} em {events.length} evento{events.length !== 1 ? 's' : ''}.
      </p>

      {orderedEvents.map(event => {
        const list = eventTeams.filter(team => String(team.eventoId) === event.eventoId);
        const date = formatDate(event.data);
        return (
          <Card key={event.eventoId}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-display text-lg text-white">{event.nome}</h3>
                <p className="flex items-center gap-1.5 text-xs text-gray-500">
                  {date && (<><CalendarDays size={13} aria-hidden="true" />{date} · </>)}
                  {list.length} time{list.length !== 1 ? 's' : ''}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onOpenEvent(event.eventoId)}>
                Gerenciar times
                <ArrowRight size={14} className="ml-1.5" />
              </Button>
            </div>
            {renderTeams(list)}
          </Card>
        );
      })}

      {orphanTeams.length > 0 && (
        <Card>
          <h3 className="mb-3 font-display text-lg text-white">Outros eventos</h3>
          {renderTeams(orphanTeams)}
        </Card>
      )}
    </div>
  );
}
