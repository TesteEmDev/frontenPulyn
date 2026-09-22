import { useMemo } from 'react';
import Avatar from '../../components/ui/Avatar';
import { DEFAULT_AVATAR_ID } from '../../avatar/adventurerAvatars';
import type { Checkpoint, Team } from '../../store/mockData';
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

const MAP_WIDTH = 450;
const MAP_HEIGHT = 320;
function normalizeZoneName(value?: string | null) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function getStoredMapPosition(checkpoint: Checkpoint) {
  const x = Number(checkpoint.map_x ?? checkpoint.mapX);
  const y = Number(checkpoint.map_y ?? checkpoint.mapY);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  return {
    x: Math.min(Math.max((x / MAP_WIDTH) * 100, 2), 98),
    y: Math.min(Math.max((y / MAP_HEIGHT) * 100, 2), 98),
  };
}

function getCheckpointDisplayPosition(checkpoint: Checkpoint, checkpoints: Checkpoint[]) {
  const storedPosition = getStoredMapPosition(checkpoint);
  if (storedPosition) return storedPosition;

  const zone = ZONES.find((item) => normalizeZoneName(item.name) === normalizeZoneName(checkpoint.zone)) || ZONES[0];
  const sameZone = checkpoints.filter((item) => normalizeZoneName(item.zone) === normalizeZoneName(checkpoint.zone));
  const index = sameZone.indexOf(checkpoint);
  const count = sameZone.length;
  const xOffset = count > 1 ? (index / (count - 1)) * 0.6 + 0.2 : 0.5;

  return {
    x: zone.x + zone.w * xOffset,
    y: zone.y + zone.h * 0.75,
  };
}

function CheckpointMarker({
  checkpoint,
  x,
  y,
  owner,
}: {
  checkpoint: Checkpoint;
  x: number;
  y: number;
  owner?: Team;
}) {
  const isOnline = checkpoint.status === 'online';
  const isOwned = Boolean(owner);
  const color = owner?.color || (isOnline ? '#22C55E' : '#EF4444');
  const stateLabel = isOwned
    ? `Dominado pelo time ${owner?.name}`
    : isOnline
      ? 'Livre e online'
      : 'Offline';

  return (
    <div
      className="absolute z-20 flex flex-col items-center"
      style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
      aria-label={`${checkpoint.name}: ${stateLabel}`}
    >
      <div className="relative">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full border-2 bg-dark-card/95"
          style={{
            borderColor: color,
            boxShadow: `0 0 0 4px ${color}20, 0 0 18px ${color}${isOwned ? 'B0' : '70'}`,
          }}
        >
          <div className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: color }} />
        </div>
        {isOnline && (
          <div
            className="absolute inset-0 h-8 w-8 rounded-full animate-ping opacity-30"
            style={{ backgroundColor: color }}
          />
        )}
        {!isOnline && (
          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border border-dark-card bg-danger-500" />
        )}
      </div>
      <span className="mt-1 whitespace-nowrap font-mono text-[10px] text-slate-400">
        {checkpoint.id}
      </span>
      <span className="whitespace-nowrap font-display text-xs text-slate-100">
        {checkpoint.name}
      </span>
      {isOwned && (
        <span className="max-w-40 truncate whitespace-nowrap font-semibold text-[10px]" style={{ color }}>
          {owner.name}
        </span>
      )}
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
      className="absolute z-10 flex flex-col items-center pointer-events-none transition-[left,top] duration-700 ease-out"
      style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
    >
      <div className="animate-float">
        <Avatar emoji={avatar || DEFAULT_AVATAR_ID} size="sm" decorative />
      </div>
      <span className="mt-0.5 whitespace-nowrap font-display text-[10px] text-slate-300">
        {nickname || 'Participante'}
      </span>
    </div>
  );
}

interface DisplayMapProps {
  embedded?: boolean;
}

