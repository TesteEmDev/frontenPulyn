import { useCallback, useEffect, useMemo, useState } from 'react';
import { Trophy, Medal, Star, Zap, Target, Clock, MapPin, Users, ArrowLeft } from 'lucide-react';
import { useGameWebSocket } from '../../hooks/useGameWebSocket';
import { usePulynStore } from '../../store/mockData';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Monster3D from '../../components/display/Monster3D';
import DisplayMap from './DisplayMap';
import { TreasureArena, type TreasureArenaEvent, type TreasureArenaStatus } from '../../components/display/TreasureArena';

interface MonsterDisplayMonster {
  teamId: string;
  teamName: string;
  teamColor: string;
  monsterHp: number;
  monsterMaxHp: number;
  monsterDefeated?: boolean;
  victory?: boolean;
  scanned: number;
  total: number;
  complete: boolean;
  version?: number;
}

interface MonsterDisplayStatus {
  active: boolean;
  completed?: boolean;
  gameCompleted?: boolean;
  gameType?: string;
  monsterHp?: number;
  monsterMaxHp?: number;
  monsterDefeated?: boolean;
  monsterSpecialCheckpoint?: string | null;
  monsters?: MonsterDisplayMonster[];
  progress?: MonsterDisplayMonster[];
}

const sameEventId = (left: unknown, right: unknown) => (
  String(left || '').trim().toLowerCase() === String(right || '').trim().toLowerCase()
);

