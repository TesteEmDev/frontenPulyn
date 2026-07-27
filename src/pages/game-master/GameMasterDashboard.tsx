import { useEffect, useState, useCallback } from 'react';
import { Play, Pause, Square, RotateCcw, Gamepad2, Trophy, MapPin, Users, Clock, Shield } from 'lucide-react';
import { usePulynStore } from '../../store/mockData';
import { useGameWebSocket, GameEvent } from '../../hooks/useGameWebSocket';
import Sidebar from '../../components/layout/Sidebar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import StatusDot from '../../components/ui/StatusDot';
import Timer from '../../components/ui/Timer';
import ScoreCounter from '../../components/ui/ScoreCounter';
import { api, API_URL } from '../../services/api';

const sidebarItems = [
  { icon: <Gamepad2 size={20} />, label: 'Painel', path: '/game-master' },
  { icon: <Users size={20} />, label: 'Times', path: '/game-master/teams' },
  { icon: <Play size={20} />, label: 'Controle', path: '/game-master/control' },
  { icon: <MapPin size={20} />, label: 'Mensagens', path: '/game-master/messages' },
  { icon: <Trophy size={20} />, label: 'Ranking', path: '/game-master/ranking' },
  { icon: <Shield size={20} />, label: 'Zona', path: '/game-master/zone-setup' },
];

interface TerritoryStatus {
  checkpointId: string;
  isLocked: boolean;
  isCooldown: boolean;
  ownerTeam: {
    id: string;
    name: string;
    color: string;
  } | null;
  lockedUntil: string | null;
  cooldownUntil: string | null;
  remainingSeconds?: number;
  cooldownRemaining?: number;
}

interface TreasureStatus {
  active: boolean;
  completed?: boolean;
  gameType: string;
  roundNumber?: number;
  startingTeamId?: string | null;
  startingTeamName?: string | null;
  turnTeamId?: string | null;
  turnTeamName?: string | null;
  turnRemainingSeconds?: number;
  turnAvailableAt?: string | null;
  teamRaceTimes?: Array<{
    teamId: string;
    teamName: string;
    teamColor: string;
    startedAt?: string | null;
    completedAt?: string | null;
    completed: boolean;
    elapsedSeconds?: number | null;
    elapsedMinutes?: number | null;
  }>;
  targetCheckpointId?: string | null;
  completedCheckpointIds?: string[];
  ownedCheckpoints?: number;
  totalCheckpoints?: number;
  winningTeamId?: string | null;
  winningTeamName?: string | null;
  teamsProgress?: Array<{
    teamId: string;
    teamName: string;
    teamColor: string;
    scanned: number;
    total: number;
    complete: boolean;
  }>;
}

