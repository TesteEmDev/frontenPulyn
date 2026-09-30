import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Clock } from 'lucide-react';
import { buildTimeOptions, maskTime, nearestOptionIndex, parseTime } from '../../utils/time';

interface TimeInputProps {
  label?: string;
  // 'HH:MM' (24h) ou '' quando vazio/incompleto.
  value: string;
  onChange: (value: string) => void;
  // Intervalo, em minutos, dos horários sugeridos na lista.
  step?: number;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  className?: string;
}

const ITEM_HEIGHT = 36;

// O que o campo informa ao formulário para um texto: só o horário completo (4 dígitos) e válido.
const emittedValue = (text: string) =>
  text.replace(/\D/g, '').length === 4 ? (parseTime(text) ?? '') : '';

// Campo de horário em 24h: dá para digitar (1530, 15:30, 15h30, 9 -> 09:00) ou
// escolher em uma lista. Substitui o <input type="time"> do navegador, que
// separa hora e minuto em campos difíceis de acertar.
export default function TimeInput({
  label,
  value,
  onChange,
  step = 15,
  disabled,
  required,
  error,
  className = '',
}: TimeInputProps) {
  const inputId = useId();
  const listId = `${inputId}-list`;
  const options = useMemo(() => buildTimeOptions(step), [step]);

  const [text, setText] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [invalid, setInvalid] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);

  // Valor trocado de fora (ex.: formulário preenchido): acompanha, sem mexer no
  // que está sendo digitado (comparando com o que o próprio campo emitiria).
  useEffect(() => {
    if (value !== emittedValue(text)) {
      setText(value);
      setInvalid(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const openList = () => {
    if (disabled) return;
    setOpen(true);
    setHighlight(nearestOptionIndex(options, parseTime(text) ?? (value || null)));
  };

  // Ao abrir, centraliza o horário atual (ou o mais próximo) na lista.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const list = listRef.current;
    const index = Math.max(0, highlight);
    list.scrollTop = Math.max(0, index * ITEM_HEIGHT - (list.clientHeight - ITEM_HEIGHT) / 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Mantém o item destacado visível dentro da lista.
  useEffect(() => {
    if (!open || highlight < 0 || !listRef.current) return;
    const list = listRef.current;
    const top = highlight * ITEM_HEIGHT;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (top + ITEM_HEIGHT > list.scrollTop + list.clientHeight) list.scrollTop = top + ITEM_HEIGHT - list.clientHeight;
  }, [open, highlight]);

  const pick = (time: string) => {
    setText(time);
    setInvalid(false);
    onChange(time);
    setOpen(false);
  };

  const handleChange = (raw: string) => {
    const masked = maskTime(raw);
    setText(masked);
    setInvalid(false);
    // Só considera pronto com os 4 dígitos; antes disso o valor fica vazio.
    onChange(emittedValue(masked));
    setHighlight(nearestOptionIndex(options, parseTime(masked)));
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
      setText(parsed);
      setInvalid(false);
      onChange(parsed);
    } else {
      setInvalid(true);
      onChange('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        openList();
        return;
      }
      const delta = e.key === 'ArrowDown' ? 1 : -1;
      setHighlight((current) => {
        const base = current < 0 ? nearestOptionIndex(options, parseTime(text)) : current;
        return Math.min(options.length - 1, Math.max(0, base + delta));
      });
    } else if (e.key === 'Enter') {
      if (open && highlight >= 0) {
        e.preventDefault();
        pick(options[highlight]);
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
          aria-controls={listId}
          aria-autocomplete="list"
          aria-invalid={showError ? true : undefined}
          aria-required={required}
          disabled={disabled}
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={openList}
          onClick={openList}
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
          <ul
            id={listId}
            ref={listRef}
            role="listbox"
            // mousedown no item não pode tirar o foco do campo (senão o blur fecha a lista antes do clique)
            onMouseDown={(e) => e.preventDefault()}
            className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-white/10 bg-dark-card py-1 shadow-xl"
          >
            {options.map((option, index) => {
              const selected = option === value;
              return (
                <li
                  key={option}
                  role="option"
                  aria-selected={selected}
                  onClick={() => pick(option)}
                  onMouseEnter={() => setHighlight(index)}
                  style={{ height: ITEM_HEIGHT }}
                  className={`flex cursor-pointer items-center px-3.5 text-sm tabular-nums ${
                    selected
                      ? 'bg-primary/20 font-semibold text-primary'
                      : index === highlight
                        ? 'bg-white/10 text-white'
                        : 'text-gray-300'
                  }`}
                >
                  {option}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {showError && (
        <p role="alert" className="mt-1 text-xs text-danger-400">{showError}</p>
      )}
    </div>
  );
}