export default function DisplayMap({ embedded = false }: DisplayMapProps) {
  const { children, checkpoints, scoreLog, teams } = usePulynStore();

  const teamById = useMemo(() => {
    const map = new Map<string, Team>();
    teams.forEach((team) => map.set(String(team.id).toLowerCase(), team));
    return map;
  }, [teams]);

  const checkpointOwnerById = useMemo(() => {
    const owners = new Map<string, Team | undefined>();
    checkpoints.forEach((checkpoint) => {
      const ownerId = checkpoint.territory_owner_time_id;
      owners.set(String(checkpoint.id), ownerId ? teamById.get(String(ownerId).toLowerCase()) : undefined);
    });
    return owners;
  }, [checkpoints, teamById]);

  // Determine each child's last checkpoint zone.
  const childLastZone = useMemo(() => {
    const zoneMap: Record<string, { zone: string; checkpointId: string }> = {};
    const sorted = [...scoreLog].reverse();

    for (const entry of sorted) {
      const checkpointId = entry.checkpointId ?? entry.checkpoint_id ?? entry.checkpoint;
      const cp = checkpoints.find((c) => String(c.id) === String(checkpointId));
      const childId = entry.childId ?? entry.child_id;
      if (cp && childId) {
        const knownZone = ZONES.some((zone) => normalizeZoneName(zone.name) === normalizeZoneName(cp.zone))
          ? ZONES.find((zone) => normalizeZoneName(zone.name) === normalizeZoneName(cp.zone))?.name || 'Entrada'
          : 'Entrada';
        zoneMap[childId] = { zone: knownZone, checkpointId: cp.id };
      }
    }

    return zoneMap;
  }, [scoreLog, checkpoints]);

  // Avatares acompanham o último checkpoint conquistado. Quando ainda não
  // existe uma conquista, continuam distribuídos na zona de entrada/zona atual.
  const childPositions = useMemo(() => {
    const zoneChildren: Record<string, { id: string; avatar: string; nickname: string }[]> = {};
    const checkpointChildren: Record<string, number> = {};
    const positions: { id: string; avatar: string; nickname: string; x: number; y: number }[] = [];
    const activeChildren = children.filter((child) => child.status === 'active' && (child.teamId || child.team_id || child.time_id || child.team));

    for (const child of activeChildren) {
      const lastCheckpointId = childLastZone[child.id]?.checkpointId;
      const lastCheckpoint = lastCheckpointId
        ? checkpoints.find((checkpoint) => String(checkpoint.id) === String(lastCheckpointId))
        : undefined;

      if (lastCheckpoint) {
        const basePosition = getCheckpointDisplayPosition(lastCheckpoint, checkpoints);
        const slot = checkpointChildren[lastCheckpoint.id] || 0;
        checkpointChildren[lastCheckpoint.id] = slot + 1;
        const offsets = [-4, 0, 4];
        const offsetX = offsets[slot % offsets.length];

        positions.push({
          id: child.id,
          avatar: child.avatar,
          nickname: child.nickname || child.name,
          x: Math.min(Math.max(basePosition.x + offsetX, 4), 96),
          y: Math.min(Math.max(basePosition.y + 8 + Math.floor(slot / offsets.length) * 5, 6), 94),
        });
        continue;
      }

      const zone = childLastZone[child.id]?.zone || 'Entrada';
      if (!zoneChildren[zone]) zoneChildren[zone] = [];
      zoneChildren[zone].push({
        id: child.id,
        avatar: child.avatar,
        nickname: child.nickname || child.name,
      });
    }

    for (const zone of ZONES) {
      const kids = zoneChildren[zone.name] || [];
      const cols = Math.min(kids.length, 4);
      kids.forEach((kid, index) => {
        const row = Math.floor(index / 4);
        const col = index % 4;
        const xOff = cols > 1 ? (col / (cols - 1)) * 0.6 + 0.2 : 0.5;
        positions.push({
          id: kid.id,
          avatar: kid.avatar,
          nickname: kid.nickname,
          x: zone.x + zone.w * xOff,
          y: zone.y + zone.h * (0.3 + row * 0.25),
        });
      });
    }

    return positions;
  }, [children, childLastZone, checkpoints]);

  const checkpointPositions = useMemo(() => checkpoints.map((checkpoint) => ({
    checkpoint,
    ...getCheckpointDisplayPosition(checkpoint, checkpoints),
  })), [checkpoints]);

  const ownedTeams = useMemo(() => {
    const seen = new Set<string>();
    return checkpoints
      .map((checkpoint) => checkpointOwnerById.get(String(checkpoint.id)))
      .filter((team): team is Team => {
        if (!team || seen.has(String(team.id))) return false;
        seen.add(String(team.id));
        return true;
      });
  }, [checkpoints, checkpointOwnerById]);

  return (
    <div className={embedded
      ? 'relative flex flex-col overflow-hidden rounded-3xl border border-primary-400/20 bg-dark-card/75 p-4 shadow-[0_18px_50px_rgba(2,10,24,0.2)] backdrop-blur-xl sm:p-6'
      : 'fixed inset-0 flex flex-col overflow-hidden bg-gradient-dark'}>
      <div className={`relative z-10 border-b border-dark-border/50 text-center ${embedded ? 'pb-4' : 'py-6'}`}>
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-primary-300">Brincadeira Zona</p>
        <h1 className="font-display text-3xl text-slate-100">Mapa do Espaço</h1>
        <p className="mt-1 text-sm uppercase tracking-widest text-slate-500">Domínio dos territórios em tempo real</p>
      </div>

      <div className={embedded
        ? 'relative z-10 mt-5 h-[520px] overflow-hidden rounded-2xl border border-dark-border/40 bg-dark-card/30'
        : 'relative z-10 mx-8 my-6 flex-1 overflow-hidden rounded-2xl border border-dark-border/40 bg-dark-card/30'}>
        {ZONES.map((zone) => (
          <div
            key={zone.name}
            className="absolute rounded-xl border-2"
            style={{
              left: `${zone.x}%`,
              top: `${zone.y}%`,
              width: `${zone.w}%`,
              height: `${zone.h}%`,
              backgroundColor: `${zone.color}10`,
              borderColor: zone.borderColor,
            }}
          >
            <div className="absolute left-3 top-2 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: zone.color, boxShadow: `0 0 8px ${zone.color}80` }} />
              <span className="font-display text-sm font-bold" style={{ color: zone.color }}>{zone.name}</span>
            </div>
          </div>
        ))}

        <svg className="absolute inset-0 z-[1] h-full w-full pointer-events-none">
          <line x1="50%" y1="23%" x2="26%" y2="28%" stroke="#3B267080" strokeWidth="2" strokeDasharray="6 4" />
          <line x1="50%" y1="23%" x2="74%" y2="28%" stroke="#3B267080" strokeWidth="2" strokeDasharray="6 4" />
          <line x1="26%" y1="66%" x2="50%" y2="70%" stroke="#3B267080" strokeWidth="2" strokeDasharray="6 4" />
          <line x1="74%" y1="66%" x2="50%" y2="70%" stroke="#3B267080" strokeWidth="2" strokeDasharray="6 4" />
        </svg>

        {checkpointPositions.map(({ checkpoint, x, y }) => (
          <CheckpointMarker
            key={checkpoint.id}
            checkpoint={checkpoint}
            x={x}
            y={y}
            owner={checkpointOwnerById.get(String(checkpoint.id))}
          />
        ))}

        {childPositions.map((position) => (
          <ChildAvatar
            key={position.id}
            avatar={position.avatar}
            nickname={position.nickname}
            x={position.x}
            y={position.y}
          />
        ))}
      </div>

      <div className={`relative z-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 ${embedded ? 'pt-4' : 'px-6 pb-5'}`}>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-success-500" style={{ boxShadow: '0 0 6px rgba(16,185,129,0.5)' }} />
          <span className="text-xs text-slate-400">Livre e online</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-danger-500" style={{ boxShadow: '0 0 6px rgba(239,68,68,0.5)' }} />
          <span className="text-xs text-slate-400">Offline</span>
        </div>
        {ownedTeams.map((team) => (
          <div key={team.id} className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: team.color, boxShadow: `0 0 8px ${team.color}80` }} />
            <span className="text-xs text-slate-300">{team.name}</span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <Avatar emoji={DEFAULT_AVATAR_ID} size="sm" decorative />
          <span className="text-xs text-slate-400">Criança</span>
        </div>
      </div>
    </div>
  );
}
