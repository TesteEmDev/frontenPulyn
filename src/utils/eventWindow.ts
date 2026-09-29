// Janela em que o evento esteve ativo, e o engajamento por hora dentro dela.

export interface EventWindowSource {
  status?: string | null;
  date?: string | null;
  time?: string | null;
  duration?: number | null;
  started_at?: string | null;
  ended_at?: string | null;
}

export interface EventWindow {
  start: Date;
  end: Date;
  // 'lifecycle': início/fim reais do evento. 'readings': evento antigo sem
  // início/fim registrados, então usa do primeiro ao último ponto registrado.
  source: 'lifecycle' | 'readings';
  ongoing: boolean;
}

export interface TimeBucket {
  // Início do intervalo (rótulo do eixo) e a faixa completa (dica ao passar o mouse).
  hora: string;
  faixa: string;
  pontuacoes: number;
}

const MINUTE_MS = 60000;
const MAX_BUCKETS = 72;
// Até 3 horas de evento: intervalos de 10 min (1h = 6 pontos, 3h = 18).
// Acima de 3 horas: intervalos de 30 min, para o gráfico não ficar apertado.
const LONG_EVENT_MINUTES = 180;
const SHORT_BUCKET_MINUTES = 10;
const LONG_BUCKET_MINUTES = 30;

type Lifecycle = 'scheduled' | 'active' | 'finished';

function toLifecycle(status?: string | null): Lifecycle {
  const value = String(status || 'scheduled').toLowerCase();
  if (value === 'active' || value === 'ongoing') return 'active';
  if (['finished', 'completed', 'cancelled', 'canceled'].includes(value)) return 'finished';
  return 'scheduled';
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Data + horário agendados, no relógio local do navegador (o mesmo do buffet).
function scheduledStart(event: EventWindowSource): Date | null {
  const day = String(event.date || '').split('T')[0];
  const time = String(event.time || '').slice(0, 5);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^\d{2}:\d{2}$/.test(time)) return null;
  return parseDate(`${day}T${time}:00`);
}

export function getEventActiveWindow(
  event: EventWindowSource | null | undefined,
  timestamps: Date[] = [],
  now: Date = new Date(),
): EventWindow | null {
  if (!event) return null;
  const valid = timestamps.filter((t) => !Number.isNaN(t.getTime())).sort((a, b) => a.getTime() - b.getTime());
  const first = valid[0] || null;
  const last = valid[valid.length - 1] || null;
  const lifecycle = toLifecycle(event.status);
  const planned = scheduledStart(event);
  const plannedEnd = planned && Number(event.duration) > 0
    ? new Date(planned.getTime() + Number(event.duration) * 60000)
    : null;

  if (lifecycle === 'active') {
    const start = parseDate(event.started_at) || planned || first;
    if (!start) return null;
    return { start, end: now.getTime() < start.getTime() ? start : now, source: 'lifecycle', ongoing: true };
  }

  if (lifecycle === 'finished') {
    const start = parseDate(event.started_at) || planned || first;
    const end = parseDate(event.ended_at) || plannedEnd || last;
    if (!start || !end || end.getTime() < start.getTime()) return null;
    return { start, end, source: 'lifecycle', ongoing: false };
  }

  // Agendado e nunca iniciado: se já há pontuações (eventos anteriores ao
  // controle de início/fim), usa o intervalo em que elas aconteceram.
  if (first && last) return { start: first, end: last, source: 'readings', ongoing: false };
  return null;
}

const pad = (n: number) => String(n).padStart(2, '0');

// Tamanho do intervalo pela duração do evento (configurada); sem duração, pelo
// tamanho da janela. Não depende de quanto já passou, então não muda no meio do evento.
export function getBucketMinutes(eventDurationMinutes: number | null | undefined, window: EventWindow): number {
  const configured = Number(eventDurationMinutes);
  const minutes = configured > 0
    ? configured
    : (window.end.getTime() - window.start.getTime()) / MINUTE_MS;
  return minutes > LONG_EVENT_MINUTES ? LONG_BUCKET_MINUTES : SHORT_BUCKET_MINUTES;
}

// Intervalos iguais contados a partir do início da janela, só até o fim dela.
export function buildTimeBuckets(window: EventWindow, timestamps: Date[], bucketMinutes: number): TimeBucket[] {
  const sizeMs = bucketMinutes * MINUTE_MS;
  const startMs = window.start.getTime();
  const spanMs = Math.max(0, window.end.getTime() - startMs);
  const total = Math.min(MAX_BUCKETS, Math.max(1, Math.ceil(spanMs / sizeMs)));
  const spansDays = window.start.toDateString() !== window.end.toDateString();

  const clock = (ms: number, withDay: boolean) => {
    const d = new Date(ms);
    const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    return withDay ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${time}` : time;
  };

  const buckets: TimeBucket[] = [];
  for (let i = 0; i < total; i += 1) {
    const from = startMs + i * sizeMs;
    const to = Math.min(from + sizeMs, Math.max(window.end.getTime(), from));
    buckets.push({
      hora: clock(from, spansDays),
      faixa: `${clock(from, spansDays)} – ${clock(to, false)}`,
      pontuacoes: 0,
    });
  }

  for (const t of timestamps) {
    const ms = t.getTime();
    if (Number.isNaN(ms) || ms < startMs || ms > window.end.getTime()) continue;
    let index = Math.floor((ms - startMs) / sizeMs);
    // O instante exato do fim pertence ao último intervalo; além do limite de
    // barras (evento muito longo), o que não cabe é descartado.
    if (index === total && ms === window.end.getTime()) index = total - 1;
    if (index >= total) continue;
    buckets[index].pontuacoes += 1;
  }
  return buckets;
}

export function formatClock(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
