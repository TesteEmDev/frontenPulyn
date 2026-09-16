import { useEffect, useMemo, useState } from 'react';
import { Compass, Gem, TimerReset, Trophy } from 'lucide-react';
import type { Checkpoint, Team } from '../../store/mockData';

export interface TreasureCheckpointOwnership {
  checkpointId: string;
  teamId?: string | null;
}

export interface TreasureTeamsProgress {
  teamId: string;
  teamName: string;
  teamColor: string;
  scanned: number;
  total: number;
  complete: boolean;
}

export interface TreasureRaceTime {
  teamId: string;
  teamName: string;
  teamColor: string;
  completed?: boolean;
  elapsedSeconds?: number | null;
  elapsedMinutes?: number | null;
}

export interface TreasureArenaStatus {
  active: boolean;
  gameType?: string;
  completed?: boolean;
  roundNumber?: number;
  startingTeamId?: string | null;
  startingTeamName?: string | null;
  turnTeamId?: string | null;
  turnTeamName?: string | null;
  winningTeamId?: string | null;
  winningTeamName?: string | null;
  turnAvailableAt?: string | null;
  turnRemainingSeconds?: number;
  turnWaitSeconds?: number | null;
  initialWait?: boolean;
  targetCheckpointId?: string | null;
  completedCheckpointIds?: string[];
  totalCheckpoints?: number;
  ownedCheckpoints?: number;
  checkpointOwnership?: TreasureCheckpointOwnership[];
  teamsProgress?: TreasureTeamsProgress[];
  teamRaceTimes?: TreasureRaceTime[];
}

export interface TreasureArenaEvent {
  type: 'TREASURE_PROGRESS' | 'TREASURE_ROUND_COMPLETED';
  payload: {
    checkpointId?: string;
    criancaName?: string;
    teamName?: string;
    teamColor?: string;
    scanned?: number;
    total?: number;
    accepted?: boolean;
    finished?: boolean;
    message?: string;
  };
}

interface TreasureArenaProps {
  status: TreasureArenaStatus;
  checkpoints: Checkpoint[];
  teams: Team[];
  lastEvent?: TreasureArenaEvent | null;
  floorPlan?: string | null;
}

const MAP_WIDTH = 450;
const MAP_HEIGHT = 320;

