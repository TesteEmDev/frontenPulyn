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

export interface HourBucket {
  hora: string;
  pontuacoes: number;
}

const HOUR_MS = 3600000;
const MAX_BUCKETS = 72;

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

// Uma barra por hora cheia entre o início e o fim da janela (e só elas).
export function buildHourlyBuckets(window: EventWindow, timestamps: Date[]): HourBucket[] {
  const firstHour = new Date(window.start);
  firstHour.setMinutes(0, 0, 0);

  const startMs = firstHour.getTime();
  const totalHours = Math.min(MAX_BUCKETS, Math.floor((window.end.getTime() - startMs) / HOUR_MS) + 1);
  const spansDays = window.start.toDateString() !== window.end.toDateString();

  const buckets: HourBucket[] = [];
  for (let i = 0; i < totalHours; i += 1) {
    const hour = new Date(startMs + i * HOUR_MS);
    const label = `${pad(hour.getHours())}:00`;
    buckets.push({ hora: spansDays ? `${pad(hour.getDate())}/${pad(hour.getMonth() + 1)} ${label}` : label, pontuacoes: 0 });
  }

  for (const t of timestamps) {
    const ms = t.getTime();
    if (Number.isNaN(ms) || ms < window.start.getTime() || ms > window.end.getTime()) continue;
    const index = Math.floor((ms - startMs) / HOUR_MS);
    if (index >= 0 && index < buckets.length) buckets[index].pontuacoes += 1;
  }
  return buckets;
}

export function formatClock(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
