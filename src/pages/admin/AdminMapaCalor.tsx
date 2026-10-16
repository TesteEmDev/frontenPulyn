import { useEffect, useMemo, useState } from 'react';
import { Flame, RefreshCw, Loader2, History } from 'lucide-react';
import { api } from '../../services/api';
import { usePulynStore } from '../../store/mockData';
import { useUhfMapa, type FiltrosUhfMapa } from '../../hooks/useUhfMapa';
import AdminSidebar from '../../components/layout/AdminSidebar';
import BuffetTopBar from '../../components/layout/BuffetTopBar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import MapaPlanta from '../../components/uhf/MapaPlanta';
import CamadaCalor, { LegendaCalor } from '../../components/uhf/CamadaCalor';
import MarcadorAntena, { CORES_LEITOR } from '../../components/uhf/MarcadorAntena';

const campo = 'rounded-lg border border-dark-border bg-dark-surface px-3 py-2 text-sm text-white focus:border-primary focus:outline-none';
const JANELA_MS = 20000;
const MINUTOS_DE_HISTORICO = 30;

const NOME_METODO: Record<string, string> = { antena: '1 antena', centroide: 'entre antenas', trilateracao: 'triangulada' };

export default function AdminMapaCalor() {
  const { events, loadEventos } = usePulynStore();
  const [plantaUrl, setPlantaUrl] = useState<string | null>(null);
  const [eventoId, setEventoId] = useState('');
  const [timeId, setTimeId] = useState('');
  const [times, setTimes] = useState<any[]>([]);
  const [modo, setModo] = useState<'agora' | '5min'>('agora');
  const [mostrarCriancas, setMostrarCriancas] = useState(true);
  const [mostrarAntenas, setMostrarAntenas] = useState(true);
  // Replay: quantas janelas de 20 s para trás (0 = ao vivo).
  const [voltar, setVoltar] = useState(0);
  const [baseReplay, setBaseReplay] = useState<number>(() => Date.now());

  useEffect(() => { if (events.length === 0) loadEventos(); }, [events.length, loadEventos]);
  useEffect(() => { api.getFloorPlan().then((p) => setPlantaUrl(p?.dataUrl || null)).catch(() => setPlantaUrl(null)); }, []);
  useEffect(() => {
    setTimeId('');
    if (!eventoId) { setTimes([]); return; }
    api.getTimes(eventoId).then((lista) => setTimes(Array.isArray(lista) ? lista : [])).catch(() => setTimes([]));
  }, [eventoId]);

  const balde = voltar > 0 ? new Date(Math.floor(baseReplay / JANELA_MS) * JANELA_MS - voltar * JANELA_MS).toISOString() : undefined;
  const filtros: FiltrosUhfMapa = { modo, balde, eventoId: eventoId || undefined, timeId: timeId || undefined };
  const { mapa, erro, carregando, segundosParaAtualizar, recarregar } = useUhfMapa(filtros);

  const leitoresIds = useMemo(() => [...new Set((mapa?.antenas || []).map((a) => a.leitorId))], [mapa]);
  const corDoLeitor = (leitorId: string) => CORES_LEITOR[Math.max(0, leitoresIds.indexOf(leitorId)) % CORES_LEITOR.length];
  const corDoTime = (id: string | null) => times.find((t) => (t.timeId || t.id) === id)?.cor || '#FFFFFF';
  const antenasOnline = (mapa?.antenas || []).filter((a) => a.online && a.ativa && a.mapaX !== null).length;
  const antenasNoMapa = (mapa?.antenas || []).filter((a) => a.mapaX !== null).length;
  const escala = mapa?.escalaMetrosPorUnidade || 0.05;

  return (
    <div className="flex h-screen bg-dark text-white overflow-hidden">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <BuffetTopBar subtitle="Mapa de calor" />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <PageHeader
            title="Mapa de calor"
            description="Onde as crianças estão, pelas leituras dos leitores UHF. O mapa é recalculado a cada janela de 20 segundos."
            icon={<Flame size={28} />}
          />

          {erro && <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-red-300">{erro}</p>}
          {mapa?.escalaPadrao && (
            <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-yellow-200">
              A escala da planta ainda não foi definida (usando 450 unidades = 22,5 m). Defina em Leitores UHF para as distâncias ficarem certas.
            </p>
          )}

          <Card>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-xs text-gray-400">Evento
                <select className={`${campo} mt-1 block min-w-[200px]`} value={eventoId} onChange={(e) => setEventoId(e.target.value)}>
                  <option value="">Todas as pulseiras</option>
                  {events.map((ev) => <option key={ev.eventoId} value={ev.eventoId}>{ev.nome}</option>)}
                </select>
              </label>
              <label className="text-xs text-gray-400">Time
                <select className={`${campo} mt-1 block min-w-[160px]`} value={timeId} onChange={(e) => setTimeId(e.target.value)} disabled={!eventoId}>
                  <option value="">Todos</option>
                  {times.map((t) => <option key={t.timeId || t.id} value={t.timeId || t.id}>{t.nome || t.name}</option>)}
                </select>
              </label>
              <div className="flex gap-1.5">
                <Button size="sm" variant={modo === 'agora' ? 'primary' : 'ghost'} onClick={() => setModo('agora')}>Agora</Button>
                <Button size="sm" variant={modo === '5min' ? 'primary' : 'ghost'} onClick={() => setModo('5min')}>Últimos 5 min</Button>
              </div>
              <label className="flex items-center gap-1.5 text-xs text-gray-300">
                <input type="checkbox" checked={mostrarCriancas} onChange={(e) => setMostrarCriancas(e.target.checked)} />Crianças
              </label>
              <label className="flex items-center gap-1.5 text-xs text-gray-300">
                <input type="checkbox" checked={mostrarAntenas} onChange={(e) => setMostrarAntenas(e.target.checked)} />Antenas
              </label>
              <div className="ml-auto flex items-center gap-2">
                {voltar === 0
                  ? <Badge variant="success">{segundosParaAtualizar !== null ? `Atualiza em ${segundosParaAtualizar}s` : 'Ao vivo'}</Badge>
                  : <Badge variant="warning">Revendo</Badge>}
                <Button size="sm" variant="ghost" onClick={() => recarregar()} disabled={carregando}>
                  {carregando ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                </Button>
              </div>
            </div>

            {/* Replay */}
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-400">
              <History size={14} />
              <input
                type="range" min={0} max={(MINUTOS_DE_HISTORICO * 60000) / JANELA_MS} step={1}
                value={(MINUTOS_DE_HISTORICO * 60000) / JANELA_MS - voltar}
                onChange={(e) => {
                  const novo = (MINUTOS_DE_HISTORICO * 60000) / JANELA_MS - Number(e.target.value);
                  if (voltar === 0 && novo > 0) setBaseReplay(Date.now());
                  setVoltar(novo);
                }}
                className="w-64"
                aria-label="Voltar no tempo"
              />
              <span>{voltar === 0 ? 'Ao vivo' : `${new Date(balde as string).toLocaleTimeString('pt-BR')} (${Math.round((voltar * JANELA_MS) / 60000 * 10) / 10} min atrás)`}</span>
              {voltar > 0 && <Button size="sm" variant="ghost" onClick={() => setVoltar(0)}>Voltar ao vivo</Button>}
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
            <Card className="xl:col-span-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-gray-500">
                  {mapa ? `Janela das ${new Date(mapa.balde).toLocaleTimeString('pt-BR')} · ${mapa.totais.pulseirasVistas} pulseira(s) vista(s)` : 'Carregando...'}
                </p>
                <LegendaCalor valorMax={mapa?.valorMax || 0} />
              </div>
              <MapaPlanta plantaUrl={plantaUrl} altura={520}>
                {mapa && <CamadaCalor celulas={mapa.celulas} celulaUnidades={mapa.celulaUnidades} valorMax={mapa.valorMax} />}
                {mostrarAntenas && mapa?.antenas.filter((a) => a.mapaX !== null).map((a) => (
                  <MarcadorAntena
                    key={a.antenaId}
                    x={a.mapaX as number} y={a.mapaY as number} porta={a.porta} rotulo={a.moduleId}
                    cor={corDoLeitor(a.leitorId)} raio={a.raioMetros / escala} direcaoGraus={a.direcaoGraus}
                    online={a.online && a.ativa} mostrarAlcance={false}
                  />
                ))}
                {mostrarCriancas && mapa?.criancas.map((c) => (
                  <g key={c.codigo}>
                    <circle cx={c.x} cy={c.y} r={3.5} fill={corDoTime(c.timeId)} stroke="#0B1120" strokeWidth={1} opacity={0.4 + 0.6 * c.confianca} />
                    <title>{`${c.nome || `Pulseira ${c.codigo}`} · ${NOME_METODO[c.metodo] || c.metodo} · confiança ${Math.round(c.confianca * 100)}%`}</title>
                  </g>
                ))}
              </MapaPlanta>
            </Card>

            <Card>
              <h3 className="mb-3 font-display text-lg text-white">Resumo</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-gray-400">Pulseiras vistas</dt><dd className="text-white">{mapa?.totais.pulseirasVistas ?? '—'}</dd></div>
                {Object.entries(mapa?.totais.porMetodo || {}).map(([metodo, total]) => (
                  <div key={metodo} className="flex justify-between"><dt className="text-gray-400">· {NOME_METODO[metodo] || metodo}</dt><dd className="text-white">{total}</dd></div>
                ))}
                <div className="flex justify-between"><dt className="text-gray-400">Antenas online</dt><dd className="text-white">{mapa ? `${antenasOnline} de ${antenasNoMapa}` : '—'}</dd></div>
              </dl>
              {mapa && antenasNoMapa === 0 && (
                <p className="mt-4 text-xs text-gray-500">Nenhuma antena posicionada. Cadastre os leitores e posicione as antenas em Leitores UHF.</p>
              )}
              {mostrarCriancas && mapa && mapa.criancas.length > 0 && (
                <div className="mt-5">
                  <p className="mb-2 text-xs uppercase tracking-wide text-gray-500">Crianças</p>
                  <ul className="max-h-72 space-y-1 overflow-y-auto text-xs">
                    {[...mapa.criancas].sort((a, b) => (a.nome || '').localeCompare(b.nome || '')).map((c) => (
                      <li key={c.codigo} className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: corDoTime(c.timeId) }} />
                          <span className="truncate text-gray-200">{c.nome || `Pulseira ${c.codigo}`}</span>
                        </span>
                        <span className="shrink-0 text-gray-500">{NOME_METODO[c.metodo] || c.metodo}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
