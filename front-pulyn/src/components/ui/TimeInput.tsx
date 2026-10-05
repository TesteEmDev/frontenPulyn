import { useEffect, useId, useRef, useState } from 'react';
import { Clock } from 'lucide-react';
import { HOURS, MINUTES, joinTime, maskTime, parseTime, shiftTime, splitTime } from '../../utils/time';

interface TimeInputProps {
  label?: string;
  // 'HH:MM' (24h) ou '' quando vazio/incompleto.
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  className?: string;
}

const ITEM_HEIGHT = 32;

// O que o campo informa ao formulário para um texto: só o horário completo (4 dígitos) e válido.
const emittedValue = (text: string) =>
  text.replace(/\D/g, '').length === 4 ? (parseTime(text) ?? '') : '';

// Campo de horário em 24h, com qualquer minuto:
//  - digitar: 1530, 15:30, 15h30, 9 (vira 09:00)
//  - escolher: painel com a coluna das horas (00-23) e a dos minutos (00-59)
//  - teclado: setas ajustam 1 minuto, PageUp/PageDown 1 hora
// Substitui o <input type="time"> do navegador, que separa hora e minuto em
// campos difíceis de acertar.
export default function TimeInput({
  label,
  value,
  onChange,
  disabled,
  required,
  error,
  className = '',
}: TimeInputProps) {
  const inputId = useId();
  const panelId = `${inputId}-panel`;

  const [text, setText] = useState(value);
  const [open, setOpen] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const hoursRef = useRef<HTMLDivElement>(null);
  const minutesRef = useRef<HTMLDivElement>(null);

  // Valor trocado de fora (ex.: formulário preenchido): acompanha, sem mexer no
  // que está sendo digitado (comparando com o que o próprio campo emitiria).
  useEffect(() => {
    if (value !== emittedValue(text)) {
      setText(value);
      setInvalid(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const current = splitTime(parseTime(text) ?? (value || null));

  const scrollTo = (column: HTMLDivElement | null, index: number, smooth = false) => {
    if (!column) return;
    const top = Math.max(0, index * ITEM_HEIGHT - (column.clientHeight - ITEM_HEIGHT) / 2);
    if (smooth && typeof column.scrollTo === 'function') column.scrollTo({ top, behavior: 'smooth' });
    else column.scrollTop = top;
  };

  // Ao abrir, centraliza a hora e o minuto atuais nas duas colunas.
  useEffect(() => {
    if (!open) return;
    scrollTo(hoursRef.current, current?.hour ?? 8);
    scrollTo(minutesRef.current, current?.minute ?? 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const commit = (time: string) => {
    setText(time);
    setInvalid(false);
    onChange(time);
  };

  const pickHour = (hour: number) => {
    // Escolher a hora mantém os minutos que já estavam (ou 00) e deixa o painel aberto para os minutos.
    commit(joinTime(hour, current?.minute ?? 0));
    scrollTo(minutesRef.current, current?.minute ?? 0, true);
  };

  const pickMinute = (minute: number) => {
    const hour = current?.hour ?? new Date().getHours();
    commit(joinTime(hour, minute));
    scrollTo(hoursRef.current, hour, true);
    setOpen(false);
  };

  const handleChange = (raw: string) => {
    const masked = maskTime(raw);
    setText(masked);
    setInvalid(false);
    onChange(emittedValue(masked));
    if (!open) setOpen(true);
  };

  const handleBlur = () => {
    setOpen(false);
    if (text.trim() === '') {
      setInvalid(false);
      onChange('');
      return;
    }
    const parsed = parseTime(text);
    if (parsed) {
      commit(parsed);
    } else {
      setInvalid(true);
      onChange('');
    }
  };

  const nudge = (deltaMinutes: number) => {
    const next = shiftTime(parseTime(text) ?? (value || null), deltaMinutes);
    commit(next);
    const parts = splitTime(next);
    if (parts && open) {
      scrollTo(hoursRef.current, parts.hour, true);
      scrollTo(minutesRef.current, parts.minute, true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      nudge(e.key === 'ArrowUp' ? 1 : -1);
    } else if (e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      nudge(e.key === 'PageUp' ? 60 : -60);
    } else if (e.key === 'Enter') {
      if (open) {
        e.preventDefault();
        handleBlur();
      }
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
      }
    }
  };

  const showError = error || (invalid ? 'Horário inválido. Use HH:MM, de 00:00 a 23:59.' : '');

  const column = (
    name: 'Horas' | 'Minutos',
    items: string[],
    selected: number | undefined,
    onPick: (n: number) => void,
    ref: React.RefObject<HTMLDivElement>,
  ) => (
    <div className="flex min-w-0 flex-1 flex-col">
      <p className="px-2 pb-1 pt-2 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-500">{name}</p>
      <div ref={ref} role="listbox" aria-label={name} className="h-48 overflow-y-auto px-1 pb-1">
        {items.map((item, index) => {
          const isSelected = selected === index;
          return (
            <button
              key={item}
              type="button"
              role="option"
              aria-selected={isSelected}
              tabIndex={-1}
              onClick={() => onPick(index)}
              style={{ height: ITEM_HEIGHT }}
              className={`flex w-full items-center justify-center rounded-lg text-sm tabular-nums transition-colors ${
                isSelected
                  ? 'bg-primary/25 font-semibold text-primary'
                  : 'text-gray-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              {item}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className={`relative w-full ${className}`}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-body font-semibold text-gray-300">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="00:00"
          maxLength={5}
          role="combobox"
          aria-expanded={open}
          aria-controls={panelId}
          aria-haspopup="dialog"
          aria-invalid={showError ? true : undefined}
          aria-required={required}
          disabled={disabled}
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => !disabled && setOpen(true)}
          onClick={() => !disabled && setOpen(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`
            input-dark w-full rounded-xl border bg-dark-card px-3.5 py-3 pr-10
            font-body text-white placeholder-gray-500 tabular-nums transition-all duration-200
            focus:outline-none focus:ring-2
            disabled:cursor-not-allowed disabled:opacity-50
            ${showError
              ? 'border-danger-400 focus:border-danger-400 focus:ring-danger-500/20'
              : 'border-white/[0.10] focus:border-primary-400 focus:ring-primary-500/15'}
          `}
        />
        <Clock size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />

        {open && (
          <div
            id={panelId}
            role="dialog"
            aria-label="Escolher horário"
            // mousedown no painel não pode tirar o foco do campo (senão o blur fecha o painel antes do clique)
            onMouseDown={(e) => e.preventDefault()}
            className="absolute left-0 z-50 mt-1 w-full min-w-[11rem] rounded-xl border border-white/10 bg-dark-card shadow-xl"
          >
            <div className="flex divide-x divide-white/10">
              {column('Horas', HOURS, current?.hour, pickHour, hoursRef)}
              {column('Minutos', MINUTES, current?.minute, pickMinute, minutesRef)}
            </div>
            <div className="flex items-center justify-between border-t border-white/10 px-3 py-2">
              <span className="text-xs tabular-nums text-gray-400">{current ? joinTime(current.hour, current.minute) : '--:--'}</span>
              <button
                type="button"
                onClick={() => { setOpen(false); handleBlur(); }}
                className="rounded-lg bg-primary/20 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/30"
              >
                OK
              </button>
            </div>
          </div>
        )}
      </div>
      {showError && (
        <p role="alert" className="mt-1 text-xs text-danger-400">{showError}</p>
      )}
    </div>
  );
}
