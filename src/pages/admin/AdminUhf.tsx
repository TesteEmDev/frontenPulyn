import { useCallback, useEffect, useMemo, useState } from 'react';
import { Radio, Plus, KeyRound, Trash2, Ruler, Crosshair, Save, Loader2, RefreshCw, Power, X } from 'lucide-react';
import { api, API_URL, type UhfAntena, type UhfConfig, type UhfLeitor, type UhfLeituraAntena } from '../../services/api';
import AdminSidebar from '../../components/layout/AdminSidebar';
import BuffetTopBar from '../../components/layout/BuffetTopBar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import MapaPlanta, { LARGURA_PLANTA, ALTURA_PLANTA, type PontoPlanta } from '../../components/uhf/MapaPlanta';
import MarcadorAntena, { CORES_LEITOR } from '../../components/uhf/MarcadorAntena';

const ESCALA_PADRAO = 0.05;
const campo = 'w-full rounded-lg border border-dark-border bg-dark-surface px-3 py-2 text-sm text-white focus:border-primary focus:outline-none';

const formatarHora = (data: string | null) => (data ? new Date(data).toLocaleTimeString('pt-BR') : 'nunca');
const numeroBr = (valor: number, casas = 2) => valor.toLocaleString('pt-BR', { maximumFractionDigits: casas });

interface ChaveGerada { leitor: UhfLeitor; chave: string }

