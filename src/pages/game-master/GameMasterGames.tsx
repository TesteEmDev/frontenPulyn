import { useCallback, useEffect, useState } from 'react';
import { ListChecks, Gamepad2, Users, MessageSquare, Gem, Skull, Bomb, Flag, ShieldAlert, MapPin, Radio, CalendarDays } from 'lucide-react';
import { usePulynStore } from '../../store/mockData';
import { api } from '../../services/api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import Sidebar from '../../components/layout/Sidebar';
import PageHeader from '../../components/layout/PageHeader';
import { PARALLEL_NAV_ITEM, GAMES_NAV_ITEM } from '../../components/layout/gameMasterNav';
import LiveGameCheckpoints from '../../components/game-master/LiveGameCheckpoints';
import Card from '../../components/ui/Card';

const sidebarItems = [
  { icon: <Gamepad2 size={20} />, label: 'Painel', path: '/game-master' },
  { icon: <Users size={20} />, label: 'Times', path: '/game-master/teams' },
  { icon: <MessageSquare size={20} />, label: 'Mensagens', path: '/game-master/messages' },
  PARALLEL_NAV_ITEM,
  GAMES_NAV_ITEM,
];

const TYPE_LABEL: Record<string, string> = {
  treasure_hunt: 'Caça ao Tesouro',
  monster_hunt: 'Caça ao Monstro',
  bomb_defusal: 'Conquistar e Destruir',
  zone_domination: 'Zona (domínio total)',
  hostage_rescue: 'Resgate do Refém',
  team: 'Zona (equipe)',
  individual: 'Zona (individual)',
  cooperative: 'Cooperativo',
};

// Ícone e cor de cada tipo de jogo, para a lista ficar fácil de reconhecer
const TYPE_VISUAL: Record<string, { icon: JSX.Element; cor: string }> = {
  treasure_hunt: { icon: <Gem size={20} />, cor: 'bg-accent/15 text-accent' },
  monster_hunt: { icon: <Skull size={20} />, cor: 'bg-danger/15 text-danger' },
  bomb_defusal: { icon: <Bomb size={20} />, cor: 'bg-warning/15 text-warning' },
  hostage_rescue: { icon: <ShieldAlert size={20} />, cor: 'bg-primary/15 text-primary-300' },
  zone_domination: { icon: <Flag size={20} />, cor: 'bg-secondary/15 text-secondary' },
};
const VISUAL_PADRAO = { icon: <Gamepad2 size={20} />, cor: 'bg-white/10 text-gray-300' };

const idOf = (item: any): string => String(item && typeof item === 'object' ? item.id : item ?? '').trim();

