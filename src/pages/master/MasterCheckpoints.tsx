import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Cpu,
  Plus,
  Send,
  Pencil,
  Trash2,
} from 'lucide-react';
import { api, type BuffetOpcao, type CheckpointMaster } from '../../services/api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { digitarEpc, epcCompleto, macCompleto, mascaraEpc, mascaraMac } from '../../utils/mascaras';
import Sidebar from '../../components/layout/Sidebar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import StatusDot from '../../components/ui/StatusDot';
import SeletorDeBuffet from './SeletorDeBuffet';
import { masterNavItems } from './masterNav';
import { confirmar } from '../../components/ui/dialogo';


type Situacao = CheckpointMaster['statusTransferencia'];
// 'devolvido': em estoque e com o aviso de devolução/recusa de um buffet
type Filtro = 'todos' | Situacao | 'devolvido';

const FILTROS: { valor: Filtro; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'estoque', rotulo: 'Em estoque' },
  { valor: 'aceito', rotulo: 'Com buffets' },
  { valor: 'devolvido', rotulo: 'Devolvidos' },
];

// Valores do seletor de buffet que não são o id de um buffet.
const TODOS_BUFFETS = '';
const SEM_BUFFET = '__sem-buffet';

const SELECT_CLASSES =
  'w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white font-body text-sm cursor-pointer';
const OPTION_STYLE = { backgroundColor: '#1a1a2e', color: '#fff' };

// O heartbeat chega a cada 60 s; sem sinal há mais de 3 minutos o aparelho está offline.
const ONLINE_ATE_MS = 3 * 60 * 1000;

// Em estoque com o aviso de que um buffet devolveu (ou recusou) o checkpoint
const foiDevolvido = (cp: CheckpointMaster) => cp.statusTransferencia === 'estoque' && Boolean(cp.devolvidoEm);

// O EPC do checkpoint guarda só os 6 últimos dígitos (colar o EPC inteiro também funciona)
const ultimos6 = mascaraEpc;

const estaOnline = (cp: CheckpointMaster) =>
  Boolean(cp.ultimoVisto) && Date.now() - new Date(cp.ultimoVisto as string).getTime() < ONLINE_ATE_MS;

interface Formulario {
  macAddress: string;
  epc: string;
  nome: string;
  tipo: string;
  proposito: string;
}

const FORM_VAZIO: Formulario = { macAddress: '', epc: '', nome: '', tipo: 'NFC', proposito: 'game' };

// Buffet a que o checkpoint pertence (só os transferidos têm um).
const buffetIdDe = (cp: CheckpointMaster) => (cp.statusTransferencia === 'aceito' ? cp.empresaId : null);

function BadgeSituacao({ situacao }: { situacao: Situacao }) {
  if (situacao === 'aceito') return <Badge variant="success">Com o buffet</Badge>;
  return <Badge variant="muted">Em estoque</Badge>;
}

