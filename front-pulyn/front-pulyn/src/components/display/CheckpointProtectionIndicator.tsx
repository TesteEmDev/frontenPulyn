// components/display/CheckpointProtectionIndicator.tsx
import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';

interface CheckpointProtectionIndicatorProps {
  checkpointId: string;
  participantName: string | null;
  participantColor: string | null;
  protectedUntil: string | null;
  x: number;
  y: number;
}

export function CheckpointProtectionIndicator({
  checkpointId,
  participantName,
  participantColor,
  protectedUntil,
  x,
  y,
}: CheckpointProtectionIndicatorProps) {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [isProtected, setIsProtected] = useState(false);

  useEffect(() => {
    if (!protectedUntil) {
      setIsProtected(false);
      return;
    }

    const calculateRemaining = () => {
      const now = new Date().getTime();
      const until = new Date(protectedUntil).getTime();
      const remaining = Math.ceil((until - now) / 1000);

      if (remaining > 0) {
        setRemainingSeconds(remaining);
        setIsProtected(true);
      } else {
        setIsProtected(false);
        setRemainingSeconds(0);
      }
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 100);

    return () => clearInterval(interval);
  }, [protectedUntil]);

  if (!isProtected) {
    return null;
  }

  const percentage = (remainingSeconds / 5) * 100; // 5 segundos de proteção

  return (
    <g key={`protection-${checkpointId}`}>
      <defs>
        <style>{`
          @keyframes pulse-ring {
            0% { r: 20px; opacity: 1; }
            100% { r: 32px; opacity: 0; }
          }
          .protection-pulse { animation: pulse-ring 1s infinite; }
        `}</style>
      </defs>

      {/* Pulso de proteção */}
      <circle
        cx={x}
        cy={y}
        r="20"
        fill="none"
        stroke={participantColor || '#1E9BD7'}
        strokeWidth="2"
        opacity="0.6"
        className="protection-pulse"
      />

      {/* Anel de proteção com tempo */}
      <circle
        cx={x}
        cy={y}
        r="24"
        fill="none"
        stroke={participantColor || '#1E9BD7'}
        strokeWidth="3"
        strokeDasharray={`${(percentage / 100) * 150.796} 150.796`}
        opacity="0.8"
        transform={`rotate(-90 ${x} ${y})`}
      />

      {/* Ícone de lock */}
      <g transform={`translate(${x - 8}, ${y - 8})`}>
        <foreignObject width="16" height="16" x={x - 8} y={y - 8}>
          <div className="flex items-center justify-center w-4 h-4">
            <Lock size={12} color={participantColor || '#1E9BD7'} />
          </div>
        </foreignObject>
      </g>

      {/* Texto com tempo restante */}
      <text
        x={x}
        y={y + 32}
        fontSize="12"
        fontWeight="bold"
        fill={participantColor || '#1E9BD7'}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {remainingSeconds}s
      </text>

      {/* Nome do proprietário (opcional) */}
      {participantName && (
        <text
          x={x}
          y={y - 32}
          fontSize="11"
          fontWeight="600"
          fill="#FFFFFF"
          textAnchor="middle"
          dominantBaseline="middle"
          opacity="0.8"
        >
          {participantName}
        </text>
      )}
    </g>
  );
}
