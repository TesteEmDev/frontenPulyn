import { useState, useEffect, useRef, useCallback } from 'react';
import { Trophy, Users, ArrowUp, ArrowDown, Minus, Gamepad2, Play, MapPin } from 'lucide-react';
import { usePulynStore, type Child, type Team } from '../../store/mockData';
import Sidebar from '../../components/layout/Sidebar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import ScoreCounter from '../../components/ui/ScoreCounter';

const sidebarItems = [
  { icon: <Gamepad2 size={20} />, label: 'Painel', path: '/game-master' },
  { icon: <Users size={20} />, label: 'Times', path: '/game-master/teams' },
  { icon: <Play size={20} />, label: 'Controle', path: '/game-master/control' },
  { icon: <MapPin size={20} />, label: 'Mensagens', path: '/game-master/messages' },
  { icon: <Trophy size={20} />, label: 'Ranking', path: '/game-master/ranking' },
];

type ViewMode = 'individual' | 'team';

interface RankingEntry {
  id: string;
  name: string;
  avatar: string;
  score: number;
  previousScore: number;
  teamColor?: string;
  teamName?: string;
}

function getVariation(current: number, previous: number): 'up' | 'down' | 'same' {
  if (current > previous) return 'up';
  if (current < previous) return 'down';
  return 'same';
}