export function TreasureArena({ status, checkpoints, teams, lastEvent, floorPlan }: TreasureArenaProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const teamById = useMemo(() => new Map(
    teams.map((team) => [String(team.id).toLowerCase(), team]),
  ), [teams]);
  const ownershipByCheckpoint = useMemo(() => new Map(
    (status.checkpointOwnership || []).map((item) => [String(item.checkpointId), item.teamId || null]),
  ), [status.checkpointOwnership]);
  const completedIds = useMemo(() => new Set((status.completedCheckpointIds || []).map(String)), [status.completedCheckpointIds]);
  const targetCheckpoint = checkpoints.find((checkpoint) => String(checkpoint.id) === String(status.targetCheckpointId));
  const currentTeam = status.turnTeamId
    ? teamById.get(String(status.turnTeamId).toLowerCase())
    : teams.find((team) => team.name === status.turnTeamName);
  const winnerTeam = status.winningTeamId
    ? teamById.get(String(status.winningTeamId).toLowerCase())
    : teams.find((team) => team.name === status.winningTeamName);
  const currentTeamColor = currentTeam?.color || '#F5A623';
  const countdown = status.turnAvailableAt
    ? Math.max(0, Math.ceil((Date.parse(status.turnAvailableAt) - now) / 1000))
    : Math.max(0, Number(status.turnRemainingSeconds || 0));
  const progress = status.teamsProgress?.length
    ? status.teamsProgress
    : teams.map((team) => ({
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color,
        scanned: 0,
        total: 0,
        complete: false,
      }));

  return (
    <section className="relative overflow-hidden rounded-3xl border-2 border-amber-300/30 bg-[radial-gradient(circle_at_top,#4b3215_0%,#1b1520_42%,#0b1220_100%)] p-4 shadow-[0_24px_80px_rgba(245,166,35,0.13)] sm:p-6" aria-live="polite">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />
      <div className="relative mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-amber-200/15 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-300/30 bg-amber-300/10 text-amber-200 shadow-[0_0_30px_rgba(245,166,35,0.2)]">
            <Compass size={26} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-amber-300">Aventura em andamento</p>
            <h2 className="font-display text-3xl font-bold text-white">Caça ao Tesouro</h2>
          </div>
        </div>
        <div className="rounded-full border border-amber-200/20 bg-black/20 px-4 py-2 text-sm font-semibold text-amber-100">
          Rodada {status.roundNumber || 1}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="relative min-h-[430px] overflow-hidden rounded-2xl border border-amber-200/20 bg-[#17131d] p-3">
          {/* Planta baixa como background se disponível, senão grid pattern */}
          {floorPlan ? (
            <img 
              src={floorPlan}
              alt="Planta do espaço"
              className="pointer-events-none absolute inset-0 h-full w-full object-contain opacity-40"
            />
          ) : (
            <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(#8b642844 1px, transparent 1px), linear-gradient(90deg, #8b642844 1px, transparent 1px)', backgroundSize: '42px 42px' }} />
          )}
          {/* SVG com viewBox em pixels, mantendo proporções sem esticar - igual ao DisplayMap */}
          <svg
            className="absolute inset-0 w-full h-full z-10"
            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Checkpoints em coordenadas de pixels */}
            {checkpoints.map((checkpoint) => {
              const storedX = Number(checkpoint.map_x ?? checkpoint.mapX);
              const storedY = Number(checkpoint.map_y ?? checkpoint.mapY);
              const x = Number.isFinite(storedX) && Number.isFinite(storedY) ? storedX : (MAP_WIDTH / 2);
              const y = Number.isFinite(storedX) && Number.isFinite(storedY) ? storedY : (MAP_HEIGHT / 2);
              
              const ownerId = ownershipByCheckpoint.get(String(checkpoint.id));
              const owner = ownerId ? teamById.get(String(ownerId).toLowerCase()) : undefined;
              const isTarget = String(checkpoint.id) === String(status.targetCheckpointId);
              const isCompleted = completedIds.has(String(checkpoint.id));
              const markerColor = isTarget ? '#FBBF24' : owner?.color || (isCompleted ? '#F59E0B' : '#94A3B8');
              
              return (
                <g key={checkpoint.id} transform={`translate(${x} ${y})`}>
                  {isTarget && (
                    <>
                      {/* Caveira pirata em vermelho no centro do checkpoint - bem grande */}
                      <text x={0} y={4} textAnchor="middle" dominantBaseline="middle" fill="#EF4444" fontSize={48} fontWeight={900} fontFamily="serif" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
                        ☠
                      </text>
                      {/* Aura ao redor do alvo */}
                      <circle r={25} fill="none" stroke={markerColor} strokeWidth={1.5} opacity="0.4" />
                      <circle r={20} fill="none" stroke={markerColor} strokeWidth={1.5} opacity="0.2" />
                    </>
                  )}
                  <circle r={11} fill={markerColor} fillOpacity={0.18} stroke={markerColor} strokeWidth={2} />
                  <circle r={5} fill={markerColor} />
                  <text y={-16} textAnchor="middle" fill="#FFFFFF" fontSize={10} fontWeight={600}>
                    {checkpoint.id}
                  </text>
                  <text y={18} textAnchor="middle" fill="#D1D5DB" fontSize={8}>
                    {checkpoint.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border-2 p-5 text-center" style={{ borderColor: `${currentTeamColor}99`, backgroundColor: `${currentTeamColor}18`, boxShadow: `0 0 35px ${currentTeamColor}18` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-300">{status.initialWait ? 'Equipe sorteada' : 'Equipe da vez'}</p>
            <p className="mt-2 truncate font-display text-3xl font-bold" style={{ color: currentTeamColor }}>{status.completed ? status.winningTeamName : status.turnTeamName || status.startingTeamName || 'Preparando...'}</p>
            <div className="mx-auto mt-4 flex items-center justify-center gap-2 text-amber-100"><TimerReset size={18} /><span className="text-sm">{status.initialWait ? 'Começa em' : 'Próxima ação em'}</span></div>
            <p className="mt-1 font-mono text-6xl font-bold leading-none text-white">{countdown > 0 ? `${countdown}s` : 'AGORA'}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="mb-3 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><p className="text-xs font-bold uppercase tracking-wider text-slate-300">Progresso das equipes</p><span className="rounded-full bg-amber-300/10 px-2 py-1 text-[10px] font-bold text-amber-200">{progress.length}</span></div><Trophy size={17} className="text-amber-300" /></div>
            <div className="max-h-[290px] space-y-4 overflow-y-auto pr-1">
              {progress.map((team) => {
                const percentage = team.total > 0 ? Math.min(100, (team.scanned / team.total) * 100) : 0;
                return <div key={team.teamId}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm"><span className="truncate font-semibold text-white">{team.teamName}</span><span style={{ color: team.teamColor }}>{team.scanned}/{team.total}</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${percentage}%`, backgroundColor: team.teamColor }} /></div>
                </div>;
              })}
            </div>
          </div>

          {targetCheckpoint && <div className="rounded-2xl border border-amber-300/25 bg-amber-300/10 p-4"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">Objetivo atual</p><p className="mt-1 flex items-center gap-2 font-display text-xl font-bold text-white"><Gem size={18} className="text-amber-300" />{targetCheckpoint.name}</p></div>}
        </div>
      </div>

      {lastEvent?.payload.message && <div className="mt-5 flex items-center gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3"><span className="text-2xl">✨</span><div><p className="text-sm font-semibold text-white">{lastEvent.payload.message}</p>{lastEvent.payload.criancaName && <p className="text-xs text-amber-100/70">{lastEvent.payload.criancaName} participou da expedição</p>}</div></div>}

       {status.completed && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6 backdrop-blur-md">
           <div className="w-full max-w-2xl animate-in fade-in zoom-in duration-500">
             <div className="rounded-3xl border-2 border-amber-300/70 bg-gradient-to-br from-amber-950/95 via-[#21172c] to-[#101a2b] p-8 text-center shadow-[0_0_100px_rgba(245,166,35,0.35)]">
               <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-amber-300/15 text-amber-200 shadow-[0_0_50px_rgba(245,166,35,0.3)]">
                 <Trophy size={48} />
               </div>
               <p className="text-xs font-bold uppercase tracking-[0.35em] text-amber-300">🎉 Tesouro encontrado 🎉</p>
               <h3 className="mt-4 font-display text-5xl font-bold text-white">
                 {winnerTeam?.name || status.winningTeamName || 'Equipe vencedora'}
               </h3>
               <p className="mt-4 text-2xl text-amber-100">venceu a expedição!</p>
               <div className="mt-8 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-6">
                 <p className="text-sm text-amber-200">A próxima rodada começará em breve...</p>
               </div>
             </div>
           </div>
         </div>
       )}
    </section>
  );
}
