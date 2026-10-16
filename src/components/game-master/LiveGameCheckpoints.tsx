import { useEffect, useMemo, useState } from 'react';
import { MapPin, Save, Loader2, Star } from 'lucide-react';
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

  // Volta ao que está salvo ao trocar de jogo ou quando a lista salva muda (por exemplo, após salvar).
  useEffect(() => {
    setSelected(new Set(savedIds));
    setSpecial(savedSpecial ? String(savedSpecial) : '');
  }, [game.id, savedIds, savedSpecial]);

  if (!supported) return null;

  const nameOf = (id: string) => eventCheckpoints.find(cp => String(cp.id) === String(id))?.name || id;
  const specialChanged = isMonster && special !== (savedSpecial ? String(savedSpecial) : '');
  const dirty = !sameSet(selected, savedIds) || specialChanged;
  const selectedOnline = eventCheckpoints.filter(cp => selected.has(String(cp.id)) && String(cp.status).toLowerCase() === 'online').length;

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

  return (
    <Card className="mb-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MapPin size={20} className="text-secondary" />
          <h3 className="font-display text-lg text-white">Checkpoints do jogo</h3>
          {running && <Badge variant="success">Partida em andamento</Badge>}
        </div>
        <span className="text-xs text-gray-500">{selected.size} selecionado{selected.size !== 1 ? 's' : ''} · {selectedOnline} online</span>
      </div>

      <p className="mb-4 text-sm text-gray-400">
        {isPaintball
          ? 'Escolha quais checkpoints fazem parte deste jogo. A mudança vale a partir da próxima partida; a que já está em andamento continua como começou.'
          : running
            ? 'Marque ou desmarque os checkpoints e salve: a mudança vale na hora, sem reiniciar a partida.'
            : 'Escolha quais checkpoints fazem parte deste jogo.'}
        {game.type === 'treasure_hunt' && ' Se o alvo atual sair da lista, um novo alvo é sorteado.'}
        {isMonster && ' A estrela marca o checkpoint especial (30 de dano); se ele sair da lista, outro é escolhido.'}
        {game.type === 'bomb_defusal' && ' Marque os 2 checkpoints-bomba: o primeiro da lista é o local A e o segundo é o B; só eles valem como bomba.'}
        {game.type === 'hostage_rescue' && ' Marque os checkpoints da sequência do resgate (mínimo 2): o refém percorre todos na ordem do id e o último é o destino.'}
        {game.type === 'zone_domination' && ' A equipe que dominar todos os checkpoints marcados vence.'}
      </p>

      {eventCheckpoints.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-500">Este evento ainda não tem checkpoints cadastrados.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {eventCheckpoints.map(checkpoint => {
            const id = String(checkpoint.id);
            const checked = selected.has(id);
            const online = String(checkpoint.status).toLowerCase() === 'online';
            return (
              <li
                key={id}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${checked ? 'border-primary/50 bg-primary/10' : 'border-white/10'}`}
              >
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                  <input type="checkbox" checked={checked} onChange={() => toggle(id)} className="h-4 w-4 shrink-0 accent-primary" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-white">
                      {checkpoint.name}
                      {stepLabel(id) && (
                        <span className="ml-2 rounded-full bg-accent/20 px-2 py-0.5 text-xs font-bold text-accent">{stepLabel(id)}</span>
                      )}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-gray-500">
                      <span className={`h-2 w-2 rounded-full ${online ? 'bg-success' : 'bg-gray-500'}`} aria-hidden="true" />
                      {online ? 'online' : 'offline'}{checkpoint.zone ? ` · ${checkpoint.zone}` : ''}
                    </span>
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

      {error && <p role="alert" className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      {notice && <p role="status" className="mt-3 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">{notice}</p>}

      <div className="mt-4 flex justify-end gap-2">
        {dirty && (
          <Button variant="ghost" onClick={() => { setSelected(new Set(savedIds)); setSpecial(savedSpecial ? String(savedSpecial) : ''); setError(''); }} disabled={saving}>
            Desfazer
          </Button>
        )}
        <Button variant="primary" onClick={save} disabled={!dirty || selected.size < minimum || saving}>
          {saving ? <Loader2 size={16} className="mr-1.5 animate-spin" /> : <Save size={16} className="mr-1.5" />}
          Salvar checkpoints
        </Button>
      </div>
    </Card>
  );
}
