// Máscara, interpretação e ajuste de horários para o TimeInput (formato 24h, HH:MM).

const pad = (n: number) => String(n).padStart(2, '0');

export const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
export const MINUTES = Array.from({ length: 60 }, (_, i) => pad(i));

// Formata enquanto digita: só números, no máximo 4, com ":" depois do 2º dígito.
export function maskTime(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
}

// Interpreta o que foi digitado e devolve 'HH:MM', ou null se não for um horário válido.
//   "9" -> 09:00   "15" -> 15:00   "930" -> 09:30   "1530" / "15:30" / "15h30" -> 15:30
export function parseTime(text: string): string | null {
  const digits = text.replace(/\D/g, '');
  let hours: number;
  let minutes: number;

  if (digits.length === 1 || digits.length === 2) {
    hours = Number(digits);
    minutes = 0;
  } else if (digits.length === 3) {
    hours = Number(digits.slice(0, 1));
    minutes = Number(digits.slice(1));
  } else if (digits.length === 4) {
    hours = Number(digits.slice(0, 2));
    minutes = Number(digits.slice(2));
  } else {
    return null;
  }

  if (hours > 23 || minutes > 59) return null;
  return `${pad(hours)}:${pad(minutes)}`;
}

// 'HH:MM' -> { hour, minute } (null se não for um horário completo e válido).
export function splitTime(time: string | null | undefined): { hour: number; minute: number } | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time || '');
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour <= 23 && minute <= 59 ? { hour, minute } : null;
}

export function joinTime(hour: number, minute: number): string {
  return `${pad(hour)}:${pad(minute)}`;
}

// Soma (ou subtrai) minutos a um horário, sem passar de 00:00 nem de 23:59.
export function shiftTime(time: string | null | undefined, deltaMinutes: number, fallback = '12:00'): string {
  const base = splitTime(time) ?? splitTime(fallback) ?? { hour: 12, minute: 0 };
  const total = Math.min(24 * 60 - 1, Math.max(0, base.hour * 60 + base.minute + deltaMinutes));
  return joinTime(Math.floor(total / 60), total % 60);
}