export default function DisplayMain() {

  const [currentTime, setCurrentTime] = useState(new Date());
  const [showNotification, setShowNotification] = useState(false);
  const [notificationData, setNotificationData] = useState<{
    name: string;
    checkpoint: string;
    points: number;
    color: string;
  } | null>(null);

  const {
    eventoAtualId,
    children,
    teams,
    checkpoints,
    scoreLog,
    events,
    loadChildren,
    loadTeams,
    loadCheckpoints,
    loadScoreLog,
  } = usePulynStore();
  const selectedEventId = eventoAtualId || '';
  const [loading, setLoading] = useState(true);
  const [displayMessages, setDisplayMessages] = useState<any[]>([]);
  const [selectedGameType, setSelectedGameType] = useState<string | null>(null);
  const [selectedGameName, setSelectedGameName] = useState<string | null>(null);
  const [treasureStatus, setTreasureStatus] = useState<TreasureArenaStatus | null>(null);
  const [lastTreasureEvent, setLastTreasureEvent] = useState<TreasureArenaEvent | null>(null);
  const [monsterStatus, setMonsterStatus] = useState<MonsterDisplayStatus | null>(null);

  const topParticipants = useMemo(() => [...children]
    .filter(child => child.status === 'active')
    .sort((a, b) => Number(b.scores || 0) - Number(a.scores || 0))
    .slice(0, 5), [children]);
  const topTeams = useMemo(() => [...teams]
    .sort((a, b) => Number(b.points || b.score || 0) - Number(a.points || a.score || 0))
    .slice(0, 5), [teams]);
  const recentActivities = useMemo(() => scoreLog
    .map((entry: any) => ({
      id: entry.id,
      childName: entry.childName || entry.child_name || 'Participante',
      checkpoint: entry.checkpoint || entry.checkpoint_name || 'Checkpoint',
      points: Number(entry.points || 0),
      timestamp: entry.timestamp || entry.created_at,
      teamColor: entry.teamColor || entry.team_color || '#FFFF00',
    }))
    .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
    .slice(0, 10), [scoreLog]);
  const checkpointStats = useMemo(() => checkpoints.map(cp => {
    const checkpointReadings = scoreLog.filter((entry: any) => String(entry.checkpointId || entry.checkpoint_id) === String(cp.id));
    const totalReadings = checkpointReadings.length;
    return {
      ...cp,
      totalReadings,
      authorizedReadings: totalReadings,
      successRate: totalReadings > 0 ? 100 : 0,
    };
  }), [checkpoints, scoreLog]);

  const refreshTreasureStatus = useCallback(async () => {
    if (!selectedEventId) {
      setTreasureStatus(null);
      return;
    }

    try {
      const { api } = await import('../../services/api');
      const status = await api.getTreasureEventStatus(selectedEventId);
      setTreasureStatus(
        status?.gameType === 'treasure_hunt' && (status?.active || status?.completed)
          ? {
              ...status,
              completed: Boolean(status.completed),
              initialWait: status.initialWait ?? (
                Number(status.roundNumber) === 1 && Number(status.turnRemainingSeconds) > 0
              ),
            }
          : null
      );
    } catch (err) {
      console.error('Erro ao atualizar status do Caça ao Tesouro no telão:', err);
      setTreasureStatus(null);
    }
  }, [selectedEventId]);

  const refreshMonsterStatus = useCallback(async () => {
    if (!selectedEventId) {
      setMonsterStatus(null);
      return;
    }
    try {
      const { api } = await import('../../services/api');
      const status = await api.getMonsterEventStatus(selectedEventId);
      setMonsterStatus(
        status?.gameType === 'monster_hunt' && (status?.active || status?.completed)
          ? status
          : null
      );
    } catch (err) {
      console.error('Erro ao atualizar status do Caça ao Monstro no telão:', err);
      setMonsterStatus(null);
    }
  }, [selectedEventId]);

  // A fonte de dados do telão é o store compartilhado. Ao trocar o evento,
  // carrega somente o contexto atual e ignora respostas atrasadas.
  useEffect(() => {
    let disposed = false;

    const loadEventData = async () => {
      setLoading(true);
      setDisplayMessages([]);
      setLastTreasureEvent(null);
      setSelectedGameType(null);
      setSelectedGameName(null);
      setTreasureStatus(null);
      setMonsterStatus(null);
      if (!selectedEventId) {
        setLoading(false);
        return;
      }

      try {
        const { api } = await import('../../services/api');
        try {
          const gameState = await api.getGameState(selectedEventId);
          if (!disposed && gameState?.selected) {
            setSelectedGameType(gameState.gameType || null);
            setSelectedGameName(gameState.gameName || null);
          }
        } catch (stateError) {
          console.error('Erro ao restaurar seleção do jogo no telão:', stateError);
        }
        await Promise.all([
          loadTeams(),
          loadChildren(),
          loadCheckpoints(),
          loadScoreLog(),
        ]);
        if (disposed) return;

        try {
          const messagesData = await api.getDisplayMessages(selectedEventId);
          if (!disposed) setDisplayMessages(Array.isArray(messagesData) ? messagesData : []);
        } catch (messageError) {
          console.error('Erro ao carregar mensagens do display:', messageError);
        }

        await Promise.all([refreshTreasureStatus(), refreshMonsterStatus()]);
      } catch (err) {
        if (!disposed) console.error('Erro ao carregar dados do evento:', err);
      } finally {
        if (!disposed) setLoading(false);
      }
    };

    loadEventData();
    return () => { disposed = true; };
  }, [loadTeams, loadChildren, loadCheckpoints, loadScoreLog, refreshTreasureStatus, refreshMonsterStatus, selectedEventId]);

  // Reconsultar o status persistido evita perder o timer quando o telão
  // conecta depois do GAME_STARTED ou quando o WebSocket reconecta.
  useEffect(() => {
    if (!selectedEventId) return;

    refreshTreasureStatus();
    refreshMonsterStatus();
    const interval = window.setInterval(() => {
      refreshTreasureStatus();
      refreshMonsterStatus();
    }, 2000);
    return () => window.clearInterval(interval);
  }, [selectedEventId, refreshTreasureStatus, refreshMonsterStatus]);

  // WebSocket para eventos em tempo real
  const { connectionStatus, lastMessageAt } = useGameWebSocket(
    selectedEventId || null,
    (event) => {
      // Processar eventos do WebSocket
      if (event.type === 'GAME_SELECTED' && sameEventId(event.payload?.eventoId ?? event.payload?.evento_id, selectedEventId)) {
        setSelectedGameType(event.payload?.gameType || null);
        setSelectedGameName(event.payload?.gameName || null);
        setTreasureStatus(null);
        setLastTreasureEvent(null);
        setMonsterStatus(null);
      } else if (event.type === 'DISPLAY_MESSAGE' && sameEventId(event.payload?.evento_id ?? event.payload?.eventoId, selectedEventId)) {
        setDisplayMessages((previous) => [event.payload, ...previous].slice(0, 50));
      } else if (['MONSTER_PROGRESS', 'MONSTER_SPECIAL_ATTACK', 'MONSTER_TEAM_DEFEATED', 'MONSTER_DEFEATED'].includes(event.type) && sameEventId(event.payload?.eventoId, selectedEventId)) {
        const payload = event.payload || {};
        const monsters = Array.isArray(payload.monsters)
          ? payload.monsters
          : Array.isArray(payload.progress) ? payload.progress : payload.teamsProgress;
        setTreasureStatus(null);
        setMonsterStatus(prev => ({
          ...(prev || { active: true, gameType: 'monster_hunt' }),
          active: payload.gameCompleted !== undefined ? !payload.gameCompleted : event.type !== 'MONSTER_DEFEATED',
          completed: Boolean(payload.gameCompleted),
          gameCompleted: Boolean(payload.gameCompleted),
          gameType: 'monster_hunt',
          monsterHp: payload.monsterHp ?? prev?.monsterHp,
          monsterMaxHp: payload.monsterMaxHp ?? prev?.monsterMaxHp,
          monsterDefeated: Boolean(payload.gameCompleted),
          monsters: monsters?.length ? monsters : prev?.monsters,
          progress: monsters?.length ? monsters : prev?.progress,
        }));
        refreshMonsterStatus();
      } else if (event.type === 'GAME_STARTED' && sameEventId(event.payload?.eventoId, selectedEventId)) {
        const treasure = event.payload?.treasure;

        const gameType = event.payload?.gameType;
        setSelectedGameType(gameType || null);
        setSelectedGameName(event.payload?.gameName || null);
        if (gameType === 'treasure_hunt') {
          setMonsterStatus(null);
          if (treasure?.startingTeamName) {
            setTreasureStatus({
              active: true,
              gameType: 'treasure_hunt',
              startingTeamId: treasure.startingTeamId || null,
              startingTeamName: treasure.startingTeamName,
              turnTeamId: treasure.turnTeamId || treasure.startingTeamId || null,
              turnTeamName: treasure.turnTeamName || treasure.startingTeamName,
              turnAvailableAt: treasure.turnAvailableAt || null,
              turnRemainingSeconds: treasure.turnRemainingSeconds ?? 0,
              turnWaitSeconds: treasure.turnWaitSeconds ?? 0,
              initialWait: treasure.initialWait ?? false,
              targetCheckpointId: treasure.targetCheckpointId || null,
            });
          }
          refreshTreasureStatus();
        } else if (gameType === 'monster_hunt') {
          setTreasureStatus(null);
          const monsterStart = event.payload?.monster;
          setMonsterStatus({
            active: true,
            gameType: 'monster_hunt',
            monsterHp: monsterStart?.monsterHp,
            monsterMaxHp: monsterStart?.monsterMaxHp,
            monsters: monsterStart?.monsters || monsterStart?.progress || [],
            progress: monsterStart?.monsters || monsterStart?.progress || [],
          });
          refreshMonsterStatus();
        } else {
          setTreasureStatus(null);
          setMonsterStatus(null);
        }
      } else if (event.type === 'GAME_STOPPED' && sameEventId(event.payload?.eventoId ?? event.payload?.evento_id, selectedEventId)) {
        setSelectedGameType(null);
        setSelectedGameName(null);
        setTreasureStatus(null);
        setLastTreasureEvent(null);
        setMonsterStatus(null);
      } else if ((event.type === 'TREASURE_PROGRESS' || event.type === 'TREASURE_ROUND_COMPLETED') && sameEventId(event.payload?.eventoId ?? event.payload?.evento_id, selectedEventId)) {
        const payload = event.payload || {};
        setMonsterStatus(null);
        setLastTreasureEvent({
          type: event.type,
          payload,
        });
        setTreasureStatus(prev => prev ? {
          ...prev,
          active: !payload.finished,
          completed: Boolean(payload.finished),
          roundNumber: payload.roundNumber ?? prev.roundNumber,
          winningTeamId: payload.winningTeamId ?? prev.winningTeamId,
          winningTeamName: payload.winningTeamName ?? prev.winningTeamName,
          turnTeamName: payload.turnTeamName || prev.turnTeamName,
          turnTeamId: Object.prototype.hasOwnProperty.call(payload, 'turnTeamId')
            ? payload.turnTeamId
            : prev.turnTeamId,
          turnAvailableAt: Object.prototype.hasOwnProperty.call(payload, 'turnAvailableAt')
            ? payload.turnAvailableAt
            : prev.turnAvailableAt,
          turnRemainingSeconds: payload.turnRemainingSeconds ?? payload.remainingSeconds ?? prev.turnRemainingSeconds,
          turnWaitSeconds: Object.prototype.hasOwnProperty.call(payload, 'turnWaitSeconds')
            ? payload.turnWaitSeconds
            : prev.turnWaitSeconds,
          initialWait: event.type === 'TREASURE_ROUND_COMPLETED' ? false : prev.initialWait,
          targetCheckpointId: payload.nextTargetCheckpointId ?? payload.targetCheckpointId ?? prev.targetCheckpointId,
          completedCheckpointIds: payload.completedCheckpointIds ?? prev.completedCheckpointIds,
          ownedCheckpoints: payload.ownedCheckpoints ?? prev.ownedCheckpoints,
          totalCheckpoints: payload.totalCheckpoints ?? prev.totalCheckpoints,
          checkpointOwnership: payload.checkpointOwnership ?? (
            payload.teamCompletedAllCheckpoints && !payload.finished
              ? (prev.checkpointOwnership || []).map((item) => ({ ...item, teamId: null }))
              : prev.checkpointOwnership
          ),
          teamRaceTimes: payload.teamRaceTimes ?? prev.teamRaceTimes,
        } : prev);
        refreshTreasureStatus();
        const { criancaName, checkpointId, teamColor, points } = event.payload;
        
        // Encontrar nome do checkpoint
        const checkpoint = checkpoints.find(cp => cp.id === checkpointId);
        const checkpointName = checkpoint?.name || `Checkpoint ${checkpointId}`;
        
        // O estado compartilhado é atualizado pelo DisplayRealtimeBridge;
        // esta tela mantém apenas o feedback visual da conquista.
        
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
  const totalReadings = scoreLog.length;
  const totalScores = children.reduce((sum, child) => sum + Number(child.scores || 0), 0);
  const normalizedGameContext = `${selectedGameType || ''} ${selectedGameName || ''}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const isZoneGame = ['zone_conquest', 'zone', 'territory', 'territory_conquest'].includes(selectedGameType || '')
    || /\b(zona|zone|territor)/.test(normalizedGameContext);

  const monsterCards = monsterStatus?.monsters?.length
    ? monsterStatus.monsters
    : monsterStatus?.progress || [];

  // Se não houver evento selecionado, aguardar o comando da recepção.
  if (!selectedEventId) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#08111f] p-6">
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -right-24 h-[30rem] w-[30rem] rounded-full bg-secondary/10 blur-3xl" />
        <Card variant="glow" className="relative w-full max-w-md border-primary-400/20 bg-dark-card/90 p-8 text-center shadow-[0_24px_80px_rgba(2,10,24,0.45)]">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary-300/20 bg-primary-500/10 text-3xl shadow-[0_0_35px_rgba(30,155,215,0.18)]">⚡</div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-primary-300">Pulyn Arena</p>
          <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">Aguardando o evento</h1>
          <p className="mt-3 text-sm leading-6 text-gray-400">A recepção precisa selecionar um evento para liberar a arena.</p>
          {loading && <div className="mx-auto mt-7 h-9 w-9 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />}
        </Card>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#08111f] px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -left-48 top-24 h-[32rem] w-[32rem] rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-56 bottom-0 h-[34rem] w-[34rem] rounded-full bg-secondary/10 blur-3xl" />
      {/* Botão de Sair - Canto superior esquerdo */}
      <div className="absolute left-4 top-4 z-40 sm:left-6 sm:top-6">
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-dark-card/80 px-3.5 py-2 text-sm font-semibold text-gray-300 shadow-lg shadow-black/10 backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-400/40 hover:bg-dark-surface hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/60"
          title="Voltar (ESC)"
        >
          <ArrowLeft size={17} />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>

      {/* Notificação Animada de Conquista */}
      {showNotification && notificationData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm pointer-events-none">
          <div className="animate-in fade-in zoom-in duration-500 pointer-events-auto">
            <div
              className="w-full max-w-xl rounded-3xl border-2 px-8 py-8 shadow-2xl sm:px-12 sm:py-10"
              style={{
                backgroundColor: notificationData.color + '18',
                borderColor: notificationData.color,
                boxShadow: `0 0 80px ${notificationData.color}45, inset 0 0 35px ${notificationData.color}15`
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
        <div className="relative mb-7 overflow-hidden rounded-3xl border border-white/10 bg-dark-card/75 p-5 text-center shadow-[0_18px_50px_rgba(2,10,24,0.2)] backdrop-blur-xl sm:p-7">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-300/70 to-transparent" />
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary-300/20 bg-primary-500/10 text-2xl shadow-[0_0_30px_rgba(30,155,215,0.15)]">⚡</div>
            <h1 className="font-display text-4xl font-bold tracking-tight text-white sm:text-6xl">
              Pulyn Arena
            </h1>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5" aria-live="polite">
              <div className={`h-2.5 w-2.5 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-success animate-pulse'
                  : connectionStatus === 'reconnecting' || connectionStatus === 'connecting'
                    ? 'bg-warning animate-pulse'
                    : 'bg-danger'
              }`} />
              <span className="text-xs font-semibold text-gray-300">
                {connectionStatus === 'connected'
                  ? 'Ao vivo'
                  : connectionStatus === 'reconnecting'
                    ? 'Reconectando'
                    : connectionStatus === 'connecting'
                      ? 'Conectando'
                      : 'Desconectado'}
              </span>
              {lastMessageAt && connectionStatus === 'connected' && (
                <span className="hidden text-[11px] text-gray-500 sm:inline">
                  · {lastMessageAt.toLocaleTimeString('pt-BR')}
                </span>
              )}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            <p className="max-w-full truncate text-base font-semibold text-gray-200 sm:text-xl">
              {events.find(e => e.id === selectedEventId)?.name || 'Evento selecionado'}
            </p>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary-400/20 bg-secondary-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-secondary-300">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary-400" /> Recepção no controle
            </span>
          </div>
          {selectedGameType && !monsterStatus?.active && !treasureStatus?.active && (
            <div className="mx-auto mb-6 max-w-2xl rounded-2xl border border-primary-400/25 bg-primary-500/10 px-6 py-5 text-center shadow-[0_12px_35px_rgba(30,155,215,0.08)]" aria-live="polite">
              <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500/15 text-lg">🎮</div>
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-primary-300">Jogo selecionado</p>
              <p className="mt-1 font-display text-2xl font-bold text-white">
                {selectedGameName || (selectedGameType === 'monster_hunt' ? 'Derrote o Monstro' : selectedGameType === 'treasure_hunt' ? 'Caça ao Tesouro' : 'Jogo de território')}
              </p>
              <p className="mt-1 text-sm text-gray-400">Aguardando o Game Master iniciar a partida</p>
            </div>
          )}

          {selectedGameType === 'monster_hunt' && monsterStatus?.gameType === 'monster_hunt' && (
            <div className="mx-auto mb-6 max-w-6xl rounded-3xl border-2 border-danger/70 bg-gradient-to-br from-red-950/80 via-dark-surface/90 to-purple-950/70 p-5 shadow-2xl shadow-danger/20 sm:p-6" aria-live="polite">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-danger">Caça ao Monstro</p>
                  <h2 className="font-display text-4xl font-bold text-white">Um monstro para cada equipe</h2>
                </div>
                <div className="rounded-full border border-danger/40 bg-danger/10 px-4 py-2 text-sm font-bold text-red-100">
                  {monsterCards.filter(monster => monster.monsterDefeated).length}/{monsterCards.length} derrotados
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                {monsterCards.map((monster) => {
                  const hp = Number(monster.monsterHp || 0);
                  const maxHp = Number(monster.monsterMaxHp || 500);
                  const defeated = Boolean(monster.monsterDefeated || monster.victory);
                  const progressPercent = maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0;
                  return (
                    <article key={monster.teamId} className="overflow-hidden rounded-2xl border border-white/10 bg-black/25" style={{ borderColor: `${monster.teamColor || '#ef4444'}66` }}>
                      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Equipe</p>
                          <h3 className="truncate font-display text-2xl font-bold" style={{ color: monster.teamColor || '#f87171' }}>{monster.teamName}</h3>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${defeated ? 'bg-success/15 text-success' : 'bg-danger/15 text-red-200'}`}>
                          {defeated ? 'Monstro derrotado' : 'Em batalha'}
                        </span>
                      </div>
                      <div className="p-3">
                        <Monster3D
                          hp={hp}
                          maxHp={maxHp}
                          defeated={defeated}
                          teamName={monster.teamName}
                          teamColor={monster.teamColor}
                          winnerTeamName={defeated ? monster.teamName : null}
                          winnerTeamColor={monster.teamColor}
                        />
                        <div className="mt-3 flex items-center justify-between text-sm font-semibold text-gray-200">
                          <span>Energia do monstro</span>
                          <span>{hp}/{maxHp} HP</span>
                        </div>
                        <div className="mt-2 h-4 overflow-hidden rounded-full border border-white/10 bg-black/50 p-0.5">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progressPercent}%`, backgroundColor: monster.teamColor || '#ef4444' }} />
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                          <span>{monster.scanned}/{monster.total} participantes atacaram</span>
                          <span>{monster.complete ? 'Ataque especial liberado' : 'Ataques em andamento'}</span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {selectedGameType === 'treasure_hunt' && treasureStatus?.gameType === 'treasure_hunt' &&
            (treasureStatus.active || treasureStatus.completed) && (
            <div className="mx-auto mb-6 max-w-6xl">
              <TreasureArena
                status={treasureStatus}
                checkpoints={checkpoints}
                teams={teams}
                lastEvent={lastTreasureEvent}
              />
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-white/[0.06] pt-4 text-center">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-primary-300" />
              <p className="font-mono text-xl font-bold tracking-wide text-primary-300 sm:text-2xl">{formattedTime}</p>
            </div>
            <span className="hidden h-4 w-px bg-white/10 sm:block" />
            <p className="text-xs capitalize text-gray-500 sm:text-sm">{formattedDate}</p>
          </div>
        </div>

        {isZoneGame && !monsterStatus?.active && !treasureStatus?.active && (
          <div className="mb-8" aria-live="polite">
            <DisplayMap embedded />
          </div>
        )}

        {/* Cards de estatísticas */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Card variant="glow" className="group relative overflow-hidden p-4 sm:p-5">
            <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full bg-primary/10 blur-2xl transition group-hover:bg-primary/20" />
            <div className="relative flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 sm:text-xs">Participantes</p>
                <p className="mt-2 text-2xl font-bold text-white sm:text-3xl">{activeParticipants}/{totalParticipants}</p>
                <p className="mt-1 text-xs text-gray-400">ativos no evento</p>
              </div>
              <div className="rounded-xl border border-primary-400/20 bg-primary-500/10 p-2 text-primary-300"><Users size={20} /></div>
            </div>
          </Card>

          <Card variant="secondary" className="group relative overflow-hidden p-4 sm:p-5">
            <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full bg-secondary/10 blur-2xl transition group-hover:bg-secondary/20" />
            <div className="relative flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 sm:text-xs">Checkpoints</p>
                <p className="mt-2 text-2xl font-bold text-white sm:text-3xl">{onlineCheckpoints}/{totalCheckpoints}</p>
                <p className="mt-1 text-xs text-gray-400">online agora</p>
              </div>
              <div className="rounded-xl border border-secondary-400/20 bg-secondary-500/10 p-2 text-secondary-300"><Target size={20} /></div>
            </div>
          </Card>

          <Card variant="glow" className="group relative overflow-hidden p-4 sm:p-5">
            <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full bg-accent/10 blur-2xl transition group-hover:bg-accent/20" />
            <div className="relative flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 sm:text-xs">Leituras</p>
                <p className="mt-2 text-2xl font-bold text-white sm:text-3xl">{totalReadings}</p>
                <p className="mt-1 text-xs text-gray-400">conquistas registradas</p>
              </div>
              <div className="rounded-xl border border-accent-400/20 bg-accent-500/10 p-2 text-accent-300"><Zap size={20} /></div>
            </div>
          </Card>

          <Card variant="glow" className="group relative overflow-hidden p-4 sm:p-5">
            <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full bg-warning/10 blur-2xl transition group-hover:bg-warning/20" />
            <div className="relative flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 sm:text-xs">Pontuação</p>
                <p className="mt-2 text-2xl font-bold text-white sm:text-3xl">{totalScores}</p>
                <p className="mt-1 text-xs text-gray-400">pontos acumulados</p>
              </div>
              <div className="rounded-xl border border-warning-400/20 bg-warning-500/10 p-2 text-warning-300"><Trophy size={20} /></div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           {/* Ranking de Participantes */}
           <Card variant="glow" className="overflow-hidden p-4 sm:p-5">
             <div className="mb-5 flex items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
               <div className="flex items-center gap-3">
                 <div className="rounded-xl border border-warning-400/20 bg-warning-500/10 p-2 text-warning-300"><Medal size={20} /></div>
                 <div>
                   <h2 className="font-display text-xl font-bold text-white">🏆 Top Participantes</h2>
                   <p className="mt-0.5 text-xs text-gray-500">Quem está liderando a festa</p>
                 </div>
               </div>
               <Badge variant="warning">Top 5</Badge>
             </div>
             <div className="space-y-3">
               {topParticipants.length > 0 ? (
                 topParticipants.map((child, index) => (
                   <div
                     key={child.id}
                     className={`flex items-center gap-3 rounded-2xl border p-4 transition-all duration-200 ${
                       index === 0
                         ? 'border-warning/50 bg-warning/10 shadow-[0_0_20px_rgba(245,166,35,0.2)]'
                         : 'border-white/[0.06] bg-white/[0.025] hover:border-white/10 hover:bg-white/[0.05]'
                     }`}
                   >
                     <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg" style={{
                       backgroundColor: index === 0 ? 'rgba(245, 166, 35, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                       color: index === 0 ? '#F5A623' : '#9CA3AF'
                     }}>
                       {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                     </div>
                     <div className="flex-1">
                       <p className="font-semibold text-white text-xl">
                         {child.nickname || child.name}
                       </p>
                       <p className="text-sm text-gray-400">
                         {child.age} anos
                       </p>
                     </div>
                     <div className="text-right">
                       <p className={`font-bold text-2xl ${index === 0 ? 'text-warning' : 'text-primary'}`}>
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
          <Card variant="secondary" className="overflow-hidden p-4 sm:p-5">
            <div className="mb-5 flex items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-primary-400/20 bg-primary-500/10 p-2 text-primary-300"><Trophy size={20} /></div>
                <div>
                  <h2 className="font-display text-xl font-bold text-white">Ranking de Times</h2>
                  <p className="mt-0.5 text-xs text-gray-500">A disputa pelo primeiro lugar</p>
                </div>
              </div>
              <Badge variant="primary">Top 5</Badge>
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
                      className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3.5 transition-all duration-200 hover:border-white/10 hover:bg-white/[0.05]"
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
                          {Number(team.points ?? team.score ?? teamTotalPoints)}
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

          {displayMessages.length > 0 && (
            <Card variant="secondary" className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Zap size={24} className="text-accent" />
                <h2 className="font-display text-xl text-white">Mensagem do recreacionista</h2>
              </div>
              <div className="rounded-xl border border-accent/40 bg-accent/10 px-6 py-5 text-center">
                <p className="font-display text-3xl font-bold text-white">{displayMessages[0].text}</p>
                <p className="mt-2 text-xs text-gray-400">{displayMessages[0].timestamp ? new Date(displayMessages[0].timestamp).toLocaleTimeString('pt-BR') : ''}</p>
              </div>
            </Card>
          )}

          <Card variant="glow" className="overflow-hidden p-4 sm:p-5 lg:col-span-2">
            <div className="mb-5 flex items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-secondary-400/20 bg-secondary-500/10 p-2 text-secondary-300"><Clock size={20} /></div>
                <div>
                  <h2 className="font-display text-xl font-bold text-white">Atividades Recentes</h2>
                  <p className="mt-0.5 text-xs text-gray-500">Últimas conquistas em tempo real</p>
                </div>
              </div>
              <span className="hidden rounded-full border border-success-400/20 bg-success-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-success-300 sm:inline-flex">Ao vivo</span>
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
          <Card variant="glow" className="overflow-hidden p-4 sm:p-5 lg:col-span-2">
            <div className="mb-5 flex items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-accent-400/20 bg-accent-500/10 p-2 text-accent-300"><MapPin size={20} /></div>
                <div>
                  <h2 className="font-display text-xl font-bold text-white">📍 Status dos Checkpoints</h2>
                  <p className="mt-0.5 text-xs text-gray-500">Saúde dos territórios conectados</p>
                </div>
              </div>
              <Badge variant={onlineCheckpoints === totalCheckpoints && totalCheckpoints > 0 ? 'success' : 'warning'}>
                {onlineCheckpoints}/{totalCheckpoints} online
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {checkpointStats.length > 0 ? (
                checkpointStats.map((cp) => (
                  <div
                    key={cp.id}
                    className={`rounded-2xl border p-4 transition-all duration-200 ${
                      cp.status === 'online'
                        ? 'border-accent/40 bg-accent/10 shadow-[0_0_15px_rgba(120,119,198,0.15)]'
                        : 'border-danger/30 bg-danger/5'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-white text-lg">{cp.name}</h3>
                      <Badge variant={cp.status === 'online' ? 'success' : 'danger'}>
                        {cp.status === 'online' ? '🟢 Online' : '🔴 Offline'}
                      </Badge>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Leituras:</span>
                        <span className="font-bold text-white text-lg">{cp.totalReadings}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Autorizadas:</span>
                        <span className="font-bold text-success text-lg">{cp.authorizedReadings}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Taxa de Sucesso:</span>
                        <span className="font-bold text-primary text-lg">{cp.successRate}%</span>
                      </div>
                    </div>
                    <div className="mt-4 h-3 bg-surface rounded-full overflow-hidden border border-white/10">
                      <div
                        className="h-full bg-gradient-to-r from-accent to-primary rounded-full transition-all duration-500"
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