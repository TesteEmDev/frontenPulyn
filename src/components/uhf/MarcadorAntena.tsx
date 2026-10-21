import type { PointerEvent } from 'react';

// Cores por leitor (na ordem da lista), para distinguir as 4 antenas de cada UR4 no mapa.
export const CORES_LEITOR = ['#1E9BD7', '#F59E0B', '#A855F7', '#22C55E', '#EF4444', '#EC4899', '#14B8A6', '#F97316'];

interface MarcadorAntenaProps {
  x: number;
  y: number;
  porta: number;
  rotulo: string;
  cor: string;
  // Raio de alcance já na unidade da planta (raioMetros / escala).
  raio: number;
  // null = no teto, apontando para baixo (cobertura circular).
  direcaoGraus: number | null;
  online?: boolean;
  selecionada?: boolean;
  mostrarAlcance?: boolean;
  onPointerDown?: (evento: PointerEvent<SVGGElement>) => void;
}

export default function MarcadorAntena({
  x, y, porta, rotulo, cor, raio, direcaoGraus, online = true, selecionada = false, mostrarAlcance = true, onPointerDown,
}: MarcadorAntenaProps) {
  const temDirecao = direcaoGraus !== null && direcaoGraus !== undefined;
  // Na parede, a área de leitura é um leque de 90° à frente da antena.
  const leque = () => {
    const angulo = ((direcaoGraus as number) * Math.PI) / 180;
    const ponta = (delta: number) => [x + Math.sin(angulo + delta) * raio, y - Math.cos(angulo + delta) * raio];
    const [x1, y1] = ponta(-Math.PI / 4);
    const [x2, y2] = ponta(Math.PI / 4);
    return `M ${x} ${y} L ${x1} ${y1} A ${raio} ${raio} 0 0 1 ${x2} ${y2} Z`;
  };

  return (
    <g onPointerDown={onPointerDown} className={onPointerDown ? 'cursor-grab' : undefined}>
      {mostrarAlcance && (temDirecao ? (
        <path d={leque()} fill={cor} fillOpacity={selecionada ? 0.18 : 0.08} stroke={cor} strokeOpacity={0.5} strokeDasharray="3 2" />
      ) : (
        <circle cx={x} cy={y} r={raio} fill={cor} fillOpacity={selecionada ? 0.18 : 0.08} stroke={cor} strokeOpacity={0.5} strokeDasharray="3 2" />
      ))}
      {temDirecao && (
        <line
          x1={x} y1={y}
          x2={x + Math.sin(((direcaoGraus as number) * Math.PI) / 180) * 12}
          y2={y - Math.cos(((direcaoGraus as number) * Math.PI) / 180) * 12}
          stroke={cor} strokeWidth={2.5} strokeLinecap="round"
        />
      )}
      <rect
        x={x - 6} y={y - 6} width={12} height={12} rx={3}
        fill={online ? cor : '#4B5563'}
        stroke={selecionada ? '#FFFFFF' : '#0B1120'} strokeWidth={selecionada ? 2 : 1.5}
      />
      <text x={x} y={y + 3} textAnchor="middle" fontSize={8} fontWeight={700} fill="#FFFFFF" pointerEvents="none">{porta}</text>
      <text x={x} y={y - 10} textAnchor="middle" fontSize={7} fill="#E5E7EB" pointerEvents="none">{rotulo}</text>
    </g>
  );
}
