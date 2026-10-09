// Telão do Conquistar e Destruir: a planta com os checkpoints e, no canto superior esquerdo, o placar compacto
// (times, round, contagem regressiva e situação da bomba).
import type { BombaLocal, BombaTime } from '../../services/api';
import { usePulynStore } from '../../store/mockData';
import { formatarTempo, useBombaEstado } from '../../hooks/useBombaEstado';

const MAP_WIDTH = 450;
const MAP_HEIGHT = 320;

const MOTIVOS: Record<string, string> = {
  explodiu: 'A bomba explodiu!',
  desarmada: 'A bomba foi desarmada!',
  tempo: 'O tempo do round acabou',
  eliminacao_tr: 'Rebeldes eliminados',
  eliminacao_ct: 'Agentes eliminados',
  jogo_parado: 'Jogo parado',
};

// Posição salva no mapa; sem ela, distribui os checkpoints numa grade para nenhum ficar escondido.
function posicaoNoMapa(checkpoint: { mapaX?: number | null; mapaY?: number | null; mapX?: number | null; mapY?: number | null }, indice: number, total: number) {
  const x = Number(checkpoint.mapaX ?? checkpoint.mapX);
  const y = Number(checkpoint.mapaY ?? checkpoint.mapY);
  if (Number.isFinite(x) && Number.isFinite(y)) return { x, y };
  const colunas = Math.max(1, Math.ceil(Math.sqrt(total)));
  const linhas = Math.ceil(total / colunas);
  return {
    x: MAP_WIDTH * ((indice % colunas) + 1) / (colunas + 1),
    y: MAP_HEIGHT * (Math.floor(indice / colunas) + 1) / (linhas + 1),
  };
}

