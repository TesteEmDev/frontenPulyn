import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LayoutDashboard, Users, MapPin, Trophy, Gamepad2
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, LabelList, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { usePulynStore } from '../../store/mockData';
import { api, API_URL } from '../../services/api';
import AdminSidebar from '../../components/layout/AdminSidebar';
import BuffetTopBar from '../../components/layout/BuffetTopBar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import StatusDot from '../../components/ui/StatusDot';
import Select from '../../components/ui/Select';
import ProgressBar from '../../components/ui/ProgressBar';
import { getEventActiveWindow, buildTimeBuckets, getBucketMinutes, formatClock } from '../../utils/eventWindow';

const STATUS_LABELS: Record<string, { label: string; variant: 'success' | 'warning' | 'muted' }> = {
  active: { label: 'Ativo', variant: 'success' },
  ongoing: { label: 'Ativo', variant: 'success' },
  scheduled: { label: 'Agendado', variant: 'warning' },
  upcoming: { label: 'Agendado', variant: 'warning' },
  finished: { label: 'Finalizado', variant: 'muted' },
  completed: { label: 'Finalizado', variant: 'muted' },
};

// Valor do seletor para ver todos os eventos juntos
const ALL_EVENTS = 'all';

const isActiveStatus = (status?: string | null) => status === 'active' || status === 'ongoing';
const isClosedStatus = (status?: string | null) =>
  ['finished', 'completed', 'cancelled', 'canceled'].includes(String(status || '').toLowerCase());

// A API devolve a data como ISO (2026-09-30T03:00:00.000Z); mostra dd/mm/aaaa.
const formatEventDate = (value?: string | null) => {
  const day = String(value || '').split('T')[0];
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : 'sem data';
};

const GAME_TYPE_LABELS: Record<string, string> = {
  treasure_hunt: 'Caça ao Tesouro',
  monster_hunt: 'Caça ao Monstro',
  zone_conquest: 'Zona',
};
const gameLabel = (state: any) => state?.gameName || GAME_TYPE_LABELS[state?.gameType] || 'Jogo em andamento';

// Cor da disponibilidade dos checkpoints: verde >= 80%, amarelo >= 50%, vermelho abaixo.
const availabilityColor = (percent: number | null) =>
  percent === null ? '#6B7280' : percent >= 80 ? '#22C55E' : percent >= 50 ? '#F59E0B' : '#EF4444';
const percentOf = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : null);

const shortName = (name: string, max = 16) => (name.length > max ? `${name.slice(0, max - 1)}…` : name);