export default function GameMasterDashboard() {
  const {
    children = [],
    teams = [],
    checkpoints = [],
    activeGame,
    gameTimer = 0,
    gameRunning = false,
    gameRound = 1,
    setGameTimer,
    setGameRunning,
    setActiveGame,
    loadTeams,
    loadChildren,
    loadCheckpoints,
    eventoAtualId,
    setEventoAtual,
  } = usePulynStore();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [territories, setTerritories] = useState<Record<string, TerritoryStatus>>({});
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [games, setGames] = useState<any[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>('');
  const [treasureStatus, setTreasureStatus] = useState<TreasureStatus>({ active: false, gameType: 'none' });
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [lastGameEvent, setLastGameEvent] = useState<{ label: string; detail: string; at: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<'start' | 'stop' | 'reset' | null>(null);

  const loadTreasureStatus = useCallback(async () => {
    if (!selectedEventId) {
      setTreasureStatus({ active: false, gameType: 'none' });
      return;
    }
    try {
      const status = await api.getTreasureEventStatus(selectedEventId);
      setTreasureStatus(status);
      if (status.active) setGameRunning(true);
    } catch (err) {
      console.error('Erro ao carregar status do Caça ao Tesouro:', err);
    }
  }, [selectedEventId, setGameRunning]);

  // ✨ WebSocket em tempo real
  const handleGameEvent = useCallback((event: GameEvent) => {
    console.log(`🎮 Evento do jogo recebido: ${event.type}`, event.payload);
    const payload = event.payload || {};
    const receivedAt = new Date().toISOString();
    const payloadEventId = payload.eventoId ? String(payload.eventoId).trim().toLowerCase() : '';
    const currentEventId = selectedEventId ? String(selectedEventId).trim().toLowerCase() : '';

    // O backend é a fonte da verdade: não aplicar eventos de outro evento.
    if (payloadEventId && currentEventId && payloadEventId !== currentEventId) {
      return;
    }

    if (event.type === 'TERRITORY_CONQUERED') {
      setLastGameEvent({
        label: 'Conquista registrada',
        detail: payload.criancaName
          ? `${payload.criancaName} conquistou um território${payload.teamName ? ` para ${payload.teamName}` : ''}.`
          : 'Um território foi atualizado.',
        at: receivedAt,
      });
      loadTeams();
      loadChildren();
    } else if (event.type === 'TREASURE_PROGRESS' || event.type === 'TREASURE_ROUND_COMPLETED') {
      setLastGameEvent({
        label: event.type === 'TREASURE_ROUND_COMPLETED' ? 'Etapa concluída' : 'Progresso do tesouro',
        detail: payload.teamName ? `${payload.teamName} atualizou o progresso da etapa.` : 'O progresso do Caça ao Tesouro foi atualizado.',
        at: receivedAt,
      });
      setTreasureStatus(prev => {
        const hasProgress = payload.teamId && payload.scanned !== undefined && payload.total !== undefined;
        const progressTeam = hasProgress ? {
          teamId: String(payload.teamId),
          teamName: payload.teamName || 'Equipe',
          teamColor: payload.teamColor || '#1E9BD7',
          scanned: Number(payload.scanned || 0),
          total: Number(payload.total || 0),
          complete: Boolean(payload.teamComplete),
        } : null;
        const currentTeams = prev.teamsProgress || [];
        const teamsProgress = progressTeam
          ? currentTeams.some(team => String(team.teamId) === String(progressTeam.teamId))
            ? currentTeams.map(team => String(team.teamId) === String(progressTeam.teamId) ? progressTeam : team)
            : [...currentTeams, progressTeam]
          : currentTeams;

        return {
          ...prev,
          active: payload.finished ? false : true,
          gameType: 'treasure_hunt',
          roundNumber: payload.roundNumber ?? prev.roundNumber,
          startingTeamId: payload.startingTeamId ?? prev.startingTeamId,
          startingTeamName: payload.startingTeamName ?? prev.startingTeamName,
          turnTeamId: payload.turnTeamId ?? (payload.finished ? null : prev.turnTeamId),
          turnTeamName: payload.turnTeamName ?? (payload.finished ? null : prev.turnTeamName),
          turnAvailableAt: payload.turnAvailableAt ?? (payload.finished ? null : prev.turnAvailableAt),
          turnRemainingSeconds: payload.turnRemainingSeconds ?? payload.turnWaitSeconds ?? prev.turnRemainingSeconds,
          targetCheckpointId: payload.nextTargetCheckpointId ?? (payload.finished ? null : prev.targetCheckpointId),
          completedCheckpointIds: payload.completedCheckpointIds || prev.completedCheckpointIds,
          teamRaceTimes: payload.teamRaceTimes || prev.teamRaceTimes,
          winningTeamId: payload.winningTeamId ?? prev.winningTeamId,
          winningTeamName: payload.winningTeamName ?? prev.winningTeamName,
          ownedCheckpoints: payload.ownedCheckpoints ?? prev.ownedCheckpoints,
          totalCheckpoints: payload.totalCheckpoints ?? prev.totalCheckpoints,
          teamsProgress,
        };
      });
      loadTreasureStatus();
    } else if (event.type === 'GAME_STARTED') {
      setLastGameEvent({ label: 'Jogo iniciado', detail: 'O evento foi iniciado pelo Game Master.', at: receivedAt });
      setGameRunning(true);
      loadTreasureStatus();
    } else if (event.type === 'GAME_STOPPED') {
      setLastGameEvent({ label: 'Jogo finalizado', detail: 'O evento foi finalizado.', at: receivedAt });
      setGameRunning(false);
      setTreasureStatus({ active: false, gameType: 'none' });
    }
  }, [loadTeams, loadChildren, setGameRunning, loadTreasureStatus]);

  const {
    connectionStatus: wsConnectionStatus,
    lastMessageAt: wsLastMessageAt,
    reconnectAttempt: wsReconnectAttempt,
  } = useGameWebSocket(selectedEventId, handleGameEvent, true);

  // Garantir que checkpoints é um array
  const safeCheckpoints = Array.isArray(checkpoints) ? checkpoints : [];
  const safeChildren = Array.isArray(children) ? children : [];
  const safeTeams = Array.isArray(teams) ? teams : [];

  // Carregar eventos e resolver um evento válido antes de buscar jogos.
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const eventosData = await api.getEventos();
        const availableEvents = Array.isArray(eventosData) ? eventosData : [];
        setEvents(availableEvents);

        const requestedId = eventoAtualId ? String(eventoAtualId).trim().toLowerCase() : '';
        const selectedEvent = availableEvents.find(
          event => String(event.id).trim().toLowerCase() === requestedId
        ) || availableEvents[0];
        const eventId = selectedEvent ? String(selectedEvent.id).trim() : '';

        setSelectedEventId(eventId);
        if (eventId && eventId !== eventoAtualId) {
          setEventoAtual(eventId);
        }
      } catch (err) {
        console.error('Erro ao carregar eventos:', err);
        setEvents([]);
        setSelectedEventId('');
      }
    };
    loadEvents();
  }, [eventoAtualId, setEventoAtual]);

  // Carregar somente os jogos do evento selecionado.
  useEffect(() => {
    const loadGames = async () => {
      if (!selectedEventId) {
        setGames([]);
        setSelectedGameId('');
        setActiveGame(null);
        return;
      }

      try {
        // O endpoint já valida o evento e devolve somente jogos do escopo solicitado.
        // Não filtrar novamente pelo evento_id evita descartar vínculos legados
        // resolvidos pelo backend e diferenças de maiúsculas/minúsculas do PostgreSQL.
        const eventGames = await api.getBrincadeiras(selectedEventId);
        setGames(eventGames);
        const firstGame = eventGames[0];
        setSelectedGameId(firstGame?.id || '');
        setActiveGame(firstGame || null);
      } catch (err) {
        console.error('Erro ao carregar jogos do evento:', err);
        setGames([]);
        setSelectedGameId('');
        setActiveGame(null);
      }
    };
    loadGames();
  }, [selectedEventId, setActiveGame]);

  // Carregar dados da API ao montar (apenas INICIAL, não polling contínuo)
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        loadTeams(),
        loadChildren(),
        loadCheckpoints(),
      ]);
      setLoading(false);
    };
    
    if (selectedEventId) {
      loadData();
    }
  }, [selectedEventId, loadTeams, loadChildren, loadCheckpoints]);

  // Carregar status dos territórios
  const loadTerritoriesStatus = async () => {
    if (safeCheckpoints.length === 0) return;
    
    const status: Record<string, TerritoryStatus> = {};
    
    for (const cp of safeCheckpoints) {
      try {
        // Usar endpoint sem autenticação (público para Arduino)
        const res = await fetch(`${API_URL}/checkpoints/${cp.id}/territory`);
        
        if (!res.ok) {
          console.warn(`⚠️ Status ${res.status} para checkpoint ${cp.id}`);
          continue;
        }
        
        const data = await res.json();
        
        // Calcular tempo restante
        if (data.isLocked && data.lockedUntil) {
          const lockedUntil = new Date(data.lockedUntil);
          const now = new Date();
          data.remainingSeconds = Math.max(0, Math.ceil((lockedUntil.getTime() - now.getTime()) / 1000));
        }
        
        if (data.isCooldown && data.cooldownUntil) {
          const cooldownUntil = new Date(data.cooldownUntil);
          const now = new Date();
          data.cooldownRemaining = Math.max(0, Math.ceil((cooldownUntil.getTime() - now.getTime()) / 1000));
        }
        
        status[cp.id] = data;
      } catch (err) {
        console.error(`Erro ao carregar status do checkpoint ${cp.id}:`, err);
        // Continuar com próximo checkpoint em caso de erro
      }
    }
    
    setTerritories(status);
  };

  // Atualizar status dos territórios periodicamente
  useEffect(() => {
    if (safeCheckpoints.length > 0) {
      loadTerritoriesStatus();
      
      const interval = setInterval(() => {
        loadTerritoriesStatus();
      }, 2000); // Atualizar a cada 2 segundos
      
      return () => clearInterval(interval);
    }
  }, [safeCheckpoints.length]);

  // O status do tesouro é persistente no backend e também é atualizado por polling.
  useEffect(() => {
    loadTreasureStatus();
    if (!selectedEventId) return;
    const interval = setInterval(loadTreasureStatus, 2000);
    return () => clearInterval(interval);
  }, [selectedEventId, loadTreasureStatus]);

  // Não há pontuação simulada: o ranking só muda por leituras NFC reais.

  // Relógio local apenas para atualizar os indicadores em tempo real.
  // Os horários de início/fim continuam vindo do backend.
  useEffect(() => {
    const interval = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  // Timer countdown
  useEffect(() => {
    if (!gameRunning || gameTimer <= 0) return;
    const interval = window.setInterval(() => {
      const currentTimer = usePulynStore.getState().gameTimer;
      setGameTimer(Math.max(0, currentTimer - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [gameRunning, setGameTimer]);

  // Stop game in the backend when the timer reaches zero.
  useEffect(() => {
    if (gameTimer > 0 || !gameRunning || !selectedEventId) return;
    setGameRunning(false);
    api.stopGame(selectedEventId)
      .then(() => setTreasureStatus({ active: false, gameType: 'none' }))
      .catch(err => console.error('Erro ao finalizar jogo pelo timer:', err));
  }, [gameTimer, gameRunning, selectedEventId, setGameRunning]);

  // Função para obter o time da criança
  const getChildTeam = (teamId: string | null) => {
    if (!teamId) return null;
    return safeTeams.find(t => t.id === teamId);
  };

  // Ranking dos participantes
  const topChildren = [...safeChildren]
    .filter(c => c.status === 'active')
    .sort((a, b) => (b.scores || 0) - (a.scores || 0))
    .slice(0, 5);

  const handleIniciar = async () => {
    if (!selectedGameId) {
      alert('Selecione um jogo primeiro');
      return;
    }
    
    if (!selectedEventId) {
      alert('Selecione um evento primeiro');
      return;
    }
    
    setActionLoading('start');
    try {
      const data = await api.startGame(
        selectedGameId,
        activeGame?.name || 'Jogo',
        selectedEventId
      );
      console.log('✅ Jogo iniciado:', data);
      setGameRunning(true);
      await loadTreasureStatus();
    } catch (err) {
      console.error('Erro ao iniciar jogo:', err);
      alert('❌ Erro ao iniciar jogo: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setActionLoading(null);
    }
  };

  const handlePausar = () => {
    setGameRunning(false);
  };

  const handleFinalizar = async () => {
    if (!selectedEventId) {
      alert('Nenhum evento selecionado');
      return;
    }
    
    setActionLoading('stop');
    try {
      const data = await api.stopGame(selectedEventId);
      console.log('✅ Jogo finalizado:', data);
      setGameRunning(false);
      setGameTimer(0);
      setTreasureStatus({ active: false, gameType: 'none' });
      await loadTerritoriesStatus();
    } catch (err) {
      console.error('Erro ao finalizar jogo:', err);
      alert('❌ Erro ao finalizar jogo: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setActionLoading(null);
    }
  };

  const handleReiniciar = () => {
    if (selectedGameId) {
      const game = games.find(g => g.id === selectedGameId);
      if (game) {
        setGameTimer((game.duration || 10) * 60);
      }
    }
    setGameRunning(false);
  };

  const handleResetarPontos = async () => {
    if (!selectedEventId) {
      alert('Nenhum evento selecionado');
      return;
    }

    // Pedir confirmação
    const confirmar = window.confirm(
      '⚠️ Tem certeza que deseja resetar TODOS os pontos?\n\nIsto vai zerar:\n✓ Pontos das crianças\n✓ Pontos dos times\n✓ Todas as leituras\n✓ Todos os territórios'
    );

    if (!confirmar) {
      return;
    }

    setActionLoading('reset');
    try {
      const response = await fetch(`${API_URL}/debug/reset-scores/${selectedEventId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      
      if (data.ok) {
        alert('✅ Pontos resetados com sucesso!');
        // Recarregar dados
        await Promise.all([
          loadTeams(),
          loadChildren(),
          loadCheckpoints(),
        ]);
        // Resetar territórios
        loadTerritoriesStatus();
      } else {
        alert('❌ Erro ao resetar pontos: ' + data.error);
      }
    } catch (err) {
      console.error('Erro ao chamar reset-scores endpoint:', err);
      alert('❌ Erro ao resetar pontos: ' + err);
    } finally {
      setActionLoading(null);
    }
  };

  const onlineCheckpoints = safeCheckpoints.filter(cp => cp.status === 'online').length;
  const totalCheckpoints = safeCheckpoints.length;
  
  // Contar checkpoints conquistados
  const conqueredCheckpoints = Object.values(territories).filter(t => t.isLocked).length;

  // Função para formatar tempo restante
  const formatRemainingTime = (seconds: number) => {
    if (seconds <= 0) return '0s';
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatRaceTime = (team: NonNullable<TreasureStatus['teamRaceTimes']>[number]) => {
    let elapsedSeconds = team.elapsedSeconds ?? null;
    const startedAt = team.startedAt ? Date.parse(team.startedAt) : NaN;

    if (Number.isFinite(startedAt)) {
      if (team.completed && team.completedAt) {
        const completedAt = Date.parse(team.completedAt);
        if (Number.isFinite(completedAt)) {
          elapsedSeconds = Math.max(0, Math.floor((completedAt - startedAt) / 1000));
        }
      } else if (!team.completed) {
        elapsedSeconds = Math.max(0, Math.floor((clockNow - startedAt) / 1000));
      }
    }

    if (elapsedSeconds === null || elapsedSeconds === undefined) {
      return 'Aguardando início';
    }

    const totalSeconds = Math.max(0, Math.floor(elapsedSeconds));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
    }

    return `${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  };

  const turnAvailableAt = treasureStatus.turnAvailableAt ? Date.parse(treasureStatus.turnAvailableAt) : NaN;
  const liveTurnRemaining = Number.isFinite(turnAvailableAt)
    ? Math.max(0, Math.ceil((turnAvailableAt - clockNow) / 1000))
    : treasureStatus.turnRemainingSeconds || 0;

  const wsStatus = wsConnectionStatus === 'connected'
    ? 'online'
    : wsConnectionStatus === 'reconnecting'
      ? 'warning'
      : 'offline';
  const wsLabel = wsConnectionStatus === 'connected'
    ? 'Tempo real conectado'
    : wsConnectionStatus === 'reconnecting'
      ? `Reconectando${wsReconnectAttempt > 0 ? ` (${wsReconnectAttempt})` : ''}`
      : wsConnectionStatus === 'connecting'
        ? 'Conectando...'
        : 'Offline';

  if (loading) {
    return (
      <div className="flex h-screen bg-dark text-white overflow-hidden">
        <Sidebar
          items={sidebarItems}
          activePath="/game-master"
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-400">Carregando dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-dark text-white overflow-hidden">
      <Sidebar
        items={sidebarItems}
        activePath="/game-master"
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <PageHeader
            title="Painel do Mestre"
            description="Controle e monitoramento do evento em tempo real"
            icon={<Gamepad2 size={28} />}
            action={
              <div className="flex flex-wrap items-center gap-2 sm:gap-3" aria-live="polite">
                <div className="flex items-center gap-2 rounded-lg bg-dark-surface/60 px-2.5 py-1.5">
                  <StatusDot status={wsStatus} size="sm" />
                  <span className="text-xs font-semibold text-gray-300">{wsLabel}</span>
                </div>
                {wsLastMessageAt && wsConnectionStatus === 'connected' && (
                  <span className="text-[11px] text-gray-500">
                    Atualizado às {wsLastMessageAt.toLocaleTimeString('pt-BR')}
                  </span>
                )}
                <Badge variant={gameRunning ? 'success' : 'warning'}>
                  {gameRunning ? 'Jogo em Andamento' : 'Jogo Pausado'}
                </Badge>
              </div>
            }
          />

          {lastGameEvent && (
            <div
              className="mb-6 flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3"
              aria-live="polite"
            >
              <Trophy size={20} className="mt-0.5 shrink-0 text-success" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-success">{lastGameEvent.label}</p>
                <p className="text-sm text-gray-300">{lastGameEvent.detail}</p>
                <p className="mt-1 text-xs text-gray-500">
                  Recebido às {new Date(lastGameEvent.at).toLocaleTimeString('pt-BR')}
                </p>
              </div>
            </div>
          )}

          {/* Seletor de Evento e Jogo */}
          <Card className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-4">
                <label className="text-sm font-semibold text-gray-300 whitespace-nowrap">Evento:</label>
                <select
                  value={selectedEventId}
                  onChange={(e) => {
                    const eventId = e.target.value;
                    setSelectedEventId(eventId);
                    setEventoAtual(eventId);
                  }}
                  className="flex-1 px-4 py-2 rounded-lg bg-dark-surface border border-dark-border text-white focus:outline-none focus:border-primary"
                >
                  <option value="">Selecionar evento...</option>
                  {events.map(event => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center gap-4">
                <label className="text-sm font-semibold text-gray-300 whitespace-nowrap">Jogo:</label>
                <select
                  value={selectedGameId}
                  onChange={(e) => {
                    const gameId = e.target.value;
                    setSelectedGameId(gameId);
                    const game = games.find(g => g.id === gameId);
                    if (game) {
                      setActiveGame(game);
                      setGameTimer((game.duration || 10) * 60);
                    }
                  }}
                  className="flex-1 px-4 py-2 rounded-lg bg-dark-surface border border-dark-border text-white focus:outline-none focus:border-primary"
                >
                  <option value="">Selecionar jogo...</option>
                  {selectedEventId && games.length === 0 && (
                    <option value="" disabled>Nenhum jogo cadastrado para este evento</option>
                  )}
                  {games.map(game => (
                    <option key={game.id} value={game.id}>
                      {game.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* Active Game Card */}
          <Card variant="glow" className="mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="font-display text-xl text-white">Jogo Ativo</h2>
                  <Badge variant={activeGame ? 'primary' : 'muted'}>
                    {activeGame ? activeGame.name : 'Nenhum jogo selecionado'}
                  </Badge>
                  {activeGame && (
                    <Badge variant="secondary">
                      Rodada {gameRound}
                    </Badge>
                  )}
                </div>
                {activeGame && (
                  <p className="text-sm text-gray-400">{activeGame.description}</p>
                )}
              </div>
              <div className="flex items-center gap-4 rounded-xl border border-primary/20 bg-dark-surface/60 px-4 py-3">
                <div className="text-center" aria-live="polite">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Tempo restante</p>
                  <Timer seconds={gameTimer} className="text-4xl" />
                  <p className="mt-1 text-xs text-gray-500">
                    {gameRunning ? 'Jogo em andamento' : 'Jogo pausado'}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Status do Caça ao Tesouro */}
          {activeGame?.type === 'treasure_hunt' && (
            <Card className="mb-6 border border-accent/40">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-display text-lg text-white">Caça ao Tesouro</h3>
                    <p className="text-sm text-gray-400">
                      {treasureStatus.completed
                        ? `Partida concluída — equipe vencedora: ${treasureStatus.winningTeamName || 'calculando resultado'}.`
                        : treasureStatus.active
                          ? `Etapa ${treasureStatus.roundNumber || 1} — todos os participantes da equipe precisam escanear o alvo.`
                          : 'Inicie o jogo para sortear o primeiro checkpoint.'}
                    </p>
                    {treasureStatus.active && treasureStatus.startingTeamName && treasureStatus.roundNumber === 1 && (
                      <p className="text-xs text-accent mt-1">
                        Equipe sorteada para começar: <strong>{treasureStatus.startingTeamName}</strong>
                      </p>
                    )}
                    {treasureStatus.active && treasureStatus.turnTeamName && (
                      <p className="text-xs text-secondary mt-1">
                        Vez da equipe: <strong>{treasureStatus.turnTeamName}</strong>
                        {liveTurnRemaining > 0
                          ? ` — aguarde ${liveTurnRemaining}s`
                          : ''}
                      </p>
                    )}
                    {treasureStatus.active && typeof treasureStatus.totalCheckpoints === 'number' && (
                      <p className="text-xs text-accent mt-1">
                        Maior domínio atual: {treasureStatus.ownedCheckpoints || 0}/{treasureStatus.totalCheckpoints} checkpoints com a mesma equipe.
                      </p>
                    )}
                  </div>
                  {treasureStatus.targetCheckpointId && (
                    <Badge variant="success">
                      Alvo: {safeCheckpoints.find(cp => String(cp.id) === String(treasureStatus.targetCheckpointId))?.name || treasureStatus.targetCheckpointId}
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(treasureStatus.teamsProgress || []).map(team => (
                    <div key={team.teamId} className="rounded-lg bg-surface/50 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-white">{team.teamName}</span>
                        <span className="text-sm" style={{ color: team.teamColor }}>{team.scanned}/{team.total}</span>
                      </div>
                      <div className="h-2 rounded-full bg-dark-surface overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${team.total ? Math.min(100, (team.scanned / team.total) * 100) : 0}%`, backgroundColor: team.teamColor || '#1E9BD7' }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{team.complete ? 'Etapa concluída' : 'Aguardando participantes'}</p>
                    </div>
                  ))}
                </div>
                {(treasureStatus.teamRaceTimes || []).length > 0 && (
                  <div className="rounded-lg bg-dark-surface/50 p-3">
                    <p className="text-sm font-semibold text-white mb-2">Tempo para acender todos os checkpoints</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {treasureStatus.teamRaceTimes?.map(team => (
                        <div key={team.teamId} className="flex items-center justify-between text-sm">
                          <span style={{ color: team.teamColor }}>{team.teamName}</span>
                          <span className={team.completed ? 'text-success font-semibold' : 'text-gray-300'}>
                            {formatRaceTime(team)}{team.completed ? ' — concluído' : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                    {treasureStatus.completed && treasureStatus.winningTeamName && (
                      <p className="text-sm text-success font-semibold mt-2">
                        🏆 Vencedora: {treasureStatus.winningTeamName}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2 lg:grid-cols-5">
            <Button
              variant="primary"
              size="lg"
              onClick={handleIniciar}
              disabled={gameRunning || !selectedGameId || actionLoading !== null}
              className="w-full"
            >
              {actionLoading === 'start' ? (
                <>
                  <span className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Iniciando...
                </>
              ) : (
                <>
                  <Play size={24} className="mr-2" />
                  Iniciar
                </>
              )}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={handlePausar}
              disabled={!gameRunning || actionLoading !== null}
              className="w-full"
            >
              <Pause size={24} className="mr-2" />
              Pausar
            </Button>
            <Button
              variant="danger"
              size="lg"
              onClick={handleFinalizar}
              disabled={(!gameRunning && gameTimer === 0) || actionLoading !== null}
              className="w-full"
            >
              {actionLoading === 'stop' ? (
                <>
                  <span className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Finalizando...
                </>
              ) : (
                <>
                  <Square size={24} className="mr-2" />
                  Finalizar
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={handleReiniciar}
              disabled={actionLoading !== null}
              className="w-full border border-dark-border"
            >
              <RotateCcw size={24} className="mr-2" />
              Reiniciar
            </Button>
            <Button
              variant="warning"
              size="lg"
              onClick={handleResetarPontos}
              disabled={actionLoading !== null}
              className="w-full"
            >
              {actionLoading === 'reset' ? (
                <>
                  <span className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-dark/40 border-t-dark" />
                  Resetando...
                </>
              ) : (
                <>
                  <RotateCcw size={24} className="mr-2" />
                  Reset
                </>
              )}
            </Button>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Live Ranking */}
            <Card variant="glow">
              <div className="flex items-center gap-2 mb-4">
                <Trophy size={20} className="text-accent" />
                <h3 className="font-display text-lg text-white">Ranking ao Vivo</h3>
              </div>
              <div className="space-y-3">
                {topChildren.length > 0 ? (
                  topChildren.map((child, index) => {
                    const team = getChildTeam(child.time_id || null);
                    return (
                      <div
                        key={child.id}
                        className="flex items-center gap-3 p-2 rounded-lg bg-surface/50 hover:bg-surface transition-colors"
                      >
                        <span className="font-mono text-lg font-bold text-gray-500 w-6 text-center">
                          {index + 1}
                        </span>
                        <Avatar emoji={child.avatar || '👤'} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">
                            {child.nickname || child.name}
                          </p>
                          {team && (
                            <Badge
                              variant="muted"
                              className="text-[10px]"
                            >
                              <span
                                className="inline-block w-2 h-2 rounded-full mr-1"
                                style={{ backgroundColor: team.color }}
                              />
                              {team.name}
                            </Badge>
                          )}
                        </div>
                        <ScoreCounter value={child.scores || 0} className="text-xl" />
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-500 text-sm text-center py-4">
                    Nenhuma criança ativa ainda
                  </p>
                )}
              </div>
            </Card>

            {/* Territories Status Card */}
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Shield size={20} className="text-primary" />
                <h3 className="font-display text-lg text-white">Conquista de Territórios</h3>
                <Badge variant="primary">
                  🏆 {conqueredCheckpoints}/{totalCheckpoints} conquistados
                </Badge>
              </div>
              <div className="space-y-3">
                {safeCheckpoints.length > 0 ? (
                  safeCheckpoints.map(cp => {
                    const territory = territories[cp.id];
                    const isLocked = territory?.isLocked || false;
                    const ownerTeam = territory?.ownerTeam;
                    const remainingSeconds = territory?.remainingSeconds || 0;
                    const cooldownRemaining = territory?.cooldownRemaining || 0;
                    
                    return (
                      <div
                        key={cp.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-surface/50"
                      >
                        <div className="flex items-center gap-3">
                          <MapPin size={18} className="text-secondary" />
                          <div>
                            <p className="text-sm font-semibold text-white">{cp.name}</p>
                            <p className="text-xs text-gray-500">{cp.zone || 'Sem zona'}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {isLocked ? (
                            <>
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: ownerTeam?.color || '#666', opacity: 0.8 }}
                              >
                                <span className="text-xs font-bold text-white">🏆</span>
                              </div>
                              <div className="text-right">
                                <Badge variant="warning" className="text-xs">
                                  {ownerTeam?.name || 'Desconhecido'}
                                </Badge>
                                <div className="flex items-center gap-1 mt-1">
                                  <Clock size={12} className="text-gray-500" />
                                  <span className="text-xs text-gray-400">
                                    {formatRemainingTime(remainingSeconds)}
                                  </span>
                                </div>
                              </div>
                            </>
                          ) : territory?.isCooldown ? (
                            <>
                              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-surface">
                                <Clock size={16} className="text-gray-500" />
                              </div>
                              <div className="text-right">
                                <Badge variant="muted" className="text-xs">
                                  ⏳ Cooldown
                                </Badge>
                                <div className="flex items-center gap-1 mt-1">
                                  <Clock size={12} className="text-gray-500" />
                                  <span className="text-xs text-gray-400">
                                    {formatRemainingTime(cooldownRemaining)}
                                  </span>
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-success/20">
                                <Shield size={16} className="text-success" />
                              </div>
                              <div className="text-right">
                                <Badge variant="success" className="text-xs">
                                  📭 Disponível
                                </Badge>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-500 text-sm text-center py-4">
                    Nenhum checkpoint cadastrado
                  </p>
                )}
              </div>
            </Card>

            {/* Checkpoint Status (Online/Offline) */}
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <MapPin size={20} className="text-secondary" />
                <h3 className="font-display text-lg text-white">Status dos Checkpoints</h3>
                <Badge variant={onlineCheckpoints === totalCheckpoints && totalCheckpoints > 0 ? 'success' : 'warning'}>
                  {onlineCheckpoints}/{totalCheckpoints} online
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {safeCheckpoints.length > 0 ? (
                  safeCheckpoints.map(cp => (
                    <div
                      key={cp.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-surface/50"
                    >
                      <StatusDot status={cp.status} size="lg" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {cp.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {cp.zone} &middot; {cp.points || 0} pts
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm text-center py-4 col-span-2">
                    Nenhum checkpoint cadastrado
                  </p>
                )}
              </div>
            </Card>

            {/* Teams Ranking */}
            <Card className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Users size={20} className="text-primary" />
                <h3 className="font-display text-lg text-white">Times</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {safeTeams.length > 0 ? (
                  safeTeams.map(team => {
                    const teamMembers = safeChildren.filter(c => c.time_id === team.id || c.teamId === team.id);
                    const teamScore = teamMembers.reduce((sum, c) => sum + (c.scores || 0), 0);
                    
                    return (
                      <div
                        key={team.id}
                        className="rounded-xl border border-border p-4 bg-surface/30 hover:bg-surface/50 transition-colors"
                      >
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-xl mb-3"
                          style={{ backgroundColor: team.color + '30' }}
                        >
                          👥
                        </div>
                        <p className="font-display text-white font-semibold">{team.name}</p>
                        <p className="text-sm text-gray-400 mt-1">
                          {teamMembers.length} criança{teamMembers.length !== 1 ? 's' : ''}
                        </p>
                        <div className="mt-3 pt-3 border-t border-border">
                          <ScoreCounter value={teamScore} className="text-lg" />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-500 text-sm text-center py-4 col-span-4">
                    Nenhum time cadastrado
                  </p>
                )}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}