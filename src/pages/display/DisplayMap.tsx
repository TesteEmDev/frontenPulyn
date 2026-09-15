import { useMemo, useEffect, useState } from 'react';
import Avatar from '../../components/ui/Avatar';
import { DEFAULT_AVATAR_ID } from '../../avatar/adventurerAvatars';
import type { Checkpoint, Team } from '../../store/mockData';
import { usePulynStore } from '../../store/mockData';

interface Zone {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const MAP_WIDTH = 450;
const MAP_HEIGHT = 320;

// Zonas padrão (fallback se não carregar do backend)
const DEFAULT_ZONES: Zone[] = [
  { id: '1', name: 'Entrada', color: '#1E9BD7', x: 50, y: 5, width: 120, height: 80 },
  { id: '2', name: 'Área Verde', color: '#22C55E', x: 200, y: 20, width: 200, height: 150 },
  { id: '3', name: 'Área Azul', color: '#1E9BD7', x: 50, y: 130, width: 120, height: 120 },
  { id: '4', name: 'Área Central', color: '#F59E0B', x: 200, y: 200, width: 200, height: 100 },
];
function normalizeZoneName(value?: string | null) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

// Converter posição em px para % (com muita precisão)
function pxToPercent(px: number, totalSize: number): number {
  return (px / totalSize) * 100;
}

// Converter tamanho em px para % (com muita precisão)
function sizeToPercent(size: number, totalSize: number): number {
  return (size / totalSize) * 100;
}

function getStoredMapPosition(checkpoint: Checkpoint) {
  const x = Number(checkpoint.map_x ?? checkpoint.mapX);
  const y = Number(checkpoint.map_y ?? checkpoint.mapY);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  return { x, y };
}

function getCheckpointDisplayPosition(checkpoint: Checkpoint, checkpoints: Checkpoint[], zones: Zone[]) {
  const storedPosition = getStoredMapPosition(checkpoint);
  if (storedPosition) {
    // Converter px para %
    return {
      x: pxToPercent(storedPosition.x, MAP_WIDTH),
      y: pxToPercent(storedPosition.y, MAP_HEIGHT),
    };
  }

  // Se não tem posição salva, usar zona como fallback
  const zone = zones.find((item) => normalizeZoneName(item.name) === normalizeZoneName(checkpoint.zone)) || zones[0];
  if (!zone) return { x: 50, y: 50 };

  const sameZone = checkpoints.filter((item) => normalizeZoneName(item.zone) === normalizeZoneName(checkpoint.zone));
  const index = sameZone.indexOf(checkpoint);
  const count = sameZone.length;
  const xOffset = count > 1 ? (index / (count - 1)) * 0.6 + 0.2 : 0.5;

  const zoneX = pxToPercent(zone.x, MAP_WIDTH);
  const zoneW = sizeToPercent(zone.width, MAP_WIDTH);
  const zoneY = pxToPercent(zone.y, MAP_HEIGHT);
  const zoneH = sizeToPercent(zone.height, MAP_HEIGHT);

  return {
    x: zoneX + zoneW * xOffset,
    y: zoneY + zoneH * 0.75,
  };
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
  const eventoAtual = (usePulynStore.getState() as any).eventoAtual;
  const [zones, setZones] = useState<Zone[]>(DEFAULT_ZONES);
  const [floorPlan, setFloorPlan] = useState<string | null>(null);

  // Carregar zonas e planta do evento
  useEffect(() => {
    const loadData = async () => {
      try {
        if (!eventoAtual) {
          setZones(DEFAULT_ZONES);
          setFloorPlan(null);
          return;
        }

        // Buscar zonas do evento (se houver endpoint)
        try {
          const zonesData = await (window as any).api?.getZones?.(eventoAtual);
          if (zonesData && Array.isArray(zonesData) && zonesData.length > 0) {
            setZones(zonesData);
          } else {
            setZones(DEFAULT_ZONES);
          }
        } catch (e) {
          setZones(DEFAULT_ZONES);
        }

        // Buscar planta baixa do evento
        try {
          const floorPlanData = await (window as any).api?.getFloorPlan?.(eventoAtual);
          if (floorPlanData?.dataUrl) {
            setFloorPlan(floorPlanData.dataUrl);
          } else {
            setFloorPlan(null);
          }
        } catch (e) {
          setFloorPlan(null);
        }
      } catch (error) {
        console.error('Erro ao carregar dados do mapa:', error);
        setZones(DEFAULT_ZONES);
        setFloorPlan(null);
      }
    };

    loadData();
  }, [eventoAtual]);

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
        const knownZone = zones.some((zone) => normalizeZoneName(zone.name) === normalizeZoneName(cp.zone))
          ? zones.find((zone) => normalizeZoneName(zone.name) === normalizeZoneName(cp.zone))?.name || 'Entrada'
          : 'Entrada';
        zoneMap[childId] = { zone: knownZone, checkpointId: cp.id };
      }
    }

    return zoneMap;
  }, [scoreLog, checkpoints, zones]);

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
        const basePosition = getCheckpointDisplayPosition(lastCheckpoint, checkpoints, zones);
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

    for (const zone of zones) {
      const kids = zoneChildren[zone.name] || [];
      const cols = Math.min(kids.length, 4);
      kids.forEach((kid, index) => {
        const row = Math.floor(index / 4);
        const col = index % 4;
        const xOff = cols > 1 ? (col / (cols - 1)) * 0.6 + 0.2 : 0.5;
        const zoneX = pxToPercent(zone.x, MAP_WIDTH);
        const zoneW = sizeToPercent(zone.width, MAP_WIDTH);
        const zoneY = pxToPercent(zone.y, MAP_HEIGHT);
        const zoneH = sizeToPercent(zone.height, MAP_HEIGHT);
        
        positions.push({
          id: kid.id,
          avatar: kid.avatar,
          nickname: kid.nickname,
          x: zoneX + zoneW * xOff,
          y: zoneY + zoneH * (0.3 + row * 0.25),
        });
      });
    }

    return positions;
  }, [children, childLastZone, checkpoints, zones]);

  const checkpointPositions = useMemo(() => checkpoints.map((checkpoint) => ({
    checkpoint,
    ...getCheckpointDisplayPosition(checkpoint, checkpoints, zones),
  })), [checkpoints, zones]);

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
        
        {/* Planta baixa como background */}
        {floorPlan && (
          <img 
            src={floorPlan} 
            alt="Planta do espaço" 
            className="absolute inset-0 h-full w-full object-cover opacity-25 z-0"
          />
        )}
        
        {/* SVG com viewBox para escalar proporcionalmente */}
        <svg
          className="absolute inset-0 w-full h-full z-10"
          viewBox={`0 0 100 100`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Zonas convertidas para % */}
          {zones.map((zone) => {
            const zoneX = pxToPercent(zone.x, MAP_WIDTH);
            const zoneY = pxToPercent(zone.y, MAP_HEIGHT);
            const zoneW = sizeToPercent(zone.width, MAP_WIDTH);
            const zoneH = sizeToPercent(zone.height, MAP_HEIGHT);

            return (
              <g key={zone.id}>
                <rect
                  x={zoneX}
                  y={zoneY}
                  width={zoneW}
                  height={zoneH}
                  fill={zone.color}
                  fillOpacity={0.15}
                  stroke={zone.color}
                  strokeWidth={0.4}
                  rx={1.5}
                />
                <text
                  x={zoneX + zoneW / 2}
                  y={zoneY + 4}
                  textAnchor="middle"
                  fill={zone.color}
                  fontSize={2.5}
                  fontWeight={600}
                  fontFamily="system-ui"
                >
                  {zone.name}
                </text>
              </g>
            );
          })}

          {/* Checkpoints convertidos para % */}
          {checkpointPositions.map(({ checkpoint, x, y }) => {
            const owner = checkpointOwnerById.get(String(checkpoint.id));
            const isOnline = checkpoint.status === 'online';
            const color = owner?.color || (isOnline ? '#22C55E' : '#EF4444');
            
            return (
              <g key={checkpoint.id} transform={`translate(${x} ${y})`}>
                <circle r={3.8} fill={color} fillOpacity={0.18} stroke={color} strokeWidth={0.45} />
                <circle r={1.1} fill={color} />
                <text y={-4.8} textAnchor="middle" fill="#FFFFFF" fontSize={2.2} fontWeight={600}>
                  {checkpoint.id}
                </text>
                <text y={6.7} textAnchor="middle" fill="#D1D5DB" fontSize={2} >
                  {checkpoint.name}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Crianças (posicionadas com %) */}
        <div className="absolute inset-0 z-20 pointer-events-none">
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
