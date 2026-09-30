// Máscara, interpretação e lista de horários para o TimeInput (formato 24h, HH:MM).

const pad = (n: number) => String(n).padStart(2, '0');

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

// Horários do dia de `stepMinutes` em `stepMinutes` (00:00, 00:15, ...).
export function buildTimeOptions(stepMinutes = 15): string[] {
  const step = Math.max(1, Math.floor(stepMinutes));
  const options: string[] = [];
  for (let minutes = 0; minutes < 24 * 60; minutes += step) {
    options.push(`${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`);
  }
  return options;
}

const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

// Índice do horário da lista mais perto de `time` (o primeiro à frente em caso de empate).
export function nearestOptionIndex(options: string[], time: string | null): number {
  if (!time || options.length === 0) return -1;
  const target = toMinutes(time);
  let best = 0;
  let bestDistance = Infinity;
  options.forEach((option, index) => {
    const distance = Math.abs(toMinutes(option) - target);
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });
  return best;
}
