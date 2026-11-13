import { useEffect, useMemo, useState } from 'react';
import { MapPin, Save, Loader2, Star, Search, Check, Undo2 } from 'lucide-react';
import { api } from '../../services/api';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

interface LiveGameCheckpointsProps {
  game: { id: string; name: string; type: string; checkpoints?: any[] };
  eventCheckpoints: Array<{ id: string; name: string; zone?: string; status?: string; codigo?: string }>;
  running: boolean;
  onSaved?: () => void | Promise<void>;
  // Libera a edição dos jogos de paintball (bomba, refém e zona). Só a tela de checkpoints dos jogos liga isso;
  // no painel do recreacionista esses jogos não mostram o seletor.
  includePaintball?: boolean;
}

const idOf = (item: any): string => String(item && typeof item === 'object' ? item.id : item ?? '').trim();
const sameSet = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every(id => b.has(id));

const PAINTBALL_TYPES = ['bomb_defusal', 'hostage_rescue', 'zone_domination'];

type Filtro = 'todos' | 'selecionados' | 'online' | 'offline';

// Ordem do Resgate do Refém: pelo id do checkpoint (10, 11, 12...), igual ao servidor.
const porIdNatural = (a: string, b: string) => String(a).localeCompare(String(b), 'pt-BR', { numeric: true, sensitivity: 'base' });

