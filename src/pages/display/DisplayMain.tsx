import { useCallback, useEffect, useMemo, useState } from 'react';
import { mensagemParaTela } from '../../services/api';
import { Trophy, Medal, Star, Zap, Clock, MapPin, Users, ArrowLeft } from 'lucide-react';
import { useGameWebSocket } from '../../hooks/useGameWebSocket';
import { useZoneConquestGame, type ZoneConquestStatus } from '../../hooks/useZoneConquestGame';
import { ZoneConquestIndividualRanking } from '../../components/display/ZoneConquestIndividualRanking';
import { usePulynStore } from '../../store/mockData';
import Card from '../../components/ui/Card';
import BombaMapa from '../../components/display/BombaMapa';
import RefemMapa from '../../components/display/RefemMapa';
import ZonaDominioPlacar from '../../components/display/ZonaDominioPlacar';
import Badge from '../../components/ui/Badge';
import Monster3D from '../../components/display/Monster3D';
import DisplayMap from './DisplayMap';
import GameGuide, { type GuideGame } from '../../components/display/GameGuide';
import FitToBox from '../../components/display/FitToBox';
import { useTypewriterCycle } from '../../hooks/useTypewriterCycle';
import { TreasureArena, type TreasureArenaEvent, type TreasureArenaStatus } from '../../components/display/TreasureArena';
import RouletteOverlay, { type RouletteData } from '../../components/game-master/RouletteOverlay';

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
  const [loading, setLoading] = useState(true);
  const [displayMessages, setDisplayMessages] = useState<any[]>([]);
  // Quando a última mensagem do recreacionista CHEGOU a este telão (o relógio do servidor pode destoar do da TV)
  const [messageArrivedAt, setMessageArrivedAt] = useState(0);
  // Roleta da brincadeira paralela ("Ache o objeto"): gira no telão quando o recreacionista inicia.
  const [parallelRoulette, setParallelRoulette] = useState<RouletteData | null>(null);
  const [selectedGameType, setSelectedGameType] = useState<string | null>(null);
  const [selectedGameName, setSelectedGameName] = useState<string | null>(null);
  const [treasureStatus, setTreasureStatus] = useState<TreasureArenaStatus | null>(null);
  const [lastTreasureEvent, setLastTreasureEvent] = useState<TreasureArenaEvent | null>(null);
  const [monsterStatus, setMonsterStatus] = useState<MonsterDisplayStatus | null>(null);
  const [zoneConquestStatus, setZoneConquestStatus] = useState<ZoneConquestStatus | null>(null);
  const [floorPlan, setFloorPlan] = useState<string | null>(null);
  // Há jogo rodando agora? (vem do estado persistido do evento e dos eventos GAME_STARTED/GAME_STOPPED)
  const [gameActive, setGameActive] = useState(false);
  // Só decide o que mostrar depois de saber o estado do evento (evita piscar o guia ao abrir com jogo rodando)
  const [gameStateLoaded, setGameStateLoaded] = useState(false);
  // Jogos ativos do evento, para o guia que passa enquanto não há jogo rodando
  const [guideGames, setGuideGames] = useState<GuideGame[]>([]);

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
  
  // 🆕 Hook para Zone Conquest INDIVIDUAL - DEVE VIR APÓS TODOS OS useState
  const { status: zoneConquestGameStatus, isIndividualMode } = useZoneConquestGame(selectedEventId || null);

  const topParticipants = useMemo(() => [...children]
    .filter(child => child.status === 'active')
    .sort((a, b) => Number(b.scores || 0) - Number(a.scores || 0))
    .slice(0, 5), [children]);
  const topTeams = useMemo(() => [...teams]
    .sort((a, b) => Number(b.points || b.score || 0) - Number(a.points || a.score || 0))
    .slice(0, 5), [teams]);
  // O ranking é um painel só: o título é escrito e apagado letra a letra e o conteúdo alterna entre
  // times (equipe) e participantes (individual). Uma lista vazia é pulada.
  const rankingTitles = ['Ranking de Times', 'Top Participantes'];
  const { index: rankingView, text: rankingTitleText } = useTypewriterCycle(
    rankingTitles,
    [topTeams.length > 0, topParticipants.length > 0],
    // Só anima com o placar na tela (ele só aparece quando existe alguma leitura)
    { active: gameStateLoaded && (scoreLog.length > 0
      || children.some((child) => Number(child.scores || 0) > 0)
      || teams.some((team) => Number(team.points ?? team.score ?? 0) > 0)) },
  );
  const recentActivities = useMemo(() => scoreLog
    .map((entry: any) => ({
      id: entry.id,
      childName: entry.childName || entry.crianca_nome || 'Participante',
      checkpoint: entry.checkpoint || entry.checkpoint_name || 'Checkpoint',
      points: Number(entry.points || 0),
      timestamp: entry.timestamp || entry.created_at,
      teamColor: entry.teamColor || entry.team_color || '#FFFF00',
    }))
    .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
    .slice(0, 10), [scoreLog]);

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

  // Carregar planta baixa quando necessário (zona E tesouro)
  useEffect(() => {
    if (!selectedEventId) {
      setFloorPlan(null);
      return;
    }

    // Carregar planta para AMBOS os modos (zona e tesouro)
    const shouldLoadFloorPlan = selectedGameType === 'treasure_hunt' 
      || selectedGameType === 'bomb_defusal'
      || selectedGameType === 'hostage_rescue'
      || selectedGameType === 'zone' 
      || selectedGameType === 'zone_conquest' 
      || selectedGameType === 'territory' 
      || selectedGameType === 'territory_conquest';
    
    if (!shouldLoadFloorPlan) {
      setFloorPlan(null);
      return;
    }

    const loadFloorPlan = async () => {
      try {
        const { api } = await import('../../services/api');
        const floorPlanData = await api.getFloorPlan();
        if (floorPlanData?.dataUrl) {
          setFloorPlan(floorPlanData.dataUrl);
        } else {
          setFloorPlan(null);
        }
      } catch (e) {
        console.warn('⚠️ Planta não disponível:', e);
        setFloorPlan(null);
      }
    };

    loadFloorPlan();
  }, [selectedEventId, selectedGameType]);

  const refreshGameActive = useCallback(async () => {
    if (!selectedEventId) {
      setGameActive(false);
      return;
    }
    try {
      const { api } = await import('../../services/api');
      const state = await api.getGameState(selectedEventId);
      setGameActive(Boolean(state?.active));
    } catch (err) {
      console.error('Erro ao consultar se há jogo ativo no telão:', err);
    }
  }, [selectedEventId]);

  const refreshGuideGames = useCallback(async () => {
    if (!selectedEventId) {
      setGuideGames([]);
      return;
    }
    try {
      const { api } = await import('../../services/api');
      // Jogo desativado pelo admin não entra no guia
      const onlyActive = (list: any[]) => list.filter((game: any) => String(game.status || 'active').toLowerCase() === 'active');
      let games = onlyActive(await api.getBrincadeiras(selectedEventId));
      // Evento sem jogos vinculados (eles são ligados ao evento em que foram criados): o guia
      // mostra os jogos ativos do buffet, em vez de ficar vazio sem explicação.
      if (games.length === 0) games = onlyActive(await api.getBrincadeiras());
      // O mesmo jogo pode existir em mais de um evento: aparece uma vez só
      const seen = new Set<string>();
      games = games.filter((game: any) => {
        const key = String(game.name || '').trim().toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setGuideGames(
        games
          .map((game: any) => ({
            id: String(game.id),
            name: String(game.name || 'Jogo'),
            description: game.description || null,
            rules: game.rules || null,
            type: game.type || null,
            duration: game.duration ? Number(game.duration) : null,
          }))
      );
    } catch (err) {
      console.error('Erro ao carregar os jogos do guia no telão:', err);
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

  const refreshZoneConquestStatus = useCallback(async () => {
    if (!selectedEventId) {
      setZoneConquestStatus(null);
      return;
    }
    try {
      const { api } = await import('../../services/api');
      const status = await api.getZoneConquestStatus(selectedEventId);
      setZoneConquestStatus(
        status?.gameRunning && status?.mode
          ? status
          : null
      );
    } catch (err) {
      console.error('Erro ao atualizar status do Zone Conquest no telão:', err);
      setZoneConquestStatus(null);
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
      setGameActive(false);
      setGameStateLoaded(false);
      setGuideGames([]);
      if (!selectedEventId) {
        setLoading(false);
        return;
      }

      try {
        const { api } = await import('../../services/api');
        try {
          const gameState = await api.getGameState(selectedEventId);
          if (!disposed) {
            setGameActive(Boolean(gameState?.active));
          }
          if (!disposed && gameState?.selected) {
            setSelectedGameType(gameState.gameType || null);
            setSelectedGameName(gameState.gameName || null);
          }
        } catch (stateError) {
          console.error('Erro ao restaurar seleção do jogo no telão:', stateError);
        }
        if (!disposed) setGameStateLoaded(true);
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

        await Promise.all([refreshTreasureStatus(), refreshMonsterStatus(), refreshGuideGames()]);
      } catch (err) {
        if (!disposed) console.error('Erro ao carregar dados do evento:', err);
      } finally {
        if (!disposed) setLoading(false);
      }
    };

    loadEventData();
    return () => { disposed = true; };
  }, [loadTeams, loadChildren, loadCheckpoints, loadScoreLog, refreshTreasureStatus, refreshMonsterStatus, refreshGuideGames, selectedEventId]);

  // Reconsultar o status persistido evita perder o timer quando o telão
  // conecta depois do GAME_STARTED ou quando o WebSocket reconecta.
  useEffect(() => {
    if (!selectedEventId) return;

    refreshTreasureStatus();
    refreshMonsterStatus();
    const interval = window.setInterval(() => {
      refreshTreasureStatus();
      refreshMonsterStatus();
      refreshGameActive();
    }, 5000); // Atualizar a cada 5 segundos (reduzido de 2s para economizar conexões)
    return () => window.clearInterval(interval);
  }, [selectedEventId, refreshTreasureStatus, refreshMonsterStatus, refreshGameActive]);

  // O guia reflete jogos ativados/desativados e textos editados pelo admin sem precisar recarregar o telão
  useEffect(() => {
    if (!selectedEventId || gameActive) return undefined;
    const interval = window.setInterval(refreshGuideGames, 60000);
    return () => window.clearInterval(interval);
  }, [selectedEventId, gameActive, refreshGuideGames]);

  // 🆕 Sincronizar Zone Conquest status do hook com estado local
  useEffect(() => {
    if (isIndividualMode && zoneConquestGameStatus) {
      // Cada vez que uma nova partida é detectada (partidaId mudou), reseta tudo
      setZoneConquestStatus(zoneConquestGameStatus);
    } else if (!isIndividualMode) {
      // Se não está em modo individual, limpar estado
      setZoneConquestStatus(null);
    }
  }, [zoneConquestGameStatus, isIndividualMode]);

  // WebSocket para eventos em tempo real
  const { connectionStatus, lastMessageAt } = useGameWebSocket(
    selectedEventId || null,
    (event) => {
      // Processar eventos do WebSocket
      if (event.type === 'GAME_SELECTED' && sameEventId(event.payload?.eventoId ?? event.payload?.eventoId, selectedEventId)) {
        // NÃO setar selectedGameType aqui - apenas quando GAME_STARTED
        // setSelectedGameType(event.payload?.gameType || null);
        setSelectedGameName(event.payload?.gameName || null);
        // Limpar status quando seleciona novo jogo (mas não mostra mapa ainda)
        setTreasureStatus(null);
        setLastTreasureEvent(null);
        setMonsterStatus(null);
      } else if (event.type === 'PARALLEL_GAME_STARTED' && sameEventId(event.payload?.eventoId, selectedEventId)) {
        const roulette = event.payload?.roulette;
        if (roulette?.segments?.length) {
          setParallelRoulette({
            segments: roulette.segments,
            winnerIndex: Number(roulette.winnerIndex) || 0,
            objectName: String(event.payload?.objectName || ''),
            checkpointName: event.payload?.checkpointName ? String(event.payload.checkpointName) : undefined,
          });
        }
      } else if (event.type === 'DISPLAY_MESSAGE' && sameEventId(event.payload?.eventoId, selectedEventId)) {
        setDisplayMessages((previous) => [mensagemParaTela(event.payload), ...previous].slice(0, 50));
        setMessageArrivedAt(Date.now());
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
      } else if (event.type === 'GAME_CHECKPOINTS_UPDATED' && sameEventId(event.payload?.eventoId, selectedEventId)) {
        // A lista de checkpoints do jogo mudou: busca de novo o alvo do Tesouro / o especial do Monstro.
        refreshTreasureStatus();
        refreshMonsterStatus();
      } else if (event.type === 'GAME_STARTED' && sameEventId(event.payload?.eventoId, selectedEventId)) {
        const treasure = event.payload?.treasure;

        const gameType = event.payload?.gameType;
        setGameActive(true);
        setGameStateLoaded(true);
        setSelectedGameType(gameType || null);
        setSelectedGameName(event.payload?.gameName || null);
        
        // 🆕 Limpar scoreLog imediatamente quando novo jogo inicia (para todos os tipos de jogo)
        const { clearScoreLog, loadCheckpoints, loadChildren, setCurrentPartida } = usePulynStore.getState();
        clearScoreLog();
        
        // 🆕 USAR O sessionId RECEBIDO DO BACKEND (não gerar localmente!)
        const sessionId = event.payload?.sessionId;
        if (sessionId) {
          setCurrentPartida(sessionId);
          console.log(`✅ [GAME_STARTED] Sessão setada: ${sessionId}`);
        } else {
          console.warn(`⚠️ [GAME_STARTED] Nenhum sessionId recebido do backend`);
        }
        
        // Recarregar scoreLog + checkpoints + children (igual ao reset button)
        Promise.all([
          loadScoreLog(),
          loadCheckpoints(),
          loadChildren(),
        ]);
        
        // 🆕 Se é Zone Conquest, resetar e recarregar status
        if (gameType?.toLowerCase().includes('zone_conquest')) {
          setZoneConquestStatus(null); // Resetar estado para forçar recarregamento
          setMonsterStatus(null);
          setTreasureStatus(null);
          // Chamar refresh para recarregar dados frescos do backend
          refreshZoneConquestStatus();
        } else if (gameType === 'treasure_hunt') {
          // 🆕 Resetar scoreLog quando novo jogo inicia
          if (loadScoreLog) {
            loadScoreLog().catch(err => console.error('Erro ao recarregar scoreLog:', err));
          }

          setMonsterStatus(null);
          setZoneConquestStatus(null);
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
          setZoneConquestStatus(null);
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
          setZoneConquestStatus(null);
        }
      } else if (event.type === 'GAME_STOPPED' && sameEventId(event.payload?.eventoId ?? event.payload?.eventoId, selectedEventId)) {
        setGameActive(false);
        refreshGuideGames();
        setSelectedGameType(null);
        setSelectedGameName(null);
        setTreasureStatus(null);
        setLastTreasureEvent(null);
        setMonsterStatus(null);
        setZoneConquestStatus(null);
        setFloorPlan(null);  // Limpar planta quando jogo termina
        // O fim do jogo pode ter pago o bônus da equipe vencedora: atualiza os pontos
        const { loadTeams: reloadTeams, loadChildren: reloadChildren } = usePulynStore.getState();
        reloadTeams();
        reloadChildren();
      } else if (event.type === 'GAME_WINNER_BONUS' && sameEventId(event.payload?.eventoId, selectedEventId)) {
        // Caça ao Tesouro / Monstro: cada membro da equipe vencedora ganhou o bônus.
        // Espera um instante para o banco confirmar a partida antes de reler os pontos.
        window.setTimeout(() => {
          const { loadTeams: reloadTeams, loadChildren: reloadChildren } = usePulynStore.getState();
          reloadTeams();
          reloadChildren();
        }, 1500);
      } else if (event.type === 'ZONE_CONQUEST_INDIVIDUAL_SCAN' && sameEventId(event.payload?.eventoId, selectedEventId)) {
        // 🎯 Log único e limpo quando checkpoint é conquistado
        const { criancaName, pointsGained, checkpointId } = event.payload;
        const checkpoint = checkpoints.find(cp => cp.id === checkpointId);
        console.log(`✅ ${criancaName} conquistou ${checkpoint?.name || 'Checkpoint'} e ganhou ${pointsGained} pontos!`);
        
        const payload = event.payload || {};
        setZoneConquestStatus((prev) => {
          if (!prev || prev.mode !== 'individual') return prev;
          
          return {
            ...prev,
            zones: payload.zones || prev.zones,
          };
        });

        // Mostrar notificação animada com cor do participante
        const { criancaName: name, participantColor, pointsGained: points } = event.payload;
        const checkpointName = checkpoint?.name || `Checkpoint ${checkpointId}`;

        setNotificationData({
          name,
          checkpoint: checkpointName,
          points,
          color: participantColor || '#1E9BD7'
        });
        setShowNotification(true);

        // Esconder notificação após 3 segundos
        setTimeout(() => {
          setShowNotification(false);
        }, 3000);
        
      } else if (event.type === 'ZONE_CHECKPOINT_SCANNED' && sameEventId(event.payload?.eventoId, selectedEventId)) {
        // 📍 Evento de scan de checkpoint para zone conquest
        // Frontend já possui dados em scoreLog via loadScoreLog()
        // Este evento só dispara notificação/feedback visual
        console.log('📍 Zone Checkpoint Scanned:', event.payload);
        
        // Recarregar scoreLog para atualizar mapa com nova leitura
        if (loadScoreLog) {
          loadScoreLog().catch(err => console.error('Erro ao recarregar scoreLog:', err));
        }
      } else if ((event.type === 'TREASURE_PROGRESS' || event.type === 'TREASURE_ROUND_COMPLETED') && sameEventId(event.payload?.eventoId ?? event.payload?.eventoId, selectedEventId)) {
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

  // Sincronizar Zone Conquest INDIVIDUAL com o hook
  useEffect(() => {
    if (zoneConquestGameStatus && isIndividualMode) {
      setZoneConquestStatus(zoneConquestGameStatus);
    }
  }, [zoneConquestGameStatus, isIndividualMode]);

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
  const normalizedGameContext = `${selectedGameType || ''} ${selectedGameName || ''}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const isZoneGame = ['zone_conquest', 'zone', 'territory', 'territory_conquest'].includes(selectedGameType || '')
    || /\b(zona|zone|territor)/.test(normalizedGameContext);

  // Também mostrar mapa em tesouro
  const shouldShowMap = selectedGameType && (isZoneGame || selectedGameType === 'treasure_hunt');


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
          <p className="mt-3 text-sm leading-6 text-gray-400">A recepção precisa escolher o evento no painel da recepção (Evento no telão) para liberar a arena.</p>
          {loading && <div className="mx-auto mt-7 h-9 w-9 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />}
        </Card>
      </div>
    );
  }

  // Cada parte da tela cabe na altura disponível: o telão não rola. O palco (mapa/arenas) e as listas
  // são reduzidos para caber (FitToBox), inclusive o guia de regras, que mostra todas as regras do jogo de uma vez.
  const monsterStageVisible = selectedGameType === 'monster_hunt' && monsterStatus?.gameType === 'monster_hunt';
  const treasureStageVisible = selectedGameType === 'treasure_hunt' && treasureStatus?.gameType === 'treasure_hunt'
    && Boolean(treasureStatus.active || treasureStatus.completed);
  const mapStageVisible = Boolean(shouldShowMap) && !monsterStatus?.active && !treasureStatus?.active;
  const bombaStageVisible = selectedGameType === 'bomb_defusal';
  const refemStageVisible = selectedGameType === 'hostage_rescue';
  const hasStage = monsterStageVisible || treasureStageVisible || mapStageVisible || bombaStageVisible || refemStageVisible;
  // Só o mapa: ele preenche o palco (as arenas é que são reduzidas para caber)
  const mapOnly = mapStageVisible && !monsterStageVisible && !treasureStageVisible && !bombaStageVisible && !refemStageVisible;
  // Conquistar e Destruir: a planta ocupa o palco e o placar fica no canto superior esquerdo
  const bombaMapaOnly = bombaStageVisible && !monsterStageVisible && !treasureStageVisible;

  const rankingRowText = 'text-[clamp(0.9rem,2vh,1.4rem)]';
  const rankingSubText = 'text-[clamp(0.65rem,1.4vh,0.85rem)]';
  const rankingScoreText = 'text-[clamp(1.1rem,2.6vh,1.9rem)]';
  const panelTitle = 'font-display text-[clamp(1rem,2.4vh,1.5rem)] font-bold text-white';
  const panelSubtitle = 'text-[clamp(0.6rem,1.3vh,0.8rem)] text-gray-500';
  const panelHeader = 'mb-2 flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] pb-2';

  // Com um jogo rodando (e palco para mostrar) a tela tem só o mapa, ou a arena do jogo quando ele não
  // tem mapa: sem cabeçalho, rankings, regras, atividades nem rodapé.
  const gameOnlyView = gameActive && hasStage;
  // O placar só aparece quando existe alguma leitura (ou pontuação já gravada) no evento
  const hasReadings = scoreLog.length > 0
    || children.some((child) => Number(child.scores || 0) > 0)
    || teams.some((team) => Number(team.points ?? team.score ?? 0) > 0);

  const stageContent = (
            bombaMapaOnly ? (
          <div className="h-full">
            <BombaMapa eventoId={selectedEventId} floorPlan={floorPlan} />
          </div>
            ) : refemStageVisible ? (
          <div className="h-full">
            <RefemMapa eventoId={selectedEventId} floorPlan={floorPlan} />
          </div>
            ) : mapOnly ? (
          <div className="relative h-full" aria-live="polite">
            <DisplayMap
              embedded
              fill
              hideHeader={gameOnlyView}
              gameType={selectedGameType || undefined}
              floorPlan={(floorPlan as any)}
              // 🆕 Zone Conquest INDIVIDUAL
              // isIndividualMode vem da partida real (zone_conquest_individual_partidas ativa),
              // nunca inferir isso a partir de gameType: o backend só grava 'zone_conquest'
              // para os dois modos (equipe e individual).
              isIndividualMode={isIndividualMode}
              zoneConquestZones={zoneConquestStatus?.zones || null}
              zoneConquestCheckpoints={zoneConquestStatus?.checkpoints || null}
            />
            {isZoneGame && <ZonaDominioPlacar eventoId={selectedEventId} />}
          </div>
            ) : (
            <FitToBox align="center" minScale={0.3} maxScale={gameOnlyView ? 1.6 : 1}>
              <>
          {selectedGameType === 'monster_hunt' && monsterStatus?.gameType === 'monster_hunt' && (
            <div className="mx-auto max-w-6xl rounded-3xl border-2 border-danger/70 bg-gradient-to-br from-red-950/80 via-dark-surface/90 to-purple-950/70 p-5 shadow-2xl shadow-danger/20 sm:p-6" aria-live="polite">
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
            <div className="mx-auto max-w-6xl">
              <TreasureArena
                status={treasureStatus}
                checkpoints={checkpoints}
                teams={teams}
                lastEvent={lastTreasureEvent}
                floorPlan={floorPlan}
              />
            </div>
          )}
              </>
            </FitToBox>
            )
  );

  const conquestOverlay = (
    <>
      {parallelRoulette && (
        <RouletteOverlay data={parallelRoulette} onClose={() => setParallelRoulette(null)} autoCloseSeconds={14} />
      )}
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
    </>
  );

  // Placar: um painel só, que alterna entre times e participantes (título escrito e apagado letra a letra)
  const rankingPanel = (
                isIndividualMode && zoneConquestStatus ? (
                  <Card variant="glow" className="h-full overflow-hidden p-3 sm:p-4">
                    <FitToBox minScale={0.4}>
                      <ZoneConquestIndividualRanking participants={zoneConquestStatus.participants || []} />
                    </FitToBox>
                  </Card>
                ) : (
                  <Card variant="glow" className="flex h-full min-h-0 flex-col overflow-hidden p-3 sm:p-4">
                    <div className={panelHeader}>
                      <div className="flex items-center gap-3">
                        {rankingView === 0 ? (
                          <div className="rounded-xl border border-primary-400/20 bg-primary-500/10 p-2 text-primary-300"><Trophy size={20} /></div>
                        ) : (
                          <div className="rounded-xl border border-warning-400/20 bg-warning-500/10 p-2 text-warning-300"><Medal size={20} /></div>
                        )}
                        <div>
                          <h2 className={`min-h-[1.6em] ${panelTitle}`} aria-label={rankingTitles[rankingView]}>
                            <span aria-hidden="true">{rankingTitleText}</span>
                            <span aria-hidden="true" className="ml-0.5 inline-block h-[1em] w-[2px] animate-pulse bg-primary-300 align-middle" />
                          </h2>
                          <p className={panelSubtitle}>
                            {rankingView === 0 ? 'A disputa pelo primeiro lugar' : 'Quem está liderando a festa'}
                          </p>
                        </div>
                      </div>
                      <Badge variant={rankingView === 0 ? 'primary' : 'warning'}>Top 5</Badge>
                    </div>
                    <div key={rankingView} className="min-h-0 flex-1 animate-in fade-in duration-500" aria-live="polite">
                      <FitToBox minScale={0.4}>
                        {rankingView === 0 ? (
                          <div className="space-y-2">
                            {topTeams.length > 0 ? (
                              topTeams.map((team) => {
                                const teamMembers = children.filter(c => c.timeId === team.id || c.teamId === team.id);
                                const teamTotalPoints = teamMembers.reduce((sum, c) => sum + (c.scores || 0), 0);
                                return (
                                  <div key={team.id} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] p-2.5">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: team.color + '30' }}>
                                      <span className="text-lg">👥</span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className={`truncate font-semibold text-white ${rankingRowText}`}>{team.name}</p>
                                      <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: team.color }} />
                                        <p className={`text-gray-400 ${rankingSubText}`}>
                                          {teamMembers.length} criança{teamMembers.length !== 1 ? 's' : ''}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className={`font-bold text-secondary ${rankingScoreText}`}>
                                        {Number(team.points ?? team.score ?? teamTotalPoints)}
                                      </p>
                                      <p className={`text-gray-500 ${rankingSubText}`}>pontos</p>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <p className="py-8 text-center text-gray-500">Nenhum time cadastrado</p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {topParticipants.length > 0 ? (
                              topParticipants.map((child, index) => (
                                <div
                                  key={child.id}
                                  className={`flex items-center gap-3 rounded-xl border p-2.5 ${
                                    index === 0
                                      ? 'border-warning/50 bg-warning/10 shadow-[0_0_20px_rgba(245,166,35,0.2)]'
                                      : 'border-white/[0.06] bg-white/[0.025]'
                                  }`}
                                >
                                  <div
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg font-bold"
                                    style={{
                                      backgroundColor: index === 0 ? 'rgba(245, 166, 35, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                      color: index === 0 ? '#F5A623' : '#9CA3AF',
                                    }}
                                  >
                                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className={`truncate font-semibold text-white ${rankingRowText}`}>{child.nickname || child.name}</p>
                                    <p className={`text-gray-400 ${rankingSubText}`}>{child.age} anos</p>
                                  </div>
                                  <div className="text-right">
                                    <p className={`font-bold ${rankingScoreText} ${index === 0 ? 'text-warning' : 'text-primary'}`}>{child.scores || 0}</p>
                                    <p className={`text-gray-500 ${rankingSubText}`}>pontos</p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="py-8 text-center text-gray-500">Nenhum participante cadastrado</p>
                            )}
                          </div>
                        )}
                      </FitToBox>
                    </div>
                  </Card>
                )
  );

  const headerBar = (
      <header className="relative z-10 flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 overflow-hidden rounded-2xl border border-white/10 bg-dark-card/75 px-4 py-2 shadow-[0_12px_36px_rgba(2,10,24,0.2)] backdrop-blur-xl lg:h-[8vh] lg:min-h-[52px] lg:flex-nowrap">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-300/70 to-transparent" />
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-dark-card/80 px-3 py-1.5 text-sm font-semibold text-gray-300 transition-colors duration-200 hover:border-primary-400/40 hover:bg-dark-surface hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/60"
            title="Voltar (ESC)"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Sair</span>
          </button>
          <div className="flex h-[clamp(2rem,4.6vh,3rem)] w-[clamp(2rem,4.6vh,3rem)] shrink-0 items-center justify-center rounded-xl border border-primary-300/20 bg-primary-500/10 text-xl">⚡</div>
          <h1 className="truncate font-display text-[clamp(1.4rem,4vh,3rem)] font-bold leading-none tracking-tight text-white">Pulyn Arena</h1>
          <div className="flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1" aria-live="polite">
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
              <span className="hidden text-[11px] text-gray-500 xl:inline">
                · {lastMessageAt.toLocaleTimeString('pt-BR')}
              </span>
            )}
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-2.5">
          <p className="truncate text-[clamp(0.9rem,2.3vh,1.5rem)] font-semibold text-gray-200">
            {events.find(e => e.eventoId === selectedEventId)?.nome || 'Evento selecionado'}
          </p>
          <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-secondary-400/20 bg-secondary-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-secondary-300 md:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-secondary-400" /> Recepção no controle
          </span>
        </div>
      </header>
  );

  if (gameOnlyView) {
    // Mensagem do recreacionista: aparece por cima do jogo só por um tempo e some sozinha
    const latestMessage = displayMessages[0];
    const showMessageOverGame = Boolean(latestMessage) && messageArrivedAt > 0 && currentTime.getTime() - messageArrivedAt < 20000;
    return (
      <div className="relative flex h-screen flex-col overflow-hidden bg-[#08111f] p-2 text-white">
        {conquestOverlay}
        {headerBar}
        {showMessageOverGame && (
          <div className="absolute inset-x-6 top-[max(5.5rem,11vh)] z-30 flex items-center gap-3 rounded-2xl border border-accent/50 bg-black/70 px-5 py-3 shadow-2xl backdrop-blur animate-in fade-in slide-in-from-top-2" role="status" aria-label="Mensagem do recreacionista">
            <Zap size={26} className="shrink-0 text-accent" />
            <p className="line-clamp-2 font-display text-[clamp(1.2rem,3.4vh,2.4rem)] font-bold leading-tight text-white">{latestMessage.text}</p>
          </div>
        )}
        <div className="mt-2 min-h-0 flex-1">{stageContent}</div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#08111f] px-3 py-3 text-white lg:h-screen lg:px-5 lg:py-4">
      <div className="pointer-events-none absolute -left-48 top-24 h-[32rem] w-[32rem] rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-56 bottom-0 h-[34rem] w-[34rem] rounded-full bg-secondary/10 blur-3xl" />

      {conquestOverlay}

      {headerBar}

      <main className="relative z-10 mt-3 flex min-h-0 flex-1 flex-col gap-3">
        {/* Mensagem do recreacionista */}
        {displayMessages.length > 0 && (
          <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-accent/40 bg-accent/10 px-4 py-2" role="status" aria-label="Mensagem do recreacionista">
            <Zap size={22} className="shrink-0 text-accent" />
            <div className="min-w-0 flex-1">
              <p className="text-[clamp(0.6rem,1.3vh,0.8rem)] font-bold uppercase tracking-[0.25em] text-accent">Mensagem do recreacionista</p>
              <p className="line-clamp-2 font-display text-[clamp(1.1rem,3vh,2.2rem)] font-bold leading-tight text-white">{displayMessages[0].text}</p>
            </div>
            <p className="shrink-0 text-xs text-gray-400">{displayMessages[0].timestamp ? new Date(displayMessages[0].timestamp).toLocaleTimeString('pt-BR') : ''}</p>
          </div>
        )}

        {/* Sem jogo rodando (com um jogo rodando só aparece o jogo):
            - sem leituras: o guia de regras ocupa o espaço todo;
            - com leituras: metade guia, metade placar. */}
        {!gameStateLoaded ? (
          <div className="flex-1" />
        ) : guideGames.length > 0 ? (
          hasReadings ? (
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-2">
              <section className="min-h-[360px] min-w-0 lg:min-h-0">
                <GameGuide compact games={guideGames} highlightName={selectedGameName} />
              </section>
              <div className="min-h-[360px] min-w-0 lg:min-h-0">
                {rankingPanel}
              </div>
            </div>
          ) : (
            <section className="min-h-[420px] min-w-0 flex-1 lg:min-h-0">
              <GameGuide games={guideGames} highlightName={selectedGameName} />
            </section>
          )
        ) : hasReadings ? (
          // Sem jogos cadastrados para o guia: placar e atividades recentes
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[5fr_5fr_4fr]">
            <div className="h-[340px] min-h-0 lg:col-span-2 lg:h-full">
              {rankingPanel}
            </div>

          {/* Atividades recentes */}
          <div className="h-[340px] min-h-0 lg:h-full">
            <Card variant="glow" className="flex h-full min-h-0 flex-col overflow-hidden p-3 sm:p-4">
              <div className={panelHeader}>
                <div className="flex items-center gap-3">
                  <div className="rounded-xl border border-secondary-400/20 bg-secondary-500/10 p-2 text-secondary-300"><Clock size={20} /></div>
                  <div>
                    <h2 className={panelTitle}>Atividades Recentes</h2>
                    <p className={panelSubtitle}>Últimas conquistas em tempo real</p>
                  </div>
                </div>
                <span className="hidden rounded-full border border-success-400/20 bg-success-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-success-300 xl:inline-flex">Ao vivo</span>
              </div>
              <div className="min-h-0 flex-1">
                <FitToBox minScale={0.4}>
                  <div className="space-y-1.5">
                    {recentActivities.length > 0 ? (
                      recentActivities.slice(0, 6).map((activity, index) => (
                        <div
                          key={activity.id}
                          className={`flex items-center justify-between gap-2 rounded-lg p-2 ${
                            index === 0
                              ? 'border border-success/50 bg-success/10 animate-in fade-in slide-in-from-top-2'
                              : 'bg-surface/30'
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <div
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${index === 0 ? 'animate-pulse' : ''}`}
                              style={{
                                backgroundColor: (activity.teamColor || '#FFFF00') + '30',
                                borderWidth: index === 0 ? '2px' : '0px',
                                borderColor: activity.teamColor || '#FFFF00',
                              }}
                            >
                              <Star size={13} style={{ color: activity.teamColor || '#FFFF00' }} />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-[clamp(0.8rem,1.8vh,1.15rem)] font-medium text-white">{activity.childName}</p>
                              <p className="truncate text-[clamp(0.65rem,1.4vh,0.85rem)] text-gray-400">{activity.checkpoint}</p>
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <Badge variant="success" className="text-xs">+{activity.points} pts</Badge>
                            <p className="mt-0.5 text-[clamp(0.6rem,1.2vh,0.75rem)] text-gray-500">{activity.timestamp}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="py-6 text-center text-gray-500">Nenhuma atividade registrada</p>
                    )}
                  </div>
                </FitToBox>
              </div>
            </Card>
          </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center text-center text-gray-400">
            Nenhum jogo cadastrado para este evento.
          </div>
        )}
      </main>

      {/* Rodapé: relógio e participantes (mini display) */}
      <footer className="relative z-10 mt-3 flex shrink-0 items-center justify-between gap-4 lg:h-[6vh] lg:min-h-[44px]">
        <div className="flex items-center gap-3">
          <Clock size={18} className="text-primary-300" />
          <p className="font-mono text-[clamp(1.1rem,3vh,2rem)] font-bold tracking-wide text-primary-300">{formattedTime}</p>
          <span className="hidden h-4 w-px bg-white/10 sm:block" />
          <p className="hidden text-[clamp(0.7rem,1.6vh,1rem)] capitalize text-gray-500 sm:block">{formattedDate}</p>
        </div>
        <div
          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-dark-card/85 px-4 py-1.5 shadow-lg shadow-black/20 backdrop-blur-xl"
          role="status"
          aria-label={`${activeParticipants} de ${totalParticipants} participantes ativos`}
        >
          <div className="rounded-lg border border-primary-400/20 bg-primary-500/10 p-1.5 text-primary-300"><Users size={18} /></div>
          <div className="leading-tight">
            <p className="font-display text-xl font-bold text-white">{activeParticipants}<span className="text-sm font-semibold text-gray-400">/{totalParticipants}</span></p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">participantes</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