export default function AdminUhf() {
  const [config, setConfig] = useState<UhfConfig | null>(null);
  const [plantaUrl, setPlantaUrl] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  const [novoAberto, setNovoAberto] = useState(false);
  const [editando, setEditando] = useState<UhfLeitor | null>(null);
  const [chaveGerada, setChaveGerada] = useState<ChaveGerada | null>(null);

  const [antenaSelecionadaId, setAntenaSelecionadaId] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState<{ antenaId: string; ponto: PontoPlanta } | null>(null);
  const [escalaPontos, setEscalaPontos] = useState<PontoPlanta[] | null>(null);   // null = fora do modo escala

  const carregar = useCallback(async () => {
    try {
      const [dados, planta] = await Promise.all([api.getUhfConfig(), api.getFloorPlan().catch(() => null)]);
      setConfig(dados);
      setPlantaUrl(planta?.dataUrl || null);
      setErro('');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível carregar os leitores.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // Estado online dos leitores muda sozinho: recarrega a cada 20 s (a não ser durante um arraste).
  useEffect(() => {
    const intervalo = setInterval(() => { if (!arrastando) carregar(); }, 20000);
    return () => clearInterval(intervalo);
  }, [carregar, arrastando]);

  const executar = async (acao: () => Promise<unknown>, sucesso?: string) => {
    setErro('');
    try {
      await acao();
      if (sucesso) setAviso(sucesso);
      await carregar();
      return true;
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível concluir a ação.');
      return false;
    }
  };

  const leitores = useMemo(() => config?.leitores || [], [config]);
  const escala = config?.escalaMetrosPorUnidade || ESCALA_PADRAO;
  const corDoLeitor = (leitorId: string) => CORES_LEITOR[Math.max(0, leitores.findIndex((l) => l.leitorId === leitorId)) % CORES_LEITOR.length];
  const antenas = useMemo(() => leitores.flatMap((l) => l.antenas.map((a) => ({ ...a, leitor: l }))), [leitores]);
  const antenaSelecionada = antenas.find((a) => a.antenaId === antenaSelecionadaId) || null;
  const naoPosicionadas = antenas.filter((a) => a.mapaX === null);

  // ---------- mapa: arrastar antenas e marcar a escala ----------

  const aoPonteiro = (tipo: 'down' | 'move' | 'up' | 'leave', ponto: PontoPlanta) => {
    if (escalaPontos) {
      if (tipo === 'down' && escalaPontos.length < 2) setEscalaPontos([...escalaPontos, ponto]);
      return;
    }
    if (!arrastando) return;
    if (tipo === 'move') setArrastando({ ...arrastando, ponto });
    if (tipo === 'up' || tipo === 'leave') {
      const { antenaId, ponto: final } = arrastando;
      setArrastando(null);
      executar(() => api.atualizarUhfAntena(antenaId, { mapaX: Math.round(final.x), mapaY: Math.round(final.y) }));
    }
  };

  const colocarNoMapa = (antena: UhfAntena) => {
    setAntenaSelecionadaId(antena.antenaId);
    executar(() => api.atualizarUhfAntena(antena.antenaId, { mapaX: LARGURA_PLANTA / 2, mapaY: ALTURA_PLANTA / 2 }),
      'Antena colocada no centro da planta. Arraste até o lugar certo.');
  };

  const distanciaEscala = escalaPontos && escalaPontos.length === 2
    ? Math.hypot(escalaPontos[1].x - escalaPontos[0].x, escalaPontos[1].y - escalaPontos[0].y)
    : 0;

  return (
    <div className="flex h-screen bg-dark text-white overflow-hidden">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <BuffetTopBar subtitle="Leitores UHF" />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <PageHeader
            title="Leitores UHF"
            description="Cadastre os leitores Chainway UR4, posicione as 4 antenas de cada um na planta e defina a escala. O mapa de calor usa essas posições."
            icon={<Radio size={28} />}
            action={<Button onClick={() => setNovoAberto(true)}><Plus size={16} className="mr-1.5" />Novo leitor</Button>}
          />

          {erro && <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-red-300">{erro}</p>}
          {aviso && (
            <p className="flex items-center justify-between rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-green-300">
              {aviso}
              <button type="button" onClick={() => setAviso('')} aria-label="Fechar aviso"><X size={14} /></button>
            </p>
          )}

          {/* Leitores */}
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-lg text-white">Leitores</h3>
              <Button variant="ghost" size="sm" onClick={() => carregar()}><RefreshCw size={14} className="mr-1.5" />Atualizar</Button>
            </div>
            {carregando ? (
              <p className="py-6 text-center text-gray-400"><Loader2 className="mr-2 inline animate-spin" size={16} />Carregando...</p>
            ) : leitores.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">Nenhum leitor cadastrado. Clique em "Novo leitor" para começar.</p>
            ) : (
              <div className="space-y-2">
                {leitores.map((leitor) => (
                  <div key={leitor.leitorId} className="flex flex-wrap items-center gap-3 rounded-lg bg-surface/50 p-3">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: corDoLeitor(leitor.leitorId) }} />
                    <div className="min-w-[180px] flex-1">
                      <p className="font-semibold text-white">{leitor.nome} <span className="text-xs font-normal text-gray-500">· módulo {leitor.moduleId}</span></p>
                      <p className="text-xs text-gray-400">
                        Último lote: {formatarHora(leitor.ultimoLoteEm)} · {leitor.potenciaDbm} dBm · RSSI mín. {leitor.rssiMin} dBm
                        {leitor.fw ? ` · firmware ${leitor.fw}` : ''}{leitor.ultimasPortas ? ` · portas ${leitor.ultimasPortas}` : ''}
                      </p>
                    </div>
                    {!leitor.ativo ? <Badge variant="muted">Desativado</Badge>
                      : leitor.online ? <Badge variant="success">Online</Badge> : <Badge variant="danger">Offline</Badge>}
                    <div className="flex flex-wrap gap-1.5">
                      <Button size="sm" variant="ghost" onClick={() => setEditando(leitor)}>Editar</Button>
                      <Button size="sm" variant="ghost" onClick={async () => {
                        if (!window.confirm(`Gerar uma nova chave para ${leitor.nome}? A chave atual para de funcionar e o leitor precisa receber a nova.`)) return;
                        try { setChaveGerada({ leitor, chave: (await api.gerarUhfChave(leitor.leitorId)).chave }); }
                        catch (err) { setErro(err instanceof Error ? err.message : 'Não foi possível gerar a chave.'); }
                      }}><KeyRound size={14} className="mr-1" />Nova chave</Button>
                      <Button size="sm" variant="ghost" onClick={() => executar(() => api.atualizarUhfLeitor(leitor.leitorId, { ativo: !leitor.ativo }))}>
                        <Power size={14} className="mr-1" />{leitor.ativo ? 'Desativar' : 'Ativar'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => {
                        if (window.confirm(`Remover ${leitor.nome}? As antenas e as leituras dele também são apagadas.`)) {
                          executar(() => api.removerUhfLeitor(leitor.leitorId), 'Leitor removido.');
                        }
                      }}><Trash2 size={14} className="text-danger" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            {/* Planta */}
            <Card className="xl:col-span-2">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-display text-lg text-white">Posição das antenas</h3>
                  <p className="text-xs text-gray-500">
                    {escalaPontos
                      ? escalaPontos.length < 2 ? `Clique no ${escalaPontos.length === 0 ? 'primeiro' : 'segundo'} ponto de uma medida conhecida.` : 'Informe a distância real entre os dois pontos.'
                      : 'Arraste as antenas. A posição é salva ao soltar.'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={config?.escalaMetrosPorUnidade ? 'secondary' : 'warning'}>
                    {config?.escalaMetrosPorUnidade
                      ? `Planta: ${numeroBr(LARGURA_PLANTA * escala, 1)} × ${numeroBr(ALTURA_PLANTA * escala, 1)} m`
                      : 'Escala não definida'}
                  </Badge>
                  <Button size="sm" variant={escalaPontos ? 'secondary' : 'ghost'} onClick={() => setEscalaPontos(escalaPontos ? null : [])}>
                    <Ruler size={14} className="mr-1" />{escalaPontos ? 'Cancelar' : 'Definir escala'}
                  </Button>
                </div>
              </div>

              <MapaPlanta plantaUrl={plantaUrl} onPonteiro={aoPonteiro} cursor={escalaPontos ? 'crosshair' : arrastando ? 'grabbing' : undefined}>
                {antenas.filter((a) => a.mapaX !== null).map((a) => {
                  const ponto = arrastando?.antenaId === a.antenaId ? arrastando.ponto : { x: a.mapaX as number, y: a.mapaY as number };
                  return (
                    <MarcadorAntena
                      key={a.antenaId}
                      x={ponto.x} y={ponto.y} porta={a.porta} rotulo={a.leitor.moduleId}
                      cor={corDoLeitor(a.leitorId)} raio={a.raioMetros / escala} direcaoGraus={a.direcaoGraus}
                      online={a.leitor.online && a.ativa} selecionada={a.antenaId === antenaSelecionadaId}
                      onPointerDown={escalaPontos ? undefined : (evento) => {
                        evento.stopPropagation();
                        evento.currentTarget.ownerSVGElement?.setPointerCapture?.(evento.pointerId);
                        setAntenaSelecionadaId(a.antenaId);
                        setArrastando({ antenaId: a.antenaId, ponto });
                      }}
                    />
                  );
                })}
                {escalaPontos?.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={4} fill="#FACC15" />)}
                {escalaPontos?.length === 2 && (
                  <line x1={escalaPontos[0].x} y1={escalaPontos[0].y} x2={escalaPontos[1].x} y2={escalaPontos[1].y} stroke="#FACC15" strokeWidth={2} strokeDasharray="4 3" />
                )}
              </MapaPlanta>

              {escalaPontos?.length === 2 && (
                <FormularioEscala
                  unidades={distanciaEscala}
                  onCancelar={() => setEscalaPontos(null)}
                  onSalvar={async (metros) => {
                    const ok = await executar(() => api.salvarUhfEscala(metros / distanciaEscala), 'Escala salva.');
                    if (ok) setEscalaPontos(null);
                  }}
                />
              )}

              {naoPosicionadas.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs uppercase tracking-wide text-gray-500">Antenas fora da planta</p>
                  <div className="flex flex-wrap gap-2">
                    {naoPosicionadas.map((a) => (
                      <button
                        key={a.antenaId}
                        type="button"
                        onClick={() => colocarNoMapa(a)}
                        className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-gray-300 hover:border-primary/50"
                      >
                        <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: corDoLeitor(a.leitorId) }} />
                        {a.leitor.moduleId} · porta {a.porta}
                        <Plus size={12} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Antena selecionada */}
            <Card>
              {antenaSelecionada ? (
                <PainelAntena
                  key={antenaSelecionada.antenaId}
                  antena={antenaSelecionada}
                  leitor={antenaSelecionada.leitor}
                  cor={corDoLeitor(antenaSelecionada.leitorId)}
                  onSalvar={(dados) => executar(() => api.atualizarUhfAntena(antenaSelecionada.antenaId, dados), 'Antena salva.')}
                  onCalibrar={(medicoes) => executar(() => api.calibrarUhfAntena(antenaSelecionada.antenaId, medicoes),
                    medicoes ? 'Calibração salva.' : 'Calibração removida.')}
                />
              ) : (
                <div className="py-10 text-center text-sm text-gray-500">
                  <Crosshair className="mx-auto mb-2 text-gray-600" />
                  Clique numa antena da planta para ajustar direção, alcance e calibração.
                </div>
              )}
            </Card>
          </div>
        </main>
      </div>

      <FormularioLeitor
        aberto={novoAberto || Boolean(editando)}
        leitor={editando}
        onFechar={() => { setNovoAberto(false); setEditando(null); }}
        onSalvar={async (dados) => {
          setErro('');
          try {
            if (editando) {
              await api.atualizarUhfLeitor(editando.leitorId, dados);
              setAviso('Leitor atualizado. A potência e o RSSI mínimo chegam ao leitor no próximo lote.');
            } else {
              setChaveGerada(await api.criarUhfLeitor(dados));
            }
            setNovoAberto(false);
            setEditando(null);
            await carregar();
          } catch (err) {
            setErro(err instanceof Error ? err.message : 'Não foi possível salvar o leitor.');
          }
        }}
      />

      <Modal isOpen={Boolean(chaveGerada)} onClose={() => setChaveGerada(null)} title="Chave do leitor" size="lg">
        {chaveGerada && (
          <div className="space-y-4 text-sm">
            <p className="text-gray-300">
              Esta chave aparece <strong>só agora</strong>. Configure o leitor <strong>{chaveGerada.leitor.nome}</strong> pelo Bluetooth
              (BLE "AdvTrkOneRFID-BT") enviando os comandos abaixo, um por vez:
            </p>
            <pre className="overflow-x-auto rounded-lg bg-dark-surface p-3 text-xs text-green-300">{[
              `SET_MODULE_ID:${chaveGerada.leitor.moduleId}`,
              `SET_API_URL:${API_URL}/uhf/lote`,
              `SET_DEVICE_KEY:${chaveGerada.chave}`,
              'SET_SAVE_CONFIG',
            ].join('\n')}</pre>
            <p className="text-xs text-gray-500">
              Se o endereço da API acima for "localhost", troque pelo IP do computador do backend na rede do leitor (ex.: http://192.168.0.50:3001/api/uhf/lote).
              Backend local é sempre http (não https).
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => navigator.clipboard?.writeText(chaveGerada.chave)}>Copiar chave</Button>
              <Button onClick={() => setChaveGerada(null)}>Já configurei</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ---------- formulários ----------

function FormularioEscala({ unidades, onSalvar, onCancelar }: { unidades: number; onSalvar: (metros: number) => void; onCancelar: () => void }) {
  const [metros, setMetros] = useState('');
  const valor = Number(metros.replace(',', '.'));
  return (
    <div className="mt-3 flex flex-wrap items-end gap-2 rounded-lg bg-surface/50 p-3">
      <label className="flex-1 text-xs text-gray-400">
        Distância real entre os dois pontos (metros)
        <input autoFocus className={`${campo} mt-1`} inputMode="decimal" value={metros} onChange={(e) => setMetros(e.target.value)} placeholder="ex.: 5" />
      </label>
      <Button variant="ghost" onClick={onCancelar}>Cancelar</Button>
      <Button disabled={!(valor > 0) || !unidades} onClick={() => onSalvar(valor)}><Save size={14} className="mr-1" />Salvar escala</Button>
    </div>
  );
}

interface DadosLeitor { moduleId: string; nome: string; potenciaDbm: number; rssiMin: number }

function FormularioLeitor({ aberto, leitor, onFechar, onSalvar }: {
  aberto: boolean; leitor: UhfLeitor | null; onFechar: () => void; onSalvar: (dados: DadosLeitor) => Promise<void>;
}) {
  const [dados, setDados] = useState<DadosLeitor>({ moduleId: '', nome: '', potenciaDbm: 25, rssiMin: -75 });
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    setDados(leitor
      ? { moduleId: leitor.moduleId, nome: leitor.nome, potenciaDbm: leitor.potenciaDbm, rssiMin: leitor.rssiMin }
      : { moduleId: '', nome: '', potenciaDbm: 25, rssiMin: -75 });
  }, [aberto, leitor]);

  return (
    <Modal isOpen={aberto} onClose={onFechar} title={leitor ? 'Editar leitor' : 'Novo leitor UHF'}>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setSalvando(true);
          try { await onSalvar(dados); } finally { setSalvando(false); }
        }}
      >
        <label className="block text-sm text-gray-300">Nome
          <input className={`${campo} mt-1`} value={dados.nome} onChange={(e) => setDados({ ...dados, nome: e.target.value })} placeholder="ex.: UR4 Salão" />
        </label>
        <label className="block text-sm text-gray-300">ID do módulo (o mesmo configurado no leitor)
          <input className={`${campo} mt-1`} value={dados.moduleId} maxLength={16} required onChange={(e) => setDados({ ...dados, moduleId: e.target.value })} placeholder="ex.: UR4-01" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm text-gray-300">Potência (5-30 dBm)
            <input className={`${campo} mt-1`} type="number" min={5} max={30} value={dados.potenciaDbm} onChange={(e) => setDados({ ...dados, potenciaDbm: Number(e.target.value) })} />
          </label>
          <label className="block text-sm text-gray-300">RSSI mínimo (dBm)
            <input className={`${campo} mt-1`} type="number" min={-100} max={-20} value={dados.rssiMin} onChange={(e) => setDados({ ...dados, rssiMin: Number(e.target.value) })} />
          </label>
        </div>
        {!leitor && <p className="text-xs text-gray-500">O leitor é criado com as 4 antenas (portas 1 a 4). Depois posicione cada uma na planta.</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onFechar}>Cancelar</Button>
          <Button type="submit" disabled={salvando || !dados.moduleId.trim()}>{salvando ? 'Salvando...' : 'Salvar'}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ---------- antena selecionada: direção, alcance e calibração ----------

const DIRECOES = [
  { rotulo: '↑', graus: 0 }, { rotulo: '→', graus: 90 }, { rotulo: '↓', graus: 180 }, { rotulo: '←', graus: 270 },
];

function PainelAntena({ antena, leitor, cor, onSalvar, onCalibrar }: {
  antena: UhfAntena; leitor: UhfLeitor; cor: string;
  onSalvar: (dados: Partial<UhfAntena>) => Promise<boolean>;
  onCalibrar: (medicoes: { distancia: number; rssi: number }[] | null) => Promise<boolean>;
}) {
  const [nome, setNome] = useState(antena.nome || '');
  const [noTeto, setNoTeto] = useState(antena.direcaoGraus === null);
  const [direcao, setDirecao] = useState(antena.direcaoGraus ?? 0);
  const [raio, setRaio] = useState(String(antena.raioMetros));
  const [ativa, setAtiva] = useState(antena.ativa);

  const [calibrando, setCalibrando] = useState(false);
  const [leituras, setLeituras] = useState<UhfLeituraAntena[]>([]);
  const [distancia, setDistancia] = useState('1');
  const [medicoes, setMedicoes] = useState<{ distancia: number; rssi: number }[]>([]);

  // Durante a calibração, busca as leituras desta antena a cada 5 s.
  useEffect(() => {
    if (!calibrando) return undefined;
    let ativo = true;
    const buscar = () => api.getUhfLeiturasAntena(antena.antenaId).then((l) => { if (ativo) setLeituras(l); }).catch(() => undefined);
    buscar();
    const intervalo = setInterval(buscar, 5000);
    return () => { ativo = false; clearInterval(intervalo); };
  }, [calibrando, antena.antenaId]);

  // Pulseira mais forte da janela mais recente.
  const melhor = leituras.length ? leituras.filter((l) => l.balde === leituras[0].balde).sort((a, b) => b.rssiMed - a.rssiMed)[0] : null;
  const raioNumero = Number(raio.replace(',', '.'));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: cor }} />
        <h3 className="font-display text-lg text-white">{leitor.moduleId} · porta {antena.porta}</h3>
      </div>

      <label className="block text-sm text-gray-300">Nome
        <input className={`${campo} mt-1`} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="ex.: Entrada" />
      </label>

      <div>
        <p className="mb-1 text-sm text-gray-300">Montagem</p>
        <div className="flex gap-2">
          <Button size="sm" variant={noTeto ? 'primary' : 'ghost'} onClick={() => setNoTeto(true)}>Teto (aponta para baixo)</Button>
          <Button size="sm" variant={!noTeto ? 'primary' : 'ghost'} onClick={() => setNoTeto(false)}>Parede</Button>
        </div>
        {!noTeto && (
          <div className="mt-2 flex items-center gap-2">
            {DIRECOES.map((d) => (
              <Button key={d.graus} size="sm" variant={direcao === d.graus ? 'secondary' : 'ghost'} onClick={() => setDirecao(d.graus)}>{d.rotulo}</Button>
            ))}
            <input className={`${campo} w-20`} type="number" min={0} max={359} value={direcao} onChange={(e) => setDirecao(Number(e.target.value))} aria-label="Direção em graus" />
            <span className="text-xs text-gray-500">graus</span>
          </div>
        )}
      </div>

      <label className="block text-sm text-gray-300">Alcance (metros)
        <input className={`${campo} mt-1`} inputMode="decimal" value={raio} onChange={(e) => setRaio(e.target.value)} />
      </label>

      <label className="flex items-center gap-2 text-sm text-gray-300">
        <input type="checkbox" checked={ativa} onChange={(e) => setAtiva(e.target.checked)} />
        Antena em uso
      </label>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={!(raioNumero >= 0.2 && raioNumero <= 15)}
          onClick={() => onSalvar({ nome, direcaoGraus: noTeto ? null : direcao, raioMetros: raioNumero, ativa })}
        ><Save size={14} className="mr-1" />Salvar antena</Button>
        <Button size="sm" variant="ghost" onClick={() => onSalvar({ mapaX: null, mapaY: null })}>Tirar da planta</Button>
      </div>

      {/* Calibração */}
      <div className="border-t border-white/10 pt-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-white">Calibração</p>
          <Badge variant={antena.rssi1m !== null ? 'success' : 'muted'}>
            {antena.rssi1m !== null ? `${numeroBr(antena.rssi1m, 1)} dBm a 1 m · expoente ${numeroBr(antena.expoente)}` : 'Sem calibração'}
          </Badge>
        </div>
        {!calibrando ? (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={() => { setCalibrando(true); setMedicoes([]); }}>Calibrar</Button>
            {antena.rssi1m !== null && <Button size="sm" variant="ghost" onClick={() => onCalibrar(null)}>Remover calibração</Button>}
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <p className="text-xs text-gray-400">
              Segure uma pulseira no pulso, de frente para a antena, a uma distância medida. Espere uma janela de 20 s e clique em
              "Registrar". Repita em pelo menos 2 distâncias (ex.: 0,5 m, 1 m e 1,5 m).
            </p>
            <p className="text-xs text-gray-300">
              {melhor ? `Agora: pulseira ${melhor.codigo} · ${numeroBr(melhor.rssiMed, 1)} dBm · lida em ${melhor.n}/${melhor.ciclos} ciclos` : 'Nenhuma leitura nesta antena no último minuto.'}
            </p>
            <div className="flex items-center gap-2">
              <input className={`${campo} w-24`} inputMode="decimal" value={distancia} onChange={(e) => setDistancia(e.target.value)} aria-label="Distância em metros" />
              <span className="text-xs text-gray-500">m</span>
              <Button size="sm" variant="secondary" disabled={!melhor || !(Number(distancia.replace(',', '.')) > 0)}
                onClick={() => melhor && setMedicoes([...medicoes, { distancia: Number(distancia.replace(',', '.')), rssi: melhor.rssiMed }])}>
                Registrar
              </Button>
            </div>
            {medicoes.length > 0 && (
              <ul className="text-xs text-gray-300">
                {medicoes.map((m, i) => <li key={i}>{numeroBr(m.distancia)} m → {numeroBr(m.rssi, 1)} dBm</li>)}
              </ul>
            )}
            <div className="flex gap-2">
              <Button size="sm" disabled={new Set(medicoes.map((m) => m.distancia)).size < 2}
                onClick={async () => { if (await onCalibrar(medicoes)) setCalibrando(false); }}>Calcular e salvar</Button>
              <Button size="sm" variant="ghost" onClick={() => setCalibrando(false)}>Cancelar</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
