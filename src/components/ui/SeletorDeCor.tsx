import { useCallback, useEffect, useRef, useState } from 'react';

// Seletor de cor do Pulyn: no lugar da janela padrão do navegador, um painel próprio com área de cor (saturação e brilho),
// faixa de tonalidade, campo de código, cores rápidas e pré-visualização. A cor só vale ao tocar em "Usar esta cor".

interface Hsv { h: number; s: number; v: number }

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function hexParaHsv(hex: string): Hsv {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const n = parseInt(m ? m[1] : '6ec6ff', 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

function hsvParaHex({ h, s, v }: Hsv): string {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const hex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

// Cores rápidas: vivas e fáceis de escolher com o dedo
const CORES_RAPIDAS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4',
  '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e', '#ffffff', '#111827',
];

interface Props {
  aberto: boolean;
  valor: string;
  titulo?: string;
  onUsar: (cor: string) => void;
  onFechar: () => void;
}

export default function SeletorDeCor({ aberto, valor, titulo = 'Escolha a cor do fundo', onUsar, onFechar }: Props) {
  const [hsv, setHsv] = useState<Hsv>(() => hexParaHsv(valor));
  const [texto, setTexto] = useState(valor.toLowerCase());
  const area = useRef<HTMLDivElement>(null);
  const cor = hsvParaHex(hsv);

  // Ao abrir, começa da cor atual do avatar
  useEffect(() => {
    if (!aberto) return;
    setHsv(hexParaHsv(valor));
    setTexto(valor.toLowerCase());
  }, [aberto, valor]);

  useEffect(() => {
    if (!aberto) return undefined;
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar(); };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [aberto, onFechar]);

  const mudar = useCallback((novo: Hsv) => {
    setHsv(novo);
    setTexto(hsvParaHex(novo));
  }, []);

  const arrastar = (e: React.PointerEvent<HTMLDivElement>) => {
    const caixa = area.current?.getBoundingClientRect();
    if (!caixa) return;
    mudar({ ...hsv, s: clamp((e.clientX - caixa.left) / caixa.width, 0, 1), v: 1 - clamp((e.clientY - caixa.top) / caixa.height, 0, 1) });
  };

  const aoTeclarNaArea = (e: React.KeyboardEvent) => {
    const passo = e.shiftKey ? 0.1 : 0.03;
    if (e.key === 'ArrowLeft') mudar({ ...hsv, s: clamp(hsv.s - passo, 0, 1) });
    else if (e.key === 'ArrowRight') mudar({ ...hsv, s: clamp(hsv.s + passo, 0, 1) });
    else if (e.key === 'ArrowUp') mudar({ ...hsv, v: clamp(hsv.v + passo, 0, 1) });
    else if (e.key === 'ArrowDown') mudar({ ...hsv, v: clamp(hsv.v - passo, 0, 1) });
    else return;
    e.preventDefault();
  };

  const aoDigitar = (valorDigitado: string) => {
    const limpo = valorDigitado.trim().toLowerCase().replace(/[^#0-9a-f]/g, '').slice(0, 7);
    setTexto(limpo);
    if (/^#[0-9a-f]{6}$/.test(limpo)) setHsv(hexParaHsv(limpo));
  };

  if (!aberto) return null;

  const claro = hsv.v > 0.8 && hsv.s < 0.25;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-3 sm:items-center" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onFechar} />
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl border border-fuchsia-300/25 bg-gradient-to-b from-[#1b1240] to-[#0a1226] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.6)] sm:p-5">
        {/* Faixa de cor ao vivo no topo */}
        <div className="absolute inset-x-0 top-0 h-1.5 transition-colors" style={{ backgroundColor: cor }} aria-hidden="true" />

        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-display text-lg text-white">🎨 {titulo}</h3>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="rounded-full bg-white/10 px-2.5 py-1 text-sm text-gray-300 transition hover:bg-white/20 hover:text-white">✕</button>
        </div>

        {/* Área de saturação (esquerda → direita) e brilho (baixo → cima) */}
        <div
          ref={area}
          role="slider"
          tabIndex={0}
          aria-label="Intensidade e brilho da cor"
          aria-valuetext={`Cor ${cor}`}
          aria-valuenow={Math.round(hsv.s * 100)}
          onKeyDown={aoTeclarNaArea}
          onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); arrastar(e); }}
          onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) arrastar(e); }}
          className="relative h-44 w-full cursor-crosshair touch-none select-none rounded-2xl border border-white/20 shadow-inner focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-300 sm:h-52"
          style={{ backgroundColor: `hsl(${hsv.h} 100% 50%)`, backgroundImage: 'linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)' }}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute h-7 w-7 -translate-x-1/2 translate-y-1/2 rounded-full border-[3px] border-white shadow-[0_0_0_2px_rgba(0,0,0,0.35),0_4px_10px_rgba(0,0,0,0.5)]"
            style={{ left: `${hsv.s * 100}%`, bottom: `${hsv.v * 100}%`, backgroundColor: cor }}
          />
        </div>

        {/* Tonalidade */}
        <input
          type="range"
          min={0}
          max={360}
          value={hsv.h}
          onChange={e => mudar({ ...hsv, h: Number(e.target.value) })}
          aria-label="Tonalidade"
          className="seletor-cor-matiz mt-4 h-4 w-full cursor-pointer appearance-none rounded-full"
          style={{ background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }}
        />

        {/* Cores rápidas */}
        <div className="mt-4 grid grid-cols-8 gap-2" role="group" aria-label="Cores rápidas">
          {CORES_RAPIDAS.map(rapida => (
            <button
              key={rapida}
              type="button"
              onClick={() => mudar(hexParaHsv(rapida))}
              aria-label={`Cor ${rapida}`}
              aria-pressed={rapida === cor}
              style={{ backgroundColor: rapida }}
              className={`aspect-square rounded-full border-2 transition hover:scale-110 active:scale-90 ${rapida === cor ? 'border-white ring-2 ring-fuchsia-300/70' : 'border-white/25'}`}
            />
          ))}
        </div>

        {/* Pré-visualização e código */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-white/40 shadow-md transition-colors" style={{ backgroundColor: cor }} aria-hidden="true">
            <span className={`text-lg ${claro ? 'text-black/50' : 'text-white/70'}`}>🎨</span>
          </div>
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-[10px] font-bold uppercase tracking-[0.2em] text-fuchsia-200">
            Código da cor
            <input
              type="text"
              value={texto}
              onChange={e => aoDigitar(e.target.value)}
              spellCheck={false}
              autoComplete="off"
              maxLength={7}
              aria-label="Código da cor"
              className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 font-mono text-sm normal-case tracking-normal text-white focus:border-fuchsia-300 focus:outline-none"
            />
          </label>
        </div>

        <div className="mt-5 flex gap-3">
          <button type="button" onClick={onFechar} className="flex-1 rounded-full border border-white/15 px-4 py-3 text-sm font-bold text-gray-300 transition hover:bg-white/10 hover:text-white">
            Cancelar
          </button>
          <button
            type="button"
            // Sem mexer: devolve a cor exatamente como veio (a conversão para HSV arredonda 1 ponto em algumas cores)
            onClick={() => onUsar(hsvParaHex(hexParaHsv(valor)) === cor ? valor : cor)}
            className="flex-[1.4] rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500 px-4 py-3 text-sm font-extrabold text-white shadow-[0_6px_18px_rgba(168,85,247,0.5)] transition hover:brightness-110 active:scale-95"
          >
            Usar esta cor
          </button>
        </div>
      </div>
    </div>
  );
}
