import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  LayoutDashboard, Users, CreditCard, Activity, ScrollText, LifeBuoy, BarChart3,
  Cpu, Plus, Send, Undo2, Pencil, Trash2,
} from 'lucide-react';
import { api, type BuffetOpcao, type CheckpointMaster } from '../../services/api';
import Sidebar from '../../components/layout/Sidebar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import StatusDot from '../../components/ui/StatusDot';

const masterNavItems = [
  { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/master' },
  { icon: <Users size={20} />, label: 'Clientes', path: '/master/clients' },
  { icon: <CreditCard size={20} />, label: 'Planos', path: '/master/plans' },
  { icon: <Cpu size={20} />, label: 'Checkpoints', path: '/master/checkpoints' },
  { icon: <Activity size={20} />, label: 'Monitoramento', path: '/master/monitoring' },
  { icon: <ScrollText size={20} />, label: 'Logs', path: '/master/logs' },
  { icon: <LifeBuoy size={20} />, label: 'Suporte', path: '/master/support' },
  { icon: <BarChart3 size={20} />, label: 'Analytics', path: '/master/analytics' },
];

type Situacao = CheckpointMaster['statusTransferencia'];
type Filtro = 'todos' | Situacao;

const FILTROS: { valor: Filtro; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'estoque', rotulo: 'Em estoque' },
  { valor: 'pendente', rotulo: 'Aguardando aceite' },
  { valor: 'aceito', rotulo: 'Aceitos' },
];

const SELECT_CLASSES =
  'w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white font-body text-sm cursor-pointer';
const OPTION_STYLE = { backgroundColor: '#1a1a2e', color: '#fff' };

// O heartbeat chega a cada 60 s; sem sinal há mais de 3 minutos o aparelho está offline.
const ONLINE_ATE_MS = 3 * 60 * 1000;

const estaOnline = (cp: CheckpointMaster) =>
  Boolean(cp.ultimoVisto) && Date.now() - new Date(cp.ultimoVisto as string).getTime() < ONLINE_ATE_MS;

interface Formulario {
  macAddress: string;
  nome: string;
  tipo: string;
  proposito: string;
  numCheck: string;
}

const FORM_VAZIO: Formulario = { macAddress: '', nome: '', tipo: 'NFC', proposito: 'game', numCheck: '' };

function BadgeSituacao({ situacao }: { situacao: Situacao }) {
  if (situacao === 'aceito') return <Badge variant="success">Aceito</Badge>;
  if (situacao === 'pendente') return <Badge variant="warning">Aguardando aceite</Badge>;
  return <Badge variant="muted">Em estoque</Badge>;
}

