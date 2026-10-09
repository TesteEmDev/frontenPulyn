// Painel do recreacionista no Resgate do Refém: placar, round, progresso do refém, controles e numeração dos jogadores.
import { useEffect, useMemo, useState } from 'react';
import { Flag, Shield, Swords, Timer } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { api } from '../../services/api';
import type { BombaJogador, BombaTime } from '../../services/api';
import { formatarTempo } from '../../hooks/useBombaEstado';
import { useRefemEstado } from '../../hooks/useRefemEstado';

const MOTIVOS: Record<string, string> = {
  resgatado: 'o refém foi resgatado',
  tempo: 'o tempo do round acabou',
  eliminacao_tr: 'a equipe dos Rebeldes foi eliminada',
  eliminacao_ct: 'a equipe dos Agentes foi eliminada',
  jogo_parado: 'o jogo foi parado',
};

const nomeDoTime = (time: BombaTime | null | undefined) => time?.nome || 'Equipe';

export default function RefemPainel({ eventoId }: { eventoId: string }) {
  const { estado, erro, recarregar, restante } = useRefemEstado(eventoId);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState('');
  const [timeAId, setTimeAId] = useState('');
  const [timeBId, setTimeBId] = useState('');
  const [timeTrId, setTimeTrId] = useState('');
  const [timesDoEvento, setTimesDoEvento] = useState<BombaTime[]>([]);

  const partida = estado?.partida || null;
  const round = estado?.round || null;
  const primeiroRoundAguardando = Boolean(partida && estado?.ativa && round?.numero === 1 && round.status === 'aguardando');

  useEffect(() => {
    api.getTimes(eventoId).then((lista: any[]) => {
      setTimesDoEvento((Array.isArray(lista) ? lista : []).map(time => ({
        timeId: time.timeId ?? time.id, nome: time.nome ?? time.name, cor: time.cor ?? time.color,
      })));
    }).catch(() => setTimesDoEvento([]));
  }, [eventoId]);

  useEffect(() => {
    if (!partida) return;
    setTimeAId(partida.timeA.timeId);
    setTimeBId(partida.timeB.timeId);
    setTimeTrId(partida.timeTrInicialId || partida.timeA.timeId);
  }, [partida?.partidaId, partida?.timeA.timeId, partida?.timeB.timeId, partida?.timeTrInicialId]);

  const executar = async (acao: () => Promise<unknown>, sucesso?: string) => {
    setOcupado(true);
    setAviso('');
    try {
      await acao();
      if (sucesso) setAviso(sucesso);
      await recarregar();
    } catch (e) {
      setAviso(e instanceof Error ? e.message : 'Não foi possível concluir a ação');
    } finally {
      setOcupado(false);
    }
  };

  const jogadoresPorTime = useMemo(() => {
    const grupos = new Map<string, BombaJogador[]>();
    (estado?.jogadores || []).forEach(jogador => {
      grupos.set(jogador.timeId, [...(grupos.get(jogador.timeId) || []), jogador]);
    });
    return grupos;
  }, [estado?.jogadores]);

  if (!estado) {
    return (
      <Card className="mb-6 border border-primary/30">
        <p className="text-sm text-gray-400">{erro || 'Carregando a partida de Resgate do Refém...'}</p>
      </Card>
    );
  }
  if (!partida) {
    return (
      <Card className="mb-6 border border-primary/30">
        <h3 className="font-display text-lg text-white">Resgate do Refém</h3>
        <p className="text-sm text-gray-400">Inicie o jogo para criar a partida.</p>
      </Card>
    );
  }

  const campeao = partida.status === 'finalizada'
    ? (partida.timeA.timeId === partida.vencedorTimeId ? partida.timeA : partida.timeB)
    : null;
  const alvo = partida.config.vitoriasParaVencer;
  const emPartida = Boolean(estado.ativa);
  const emAndamento = round?.status === 'em_andamento';
  const contagem = emAndamento ? restante(round?.restanteRoundMs) : null;
  const resultado = estado.ultimoResultado;
  const timesParaEscolher = timesDoEvento.length ? timesDoEvento : [partida.timeA, partida.timeB];
  const posicao = round?.posicao ?? 0;

  return (
    <Card className="mb-6 border border-primary/40 bg-primary/5">
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg text-white">Resgate do Refém</h3>
            <p className="text-sm text-gray-400">
              {campeao ? `Partida encerrada: ${nomeDoTime(campeao)} venceu.`
                : emPartida && round ? `Round ${round.numero} · primeiro a ${alvo} vitórias · lados trocam a cada ${partida.config.roundsPorLado} rounds`
                : 'Partida encerrada.'}
            </p>
          </div>
          {round && emPartida && (
            <Badge variant={emAndamento ? 'success' : 'muted'}>{emAndamento ? 'Round em andamento' : 'Aguardando round'}</Badge>
          )}
        </div>

        {/* Placar */}
        <div className="grid grid-cols-2 gap-3">
          {[partida.timeA, partida.timeB].map(time => {
            const lado = round && round.timeTr?.timeId === time.timeId ? 'REBELDES' : round && round.timeCt?.timeId === time.timeId ? 'AGENTES' : null;
            return (
              <div key={time.timeId} className="rounded-lg bg-surface/50 p-3" style={{ border: `1px solid ${time.cor || '#1E9BD7'}66` }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2 font-semibold text-white">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: time.cor || '#1E9BD7' }} />
                    <span className="truncate">{nomeDoTime(time)}</span>
                  </span>
                  {emPartida && lado && (
                    <Badge variant={lado === 'REBELDES' ? 'danger' : 'primary'}>{lado === 'REBELDES' ? 'Rebeldes · recuperam' : 'Agentes · levam o refém'}</Badge>
                  )}
                </div>
                <p className="mt-1 font-display text-4xl font-bold text-white">
                  {time.vitorias ?? 0}<span className="text-lg text-gray-500"> / {alvo}</span>
                </p>
              </div>
            );
          })}
        </div>

        {/* Round atual */}
        {emPartida && round && (
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg bg-surface/50 p-3">
              <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-gray-500"><Timer size={14} /> Tempo do round</p>
              <p className="mt-1 font-display text-4xl font-bold tabular-nums text-white">{formatarTempo(contagem)}</p>
            </div>
            <div className="rounded-lg bg-surface/50 p-3">
              <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-gray-500"><Flag size={14} /> Refém</p>
              {round.refem ? (
                <p className="mt-1 text-white">
                  <span className="font-display text-3xl font-bold">nº {round.refem.numero ?? '?'}</span>
                  <span className="ml-2 text-sm text-gray-400">{round.refem.nome || ''}</span>
                </p>
              ) : <p className="mt-1 text-sm text-gray-400">Sorteado quando o round começar.</p>}
            </div>
            <div className="rounded-lg bg-surface/50 p-3">
              <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-gray-500"><Shield size={14} /> Progresso</p>
              {emAndamento ? (
                <>
                  <p className="mt-1 font-display text-3xl font-bold text-white">{posicao}<span className="text-lg text-gray-500"> / {round.total}</span></p>
                  <p className="text-xs text-gray-400">
                    {round.recuperacoes} {round.recuperacoes === 1 ? 'recuperação' : 'recuperações'}{round.protegidoMs > 0 ? ' · refém protegido' : ''}
                  </p>
                </>
              ) : <p className="mt-1 text-sm text-gray-400">Começa quando o round iniciar.</p>}
            </div>
          </div>
        )}

        {resultado && emPartida && round?.status === 'aguardando' && (
          <p className="rounded-lg bg-surface/50 p-3 text-sm text-gray-300">
            Round {resultado.numero}: {resultado.vencedorLado === 'tr' ? 'os Rebeldes venceram' : 'os Agentes venceram'} — {MOTIVOS[resultado.motivo] || resultado.motivo}.
          </p>
        )}

        {/* Sequência de checkpoints */}
        {emPartida && estado.sequencia.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-gray-500">Sequência</span>
            {estado.sequencia.map((passo, i) => {
              const atual = emAndamento && i === posicao - 1;
              const proximo = emAndamento && i === posicao;
              const alcancado = emAndamento && i < posicao - 1;
              return (
                <Badge key={passo.checkpointId} variant={atual ? 'danger' : proximo ? 'warning' : alcancado ? 'success' : passo.online ? 'primary' : 'muted'}>
                  {passo.ordem} · {passo.nome}{passo.online ? '' : ' (offline)'}
                </Badge>
              );
            })}
          </div>
        )}

        {/* Controles */}
        {emPartida && round && (
          <div className="flex flex-wrap items-center gap-3">
            {round.status === 'aguardando' && (
              <Button variant="success" disabled={ocupado} onClick={() => executar(() => api.iniciarRoundRefem(eventoId))}>
                <Swords size={16} className="mr-1.5 inline" />Iniciar round {round.numero}
              </Button>
            )}
            {emAndamento && (
              <>
                <Button variant="danger" size="sm" disabled={ocupado} onClick={() => {
                  if (window.confirm('Encerrar o round dando a vitória aos Rebeldes?')) executar(() => api.encerrarRoundRefem(eventoId, 'tr'));
                }}>Rebeldes venceram</Button>
                <Button variant="primary" size="sm" disabled={ocupado} onClick={() => {
                  if (window.confirm('Encerrar o round dando a vitória aos Agentes?')) executar(() => api.encerrarRoundRefem(eventoId, 'ct'));
                }}>Agentes venceram</Button>
                <span className="text-xs text-gray-500">Use quando uma equipe inteira for eliminada.</span>
              </>
            )}
          </div>
        )}

        {/* Antes do primeiro round: equipes e lado inicial */}
        {primeiroRoundAguardando && (
          <div className="grid gap-3 rounded-lg bg-surface/50 p-3 md:grid-cols-3">
            <label className="text-sm text-gray-300">Equipe 1
              <select value={timeAId} onChange={e => { setTimeAId(e.target.value); setTimeTrId(e.target.value); }} className="mt-1 w-full rounded-lg border border-white/10 bg-dark px-3 py-2 text-white">
                {timesParaEscolher.filter(t => t.timeId !== timeBId).map(t => <option key={t.timeId} value={t.timeId}>{t.nome}</option>)}
              </select>
            </label>
            <label className="text-sm text-gray-300">Equipe 2
              <select value={timeBId} onChange={e => { setTimeBId(e.target.value); if (timeTrId !== timeAId) setTimeTrId(timeAId); }} className="mt-1 w-full rounded-lg border border-white/10 bg-dark px-3 py-2 text-white">
                {timesParaEscolher.filter(t => t.timeId !== timeAId).map(t => <option key={t.timeId} value={t.timeId}>{t.nome}</option>)}
              </select>
            </label>
            <label className="text-sm text-gray-300">Quem começa como Rebeldes
              <select value={timeTrId} onChange={e => setTimeTrId(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-dark px-3 py-2 text-white">
                {[timeAId, timeBId].map(id => <option key={id} value={id}>{timesParaEscolher.find(t => t.timeId === id)?.nome || id}</option>)}
              </select>
            </label>
            <div className="md:col-span-3">
              <Button size="sm" variant="secondary" disabled={ocupado} onClick={() => executar(
                () => api.configurarRefem(eventoId, { timeAId, timeBId, timeTrInicialId: timeTrId }), 'Equipes salvas.'
              )}>Salvar equipes</Button>
            </div>
          </div>
        )}

        {/* Jogadores e números */}
        <div className="rounded-lg bg-surface/50 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-white">Jogadores e números</p>
            <Button size="sm" variant="ghost" disabled={ocupado || !emPartida} onClick={() => executar(() => api.numerarRefem(eventoId), 'Jogadores sem número foram numerados.')}>Numerar quem falta</Button>
          </div>
          <p className="mb-2 text-xs text-gray-500">A cada round, o refém é sorteado entre os números da equipe dos Agentes.</p>
          <div className="grid gap-3 md:grid-cols-2">
            {[partida.timeA, partida.timeB].map(time => (
              <div key={time.timeId}>
                <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-300">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: time.cor || '#1E9BD7' }} />{nomeDoTime(time)}
                </p>
                <ul className="space-y-1">
                  {(jogadoresPorTime.get(time.timeId) || []).map(jogador => (
                    <li key={jogador.criancaId} className="flex items-center gap-2 text-sm text-gray-200">
                      <input
                        key={`${jogador.criancaId}-${jogador.numeroJogador ?? ''}`}
                        type="number" min={1} max={99} inputMode="numeric" aria-label={`Número de ${jogador.nome}`}
                        defaultValue={jogador.numeroJogador ?? ''}
                        disabled={ocupado || !emPartida}
                        onBlur={e => {
                          const valor = e.target.value === '' ? null : Number(e.target.value);
                          if (valor !== (jogador.numeroJogador ?? null)) executar(() => api.definirNumeroRefem(eventoId, jogador.criancaId, valor));
                        }}
                        className="w-16 rounded-lg border border-white/10 bg-dark px-2 py-1 text-center text-white"
                      />
                      <span className="truncate">{jogador.apelido || jogador.nome}</span>
                    </li>
                  ))}
                  {!(jogadoresPorTime.get(time.timeId) || []).length && <li className="text-xs text-gray-500">Nenhum jogador nesta equipe.</li>}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {(aviso || erro) && <p className="text-sm text-warning" role="status">{aviso || erro}</p>}
      </div>
    </Card>
  );
}
