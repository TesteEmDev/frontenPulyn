import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Watch, Send, Trash2, Undo2, Plus, Radio, Boxes, Hourglass, PackageCheck } from 'lucide-react';
import {
  api, API_URL,
  type BuffetOpcao, type MovimentoDePulseira, type PulseiraDoBuffet, type PulseiraDoEstoque, type PulseirasPorBuffet, type ResumoDePulseiras,
} from '../../services/api';
import { createAuthenticatedWebSocket, getWebSocketServerUrl } from '../../services/websocket';
import { lerToken } from '../../utils/sessao';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { useDeviceNFC } from '../../hooks/useDeviceNFC';
import DeviceNfcButton from '../../components/ui/DeviceNfcButton';
import Sidebar from '../../components/layout/Sidebar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import SeletorDeBuffet from './SeletorDeBuffet';
import { masterNavItems } from './masterNav';

const ROTULO_MOVIMENTO: Record<MovimentoDePulseira['tipo'], { texto: string; variante: 'primary' | 'success' | 'warning' | 'muted' }> = {
  enviada: { texto: 'Enviada', variante: 'primary' },
  aceita: { texto: 'Aceita', variante: 'success' },
  recusada: { texto: 'Recusada', variante: 'warning' },
  devolvida: { texto: 'Devolvida', variante: 'muted' },
};

const SITUACAO_DA_PULSEIRA: Record<string, { texto: string; variante: 'success' | 'primary' | 'warning' | 'danger' | 'muted' }> = {
  disponivel: { texto: 'Livre', variante: 'success' },
  em_uso: { texto: 'Em uso', variante: 'primary' },
  perdida: { texto: 'Perdida', variante: 'warning' },
  bloqueada: { texto: 'Bloqueada', variante: 'danger' },
};
const POR_PAGINA = 100;

const formatarData = (data: string | null) =>
  data ? new Date(data).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