export default function MasterCheckpoints() {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [lista, setLista] = useState<CheckpointMaster[]>([]);
  const [buffets, setBuffets] = useState<BuffetOpcao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [ocupado, setOcupado] = useState(false);

  // Cadastro/edição
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<CheckpointMaster | null>(null);
  const [form, setForm] = useState<Formulario>(FORM_VAZIO);

  // Transferência
  const [transferindo, setTransferindo] = useState<CheckpointMaster | null>(null);
  const [destino, setDestino] = useState('');

  const carregar = useCallback(async () => {
    try {
      const [checkpoints, destinos] = await Promise.all([api.masterGetCheckpoints(), api.masterGetBuffets()]);
      setLista(checkpoints);
      setBuffets(destinos);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível carregar os checkpoints');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  const contagem = useMemo(() => ({
    estoque: lista.filter((c) => c.statusTransferencia === 'estoque').length,
    pendente: lista.filter((c) => c.statusTransferencia === 'pendente').length,
    aceito: lista.filter((c) => c.statusTransferencia === 'aceito').length,
  }), [lista]);

  const visiveis = useMemo(
    () => (filtro === 'todos' ? lista : lista.filter((c) => c.statusTransferencia === filtro)),
    [lista, filtro]
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
      nome: cp.nome,
      tipo: cp.tipo || 'NFC',
      proposito: cp.proposito || 'game',
      numCheck: cp.numCheck ?? '',
    });
    setFormAberto(true);
  };

  const salvar = async () => {
    if (!form.macAddress.trim()) {
      toast.error('Informe o MAC do aparelho (aparece no Serial Monitor e na página /config da placa)');
      return;
    }
    const feito = editando
      ? await executar(() => {
          // Só manda o que mudou; o número fica por conta do buffet depois do aceite.
          const dados: Parameters<typeof api.masterEditarCheckpoint>[1] = {};
          if (form.macAddress.trim().toUpperCase() !== (editando.macAddress ?? '')) dados.macAddress = form.macAddress.trim();
          if (form.nome.trim() !== editando.nome) dados.nome = form.nome.trim();
          if (form.tipo !== editando.tipo) dados.tipo = form.tipo;
          if (form.proposito !== (editando.proposito || 'game')) dados.proposito = form.proposito;
          if (editando.statusTransferencia !== 'aceito' && form.numCheck.trim() !== (editando.numCheck ?? '')) dados.numCheck = form.numCheck.trim();
          if (Object.keys(dados).length === 0) return Promise.reject(new Error('Nada mudou'));
          return api.masterEditarCheckpoint(editando.id, dados);
        }, 'Checkpoint atualizado')
      : await executar(() => api.masterCriarCheckpoint({
          macAddress: form.macAddress.trim(),
          nome: form.nome.trim() || undefined,
          tipo: form.tipo,
          proposito: form.proposito,
          numCheck: form.numCheck.trim() || undefined,
        }), 'Checkpoint cadastrado no estoque');
    if (feito) setFormAberto(false);
  };

  const transferir = async () => {
    if (!transferindo || !destino) return;
    const feito = await executar(() => api.masterTransferirCheckpoint(transferindo.id, destino), 'Transferido: o buffet precisa aceitar');
    if (feito) setTransferindo(null);
  };

  const cancelar = (cp: CheckpointMaster) => {
    if (!confirm(`Cancelar a transferência de "${cp.nome}"? Ele volta para o estoque.`)) return;
    void executar(() => api.masterCancelarTransferencia(cp.id), 'Transferência cancelada');
  };

  const excluir = (cp: CheckpointMaster) => {
    if (!confirm(`Excluir "${cp.nome}" (${cp.macAddress ?? 'sem MAC'})? Só é possível enquanto está em estoque.`)) return;
    void executar(() => api.masterExcluirCheckpoint(cp.id), 'Checkpoint excluído');
  };

  const buffetDe = (cp: CheckpointMaster) =>
    (cp.statusTransferencia === 'aceito' ? cp.empresaNome : cp.statusTransferencia === 'pendente' ? cp.empresaDestinoNome : null) || '—';

  const numeroFixo = Boolean(editando && editando.statusTransferencia === 'aceito');

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
            <div className="flex flex-wrap items-center gap-2">
              {FILTROS.map((f) => {
                const total = f.valor === 'todos' ? lista.length : contagem[f.valor];
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
          </Card>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border">
                    {['Aparelho', 'Número', 'Situação', 'Buffet', 'Sinal', 'Ações'].map((titulo) => (
                      <th key={titulo} className="pb-3 pr-4 text-sm font-body font-semibold text-gray-400">{titulo}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {carregando ? (
                    <tr><td colSpan={6} className="py-8 text-center text-gray-500">Carregando checkpoints...</td></tr>
                  ) : visiveis.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500">
                        {lista.length === 0
                          ? 'Nenhum checkpoint cadastrado. Clique em "Cadastrar checkpoint" e informe o MAC da placa.'
                          : 'Nenhum checkpoint nesta situação.'}
                      </td>
                    </tr>
                  ) : visiveis.map((cp) => (
                    <tr key={cp.id} className="hover:bg-surface/50 transition-colors">
                      <td className="py-3 pr-4">
                        <p className="text-sm font-semibold text-white">{cp.nome}</p>
                        <p className="text-xs text-gray-400">
                          <span className="font-mono">{cp.macAddress ?? 'sem MAC'}</span>
                          {' · '}{cp.tipo}{cp.proposito === 'reception' ? ' · recepção' : ''}
                        </p>
                      </td>
                      <td className="py-3 pr-4 text-sm font-mono text-gray-300">{cp.numCheck ?? '—'}</td>
                      <td className="py-3 pr-4"><BadgeSituacao situacao={cp.statusTransferencia} /></td>
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
                              onClick={() => { setTransferindo(cp); setDestino(''); }}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-surface transition-colors"
                              title="Transferir para um buffet" aria-label={`Transferir ${cp.nome}`}
                            >
                              <Send size={16} />
                            </button>
                          )}
                          {cp.statusTransferencia === 'pendente' && (
                            <button
                              onClick={() => cancelar(cp)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-warning hover:bg-surface transition-colors"
                              title="Cancelar a transferência" aria-label={`Cancelar transferência de ${cp.nome}`}
                            >
                              <Undo2 size={16} />
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
            onChange={(e) => setForm({ ...form, macAddress: e.target.value.toUpperCase() })}
            required
          />
          <p className="-mt-2 text-xs text-gray-500">
            Aparece no Serial Monitor ao ligar a placa e na página /config dela. Aceita com dois-pontos, hífen ou sem separador.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nome"
              placeholder="Ex: Entrada principal"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
            <Input
              label="Número (opcional)"
              placeholder="O buffet define ao aceitar"
              value={form.numCheck}
              onChange={(e) => setForm({ ...form, numCheck: e.target.value.toUpperCase() })}
              disabled={numeroFixo}
            />
          </div>
          {numeroFixo && <p className="-mt-2 text-xs text-gray-500">O buffet já aceitou: o número é dele.</p>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="mc-tipo" className="mb-1.5 block text-sm font-body font-semibold text-gray-300">Tipo</label>
              <select id="mc-tipo" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className={SELECT_CLASSES}>
                <option value="NFC" style={OPTION_STYLE}>NFC/RFID</option>
                <option value="UHF" style={OPTION_STYLE}>UHF longa distância</option>
                <option value="QRCode" style={OPTION_STYLE}>QR Code</option>
              </select>
            </div>
            <div>
              <label htmlFor="mc-proposito" className="mb-1.5 block text-sm font-body font-semibold text-gray-300">Finalidade</label>
              <select id="mc-proposito" value={form.proposito} onChange={(e) => setForm({ ...form, proposito: e.target.value })} className={SELECT_CLASSES}>
                <option value="game" style={OPTION_STYLE}>Jogos</option>
                <option value="reception" style={OPTION_STYLE}>Recepção</option>
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
        title={transferindo ? `Transferir: ${transferindo.nome}` : 'Transferir'}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            O checkpoint aparece para o admin do buffet escolhido, que precisa aceitá-lo e definir o número e o evento.
          </p>
          <div>
            <label htmlFor="mc-destino" className="mb-1.5 block text-sm font-body font-semibold text-gray-300">Buffet</label>
            <select id="mc-destino" value={destino} onChange={(e) => setDestino(e.target.value)} className={SELECT_CLASSES}>
              <option value="" style={OPTION_STYLE}>Escolha o buffet</option>
              {buffets.map((b) => (
                <option key={b.empresaId} value={b.empresaId} style={OPTION_STYLE}>
                  {b.nome}{b.cidade ? ` — ${b.cidade}${b.estado ? `/${b.estado}` : ''}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setTransferindo(null)}>Cancelar</Button>
            <Button variant="primary" onClick={transferir} disabled={ocupado || !destino}>
              {ocupado ? 'Transferindo...' : 'Transferir'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
