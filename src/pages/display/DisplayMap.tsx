import { useMemo } from 'react';
import { usePulynStore } from '../../store/mockData';

interface ZoneConfig {
  name: string;
  color: string;
  borderColor: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const ZONES: ZoneConfig[] = [
  { name: 'Entrada', color: '#1E9BD7', borderColor: '#1E9BD760', x: 30, y: 5, w: 40, h: 18 },
  { name: 'Area Verde', color: '#10B981', borderColor: '#10B98160', x: 5, y: 28, w: 42, h: 38 },
  { name: 'Area Azul', color: '#1E9BD7', borderColor: '#1E9BD760', x: 53, y: 28, w: 42, h: 38 },
  { name: 'Area Central', color: '#F59E0B', borderColor: '#F59E0B60', x: 20, y: 70, w: 60, h: 25 },
];

function CheckpointMarker({
  checkpoint,
  x,
  y,
}: {
  checkpoint: { id: string; name: string; status: string; points: number; zone: string };
  x: number;
  y: number;
}) {
  const isOnline = checkpoint.status === 'online';

  return (
    <div
      className="absolute flex flex-col items-center"
      style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
    >
      <div className="relative">
        <div
          className={`w-5 h-5 rounded-full border-2 ${
            isOnline ? 'bg-success-500 border-success-400' : 'bg-danger-500 border-danger-400'
          }`}
          style={{ boxShadow: isOnline ? '0 0 10px rgba(16,185,129,0.5)' : '0 0 10px rgba(239,68,68,0.5)' }}
        />
        {isOnline && (
          <div className="absolute inset-0 w-5 h-5 rounded-full bg-success-500 animate-ping opacity-40" />
        )}
      </div>
      <span className="font-mono text-[10px] text-slate-400 mt-1 whitespace-nowrap">
        {checkpoint.id}
      </span>
      <span className="font-display text-xs text-slate-300 whitespace-nowrap">
        {checkpoint.name}
      </span>
      <span className="font-mono text-[10px] text-primary-400">
        +{checkpoint.points}pts
      </span>
    </div>
  );
}

function ChildAvatar({
  avatar,
  nickname,
  x,
  y,
}: {
  avatar: string;
  nickname: string;
  x: number;
  y: number;
}) {
  return (
    <div
      className="absolute flex flex-col items-center pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
    >
      <div className="text-2xl drop-shadow-lg animate-float">{avatar}</div>
      <span className="font-display text-[10px] text-slate-300 mt-0.5 whitespace-nowrap">
        {nickname}
      </span>
    </div>
  );
}

export default function DisplayMap() {
  const { children, checkpoints, scoreLog } = usePulynStore();

  // Determine each child's last checkpoint zone
  const childLastZone = useMemo(() => {
    const zoneMap: Record<string, { zone: string; checkpointId: string }> = {};

    // Walk scoreLog in chronological order (oldest first)
    const sorted = [...scoreLog].reverse();
    for (const entry of sorted) {
      const cp = checkpoints.find((c) => c.id === entry.checkpoint);
      if (cp) {
        zoneMap[entry.childId] = { zone: cp.zone, checkpointId: cp.id };
      }
    }

    return zoneMap;
  }, [scoreLog, checkpoints]);

  // Assign positions within each zone to avoid overlap
  const childPositions = useMemo(() => {
    const zoneChildren: Record<string, { id: string; avatar: string; nickname: string }[]> = {};

    const activeChildren = children.filter((c) => c.status === 'active' && c.team);
    for (const child of activeChildren) {
      const zone = childLastZone[child.id]?.zone || 'Entrada';
      if (!zoneChildren[zone]) zoneChildren[zone] = [];
      zoneChildren[zone].push({ id: child.id, avatar: child.avatar, nickname: child.nickname });
    }

    const positions: { id: string; avatar: string; nickname: string; x: number; y: number }[] = [];

    for (const zone of ZONES) {
      const kids = zoneChildren[zone.name] || [];
      const cols = Math.min(kids.length, 4);
      kids.forEach((kid, i) => {
        const row = Math.floor(i / 4);
        const col = i % 4;
        const xOff = cols > 1 ? (col / (cols - 1)) * 0.6 + 0.2 : 0.5;
        const yOff = 0.3 + row * 0.25;
        positions.push({
          id: kid.id,
          avatar: kid.avatar,
          nickname: kid.nickname,
          x: zone.x + zone.w * xOff,
          y: zone.y + zone.h * yOff,
        });
      });
    }

    return positions;
  }, [children, childLastZone]);

  // Checkpoint positions within their zones
  const checkpointPositions = useMemo(() => {
    const positions: { checkpoint: typeof checkpoints[number]; x: number; y: number }[] = [];

    const zoneCenter: Record<string, { x: number; y: number }> = {};
    for (const z of ZONES) {
      zoneCenter[z.name] = { x: z.x + z.w * 0.5, y: z.y + z.h * 0.15 };
    }

    for (const cp of checkpoints) {
      const zone = ZONES.find((z) => z.name === cp.zone);
      if (zone) {
        // Spread checkpoints within their zone
        const idx = checkpoints.filter((c) => c.zone === cp.zone).indexOf(cp);
        const count = checkpoints.filter((c) => c.zone === cp.zone).length;
        const xOff = count > 1 ? (idx / (count - 1)) * 0.6 + 0.2 : 0.5;
        positions.push({
          checkpoint: cp,
          x: zone.x + zone.w * xOff,
          y: zone.y + zone.h * 0.75,
        });
      }
    }

    return positions;
  }, [checkpoints]);

  return (
    <div className="fixed inset-0 bg-gradient-dark flex flex-col overflow-hidden">
      {/* Header */}
      <div className="relative z-10 text-center py-6 border-b border-dark-border/50">
        <h1 className="font-display text-3xl text-slate-100">Mapa do Espaco</h1>
        <p className="text-slate-500 text-sm mt-1 uppercase tracking-widest">Posicao em tempo real</p>
      </div>

      {/* Map */}
      <div className="relative z-10 flex-1 mx-8 my-6 rounded-2xl border border-dark-border/40 bg-dark-card/30 overflow-hidden">
        {/* Zones */}
        {ZONES.map((zone) => (
          <div
            key={zone.name}
            className="absolute rounded-xl border-2"
            style={{
              left: `${zone.x}%`,
              top: `${zone.y}%`,
              width: `${zone.w}%`,
              height: `${zone.h}%`,
              backgroundColor: zone.color + '10',
              borderColor: zone.borderColor,
            }}
          >
            <div className="absolute top-2 left-3 flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: zone.color, boxShadow: `0 0 8px ${zone.color}80` }}
              />
              <span className="font-display text-sm font-bold" style={{ color: zone.color }}>
                {zone.name}
              </span>
            </div>
          </div>
        ))}

        {/* Connecting path lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
          <line x1="50%" y1="23%" x2="26%" y2="28%" stroke="#3B267080" strokeWidth="2" strokeDasharray="6 4" />
          <line x1="50%" y1="23%" x2="74%" y2="28%" stroke="#3B267080" strokeWidth="2" strokeDasharray="6 4" />
          <line x1="26%" y1="66%" x2="50%" y2="70%" stroke="#3B267080" strokeWidth="2" strokeDasharray="6 4" />
          <line x1="74%" y1="66%" x2="50%" y2="70%" stroke="#3B267080" strokeWidth="2" strokeDasharray="6 4" />
        </svg>

        {/* Checkpoints */}
        {checkpointPositions.map(({ checkpoint, x, y }) => (
          <CheckpointMarker key={checkpoint.id} checkpoint={checkpoint} x={x} y={y} />
        ))}

        {/* Children */}
        {childPositions.map((pos) => (
          <ChildAvatar
            key={pos.id}
            avatar={pos.avatar}
            nickname={pos.nickname}
            x={pos.x}
            y={pos.y}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="relative z-10 flex items-center justify-center gap-8 pb-5">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-success-500" style={{ boxShadow: '0 0 6px rgba(16,185,129,0.5)' }} />
          <span className="text-xs text-slate-400">Online</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-danger-500" style={{ boxShadow: '0 0 6px rgba(239,68,68,0.5)' }} />
          <span className="text-xs text-slate-400">Offline</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg">🦊</span>
          <span className="text-xs text-slate-400">Crianca</span>
        </div>
      </div>
    </div>
  );
}
