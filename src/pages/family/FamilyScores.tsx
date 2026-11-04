import { useState, useMemo, useEffect } from 'react';
import { api } from '../../services/api';
import { useFamilyData } from '../../hooks/useFamilyData';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import BottomNav from '../../components/layout/BottomNav';
import PageHeader from '../../components/layout/PageHeader';
import {
  Home,
  MapPin,
  Trophy,
  Star,
  Gamepad2,
  TrendingUp,
  Medal,
  Clock,
  History,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const navItems = [
  { icon: <Home size={20} />, label: 'Home', path: '/family' },
  { icon: <MapPin size={20} />, label: 'Localização', path: '/family/location' },
  { icon: <Star size={20} />, label: 'Pontuação', path: '/family/scores' },
  { icon: <Trophy size={20} />, label: 'Conquistas', path: '/family/achievements' },
  { icon: <Gamepad2 size={20} />, label: 'Perfil', path: '/family/profile' },
];

// Dados de evolução são derivados das pontuações carregadas; não há série simulada.


type ViewMode = 'individual' | 'team';

export default function FamilyScores() {
  const { children } = useFamilyData();
  const [viewMode, setViewMode] = useState<ViewMode>('individual');
  const [scoreLog, setScoreLog] = useState<any[]>([]);

  useEffect(() => {
    Promise.all(children.map((child) => api.getFamilyChildScores(child.id).catch(() => ({ scores: [] }))))
      .then((results) => setScoreLog(results.flatMap((result, index) => (result.scores || []).map((score: any) => ({
        ...score,
        childName: children[index]?.nickname || children[index]?.name,
        checkpoint: score.checkpoint_name || 'Checkpoint',
        timestamp: score.created_at ? new Date(score.created_at).toLocaleString('pt-BR') : '',
      })))))
      .catch(() => setScoreLog([]));
  }, [children]);

  // Eventos anteriores de cada criança (pontos e checkpoints visitados em cada um)
  const [historico, setHistorico] = useState<{ childId: string; nome: string; eventoAtualId?: string; eventos: any[] }[]>([]);

  useEffect(() => {
    Promise.all(children.map((child) =>
      api.getFamilyChildHistory(child.id)
        .then((res) => ({
          childId: child.id,
          nome: child.nickname || child.name,
          eventoAtualId: child.eventoId,
          eventos: res.eventos || [],
        }))
        .catch(() => ({ childId: child.id, nome: child.nickname || child.name, eventoAtualId: child.eventoId, eventos: [] }))
    ))
      .then(setHistorico);
  }, [children]);

  const sortedTeams = useMemo(() => {
    const teams = new Map<string, any>();
    children.forEach((child) => {
      if (child.timeId) teams.set(child.timeId, { id: child.timeId, name: child.time_nome || 'Time', color: child.time_color || '#1E9BD7', points: Number(child.team_points || 0), icon: '👥' });
    });
    return [...teams.values()].sort((a, b) => b.points - a.points);
  }, [children]);

  const sortedChildren = useMemo(
    () => [...children].filter((child) => child.status === 'active').sort((a, b) => Number(b.scores || 0) - Number(a.scores || 0)),
    [children]
  );

  const scoreEvolutionData = useMemo(() => scoreLog.length && sortedTeams.length ? [{ time: 'Atual', ...Object.fromEntries(sortedTeams.map((team) => [team.name, team.points])) }] : [], [scoreLog.length, sortedTeams]);
  const teamColors = useMemo(() => Object.fromEntries(sortedTeams.map((team) => [team.name, team.color])), [sortedTeams]);

  return (
    <div className="min-h-screen bg-dark pb-24">
      <div className="max-w-md mx-auto px-4 pt-6">
        <PageHeader
          title="Pontuação"
          description="Ranking e evolução"
          icon={<Trophy size={24} />}
        />

        {/* Toggle */}
        <div className="flex rounded-lg bg-surface border border-border overflow-hidden mb-6">
          <button
            onClick={() => setViewMode('individual')}
            className={`flex-1 py-2.5 text-sm font-body font-semibold transition-colors ${
              viewMode === 'individual'
                ? 'bg-primary text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Individual
          </button>
          <button
            onClick={() => setViewMode('team')}
            className={`flex-1 py-2.5 text-sm font-body font-semibold transition-colors ${
              viewMode === 'team'
                ? 'bg-primary text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Por time
          </button>
        </div>

        {/* Individual Ranking */}
        {viewMode === 'individual' && (
          <div className="space-y-3 mb-6">
            {sortedChildren.map((child, index) => {
              const team = child.timeId ? { id: child.timeId, name: child.time_nome, color: child.time_color || '#1E9BD7', icon: '👥' } : null;
              const position = index + 1;
              const medalColor =
                position === 1
                  ? 'text-yellow-400'
                  : position === 2
                  ? 'text-gray-300'
                  : position === 3
                  ? 'text-amber-600'
                  : 'text-gray-500';
              return (
                <Card key={child.id} className="flex items-center gap-3">
                  <div className="w-8 text-center shrink-0">
                    {position <= 3 ? (
                      <Medal size={20} className={medalColor} />
                    ) : (
                      <span className="text-gray-500 font-mono font-bold text-sm">
                        {position}
                      </span>
                    )}
                  </div>
                  <Avatar
                    emoji={child.avatar || '👤'}
                    size="sm"
                    bgColor={team ? `${team.color}30` : 'bg-primary/30'}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-body font-semibold truncate">
                      {child.name}
                    </p>
                    <Badge variant={team ? 'primary' : 'muted'}>
                      {team?.icon} {team?.name}
                    </Badge>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-white font-mono font-bold">{Number(child.scores || 0)}</p>
                    <p className="text-xs text-gray-400">pts</p>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Team Ranking */}
        {viewMode === 'team' && (
          <div className="space-y-3 mb-6">
            {sortedTeams.map((team, index) => {
              const position = index + 1;
              const medalColor =
                position === 1
                  ? 'text-yellow-400'
                  : position === 2
                  ? 'text-gray-300'
                  : position === 3
                  ? 'text-amber-600'
                  : 'text-gray-500';
              return (
                <Card key={team.id} className="flex items-center gap-3">
                  <div className="w-8 text-center shrink-0">
                    {position <= 3 ? (
                      <Medal size={20} className={medalColor} />
                    ) : (
                      <span className="text-gray-500 font-mono font-bold text-sm">
                        {position}
                      </span>
                    )}
                  </div>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                    style={{ backgroundColor: `${team.color}30` }}
                  >
                    {team.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-body font-semibold truncate"
                      style={{ color: team.color }}
                    >
                      {team.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {children.filter((child) => child.timeId === team.id).length} criança{children.filter((child) => child.timeId === team.id).length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-white font-mono font-bold">{Number(team.points ?? team.score ?? 0)}</p>
                    <p className="text-xs text-gray-400">pts</p>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Score Evolution Chart */}
        <Card variant="glow" className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-primary" />
            <h3 className="text-white font-display font-semibold">
              Evolução dos times
            </h3>
          </div>
          <div className="w-full h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scoreEvolutionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e3a" />
                <XAxis
                  dataKey="time"
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                  axisLine={{ stroke: '#2d2d4a' }}
                />
                <YAxis
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                  axisLine={{ stroke: '#2d2d4a' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a2e',
                    border: '1px solid #2d2d4a',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#e5e7eb',
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '10px', color: '#9ca3af' }}
                />
                {Object.entries(teamColors).map(([name, color]) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={String(color)}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Eventos anteriores */}
        {historico.some((h) => h.eventos.length > 0) && (
          <Card className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <History size={18} className="text-primary" />
              <h3 className="text-white font-display font-semibold">Eventos anteriores</h3>
            </div>
            <div className="space-y-5">
              {historico.filter((h) => h.eventos.length > 0).map((h) => (
                <div key={h.childId}>
                  <p className="text-sm font-semibold text-gray-300 mb-2">{h.nome}</p>
                  <div className="space-y-2">
                    {h.eventos.map((ev: any) => {
                      const atual = ev.eventoId === h.eventoAtualId;
                      return (
                        <div
                          key={`${ev.criancaId}-${ev.eventoId}`}
                          className="flex items-center justify-between gap-3 rounded-xl bg-surface/50 px-3 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="text-sm text-white truncate flex items-center gap-2">
                              {ev.eventoNome || 'Evento'}
                              {atual && <Badge variant="success">Atual</Badge>}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {ev.data ? new Date(ev.data).toLocaleDateString('pt-BR') : 'Data não informada'}
                              {' · '}
                              {ev.checkpointsVisitados} {ev.checkpointsVisitados === 1 ? 'checkpoint' : 'checkpoints'}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-white font-mono font-bold text-lg">{ev.pontos}</p>
                            <p className="text-xs text-gray-400">pts</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Score Log */}
        <Card className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={18} className="text-secondary" />
            <h3 className="text-white font-display font-semibold">
              Registro de pontos
            </h3>
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-2 text-xs text-gray-500 font-semibold pb-2 border-b border-border">
              <span>Hora</span>
              <span>Criança</span>
              <span>Checkpoint</span>
              <span className="text-right">Pontos</span>
            </div>
            {scoreLog.map((log) => (
              <div
                key={log.id}
                className="grid grid-cols-4 gap-2 text-sm py-1.5 border-b border-border last:border-0"
              >
                <span className="text-gray-400 text-xs">{log.timestamp}</span>
                <span className="text-gray-300 text-xs truncate">
                  {log.childName}
                </span>
                <span className="text-gray-400 text-xs">{log.checkpoint}</span>
                <span className="text-accent font-mono font-bold text-xs text-right">
                  +{log.points}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <BottomNav items={navItems} activePath="/family/scores" />
    </div>
  );
}
