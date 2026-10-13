// Placar da Zona (Domínio total) sobre o mapa do telão: quantas zonas cada equipe domina, os pontos e o vencedor.
// Só aparece quando o jogo em andamento é o Domínio total (senão o servidor responde ativo = false e nada é desenhado).
import { useDominioEstado } from '../../hooks/useDominioEstado';

export default function ZonaDominioPlacar({ eventoId }: { eventoId: string }) {
  const estado = useDominioEstado(eventoId);
  if (!estado?.ativo) return null;

  const equipes = estado.equipes || [];
  const zonas = estado.zonas || [];
  const total = estado.totalZonas || 0;
  const vencedor = estado.vencedor;

  return (
    <>
      <div className="absolute left-3 top-3 z-20 w-[clamp(15rem,24vw,26rem)] rounded-2xl border border-white/10 bg-slate-950/85 p-3 shadow-2xl backdrop-blur-md" aria-live="polite">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-primary-300">Domínio total</p>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-gray-400">{total} {total === 1 ? 'zona' : 'zonas'}</p>
        </div>

        <div className="space-y-1.5">
          {equipes.map((equipe) => (
            <div key={equipe.timeId} className="flex items-center gap-2 rounded-xl bg-black/30 px-2.5 py-1.5" style={{ borderLeft: `4px solid ${equipe.cor || '#1E9BD7'}` }}>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-lg font-bold leading-tight text-white">{equipe.nome}</p>
                <p className="text-[0.6rem] uppercase tracking-[0.2em] text-gray-400">{Math.round(equipe.pontos)} pts</p>
              </div>
              <p className="font-display text-4xl font-bold leading-none text-white tabular-nums">
                {equipe.zonas}<span className="text-lg text-gray-500">/{total}</span>
              </p>
            </div>
          ))}
        </div>

        {zonas.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {zonas.filter((z) => z.checkpoints.length > 0).map((zona) => (
              <span
                key={zona.zonaId}
                className="flex items-center gap-1.5 rounded-full bg-white/5 px-2 py-0.5 text-[0.65rem] font-semibold text-gray-200"
                style={{ boxShadow: zona.dono ? `inset 0 0 0 1.5px ${zona.dono.cor}` : 'inset 0 0 0 1px rgba(148,163,184,0.35)' }}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: zona.dono?.cor || '#64748B' }} />
                {zona.nome}
              </span>
            ))}
          </div>
        )}
      </div>

      {vencedor && (
        <div className="absolute inset-x-0 top-6 z-30 flex justify-center px-6">
          <div className="rounded-3xl border-2 bg-slate-950/90 px-10 py-5 text-center shadow-2xl backdrop-blur-md" style={{ borderColor: vencedor.cor || '#22C55E' }}>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-300">Domínio total</p>
            <p className="font-display text-5xl font-bold text-white">{vencedor.nome} venceu!</p>
            <p className="mt-1 text-sm text-gray-300">A equipe dominou todas as zonas.</p>
          </div>
        </div>
      )}
    </>
  );
}
