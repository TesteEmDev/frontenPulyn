import { useMemo, useEffect, useState } from 'react';
import Avatar from '../../components/ui/Avatar';
import { DEFAULT_AVATAR_ID } from '../../avatar/adventurerAvatars';
import type { Checkpoint, Team } from '../../store/mockData';
import { usePulynStore } from '../../store/mockData';
import { api } from '../../services/api';

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

// Converter posição em px para % (não mais utilizado - avatares agora em foreignObject)
// function pxToPercent(px: number, totalSize: number): number {
//   return (px / totalSize) * 100;
// }

function getStoredMapPosition(checkpoint: Checkpoint) {
  const x = Number(checkpoint.map_x ?? checkpoint.mapX);
  const y = Number(checkpoint.map_y ?? checkpoint.mapY);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  return { x, y };
}

function getCheckpointDisplayPosition(checkpoint: Checkpoint, checkpoints: Checkpoint[], zones: Zone[]) {
  const storedPosition = getStoredMapPosition(checkpoint);
  if (storedPosition) {
    return storedPosition;  // Já em pixels
  }

  // Se não tem posição salva, usar zona como fallback
  const zone = zones.find((item) => normalizeZoneName(item.name) === normalizeZoneName(checkpoint.zone)) || zones[0];
  if (!zone) return { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 };

  const sameZone = checkpoints.filter((item) => normalizeZoneName(item.zone) === normalizeZoneName(checkpoint.zone));
  const index = sameZone.indexOf(checkpoint);
  const count = sameZone.length;
  const xOffset = count > 1 ? (index / (count - 1)) * 0.6 + 0.2 : 0.5;

  return {
    x: zone.x + zone.width * xOffset,
    y: zone.y + zone.height * 0.75,
  };
}

// ⚠️ ChildAvatar não mais utilizado - avatares agora renderizados como foreignObject dentro do SVG
/*
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
      style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, 0%)' }}
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
*/

interface DisplayMapProps {
  embedded?: boolean;
  gameType?: string;
  floorPlan?: string | null;
}

