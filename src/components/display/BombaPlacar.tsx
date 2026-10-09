// Telão do Conquistar e Destruir: placar, round, contagem regressiva e situação da bomba.
import type { BombaTime } from '../../services/api';
import { formatarTempo, useBombaEstado } from '../../hooks/useBombaEstado';

const MOTIVOS: Record<string, string> = {
  explodiu: 'A bomba explodiu!',
  desarmada: 'A bomba foi desarmada!',
  tempo: 'O tempo do round acabou',
  eliminacao_tr: 'Equipe TR eliminada',
  eliminacao_ct: 'Equipe CT eliminada',
  jogo_parado: 'Jogo parado',
};

function LadoSelo({ lado }: { lado: 'TR' | 'CT' | null }) {
  if (!lado) return null;
  const tr = lado === 'TR';
  return (
    <span className={`rounded-full px-4 py-1 text-sm font-bold uppercase tracking-[0.2em] ${tr ? 'bg-danger/20 text-red-200' : 'bg-primary/20 text-sky-200'}`}>
      {tr ? 'Terroristas' : 'Contra-terroristas'}
    </span>
  );
}

export default function BombaPlacar({ eventoId }: { eventoId: string }) {
  const { estado, erro, restante } = useBombaEstado(eventoId);

  if (!estado || !estado.partida) {
    return (
      <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-dark-card/80 p-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-300">Conquistar e Destruir</p>
        <h2 className="mt-2 font-display text-4xl font-bold text-white">{erro || 'Preparando a partida...'}</h2>
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
    : plantada ? 'BOMBA PLANTADA!'
    : emAndamento ? 'Round em andamento'
    : resultado ? `${MOTIVOS[resultado.motivo] || 'Round encerrado'}`
    : 'Aguardando o início do round';

  return (
    <div className="mx-auto max-w-6xl rounded-3xl border-2 border-primary/50 bg-gradient-to-br from-slate-950/90 via-dark-surface/90 to-red-950/50 p-6 shadow-2xl" aria-live="polite">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-300">Conquistar e Destruir</p>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-300">
          {round && estado.ativa ? `Round ${round.numero}` : 'Fim de jogo'} · primeiro a {alvo}
        </p>
      </div>

      <div className="grid items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
        {[partida.timeA, partida.timeB].map((time, indice) => (
          <div key={time.timeId} className={`rounded-2xl border bg-black/30 p-5 text-center ${indice === 1 ? 'md:order-3' : 'md:order-1'}`} style={{ borderColor: `${time.cor || '#1E9BD7'}88` }}>
            <div className="mx-auto mb-2 h-1.5 w-24 rounded-full" style={{ backgroundColor: time.cor || '#1E9BD7' }} />
            <h3 className="truncate font-display text-3xl font-bold text-white">{time.nome}</h3>
            <p className="my-2 font-display text-8xl font-bold leading-none text-white tabular-nums">{time.vitorias ?? 0}</p>
            <LadoSelo lado={ladoDe(time)} />
          </div>
        ))}

        <div className="text-center md:order-2">
          <p className={`font-display text-7xl font-bold tabular-nums ${plantada ? 'text-danger' : 'text-white'} ${urgente ? 'animate-pulse' : ''}`}>
            {formatarTempo(contagem)}
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.25em] text-gray-400">
            {plantada ? 'até a explosão' : emAndamento ? 'tempo do round' : ''}
          </p>
        </div>
      </div>

      <div className={`mt-5 rounded-2xl px-6 py-4 text-center font-display text-4xl font-bold ${plantada ? 'bg-danger/20 text-red-200' : campeao ? 'bg-success/15 text-success' : 'bg-white/5 text-white'} ${urgente ? 'animate-pulse' : ''}`}>
        {situacao}
      </div>

      {emLeitura && (
        <div className="mt-4">
          <p className="mb-1 text-center text-sm font-semibold uppercase tracking-[0.2em] text-gray-300">
            {emLeitura.tipo === 'plantar' ? 'Plantando a bomba...' : 'Desarmando a bomba...'}
          </p>
          <div className="h-5 overflow-hidden rounded-full border border-white/10 bg-black/50 p-0.5">
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
  );
}
