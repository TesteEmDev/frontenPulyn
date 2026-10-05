import { useEffect, useRef, useState } from 'react';
import { normalizeHex } from '../../utils/color';

interface ColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  label?: string;
}

type Hsv = { h: number; s: number; v: number };

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function hexToHsv(hex: string): Hsv {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

function hsvToHex({ h, s, v }: Hsv): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

// Seletor de cor livre: área de saturação/brilho, matiz e código hexadecimal exato.
export default function ColorPicker({ value, onChange, label = 'Cor' }: ColorPickerProps) {
  const safeValue = normalizeHex(value) || '#1E9BD7';
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(safeValue));
  const [hexText, setHexText] = useState(safeValue);
  const areaRef = useRef<HTMLDivElement>(null);

  // Quando o valor muda por fora (ex.: abrir outro time), sincroniza. Se vier da própria
  // seleção, mantém o matiz atual (em cinza/preto o matiz some do hexadecimal).
  useEffect(() => {
    if (hsvToHex(hsv) !== safeValue) setHsv(hexToHsv(safeValue));
    setHexText(safeValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeValue]);

  const commit = (next: Hsv) => {
    setHsv(next);
    const hex = hsvToHex(next);
    setHexText(hex);
    onChange(hex);
  };

  const pickFromPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = areaRef.current?.getBoundingClientRect();
    if (!rect) return;
    commit({
      h: hsv.h,
      s: clamp((event.clientX - rect.left) / rect.width, 0, 1),
      v: clamp(1 - (event.clientY - rect.top) / rect.height, 0, 1),
    });
  };

  const handleAreaKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 0.1 : 0.02;
    const moves: Record<string, Partial<Hsv>> = {
      ArrowLeft: { s: clamp(hsv.s - step, 0, 1) },
      ArrowRight: { s: clamp(hsv.s + step, 0, 1) },
      ArrowUp: { v: clamp(hsv.v + step, 0, 1) },
      ArrowDown: { v: clamp(hsv.v - step, 0, 1) },
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    commit({ ...hsv, ...move });
  };

  const handleHexChange = (text: string) => {
    setHexText(text);
    const hex = normalizeHex(text);
    if (hex) {
      setHsv(hexToHsv(hex));
      onChange(hex);
    }
  };

  const hexInvalid = hexText.trim() !== '' && normalizeHex(hexText) === null;

  return (
    <div>
      <span className="mb-2 block text-sm font-semibold text-gray-300">{label}</span>

      <div
        ref={areaRef}
        role="slider"
        tabIndex={0}
        aria-label="Saturação e brilho"
        aria-valuetext={`Saturação ${Math.round(hsv.s * 100)}%, brilho ${Math.round(hsv.v * 100)}%`}
        aria-valuenow={Math.round(hsv.s * 100)}
        onKeyDown={handleAreaKey}
        onPointerDown={event => {
          event.currentTarget.setPointerCapture(event.pointerId);
          pickFromPointer(event);
        }}
        onPointerMove={event => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) pickFromPointer(event);
        }}
        className="relative h-44 w-full cursor-crosshair touch-none rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
        style={{
          backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
          backgroundImage: 'linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)',
        }}
      >
        <span
          className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_1px_4px_rgba(0,0,0,0.6)]"
          style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, backgroundColor: safeValue }}
        />
      </div>

      <input
        type="range"
        min={0}
        max={360}
        step={1}
        value={Math.round(hsv.h)}
        aria-label="Matiz"
        onChange={event => commit({ ...hsv, h: Number(event.target.value) })}
        className="mt-3 h-3.5 w-full cursor-pointer appearance-none rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-transparent [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-transparent [&::-webkit-slider-thumb]:shadow-[0_1px_4px_rgba(0,0,0,0.6)]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
        }}
      />

      <div className="mt-3 flex items-center gap-3">
        <span
          className="h-10 w-10 shrink-0 rounded-lg border border-white/20"
          style={{ backgroundColor: safeValue }}
          aria-hidden="true"
        />
        <div className="flex-1">
          <label htmlFor="color-picker-hex" className="sr-only">Código da cor em hexadecimal</label>
          <input
            id="color-picker-hex"
            value={hexText}
            maxLength={7}
            spellCheck={false}
            autoComplete="off"
            aria-invalid={hexInvalid}
            onChange={event => handleHexChange(event.target.value)}
            onBlur={() => setHexText(safeValue)}
            className={`w-full rounded-lg border bg-dark-surface px-3 py-2 font-mono text-sm uppercase tracking-wider text-white focus:outline-none ${
              hexInvalid ? 'border-danger focus:border-danger' : 'border-dark-border focus:border-primary'
            }`}
            placeholder="#1E9BD7"
          />
        </div>
      </div>
      {hexInvalid && <p className="mt-1.5 text-xs text-danger">Use 6 dígitos de 0 a 9 e A a F, como #1E9BD7.</p>}
    </div>
  );
}