export default function DisplayMap({ embedded = false, gameType, floorPlan }: DisplayMapProps) {
  const { children, checkpoints, scoreLog, teams } = usePulynStore();
  const eventoAtual = usePulynStore((state: any) => state.eventoAtualId);
  const activeGame = usePulynStore((state: any) => state.activeGame);
  const [zones, setZones] = useState<Zone[]>(DEFAULT_ZONES);
  const [localFloorPlan, setLocalFloorPlan] = useState<string | null>(floorPlan || null);

  // Usar gameType da prop se disponível
  const isTreasureMode = gameType === 'treasure_hunt';
  const isZoneMode = gameType === 'zone' || gameType === 'zone_conquest' || gameType === 'territory' || gameType === 'territory_conquest';
  const shouldShowPlanta = isZoneMode || isTreasureMode || activeGame?.type === 'team' || activeGame?.type === 'treasure_hunt';
  
  // Debug: verificar estado
  useEffect(() => {
    console.log('DisplayMap Debug:', {
      gameType,
      isTreasureMode,
      shouldShowPlanta,
      localFloorPlan: localFloorPlan ? 'carregado' : 'não carregado',
      eventoAtual,
      floorPlanUrl: localFloorPlan?.substring(0, 50) + '...'
    });
  }, [gameType, isTreasureMode, shouldShowPlanta, localFloorPlan, eventoAtual]);

  // Sincronizar floorPlan prop com localFloorPlan state
  useEffect(() => {
    if (floorPlan) {
      console.log('✅ DisplayMap: Sincronizando floorPlan prop:', floorPlan.substring(0, 50) + '...');
      setLocalFloorPlan(floorPlan);
    }
  }, [floorPlan]);

  // Carregar zonas do backend com polling
  useEffect(() => {
    const loadData = async () => {
      try {
        if (!eventoAtual) {
          setZones(DEFAULT_ZONES);
          setLocalFloorPlan(null);
          return;
        }

        // Buscar zonas do backend (com fallback localStorage)
        try {
          console.log('🔄 Carregando zonas do backend...');
          const zonesData = await api.getZones(eventoAtual);
          if (zonesData && Array.isArray(zonesData) && zonesData.length > 0) {
            console.log('✅ Zonas carregadas do backend:', zonesData);
            setZones(zonesData);
            // Atualizar localStorage como cache
            localStorage.setItem(`zones_${eventoAtual}`, JSON.stringify(zonesData));
          } else {
            console.log('📝 Nenhuma zona no backend, tentando localStorage...');
            const key = `zones_${eventoAtual}`;
            const stored = localStorage.getItem(key);
            if (stored) {
              const parsed = JSON.parse(stored);
              console.log('✅ Zonas carregadas do localStorage:', parsed);
              setZones(parsed);
            } else {
              setZones(DEFAULT_ZONES);
            }
          }
        } catch (apiError) {
          console.warn('⚠️ Erro ao carregar do backend, tentando localStorage...');
          const key = `zones_${eventoAtual}`;
          const stored = localStorage.getItem(key);
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              console.log('✅ Zonas carregadas do localStorage (fallback):', parsed);
              setZones(parsed);
            } catch (e) {
              setZones(DEFAULT_ZONES);
            }
          } else {
            setZones(DEFAULT_ZONES);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados do mapa:', error);
        setZones(DEFAULT_ZONES);
      }
    };

    // Carregar imediatamente
    loadData();
    
    // Polling a cada 2 segundos para sincronizar mudanças de zona
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, [eventoAtual, shouldShowPlanta]);

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

  // Determinar cor da zona baseado no último checkpoint conquistado nela
  const zoneColorByOwnership = useMemo(() => {
    const colorMap = new Map<string, string>();
    const NEUTRAL_COLOR = '#94A3B8'; // Cinza neutro
    
    for (const zone of zones) {
      // Encontrar checkpoints que estão nesta zona
      const checkpointsInZone = checkpoints.filter(
        (cp) => normalizeZoneName(cp.zone) === normalizeZoneName(zone.name)
      );
      
      // Buscar o checkpoint mais recentemente conquistado nesta zona
      let lastConquestTeamColor = NEUTRAL_COLOR;
      let mostRecentTimestamp = -1;
      
      for (const checkpoint of checkpointsInZone) {
        const ownerId = checkpointOwnerById.get(String(checkpoint.id));
        if (ownerId) {
          const owner = teamById.get(String(ownerId).toLowerCase());
          if (owner) {
            // Encontrar o scoreLog mais recente para este checkpoint
            const latestEntry = scoreLog
              .filter((entry: any) => String(entry.checkpointId || entry.checkpoint_id) === String(checkpoint.id))
              .sort((a: any, b: any) => {
                const timeA = new Date(a.timestamp || a.created_at || 0).getTime();
                const timeB = new Date(b.timestamp || b.created_at || 0).getTime();
                return timeB - timeA;
              })[0];
            
            if (latestEntry) {
              const timestamp = new Date(latestEntry.timestamp || latestEntry.created_at || 0).getTime();
              if (timestamp > mostRecentTimestamp) {
                mostRecentTimestamp = timestamp;
                lastConquestTeamColor = owner.color;
              }
            }
          }
        }
      }
      
      colorMap.set(normalizeZoneName(zone.name), lastConquestTeamColor);
    }
    
    return colorMap;
  }, [zones, checkpoints, checkpointOwnerById, teamById, scoreLog]);

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
        
        // Layout em pirâmide com muito mais espaçamento
        const offsets = [-35, 0, 35];  // Espaçamento horizontal
        const offsetX = offsets[slot % offsets.length];
        const row = Math.floor(slot / 3);

        // Coordenadas em PIXELS (para foreignObject dentro do SVG)
        positions.push({
          id: child.id,
          avatar: child.avatar,
          nickname: child.nickname || child.name,
          x: basePosition.x + offsetX,
          y: basePosition.y + 68 + row * 50,  // Espaçamento bem maior (50) para acomodar animação
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
        
        positions.push({
          id: kid.id,
          avatar: kid.avatar,
          nickname: kid.nickname,
          x: zone.x + zone.width * xOff,
          y: zone.y + zone.height * (0.3 + row * 0.25),
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
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-primary-300">
          {activeGame?.type === 'treasure_hunt' ? 'Caça ao Tesouro' : 'Brincadeira Zona'}
        </p>
        <h1 className="font-display text-3xl text-slate-100">Mapa do Espaço</h1>
        <p className="mt-1 text-sm uppercase tracking-widest text-slate-500">
          {activeGame?.type === 'treasure_hunt' ? 'Localização dos checkpoints em tempo real' : 'Domínio dos territórios em tempo real'}
        </p>
      </div>

      <div className={embedded
        ? 'relative z-10 mt-5 h-[520px] overflow-hidden rounded-2xl border border-dark-border/40 bg-dark-card/30'
        : 'relative z-10 mx-8 my-6 flex-1 overflow-hidden rounded-2xl border border-dark-border/40 bg-dark-card/30'}>
        
        {/* Planta baixa como background */}
        {localFloorPlan && (
          <img 
            src={localFloorPlan} 
            alt="Planta do espaço" 
            className="absolute inset-0 h-full w-full object-contain opacity-40 z-0 pointer-events-none"
          />
        )}
        
        {/* SVG com viewBox em pixels, mantendo proporções sem esticar */}
        <svg
          className="absolute inset-0 w-full h-full z-10"
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Zonas em coordenadas de pixels (como AdminMap) - só mostrar em modo zona */}
          {activeGame?.type !== 'treasure_hunt' && zones.map((zone) => {
            const zoneOwnerColor = zoneColorByOwnership.get(normalizeZoneName(zone.name)) || '#94A3B8';
            
            return (
              <g key={zone.id}>
                <rect
                  x={zone.x}
                  y={zone.y}
                  width={zone.width}
                  height={zone.height}
                  fill={zoneOwnerColor}
                  fillOpacity={0.15}
                  stroke={zoneOwnerColor}
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  rx={8}
                />
                <text
                  x={zone.x + zone.width / 2}
                  y={zone.y + zone.height / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={zoneOwnerColor}
                  fontSize={12}
                  fontWeight={600}
                  fontFamily="system-ui"
                >
                  {zone.name}
                </text>
              </g>
            );
          })}

          {/* Checkpoints em coordenadas de pixels (como AdminMap) */}
          {checkpointPositions.map(({ checkpoint, x, y }) => {
            const owner = checkpointOwnerById.get(String(checkpoint.id));
            const isOnline = checkpoint.status === 'online';
            const color = owner?.color || (isOnline ? '#22C55E' : '#EF4444');
            
            return (
              <g key={checkpoint.id} transform={`translate(${x} ${y})`}>
                <circle r={17} fill={color} fillOpacity={0.18} stroke={color} strokeWidth={2} />
                <circle r={5} fill={color} />
                <text y={-22} textAnchor="middle" fill="#FFFFFF" fontSize={10} fontWeight={600}>
                  {checkpoint.id}
                </text>
                <text y={30} textAnchor="middle" fill="#D1D5DB" fontSize={9}>
                  {checkpoint.name}
                </text>
              </g>
            );
          })}

          {/* Avatares como foreignObject dentro do SVG (mesmas coordenadas em pixels) */}
          {childPositions.map((position) => (
            <foreignObject
              key={position.id}
              x={position.x - 28}
              y={position.y - 60}
              width={56}
              height={150}
            >
              <div className="flex flex-col items-center w-full pointer-events-none" style={{ transform: 'scale(0.8)' }}>
                <div className="animate-float">
                  <Avatar emoji={position.avatar || DEFAULT_AVATAR_ID} size="sm" decorative />
                </div>
                <span className="whitespace-normal text-center font-display text-[11px] text-slate-300 leading-tight px-1">
                  {position.nickname || 'Participante'}
                </span>
              </div>
            </foreignObject>
          ))}
        </svg>
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
