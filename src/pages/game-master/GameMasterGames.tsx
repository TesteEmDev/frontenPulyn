import { useCallback, useEffect, useState } from 'react';
import { ListChecks, Gamepad2, Users, MessageSquare } from 'lucide-react';
import { usePulynStore } from '../../store/mockData';
import { api } from '../../services/api';
import Sidebar from '../../components/layout/Sidebar';
import PageHeader from '../../components/layout/PageHeader';
import { PARALLEL_NAV_ITEM, GAMES_NAV_ITEM } from '../../components/layout/gameMasterNav';
import LiveGameCheckpoints from '../../components/game-master/LiveGameCheckpoints';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

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
  team: 'Zona (equipe)',
  individual: 'Zona (individual)',
  cooperative: 'Cooperativo',
};

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

  const loadData = useCallback(async (eventId: string, keepSelection = false) => {
    setLoading(true);
    setError('');
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
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os jogos.');
    } finally {
      setLoading(false);
    }
  }, []);

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
  const supported = selectedGame && (selectedGame.type === 'treasure_hunt' || selectedGame.type === 'monster_hunt');

  return (
    <div className="flex h-screen bg-dark text-white overflow-hidden">
      <Sidebar
        items={sidebarItems}
        activePath="/game-master/games"
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        title="Pulyn GM"
      />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <PageHeader
            title="Checkpoints dos jogos"
            description="Escolha quais checkpoints fazem parte de cada jogo, inclusive com a partida em andamento"
            icon={<ListChecks size={28} />}
          />

          <Card>
            <label className="mb-2 block text-sm font-semibold text-gray-300" htmlFor="games-event">Evento</label>
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
            {selectedEvent && <p className="mt-2 text-xs text-gray-500">Jogos de: {selectedEvent.nome}</p>}
          </Card>

          {error && (
            <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>
          )}

          {!eventoAtualId ? (
            <Card><p className="py-8 text-center text-sm text-gray-500">Selecione um evento para ver os jogos.</p></Card>
          ) : loading && games.length === 0 ? (
            <Card><p className="py-8 text-center text-gray-400">Carregando jogos...</p></Card>
          ) : games.length === 0 ? (
            <Card><p className="py-8 text-center text-sm text-gray-500">Este evento ainda não tem jogos cadastrados.</p></Card>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[minmax(240px,1fr)_2fr]">
              <ul className="space-y-2" aria-label="Jogos do evento">
                {games.map(game => {
                  const selected = game.id === selectedGameId;
                  const count = (game.checkpoints || []).map(idOf).filter(Boolean).length;
                  return (
                    <li key={game.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedGameId(game.id)}
                        aria-pressed={selected}
                        className={`w-full rounded-xl border p-4 text-left transition-colors ${selected ? 'border-primary bg-primary/10' : 'border-white/10 hover:border-primary/40'}`}
                      >
                        <span className="flex items-start justify-between gap-2">
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-white">{game.name}</span>
                            <span className="block text-xs text-gray-500">{TYPE_LABEL[game.type] || game.type}</span>
                          </span>
                          {runningGameId === String(game.id) && <Badge variant="success">Em andamento</Badge>}
                        </span>
                        <span className="mt-2 block text-xs text-gray-400">{count} checkpoint{count !== 1 ? 's' : ''} no jogo</span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div>
                {!selectedGame ? (
                  <Card><p className="py-8 text-center text-sm text-gray-500">Escolha um jogo para editar os checkpoints dele.</p></Card>
                ) : supported ? (
                  <LiveGameCheckpoints
                    game={selectedGame}
                    eventCheckpoints={checkpoints}
                    running={runningGameId === String(selectedGame.id)}
                    onSaved={() => loadData(eventoAtualId, true)}
                  />
                ) : (
                  <Card>
                    <h3 className="font-display text-lg text-white">{selectedGame.name}</h3>
                    <p className="mt-2 text-sm text-gray-400">
                      Os jogos de Zona usam todos os checkpoints do evento, então não há lista para editar aqui.
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
