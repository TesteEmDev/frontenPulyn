import { useCallback, useEffect, useMemo, useState } from 'react';
import { Zap, Gamepad2, Users, MessageSquare, Medal, Play, Square, Loader2, Search } from 'lucide-react';
import { usePulynStore } from '../../store/mockData';
import { api } from '../../services/api';
import Sidebar from '../../components/layout/Sidebar';
import PageHeader from '../../components/layout/PageHeader';
import { PARALLEL_NAV_ITEM, GAMES_NAV_ITEM } from '../../components/layout/gameMasterNav';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import ParallelObjectsList from '../../components/game-master/ParallelObjectsList';
import RouletteOverlay, { type RouletteData } from '../../components/game-master/RouletteOverlay';

const sidebarItems = [
  { icon: <Gamepad2 size={20} />, label: 'Painel', path: '/game-master' },
  { icon: <Users size={20} />, label: 'Times', path: '/game-master/teams' },
  { icon: <MessageSquare size={20} />, label: 'Mensagens', path: '/game-master/messages' },
  PARALLEL_NAV_ITEM,
  GAMES_NAV_ITEM,
];

const PRIZES = [50, 40, 30];
const MEDAL_COLORS = ['#F5B301', '#C0C7D1', '#CD7F32']; // ouro, prata, bronze
const FINISH_LABEL: Record<string, string> = {
  completed: 'Os 3 lugares foram preenchidos',
  manual: 'Encerrada pelo recreacionista',
  main_game_stopped: 'A brincadeira principal terminou',
};

interface Winner {
  position: number;
  points: number;
  criancaName: string;
  teamName: string;
  teamColor: string;
}

interface ParallelGame {
  id: string;
  checkpointId: string;
  checkpointName: string;
  objectName?: string;
  status: string;
  startedAt: string;
  finishReason: string | null;
  winners: Winner[];
}

interface Overview {
  active: ParallelGame | null;
  history: ParallelGame[];
}

const formatTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

