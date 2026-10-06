import { Trophy, MapPin, Gamepad2, Users, ArrowRight } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import type { GeneralReportData } from '../../services/api';

const STATUS: Record<string, { label: string; variant: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'danger' | 'muted' }> = {
  scheduled: { label: 'Agendado', variant: 'primary' },
  active: { label: 'Em andamento', variant: 'success' },
  ongoing: { label: 'Em andamento', variant: 'success' },
  finished: { label: 'Encerrado', variant: 'muted' },
  completed: { label: 'Encerrado', variant: 'muted' },
  cancelled: { label: 'Cancelado', variant: 'danger' },
  canceled: { label: 'Cancelado', variant: 'danger' },
};

export const formatReportDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || '');
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '--';
};

// "2026-10" -> "out/26"
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const formatMonth = (value: string) => {
  const [year, month] = value.split('-');
  return `${MONTHS[Number(month) - 1] || month}/${String(year).slice(2)}`;
};

const tooltipStyle = { backgroundColor: '#1E1B2E', border: '1px solid #374151', borderRadius: 8 };
const axisTick = { fill: '#9CA3AF', fontSize: 12 };

interface GeneralReportProps {
  data: GeneralReportData;
  onOpenEvent: (eventId: string) => void;
}

export default function GeneralReport({ data, onOpenEvent }: GeneralReportProps) {
  const { totals } = data;

  const kpis = [
    { label: 'Eventos', value: totals.events, hint: `${totals.finishedEvents} encerrado${totals.finishedEvents !== 1 ? 's' : ''}${totals.runningEvents ? ` · ${totals.runningEvents} em andamento` : ''}`, color: 'text-primary' },
    { label: 'Participantes', value: totals.participants, hint: 'em todos os eventos', color: 'text-secondary' },
    { label: 'Média de pontos', value: totals.avgPoints, hint: 'por participante', color: 'text-accent' },
    { label: 'Pontos totais', value: totals.totalPoints, hint: 'somando os participantes', color: 'text-success' },
    { label: 'Times', value: totals.teams, hint: 'criados nos eventos', color: 'text-primary' },
    { label: 'Pontuações', value: totals.scorings, hint: 'leituras que geraram pontos', color: 'text-secondary' },
  ];

  // Gráfico por evento: do mais antigo para o mais recente (a lista já vem do mais novo para o mais antigo).
  const participantsByEvent = [...data.events].reverse().slice(-12).map(event => ({
    name: event.name.length > 14 ? `${event.name.slice(0, 13)}…` : event.name,
    fullName: event.name,
    participantes: event.participants,
  }));
  const byMonth = data.byMonth.slice(-12).map(entry => ({ ...entry, label: formatMonth(entry.month) }));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map(kpi => (
          <Card key={kpi.label} className="text-center">
            <p className="mb-1 text-sm font-body text-gray-400">{kpi.label}</p>
            <p className={`font-display text-3xl font-bold ${kpi.color}`}>{kpi.value.toLocaleString('pt-BR')}</p>
            <p className="mt-1 text-xs text-gray-500">{kpi.hint}</p>
          </Card>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-display text-lg text-white">Participantes por evento</h3>
          {participantsByEvent.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-500">Nenhum evento ainda.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={participantsByEvent}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" tick={{ ...axisTick, fontSize: 11 }} interval={0} />
                <YAxis allowDecimals={false} tick={axisTick} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: '#fff' }}
                  labelFormatter={(_label, payload) => payload?.[0]?.payload?.fullName || ''}
                />
                <Bar dataKey="participantes" fill="#1E9BD7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <h3 className="mb-4 font-display text-lg text-white">Eventos por mês</h3>
          {byMonth.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-500">Nenhum evento com data ainda.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="label" tick={axisTick} />
                <YAxis allowDecimals={false} tick={axisTick} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#fff' }} />
                <Bar dataKey="events" name="Eventos" fill="#29B6F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="participants" name="Participantes" fill="#4CAF50" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Tabela por evento */}
      <Card>
        <h3 className="mb-4 font-display text-lg text-white">Resumo por evento</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border text-sm font-body font-semibold text-gray-400">
                <th className="pb-3 pr-4">Evento</th>
                <th className="pb-3 pr-4">Data</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4 text-right">Participantes</th>
                <th className="pb-3 pr-4 text-right">Times</th>
                <th className="pb-3 pr-4 text-right">Pontos</th>
                <th className="pb-3 pr-4 text-right">Média</th>
                <th className="pb-3"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.events.map(event => {
                const status = STATUS[event.status] || { label: event.status || '--', variant: 'muted' as const };
                return (
                  <tr key={event.id} className="transition-colors hover:bg-surface/50">
                    <td className="py-3 pr-4 text-sm font-semibold text-white">{event.name}</td>
                    <td className="py-3 pr-4 text-sm text-gray-300">{formatReportDate(event.date)}</td>
                    <td className="py-3 pr-4"><Badge variant={status.variant}>{status.label}</Badge></td>
                    <td className="py-3 pr-4 text-right font-mono text-sm text-gray-300">{event.participants}</td>
                    <td className="py-3 pr-4 text-right font-mono text-sm text-gray-300">{event.teams}</td>
                    <td className="py-3 pr-4 text-right font-mono text-sm font-bold text-primary">{event.totalPoints}</td>
                    <td className="py-3 pr-4 text-right font-mono text-sm text-gray-300">{event.avgPoints}</td>
                    <td className="py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => onOpenEvent(event.id)}>
                        Ver evento <ArrowRight size={14} className="ml-1" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {data.events.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-gray-500">Nenhum evento cadastrado ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Destaques */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Trophy size={20} className="text-accent" />
            <h3 className="font-display text-lg text-white">Melhores participantes</h3>
            <Badge variant="primary">Top 10</Badge>
          </div>
          {data.topParticipants.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">Nenhum participante ativo.</p>
          ) : (
            <ol className="space-y-2">
              {data.topParticipants.map((child, index) => (
                <li key={child.id} className="flex items-center gap-3 rounded-lg bg-surface/50 px-3 py-2">
                  <span className={`w-6 text-center font-mono text-lg font-bold ${index === 0 ? 'text-accent' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-amber-700' : 'text-gray-500'}`}>{index + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-white">{child.nickname || child.name}</span>
                    <span className="block truncate text-xs text-gray-500">
                      {child.eventName}{child.teamName ? ` · ${child.teamName}` : ''}
                      {child.braceletCode ? ` · Pulseira ${child.braceletCode}` : ''}
                    </span>
                  </span>
                  <span className="font-mono text-sm font-bold text-primary">{child.scores}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Users size={20} className="text-secondary" />
            <h3 className="font-display text-lg text-white">Melhores times</h3>
            <Badge variant="primary">Top 5</Badge>
          </div>
          {data.topTeams.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">Nenhum time criado.</p>
          ) : (
            <ol className="space-y-2">
              {data.topTeams.map((team, index) => (
                <li key={team.id} className="flex items-center gap-3 rounded-lg bg-surface/50 px-3 py-2">
                  <span className="w-6 text-center font-mono text-lg font-bold text-gray-500">{index + 1}</span>
                  <span className="h-4 w-4 shrink-0 rounded-full border border-white/30" style={{ backgroundColor: team.color }} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-white">{team.name}</span>
                    <span className="block truncate text-xs text-gray-500">{team.eventName}</span>
                  </span>
                  <span className="font-mono text-sm font-bold text-primary">{team.points}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-2">
            <MapPin size={20} className="text-secondary" />
            <h3 className="font-display text-lg text-white">Checkpoints mais acessados</h3>
          </div>
          {data.topCheckpoints.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">Nenhuma leitura registrada ainda.</p>
          ) : (
            <ol className="space-y-2">
              {data.topCheckpoints.map((checkpoint, index) => (
                <li key={checkpoint.id} className="flex items-center gap-3 rounded-lg bg-surface/50 px-3 py-2">
                  <span className="w-6 text-center font-mono text-lg font-bold text-gray-500">{index + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-white">{checkpoint.name}</span>
                    <span className="block truncate text-xs text-gray-500">{checkpoint.zone || 'Sem zona'} · {checkpoint.eventName}</span>
                  </span>
                  <span className="text-xs text-gray-400">{checkpoint.readings} leitura{checkpoint.readings !== 1 ? 's' : ''}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Gamepad2 size={20} className="text-success" />
            <h3 className="font-display text-lg text-white">Jogos mais populares</h3>
          </div>
          {data.topGames.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">Nenhum jogo com pontuação ainda.</p>
          ) : (
            <ol className="space-y-2">
              {data.topGames.map((game, index) => (
                <li key={game.id} className="flex items-center gap-3 rounded-lg bg-surface/50 px-3 py-2">
                  <span className="w-6 text-center font-mono text-lg font-bold text-gray-500">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{game.name}</span>
                  <span className="text-xs text-gray-400">{game.plays} pontuaç{game.plays !== 1 ? 'ões' : 'ão'}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}
