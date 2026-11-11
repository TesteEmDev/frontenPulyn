import { useCallback, useEffect, useRef, useState } from 'react';

// Seletor de cor simples: um anel de cores (o marcador gira para escolher a cor) e uma barra embaixo, do escuro ao claro.
// Sem moldura nem botão de confirmar: a cor vale na hora. Abre ali mesmo, embaixo do botão "Cor personalizada".

interface Hsl { h: number; s: number; l: number }

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function hexParaHsl(hex: string): Hsl {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const n = parseInt(m ? m[1] : '6ec6ff', 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const l = (max + min) / 2;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  return { h, s: d === 0 ? 1 : d / (1 - Math.abs(2 * l - 1)), l };
}

function hslParaHex({ h, s, l }: Hsl): string {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const hex = (n: number) => Math.round(clamp(n + m, 0, 1) * 255).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

interface Props {
  /** Cor atual (#rrggbb) */
  valor: string;
  /** Chamado a cada mudança, com a nova cor (#rrggbb) */
  onChange: (cor: string) => void;
  disabled?: boolean;
  className?: string;
}

const TAMANHO = 168;   // diâmetro do anel (px)
const ESPESSURA = 26;  // largura do anel (px)

export default function SeletorDeCor({ valor, onChange, disabled = false, className = '' }: Props) {
  const [hsl, setHsl] = useState<Hsl>(() => hexParaHsl(valor));
  const anel = useRef<HTMLDivElement>(null);
  const cor = hslParaHex(hsl);

  // Se a cor mudou por fora (ex.: personagem sorteado), acompanha; mudanças que vieram daqui não mexem no marcador
  useEffect(() => {
    if (valor.toLowerCase() !== hslParaHex(hsl)) setHsl(hexParaHsl(valor));
    // só quando a cor de fora muda
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor]);

  const mudar = useCallback((novo: Hsl) => {
    setHsl(novo);
    onChange(hslParaHex(novo));
  }, [onChange]);

  // O ângulo do toque (de cima, no sentido horário) é a cor
  const arrastar = (e: React.PointerEvent<HTMLDivElement>) => {
    const caixa = anel.current?.getBoundingClientRect();
    if (!caixa) return;
    const dx = e.clientX - (caixa.left + caixa.width / 2);
    const dy = e.clientY - (caixa.top + caixa.height / 2);
    mudar({ ...hsl, h: Math.round(((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360) });
  };

  const aoTeclar = (e: React.KeyboardEvent) => {
    const passo = e.shiftKey ? 15 : 4;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') mudar({ ...hsl, h: (hsl.h - passo + 360) % 360 });
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') mudar({ ...hsl, h: (hsl.h + passo) % 360 });
    else return;
    e.preventDefault();
  };

  const raioMarcador = TAMANHO / 2 - ESPESSURA / 2;
  const rad = (hsl.h * Math.PI) / 180;
  const puro = hslParaHex({ h: hsl.h, s: hsl.s, l: 0.5 });
  return (
    <div className={`flex flex-col items-center gap-4 ${disabled ? 'pointer-events-none opacity-50' : ''} ${className}`}>
      <div className="relative" style={{ width: TAMANHO, height: TAMANHO }}>
        <div
          ref={anel}
          role="slider"
          tabIndex={0}
          aria-label="Cor"
          aria-valuetext={`Cor ${cor}`}
          aria-valuenow={hsl.h}
          aria-valuemin={0}
          aria-valuemax={360}
          onKeyDown={aoTeclar}
          onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); arrastar(e); }}
          onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) arrastar(e); }}
          className="absolute inset-0 cursor-pointer touch-none select-none rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          style={{
            background: 'conic-gradient(#f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)',
            WebkitMask: `radial-gradient(farthest-side, transparent calc(100% - ${ESPESSURA}px), #000 calc(100% - ${ESPESSURA - 1}px))`,
            mask: `radial-gradient(farthest-side, transparent calc(100% - ${ESPESSURA}px), #000 calc(100% - ${ESPESSURA - 1}px))`,
          }}
        />
        {/* Marcador no anel e cor atual no meio (fora do elemento com máscara, para não serem cortados) */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute h-[22px] w-[22px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.4),0_2px_6px_rgba(0,0,0,0.5)]"
          style={{ left: TAMANHO / 2 + raioMarcador * Math.sin(rad), top: TAMANHO / 2 - raioMarcador * Math.cos(rad), backgroundColor: puro }}
        />
        <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-[64px] w-[64px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/60 shadow-md" style={{ backgroundColor: cor }} />
      </div>

      {/* Do escuro ao claro, na cor escolhida */}
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(hsl.l * 100)}
        onChange={e => mudar({ ...hsl, l: Number(e.target.value) / 100 })}
        aria-label="Claro e escuro"
        className="seletor-cor-matiz h-4 cursor-pointer appearance-none rounded-full"
        style={{ width: TAMANHO, background: `linear-gradient(to right, #000, ${puro}, #fff)` }}
      />
    </div>
  );
}
