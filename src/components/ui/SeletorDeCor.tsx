import { useCallback, useEffect, useRef, useState } from 'react';

// Roda de cores do Pulyn: sobe ali mesmo, embaixo do botão "Cor personalizada", sem janela no meio da tela.
// O giro escolhe a cor, a distância do centro escolhe a intensidade e a faixa de baixo escolhe o brilho.
// A cor vale na hora (não há botão de confirmar).

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

interface Props {
  /** Cor atual (#rrggbb) */
  valor: string;
  /** Chamado a cada mudança, com a nova cor (#rrggbb) */
  onChange: (cor: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function SeletorDeCor({ valor, onChange, disabled = false, className = '' }: Props) {
  const [hsv, setHsv] = useState<Hsv>(() => hexParaHsv(valor));
  const area = useRef<HTMLDivElement>(null);
  const cor = hsvParaHex(hsv);

  // Se a cor mudou por fora (ex.: o personagem sorteado), acompanha; mudanças que vieram daqui não mexem no giro da roda
  useEffect(() => {
    if (valor.toLowerCase() !== hsvParaHex(hsv)) setHsv(hexParaHsv(valor));
    // só quando a cor de fora muda
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor]);

  const mudar = useCallback((novo: Hsv) => {
    setHsv(novo);
    onChange(hsvParaHex(novo));
  }, [onChange]);

  // Roda: o ângulo (de cima, no sentido horário) é a cor; a distância do centro é a intensidade
  const arrastar = (e: React.PointerEvent<HTMLDivElement>) => {
    const caixa = area.current?.getBoundingClientRect();
    if (!caixa) return;
    const dx = e.clientX - (caixa.left + caixa.width / 2);
    const dy = e.clientY - (caixa.top + caixa.height / 2);
    const angulo = (Math.atan2(dx, -dy) * 180) / Math.PI;
    mudar({ ...hsv, h: Math.round((angulo + 360) % 360), s: clamp(Math.hypot(dx, dy) / (caixa.width / 2), 0, 1) });
  };

  const aoTeclar = (e: React.KeyboardEvent) => {
    const passo = e.shiftKey ? 10 : 3;
    if (e.key === 'ArrowLeft') mudar({ ...hsv, h: (hsv.h - passo + 360) % 360 });
    else if (e.key === 'ArrowRight') mudar({ ...hsv, h: (hsv.h + passo) % 360 });
    else if (e.key === 'ArrowUp') mudar({ ...hsv, s: clamp(hsv.s + passo / 100, 0, 1) });
    else if (e.key === 'ArrowDown') mudar({ ...hsv, s: clamp(hsv.s - passo / 100, 0, 1) });
    else return;
    e.preventDefault();
  };

  return (
    <div className={`flex flex-col items-center gap-3 rounded-3xl border border-fuchsia-300/25 bg-gradient-to-b from-[#1b1240]/80 to-[#0a1226]/80 p-3 ${disabled ? 'pointer-events-none opacity-50' : ''} ${className}`}>
      <div
        ref={area}
        role="slider"
        tabIndex={0}
        aria-label="Cor e intensidade"
        aria-valuetext={`Cor ${cor}`}
        aria-valuenow={Math.round(hsv.h)}
        aria-valuemin={0}
        aria-valuemax={360}
        onKeyDown={aoTeclar}
        onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); arrastar(e); }}
        onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) arrastar(e); }}
        className="relative aspect-square w-full max-w-[200px] cursor-crosshair touch-none select-none rounded-full border-4 border-white/25 shadow-[0_8px_22px_rgba(0,0,0,0.5)] focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-300"
        style={{ backgroundImage: 'radial-gradient(circle closest-side, #fff, rgba(255,255,255,0)), conic-gradient(#f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }}
      >
        {/* Escurece a roda conforme o brilho */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full bg-black" style={{ opacity: 1 - hsv.v }} />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-[0_0_0_2px_rgba(0,0,0,0.35),0_4px_10px_rgba(0,0,0,0.5)]"
          style={{
            left: `${50 + hsv.s * 50 * Math.sin((hsv.h * Math.PI) / 180)}%`,
            top: `${50 - hsv.s * 50 * Math.cos((hsv.h * Math.PI) / 180)}%`,
            backgroundColor: cor,
          }}
        />
      </div>

      {/* Brilho: do escuro até a cor escolhida */}
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(hsv.v * 100)}
        onChange={e => mudar({ ...hsv, v: Number(e.target.value) / 100 })}
        aria-label="Brilho"
        className="seletor-cor-matiz h-4 w-full max-w-[200px] cursor-pointer appearance-none rounded-full"
        style={{ background: `linear-gradient(to right, #000, ${hsvParaHex({ ...hsv, v: 1 })})` }}
      />
    </div>
  );
}