export default function BombaMapa({ eventoId, floorPlan }: { eventoId: string; floorPlan?: string | null }) {
  const { estado, erro, restante } = useBombaEstado(eventoId);
  const checkpoints = usePulynStore((s) => s.checkpoints);

  if (!estado || !estado.partida) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-white/10 bg-dark-card/60 p-10 text-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-300">Conquistar e Destruir</p>
          <h2 className="mt-2 font-display text-4xl font-bold text-white">{erro || 'Preparando a partida...'}</h2>
        </div>
      </div>
    );
  }

  const { partida, round } = estado;
  const alvo = partida.config.vitoriasParaVencer;
  const plantada = round?.status === 'bomba_plantada';
  const emAndamento = round?.status === 'em_andamento';
  const contagem = plantada ? restante(round?.restanteBombaMs) : emAndamento ? restante(round?.restanteRoundMs) : null;
  const urgente = plantada && contagem !== null && contagem <= 30000;
  const campeao: BombaTime | null = partida.status === 'finalizada'
    ? (partida.vencedorTimeId === partida.timeA.timeId ? partida.timeA : partida.timeB)
    : null;
  const resultado = estado.ultimoResultado;
  const emLeitura = estado.emAndamento[0] || null;

  const ladoDe = (time: BombaTime): 'TR' | 'CT' | null => {
    if (!round || !estado.ativa) return null;
    return round.timeTr?.timeId === time.timeId ? 'TR' : round.timeCt?.timeId === time.timeId ? 'CT' : null;
  };

  const situacao = campeao ? `${campeao.nome} venceu a partida!`
    : plantada ? `BOMBA PLANTADA${round?.local ? ` NO LOCAL ${round.local.letra}` : ''}!`
    : emAndamento ? 'Round em andamento'
    : resultado ? `${resultado.vencedorLado === 'tr' ? 'Rebeldes venceram' : 'Agentes venceram'} · ${MOTIVOS[resultado.motivo] || 'round encerrado'}${resultado.local && ['explodiu', 'desarmada'].includes(resultado.motivo) ? ` · Local ${resultado.local.letra}` : ''}`
    : 'Aguardando o início do round';

  const localDe = (id: string): BombaLocal | undefined => estado.locais.find((l) => String(l.checkpointId) === String(id));
  const localPlantado = plantada ? round?.local?.checkpointId : null;

  return (
    <div className="relative h-full overflow-hidden rounded-2xl border border-primary-400/20 bg-dark-card/40" aria-live="polite">
      {floorPlan && (
        <img src={floorPlan} alt="Planta do espaço" className="pointer-events-none absolute inset-0 z-0 h-full w-full object-contain opacity-40" />
      )}

      <svg className="absolute inset-0 z-10 h-full w-full" viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} preserveAspectRatio="xMidYMid meet">
        {checkpoints.map((checkpoint, indice) => {
          const { x, y } = posicaoNoMapa(checkpoint, indice, checkpoints.length);
          const local = localDe(checkpoint.id);
          const explodindo = localPlantado !== null && localPlantado !== undefined && String(localPlantado) === String(checkpoint.id);

          if (!local) {
            // Checkpoint que não faz parte do jogo: aparece só como referência, apagado.
            return (
              <g key={checkpoint.id} transform={`translate(${x} ${y})`} opacity={0.35}>
                <circle r={8} fill="#64748B" fillOpacity={0.2} stroke="#64748B" strokeWidth={1.5} />
                <circle r={3} fill="#94A3B8" />
              </g>
            );
          }

          const cor = explodindo ? '#EF4444' : local.online ? '#1E9BD7' : '#F59E0B';
          return (
            <g key={checkpoint.id} transform={`translate(${x} ${y})`}>
              {explodindo && (
                <circle r={26} fill="none" stroke="#EF4444" strokeWidth={2.5}>
                  <animate attributeName="r" values="20;38;20" dur="1s" repeatCount="indefinite" />
                  <animate attributeName="stroke-opacity" values="0.9;0;0.9" dur="1s" repeatCount="indefinite" />
                </circle>
              )}
              <circle r={20} fill={cor} fillOpacity={explodindo ? 0.35 : 0.2} stroke={cor} strokeWidth={3} />
              <text y={1} textAnchor="middle" dominantBaseline="middle" fill="#FFFFFF" fontSize={22} fontWeight={800}>
                {local.letra}
              </text>
              <text y={36} textAnchor="middle" fill="#E5E7EB" fontSize={11} fontWeight={600}>
                {local.nome}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="absolute left-3 top-3 z-20 w-[clamp(17rem,27vw,30rem)] rounded-2xl border border-white/10 bg-slate-950/85 p-3 shadow-2xl backdrop-blur-md">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-primary-300">Conquistar e Destruir</p>
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
                      {lado === 'TR' ? 'Rebeldes · plantam' : 'Agentes · desarmam'}
                    </p>
                  )}
                </div>
                <p className="font-display text-5xl font-bold leading-none text-white tabular-nums">{time.vitorias ?? 0}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-2 flex items-baseline justify-between gap-2">
          <p className={`font-display text-5xl font-bold tabular-nums leading-none ${plantada ? 'text-danger' : 'text-white'} ${urgente ? 'animate-pulse' : ''}`}>
            {formatarTempo(contagem)}
          </p>
          <p className="text-right text-[0.6rem] uppercase tracking-[0.2em] text-gray-400">
            {plantada ? 'até a explosão' : emAndamento ? 'tempo do round' : ''}
          </p>
        </div>

        <p className={`mt-2 rounded-lg px-2 py-1.5 text-center text-sm font-bold leading-tight ${plantada ? 'bg-danger/20 text-red-200' : campeao ? 'bg-success/15 text-success' : 'bg-white/5 text-white'} ${urgente ? 'animate-pulse' : ''}`}>
          {situacao}
        </p>

        {emLeitura && (
          <div className="mt-2">
            <p className="mb-1 text-center text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-gray-300">
              {emLeitura.tipo === 'plantar' ? 'Plantando a bomba...' : 'Desarmando a bomba...'}
            </p>
            <div className="h-3 overflow-hidden rounded-full border border-white/10 bg-black/50 p-0.5">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.round((emLeitura.progressoMs / emLeitura.totalMs) * 100))}%`,
                  backgroundColor: emLeitura.tipo === 'plantar' ? '#ef4444' : '#1E9BD7',
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