// Conecta ao servidor como master e avisa cada pulseira passada no leitor de estoque (recepção sem buffet).
function useLeitorDoMaster(aoLer: (codigo: string) => void) {
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
      socket = createAuthenticatedWebSocket(getWebSocketServerUrl(API_URL) ?? '', lerToken());
      socket.onopen = () => { tentativa = 0; setConectado(true); };
      socket.onmessage = (evento) => {
        try {
          const mensagem = JSON.parse(evento.data);
          const codigo = mensagem?.type === 'MASTER_BRACELET_READ' ? mensagem.payload?.braceletCode : null;
          if (codigo) aoLerRef.current(String(codigo));
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

export default function MasterBracelets() {
  const location = useLocation();
  const [menuRecolhido, setMenuRecolhido] = useState(false);
  const [estoque, setEstoque] = useState<PulseiraDoEstoque[]>([]);
  const [resumo, setResumo] = useState<ResumoDePulseiras | null>(null);
  const [historico, setHistorico] = useState<MovimentoDePulseira[]>([]);
  const [buffets, setBuffets] = useState<BuffetOpcao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [digitado, setDigitado] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [destino, setDestino] = useState('');
  // Pulseiras que já estão nos buffets (as enviadas daqui e as que o buffet cadastrou)
  const [porBuffet, setPorBuffet] = useState<PulseirasPorBuffet[]>([]);
  const [nosBuffets, setNosBuffets] = useState<PulseiraDoBuffet[]>([]);
  const [totalNosBuffets, setTotalNosBuffets] = useState(0);
  const [filtroBuffet, setFiltroBuffet] = useState('');
  const [filtroSituacao, setFiltroSituacao] = useState('');
  const [busca, setBusca] = useState('');
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [ultimaLida, setUltimaLida] = useState<{ codigo: string; nova: boolean } | null>(null);

  const carregar = useCallback(async (silencioso = false) => {
    try {
      const [lista, totais, passos, destinos] = await Promise.all([
        api.masterGetPulseiras(), api.masterResumoDePulseiras(), api.masterHistoricoDePulseiras(), api.masterGetBuffets(),
      ]);
      setEstoque(lista);
      setResumo(totais);
      setHistorico(passos);
      setBuffets(destinos);
    } catch (erro) {
      if (!silencioso) toast.error(erro instanceof Error ? erro.message : 'Não foi possível carregar as pulseiras');
    } finally {
      setCarregando(false);
    }
  }, []);

  // Lista das pulseiras dos buffets, com os filtros da tela. `acumular`: "ver mais" junta a próxima página.
  const carregarNosBuffets = useCallback(async (acumular = false) => {
    try {
      const filtros = { empresaId: filtroBuffet, status: filtroSituacao, q: busca.trim(), limit: POR_PAGINA };
      const pagina = await api.masterPulseirasNosBuffets({ ...filtros, offset: acumular ? nosBuffets.length : 0 });
      setTotalNosBuffets(pagina.total);
      setNosBuffets((atual) => (acumular ? [...atual, ...pagina.itens] : pagina.itens));
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : 'Não foi possível carregar as pulseiras dos buffets');
    }
  // nosBuffets.length só importa ao acumular
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroBuffet, filtroSituacao, busca, nosBuffets.length]);

  const carregarTotais = useCallback(async () => {
    try { setPorBuffet(await api.masterPulseirasPorBuffet()); } catch { /* o resto da tela segue */ }
  }, []);

  useEffect(() => { void carregar(); void carregarTotais(); }, [carregar, carregarTotais]);
  // Mudou o filtro (a busca espera a pessoa parar de digitar): recomeça a lista do início
  useEffect(() => {
    const espera = window.setTimeout(() => { void carregarNosBuffets(false); }, busca ? 350 : 0);
    return () => window.clearTimeout(espera);
  // carregarNosBuffets muda com o tamanho da lista; aqui só os filtros reiniciam a lista
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroBuffet, filtroSituacao, busca]);
  useAutoRefresh(() => {
    void carregarTotais();
    // Com várias páginas abertas ("ver mais") a lista não é refeita sozinha, para não encolher sob quem está rolando
    if (nosBuffets.length <= POR_PAGINA) void carregarNosBuffets(false);
    return carregar(true);
  }, { topicos: ['pulseiras'], pausado: enviando });

  // Pulseira lida no leitor (ou digitada): entra no estoque e na lista
  const adicionar = useCallback(async (codigos: string[]) => {
    try {
      const r = await api.masterAdicionarPulseiras(codigos);
      if (r.invalidos.length > 0) toast.error(`Código inválido: ${r.invalidos.join(', ')}`);
      const nova = r.adicionadas.length > 0;
      const codigo = r.adicionadas[0] ?? r.jaNoEstoque[0];
      if (codigo) setUltimaLida({ codigo, nova });
      if (nova) toast.success(r.adicionadas.length === 1 ? `Pulseira ${r.adicionadas[0]} entrou na lista` : `${r.adicionadas.length} pulseiras entraram na lista`);
      else if (r.jaNoEstoque.length > 0) toast(`${r.jaNoEstoque.length === 1 ? 'Essa pulseira' : 'Essas pulseiras'} já estava${r.jaNoEstoque.length === 1 ? '' : 'm'} na lista`);
      if (r.jaComBuffet.length > 0) toast(`Atenção: ${r.jaComBuffet.join(', ')} já existe em algum buffet`, { icon: '⚠️' });
      // Já deixa marcada para o envio
      if (r.adicionadas.length > 0) setSelecionadas((atual) => new Set([...atual, ...r.adicionadas]));
      await carregar(true);
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : 'Não foi possível adicionar a pulseira');
    }
  }, [carregar]);

  const leitorConectado = useLeitorDoMaster((codigo) => { void adicionar([codigo]); });
  // Também dá para ler pelo NFC do próprio celular/tablet (Chrome no Android, página em HTTPS)
  const nfcDoAparelho = useDeviceNFC((codigo) => { void adicionar([codigo]); }, true, 'pulyn.master.pulseiras.deviceNfc');

  const executar = async (acao: () => Promise<unknown>, sucesso: string) => {
    setOcupado(true);
    try {
      await acao();
      toast.success(sucesso);
      await carregar(true);
      return true;
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : 'Não foi possível concluir');
      return false;
    } finally {
      setOcupado(false);
    }
  };

  const emEstoque = useMemo(() => estoque.filter((p) => p.statusTransferencia === 'estoque'), [estoque]);
  const marcadasEmEstoque = useMemo(() => emEstoque.filter((p) => selecionadas.has(p.codigo)), [emEstoque, selecionadas]);
  const todasMarcadas = emEstoque.length > 0 && marcadasEmEstoque.length === emEstoque.length;
  const alternar = (codigo: string) => setSelecionadas((atual) => {
    const novo = new Set(atual);
    if (novo.has(codigo)) novo.delete(codigo); else novo.add(codigo);
    return novo;
  });

  const enviar = async () => {
    if (!destino || marcadasEmEstoque.length === 0) return;
    const nomeBuffet = buffets.find((b) => b.empresaId === destino)?.nome ?? 'o buffet';
    const codigos = marcadasEmEstoque.map((p) => p.codigo);
    const feito = await executar(async () => {
      const r = await api.masterEnviarPulseiras(codigos, destino);
      if (r.ignoradas.length > 0) toast(`${r.ignoradas.length} pulseira(s) já não estavam em estoque e foram ignoradas`);
    }, `${codigos.length} pulseira(s) enviada(s) para ${nomeBuffet}. Aguardando o aceite.`);
    if (feito) {
      setEnviando(false);
      setSelecionadas(new Set());
    }
  };

  const remover = (codigos: string[]) => {
    if (!confirm(`Tirar ${codigos.length} pulseira(s) da lista? Elas podem ser lidas de novo depois.`)) return;
    void executar(() => api.masterRemoverPulseiras(codigos), 'Removida(s) da lista').then(() =>
      setSelecionadas((atual) => new Set([...atual].filter((c) => !codigos.includes(c)))));
  };

  const totalNosBuffetsGeral = porBuffet.reduce((soma, b) => soma + b.total, 0);
  const cartoes = [
    { rotulo: 'Em estoque', valor: resumo?.estoque ?? 0, icone: <Boxes size={20} />, cor: 'text-primary-300' },
    { rotulo: 'Aguardando aceite', valor: resumo?.pendentes ?? 0, icone: <Hourglass size={20} />, cor: 'text-warning' },
    { rotulo: 'Enviadas (total)', valor: resumo?.buffets.reduce((s, b) => s + b.enviadas, 0) ?? 0, icone: <Send size={20} />, cor: 'text-white' },
    { rotulo: 'Nos buffets (total)', valor: totalNosBuffetsGeral, icone: <PackageCheck size={20} />, cor: 'text-success' },
  ];

  return (
    <div className="flex h-screen bg-dark text-white overflow-hidden">
      <Sidebar
        items={masterNavItems}
        activePath={location.pathname}
        collapsed={menuRecolhido}
        onToggleCollapse={() => setMenuRecolhido(!menuRecolhido)}
        accentColor="#1E9BD7"
      />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <PageHeader
            title="Pulseiras"
            description="Leia as pulseiras, monte a lista e envie para o buffet que vai usá-las"
            icon={<Watch size={28} />}
          />

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {cartoes.map((cartao) => (
              <Card key={cartao.rotulo}>
                <div className={`flex items-center gap-2 text-sm ${cartao.cor}`}>{cartao.icone}<span className="text-gray-400">{cartao.rotulo}</span></div>
                <p className="mt-2 font-display text-3xl font-bold text-white">{cartao.valor}</p>
              </Card>
            ))}
          </div>

          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="flex items-center gap-2 font-display text-lg text-white">
                  <Radio size={18} className={leitorConectado ? 'text-success' : 'text-gray-500'} />
                  Ler pulseiras
                </h2>
                <p className="mt-1 text-sm text-gray-400">
                  {leitorConectado
                    ? 'Passe a pulseira no leitor de recepção que está em estoque: ela entra na lista sozinha.'
                    : 'Sem conexão com o servidor em tempo real. Reconectando... você ainda pode digitar os códigos ao lado.'}
                  {nfcDoAparelho.supported && ' Ou ative o NFC deste aparelho e encoste a pulseira nele.'}
                </p>
                <div className="mt-2">
                  <DeviceNfcButton status={nfcDoAparelho.status} error={nfcDoAparelho.error} onStart={nfcDoAparelho.start} onStop={nfcDoAparelho.stop} />
                  {nfcDoAparelho.error && <p role="alert" className="mt-1 text-xs text-warning">{nfcDoAparelho.error}</p>}
                </div>
                {ultimaLida && (
                  <p className="mt-2 text-sm" role="status">
                    Última lida: <span className="font-mono text-white">{ultimaLida.codigo}</span>{' '}
                    <Badge variant={ultimaLida.nova ? 'success' : 'muted'}>{ultimaLida.nova ? 'entrou na lista' : 'já estava na lista'}</Badge>
                  </p>
                )}
              </div>
              <form
                className="flex w-full gap-2 sm:w-96"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!digitado.trim()) return;
                  void adicionar([digitado]).then(() => setDigitado(''));
                }}
              >
                <input
                  value={digitado}
                  onChange={(e) => setDigitado(e.target.value)}
                  placeholder="Digite ou cole um ou vários códigos"
                  aria-label="Códigos das pulseiras"
                  className="input-dark min-h-[44px] min-w-0 flex-1 rounded-xl border border-white/[0.10] bg-dark-card px-3.5 font-mono text-sm text-white placeholder-gray-500 focus:border-primary-400 focus:outline-none"
                />
                <Button type="submit" variant="ghost" className="border border-border">
                  <Plus size={16} className="mr-1.5" />
                  Adicionar
                </Button>
              </form>
            </div>
          </Card>

          <Card>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-lg text-white">Lista de pulseiras <span className="text-sm text-gray-500">({estoque.length})</span></h2>
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" className="border border-border" disabled={marcadasEmEstoque.length === 0 || ocupado} onClick={() => remover(marcadasEmEstoque.map((p) => p.codigo))}>
                  <Trash2 size={16} className="mr-1.5" />
                  Tirar da lista
                </Button>
                <Button variant="primary" disabled={marcadasEmEstoque.length === 0 || ocupado} onClick={() => { setDestino(''); setEnviando(true); }}>
                  <Send size={16} className="mr-1.5" />
                  Enviar {marcadasEmEstoque.length > 0 ? `${marcadasEmEstoque.length} ` : ''}para um buffet
                </Button>
              </div>
            </div>
            <div className="max-h-[30rem] overflow-y-auto overflow-x-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-dark-card">
                  <tr className="border-b border-border">
                    <th className="w-10 pb-3 pr-2">
                      {emEstoque.length > 0 && (
                        <input
                          type="checkbox"
                          checked={todasMarcadas}
                          onChange={() => setSelecionadas(todasMarcadas ? new Set() : new Set(emEstoque.map((p) => p.codigo)))}
                          aria-label="Selecionar todas as pulseiras em estoque"
                          className="h-4 w-4 cursor-pointer accent-primary"
                        />
                      )}
                    </th>
                    {['Código', 'Situação', 'Buffet', 'Enviada em', ''].map((titulo) => (
                      <th key={titulo} className="pb-3 pr-4 text-sm font-body font-semibold text-gray-400">{titulo}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {carregando ? (
                    <tr><td colSpan={6} className="py-8 text-center text-gray-500">Carregando pulseiras...</td></tr>
                  ) : estoque.length === 0 ? (
                    <tr><td colSpan={6} className="py-8 text-center text-gray-500">Nenhuma pulseira na lista. Passe uma no leitor ou digite o código acima.</td></tr>
                  ) : estoque.map((p) => (
                    <tr key={p.codigo} className="hover:bg-surface/50 transition-colors">
                      <td className="py-2.5 pr-2">
                        {p.statusTransferencia === 'estoque' && (
                          <input type="checkbox" checked={selecionadas.has(p.codigo)} onChange={() => alternar(p.codigo)} aria-label={`Selecionar ${p.codigo}`} className="h-4 w-4 cursor-pointer accent-primary" />
                        )}
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-sm text-white">{p.codigo}</td>
                      <td className="py-2.5 pr-4">
                        {p.statusTransferencia === 'estoque'
                          ? <Badge variant="muted">Em estoque</Badge>
                          : <Badge variant="warning">Aguardando aceite</Badge>}
                      </td>
                      <td className="py-2.5 pr-4 text-sm text-gray-300">{p.empresaDestinoNome ?? '—'}</td>
                      <td className="py-2.5 pr-4 text-sm text-gray-400">{formatarData(p.enviadoEm)}</td>
                      <td className="py-2.5 text-right">
                        {p.statusTransferencia === 'pendente' ? (
                          <button
                            onClick={() => void executar(() => api.masterCancelarEnvioDePulseiras([p.codigo]), 'Envio cancelado')}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-surface hover:text-primary"
                            title="Cancelar o envio" aria-label={`Cancelar o envio de ${p.codigo}`}
                          >
                            <Undo2 size={16} />
                          </button>
                        ) : (
                          <button
                            onClick={() => remover([p.codigo])}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-surface hover:text-danger"
                            title="Tirar da lista" aria-label={`Tirar ${p.codigo} da lista`}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-lg text-white">
                Pulseiras nos buffets <span className="text-sm text-gray-500">({totalNosBuffets}{filtroBuffet || filtroSituacao || busca ? ' encontradas' : ''})</span>
              </h2>
              <div className="flex flex-wrap gap-2">
                <select
                  aria-label="Buffet"
                  value={filtroBuffet}
                  onChange={(e) => setFiltroBuffet(e.target.value)}
                  className="w-52 rounded-lg border border-gray-600 bg-gray-900 px-2 py-2 font-body text-sm text-white"
                >
                  <option value="">Todos os buffets ({totalNosBuffetsGeral})</option>
                  {porBuffet.map((b) => <option key={b.empresaId} value={b.empresaId}>{b.nome} ({b.total})</option>)}
                </select>
                <select
                  aria-label="Situação"
                  value={filtroSituacao}
                  onChange={(e) => setFiltroSituacao(e.target.value)}
                  className="w-36 rounded-lg border border-gray-600 bg-gray-900 px-2 py-2 font-body text-sm text-white"
                >
                  <option value="">Qualquer situação</option>
                  {Object.entries(SITUACAO_DA_PULSEIRA).map(([valor, { texto }]) => <option key={valor} value={valor}>{texto}</option>)}
                </select>
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar código"
                  aria-label="Buscar pelo código da pulseira"
                  className="input-dark min-h-[38px] w-40 rounded-lg border border-white/[0.10] bg-dark-card px-3 font-mono text-sm text-white placeholder-gray-500 focus:border-primary-400 focus:outline-none"
                />
              </div>
            </div>

            {porBuffet.length > 0 && (
              <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {porBuffet.map((b) => (
                  <button
                    key={b.empresaId}
                    type="button"
                    onClick={() => setFiltroBuffet(filtroBuffet === b.empresaId ? '' : b.empresaId)}
                    aria-pressed={filtroBuffet === b.empresaId}
                    className={`rounded-xl border px-3 py-2 text-left transition-colors ${filtroBuffet === b.empresaId ? 'border-primary-400/60 bg-primary-500/10' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'}`}
                  >
                    <p className="truncate text-sm font-semibold text-white">{b.nome}</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      <strong className="text-white">{b.total}</strong> no total · {b.disponiveis} livres · {b.emUso} em uso
                      {b.perdidas + b.bloqueadas > 0 ? ` · ${b.perdidas + b.bloqueadas} perdidas/bloqueadas` : ''}
                    </p>
                    <p className="text-xs text-gray-500">{b.daPulyn} enviadas pela Pulyn · {b.total - b.daPulyn} cadastradas pelo buffet</p>
                  </button>
                ))}
              </div>
            )}

            <div className="max-h-[30rem] overflow-y-auto overflow-x-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-dark-card">
                  <tr className="border-b border-border">
                    {['Código', 'Buffet', 'Situação', 'Criança', 'Origem'].map((titulo) => (
                      <th key={titulo} className="pb-3 pr-4 text-sm font-body font-semibold text-gray-400">{titulo}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {nosBuffets.length === 0 ? (
                    <tr><td colSpan={5} className="py-8 text-center text-gray-500">{carregando ? 'Carregando...' : 'Nenhuma pulseira encontrada.'}</td></tr>
                  ) : nosBuffets.map((p) => {
                    const situacao = SITUACAO_DA_PULSEIRA[p.status] ?? { texto: p.status, variante: 'muted' as const };
                    return (
                      <tr key={`${p.empresaId}-${p.codigo}`} className="hover:bg-surface/50 transition-colors">
                        <td className="py-2.5 pr-4 font-mono text-sm text-white">{p.codigo}</td>
                        <td className="py-2.5 pr-4 text-sm text-gray-300">{p.buffetNome}</td>
                        <td className="py-2.5 pr-4"><Badge variant={situacao.variante}>{situacao.texto}</Badge></td>
                        <td className="py-2.5 pr-4 text-sm text-gray-400">{p.criancaNome ?? '—'}</td>
                        <td className="py-2.5 text-sm text-gray-400">{p.doMaster ? 'Enviada pela Pulyn' : 'Cadastrada pelo buffet'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {nosBuffets.length < totalNosBuffets && (
              <div className="mt-3 text-center">
                <Button
                  variant="ghost"
                  className="border border-border"
                  disabled={carregandoMais}
                  onClick={() => { setCarregandoMais(true); void carregarNosBuffets(true).finally(() => setCarregandoMais(false)); }}
                >
                  Ver mais ({totalNosBuffets - nosBuffets.length} restantes)
                </Button>
              </div>
            )}
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h2 className="mb-3 font-display text-lg text-white">Envios por buffet</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border">
                      {['Buffet', 'Enviadas', 'Aceitas', 'Aguardando', 'Devolvidas', 'Com o buffet'].map((titulo) => (
                        <th key={titulo} className="pb-3 pr-3 text-xs font-body font-semibold uppercase tracking-wide text-gray-400">{titulo}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(resumo?.buffets ?? []).length === 0 ? (
                      <tr><td colSpan={6} className="py-6 text-center text-sm text-gray-500">Nenhum envio ainda.</td></tr>
                    ) : resumo!.buffets.map((b) => (
                      <tr key={b.empresaId}>
                        <td className="py-2.5 pr-3 text-sm font-semibold text-white">{b.nome}</td>
                        <td className="py-2.5 pr-3 text-sm text-gray-300">{b.enviadas}</td>
                        <td className="py-2.5 pr-3 text-sm text-gray-300">{b.aceitas}</td>
                        <td className="py-2.5 pr-3 text-sm text-warning">{b.pendentes}</td>
                        <td className="py-2.5 pr-3 text-sm text-gray-300">{b.devolvidas}</td>
                        <td className="py-2.5 text-sm font-semibold text-success">{b.emPosse}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card>
              <h2 className="mb-3 font-display text-lg text-white">Últimos movimentos</h2>
              <ul className="max-h-80 space-y-1.5 overflow-y-auto">
                {historico.length === 0 ? (
                  <li className="py-6 text-center text-sm text-gray-500">Nada por aqui ainda.</li>
                ) : historico.map((m, i) => (
                  <li key={`${m.codigo}-${m.criadoEm}-${i}`} className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2 text-sm">
                    <Badge variant={ROTULO_MOVIMENTO[m.tipo].variante}>{ROTULO_MOVIMENTO[m.tipo].texto}</Badge>
                    <span className="font-mono text-white">{m.codigo}</span>
                    <span className="min-w-0 flex-1 truncate text-gray-400">{m.buffetNome ?? ''}</span>
                    <span className="shrink-0 text-xs text-gray-500">{formatarData(m.criadoEm)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </main>

      <Modal isOpen={enviando} onClose={() => setEnviando(false)} title={`Enviar ${marcadasEmEstoque.length} pulseira(s)`} size="md">
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            As pulseiras ficam esperando o admin do buffet aceitar. Só depois do aceite elas passam a ser dele.
          </p>
          <SeletorDeBuffet id="mp-destino" buffets={buffets} valor={destino} onChange={setDestino} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setEnviando(false)}>Cancelar</Button>
            <Button variant="primary" onClick={enviar} disabled={ocupado || !destino}>
              {ocupado ? 'Enviando...' : 'Enviar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
