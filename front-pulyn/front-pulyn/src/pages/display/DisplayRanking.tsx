import { useEffect, useState, useMemo } from 'react';
import Avatar from '../../components/ui/Avatar';
import { usePulynStore } from '../../store/mockData';

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 50 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 2}s`,
        duration: `${1.5 + Math.random() * 2}s`,
        color: ['#1E9BD7', '#29B6F6', '#F59E0B', '#10B981', '#EF4444', '#E91E8C'][Math.floor(Math.random() * 6)],
        size: `${4 + Math.random() * 8}px`,
        rotation: Math.random() * 360,
      })),
    []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: p.left,
            top: '-10px',
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            transform: `rotate(${p.rotation}deg)`,
            animation: `confettiFall ${p.duration} ease-in ${p.delay} infinite`,
          }}
        />
      ))}
    </div>
  );
}

function PodiumPosition({
  child,
  position,
  team,
  height,
}: {
  child: { nickname: string; avatar: string; score?: number; scores?: number } | null;
  position: 1 | 2 | 3;
  team: { name: string; color: string; icon: string } | null;
  height: string;
}) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    if (!child) return;
    const target = Number(child.scores ?? child.score ?? 0);
    const steps = 40;
    const increment = target / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= target) {
        setDisplayScore(target);
        clearInterval(interval);
      } else {
        setDisplayScore(Math.round(current));
      }
    }, 40);
    return () => clearInterval(interval);
  }, [child]);

  if (!child) return <div />;

  const colors: Record<number, { bg: string; border: string; text: string; glow: string }> = {
    1: {
      bg: 'from-yellow-500/30 to-yellow-600/10',
      border: 'border-yellow-500/50',
      text: 'text-yellow-400',
      glow: 'shadow-[0_0_30px_rgba(234,179,8,0.3)]',
    },
    2: {
      bg: 'from-slate-300/20 to-slate-400/5',
      border: 'border-slate-400/40',
      text: 'text-slate-300',
      glow: 'shadow-[0_0_20px_rgba(148,163,184,0.2)]',
    },
    3: {
      bg: 'from-amber-700/20 to-amber-800/5',
      border: 'border-amber-600/40',
      text: 'text-amber-500',
      glow: 'shadow-[0_0_20px_rgba(180,83,9,0.2)]',
    },
  };

  const c = colors[position];

  return (
    <div className="flex flex-col items-center" style={{ width: '220px' }}>
      {/* Avatar and info */}
      <div className={`flex flex-col items-center mb-4`}>
        <div className={`mb-2 ${position === 1 ? 'animate-float' : ''}`}>
          <Avatar emoji={child.avatar} size="lg" decorative />
        </div>
        <span className="font-display text-xl text-slate-100 mb-1">{child.nickname}</span>
        {team && (
          <span
            className="text-xs font-bold px-2.5 py-0.5 rounded-full mb-1"
            style={{ backgroundColor: team.color + '25', color: team.color, border: `1px solid ${team.color}40` }}
          >
            {team.icon} {team.name}
          </span>
        )}
        <span className={`font-mono text-3xl font-bold tabular-nums ${c.text}`}>
          {Math.round(displayScore)}
          <span className="text-sm text-slate-500 ml-1">pts</span>
        </span>
      </div>

      {/* Podium block */}
      <div
        className={`w-full rounded-t-xl bg-gradient-to-t ${c.bg} border-t-2 border-x-2 ${c.border} ${c.glow} flex items-start justify-center pt-4`}
        style={{ height }}
      >
        <span className={`font-display text-5xl font-black ${c.text} opacity-60`}>
          {position}
        </span>
      </div>
    </div>
  );
}

export default function DisplayRanking() {
  const { children, teams } = usePulynStore();

  const rankedChildren = useMemo(
    () =>
      [...children]
        .filter((c) => c.status === 'active' && (c.teamId || c.team_id || c.time_id || c.team))
        .sort((a, b) => Number(b.scores ?? b.score ?? 0) - Number(a.scores ?? a.score ?? 0)),
    [children]
  );

  const getTeam = (teamId: string | null | undefined) => {
    if (!teamId) return null;
    return teams.find((t) => t.id === teamId) || null;
  };

  const top3 = rankedChildren.slice(0, 3);
  const rest = rankedChildren.slice(3, 8);

  // Reorder for podium: 2nd, 1st, 3rd
  const podiumOrder: { child: (typeof top3)[number] | null; position: 1 | 2 | 3 }[] = [
    { child: top3[1] || null, position: 2 },
    { child: top3[0] || null, position: 1 },
    { child: top3[2] || null, position: 3 },
  ];

  const podiumHeights: Record<number, string> = {
    1: '180px',
    2: '120px',
    3: '90px',
  };

  return (
    <div className="fixed inset-0 bg-gradient-dark flex flex-col overflow-hidden">
      {top3[0] && <Confetti />}

      {/* Title */}
      <div className="relative z-10 text-center pt-10 pb-4">
        <h1 className="font-display text-5xl text-gradient-primary font-bold">Ranking Final</h1>
        <p className="text-slate-500 text-sm mt-1 uppercase tracking-widest">Classificacao geral</p>
      </div>

      {/* Podium */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-end px-8 pb-8">
        <div className="flex items-end justify-center gap-6 mb-8">
          {podiumOrder.map(({ child, position }) => (
            <PodiumPosition
              key={position}
              child={child}
              position={position}
              team={child ? getTeam(child.teamId ?? child.team_id ?? child.time_id ?? child.team) : null}
              height={podiumHeights[position]}
            />
          ))}
        </div>

        {/* Remaining rankings 4th-8th */}
        {rest.length > 0 && (
          <div className="w-full max-w-4xl">
            <div className="grid grid-cols-1 gap-2">
              {rest.map((child, index) => (
                <div
                  key={child.id}
                  className="flex items-center gap-4 rounded-xl bg-dark-card/50 border border-dark-border/50 px-5 py-3"
                >
                  <span className="font-display text-xl font-bold text-slate-500 w-8 text-center">
                    {index + 4}
                  </span>
                  <Avatar emoji={child.avatar} size="sm" decorative />
                  <span className="font-display text-lg text-slate-200 flex-1">{child.nickname}</span>
                  {child.teamId || child.team_id || child.time_id || child.team && (() => {
                    const t = getTeam(child.teamId ?? child.team_id ?? child.time_id ?? child.team);
                    return t ? (
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: t.color + '20', color: t.color, border: `1px solid ${t.color}30` }}
                      >
                        {t.icon} {t.name}
                      </span>
                    ) : null;
                  })()}
                  <span className="font-mono text-lg font-bold tabular-nums text-slate-400">
                    {Number(child.scores ?? child.score ?? 0)}
                    <span className="text-xs text-slate-600 ml-1">pts</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes confettiFall {
          0% {
            transform: translateY(-10px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
