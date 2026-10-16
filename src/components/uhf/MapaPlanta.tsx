import { useRef, type PointerEvent, type ReactNode } from 'react';

// Planta do buffet no mesmo espaço 450 x 320 do mapa dos checkpoints (components/display/posicaoNoMapa.ts).
// A imagem fica dentro do SVG, então o que é desenhado por cima sempre bate com a planta.
export const LARGURA_PLANTA = 450;
export const ALTURA_PLANTA = 320;

export interface PontoPlanta { x: number; y: number }
type TipoPonteiro = 'down' | 'move' | 'up' | 'leave';

interface MapaPlantaProps {
  plantaUrl: string | null;
  children?: ReactNode;
  altura?: number;
  cursor?: string;
  // Posição do ponteiro já convertida para a planta (0-450 x 0-320).
  onPonteiro?: (tipo: TipoPonteiro, ponto: PontoPlanta, evento: PointerEvent<SVGSVGElement>) => void;
}

export default function MapaPlanta({ plantaUrl, children, altura = 460, cursor, onPonteiro }: MapaPlantaProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const ponto = (evento: PointerEvent<SVGSVGElement>): PontoPlanta | null => {
    const svg = svgRef.current;
    const matriz = svg?.getScreenCTM();
    if (!svg || !matriz) return null;
    const p = svg.createSVGPoint();
    p.x = evento.clientX;
    p.y = evento.clientY;
    const r = p.matrixTransform(matriz.inverse());
    return { x: Math.min(LARGURA_PLANTA, Math.max(0, r.x)), y: Math.min(ALTURA_PLANTA, Math.max(0, r.y)) };
  };

  const repassar = (tipo: TipoPonteiro) => (evento: PointerEvent<SVGSVGElement>) => {
    if (!onPonteiro) return;
    const p = ponto(evento);
    if (p) onPonteiro(tipo, p, evento);
  };

  return (
    <div className="relative overflow-hidden rounded-lg bg-surface" style={{ height: altura }}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${LARGURA_PLANTA} ${ALTURA_PLANTA}`}
        className="touch-none select-none"
        style={{ cursor }}
        onPointerDown={repassar('down')}
        onPointerMove={repassar('move')}
        onPointerUp={repassar('up')}
        onPointerLeave={repassar('leave')}
      >
        <rect x={0} y={0} width={LARGURA_PLANTA} height={ALTURA_PLANTA} fill="none" stroke="rgba(255,255,255,0.08)" />
        {plantaUrl && (
          <image href={plantaUrl} x={0} y={0} width={LARGURA_PLANTA} height={ALTURA_PLANTA} opacity={0.4} preserveAspectRatio="xMidYMid meet" />
        )}
        {children}
      </svg>
    </div>
  );
}
