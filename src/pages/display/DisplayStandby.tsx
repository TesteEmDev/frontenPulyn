import { useEffect, useState, useMemo } from 'react';
import { usePulynStore } from '../../store/mockData';

function FloatingParticles() {
  const particles = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 4}s`,
        duration: `${3 + Math.random() * 5}s`,
        size: `${2 + Math.random() * 6}px`,
        opacity: 0.1 + Math.random() * 0.3,
        color:
          Math.random() > 0.5
            ? 'rgba(124, 58, 237, VAR)'
            : 'rgba(6, 182, 212, VAR)',
      })),
    []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => {
        const color = p.color.replace('VAR', String(p.opacity));
        return (
          <div
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: p.left,
              bottom: '-10px',
              width: p.size,
              height: p.size,
              backgroundColor: color,
              animation: `particle ${p.duration} linear ${p.delay} infinite`,
            }}
          />
        );
      })}
    </div>
  );
}

export default function DisplayStandby() {
  const { events } = usePulynStore();
  const [glowIntensity, setGlowIntensity] = useState(0);

  const activeEvent = events.find((e) => e.status === 'active');

  // Pulse glow effect
  useEffect(() => {
    let frame: number;
    let start: number | null = null;

    const animate = (timestamp: number) => {
      if (start === null) start = timestamp;
      const elapsed = timestamp - start;
      const intensity = 0.4 + 0.6 * Math.sin(elapsed / 1500) * 0.5 + 0.5;
      setGlowIntensity(intensity);
      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="fixed inset-0 bg-gradient-dark flex flex-col items-center justify-center overflow-hidden">
      <FloatingParticles />

      {/* Large PULYN Logo */}
      <div className="relative z-10 flex flex-col items-center">
        <h1
          className="font-display text-8xl md:text-9xl font-black text-gradient-primary select-none"
          style={{
            filter: `drop-shadow(0 0 ${20 + glowIntensity * 30}px rgba(124, 58, 237, ${0.3 + glowIntensity * 0.3}))`,
          }}
        >
          PULYN
        </h1>

        {/* Glow ring behind logo */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, rgba(124, 58, 237, ${0.08 + glowIntensity * 0.12}) 0%, transparent 70%)`,
            boxShadow: `0 0 ${60 + glowIntensity * 80}px rgba(124, 58, 237, ${0.1 + glowIntensity * 0.15}), 0 0 ${120 + glowIntensity * 60}px rgba(6, 182, 212, ${0.05 + glowIntensity * 0.1})`,
          }}
        />
      </div>

      {/* Subtitle */}
      <div className="relative z-10 mt-8 flex flex-col items-center gap-4">
        <p className="font-display text-2xl text-slate-400 animate-pulse-slow tracking-wide">
          Proximo jogo em breve
        </p>

        {/* Decorative dots */}
        <div className="flex items-center gap-2 mt-2">
          <div className="w-2 h-2 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-secondary-400 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>

        {/* Active event */}
        {activeEvent && (
          <div className="mt-8 flex flex-col items-center gap-2 animate-fade-in">
            <span className="text-xs text-slate-600 uppercase tracking-widest">Evento ativo</span>
            <div className="flex items-center gap-3 bg-dark-card/60 border border-dark-border/50 rounded-full px-6 py-3 backdrop-blur-sm">
              <div className="w-2.5 h-2.5 rounded-full bg-success-500 animate-pulse" />
              <span className="font-display text-lg text-slate-200">{activeEvent.name}</span>
            </div>
            <span className="font-mono text-sm text-slate-500">
              {activeEvent.date} &middot; {activeEvent.time}
            </span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes particle {
          0% { transform: translateY(100vh) scale(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-10vh) scale(1); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
