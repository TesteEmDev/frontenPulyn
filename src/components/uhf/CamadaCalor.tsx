import { useId } from 'react';

// Cor da densidade: 0 = azul, 0,33 = verde, 0,66 = amarelo, 1 = vermelho.
const PARADAS: [number, [number, number, number]][] = [
  [0, [30, 155, 215]],
  [0.33, [34, 197, 94]],
  [0.66, [250, 204, 21]],
  [1, [239, 68, 68]],
];

export function corDoCalor(t: number) {
  const v = Math.min(1, Math.max(0, t));
  for (let i = 1; i < PARADAS.length; i += 1) {
    const [fim, corFim] = PARADAS[i];
    const [inicio, corInicio] = PARADAS[i - 1];
    if (v <= fim) {
      const k = (v - inicio) / (fim - inicio);
      const [r, g, b] = corInicio.map((c, j) => Math.round(c + (corFim[j] - c) * k));
      return `rgb(${r}, ${g}, ${b})`;
    }
  }
  return 'rgb(239, 68, 68)';
}

interface CamadaCalorProps {
  celulas: { x: number; y: number; valor: number }[];
  celulaUnidades: number;
  // Valor que já fica vermelho (pulseiras/m²). Sem ele, usa o maior valor do mapa.
  valorMax: number;
}

// Células da grade de densidade, desfocadas para parecer uma mancha contínua.
export default function CamadaCalor({ celulas, celulaUnidades, valorMax }: CamadaCalorProps) {
  const filtroId = `calor-${useId().replace(/:/g, '')}`;
  if (!celulas.length || !valorMax) return null;
  const lado = celulaUnidades;
  return (
    <g filter={`url(#${filtroId})`} pointerEvents="none">
      <defs>
        <filter id={filtroId} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation={Math.max(1.5, lado * 0.8)} />
        </filter>
      </defs>
      {celulas.map((c) => {
        const t = c.valor / valorMax;
        return (
          <rect
            key={`${c.x}-${c.y}`}
            x={c.x - lado / 2}
            y={c.y - lado / 2}
            width={lado}
            height={lado}
            fill={corDoCalor(t)}
            fillOpacity={0.25 + 0.5 * Math.min(1, t)}
          />
        );
      })}
    </g>
  );
}

export function LegendaCalor({ valorMax }: { valorMax: number }) {
  const fundo = `linear-gradient(to right, ${[0, 0.33, 0.66, 1].map(corDoCalor).join(', ')})`;
  return (
    <div className="flex items-center gap-2 text-xs text-gray-400">
      <span>0</span>
      <span className="h-2.5 w-32 rounded-full" style={{ background: fundo }} />
      <span>{valorMax ? valorMax.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : '—'} pulseiras/m²</span>
    </div>
  );
}
