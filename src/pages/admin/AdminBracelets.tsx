import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Watch, Check, X, Undo2, Inbox, PackageCheck, Radio, ScanLine } from 'lucide-react';
import { api, API_URL, type PulseiraRecebida } from '../../services/api';
import { createAuthenticatedWebSocket, getWebSocketServerUrl } from '../../services/websocket';
import { lerToken } from '../../utils/sessao';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { useDeviceNFC } from '../../hooks/useDeviceNFC';
import DeviceNfcButton from '../../components/ui/DeviceNfcButton';
import AdminSidebar from '../../components/layout/AdminSidebar';
import BuffetTopBar from '../../components/layout/BuffetTopBar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { confirmar } from '../../components/ui/dialogo';
import Input from '../../components/ui/Input';
import SolicitarEquipamentos from '../../components/checkpoints/SolicitarEquipamentos';

type Pendente = { codigo: string; enviadoEm: string };

// Uma linha da lista completa: toda pulseira que está no cadastro do buffet
type PulseiraDoBuffet = {
  codigo: string;
  status: string;
  criancaId: string | null;
  crianca_nome?: string | null;
  crianca_apelido?: string | null;
  evento_nome?: string | null;
  recebidoDoMasterEm?: string | null;
};
type FiltroLista = 'todas' | 'em_uso' | 'livres' | 'outras';

// Situação de uma pulseira para o admin: em uso por uma criança, livre, perdida ou bloqueada
function situacaoDaPulseira(p: PulseiraDoBuffet): 'em_uso' | 'livre' | 'perdida' | 'bloqueada' | 'outra' {
  if (p.criancaId || p.status === 'em_uso') return 'em_uso';
  if (p.status === 'disponivel') return 'livre';
  if (p.status === 'perdida') return 'perdida';
  if (p.status === 'bloqueada') return 'bloqueada';
  return 'outra';
}

const formatarData = (data: string | null) =>
  data ? new Date(data).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

// Escuta o leitor de recepção do buffet (qualquer pulseira passada nele, com ou sem evento aberto)
function useLeitorDoBuffet(aoLer: (codigo: string) => void) {
  const [conectado, setConectado] = useState(false);
  const aoLerRef = useRef(aoLer);
  useEffect(() => { aoLerRef.current = aoLer; });

  useEffect(() => {
    let encerrado = false;
    let socket: WebSocket | null = null;
    let tentativa = 0;
    let religar: number | undefined;

    const conectar = () => {
      if (encerrado) return;
      socket = createAuthenticatedWebSocket(`${getWebSocketServerUrl(API_URL)}?scope=company`, lerToken());
      socket.onopen = () => { tentativa = 0; setConectado(true); };
      socket.onmessage = (evento) => {
        try {
          const mensagem = JSON.parse(evento.data);
          const codigo = mensagem?.type === 'RECEPTION_BRACELET_READ' ? mensagem.payload?.braceletCode : null;
          if (codigo) aoLerRef.current(String(codigo).toUpperCase());
        } catch {
          // mensagem que não é para esta tela
        }
      };
      socket.onclose = () => {
        setConectado(false);
        if (encerrado) return;
        tentativa += 1;
        religar = window.setTimeout(conectar, Math.min(1000 * 2 ** tentativa, 30_000));
      };
    };
    conectar();
    return () => {
      encerrado = true;
      window.clearTimeout(religar);
      socket?.close();
    };
  }, []);

  return conectado;
}

// Seleção de códigos com "selecionar todos"
function useSelecao(codigos: string[]) {
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  // Some da seleção o que saiu da lista (aceito, recusado, devolvido)
  const validos = useMemo(() => codigos.filter((c) => marcados.has(c)), [codigos, marcados]);
  const todos = codigos.length > 0 && validos.length === codigos.length;
  return {
    validos,
    todos,
    marcado: (codigo: string) => marcados.has(codigo),
    alternar: (codigo: string) => setMarcados((atual) => {
      const novo = new Set(atual);
      if (novo.has(codigo)) novo.delete(codigo); else novo.add(codigo);
      return novo;
    }),
    alternarTodos: () => setMarcados(todos ? new Set() : new Set(codigos)),
    marcar: (codigo: string) => setMarcados((atual) => new Set(atual).add(codigo)),
    limpar: () => setMarcados(new Set()),
  };
}