export default function MasterCheckpoints() {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [lista, setLista] = useState<CheckpointMaster[]>([]);
  const [buffets, setBuffets] = useState<BuffetOpcao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [buffetFiltro, setBuffetFiltro] = useState(TODOS_BUFFETS);
  const [ocupado, setOcupado] = useState(false);

  // Cadastro/edição
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<CheckpointMaster | null>(null);
  const [form, setForm] = useState<Formulario>(FORM_VAZIO);

  // Transferência
  // Um ou vários checkpoints indo para o mesmo buffet
  const [transferindo, setTransferindo] = useState<CheckpointMaster[] | null>(null);
  const [destino, setDestino] = useState('');
  // Marcados na lista (só os que estão em estoque podem ser enviados)
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());

  const carregar = useCallback(async (silencioso = false) => {
    try {
      const [checkpoints, destinos] = await Promise.all([api.masterGetCheckpoints(), api.masterGetBuffets()]);
      setLista(checkpoints);
      setBuffets(destinos);
    } catch (err) {
      if (!silencioso) toast.error(err instanceof Error ? err.message : 'Não foi possível carregar os checkpoints');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);
  // Com o formulário ou a transferência aberta não atualiza (a lista mexendo atrapalha quem está digitando)
  useAutoRefresh(() => carregar(true), { topicos: ['checkpoints'], pausado: formAberto || Boolean(transferindo) });

  const totalPorBuffet = useMemo(() => {
    const total = new Map<string, number>();
    for (const cp of lista) {
      const id = buffetIdDe(cp) ?? SEM_BUFFET;
      total.set(id, (total.get(id) ?? 0) + 1);
    }
    return total;
  }, [lista]);

  const doBuffet = useMemo(
    () => (buffetFiltro === TODOS_BUFFETS ? lista : lista.filter((c) => (buffetIdDe(c) ?? SEM_BUFFET) === buffetFiltro)),
    [lista, buffetFiltro]
  );

  const contagem = useMemo(() => ({
    estoque: doBuffet.filter((c) => c.statusTransferencia === 'estoque').length,
    aceito: doBuffet.filter((c) => c.statusTransferencia === 'aceito').length,
    devolvido: doBuffet.filter(foiDevolvido).length,
  }), [doBuffet]);

  const visiveis = useMemo(
    () => {
      if (filtro === 'todos') return doBuffet;
      if (filtro === 'devolvido') return doBuffet.filter(foiDevolvido);
      return doBuffet.filter((c) => c.statusTransferencia === filtro);
    },
    [doBuffet, filtro]
  );

  // Roda uma ação com o botão travado, avisa o resultado e recarrega a lista.
  const executar = async (acao: () => Promise<unknown>, sucesso: string): Promise<boolean> => {
    setOcupado(true);
    try {
      await acao();
      toast.success(sucesso);
      await carregar();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível concluir');
      return false;
    } finally {
      setOcupado(false);
    }
  };

  const abrirCadastro = () => {
    setEditando(null);
    setForm(FORM_VAZIO);
    setFormAberto(true);
  };

  const abrirEdicao = (cp: CheckpointMaster) => {
    setEditando(cp);
    setForm({
      macAddress: cp.macAddress ?? '',
      epc: cp.epc ?? '',
      nome: cp.nome,
      tipo: cp.tipo || 'NFC',
      proposito: cp.proposito || 'game',
    });
    setFormAberto(true);
  };

  const salvar = async () => {
    if (!macCompleto(form.macAddress)) {
      toast.error('Informe o MAC completo do aparelho: 12 dígitos (aparece no Serial Monitor e na página /config da placa)');
      return;
    }
    if (form.epc && !epcCompleto(form.epc)) {
      toast.error('O EPC precisa ter os 6 últimos dígitos (0-9 e A-F)');
      return;
    }
    const feito = editando
      ? await executar(() => {
          // Só manda o que mudou. O número do checkpoint não é do master: o admin do buffet o define depois de receber.
          const dados: Parameters<typeof api.masterEditarCheckpoint>[1] = {};
          if (form.macAddress.trim().toUpperCase() !== (editando.macAddress ?? '')) dados.macAddress = form.macAddress.trim();
          if (ultimos6(form.epc) !== (editando.epc ?? '')) dados.epc = ultimos6(form.epc);
          if (form.nome.trim() !== editando.nome) dados.nome = form.nome.trim();
          if (form.tipo !== editando.tipo) dados.tipo = form.tipo;
          if (form.proposito !== (editando.proposito || 'game')) dados.proposito = form.proposito;
          if (Object.keys(dados).length === 0) return Promise.reject(new Error('Nada mudou'));
          return api.masterEditarCheckpoint(editando.id, dados);
        }, 'Checkpoint atualizado')
      : await executar(() => api.masterCriarCheckpoint({
          macAddress: form.macAddress.trim(),
          epc: ultimos6(form.epc) || undefined,
          nome: form.nome.trim() || undefined,
          tipo: form.tipo,
          proposito: form.proposito,
        }), 'Checkpoint cadastrado no estoque');
    if (feito) setFormAberto(false);
  };

  const transferir = async () => {
    if (!transferindo || transferindo.length === 0 || !destino) return;
    const nomeBuffet = buffets.find((b) => b.empresaId === destino)?.nome ?? 'o buffet';
    const feito = transferindo.length === 1
      ? await executar(() => api.masterTransferirCheckpoint(transferindo[0].id, destino), `Transferido para ${nomeBuffet}`)
      : await executar(async () => {
          const r = await api.masterTransferirCheckpointsLote(transferindo.map((cp) => cp.id), destino);
          if (r.ignorados.length > 0) toast(`${r.ignorados.length} checkpoint(s) já não estavam em estoque e foram ignorados`);
        }, `${transferindo.length} checkpoints transferidos para ${nomeBuffet}`);
    if (feito) {
      setTransferindo(null);
      setSelecionados(new Set());
    }
  };

  const excluir = async (cp: CheckpointMaster) => {
    if (!(await confirmar(`Excluir "${cp.nome}" (${cp.macAddress ?? 'sem MAC'})? Só é possível enquanto está em estoque.`, { titulo: 'Excluir o checkpoint', confirmar: 'Excluir' }))) return;
    void executar(() => api.masterExcluirCheckpoint(cp.id), 'Checkpoint excluído');
  };

  // Seleção para envio em lote: só checkpoints em estoque. Some da seleção o que deixou de estar à vista.
  const enviaveis = useMemo(() => visiveis.filter((c) => c.statusTransferencia === 'estoque'), [visiveis]);
  const marcados = useMemo(() => enviaveis.filter((c) => selecionados.has(c.id)), [enviaveis, selecionados]);
  const todosMarcados = enviaveis.length > 0 && marcados.length === enviaveis.length;
  const alternarUm = (id: number) => setSelecionados((atual) => {
    const novo = new Set(atual);
    if (novo.has(id)) novo.delete(id); else novo.add(id);
    return novo;
  });
  const alternarTodos = () => setSelecionados(todosMarcados ? new Set() : new Set(enviaveis.map((c) => c.id)));
  const abrirEnvio = (cps: CheckpointMaster[]) => { setTransferindo(cps); setDestino(''); };

  const buffetDe = (cp: CheckpointMaster) =>
    (cp.statusTransferencia === 'aceito' ? cp.empresaNome : null) || '—';

  return (
    <div className="flex h-screen bg-dark text-white overflow-hidden">
      <Sidebar
        items={masterNavItems}
        activePath={location.pathname}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        accentColor="#1E9BD7"
      />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <PageHeader
            title="Checkpoints"
            description="Cadastre os aparelhos pelo MAC e envie cada um para o buffet que vai usá-lo"
            icon={<Cpu size={28} />}
            action={
              <Button variant="primary" onClick={abrirCadastro}>
                <Plus size={16} className="mr-1.5" />
                Cadastrar checkpoint
              </Button>
            }
          />

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {FILTROS.map((f) => {
                  const total = f.valor === 'todos' ? doBuffet.length : contagem[f.valor];
                  const ativo = filtro === f.valor;
                  return (
                    <button
                      key={f.valor}
                      onClick={() => setFiltro(f.valor)}
                      aria-pressed={ativo}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-body transition-colors ${
                        ativo
                          ? 'border-primary-400/60 bg-primary-500/15 text-white'
                          : 'border-white/10 text-gray-400 hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      {f.rotulo} <span className="ml-1 font-semibold">{total}</span>
                    </button>
                  );
                })}
              </div>
              <select
                id="mc-buffet"
                aria-label="Buffet"
                title="Ver os checkpoints de qual buffet"
                value={buffetFiltro}
                onChange={(e) => setBuffetFiltro(e.target.value)}
                className="w-48 px-2 py-1.5 bg-gray-900 border border-gray-600 rounded-lg text-white font-body text-sm cursor-pointer"
              >
                <option value={TODOS_BUFFETS} style={OPTION_STYLE}>Todos os buffets ({lista.length})</option>
                <option value={SEM_BUFFET} style={OPTION_STYLE}>Sem buffet ({totalPorBuffet.get(SEM_BUFFET) ?? 0})</option>
                {buffets.map((b) => (
                  <option key={b.empresaId} value={b.empresaId} style={OPTION_STYLE}>
                    {b.nome} ({totalPorBuffet.get(b.empresaId) ?? 0})
                  </option>
                ))}
              </select>
            </div>
          </Card>

          {marcados.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary-400/40 bg-primary-500/10 px-4 py-3" role="status">
              <p className="text-sm text-white">
                <strong>{marcados.length}</strong> checkpoint{marcados.length > 1 ? 's' : ''} selecionado{marcados.length > 1 ? 's' : ''}
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setSelecionados(new Set())}>Limpar</Button>
                <Button variant="primary" onClick={() => abrirEnvio(marcados)}>
                  <Send size={16} className="mr-1.5" />
                  Enviar para um buffet
                </Button>
              </div>
            </div>
          )}

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border">
                    <th className="w-10 pb-3 pr-2">
                      {enviaveis.length > 0 && (
                        <input
                          type="checkbox"
                          checked={todosMarcados}
                          onChange={alternarTodos}
                          aria-label="Selecionar todos os checkpoints em estoque"
                          title="Selecionar todos os que estão em estoque"
                          className="h-4 w-4 cursor-pointer accent-primary"
                        />
                      )}
                    </th>
                    {['Aparelho', 'Número', 'Situação', 'Buffet', 'Sinal', 'Ações'].map((titulo) => (
                      <th key={titulo} className="pb-3 pr-4 text-sm font-body font-semibold text-gray-400">{titulo}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {carregando ? (
                    <tr><td colSpan={7} className="py-8 text-center text-gray-500">Carregando checkpoints...</td></tr>
                  ) : visiveis.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-500">
                        {lista.length === 0
                          ? 'Nenhum checkpoint cadastrado. Clique em "Cadastrar checkpoint" e informe o MAC da placa.'
                          : doBuffet.length === 0
                            ? 'Este buffet ainda não tem checkpoints. Transfira um do estoque para ele.'
                            : 'Nenhum checkpoint nesta situação.'}
                      </td>
                    </tr>
                  ) : visiveis.map((cp) => (
                    <tr key={cp.id} className="hover:bg-surface/50 transition-colors">
                      <td className="py-3 pr-2">
                        {cp.statusTransferencia === 'estoque' && (
                          <input
                            type="checkbox"
                            checked={selecionados.has(cp.id)}
                            onChange={() => alternarUm(cp.id)}
                            aria-label={`Selecionar ${cp.nome}`}
                            className="h-4 w-4 cursor-pointer accent-primary"
                          />
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <p className="text-sm font-semibold text-white">{cp.nome}</p>
                        <p className="text-xs text-gray-400">
                          <span className="font-mono">{cp.macAddress ?? 'sem MAC'}</span>
                          {cp.epc && <>{' · EPC '}<span className="font-mono" title="Só o super admin vê o EPC">{cp.epc}</span></>}
                          {' · '}{cp.tipo}{cp.proposito === 'reception' ? ' · recepção' : cp.proposito === 'score' ? ' · pontuação' : ''}
                        </p>
                      </td>
                      <td className="py-3 pr-4 text-sm font-mono text-gray-300">{cp.numCheck ?? '—'}</td>
                      <td className="py-3 pr-4">
                        <BadgeSituacao situacao={cp.statusTransferencia} />
                        {foiDevolvido(cp) && cp.devolvidoEm && (
                          <div className="mt-1.5">
                            <Badge variant="warning">{cp.devolvidoMotivo === 'recusado' ? 'Recusado' : 'Devolvido'}</Badge>
                            <p className="mt-1 text-xs text-gray-400">
                              {cp.devolvidoMotivo === 'recusado' ? 'Recusado' : 'Devolvido'} por {cp.devolvidoPorNome ?? 'um buffet'}
                              {cp.devolvidoMotivo === 'cliente_excluido' ? ' (cliente excluído)' : ''}
                              {' · '}{new Date(cp.devolvidoEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-sm text-gray-300">{buffetDe(cp)}</td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <StatusDot status={estaOnline(cp) ? 'online' : 'offline'} />
                          <span className="text-sm text-gray-300">{estaOnline(cp) ? 'Online' : 'Offline'}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          {cp.statusTransferencia === 'estoque' && (
                            <button
                              onClick={() => abrirEnvio([cp])}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-surface transition-colors"
                              title="Transferir para um buffet" aria-label={`Transferir ${cp.nome}`}
                            >
                              <Send size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => abrirEdicao(cp)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-surface transition-colors"
                            title="Editar" aria-label={`Editar ${cp.nome}`}
                          >
                            <Pencil size={16} />
                          </button>
                          {cp.statusTransferencia === 'estoque' && (
                            <button
                              onClick={() => excluir(cp)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-danger hover:bg-surface transition-colors"
                              title="Excluir" aria-label={`Excluir ${cp.nome}`}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </main>

      <Modal
        isOpen={formAberto}
        onClose={() => setFormAberto(false)}
        title={editando ? `Editar checkpoint: ${editando.nome}` : 'Cadastrar checkpoint'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="MAC do aparelho"
            placeholder="AA:BB:CC:DD:EE:FF"
            value={form.macAddress}
            onChange={(e) => setForm({ ...form, macAddress: mascaraMac(e.target.value) })}
            maxLength={17}
            autoComplete="off"
            spellCheck={false}
            className="font-mono"
            error={form.macAddress && !macCompleto(form.macAddress) ? 'Faltam dígitos: o MAC tem 12 (6 pares)' : undefined}
            required
          />
          <p className="-mt-2 text-xs text-gray-500">
            Aparece no Serial Monitor ao ligar a placa e na página /config dela. Digite só 0-9 e A-F: os dois-pontos entram sozinhos. Pode colar com dois-pontos, hífen ou sem separador.
          </p>
          <Input
            label="EPC - últimos 6 dígitos (opcional)"
            placeholder="Ex: 3B1C2D"
            value={form.epc}
            onChange={(e) => setForm({ ...form, epc: digitarEpc(e.target.value) })}
            onPaste={(e) => {
              e.preventDefault();
              setForm({ ...form, epc: mascaraEpc(e.clipboardData.getData('text')) });
            }}
            maxLength={6}
            autoComplete="off"
            spellCheck={false}
            className="font-mono"
            error={form.epc && !epcCompleto(form.epc) ? 'Faltam dígitos: são 6' : undefined}
          />
          <p className="-mt-2 text-xs text-gray-500">
            Informe só os 6 últimos dígitos do EPC da tag que identifica o checkpoint (0-9 e A-F). Se colar o EPC inteiro, ficam só os 6 últimos. Só o super admin vê este dado: os buffets não o recebem.
          </p>
          <Input
            label="Nome (opcional)"
            placeholder="Ex: Entrada principal"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
          />
          <p className="-mt-2 text-xs text-gray-500">
            O ID é gerado automaticamente. O número do checkpoint é definido pelo admin do buffet, depois de receber.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="mc-tipo" className="mb-1.5 block text-sm font-body font-semibold text-gray-300">Tipo</label>
              <select id="mc-tipo" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className={SELECT_CLASSES}>
                <option value="NFC" style={OPTION_STYLE}>NFC/RFID</option>
                <option value="UHF" style={OPTION_STYLE}>UHF longa distância</option>
              </select>
            </div>
            <div>
              <label htmlFor="mc-proposito" className="mb-1.5 block text-sm font-body font-semibold text-gray-300">Finalidade</label>
              <select id="mc-proposito" value={form.proposito} onChange={(e) => setForm({ ...form, proposito: e.target.value })} className={SELECT_CLASSES}>
                <option value="game" style={OPTION_STYLE}>Jogos</option>
                <option value="reception" style={OPTION_STYLE}>Recepção</option>
                <option value="score" style={OPTION_STYLE}>Pontuação (consulta de pontos)</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setFormAberto(false)}>Cancelar</Button>
            <Button variant="primary" onClick={salvar} disabled={ocupado}>
              {ocupado ? 'Salvando...' : editando ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={transferindo !== null}
        onClose={() => setTransferindo(null)}
        title={transferindo ? (transferindo.length === 1 ? `Transferir: ${transferindo[0].nome}` : `Transferir ${transferindo.length} checkpoints`) : 'Transferir'}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            {transferindo && transferindo.length > 1 ? 'Os checkpoints passam' : 'O checkpoint passa'} a ser do buffet escolhido na hora. O admin do buffet define o número e o evento depois.
          </p>
          <SeletorDeBuffet id="mc-destino" buffets={buffets} valor={destino} onChange={setDestino} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setTransferindo(null)}>Cancelar</Button>
            <Button variant="primary" onClick={transferir} disabled={ocupado || !destino}>
              {ocupado ? 'Transferindo...' : transferindo && transferindo.length > 1 ? `Transferir ${transferindo.length}` : 'Transferir'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