export default function GameMasterGames() {
  const { events, eventoAtualId, setEventoAtual, loadEventos } = usePulynStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [games, setGames] = useState<any[]>([]);
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [runningGameId, setRunningGameId] = useState<string | null>(null);
  const [selectedGameId, setSelectedGameId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (events.length === 0) loadEventos();
  }, [events.length, loadEventos]);

  useEffect(() => {
    if (!eventoAtualId && events[0]?.eventoId) setEventoAtual(events[0].eventoId);
  }, [eventoAtualId, events, setEventoAtual]);

  const loadData = useCallback(async (eventId: string, keepSelection = false, silencioso = false) => {
    if (!silencioso) {
      setLoading(true);
      setError('');
    }
    try {
      const [gameList, checkpointList, state] = await Promise.all([
        api.getBrincadeiras(eventId),
        api.getCheckpoints(eventId),
        api.getGameState(eventId).catch(() => null),
      ]);
      const list = Array.isArray(gameList) ? gameList : [];
      setGames(list);
      setCheckpoints(Array.isArray(checkpointList) ? checkpointList : []);
      setRunningGameId(state?.active && state?.gameId ? String(state.gameId) : null);
      setSelectedGameId(previous => (keepSelection && list.some(game => game.id === previous) ? previous : ''));
    } catch (err) {
      if (!silencioso) setError(err instanceof Error ? err.message : 'Não foi possível carregar os jogos.');
    } finally {
      if (!silencioso) setLoading(false);
    }
  }, []);

  // Jogo em andamento e checkpoints se atualizam sozinhos, mantendo o jogo escolhido na tela
  useAutoRefresh(() => (eventoAtualId ? loadData(eventoAtualId, true, true) : undefined), { topicos: ['jogos', 'checkpoints', 'eventos'], intervaloMs: 10_000 });

  useEffect(() => {
    if (!eventoAtualId) {
      setGames([]);
      setCheckpoints([]);
      setRunningGameId(null);
      setSelectedGameId('');
      return;
    }
    loadData(eventoAtualId);
  }, [eventoAtualId, loadData]);

  const selectedGame = games.find(game => game.id === selectedGameId) || null;
  const selectedEvent = events.find(event => event.eventoId === eventoAtualId);
  const supported = selectedGame && ['treasure_hunt', 'monster_hunt', 'bomb_defusal', 'hostage_rescue', 'zone_domination'].includes(selectedGame.type);
  const onlineIds = new Set(checkpoints.filter(cp => String(cp.status).toLowerCase() === 'online').map(cp => String(cp.id)));

  const resumo = [
    { icone: <Gamepad2 size={16} />, rotulo: 'Jogos', valor: games.length, cor: 'text-primary-300' },
    { icone: <Radio size={16} />, rotulo: 'Em andamento', valor: runningGameId ? 1 : 0, cor: runningGameId ? 'text-success' : 'text-gray-500' },
    { icone: <MapPin size={16} />, rotulo: 'Checkpoints online', valor: `${onlineIds.size}/${checkpoints.length}`, cor: 'text-secondary' },
  ];

  return (
    <div className="flex h-screen bg-dark text-white overflow-hidden">
      <Sidebar
        items={sidebarItems}
        activePath="/game-master/games"
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        title="Pulyn GM"
      />

      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <PageHeader
            title="Checkpoints dos jogos"
            description="Escolha quais checkpoints fazem parte de cada jogo, inclusive com a partida em andamento"
            icon={<ListChecks size={28} />}
          />

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-[minmax(260px,1.4fr)_repeat(3,minmax(120px,1fr))]">
            <Card variant="glow" className="!p-4 sm:col-span-3 lg:col-span-1">
              <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400" htmlFor="games-event">
                <CalendarDays size={14} /> Evento
              </label>
              <select
                id="games-event"
                value={eventoAtualId || ''}
                onChange={event => setEventoAtual(event.target.value || null)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-white focus:border-primary focus:outline-none"
              >
                <option value="">Selecione um evento</option>
                {events.map(event => (
                  <option key={event.eventoId} value={event.eventoId}>{event.nome}</option>
                ))}
              </select>
              {selectedEvent && <p className="mt-2 truncate text-xs text-gray-500">Jogos de: {selectedEvent.nome}</p>}
            </Card>
            {resumo.map(item => (
              <Card key={item.rotulo} className="!p-4">
                <div className={`flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider ${item.cor}`}>{item.icone}{item.rotulo}</div>
                <p className="mt-2 font-display text-3xl text-white">{eventoAtualId ? item.valor : '–'}</p>
              </Card>
            ))}
          </div>

          {error && (
            <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>
          )}

          {!eventoAtualId ? (
            <Card><p className="py-10 text-center text-sm text-gray-500">Selecione um evento para ver os jogos.</p></Card>
          ) : loading && games.length === 0 ? (
            <Card><p className="py-10 text-center text-gray-400">Carregando jogos...</p></Card>
          ) : games.length === 0 ? (
            <Card><p className="py-10 text-center text-sm text-gray-500">Este evento ainda não tem jogos cadastrados.</p></Card>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[minmax(260px,340px)_1fr]">
              <ul className="space-y-3 lg:sticky lg:top-0 lg:self-start" aria-label="Jogos do evento">
                {games.map(game => {
                  const selected = game.id === selectedGameId;
                  const ids: string[] = (game.checkpoints || []).map(idOf).filter(Boolean);
                  const count = ids.length;
                  const online = ids.filter(id => onlineIds.has(id)).length;
                  const rodando = runningGameId === String(game.id);
                  const visual = TYPE_VISUAL[game.type] || VISUAL_PADRAO;
                  const pct = count ? Math.round((online / count) * 100) : 0;
                  return (
                    <li key={game.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedGameId(game.id)}
                        aria-pressed={selected}
                        className={`relative w-full overflow-hidden rounded-2xl border p-4 text-left transition-all ${selected ? 'border-primary bg-primary/10 shadow-[0_8px_28px_rgba(30,155,215,0.18)]' : 'border-white/10 bg-white/[0.02] hover:-translate-y-0.5 hover:border-primary/40'}`}
                      >
                        {selected && <span className="absolute inset-y-0 left-0 w-1 bg-primary" aria-hidden="true" />}
                        <span className="flex items-start gap-3">
                          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${visual.cor}`}>{visual.icon}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-white">{game.name}</span>
                            <span className="block text-xs text-gray-500">{TYPE_LABEL[game.type] || game.type}</span>
                          </span>
                          {rodando && (
                            <span className="flex items-center gap-1.5 rounded-full bg-success/15 px-2 py-1 text-[11px] font-bold uppercase text-success">
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" aria-hidden="true" />Ao vivo
                            </span>
                          )}
                        </span>
                        <span className="mt-3 flex items-center justify-between text-xs text-gray-400">
                          <span>{count} checkpoint{count !== 1 ? 's' : ''}</span>
                          <span className={count && online < count ? 'text-warning' : 'text-gray-500'}>{online} online</span>
                        </span>
                        <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                          <span className={`block h-full rounded-full transition-all ${pct === 100 ? 'bg-success' : 'bg-warning'}`} style={{ width: `${pct}%` }} />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className="min-w-0">
                {!selectedGame ? (
                  <Card>
                    <div className="flex flex-col items-center gap-3 py-12 text-center">
                      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary-300"><ListChecks size={28} /></span>
                      <p className="text-sm text-gray-400">Escolha um jogo na lista para editar os checkpoints dele.</p>
                    </div>
                  </Card>
                ) : supported ? (
                  <LiveGameCheckpoints
                    game={selectedGame}
                    eventCheckpoints={checkpoints}
                    running={runningGameId === String(selectedGame.id)}
                    includePaintball
                    onSaved={() => loadData(eventoAtualId, true)}
                  />
                ) : (
                  <Card>
                    <h3 className="font-display text-lg text-white">{selectedGame.name}</h3>
                    <p className="mt-2 text-sm text-gray-400">
                      Este tipo de jogo não tem lista de checkpoints para editar aqui.
                    </p>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