// Os 3 lugares do pódio: o que já foi conquistado e o que ainda está esperando.
function Podium({ winners }: { winners: Winner[] }) {
  return (
    <ol className="space-y-2">
      {PRIZES.map((prize, index) => {
        const winner = winners.find(item => item.position === index + 1);
        return (
          <li
            key={prize}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${winner ? 'border-white/15 bg-white/[0.05]' : 'border-dashed border-white/10'}`}
          >
            <Medal size={26} style={{ color: MEDAL_COLORS[index] }} aria-hidden="true" />
            <span className="w-8 font-display text-lg font-bold text-white">{index + 1}º</span>
            <span className="min-w-0 flex-1">
              {winner ? (
                <>
                  <span className="block truncate text-sm font-semibold text-white">{winner.criancaName}</span>
                  {winner.teamName && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: winner.teamColor || '#6B7280' }} aria-hidden="true" />
                      {winner.teamName}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-sm text-gray-500">Aguardando a leitura...</span>
              )}
            </span>
            <span className={`font-mono text-lg font-bold ${winner ? 'text-success' : 'text-gray-500'}`}>+{prize}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default function GameMasterParallel() {
  const { events, eventoAtualId, setEventoAtual, loadEventos } = usePulynStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [overview, setOverview] = useState<Overview>({ active: null, history: [] });
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [checkpointId, setCheckpointId] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmStop, setConfirmStop] = useState(false);
  const [objectCount, setObjectCount] = useState<number | null>(null);
  const [roulette, setRoulette] = useState<RouletteData | null>(null);

  useEffect(() => {
    if (events.length === 0) loadEventos();
  }, [events.length, loadEventos]);

  useEffect(() => {
    if (!eventoAtualId && events[0]?.id) setEventoAtual(events[0].id);
  }, [eventoAtualId, events, setEventoAtual]);

  const loadOverview = useCallback(async (eventId: string, silent = false) => {
    if (!silent) setLoading(true);
    try {
      setOverview(await api.getParallelGame(eventId));
      if (!silent) setError('');
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : 'Não foi possível carregar a brincadeira paralela.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!eventoAtualId) {
      setOverview({ active: null, history: [] });
      setCheckpoints([]);
      return;
    }
    setCheckpointId('');
    loadOverview(eventoAtualId);
    api.getCheckpoints(eventoAtualId).then(list => setCheckpoints(Array.isArray(list) ? list : [])).catch(() => setCheckpoints([]));
  }, [eventoAtualId, loadOverview]);

  // Enquanto a disputa está ativa, atualiza o pódio a cada 2 segundos.
  const hasActive = Boolean(overview.active);
  useEffect(() => {
    if (!eventoAtualId || !hasActive) return undefined;
    const timer = setInterval(() => loadOverview(eventoAtualId, true), 2000);
    return () => clearInterval(timer);
  }, [eventoAtualId, hasActive, loadOverview]);

  const selectedEvent = events.find(event => event.id === eventoAtualId);
  const selectedCheckpoint = useMemo(
    () => checkpoints.find(checkpoint => String(checkpoint.id) === checkpointId),
    [checkpoints, checkpointId]
  );

  const handleStart = async () => {
    if (!eventoAtualId || !checkpointId) return;
    setBusy(true);
    setError('');
    try {
      const started = await api.startParallelGame(eventoAtualId, checkpointId);
      // O objeto já foi sorteado no servidor; a roleta só mostra o resultado girando.
      if (started?.roulette?.segments?.length) {
        setRoulette({
          segments: started.roulette.segments,
          winnerIndex: started.roulette.winnerIndex,
          objectName: started.roulette.objectName || started.objectName,
          checkpointName: started.checkpointName || selectedCheckpoint?.name,
        });
      }
      await loadOverview(eventoAtualId, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível iniciar a brincadeira paralela.');
    } finally {
      setBusy(false);
    }
  };

  const handleStop = async () => {
    if (!eventoAtualId) return;
    setBusy(true);
    setError('');
    try {
      await api.stopParallelGame(eventoAtualId);
      setConfirmStop(false);
      await loadOverview(eventoAtualId, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível encerrar a brincadeira paralela.');
      setConfirmStop(false);
    } finally {
      setBusy(false);
    }
  };

  const { active, history } = overview;

  return (
    <div className="flex h-screen bg-dark text-white overflow-hidden">
      <Sidebar
        items={sidebarItems}
        activePath="/game-master/parallel"
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        title="Pulyn GM"
      />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <PageHeader
            title="Brincadeira paralela"
            description="Ache o objeto: a roleta sorteia um objeto e os 3 primeiros a levá-lo ao checkpoint escolhido ganham 50, 40 e 30 pontos"
            icon={<Zap size={28} />}
          />

          <Card>
            <label className="mb-2 block text-sm font-semibold text-gray-300" htmlFor="parallel-event">Evento</label>
            <select
              id="parallel-event"
              value={eventoAtualId || ''}
              onChange={event => setEventoAtual(event.target.value || null)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-white focus:border-primary focus:outline-none"
            >
              <option value="">Selecione um evento</option>
              {events.map(event => (
                <option key={event.id} value={event.id}>{event.name}</option>
              ))}
            </select>
            {selectedEvent && <p className="mt-2 text-xs text-gray-500">A disputa vale para: {selectedEvent.name}</p>}
          </Card>

          {error && (
            <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>
          )}

          {!eventoAtualId ? (
            <Card><p className="py-8 text-center text-sm text-gray-500">Selecione um evento para começar.</p></Card>
          ) : loading && !active && history.length === 0 ? (
            <Card><p className="py-8 text-center text-gray-400">Carregando...</p></Card>
          ) : active ? (
            <Card variant="glow">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-xl text-white">Em andamento</h3>
                    <Badge variant="success">Ao vivo</Badge>
                  </div>
                  {active.objectName && (
                    <p className="mt-2 flex items-center gap-2 font-display text-2xl font-bold text-accent">
                      <Search size={22} aria-hidden="true" /> Achem: {active.objectName}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-gray-400">
                    Levem até <strong className="text-white">{active.checkpointName || 'o checkpoint'}</strong> · iniciada às {formatTime(active.startedAt)}
                  </p>
                </div>
                <Button variant="danger" onClick={() => setConfirmStop(true)} disabled={busy}>
                  <Square size={16} className="mr-1.5" />
                  Encerrar
                </Button>
              </div>
              <Podium winners={active.winners} />
              <p className="mt-4 text-xs text-gray-500">
                Enquanto a disputa estiver ativa, a leitura desse checkpoint vale só para ela e não conta para a brincadeira principal. Ela termina sozinha quando os 3 lugares forem preenchidos.
              </p>
            </Card>
          ) : (
            <Card>
              <h3 className="font-display text-lg text-white">Nova brincadeira: ache o objeto</h3>
              <p className="mt-1 text-sm text-gray-400">
                Pode começar a qualquer momento, com ou sem brincadeira principal em andamento. Ao iniciar, a roleta sorteia o objeto que as crianças devem achar e levar ao checkpoint escolhido.
              </p>

              <label className="mb-2 mt-5 block text-sm font-semibold text-gray-300" htmlFor="parallel-checkpoint">Checkpoint onde levar o objeto</label>
              <select
                id="parallel-checkpoint"
                value={checkpointId}
                onChange={event => setCheckpointId(event.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-white focus:border-primary focus:outline-none"
              >
                <option value="">Selecione um checkpoint</option>
                {checkpoints.map(checkpoint => (
                  <option key={checkpoint.id} value={checkpoint.id}>
                    {checkpoint.name}{checkpoint.zone ? ` · ${checkpoint.zone}` : ''}{String(checkpoint.status).toLowerCase() === 'online' ? '' : ' (offline)'}
                  </option>
                ))}
              </select>
              {checkpoints.length === 0 && (
                <p className="mt-2 text-xs text-gray-500">Este evento ainda não tem checkpoints cadastrados.</p>
              )}

              <div className="mt-5">
                <p className="mb-2 text-sm font-semibold text-gray-300">Prêmios</p>
                <Podium winners={[]} />
              </div>

              {selectedCheckpoint && (
                <p className="mt-4 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                  Enquanto a disputa estiver ativa, ler "{selectedCheckpoint.name}" vale só para ela e não conta para a brincadeira principal.
                </p>
              )}

              <div className="mt-5 flex justify-end">
                <Button variant="primary" onClick={handleStart} disabled={!checkpointId || busy || objectCount === 0}>
                  {busy ? <Loader2 size={16} className="mr-1.5 animate-spin" /> : <Play size={16} className="mr-1.5" />}
                  Girar a roleta e iniciar
                </Button>
              </div>
            </Card>
          )}

          <ParallelObjectsList onCountChange={setObjectCount} />

          {history.length > 0 && (
            <Card>
              <h3 className="mb-4 font-display text-lg text-white">Disputas anteriores</h3>
              <ul className="space-y-3">
                {history.map(game => (
                  <li key={game.id} className="rounded-xl border border-white/[0.08] bg-surface/30 p-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-white">
                        {game.objectName ? `${game.objectName} → ` : ''}{game.checkpointName || 'Checkpoint'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTime(game.startedAt)} · {FINISH_LABEL[game.finishReason || ''] || 'Encerrada'}
                      </span>
                    </div>
                    {game.winners.length === 0 ? (
                      <p className="text-xs text-gray-500">Ninguém pontuou.</p>
                    ) : (
                      <p className="text-sm text-gray-300">
                        {game.winners.map(winner => `${winner.position}º ${winner.criancaName} (+${winner.points})`).join(' · ')}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </main>

      {roulette && <RouletteOverlay data={roulette} onClose={() => setRoulette(null)} />}

      <Modal isOpen={confirmStop} onClose={busy ? () => undefined : () => setConfirmStop(false)} title="Encerrar brincadeira paralela" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-300">
            Encerrar agora? Os prêmios já entregues continuam, e quem ainda não leu fica sem ganhar.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmStop(false)} disabled={busy}>Cancelar</Button>
            <Button variant="danger" onClick={handleStop} disabled={busy}>
              {busy ? <><Loader2 size={16} className="mr-2 animate-spin" /> Encerrando...</> : 'Encerrar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
