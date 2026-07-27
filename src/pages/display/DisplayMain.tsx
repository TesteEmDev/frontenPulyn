import { useEffect, useState } from 'react';
import { Trophy, Medal, Star, Zap, Target, Clock, MapPin, Users, ArrowLeft } from 'lucide-react';
import { usePulynStore } from '../../store/mockData';
import { useGameWebSocket } from '../../hooks/useGameWebSocket';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

interface Activity {
  id: string;
  childName: string;
  checkpoint: string;
  points: number;
  timestamp: string;
  teamColor?: string;
}

interface TreasureDisplayStatus {
  active: boolean;
  gameType?: string;
  startingTeamId?: string | null;
  startingTeamName?: string | null;
  turnTeamName?: string | null;
  turnAvailableAt?: string | null;
  turnRemainingSeconds?: number;
  turnWaitSeconds?: number | null;
  initialWait?: boolean;
  targetCheckpointId?: string | null;
}

export default function DisplayMain() {
  const { 
    loadTeams,
    loadChildren,
    loadCheckpoints,
  } = usePulynStore();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [topParticipants, setTopParticipants] = useState<any[]>([]);
  const [topTeams, setTopTeams] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [checkpointStats, setCheckpointStats] = useState<any[]>([]);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationData, setNotificationData] = useState<{
    name: string;
    checkpoint: string;
    points: number;
    color: string;
  } | null>(null);

  // Estado para seleção de evento
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [scoreLog, setScoreLog] = useState<any[]>([]);
  const [treasureStatus, setTreasureStatus] = useState<TreasureDisplayStatus | null>(null);

  // Carregar eventos ao montar
  useEffect(() => {
    const loadEventsData = async () => {
      try {
        const { api } = await import('../../services/api');
        const eventosData = await api.getEventos();
        setEvents(eventosData || []);
        
        if (eventosData && eventosData.length > 0) {
          setSelectedEventId(eventosData[0].id);
        }
      } catch (err) {
        console.error('Erro ao carregar eventos:', err);
      }
    };
    loadEventsData();
  }, []);

  // Carregar dados quando evento é selecionado
  useEffect(() => {
    const loadEventData = async () => {
      if (!selectedEventId) return;
      
      setLoading(true);
      try {
        const { api } = await import('../../services/api');
        
        // Carregar crianças, times e checkpoints para este evento
        const childrenData = await api.getCriancas(selectedEventId);
        const teamsData = await api.getTimes(selectedEventId);
        const checkpointsData = await api.getCheckpoints(selectedEventId);
        
        setChildren(childrenData || []);
        setTeams(teamsData || []);
        setCheckpoints(checkpointsData || []);
        setScoreLog([]);

        try {
          const status = await api.getTreasureEventStatus(selectedEventId);
          setTreasureStatus(
            status?.active && status?.gameType === 'treasure_hunt'
              ? {
                  ...status,
                  initialWait: status.initialWait ?? (
                    Number(status.roundNumber) === 1 && Number(status.turnRemainingSeconds) > 0
                  ),
                }
              : null
          );
        } catch (err) {
          // O telão continua funcionando mesmo se o evento não tiver Caça ao Tesouro.
          setTreasureStatus(null);
        }
      } catch (err) {
        console.error('Erro ao carregar dados do evento:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadEventData();
  }, [selectedEventId]);

  // WebSocket para eventos em tempo real
  const { connectionStatus, lastMessageAt } = useGameWebSocket(
    selectedEventId || null,
    (event) => {
      // Processar eventos do WebSocket
      if (event.type === 'GAME_STARTED' && event.payload?.eventoId === selectedEventId) {
        const treasure = event.payload?.treasure;

        if (event.payload?.gameType === 'treasure_hunt' && treasure?.startingTeamName) {
          setTreasureStatus({
            active: true,
            gameType: 'treasure_hunt',
            startingTeamId: treasure.startingTeamId || null,
            startingTeamName: treasure.startingTeamName,
            turnTeamName: treasure.turnTeamName || treasure.startingTeamName,
            turnAvailableAt: treasure.turnAvailableAt || null,
            turnRemainingSeconds: treasure.turnRemainingSeconds ?? 0,
            turnWaitSeconds: treasure.turnWaitSeconds ?? 0,
            initialWait: treasure.initialWait ?? false,
            targetCheckpointId: treasure.targetCheckpointId || null,
          });
        } else if (event.payload?.gameType === 'treasure_hunt') {
          import('../../services/api').then(({ api }) => api.getTreasureEventStatus(selectedEventId))
            .then(status => {
              setTreasureStatus(
                status?.active && status?.gameType === 'treasure_hunt'
                  ? {
                      ...status,
                      initialWait: status.initialWait ?? (
                        Number(status.roundNumber) === 1 && Number(status.turnRemainingSeconds) > 0
                      ),
                    }
                  : null
              );
            })
            .catch(err => console.error('Erro ao carregar equipe sorteada no telão:', err));
        }
      } else if (event.type === 'GAME_STOPPED' && event.payload?.eventoId === selectedEventId) {
        setTreasureStatus(null);
      } else if (event.type === 'TREASURE_PROGRESS' || event.type === 'TREASURE_ROUND_COMPLETED') {
        setTreasureStatus(prev => prev ? {
          ...prev,
          active: !event.payload?.finished,
          turnTeamName: event.payload?.turnTeamName || prev.turnTeamName,
          turnAvailableAt: Object.prototype.hasOwnProperty.call(event.payload || {}, 'turnAvailableAt')
            ? event.payload.turnAvailableAt
            : prev.turnAvailableAt,
          turnRemainingSeconds: Object.prototype.hasOwnProperty.call(event.payload || {}, 'turnRemainingSeconds')
            ? event.payload.turnRemainingSeconds
            : prev.turnRemainingSeconds,
          turnWaitSeconds: Object.prototype.hasOwnProperty.call(event.payload || {}, 'turnWaitSeconds')
            ? event.payload.turnWaitSeconds
            : prev.turnWaitSeconds,
          initialWait: event.type === 'TREASURE_ROUND_COMPLETED'
            ? false
            : prev.initialWait,
          targetCheckpointId: event.payload?.nextTargetCheckpointId ?? prev.targetCheckpointId,
        } : prev);
      } else if (event.type === 'TERRITORY_CONQUERED') {
        const { criancaName, checkpointId, teamColor, points } = event.payload;
        
        // Encontrar nome do checkpoint
        const checkpoint = checkpoints.find(cp => cp.id === checkpointId);
        const checkpointName = checkpoint?.name || `Checkpoint ${checkpointId}`;
        
        // Adicionar ao início da lista de atividades recentes
        const newActivity: Activity = {
          id: `${Date.now()}-${Math.random()}`,
          childName: criancaName,
          checkpoint: checkpointName,
          points: points,
          timestamp: new Date().toLocaleTimeString('pt-BR'),
          teamColor: teamColor
        };
        
        setRecentActivities(prev => [newActivity, ...prev].slice(0, 10));
        
        // Mostrar notificação animada
        setNotificationData({
          name: criancaName,
          checkpoint: checkpointName,
          points: points,
          color: teamColor || '#FFFF00'
        });
        setShowNotification(true);
        
        // Esconder notificação após 3 segundos
        setTimeout(() => {
          setShowNotification(false);
        }, 3000);
        
        // ✨ NOVO: Recarregar dados de crianças e times para atualizar rankings
        const reloadData = async () => {
          try {
            const { api } = await import('../../services/api');
            const childrenData = await api.getCriancas(selectedEventId);
            const teamsData = await api.getTimes(selectedEventId);
            setChildren(childrenData || []);
            setTeams(teamsData || []);
          } catch (err) {
            console.error('Erro ao recarregar dados:', err);
          }
        };
        reloadData();
      }
    }
  );

  // Atualiza o relógio
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ✨ NOVO: ESC key para sair do telão
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.history.back();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Atualiza os dados quando crianças, times ou checkpoints mudam
  useEffect(() => {
    if (loading) return;

    // Top participantes
    const sortedChildren = [...children]
      .sort((a, b) => (b.scores || 0) - (a.scores || 0))
      .slice(0, 5);
    setTopParticipants(sortedChildren);

    // Top times
    const sortedTeams = [...teams]
      .sort((a, b) => (b.points || 0) - (a.points || 0))
      .slice(0, 5);
    setTopTeams(sortedTeams);

    // Atividades recentes (de scoreLog ou vazio se não houver dados)
    const recent = [...scoreLog]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
    if (recentActivities.length === 0) {
      setRecentActivities(recent);
    }

    // Estatísticas dos checkpoints
    const stats = checkpoints.map(cp => {
      return {
        ...cp,
        totalReadings: 0,
        authorizedReadings: 0,
        successRate: 0
      };
    });
    setCheckpointStats(stats);
  }, [children, teams, checkpoints, scoreLog, loading]);

  // Formatar hora
  const formattedTime = currentTime.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const formattedDate = currentTime.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Total de participantes ativos
  const activeParticipants = children.filter(c => c.status === 'active').length;
  const totalParticipants = children.length;
  const onlineCheckpoints = checkpoints.filter(cp => cp.status === 'online').length;
  const totalCheckpoints = checkpoints.length;
  const totalReadings = 0;
  const totalScores = scoreLog.reduce((sum, log) => sum + (log.points || 0), 0);
  const treasureStartingTeam = treasureStatus?.startingTeamId
    ? teams.find(team => String(team.id) === String(treasureStatus.startingTeamId))
    : teams.find(team => team.name === treasureStatus?.startingTeamName);
  const treasureTeamColor = treasureStartingTeam?.color || '#F5A623';
  const liveTurnRemaining = treasureStatus?.turnAvailableAt
    ? Math.max(0, Math.ceil((Date.parse(treasureStatus.turnAvailableAt) - currentTime.getTime()) / 1000))
    : 0;
  const showTreasureTurnTimer = Boolean(
    treasureStatus?.active &&
    liveTurnRemaining > 0 &&
    (treasureStatus.initialWait ||
      treasureStatus.turnWaitSeconds === undefined ||
      treasureStatus.turnWaitSeconds === null ||
      treasureStatus.turnWaitSeconds > 0)
  );

  // Se não houver evento selecionado, mostrar tela de seleção
  if (!selectedEventId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark via-dark/95 to-primary/10 p-6 flex items-center justify-center">
        <Card variant="glow" className="max-w-md w-full">
          <div className="text-center mb-6">
            <h1 className="font-display text-4xl font-bold text-white mb-2">
              Pulyn Arena
            </h1>
            <p className="text-gray-400">Selecione um evento para começar</p>
          </div>
          
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-gray-400">Carregando eventos...</p>
              </div>
            ) : events.length > 0 ? (
              <>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Evento:
                </label>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-dark-surface border border-primary text-white focus:outline-none focus:border-primary text-lg"
                >
                  <option value="">Selecionar evento...</option>
                  {events.map(event => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <p className="text-center text-gray-400 py-8">
                Nenhum evento disponível
              </p>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark via-dark/95 to-primary/10 p-6 relative">
      {/* Botão de Sair - Canto superior esquerdo */}
      <div className="absolute top-6 left-6 z-40">
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 rounded-lg bg-surface/80 hover:bg-surface text-sm text-gray-300 hover:text-white transition-all duration-300 flex items-center gap-2 backdrop-blur-md"
          title="Voltar (ESC)"
        >
          <ArrowLeft size={18} />
          Sair
        </button>
      </div>

      {/* Notificação Animada de Conquista - GRANDE */}
      {showNotification && notificationData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="animate-in fade-in zoom-in duration-500 pointer-events-auto">
            <div
              className="px-12 py-8 rounded-2xl shadow-2xl border-4 transform transition-all duration-300"
              style={{
                backgroundColor: notificationData.color + '15',
                borderColor: notificationData.color,
                boxShadow: `0 0 60px ${notificationData.color}60, inset 0 0 30px ${notificationData.color}20`
              }}
            >
              <div className="flex flex-col items-center gap-6 text-center">
                {/* Animação de partículas/brilho */}
                <div className="relative w-24 h-24">
                  <div
                    className="absolute inset-0 rounded-full animate-pulse"
                    style={{
                      backgroundColor: notificationData.color,
                      opacity: 0.3
                    }}
                  />
                  <div
                    className="absolute inset-2 rounded-full animate-spin"
                    style={{
                      borderWidth: '3px',
                      borderColor: `${notificationData.color} transparent transparent transparent`,
                      animationDuration: '2s'
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-5xl">
                    ⚡
                  </div>
                </div>

                {/* Nome da criança */}
                <div>
                  <p
                    className="font-display text-5xl font-bold mb-2"
                    style={{ color: notificationData.color }}
                  >
                    {notificationData.name}
                  </p>
                  <p className="text-2xl text-white font-semibold">
                    conquistou o território!
                  </p>
                </div>

                {/* Checkpoint e pontos */}
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-3">
                    <MapPin size={32} style={{ color: notificationData.color }} />
                    <p className="text-3xl text-white font-semibold">
                      {notificationData.checkpoint}
                    </p>
                  </div>
                  <div
                    className="inline-block px-8 py-4 rounded-xl text-3xl font-bold"
                    style={{
                      backgroundColor: notificationData.color + '30',
                      color: notificationData.color,
                      border: `2px solid ${notificationData.color}`
                    }}
                  >
                    +{notificationData.points} pontos
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header com data/hora */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <h1 className="font-display text-5xl font-bold text-white">
              Pulyn Arena
            </h1>
            <div className="flex items-center gap-2" aria-live="polite">
              <div className={`h-3 w-3 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-success animate-pulse'
                  : connectionStatus === 'reconnecting' || connectionStatus === 'connecting'
                    ? 'bg-warning animate-pulse'
                    : 'bg-danger'
              }`} />
              <span className="text-xs text-gray-400">
                {connectionStatus === 'connected'
                  ? 'Em tempo real'
                  : connectionStatus === 'reconnecting'
                    ? 'Reconectando...'
                    : connectionStatus === 'connecting'
                      ? 'Conectando...'
                      : 'Desconectado'}
              </span>
              {lastMessageAt && connectionStatus === 'connected' && (
                <span className="text-[11px] text-gray-500">
                  · {lastMessageAt.toLocaleTimeString('pt-BR')}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 mb-4">
            <p className="text-xl text-gray-300">
              {events.find(e => e.id === selectedEventId)?.name || 'Evento não selecionado'}
            </p>
            <button
              onClick={() => setSelectedEventId('')}
              className="px-3 py-1 rounded-lg bg-surface/50 hover:bg-surface text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2"
              title="Trocar evento"
            >
              <ArrowLeft size={16} />
              Trocar
            </button>
          </div>

          {treasureStatus?.active && treasureStatus.startingTeamName && (
            <div
              className="mx-auto mb-6 flex max-w-3xl flex-col items-center justify-center gap-5 rounded-2xl border-2 px-6 py-5 text-center shadow-lg"
              style={{
                borderColor: `${treasureTeamColor}99`,
                backgroundColor: `${treasureTeamColor}18`,
                boxShadow: `0 0 28px ${treasureTeamColor}22`,
              }}
              aria-live="polite"
            >
              <div className="flex w-full flex-col items-center justify-center gap-5 md:flex-row md:items-center md:gap-8">
                <div className="flex min-w-0 items-center gap-4 text-center md:text-left">
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-2xl"
                    style={{ backgroundColor: `${treasureTeamColor}35`, color: treasureTeamColor }}
                  >
                    🏆
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold uppercase tracking-wider text-gray-300">
                      Caça ao Tesouro iniciado
                    </p>
                    <p className="mt-1 text-xs text-gray-400">Equipe sorteada para começar</p>
                    <p className="truncate font-display text-3xl font-bold" style={{ color: treasureTeamColor }}>
                      {treasureStatus.startingTeamName}
                    </p>
                    {treasureStatus.turnTeamName && (
                      <p className="mt-1 text-sm text-gray-300">
                        Vez da equipe: <strong>{treasureStatus.turnTeamName}</strong>
                      </p>
                    )}
                  </div>
                </div>
                {showTreasureTurnTimer && (
                  <div className="flex w-full max-w-sm shrink-0 flex-col items-center rounded-xl border border-warning/60 bg-warning/10 px-6 py-4 text-center md:w-auto">
                    <p className="text-xs font-semibold uppercase tracking-wider text-warning">
                      {treasureStatus.initialWait ? 'A equipe começa em' : 'Próxima equipe começa em'}
                    </p>
                    <p className="mt-2 font-mono text-7xl font-bold leading-none text-white md:text-8xl">
                      {liveTurnRemaining}s
                    </p>
                  </div>
                )}
              </div>
              <Badge variant="warning" className="shrink-0 px-3 py-2 text-xs">
                Primeira equipe
              </Badge>
            </div>
          )}

          <div className="flex justify-center gap-8 text-center">
            <div>
              <p className="text-3xl font-mono text-primary font-bold">{formattedTime}</p>
              <p className="text-sm text-gray-400 mt-1">{formattedDate}</p>
            </div>
          </div>
        </div>

        {/* Cards de estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card variant="glow" className="text-center p-4">
            <Users size={32} className="text-primary mx-auto mb-2" />
            <p className="text-3xl font-bold text-white">{activeParticipants}/{totalParticipants}</p>
            <p className="text-sm text-gray-400">Participantes Ativos</p>
          </Card>

          <Card variant="glow" className="text-center p-4">
            <Target size={32} className="text-secondary mx-auto mb-2" />
            <p className="text-3xl font-bold text-white">{onlineCheckpoints}/{totalCheckpoints}</p>
            <p className="text-sm text-gray-400">Checkpoints Online</p>
          </Card>

          <Card variant="glow" className="text-center p-4">
            <Zap size={32} className="text-accent mx-auto mb-2" />
            <p className="text-3xl font-bold text-white">{totalReadings}</p>
            <p className="text-sm text-gray-400">Leituras Realizadas</p>
          </Card>

          <Card variant="glow" className="text-center p-4">
            <Trophy size={32} className="text-warning mx-auto mb-2" />
            <p className="text-3xl font-bold text-white">{totalScores}</p>
            <p className="text-sm text-gray-400">Pontos Totais</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ranking de Participantes */}
          <Card variant="glow">
            <div className="flex items-center gap-2 mb-4">
              <Medal size={24} className="text-warning" />
              <h2 className="font-display text-xl text-white">Top Participantes</h2>
            </div>
            <div className="space-y-3">
              {topParticipants.length > 0 ? (
                topParticipants.map((child, index) => (
                  <div
                    key={child.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-surface/50 hover:bg-surface transition-colors"
                  >
                    <div className="flex-shrink-0 w-8 text-center">
                      {index === 0 ? (
                        <Trophy size={20} className="text-warning mx-auto" />
                      ) : index === 1 ? (
                        <Medal size={20} className="text-gray-400 mx-auto" />
                      ) : index === 2 ? (
                        <Medal size={20} className="text-amber-600 mx-auto" />
                      ) : (
                        <span className="text-gray-500 font-bold">{index + 1}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-white">
                        {child.nickname || child.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {child.age} anos
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-primary">
                        {child.scores || 0}
                      </p>
                      <p className="text-xs text-gray-500">pontos</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Nenhum participante cadastrado
                </p>
              )}
            </div>
          </Card>

          {/* Ranking de Times */}
          <Card variant="glow">
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={24} className="text-primary" />
              <h2 className="font-display text-xl text-white">Ranking de Times</h2>
            </div>
            <div className="space-y-3">
              {topTeams.length > 0 ? (
                topTeams.map((team) => {
                  // Calcular pontos totais do time
                  const teamMembers = children.filter(c => c.time_id === team.id || c.teamId === team.id);
                  const teamTotalPoints = teamMembers.reduce((sum, c) => sum + (c.scores || 0), 0);
                  
                  return (
                    <div
                      key={team.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-surface/50 hover:bg-surface transition-colors"
                    >
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: team.color + '30' }}
                      >
                        <span className="text-xl">👥</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-white">{team.name}</p>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: team.color }}
                          />
                          <p className="text-xs text-gray-400">
                            {teamMembers.length} criança{teamMembers.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-secondary">
                          {teamTotalPoints}
                        </p>
                        <p className="text-xs text-gray-500">pontos</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Nenhum time cadastrado
                </p>
              )}
            </div>
          </Card>

          {/* Atividades Recentes */}
          <Card variant="glow" className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={24} className="text-secondary" />
              <h2 className="font-display text-xl text-white">Atividades Recentes</h2>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity, index) => (
                  <div
                    key={activity.id}
                    className={`flex items-center justify-between p-3 rounded-lg transition-all duration-300 ${
                      index === 0
                        ? 'bg-success/10 border border-success/50 animate-in fade-in slide-in-from-top-2'
                        : 'bg-surface/30 hover:bg-surface/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          index === 0 ? 'animate-pulse' : ''
                        }`}
                        style={{
                          backgroundColor: (activity.teamColor || '#FFFF00') + '30',
                          borderWidth: index === 0 ? '2px' : '0px',
                          borderColor: activity.teamColor || '#FFFF00'
                        }}
                      >
                        <Star size={14} style={{ color: activity.teamColor || '#FFFF00' }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {activity.childName}
                        </p>
                        <p className="text-xs text-gray-400">
                          {activity.checkpoint}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="success" className="text-xs">
                        +{activity.points} pts
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        {activity.timestamp}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Nenhuma atividade registrada
                </p>
              )}
            </div>
          </Card>

          {/* Status dos Checkpoints */}
          <Card variant="glow" className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={24} className="text-accent" />
              <h2 className="font-display text-xl text-white">Status dos Checkpoints</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {checkpointStats.length > 0 ? (
                checkpointStats.map((cp) => (
                  <div
                    key={cp.id}
                    className="p-4 rounded-lg bg-surface/30 border border-border"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-white">{cp.name}</h3>
                      <Badge variant={cp.status === 'online' ? 'success' : 'danger'}>
                        {cp.status === 'online' ? 'Online' : 'Offline'}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Leituras:</span>
                        <span className="text-white">{cp.totalReadings}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Autorizadas:</span>
                        <span className="text-success">{cp.authorizedReadings}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Taxa de Sucesso:</span>
                        <span className="text-primary">{cp.successRate}%</span>
                      </div>
                    </div>
                    <div className="mt-3 h-2 bg-surface rounded-full overflow-hidden">
                      <div
                        className="h-full bg-success rounded-full transition-all"
                        style={{ width: `${cp.successRate}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8 col-span-3">
                  Nenhum checkpoint cadastrado
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}