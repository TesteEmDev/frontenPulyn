// Telão do Resgate do Refém: a planta com a sequência de checkpoints (1, 2, 3...) e o caminho do refém, e, no canto
// superior esquerdo, o placar compacto (times, round, tempo, refém e progresso).
import type { BombaTime } from '../../services/api';
import { usePulynStore } from '../../store/mockData';
import { formatarTempo } from '../../hooks/useBombaEstado';
import { useRefemEstado } from '../../hooks/useRefemEstado';
import { MAP_HEIGHT, MAP_WIDTH, posicaoNoMapa } from './posicaoNoMapa';

const MOTIVOS: Record<string, string> = {
  resgatado: 'O refém foi resgatado!',
  tempo: 'O tempo do round acabou',
  eliminacao_tr: 'Rebeldes eliminados',
  eliminacao_ct: 'Agentes eliminados',
  jogo_parado: 'Jogo parado',
};

export default function RefemMapa({ eventoId, floorPlan }: { eventoId: string; floorPlan?: string | null }) {
  const { estado, erro, restante } = useRefemEstado(eventoId);
  const checkpoints = usePulynStore((s) => s.checkpoints);

  if (!estado || !estado.partida) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-white/10 bg-dark-card/60 p-10 text-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-300">Resgate do Refém</p>
          <h2 className="mt-2 font-display text-4xl font-bold text-white">{erro || 'Preparando a partida...'}</h2>
        </div>
      </div>
    );
  }

  const { partida, round } = estado;
  const alvo = partida.config.vitoriasParaVencer;
  const emAndamento = round?.status === 'em_andamento';
  const contagem = emAndamento ? restante(round?.restanteRoundMs) : null;
  const urgente = emAndamento && contagem !== null && contagem <= 30000;
  const campeao: BombaTime | null = partida.status === 'finalizada'
    ? (partida.vencedorTimeId === partida.timeA.timeId ? partida.timeA : partida.timeB)
    : null;
  const resultado = estado.ultimoResultado;
  const posicao = emAndamento ? round?.posicao ?? 0 : 0;
  const protegido = emAndamento && (round?.protegidoMs ?? 0) > 0;

  const ladoDe = (time: BombaTime): 'TR' | 'CT' | null => {
    if (!round || !estado.ativa) return null;
    return round.timeTr?.timeId === time.timeId ? 'TR' : round.timeCt?.timeId === time.timeId ? 'CT' : null;
  };

  const situacao = campeao ? `${campeao.nome} venceu a partida!`
    : emAndamento ? (posicao === 0 ? 'O refém está saindo...' : `Refém no checkpoint ${posicao} de ${round?.total}`)
    : resultado ? `${resultado.vencedorLado === 'tr' ? 'Rebeldes venceram' : 'Agentes venceram'} · ${MOTIVOS[resultado.motivo] || 'round encerrado'}`
    : 'Aguardando o início do round';

  // Pontos da sequência no mapa, na ordem do jogo.
  const pontos = estado.sequencia.map((passo) => {
    const indice = checkpoints.findIndex((c) => String(c.id).toLowerCase() === String(passo.checkpointId).toLowerCase());
    const base = indice >= 0 ? checkpoints[indice] : {};
    return { ...passo, ...posicaoNoMapa(base, indice >= 0 ? indice : 0, Math.max(1, checkpoints.length)) };
  });
  const caminho = pontos.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className="relative h-full overflow-hidden rounded-2xl border border-primary-400/20 bg-dark-card/40" aria-live="polite">
      {floorPlan && (
        <img src={floorPlan} alt="Planta do espaço" className="pointer-events-none absolute inset-0 z-0 h-full w-full object-contain opacity-40" />
      )}

      <svg className="absolute inset-0 z-10 h-full w-full" viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} preserveAspectRatio="xMidYMid meet">
        <polyline points={caminho} fill="none" stroke="#64748B" strokeWidth={1.5} strokeDasharray="4 4" opacity={0.6} />
        {pontos.map((p, i) => {
          const alcancado = i < posicao;
          const atual = emAndamento && i === posicao - 1;
          const proximo = emAndamento && i === posicao;
          const cor = atual ? '#EF4444' : proximo ? '#FACC15' : alcancado ? '#22C55E' : p.online ? '#1E9BD7' : '#F59E0B';
          return (
            <g key={p.checkpointId} transform={`translate(${p.x} ${p.y})`}>
              {atual && (
                <circle r={13} fill="none" stroke="#EF4444" strokeWidth={2}>
                  <animate attributeName="r" values="12;24;12" dur="1s" repeatCount="indefinite" />
                  <animate attributeName="stroke-opacity" values="0.9;0;0.9" dur="1s" repeatCount="indefinite" />
                </circle>
              )}
              {proximo && (
                <circle r={13} fill="none" stroke="#FACC15" strokeWidth={2}>
                  <animate attributeName="stroke-opacity" values="1;0.2;1" dur="0.8s" repeatCount="indefinite" />
                </circle>
              )}
              <circle r={11} fill={cor} fillOpacity={atual ? 0.4 : 0.22} stroke={cor} strokeWidth={2.5} />
              <text y={1} textAnchor="middle" dominantBaseline="middle" fill="#FFFFFF" fontSize={13} fontWeight={800}>{p.ordem}</text>
              <text y={23} textAnchor="middle" fill="#E5E7EB" fontSize={8.5} fontWeight={600}>{p.nome}</text>
            </g>
          );
        })}
      </svg>

      <div className="absolute left-3 top-3 z-20 w-[clamp(17rem,27vw,30rem)] rounded-2xl border border-white/10 bg-slate-950/85 p-3 shadow-2xl backdrop-blur-md">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-primary-300">Resgate do Refém</p>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-gray-400">
            {round && estado.ativa ? `Round ${round.numero}` : 'Fim'} · até {alvo}
          </p>
        </div>

        <div className="space-y-1.5">
          {[partida.timeA, partida.timeB].map((time) => {
            const lado = ladoDe(time);
            return (
              <div key={time.timeId} className="flex items-center gap-2 rounded-xl bg-black/30 px-2.5 py-1.5" style={{ borderLeft: `4px solid ${time.cor || '#1E9BD7'}` }}>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-lg font-bold leading-tight text-white">{time.nome}</p>
                  {lado && (
                    <p className={`text-[0.6rem] font-bold uppercase tracking-[0.2em] ${lado === 'TR' ? 'text-red-300' : 'text-sky-300'}`}>
                      {lado === 'TR' ? 'Rebeldes · recuperam' : 'Agentes · levam o refém'}
                    </p>
                  )}
                </div>
                <p className="font-display text-5xl font-bold leading-none text-white tabular-nums">{time.vitorias ?? 0}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-2 flex items-baseline justify-between gap-2">
          <p className={`font-display text-5xl font-bold tabular-nums leading-none text-white ${urgente ? 'animate-pulse text-danger' : ''}`}>
            {formatarTempo(contagem)}
          </p>
          <p className="text-right text-[0.6rem] uppercase tracking-[0.2em] text-gray-400">{emAndamento ? 'tempo do round' : ''}</p>
        </div>

        {emAndamento && round?.refem && (
          <div className="mt-2 rounded-lg bg-white/5 px-2 py-1.5">
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-gray-400">Refém</p>
            <p className="font-display text-base font-bold text-white">
              nº {round.refem.numero ?? '?'}{round.refem.nome ? ` · ${round.refem.nome}` : ''}
            </p>
            <div className="mt-1 flex gap-1" aria-label={`Progresso ${posicao} de ${round.total}`}>
              {Array.from({ length: round.total }, (_, i) => (
                <span key={i} className="h-2 flex-1 rounded-full" style={{ backgroundColor: i < posicao ? '#22C55E' : '#334155' }} />
              ))}
            </div>
            <p className="mt-1 text-[0.65rem] text-gray-400">
              {round.recuperacoes > 0 ? `${round.recuperacoes} recuperaç${round.recuperacoes === 1 ? 'ão' : 'ões'} dos Rebeldes` : 'Nenhuma recuperação ainda'}
              {protegido ? ' · refém protegido' : ''}
            </p>
          </div>
        )}

        <p className={`mt-2 rounded-lg px-2 py-1.5 text-center text-sm font-bold leading-tight ${campeao ? 'bg-success/15 text-success' : 'bg-white/5 text-white'}`}>
          {situacao}
        </p>
      </div>
    </div>
  );
}
