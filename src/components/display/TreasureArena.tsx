import { useEffect, useMemo, useState } from 'react';
import { Compass, Gem, TimerReset, Trophy } from 'lucide-react';
import type { Checkpoint, Team } from '../../store/mockData';
import { numeroDoCheckpoint, nomeNoMapa } from '../../utils/checkpoints';

// Estilos CSS para animação de onda
const treasureWaveStyles = `
  @keyframes treasureWave {
    0% {
      r: 5;
      stroke-width: 2;
      opacity: 1;
    }
    100% {
      r: 25;
      stroke-width: 1;
      opacity: 0;
    }
  }
  
  .treasure-wave {
    animation: treasureWave 1.5s ease-out infinite;
  }
`;

// Injetar estilos no documento
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = treasureWaveStyles;
  document.head.appendChild(styleSheet);
}

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
  // Só os checkpoints da partida (os cadastrados no jogo, e só os que o recreacionista escolheu usar) e que estão ligados
  // aparecem no mapa. Sem a lista da partida ainda, não mostra nenhum em vez de mostrar todos os do evento.
  const emJogo = new Set((status.checkpointOwnership ?? []).map((c) => String(c.checkpointId)));
  const targetCheckpoint = checkpoints.find((checkpoint) => String(checkpoint.id) === String(status.targetCheckpointId));
  const currentTeam = status.turnTeamId
    ? teamById.get(String(status.turnTeamId).toLowerCase())
    : teams.find((team) => team.name === status.turnTeamName);
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
    // Ocupa todo o palco do telão: o mapa fica com a altura toda e o espaço que sobra ao lado do painel
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border-2 border-amber-300/30 bg-[radial-gradient(circle_at_top,#4b3215_0%,#1b1520_42%,#0b1220_100%)] p-3 shadow-[0_24px_80px_rgba(245,166,35,0.13)] sm:p-4" aria-live="polite">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />
      <div className="relative mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-amber-200/15 pb-3">
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

      <div className="relative flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        <div className="relative min-h-[260px] min-w-0 flex-1 overflow-hidden rounded-2xl border border-amber-200/20 bg-[#17131d] p-3 lg:min-h-0">
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
            {checkpoints.filter((checkpoint) => emJogo.has(String(checkpoint.id)) && checkpoint.status === 'online').map((checkpoint) => {
              const storedX = Number(checkpoint.mapaX ?? checkpoint.mapX);
              const storedY = Number(checkpoint.mapaY ?? checkpoint.mapY);
              const x = Number.isFinite(storedX) && Number.isFinite(storedY) ? storedX : (MAP_WIDTH / 2);
              const y = Number.isFinite(storedX) && Number.isFinite(storedY) ? storedY : (MAP_HEIGHT / 2);
              
              const ownerId = ownershipByCheckpoint.get(String(checkpoint.id));
              const owner = ownerId ? teamById.get(String(ownerId).toLowerCase()) : undefined;
              const isTarget = String(checkpoint.id) === String(status.targetCheckpointId);
              const isCompleted = completedIds.has(String(checkpoint.id));
              const markerColor = isTarget ? '#FBBF24' : owner?.color || (isCompleted ? '#F59E0B' : '#94A3B8');
              
              return (
                <g key={checkpoint.id} transform={`translate(${x} ${y})`}>
                  <circle r={9} fill={markerColor} fillOpacity={0.18} stroke={markerColor} strokeWidth={2} />
                  <circle r={5} fill={markerColor} />
                  <text y={-16} textAnchor="middle" fill="#FFFFFF" fontSize={10} fontWeight={600}>
                    {numeroDoCheckpoint(checkpoint)}
                  </text>
                  <text y={17} textAnchor="middle" fill="#D1D5DB" fontSize={5.5}>
                    {isTarget ? 'TESOURO' : nomeNoMapa(checkpoint.name)}
                  </text>
                  {isTarget && (
                    <>
                      {/* Onda animada pulsante */}
                      <circle cx={0} cy={0} r={5} fill="none" stroke={markerColor} strokeWidth={2} className="treasure-wave" />
                    </>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        <div className="flex min-h-0 w-full shrink-0 flex-col gap-4 lg:w-[clamp(16rem,24vw,24rem)]">
          <div className="shrink-0 rounded-2xl border-2 p-5 text-center" style={{ borderColor: `${currentTeamColor}99`, backgroundColor: `${currentTeamColor}18`, boxShadow: `0 0 35px ${currentTeamColor}18` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-300">{status.initialWait ? 'Equipe sorteada' : 'Equipe da vez'}</p>
            <p className="mt-2 truncate font-display text-3xl font-bold" style={{ color: currentTeamColor }}>{status.completed ? status.winningTeamName : status.turnTeamName || status.startingTeamName || 'Preparando...'}</p>
            <div className="mx-auto mt-4 flex items-center justify-center gap-2 text-amber-100"><TimerReset size={18} /><span className="text-sm">{status.initialWait ? 'Começa em' : 'Próxima ação em'}</span></div>
            <p className="mt-1 font-mono text-6xl font-bold leading-none text-white">{countdown > 0 ? `${countdown}s` : 'AGORA'}</p>
          </div>

          <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="mb-3 flex shrink-0 items-center justify-between gap-3"><div className="flex items-center gap-2"><p className="text-xs font-bold uppercase tracking-wider text-slate-300">Progresso das equipes</p><span className="rounded-full bg-amber-300/10 px-2 py-1 text-[10px] font-bold text-amber-200">{progress.length}</span></div><Trophy size={17} className="text-amber-300" /></div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
              {progress.map((team) => {
                const percentage = team.total > 0 ? Math.min(100, (team.scanned / team.total) * 100) : 0;
                return <div key={team.teamId}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm"><span className="truncate font-semibold text-white">{team.teamName}</span><span style={{ color: team.teamColor }}>{team.scanned}/{team.total}</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${percentage}%`, backgroundColor: team.teamColor }} /></div>
                </div>;
              })}
            </div>
          </div>

          {targetCheckpoint && <div className="shrink-0 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-4"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">Objetivo atual</p><p className="mt-1 flex items-center gap-2 font-display text-xl font-bold text-white"><Gem size={18} className="text-amber-300" />{targetCheckpoint.name}</p></div>}
        </div>
      </div>

      {lastEvent?.payload.message && <div className="relative mt-3 flex shrink-0 items-center gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3"><span className="text-2xl">✨</span><div><p className="text-sm font-semibold text-white">{lastEvent.payload.message}</p>{lastEvent.payload.criancaName && <p className="text-xs text-amber-100/70">{lastEvent.payload.criancaName} participou da expedição</p>}</div></div>}

    </section>
  );
}