export default function GameMasterRanking() {
  const {
    children,
    teams,
    simulateScore,
    gameRunning,
  } = usePulynStore();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('individual');
  const [rankingEntries, setRankingEntries] = useState<RankingEntry[]>([]);
  const [previousRanking, setPreviousRanking] = useState<RankingEntry[]>([]);
  const prevScoresRef = useRef<Map<string, number>>(new Map());

  const buildIndividualRanking = useCallback(() => {
    return children
      .filter(c => c.status === 'active' && c.score > 0)  // ✅ Mostrar apenas quem fez pontos
      .sort((a, b) => b.score - a.score)
      .map(c => {
        const team = c.team ? teams.find(t => t.id === c.team) : null;
        return {
          id: c.id,
          name: c.nickname,
          avatar: c.avatar,
          score: c.score,
          previousScore: prevScoresRef.current.get(c.id) ?? c.score,
          teamColor: team?.color,
          teamName: team?.name,
        };
      });
  }, [children, teams]);

  const buildTeamRanking = useCallback(() => {
    return [...teams]
      .filter(t => t.score > 0)  // ✅ Mostrar apenas times que fizeram pontos
      .sort((a, b) => b.score - a.score)
      .map(t => ({
        id: t.id,
        name: t.name,
        avatar: t.icon,
        score: t.score,
        previousScore: prevScoresRef.current.get(`team-${t.id}`) ?? t.score,
        teamColor: t.color,
        teamName: t.name,
      }));
  }, [teams]);

  // Initialize ranking
  useEffect(() => {
    const entries = viewMode === 'individual' ? buildIndividualRanking() : buildTeamRanking();
    setRankingEntries(entries);
    setPreviousRanking(entries);

    // Store current scores as previous
    const scoreMap = new Map<string, number>();
    if (viewMode === 'individual') {
      children.filter(c => c.status === 'active' && c.score > 0).forEach(c => {
        scoreMap.set(c.id, c.score);
      });
    } else {
      teams.filter(t => t.score > 0).forEach(t => {
        scoreMap.set(`team-${t.id}`, t.score);
      });
    }
    prevScoresRef.current = scoreMap;
  }, [viewMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Simulated updates every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      // Store current scores before update
      const scoreMap = new Map<string, number>();
      if (viewMode === 'individual') {
        children.filter(c => c.status === 'active' && c.score > 0).forEach(c => {
          scoreMap.set(c.id, c.score);
        });
      } else {
        teams.filter(t => t.score > 0).forEach(t => {
          scoreMap.set(`team-${t.id}`, t.score);
        });
      }
      prevScoresRef.current = scoreMap;

      // ❌ REMOVIDO: simulateScore() que adicionava pontos aleatórios
      // Agora os pontos vêm apenas do backend (pulseiras)

      // Rebuild ranking after update
      const newEntries = viewMode === 'individual' ? buildIndividualRanking() : buildTeamRanking();
      setPreviousRanking(rankingEntries);
      setRankingEntries(newEntries);
    }, 5000);

    return () => clearInterval(interval);
  }, [viewMode, gameRunning, children, teams, simulateScore, rankingEntries, buildIndividualRanking, buildTeamRanking]);

  // Get position change from previous ranking
  const getPositionChange = (entryId: string, currentIndex: number): number => {
    const prevIndex = previousRanking.findIndex(e => e.id === entryId);
    if (prevIndex === -1) return 0;
    return prevIndex - currentIndex; // positive = moved up, negative = moved down
  };

  const getPodiumStyle = (position: number) => {
    switch (position) {
      case 0:
        return 'bg-amber-500/10 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.15)]';
      case 1:
        return 'bg-gray-400/10 border-gray-400/30';
      case 2:
        return 'bg-orange-700/10 border-orange-700/30';
      default:
        return 'bg-surface/30 border-border';
    }
  };

  const getPodiumBadge = (position: number) => {
    switch (position) {
      case 0:
        return <span className="text-2xl">🥇</span>;
      case 1:
        return <span className="text-2xl">🥈</span>;
      case 2:
        return <span className="text-2xl">🥉</span>;
      default:
        return <span className="font-mono text-lg font-bold text-gray-500">{position + 1}</span>;
    }
  };

  return (
    <div className="flex h-screen bg-dark text-white overflow-hidden">
      <Sidebar
        items={sidebarItems}
        activePath="/game-master/ranking"
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        title="Pulyn GM"
      />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          <PageHeader
            title="Ranking ao Vivo"
            description="Classificacao atualizada em tempo real"
            icon={<Trophy size={28} />}
            action={
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => setViewMode('individual')}
                  className={`
                    px-4 py-2 text-sm font-semibold transition-colors duration-200
                    ${viewMode === 'individual'
                      ? 'bg-primary text-white'
                      : 'bg-surface text-gray-400 hover:text-white'
                    }
                  `}
                >
                  Individual
                </button>
                <button
                  onClick={() => setViewMode('team')}
                  className={`
                    px-4 py-2 text-sm font-semibold transition-colors duration-200
                    ${viewMode === 'team'
                      ? 'bg-primary text-white'
                      : 'bg-surface text-gray-400 hover:text-white'
                    }
                  `}
                >
                  Por Time
                </button>
              </div>
            }
          />

          {/* Ranking List */}
          <Card variant="glow">
            <div className="flex items-center gap-2 mb-6">
              <Trophy size={20} className="text-accent" />
              <h3 className="font-display text-lg text-white">
                {viewMode === 'individual' ? 'Ranking Individual' : 'Ranking por Time'}
              </h3>
              <Badge variant={gameRunning ? 'success' : 'warning'}>
                {gameRunning ? 'Ao vivo' : 'Pausado'}
              </Badge>
            </div>

            <div className="space-y-3">
              {rankingEntries.map((entry, index) => {
                const positionChange = getPositionChange(entry.id, index);
                const variation = getVariation(entry.score, entry.previousScore);

                return (
                  <div
                    key={entry.id}
                    className={`
                      flex items-center gap-4 p-4 rounded-xl border
                      transition-all duration-500 ease-out
                      ${getPodiumStyle(index)}
                    `}
                  >
                    {/* Position */}
                    <div className="w-10 flex items-center justify-center shrink-0">
                      {getPodiumBadge(index)}
                    </div>

                    {/* Avatar */}
                    {viewMode === 'individual' ? (
                      <Avatar emoji={entry.avatar} size="md" />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                        style={{ backgroundColor: (entry.teamColor || '#1E9BD7') + '30' }}
                      >
                        {entry.avatar}
                      </div>
                    )}

                    {/* Name + Team */}
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-semibold text-white truncate">
                        {entry.name}
                      </p>
                      {entry.teamName && viewMode === 'individual' && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: entry.teamColor }}
                          />
                          <span className="text-xs text-gray-400">{entry.teamName}</span>
                        </div>
                      )}
                    </div>

                    {/* Variation Arrow */}
                    <div className="w-8 flex items-center justify-center shrink-0">
                      {positionChange > 0 && (
                        <ArrowUp size={18} className="text-emerald-400 animate-bounce" />
                      )}
                      {positionChange < 0 && (
                        <ArrowDown size={18} className="text-red-400 animate-bounce" />
                      )}
                      {positionChange === 0 && variation === 'same' && (
                        <Minus size={18} className="text-gray-600" />
                      )}
                      {positionChange === 0 && variation === 'up' && (
                        <ArrowUp size={18} className="text-emerald-400/50" />
                      )}
                    </div>

                    {/* Score */}
                    <div className="text-right shrink-0">
                      <ScoreCounter value={entry.score} className="text-xl" />
                      {variation === 'up' && entry.score > entry.previousScore && (
                        <p className="text-xs text-emerald-400 font-mono">
                          +{entry.score - entry.previousScore}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}

              {rankingEntries.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-8">
                  Nenhum participante ativo ainda
                </p>
              )}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