export default function AdminDashboard() {
  const { events = [], loadEvents } = usePulynStore();

  const [loading, setLoading] = useState(true);
  const [loadingEventData, setLoadingEventData] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [children, setChildren] = useState<any[]>([]);
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  // Resumo de checkpoints por evento (só em "Todos os eventos")
  const [checkpointSummary, setCheckpointSummary] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [scoreLog, setScoreLog] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [territories, setTerritories] = useState<Record<string, any>>({});
  const [now, setNow] = useState(() => new Date());
  // Estado do jogo por evento (para o card "Jogo ativo")
  const [gameStates, setGameStates] = useState<Record<string, any>>({});

  // Garantir que são arrays (segurança)
  const safeEvents = Array.isArray(events) ? events : [];
  const safeChildren = Array.isArray(children) ? children : [];
  const safeCheckpoints = Array.isArray(checkpoints) ? checkpoints : [];
  const safeGames = Array.isArray(games) ? games : [];
  const safeScoreLog = Array.isArray(scoreLog) ? scoreLog : [];
  const safeTeams = Array.isArray(teams) ? teams : [];

  // Carregar a lista de eventos da empresa (só para popular o dropdown)
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        if (loadEvents) await loadEvents();
      } catch (error) {
        console.error('Erro ao carregar eventos:', error);
      }
      setLoading(false);
    };
    loadData();
  }, [loadEvents]);

  // Selecionar um evento por padrão assim que a lista carregar: o ativo, ou
  // o mais recente por data, nunca "todos misturados".
  useEffect(() => {
    if (selectedEventId || safeEvents.length === 0) return;
    const active = safeEvents.find((e) => e?.status === 'active' || e?.status === 'ongoing');
    if (active) {
      setSelectedEventId(active.eventoId);
      return;
    }
    const mostRecent = [...safeEvents].sort((a, b) => (b.data || '').localeCompare(a.data || ''))[0];
    setSelectedEventId(mostRecent?.eventoId || '');
  }, [safeEvents, selectedEventId]);

  const isAllEvents = selectedEventId === ALL_EVENTS;
  // Carregar os dados do evento selecionado — direto da API, sem depender do
  // "eventoAtualId" global (que é o evento operacional em andamento em
  // outras telas, não necessariamente o que o admin quer analisar aqui).
  useEffect(() => {
    if (!selectedEventId) {
      setChildren([]);
      setCheckpoints([]);
      setGames([]);
      setScoreLog([]);
      setTeams([]);
      return;
    }

    // Todos os eventos: crianças e jogos do buffet inteiro e o resumo de
    // checkpoints por evento (uma consulta só). Não há linha do tempo nem times
    // (variam por evento).
    if (selectedEventId === ALL_EVENTS) {
      let disposedAll = false;
      const loadAll = async () => {
        setLoadingEventData(true);
        try {
          const [childrenData, gamesData, summaryData] = await Promise.all([
            api.getAllCriancas().catch(() => []),
            api.getBrincadeiras().catch(() => []),
            api.getCheckpointsSummary().catch(() => []),
          ]);
          if (disposedAll) return;
          setChildren(Array.isArray(childrenData) ? childrenData : []);
          setGames(Array.isArray(gamesData) ? gamesData : []);
          setCheckpointSummary(Array.isArray(summaryData) ? summaryData : []);
          setCheckpoints([]);
          setScoreLog([]);
          setTeams([]);
        } catch (error) {
          console.error('Erro ao carregar dados de todos os eventos:', error);
        } finally {
          if (!disposedAll) setLoadingEventData(false);
        }
      };
      loadAll();
      return () => { disposedAll = true; };
    }

    let disposed = false;
    const loadEventData = async () => {
      setLoadingEventData(true);
      try {
        const [criancasData, checkpointsData, gamesData, historyData, timesData] = await Promise.all([
          api.getCriancas(selectedEventId).catch(() => []),
          api.getCheckpoints(selectedEventId).catch(() => []),
          api.getBrincadeiras(selectedEventId).catch(() => []),
          api.getScoreHistory(selectedEventId, 200).catch(() => []),
          api.getTimes(selectedEventId).catch(() => []),
        ]);
        if (disposed) return;
        setChildren(Array.isArray(criancasData) ? criancasData : []);
        setCheckpoints(Array.isArray(checkpointsData) ? checkpointsData : []);
        setGames(Array.isArray(gamesData) ? gamesData : []);
        setScoreLog(Array.isArray(historyData) ? historyData : []);
        setTeams(Array.isArray(timesData) ? timesData : []);
      } catch (error) {
        console.error('Erro ao carregar dados do evento:', error);
      } finally {
        if (!disposed) setLoadingEventData(false);
      }
    };
    loadEventData();
    return () => { disposed = true; };
  }, [selectedEventId]);

  // Todos os eventos: o status dos checkpoints muda com os batimentos; atualiza o resumo a cada 15s.
  useEffect(() => {
    if (!isAllEvents) return undefined;
    let disposed = false;
    const interval = setInterval(async () => {
      if (document.hidden) return;
      try {
        const data = await api.getCheckpointsSummary();
        if (!disposed && Array.isArray(data)) setCheckpointSummary(data);
      } catch {
        // mantém o resumo atual até a próxima tentativa
      }
    }, 15000);
    return () => {
      disposed = true;
      clearInterval(interval);
    };
  }, [isAllEvents]);

  // Jogo ativo: consulta o estado do jogo do evento selecionado (em "todos", dos
  // eventos ativos agora) e repete a cada 5s para acompanhar início e fim do jogo.
  const gameTargetIds = isAllEvents
    ? safeEvents.filter((e) => isActiveStatus(e?.status)).map((e) => e.eventoId)
    : (selectedEventId ? [selectedEventId] : []);
  const gameTargetsKey = gameTargetIds.join(',');
  useEffect(() => {
    if (gameTargetIds.length === 0) {
      setGameStates({});
      return undefined;
    }
    let disposed = false;
    const loadGameStates = async () => {
      const entries = await Promise.all(gameTargetIds.map(async (id) => {
        try {
          return [id, await api.getGameState(id)] as const;
        } catch {
          return [id, null] as const;
        }
      }));
      if (!disposed) setGameStates(Object.fromEntries(entries));
    };
    loadGameStates();
    const interval = setInterval(() => { if (!document.hidden) loadGameStates(); }, 5000);
    return () => {
      disposed = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameTargetsKey]);

  // Todos os eventos, com algum ativo: atualiza as crianças (pontuação) a cada 30s.
  const anyEventActive = safeEvents.some((e) => isActiveStatus(e?.status));
  useEffect(() => {
    if (!isAllEvents || !anyEventActive) return undefined;
    let disposed = false;
    const interval = setInterval(async () => {
      if (document.hidden) return;
      try {
        const data = await api.getAllCriancas();
        if (!disposed && Array.isArray(data)) setChildren(data);
      } catch {
        // mantém os dados atuais até a próxima tentativa
      }
    }, 30000);
    return () => {
      disposed = true;
      clearInterval(interval);
    };
  }, [isAllEvents, anyEventActive]);

  // Com o evento ativo, o fim da janela do gráfico é "agora": avança o relógio e
  // busca as pontuações novas a cada 30s para o gráfico acompanhar o evento.
  const selectedStatus = safeEvents.find((e) => e.eventoId === selectedEventId)?.status;
  useEffect(() => {
    if (!selectedEventId || (selectedStatus !== 'active' && selectedStatus !== 'ongoing')) return undefined;
    let disposed = false;
    const interval = setInterval(async () => {
      if (document.hidden) return;
      setNow(new Date());
      try {
        const history = await api.getScoreHistory(selectedEventId, 200);
        if (!disposed && Array.isArray(history)) setScoreLog(history);
      } catch {
        // mantém os dados atuais até a próxima tentativa
      }
    }, 30000);
    return () => {
      disposed = true;
      clearInterval(interval);
    };
  }, [selectedEventId, selectedStatus]);

  // Territórios do evento selecionado (em "todos os eventos" não há lista de checkpoints).
  const territoryCheckpoints = safeCheckpoints;

  useEffect(() => {
    const loadTerritories = async () => {
      const status: Record<string, any> = {};
      for (const cp of territoryCheckpoints) {
        try {
          const res = await fetch(`${API_URL}/pontoVerificacao/${cp.id}/territory`);
          const data = await res.json();
          status[cp.id] = data;
        } catch (err) {
          console.error(`Erro ao carregar território ${cp.id}:`, err);
        }
      }
      setTerritories(status);
    };

    if (territoryCheckpoints.length > 0) {
      loadTerritories();
      const interval = setInterval(loadTerritories, 5000);
      return () => clearInterval(interval);
    }
    setTerritories({});
  }, [territoryCheckpoints]);

  const selectedEvent = safeEvents.find((e) => e.eventoId === selectedEventId) || null;

  const eventOptions = useMemo(() => ([
    { value: ALL_EVENTS, label: 'Todos os eventos' },
    ...[...safeEvents]
      .sort((a, b) => (b.data || '').localeCompare(a.data || ''))
      .map((e) => ({ value: e.eventoId, label: `${e.nome || 'Evento'} — ${formatEventDate(e.data)}` })),
  ]), [safeEvents]);

  const handleSelectEvent = useCallback((eventId: string) => {
    setSelectedEventId(eventId);
  }, []);

  // Estatísticas ao vivo do evento selecionado
  const totalChildren = safeChildren.length;
  // Resumo de checkpoints de todos os eventos: cadastrados, ativos (online),
  // indisponíveis (o resto) e a porcentagem disponível.
  const checkpointTotals = useMemo(() => {
    const total = checkpointSummary.reduce((sum, row) => sum + Number(row.total || 0), 0);
    const online = checkpointSummary.reduce((sum, row) => sum + Number(row.online || 0), 0);
    return { total, online, offline: total - online, percent: percentOf(online, total) };
  }, [checkpointSummary]);
  // KPI: em "todos", os ativos (online) só dos eventos ainda abertos; nos encerrados o status é o último registrado.
  const activeCheckpoints = isAllEvents
    ? checkpointSummary
        .filter((row) => !isClosedStatus(row.eventoStatus))
        .reduce((sum, row) => sum + Number(row.online || 0), 0)
    : safeCheckpoints.filter(cp => cp?.status === 'online').length;
  const totalScores = safeChildren.reduce((sum, c) => sum + (c?.pontos ?? c?.pontos ?? 0), 0);

  // Todos os jogos do evento selecionado (ou do buffet, em "todos os eventos"),
  // os com mais checkpoints primeiro.
  const availableGames = [...safeGames]
    .sort((a, b) =>
      (b?.checkpoints?.length || 0) - (a?.checkpoints?.length || 0)
      || String(a?.name || '').localeCompare(String(b?.name || ''), 'pt-BR'));

  // Status ao vivo de todos os checkpoints do evento (online/offline + quem
  // domina agora) — a contagem histórica de leituras fica em Relatórios.
  const checkpointsStatus = [...safeCheckpoints].sort((a, b) =>
    String(a.zone || '').localeCompare(String(b.zone || '')) || String(a.name || '').localeCompare(String(b.name || ''))
  );

  const teamById = useMemo(() => {
    const map: Record<string, any> = {};
    for (const t of safeTeams) map[String(t.id)] = t;
    return map;
  }, [safeTeams]);

  // Ranking ao vivo (top 5 por pontuação agora), dentro do evento selecionado.
  // Substitui a antiga comparação "participantes por time", que quase não
  // muda durante o evento e não ajuda a acompanhar quem está na frente.
  const liveRanking = useMemo(() => (
    [...safeChildren]
      .filter((c) => c?.status === 'active')
      .sort((a, b) => (b?.scores ?? b?.score ?? 0) - (a?.scores ?? a?.score ?? 0))
      .slice(0, 5)
      .map((child) => {
        const teamId = child.teamId ?? child.team_id ?? child.timeId;
        const team = teamId ? teamById[String(teamId)] : null;
        return {
          ...child,
          teamName: team?.name || child.time_nome || null,
          teamColor: team?.color || child.time_color || null,
        };
      })
  ), [safeChildren, teamById]);

  // Todos os eventos: ranking global, as maiores pontuações do buffet inteiro
  // (crianças de qualquer evento; só ficam de fora as inativas/desvinculadas).
  const globalRanking = useMemo(() => {
    if (!isAllEvents) return [];
    return [...safeChildren]
      .filter((child) => child?.status !== 'inactive')
      .sort((a, b) =>
        Number(b?.scores ?? b?.score ?? 0) - Number(a?.scores ?? a?.score ?? 0)
        || String(a?.name || '').localeCompare(String(b?.name || ''), 'pt-BR'))
      .slice(0, 10)
      .map((child) => ({ ...child, teamName: child.time_nome || null, teamColor: child.time_color || null }));
  }, [isAllEvents, safeChildren]);
  const rankingRows = isAllEvents ? globalRanking : liveRanking;

  // Todos os eventos: pontuação por evento nos 5 últimos eventos, mesmo os sem
  // pontuação (aparecem com 0). Eventos agendados para o futuro não entram.
  const eventScoreData = useMemo(() => {
    if (!isAllEvents) return [];
    const byEvent = new Map<string, { pontuacao: number; criancas: number }>();
    for (const child of safeChildren) {
      if (!child?.eventoId) continue;
      const current = byEvent.get(child.eventoId) ?? { pontuacao: 0, criancas: 0 };
      current.pontuacao += Number(child.scores ?? child.score ?? 0);
      current.criancas += 1;
      byEvent.set(child.eventoId, current);
    }
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const sortKey = (e: any) => `${String(e.date || '').split('T')[0]} ${String(e.time || '').slice(0, 5)}`;
    return safeEvents
      .filter((e) => isActiveStatus(e?.status) || isClosedStatus(e?.status) || String(e?.data || '').split('T')[0] <= todayKey)
      .sort((a, b) => sortKey(b).localeCompare(sortKey(a)))
      .slice(0, 5)
      .reverse()
      .map((e) => ({
        evento: shortName(e.nome || 'Evento'),
        nome: e.nome || 'Evento',
        pontuacao: byEvent.get(e.eventoId)?.pontuacao ?? 0,
        criancas: byEvent.get(e.eventoId)?.criancas ?? 0,
      }));
  }, [isAllEvents, safeChildren, safeEvents]);

  const eventsSummary = useMemo(() => ({
    total: safeEvents.length,
    active: safeEvents.filter((e) => isActiveStatus(e?.status)).length,
    scheduled: safeEvents.filter((e) => !isActiveStatus(e?.status) && !isClosedStatus(e?.status)).length,
    finished: safeEvents.filter((e) => isClosedStatus(e?.status)).length,
  }), [safeEvents]);

  // Engajamento em intervalos de tempo, só dentro do período em que o evento
  // esteve ativo (do início real até o encerramento). O intervalo é escolhido
  // pela duração para o gráfico ter de 5 a 10 pontos. Com o evento em andamento
  // o eixo já cobre o evento inteiro e os intervalos futuros ficam sem ponto.
  const engagement = useMemo(() => {
    const times = safeScoreLog
      .map((entry) => (entry?.created_at ? new Date(entry.created_at) : null))
      .filter((date): date is Date => date !== null && !Number.isNaN(date.getTime()));
    const window = getEventActiveWindow(selectedEvent, times, now);
    const bucketMinutes = window ? getBucketMinutes(selectedEvent?.duracao, window) : 0;
    const duration = Number(selectedEvent?.duracao);
    const plannedEnd = window?.ongoing && duration > 0
      ? new Date(window.start.getTime() + duration * 60000)
      : null;
    return {
      window,
      bucketMinutes,
      data: window ? buildTimeBuckets(window, times, bucketMinutes, plannedEnd) : [],
    };
  }, [safeScoreLog, selectedEvent, now]);

  const engagementOverTimeData = engagement.data;
  const engagementWindow = engagement.window;
  const engagementBucketMinutes = engagement.bucketMinutes;
  const isSelectedEventActive = selectedEvent?.status === 'active' || selectedEvent?.status === 'ongoing';

  // Card "Jogo ativo": o jogo em andamento no evento (em "todos", nos eventos ativos)
  const runningGames = gameTargetIds
    .map((id) => ({ id, state: gameStates[id] }))
    .filter((item) => item.state?.active);
  const gameLoaded = gameTargetIds.length === 0 || gameTargetIds.every((id) => id in gameStates);
  let gameValue = 'Nenhum';
  let gameHint = isAllEvents ? 'nenhum evento com jogo rodando' : 'nenhum jogo em andamento';
  if (!gameLoaded) {
    gameValue = '—';
    gameHint = 'consultando...';
  } else if (runningGames.length === 1) {
    const only = runningGames[0];
    gameValue = gameLabel(only.state);
    const startedAt = only.state?.startedAt ? new Date(only.state.startedAt) : null;
    gameHint = isAllEvents
      ? (safeEvents.find((e) => e.eventoId === only.id)?.nome || 'em andamento')
      : (startedAt && !Number.isNaN(startedAt.getTime()) ? `em andamento desde ${formatClock(startedAt)}` : 'em andamento');
  } else if (runningGames.length > 1) {
    gameValue = `${runningGames.length} jogos ativos`;
    gameHint = runningGames.map((item) => gameLabel(item.state)).join(', ');
  }

  const kpis: { label: string; value: number | string; hint?: string; color: string; icon: React.ReactNode }[] = [
    { label: isAllEvents ? 'Crianças (todos os eventos)' : 'Crianças no evento', value: totalChildren, color: 'text-secondary', icon: <Users size={24} /> },
    { label: isAllEvents ? 'Checkpoints ativos (eventos abertos)' : 'Checkpoints ativos', value: activeCheckpoints, color: 'text-success', icon: <MapPin size={24} /> },
    { label: 'Jogo ativo', value: gameValue, hint: gameHint, color: 'text-accent', icon: <Gamepad2 size={24} /> },
    { label: isAllEvents ? 'Pontuação total (todos os eventos)' : 'Pontuação total até agora', value: totalScores, color: 'text-warning', icon: <Trophy size={24} /> },
  ];

  if (loading) {
    return (
      <div className="flex h-screen bg-dark text-white overflow-hidden">
        <AdminSidebar />
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
      <AdminSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <BuffetTopBar subtitle="Painel administrativo" />

        <main className="min-w-0 flex-1 overflow-y-auto p-4 space-y-6 sm:p-6">
          <PageHeader
            title="Dashboard"
            description={isAllEvents ? 'Visão geral de todos os eventos' : 'Visão geral do evento selecionado'}
            icon={<LayoutDashboard size={28} />}
            action={
              safeEvents.length > 0 ? (
                <div className="w-full sm:w-72">
                  <Select
                    options={eventOptions}
                    value={selectedEventId}
                    onChange={(e) => handleSelectEvent(e.target.value)}
                  />
                </div>
              ) : undefined
            }
          />

          {!selectedEventId ? (
            <Card>
              <p className="text-gray-500 text-sm text-center py-6">Nenhum evento cadastrado ainda.</p>
            </Card>
          ) : (
            <>
              {/* KPI Cards */}
              <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${loadingEventData ? 'opacity-60' : ''}`}>
                {kpis.map(kpi => (
                  <Card key={kpi.label} className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-dark-surface">
                      <span className={kpi.color}>{kpi.icon}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-body text-gray-400">{kpi.label}</p>
                      <p
                        className={`font-display font-bold ${kpi.color} ${typeof kpi.value === 'string' ? 'text-xl leading-tight truncate' : 'text-2xl'}`}
                        title={typeof kpi.value === 'string' ? kpi.value : undefined}
                      >
                        {kpi.value}
                      </p>
                      {kpi.hint && <p className="text-xs text-gray-500 truncate" title={kpi.hint}>{kpi.hint}</p>}
                    </div>
                  </Card>
                ))}
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <div className="flex items-center gap-2 mb-4">
                    <Trophy size={20} className="text-warning" />
                    <h3 className="font-display text-lg text-white">{isAllEvents ? 'Ranking Global' : 'Ranking ao Vivo'}</h3>
                  </div>
                  {isAllEvents && (
                    <p className="-mt-2 mb-3 text-xs text-gray-500">Maiores pontuações de todos os eventos</p>
                  )}
                  <div className="space-y-3">
                    {rankingRows.length > 0 ? (
                      rankingRows.map((child, index) => (
                        <div key={child.id} className="flex items-center gap-3 p-2 rounded-lg bg-surface/50">
                          <span className={`font-mono text-lg font-bold w-6 text-center ${
                            index === 0 ? 'text-warning' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-amber-700' : 'text-gray-500'
                          }`}>
                            {index + 1}
                          </span>
                          {child.teamColor && (
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: child.teamColor }} />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{child.nickname || child.name}</p>
                            <p className="text-xs text-gray-500 truncate">
                              {child.teamName || 'Sem time'}
                              {isAllEvents && child.evento_name ? ` · ${child.evento_name}` : ''}
                            </p>
                          </div>
                          <p className="text-sm font-bold text-primary">{child.scores ?? child.score ?? 0}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm text-center py-4">
                        {isAllEvents ? 'Nenhuma criança cadastrada ainda' : 'Nenhum participante ativo ainda'}
                      </p>
                    )}
                  </div>
                </Card>

                {isAllEvents ? (
                <Card>
                  <h3 className="font-display text-lg text-white">Pontuação por Evento</h3>
                  <p className="mt-1 mb-4 text-xs text-gray-500">
                    {eventScoreData.length > 0
                      ? `Últimos ${eventScoreData.length} ${eventScoreData.length === 1 ? 'evento' : 'eventos'}, mesmo sem pontos. `
                      : ''}
                    Escolha um evento para ver o engajamento ao longo do tempo.
                  </p>
                  {eventScoreData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={380}>
                      <BarChart data={eventScoreData} margin={{ top: 20, right: 12, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="evento" interval={0} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1E1B2E', border: '1px solid #374151', borderRadius: 8 }}
                          labelStyle={{ color: '#fff' }}
                          labelFormatter={(_label, payload) => payload?.[0]?.payload?.nome ?? _label}
                          formatter={(value, name, item) => (
                            name === 'pontuacao'
                              ? [`${value} (${item?.payload?.criancas ?? 0} crianças)`, 'Pontuação']
                              : [value, name]
                          )}
                        />
                        <Bar dataKey="pontuacao" name="pontuacao" fill="#29B6F6" radius={[6, 6, 0, 0]} isAnimationActive={false} minPointSize={4}>
                          <LabelList dataKey="pontuacao" position="top" fill="#9CA3AF" fontSize={12} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-[250px] items-center justify-center text-center text-sm text-gray-500">
                      Nenhum evento realizado ainda.
                    </div>
                  )}
                </Card>
                ) : (
                <Card>
                  <h3 className="font-display text-lg text-white">Engajamento ao Longo do Tempo</h3>
                  {engagementWindow && (
                    <p className="mt-1 mb-4 text-xs text-gray-500">
                      {(isSelectedEventActive
                        ? `Evento ativo desde ${formatClock(engagementWindow.start)}`
                        : engagementWindow.source === 'readings'
                          ? `Período com atividade: ${formatClock(engagementWindow.start)} às ${formatClock(engagementWindow.end)}`
                          : `Evento ativo das ${formatClock(engagementWindow.start)} às ${formatClock(engagementWindow.end)}`)
                        + ` · a cada ${engagementBucketMinutes} min`}
                    </p>
                  )}
                  {engagementOverTimeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={engagementOverTimeData} margin={{ top: 5, right: 28, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="hora" interval={0} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1E1B2E', border: '1px solid #374151', borderRadius: 8 }}
                        labelStyle={{ color: '#fff' }}
                        labelFormatter={(_label, payload) => payload?.[0]?.payload?.faixa ?? _label}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="pontuacoes" stroke="#29B6F6" strokeWidth={2} dot={{ fill: '#29B6F6', r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                  ) : (
                    <div className="flex h-[250px] items-center justify-center text-center text-sm text-gray-500">
                      {selectedEvent
                        ? 'O evento ainda não foi iniciado. O gráfico aparece a partir do início do evento.'
                        : 'Selecione um evento.'}
                    </div>
                  )}
                </Card>
                )}
              </div>

              {/* Bottom Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Evento selecionado */}
                <Card variant="glow">
                  <div className="flex items-center gap-2 mb-3">
                    <StatusDot status={isAllEvents ? (eventsSummary.active > 0 ? 'online' : 'offline') : (selectedEvent?.status === 'active' || selectedEvent?.status === 'ongoing' ? 'online' : 'offline')} size="lg" />
                    <h3 className="font-display text-lg text-white">{isAllEvents ? 'Todos os Eventos' : 'Evento Selecionado'}</h3>
                  </div>
                  {isAllEvents ? (
                    <div className="space-y-2">
                      <p className="font-display text-xl text-white">
                        {eventsSummary.total} {eventsSummary.total === 1 ? 'evento' : 'eventos'}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <Badge variant="success">{eventsSummary.active} {eventsSummary.active === 1 ? 'ativo' : 'ativos'}</Badge>
                        <Badge variant="warning">{eventsSummary.scheduled} {eventsSummary.scheduled === 1 ? 'agendado' : 'agendados'}</Badge>
                        <Badge variant="muted">{eventsSummary.finished} {eventsSummary.finished === 1 ? 'encerrado' : 'encerrados'}</Badge>
                      </div>
                    </div>
                  ) : selectedEvent ? (
                    <div className="space-y-2">
                      <p className="font-display text-xl text-white">{selectedEvent.nome}</p>
                      <p className="text-sm text-gray-400">{formatEventDate(selectedEvent.data)}</p>
                      <p className="text-sm text-gray-400">{selectedEvent.location || 'Local não definido'}</p>
                      <div className="flex items-center gap-2 mt-3">
                        <Badge variant={STATUS_LABELS[selectedEvent.status]?.variant || 'muted'}>
                          {STATUS_LABELS[selectedEvent.status]?.label || selectedEvent.status}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Nenhum evento selecionado</p>
                  )}
                </Card>

                {/* Jogos mais populares */}
                <Card>
                  <div className="flex items-center gap-2 mb-4">
                    <Trophy size={20} className="text-accent" />
                    <h3 className="font-display text-lg text-white">Jogos disponíveis</h3>
                    <Badge variant="muted" className="ml-auto">{availableGames.length}</Badge>
                  </div>
                  <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
                    {availableGames.length > 0 ? (
                      availableGames.map((game, index) => (
                        <div key={game.id} className="flex items-center gap-3 p-2 rounded-lg bg-surface/50">
                          <span className="font-mono text-lg font-bold text-gray-500 w-6 text-center">{index + 1}</span>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-white">{game.name}</p>
                            <p className="text-xs text-gray-500">
                              {game.type === 'team' ? 'Equipe' : game.type === 'individual' ? 'Individual' : 'Cooperativo'}
                              &middot; {game.checkpoints?.length || 0} checkpoints
                            </p>
                          </div>
                          <Badge variant={game.status === 'active' ? 'success' : 'muted'}>
                            {game.status === 'active' ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm text-center py-4">Nenhum jogo cadastrado</p>
                    )}
                  </div>
                </Card>

                {/* Status ao vivo dos checkpoints (ou resumo, em "Todos os eventos") */}
                <Card>
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin size={20} className="text-secondary" />
                    <h3 className="font-display text-lg text-white">Status dos Checkpoints</h3>
                  </div>
                  {isAllEvents ? (
                    checkpointTotals.total > 0 ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="rounded-lg bg-surface/50 p-2">
                            <p className="text-[11px] text-gray-400">Cadastrados</p>
                            <p className="font-display text-xl font-bold text-white">{checkpointTotals.total}</p>
                          </div>
                          <div className="rounded-lg bg-surface/50 p-2">
                            <p className="text-[11px] text-gray-400">Ativos</p>
                            <p className="font-display text-xl font-bold text-success">{checkpointTotals.online}</p>
                          </div>
                          <div className="rounded-lg bg-surface/50 p-2">
                            <p className="text-[11px] text-gray-400">Indisponíveis</p>
                            <p className="font-display text-xl font-bold text-danger">{checkpointTotals.offline}</p>
                          </div>
                        </div>

                        <div>
                          <div className="mb-1.5 flex items-baseline justify-between">
                            <span className="text-sm text-gray-300">Disponíveis</span>
                            <span className="font-display text-lg font-bold" style={{ color: availabilityColor(checkpointTotals.percent) }}>
                              {checkpointTotals.percent === null ? '—' : `${checkpointTotals.percent}%`}
                            </span>
                          </div>
                          <ProgressBar value={checkpointTotals.percent ?? 0} color={availabilityColor(checkpointTotals.percent)} />
                        </div>

                        <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                          {checkpointSummary.map((row) => {
                            const percent = percentOf(Number(row.online || 0), Number(row.total || 0));
                            const status = STATUS_LABELS[row.eventoStatus];
                            return (
                              <div key={row.eventoId} className="rounded-lg bg-surface/50 p-2">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="min-w-0 truncate text-sm font-semibold text-white" title={row.eventoName}>{row.eventoName || 'Evento'}</p>
                                  <Badge variant={status?.variant || 'muted'}>{status?.label || row.eventoStatus || '—'}</Badge>
                                </div>
                                <div className="mt-1 mb-1.5 flex items-center justify-between text-xs text-gray-400">
                                  <span>{row.online} ativos · {row.offline} indisp. · {row.total} cad.</span>
                                  <span style={{ color: availabilityColor(percent) }}>{percent === null ? '—' : `${percent}%`}</span>
                                </div>
                                <ProgressBar value={percent ?? 0} color={availabilityColor(percent)} />
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-[11px] text-gray-500">Nos eventos encerrados, o status é o último registrado pelo checkpoint.</p>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm text-center py-4">Nenhum checkpoint cadastrado</p>
                    )
                  ) : (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {checkpointsStatus.length > 0 ? (
                      checkpointsStatus.map((cp) => {
                        const territory = territories[cp.id];
                        const isLocked = territory?.isLocked || false;
                        const owningTeam = territory?.ownerTeam || null;
                        return (
                          <div key={cp.id} className="flex items-center gap-3 p-2 rounded-lg bg-surface/50">
                            <StatusDot status={cp.status === 'online' ? 'online' : 'offline'} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-white truncate">{cp.name}</p>
                              <p className="text-xs text-gray-500 truncate">
                                {cp.zone || 'Sem zona'}
                                {isAllEvents && cp.evento_name ? ` · ${cp.evento_name}` : ''}
                              </p>
                            </div>
                            {isLocked ? (
                              <Badge variant="accent">
                                {owningTeam?.name || 'Dominado'}
                              </Badge>
                            ) : (
                              <span className="text-xs text-gray-500">Livre</span>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-gray-500 text-sm text-center py-4">Nenhum checkpoint cadastrado</p>
                    )}
                  </div>
                  )}
                </Card>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