// Troca os checkpoints de um jogo. No Tesouro e no Monstro vale inclusive com a partida em andamento: o servidor
// corrige o alvo (Tesouro) ou o checkpoint especial (Monstro) se for preciso. Nos jogos de paintball (bomba, refém e
// zona) a lista nova vale a partir da próxima partida.
export default function LiveGameCheckpoints({ game, eventCheckpoints, running, onSaved, includePaintball = false }: LiveGameCheckpointsProps) {
  const isPaintball = includePaintball && PAINTBALL_TYPES.includes(game.type);
  const supported = game.type === 'treasure_hunt' || game.type === 'monster_hunt' || isPaintball;
  const isMonster = game.type === 'monster_hunt';

  const savedIds = useMemo(() => new Set((game.checkpoints || []).map(idOf).filter(Boolean)), [game.checkpoints]);
  const savedSpecial = useMemo(
    () => (game.checkpoints || []).find((item: any) => item && typeof item === 'object' && item.special)?.id as string | undefined,
    [game.checkpoints]
  );

  const [selected, setSelected] = useState<Set<string>>(savedIds);
  const [special, setSpecial] = useState<string>(savedSpecial ? String(savedSpecial) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');

  // Volta ao que está salvo ao trocar de jogo ou quando a lista salva muda (por exemplo, após salvar).
  useEffect(() => {
    setSelected(new Set(savedIds));
    setSpecial(savedSpecial ? String(savedSpecial) : '');
  }, [game.id, savedIds, savedSpecial]);

  useEffect(() => {
    setBusca('');
    setFiltro('todos');
    setNotice('');
    setError('');
  }, [game.id]);

  if (!supported) return null;

  const isOnline = (cp: { status?: string }) => String(cp.status).toLowerCase() === 'online';
  const nameOf = (id: string) => eventCheckpoints.find(cp => String(cp.id) === String(id))?.name || id;
  const specialChanged = isMonster && special !== (savedSpecial ? String(savedSpecial) : '');
  const dirty = !sameSet(selected, savedIds) || specialChanged;
  const selectedOnline = eventCheckpoints.filter(cp => selected.has(String(cp.id)) && isOnline(cp)).length;

  // Selecionados na ordem da lista do evento (é assim que o admin define o local A/B da bomba)
  const selectedInListOrder = eventCheckpoints.map(cp => String(cp.id)).filter(id => selected.has(id));
  const codigoOf = (id: string) => String(eventCheckpoints.find(cp => String(cp.id) === id)?.codigo ?? id);
  const hostageSteps = game.type === 'hostage_rescue'
    ? [...selectedInListOrder].sort((a, b) => porIdNatural(codigoOf(a), codigoOf(b)))
    : [];
  const minimum = game.type === 'bomb_defusal' || game.type === 'hostage_rescue' ? 2 : 1;
  const stepLabel = (id: string): string | null => {
    if (game.type === 'bomb_defusal') {
      const position = selectedInListOrder.indexOf(id);
      if (position < 0) return null;
      return position < 2 ? `Local ${String.fromCharCode(65 + position)}` : 'Fora da bomba';
    }
    if (game.type === 'hostage_rescue') {
      const position = hostageSteps.indexOf(id);
      return position < 0 ? null : `Passo ${position + 1}`;
    }
    return null;
  };

  const toggle = (id: string) => {
    setNotice('');
    setSelected(previous => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
        if (special === id) setSpecial('');
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selecionarOnline = () => {
    setNotice('');
    setSelected(new Set(eventCheckpoints.filter(isOnline).map(cp => String(cp.id))));
  };
  const limparSelecao = () => {
    setNotice('');
    setSelected(new Set());
    setSpecial('');
  };
  const desfazer = () => {
    setSelected(new Set(savedIds));
    setSpecial(savedSpecial ? String(savedSpecial) : '');
    setError('');
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await api.updateGameCheckpoints(game.id, {
        // Paintball: na ordem da lista do evento (o primeiro é o local A da bomba, o segundo é o B)
        checkpoints: isPaintball ? selectedInListOrder : [...selected],
        specialCheckpointId: isMonster && special ? special : undefined,
      });
      const change = Array.isArray(result?.changes) ? result.changes.find((item: any) => item.changed) : null;
      const extra = change?.targetCheckpointId
        ? ` O novo alvo é "${nameOf(change.targetCheckpointId)}".`
        : change?.specialCheckpointId
        ? ` O novo checkpoint especial é "${nameOf(change.specialCheckpointId)}".`
        : '';
      setNotice(isPaintball
        ? 'Checkpoints salvos. Valem a partir da próxima partida.'
        : `Checkpoints salvos${running ? ' e já valendo na partida' : ''}.${extra}`);
      await onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar os checkpoints.');
    } finally {
      setSaving(false);
    }
  };

  const contagens: Record<Filtro, number> = {
    todos: eventCheckpoints.length,
    selecionados: selected.size,
    online: eventCheckpoints.filter(isOnline).length,
    offline: eventCheckpoints.filter(cp => !isOnline(cp)).length,
  };
  const termo = busca.trim().toLowerCase();
  const visiveis = eventCheckpoints.filter(cp => {
    const id = String(cp.id);
    if (filtro === 'selecionados' && !selected.has(id)) return false;
    if (filtro === 'online' && !isOnline(cp)) return false;
    if (filtro === 'offline' && isOnline(cp)) return false;
    if (!termo) return true;
    return [cp.name, cp.zone, cp.codigo].some(texto => String(texto ?? '').toLowerCase().includes(termo));
  });

  const dica = [
    isPaintball
      ? 'A mudança vale a partir da próxima partida; a que já está em andamento continua como começou.'
      : running
        ? 'Marque ou desmarque e salve: a mudança vale na hora, sem reiniciar a partida.'
        : 'Marque os checkpoints que fazem parte deste jogo.',
    game.type === 'treasure_hunt' && 'Se o alvo atual sair da lista, um novo alvo é sorteado.',
    isMonster && 'A estrela marca o checkpoint especial (30 de dano); se ele sair da lista, outro é escolhido.',
    game.type === 'bomb_defusal' && 'Marque os 2 checkpoints-bomba: o primeiro da lista é o local A e o segundo é o B; só eles valem como bomba.',
    game.type === 'hostage_rescue' && 'Marque os checkpoints da sequência do resgate (mínimo 2): o refém percorre todos na ordem do id e o último é o destino.',
    game.type === 'zone_domination' && 'A equipe que dominar todos os checkpoints marcados vence.',
  ].filter(Boolean).join(' ');

  const filtros: Array<{ id: Filtro; rotulo: string }> = [
    { id: 'todos', rotulo: 'Todos' },
    { id: 'selecionados', rotulo: 'No jogo' },
    { id: 'online', rotulo: 'Online' },
    { id: 'offline', rotulo: 'Offline' },
  ];

  return (
    <Card className="!p-0 overflow-hidden">
      <div className="border-b border-white/[0.08] bg-gradient-to-r from-primary/10 to-transparent p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-secondary"><MapPin size={22} /></span>
            <div className="min-w-0">
              <h3 className="truncate font-display text-xl text-white">{game.name}</h3>
              <p className="text-xs text-gray-500">Checkpoints do jogo</p>
            </div>
            {running && <Badge variant="success">Partida em andamento</Badge>}
          </div>
          <div className="flex items-center gap-4 text-right">
            <div>
              <p className="font-display text-2xl leading-none text-white">{selected.size}</p>
              <p className="mt-1 text-[11px] uppercase tracking-wider text-gray-500">no jogo</p>
            </div>
            <div>
              <p className={`font-display text-2xl leading-none ${selectedOnline < selected.size ? 'text-warning' : 'text-success'}`}>{selectedOnline}</p>
              <p className="mt-1 text-[11px] uppercase tracking-wider text-gray-500">online</p>
            </div>
          </div>
        </div>
        <p className="mt-3 text-sm text-gray-400">{dica}</p>
      </div>

      <div className="p-5">
        {eventCheckpoints.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">Este evento ainda não tem checkpoints cadastrados.</p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="relative min-w-[200px] flex-1">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true" />
                <input
                  type="search"
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  placeholder="Buscar por nome, zona ou código"
                  aria-label="Buscar checkpoint"
                  className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-white placeholder:text-gray-600 focus:border-primary focus:outline-none"
                />
              </div>
              <div className="flex gap-2 text-xs">
                <button type="button" onClick={selecionarOnline} className="rounded-lg border border-white/10 px-3 py-2 text-gray-300 transition-colors hover:border-primary/50 hover:text-white">
                  Marcar todos online
                </button>
                <button type="button" onClick={limparSelecao} disabled={selected.size === 0} className="rounded-lg border border-white/10 px-3 py-2 text-gray-300 transition-colors hover:border-danger/50 hover:text-white disabled:opacity-40">
                  Limpar
                </button>
              </div>
            </div>

            <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Filtrar checkpoints">
              {filtros.map(item => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={filtro === item.id}
                  onClick={() => setFiltro(item.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${filtro === item.id ? 'border-primary bg-primary/15 text-primary-300' : 'border-white/10 text-gray-400 hover:text-white'}`}
                >
                  {item.rotulo} <span className="ml-1 text-gray-500">{contagens[item.id]}</span>
                </button>
              ))}
            </div>

            {visiveis.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">Nenhum checkpoint com esse filtro.</p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {visiveis.map(checkpoint => {
                  const id = String(checkpoint.id);
                  const checked = selected.has(id);
                  const online = isOnline(checkpoint);
                  const etapa = stepLabel(id);
                  return (
                    <li
                      key={id}
                      className={`relative flex items-center gap-3 rounded-xl border p-3 transition-all ${checked ? 'border-primary/60 bg-primary/10 shadow-[0_4px_18px_rgba(30,155,215,0.12)]' : 'border-white/10 bg-white/[0.02] hover:border-white/25'}`}
                    >
                      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                        <input type="checkbox" checked={checked} onChange={() => toggle(id)} className="peer sr-only" />
                        <span
                          aria-hidden="true"
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary/60 ${checked ? 'border-primary bg-primary text-white' : 'border-gray-600 text-transparent'}`}
                        >
                          <Check size={14} strokeWidth={3} />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-white">{checkpoint.name}</span>
                          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                            <span className={`h-2 w-2 shrink-0 rounded-full ${online ? 'bg-success' : 'bg-gray-500'}`} aria-hidden="true" />
                            <span className="truncate">{online ? 'online' : 'offline'}{checkpoint.zone ? ` · ${checkpoint.zone}` : ''}</span>
                          </span>
                          {etapa && (
                            <span className="mt-1 inline-block rounded-full bg-accent/20 px-2 py-0.5 text-[11px] font-bold text-accent">{etapa}</span>
                          )}
                        </span>
                      </label>
                      {isMonster && checked && (
                        <button
                          type="button"
                          onClick={() => { setNotice(''); setSpecial(special === id ? '' : id); }}
                          aria-pressed={special === id}
                          title={special === id ? 'Checkpoint especial' : 'Marcar como checkpoint especial'}
                          className={`rounded p-1 transition-colors ${special === id ? 'text-accent' : 'text-gray-600 hover:text-gray-300'}`}
                        >
                          <Star size={18} fill={special === id ? 'currentColor' : 'none'} />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}

        {error && <p role="alert" className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        {notice && <p role="status" className="mt-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">{notice}</p>}
      </div>

      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] bg-dark-card/95 px-5 py-3 backdrop-blur">
        <span className="text-xs text-gray-500" aria-live="polite">
          {selected.size < minimum
            ? `Marque pelo menos ${minimum} checkpoint${minimum > 1 ? 's' : ''}.`
            : dirty ? 'Você tem alterações não salvas.' : 'Tudo salvo.'}
        </span>
        <div className="flex gap-2">
          {dirty && (
            <Button variant="ghost" onClick={desfazer} disabled={saving}>
              <Undo2 size={16} className="mr-1.5" />Desfazer
            </Button>
          )}
          <Button variant="primary" onClick={save} disabled={!dirty || selected.size < minimum || saving}>
            {saving ? <Loader2 size={16} className="mr-1.5 animate-spin" /> : <Save size={16} className="mr-1.5" />}
            Salvar checkpoints
          </Button>
        </div>
      </div>
    </Card>
  );
}
