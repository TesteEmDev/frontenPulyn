// Janela em que o evento esteve ativo, e o engajamento por hora dentro dela.

export interface EventWindowSource {
  status?: string | null;
  data?: string | null;
  hora?: string | null;
  duracao?: number | null;
  iniciadoEm?: string | null;
  finalizadoEm?: string | null;
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
  // null = intervalo que ainda não chegou (evento em andamento): sem ponto no gráfico.
  pontuacoes: number | null;
}

const MINUTE_MS = 60000;
const MAX_BUCKETS = 72;
// O gráfico tem de 5 a 10 pontos (para eventos com pelo menos 5 minutos).
const MIN_POINTS = 5;
const MAX_POINTS = 10;
const TARGET_POINTS = 8;
// Intervalos possíveis, em minutos. Só valores fáceis de ler no eixo.
const NICE_BUCKET_MINUTES = [1, 2, 3, 5, 10, 15, 20, 30, 60, 120, 180, 240, 360, 480, 720, 1440];

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
  const day = String(event.data || '').split('T')[0];
  const time = String(event.hora || '').slice(0, 5);
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
  const plannedEnd = planned && Number(event.duracao) > 0
    ? new Date(planned.getTime() + Number(event.duracao) * 60000)
    : null;

  if (lifecycle === 'active') {
    const start = parseDate(event.iniciadoEm) || planned || first;
    if (!start) return null;
    return { start, end: now.getTime() < start.getTime() ? start : now, source: 'lifecycle', ongoing: true };
  }

  if (lifecycle === 'finished') {
    const start = parseDate(event.iniciadoEm) || planned || first;
    const end = parseDate(event.finalizadoEm) || plannedEnd || last;
    if (!start || !end || end.getTime() < start.getTime()) return null;
    return { start, end, source: 'lifecycle', ongoing: false };
  }

  // Agendado e nunca iniciado: se já há pontuações (eventos anteriores ao
  // controle de início/fim), usa o intervalo em que elas aconteceram.
  if (first && last) return { start: first, end: last, source: 'readings', ongoing: false };
  return null;
}

const pad = (n: number) => String(n).padStart(2, '0');

// Escolhe o intervalo para o gráfico ficar com 5 a 10 pontos: entre os
// intervalos "redondos" que dão de 5 a 10 pontos, o que chega mais perto de 8
// (em empate, o maior, que é mais fácil de ler). Como um tamanho da lista é no
// máximo o dobro do anterior, sempre existe um assim para eventos de 5 min ou
// mais; abaixo disso o menor intervalo (1 min) dá menos de 5 pontos.
export function pickBucketMinutes(basisMinutes: number): number {
  const basis = Math.max(1, Number.isFinite(basisMinutes) ? basisMinutes : 1);
  let best: number | null = null;
  let bestDistance = Infinity;
  for (const size of NICE_BUCKET_MINUTES) {
    const count = Math.ceil(basis / size);
    if (count < MIN_POINTS || count > MAX_POINTS) continue;
    const distance = Math.abs(count - TARGET_POINTS);
    if (distance < bestDistance || (distance === bestDistance && best !== null && size > best)) {
      best = size;
      bestDistance = distance;
    }
  }
  if (best !== null) return best;
  return basis < MIN_POINTS ? NICE_BUCKET_MINUTES[0] : NICE_BUCKET_MINUTES[NICE_BUCKET_MINUTES.length - 1];
}

// Base do cálculo: evento em andamento usa a duração configurada (assim o
// intervalo não muda no meio do evento); evento encerrado usa o tempo em que
// realmente esteve ativo (um evento encerrado antes da hora continua com 5 a 10 pontos).
export function getBucketMinutes(eventDurationMinutes: number | null | undefined, window: EventWindow): number {
  const spanMinutes = (window.end.getTime() - window.start.getTime()) / MINUTE_MS;
  const configured = Number(eventDurationMinutes);
  const basis = window.ongoing && configured > 0 ? configured : spanMinutes;
  return pickBucketMinutes(basis);
}

// Intervalos iguais contados a partir do início da janela. Em evento em
// andamento, `plannedEnd` (início + duração) estende o eixo até o fim previsto:
// os intervalos que ainda não chegaram ficam vazios (pontuacoes = null, sem ponto).
export function buildTimeBuckets(
  window: EventWindow,
  timestamps: Date[],
  bucketMinutes: number,
  plannedEnd?: Date | null,
): TimeBucket[] {
  const sizeMs = bucketMinutes * MINUTE_MS;
  const startMs = window.start.getTime();
  const endMs = window.end.getTime();
  const axisEndMs = plannedEnd && plannedEnd.getTime() > endMs ? plannedEnd.getTime() : endMs;
  const spanMs = Math.max(0, axisEndMs - startMs);
  const total = Math.min(MAX_BUCKETS, Math.max(1, Math.ceil(spanMs / sizeMs)));
  const spansDays = window.start.toDateString() !== new Date(axisEndMs).toDateString();

  const clock = (ms: number, withDay: boolean) => {
    const d = new Date(ms);
    const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    return withDay ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${time}` : time;
  };

  const buckets: TimeBucket[] = [];
  for (let i = 0; i < total; i += 1) {
    const from = startMs + i * sizeMs;
    const to = Math.min(from + sizeMs, Math.max(axisEndMs, from));
    buckets.push({
      hora: clock(from, spansDays),
      faixa: `${clock(from, spansDays)} – ${clock(to, false)}`,
      pontuacoes: from > endMs ? null : 0,
    });
  }

  for (const t of timestamps) {
    const ms = t.getTime();
    if (Number.isNaN(ms) || ms < startMs || ms > endMs) continue;
    let index = Math.floor((ms - startMs) / sizeMs);
    // O instante exato do fim pertence ao último intervalo; além do limite de
    // barras (evento muito longo), o que não cabe é descartado.
    if (index === total && ms === endMs) index = total - 1;
    if (index >= total) continue;
    buckets[index].pontuacoes = (buckets[index].pontuacoes ?? 0) + 1;
  }
  return buckets;
}

export function formatClock(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
