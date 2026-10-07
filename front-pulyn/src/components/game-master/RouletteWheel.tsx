import { useEffect, useMemo, useRef, useState } from 'react';

interface RouletteWheelProps {
  segments: string[];
  winnerIndex: number;
  size?: number;
  // Duração do giro em segundos.
  durationSeconds?: number;
  onDone?: () => void;
}

const SPINS = 6;

const polar = (cx: number, cy: number, radius: number, angleDeg: number) => {
  const rad = ((angleDeg - 90) * Math.PI) / 180; // 0° aponta para cima
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
};

const truncate = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

// Roleta em SVG: gira e para com o gomo `winnerIndex` embaixo do ponteiro (no topo).
// O sorteio já foi feito pelo servidor; aqui só se anima o resultado.
export default function RouletteWheel({ segments, winnerIndex, size = 340, durationSeconds = 5.5, onDone }: RouletteWheelProps) {
  const count = Math.max(1, segments.length);
  const segmentAngle = 360 / count;
  const [rotation, setRotation] = useState(0);
  const [animate, setAnimate] = useState(false);
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  const reducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    []
  );

  // O ponto de parada fica um pouco fora do centro do gomo, para não parecer sempre cravado.
  const target = useMemo(() => {
    const center = winnerIndex * segmentAngle + segmentAngle / 2;
    const jitter = (Math.random() - 0.5) * segmentAngle * 0.6;
    return SPINS * 360 - center + jitter;
  }, [winnerIndex, segmentAngle]);

  useEffect(() => {
    if (reducedMotion) {
      setAnimate(false);
      setRotation(target);
      const timer = setTimeout(() => doneRef.current?.(), 400);
      return () => clearTimeout(timer);
    }
    setAnimate(false);
    setRotation(0);
    // Dois quadros: garante que o navegador pinta a posição inicial antes de começar a transição.
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        setAnimate(true);
        setRotation(target);
      });
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [target, reducedMotion]);

  const half = 150;
  const radius = 140;
  const labelRadius = count === 1 ? 0 : radius * 0.62;
  const fontSize = count <= 6 ? 14 : count <= 9 ? 12 : 10;
  const maxChars = count <= 6 ? 20 : count <= 9 ? 16 : 13;

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      {/* Ponteiro fixo no topo */}
      <div
        className="absolute left-1/2 z-10 -translate-x-1/2"
        style={{ top: -6, width: 0, height: 0, borderLeft: '14px solid transparent', borderRight: '14px solid transparent', borderTop: '28px solid #F5B301', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.5))' }}
        aria-hidden="true"
      />
      <div
        style={{
          width: '100%',
          height: '100%',
          transform: `rotate(${rotation}deg)`,
          transition: animate ? `transform ${durationSeconds}s cubic-bezier(0.12, 0.72, 0.12, 1)` : 'none',
        }}
        onTransitionEnd={() => doneRef.current?.()}
      >
        <svg viewBox="0 0 300 300" width="100%" height="100%" role="img" aria-label={`Roleta de objetos com ${count} opções`}>
          <circle cx={half} cy={half} r={radius + 6} fill="#0B1220" stroke="#F5B301" strokeWidth="4" />
          {segments.map((name, index) => {
            const start = index * segmentAngle;
            const end = start + segmentAngle;
            const color = `hsl(${Math.round((index * 360) / count + 12)}, 68%, 42%)`;
            let shape;
            if (count === 1) {
              shape = <circle cx={half} cy={half} r={radius} fill={color} />;
            } else {
              const from = polar(half, half, radius, start);
              const to = polar(half, half, radius, end);
              const large = segmentAngle > 180 ? 1 : 0;
              shape = (
                <path
                  d={`M ${half} ${half} L ${from.x} ${from.y} A ${radius} ${radius} 0 ${large} 1 ${to.x} ${to.y} Z`}
                  fill={color}
                  stroke="#0B1220"
                  strokeWidth="2"
                />
              );
            }
            const mid = start + segmentAngle / 2;
            const labelPoint = polar(half, half, labelRadius, mid);
            // O texto fica ao longo do raio, legível do centro para fora.
            const textRotation = mid - 90 + (mid > 180 ? 180 : 0);
            return (
              <g key={`${name}-${index}`}>
                {shape}
                <text
                  x={labelPoint.x}
                  y={labelPoint.y}
                  fill="#FFFFFF"
                  fontSize={fontSize}
                  fontWeight={700}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={count === 1 ? undefined : `rotate(${textRotation} ${labelPoint.x} ${labelPoint.y})`}
                  style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.45)', strokeWidth: 2.5 }}
                >
                  {truncate(name, maxChars)}
                </text>
              </g>
            );
          })}
          <circle cx={half} cy={half} r={16} fill="#0B1220" stroke="#F5B301" strokeWidth="3" />
        </svg>
      </div>
    </div>
  );
}
