import { useCallback, useEffect, useRef, useState } from 'react';
import { Monitor, Check, X, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import { usePulynStore } from '../../store/mockData';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Select from '../ui/Select';

interface PanelEvent {
  eventoId: string;
  nome: string;
  data?: string;
  status?: string;
}

const CLOSED_STATUSES = ['completed', 'cancelled', 'canceled', 'finished'];
const isOpenEvent = (event: PanelEvent) => !CLOSED_STATUSES.includes(String(event.status || '').trim().toLowerCase());
const isRunning = (event: PanelEvent) => ['active', 'ongoing'].includes(String(event.status || '').trim().toLowerCase());

const statusLabel = (event: PanelEvent) => (isRunning(event) ? 'Em andamento' : 'Agendado');

// A data do evento vem como data pura (sem hora): formata em UTC para não voltar um dia
const formatDay = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

// Onde a recepção escolhe QUAL evento aparece no telão (/display) e nos terminais do Game Master.
// A escolha é gravada no servidor (é isso que o telão consulta); só mudar a tela da recepção não basta.
export default function ActiveEventPanel({ onChange }: { onChange?: (eventId: string | null) => void }) {
  const { eventoAtualId, setEventoAtual } = usePulynStore();
  const [events, setEvents] = useState<PanelEvent[]>([]);
  const [current, setCurrent] = useState<PanelEvent | null>(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const openEvents = events
    .filter(isOpenEvent)
    .sort((a, b) => Number(isRunning(b)) - Number(isRunning(a)) || String(a.data || '').localeCompare(String(b.data || '')));

  // Evento sugerido quando nada está no telão: o que está em andamento, ou o único aberto
  const suggestionFor = (list: PanelEvent[]) => {
    const open = list.filter(isOpenEvent);
    return open.find(isRunning)?.eventoId || (open.length === 1 ? open[0].eventoId : '');
  };

  const load = useCallback(async () => {
    try {
      const [eventsData, control] = await Promise.all([
        api.getEventos(),
        api.getActiveEventControl().catch(() => ({ event: null })),
      ]);
      const list: PanelEvent[] = Array.isArray(eventsData) ? eventsData : [];
      setEvents(list);
      const active = control?.event ? { ...(list.find((event) => String(event.eventoId) === String(control.event.id)) || {}), ...control.event } : null;
      setCurrent(active);
      setDraft(active?.id || suggestionFor(list));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os eventos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Outro terminal mudou o evento (o aviso chega pelo canal em tempo real e atualiza o evento da loja)
  useEffect(() => {
    if (loading) return;
    if ((eventoAtualId || null) !== (current?.eventoId || null)) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventoAtualId]);

  // Quem usa o painel fica sabendo do evento que está no telão
  useEffect(() => {
    if (!loading) onChangeRef.current?.(current?.eventoId || null);
  }, [current?.eventoId, loading]);

  const publish = async (eventId: string | null) => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const result = await api.setActiveEventControl(eventId);
      const chosen = result?.event ? { ...(events.find((event) => String(event.eventoId) === String(result.event.id)) || {}), ...result.event } : null;
      setCurrent(chosen);
      setEventoAtual(chosen?.id || null);
      setDraft(chosen?.id || suggestionFor(events));
      setNotice(chosen ? `O telão agora mostra "${chosen.name}".` : 'Nenhum evento no telão: ele volta a aguardar a recepção.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível atualizar o telão');
    } finally {
      setSaving(false);
    }
  };

  const unchanged = Boolean(draft) && draft === current?.eventoId;

  return (
    <Card variant={current ? 'glow' : 'default'}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-primary-400/20 bg-primary-500/10 p-2 text-primary-300"><Monitor size={22} /></div>
          <div>
            <h2 className="font-display text-lg text-white">Evento no telão</h2>
            <p className="text-xs text-gray-400">
              O evento escolhido aqui é o que aparece no telão (/display) e nos terminais do Game Master.
            </p>
          </div>
        </div>
        {!loading && (
          current
            ? <Badge variant="success">No ar</Badge>
            : <Badge variant="warning">Telão aguardando</Badge>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-gray-400"><Loader2 size={16} className="animate-spin" /> Carregando eventos…</div>
      ) : (
        <div className="space-y-4">
          <div className={`rounded-lg border px-4 py-3 text-sm ${current ? 'border-success/30 bg-success/10' : 'border-warning/30 bg-warning/10'}`} aria-live="polite">
            {current ? (
              <p className="text-gray-200">
                No telão agora: <span className="font-semibold text-white">{current.nome}</span>
                {current.data ? <span className="text-gray-400"> · {formatDay(current.data)}</span> : null}
                {current.status ? <span className="text-gray-400"> · {statusLabel(current)}</span> : null}
              </p>
            ) : (
              <p className="text-warning">Nenhum evento selecionado: o telão está esperando a recepção escolher um evento.</p>
            )}
          </div>

          {openEvents.length === 0 ? (
            <p className="text-sm text-gray-500">Não há eventos abertos. Crie ou agende um evento no painel do administrador.</p>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Select
                  label="Escolher o evento do telão"
                  value={draft}
                  onChange={(event) => { setDraft(event.target.value); setNotice(null); setError(null); }}
                  options={[
                    { value: '', label: 'Selecione um evento' },
                    ...openEvents.map((event) => ({
                      value: String(event.eventoId),
                      label: `${event.nome} · ${formatDay(event.data)} · ${statusLabel(event)}`,
                    })),
                  ]}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="primary" onClick={() => publish(draft)} disabled={!draft || unchanged || saving}>
                  {saving ? <Loader2 size={16} className="mr-1.5 animate-spin" /> : <Check size={16} className="mr-1.5" />}
                  Exibir no telão
                </Button>
                {current && (
                  <Button variant="ghost" onClick={() => publish(null)} disabled={saving} title="Tira o evento do telão">
                    <X size={16} className="mr-1.5" />
                    Limpar
                  </Button>
                )}
              </div>
            </div>
          )}

          {notice && <p className="text-sm text-success" role="status">✓ {notice}</p>}
          {error && (
            <p className="flex items-center gap-1.5 text-sm text-danger" role="alert">
              <AlertCircle size={15} /> {error}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