export default function AdminBracelets() {
  const [pendentes, setPendentes] = useState<Pendente[]>([]);
  const [recebidas, setRecebidas] = useState<PulseiraRecebida[]>([]);
  const [todas, setTodas] = useState<PulseiraDoBuffet[]>([]);
  const [filtro, setFiltro] = useState<FiltroLista>('todas');
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);

  const livres = useMemo(() => recebidas.filter((p) => !p.emUso && p.status === 'disponivel'), [recebidas]);
  const selPendentes = useSelecao(useMemo(() => pendentes.map((p) => p.codigo), [pendentes]));
  // Pulseiras conferidas no leitor: a leitura confirma que a pulseira chegou e já deixa ela marcada para o aceite
  const [conferidas, setConferidas] = useState<Set<string>>(new Set());
  const [ultimaLeitura, setUltimaLeitura] = useState<{ codigo: string; situacao: 'conferida' | 'repetida' | 'desconhecida' } | null>(null);
  const pendentesRef = useRef<Pendente[]>([]);
  const selLivres = useSelecao(useMemo(() => livres.map((p) => p.codigo), [livres]));

  const carregar = useCallback(async (silencioso = false) => {
    try {
      const [aguardando, minhas, lista] = await Promise.all([api.pulseirasPendentes(), api.pulseirasRecebidasDoMaster(), api.getPulseiras()]);
      setPendentes(aguardando);
      setRecebidas(minhas);
      setTodas(lista as PulseiraDoBuffet[]);
    } catch (erro) {
      if (!silencioso) toast.error(erro instanceof Error ? erro.message : 'Não foi possível carregar as pulseiras');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { pendentesRef.current = pendentes; }, [pendentes]);
  useEffect(() => { void carregar(); }, [carregar]);
  useAutoRefresh(() => carregar(true), { topicos: ['pulseiras'], pausado: ocupado });

  const aoLerPulseira = useCallback((codigo: string) => {
    const lista = pendentesRef.current;
    if (!lista.some((p) => p.codigo === codigo)) {
      setUltimaLeitura({ codigo, situacao: 'desconhecida' });
      toast.error(`A pulseira ${codigo} não está na lista enviada pela Pulyn`);
      return;
    }
    setConferidas((atual) => {
      if (atual.has(codigo)) {
        setUltimaLeitura({ codigo, situacao: 'repetida' });
        return atual;
      }
      setUltimaLeitura({ codigo, situacao: 'conferida' });
      return new Set(atual).add(codigo);
    });
    selPendentes.marcar(codigo);
  // selPendentes.marcar só usa o setter do estado, que é estável
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const leitorConectado = useLeitorDoBuffet(aoLerPulseira);
  // Conferir também pelo NFC do próprio celular/tablet (Chrome no Android, página em HTTPS). O número de série vem como 04:A1:...
  const nfcDoAparelho = useDeviceNFC((codigo) => aoLerPulseira(codigo.replace(/[^0-9a-f]/gi, '').toUpperCase()), true, 'pulyn.admin.pulseiras.deviceNfc');
  // Só conta como conferida a que ainda espera aceite (as aceitas saem da lista)
  const totalConferidas = useMemo(() => pendentes.filter((p) => conferidas.has(p.codigo)).length, [pendentes, conferidas]);

  const executar = async (acao: () => Promise<unknown>, sucesso: string, aoConcluir: () => void) => {
    setOcupado(true);
    try {
      await acao();
      toast.success(sucesso);
      aoConcluir();
      await carregar(true);
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : 'Não foi possível concluir');
    } finally {
      setOcupado(false);
    }
  };

  const aceitar = (codigos: string[]) => executar(() => api.aceitarPulseiras(codigos), `${codigos.length} pulseira(s) aceita(s): já podem ser usadas`, selPendentes.limpar);
  const recusar = async (codigos: string[]) => {
    if (!(await confirmar(`Recusar ${codigos.length} pulseira(s)? Elas voltam para o estoque do master.`, { titulo: 'Recusar pulseiras', confirmar: 'Recusar' }))) return;
    void executar(() => api.recusarPulseiras(codigos), `${codigos.length} pulseira(s) recusada(s)`, selPendentes.limpar);
  };
  const devolver = async (codigos: string[]) => {
    if (!(await confirmar(`Devolver ${codigos.length} pulseira(s) ao master? Elas saem do seu cadastro.`, { titulo: 'Devolver pulseiras', confirmar: 'Devolver' }))) return;
    void executar(() => api.devolverPulseiras(codigos), `${codigos.length} pulseira(s) devolvida(s) ao master`, selLivres.limpar);
  };

  const contagem = useMemo(() => {
    const c = { em_uso: 0, livre: 0, outras: 0 };
    for (const p of todas) {
      const s = situacaoDaPulseira(p);
      if (s === 'em_uso') c.em_uso += 1; else if (s === 'livre') c.livre += 1; else c.outras += 1;
    }
    return c;
  }, [todas]);

  const listaFiltrada = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return todas.filter((p) => {
      const s = situacaoDaPulseira(p);
      if (filtro === 'em_uso' && s !== 'em_uso') return false;
      if (filtro === 'livres' && s !== 'livre') return false;
      if (filtro === 'outras' && (s === 'em_uso' || s === 'livre')) return false;
      if (!termo) return true;
      return p.codigo.toLowerCase().includes(termo)
        || (p.crianca_nome || '').toLowerCase().includes(termo)
        || (p.crianca_apelido || '').toLowerCase().includes(termo);
    });
  }, [todas, filtro, busca]);

  const filtros: { chave: FiltroLista; rotulo: string; total: number }[] = [
    { chave: 'todas', rotulo: 'Todas', total: todas.length },
    { chave: 'em_uso', rotulo: 'Em uso', total: contagem.em_uso },
    { chave: 'livres', rotulo: 'Livres', total: contagem.livre },
    { chave: 'outras', rotulo: 'Perdidas / bloqueadas', total: contagem.outras },
  ];

  return (
    <div className="flex h-screen bg-dark text-white overflow-hidden">
      <AdminSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <BuffetTopBar subtitle="Pulseiras" />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <PageHeader
            title="Pulseiras"
            description="Veja todas as suas pulseiras e quais estão em uso, aceite as que a Pulyn enviou e peça mais quando precisar"
            icon={<Watch size={28} />}
            action={<SolicitarEquipamentos />}
          />

          <Card>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-display text-lg text-white">
                <Watch size={18} className="text-primary" />
                Todas as pulseiras <span className="text-sm text-gray-500">({todas.length})</span>
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="primary">{contagem.em_uso} em uso</Badge>
                <Badge variant="success">{contagem.livre} livres</Badge>
                {contagem.outras > 0 && <Badge variant="warning">{contagem.outras} perdidas/bloqueadas</Badge>}
                {pendentes.length > 0 && <Badge variant="secondary">{pendentes.length} aguardando aceite</Badge>}
              </div>
            </div>
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-wrap gap-2">
                {filtros.map((f) => (
                  <Button key={f.chave} variant={filtro === f.chave ? 'primary' : 'ghost'} size="sm" onClick={() => setFiltro(f.chave)}>
                    {f.rotulo} ({f.total})
                  </Button>
                ))}
              </div>
              <div className="sm:ml-auto sm:w-72">
                <Input placeholder="Buscar por código ou criança..." value={busca} onChange={(e) => setBusca(e.target.value)} />
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {carregando ? (
                <p className="py-8 text-center text-gray-500">Carregando...</p>
              ) : listaFiltrada.length === 0 ? (
                <p className="py-8 text-center text-gray-500">
                  {todas.length === 0 ? 'Você ainda não tem pulseiras. Use "Solicitar pulseiras e checkpoints" para pedir à Pulyn.' : 'Nenhuma pulseira nesse filtro.'}
                </p>
              ) : (
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-dark-card">
                    <tr className="border-b border-border">
                      <th className="pb-3 pr-4 text-sm font-body font-semibold text-gray-400">Código</th>
                      <th className="pb-3 pr-4 text-sm font-body font-semibold text-gray-400">Situação</th>
                      <th className="pb-3 pr-4 text-sm font-body font-semibold text-gray-400">Criança</th>
                      <th className="pb-3 pr-4 text-sm font-body font-semibold text-gray-400">Evento</th>
                      <th className="pb-3 text-sm font-body font-semibold text-gray-400">Recebida em</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {listaFiltrada.map((p) => {
                      const s = situacaoDaPulseira(p);
                      return (
                        <tr key={p.codigo} className="hover:bg-surface/50 transition-colors">
                          <td className="py-2.5 pr-4 font-mono text-sm text-white">{p.codigo}</td>
                          <td className="py-2.5 pr-4">
                            {s === 'em_uso' ? <Badge variant="primary">Em uso</Badge>
                              : s === 'livre' ? <Badge variant="success">Livre</Badge>
                                : <Badge variant="warning">{s === 'perdida' ? 'Perdida' : s === 'bloqueada' ? 'Bloqueada' : p.status}</Badge>}
                          </td>
                          <td className="py-2.5 pr-4 text-sm text-gray-300">{p.crianca_apelido || p.crianca_nome || '—'}</td>
                          <td className="py-2.5 pr-4 text-sm text-gray-400">{p.evento_nome || '—'}</td>
                          <td className="py-2.5 text-sm text-gray-400">{formatarData(p.recebidoDoMasterEm ?? null)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </Card>

          <Card>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-display text-lg text-white">
                <Inbox size={18} className="text-warning" />
                Aguardando seu aceite <span className="text-sm text-gray-500">({pendentes.length})</span>
              </h2>
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" className="border border-border" disabled={selPendentes.validos.length === 0 || ocupado} onClick={() => recusar(selPendentes.validos)}>
                  <X size={16} className="mr-1.5" />
                  Recusar{selPendentes.validos.length > 0 ? ` ${selPendentes.validos.length}` : ''}
                </Button>
                <Button variant="success" disabled={pendentes.length === 0 || ocupado} onClick={async () => {
                  const alvo = selPendentes.validos.length > 0 ? selPendentes.validos : pendentes.map((p) => p.codigo);
                  const faltam = alvo.filter((c) => !conferidas.has(c)).length;
                  if (faltam > 0 && !(await confirmar(`${faltam} das ${alvo.length} pulseiras ainda não foram conferidas no leitor. Aceitar mesmo assim?`, { titulo: 'Pulseiras não conferidas', confirmar: 'Aceitar mesmo assim', perigo: false }))) return;
                  void aceitar(alvo);
                }}>
                  <Check size={16} className="mr-1.5" />
                  {selPendentes.validos.length > 0 ? `Aceitar ${selPendentes.validos.length}` : 'Aceitar todas'}
                </Button>
              </div>
            </div>
            <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
              <Radio size={16} className={leitorConectado ? 'text-success' : 'text-gray-500'} />
              <span className="text-gray-300">
                {leitorConectado
                  ? 'Passe cada pulseira no leitor da recepção para conferir que ela chegou.'
                  : 'Leitor sem conexão em tempo real. Reconectando... você ainda pode aceitar pela lista.'}
              </span>
              <DeviceNfcButton status={nfcDoAparelho.status} error={nfcDoAparelho.error} onStart={nfcDoAparelho.start} onStop={nfcDoAparelho.stop} />
              {nfcDoAparelho.error && <span role="alert" className="text-xs text-warning">{nfcDoAparelho.error}</span>}
              {pendentes.length > 0 && (
                <Badge variant={totalConferidas === pendentes.length ? 'success' : 'warning'}>
                  {totalConferidas} de {pendentes.length} conferidas
                </Badge>
              )}
              {ultimaLeitura && (
                <span role="status" className="font-mono text-xs text-gray-400">
                  Última: <span className="text-white">{ultimaLeitura.codigo}</span>{' '}
                  {ultimaLeitura.situacao === 'conferida' ? '✓ conferida' : ultimaLeitura.situacao === 'repetida' ? '(já conferida)' : '✗ não consta na lista'}
                </span>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {carregando ? (
                <p className="py-8 text-center text-gray-500">Carregando...</p>
              ) : pendentes.length === 0 ? (
                <p className="py-8 text-center text-gray-500">Nenhuma pulseira esperando aceite.</p>
              ) : (
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-dark-card">
                    <tr className="border-b border-border">
                      <th className="w-10 pb-3 pr-2">
                        <input type="checkbox" checked={selPendentes.todos} onChange={selPendentes.alternarTodos} aria-label="Selecionar todas as pulseiras pendentes" className="h-4 w-4 cursor-pointer accent-primary" />
                      </th>
                      <th className="pb-3 pr-4 text-sm font-body font-semibold text-gray-400">Código</th>
                      <th className="pb-3 pr-4 text-sm font-body font-semibold text-gray-400">Conferência</th>
                      <th className="pb-3 text-sm font-body font-semibold text-gray-400">Enviada em</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pendentes.map((p) => (
                      <tr key={p.codigo} className="hover:bg-surface/50 transition-colors">
                        <td className="py-2.5 pr-2">
                          <input type="checkbox" checked={selPendentes.marcado(p.codigo)} onChange={() => selPendentes.alternar(p.codigo)} aria-label={`Selecionar ${p.codigo}`} className="h-4 w-4 cursor-pointer accent-primary" />
                        </td>
                        <td className="py-2.5 pr-4 font-mono text-sm text-white">{p.codigo}</td>
                        <td className="py-2.5 pr-4">
                          {conferidas.has(p.codigo)
                            ? <Badge variant="success">Conferida</Badge>
                            : <span className="inline-flex items-center gap-1 text-xs text-gray-500"><ScanLine size={14} />Falta ler</span>}
                        </td>
                        <td className="py-2.5 text-sm text-gray-400">{formatarData(p.enviadoEm)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>

          <Card>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-display text-lg text-white">
                <PackageCheck size={18} className="text-success" />
                Recebidas da Pulyn <span className="text-sm text-gray-500">({recebidas.length})</span>
              </h2>
              <Button variant="ghost" className="border border-border" disabled={selLivres.validos.length === 0 || ocupado} onClick={() => devolver(selLivres.validos)}>
                <Undo2 size={16} className="mr-1.5" />
                Devolver{selLivres.validos.length > 0 ? ` ${selLivres.validos.length}` : ''} ao master
              </Button>
            </div>
            <p className="mb-3 text-xs text-gray-500">Só dá para devolver as pulseiras livres: as que estão em uso por uma criança ou marcadas como perdidas ou bloqueadas ficam com você.</p>
            <div className="max-h-96 overflow-y-auto">
              {recebidas.length === 0 ? (
                <p className="py-8 text-center text-gray-500">Você ainda não recebeu pulseiras da Pulyn.</p>
              ) : (
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-dark-card">
                    <tr className="border-b border-border">
                      <th className="w-10 pb-3 pr-2">
                        {livres.length > 0 && (
                          <input type="checkbox" checked={selLivres.todos} onChange={selLivres.alternarTodos} aria-label="Selecionar todas as pulseiras livres" className="h-4 w-4 cursor-pointer accent-primary" />
                        )}
                      </th>
                      <th className="pb-3 pr-4 text-sm font-body font-semibold text-gray-400">Código</th>
                      <th className="pb-3 pr-4 text-sm font-body font-semibold text-gray-400">Situação</th>
                      <th className="pb-3 text-sm font-body font-semibold text-gray-400">Recebida em</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recebidas.map((p) => {
                      const livre = !p.emUso && p.status === 'disponivel';
                      return (
                        <tr key={p.codigo} className="hover:bg-surface/50 transition-colors">
                          <td className="py-2.5 pr-2">
                            {livre && (
                              <input type="checkbox" checked={selLivres.marcado(p.codigo)} onChange={() => selLivres.alternar(p.codigo)} aria-label={`Selecionar ${p.codigo}`} className="h-4 w-4 cursor-pointer accent-primary" />
                            )}
                          </td>
                          <td className="py-2.5 pr-4 font-mono text-sm text-white">{p.codigo}</td>
                          <td className="py-2.5 pr-4">
                            {livre ? <Badge variant="success">Livre</Badge> : p.emUso ? <Badge variant="primary">Em uso</Badge> : <Badge variant="warning">{p.status === 'perdida' ? 'Perdida' : p.status === 'bloqueada' ? 'Bloqueada' : p.status}</Badge>}
                          </td>
                          <td className="py-2.5 text-sm text-gray-400">{formatarData(p.recebidoDoMasterEm)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
