import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Lightbulb, Volume2, Edit, Trash2, QrCode, MoreVertical, Undo2, ArrowRightLeft
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import AdminSidebar from '../../components/layout/AdminSidebar';
import BuffetTopBar from '../../components/layout/BuffetTopBar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import StatusDot from '../../components/ui/StatusDot';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import CheckpointsRecebidos from '../../components/checkpoints/CheckpointsRecebidos';
import SolicitarCheckpoints from '../../components/checkpoints/SolicitarCheckpoints';
import AtribuirEvento from '../../components/checkpoints/AtribuirEvento';
import toast from 'react-hot-toast';
import { numeroDoCheckpoint } from '../../utils/checkpoints';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

// Valor do seletor para listar os checkpoints de todos os eventos
const ALL_EVENTS = 'all';

// O teste só chega à placa online, esteja ou não num evento (o servidor confere de novo).
const podeTestar = (cp: any) => cp.status === 'online';
const motivoSemTeste = () => 'Checkpoint offline: não dá para testar';

export default function AdminCheckpoints() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [checkpointsList, setCheckpointsList] = useState<any[]>([]);
  // Finalidade dos checkpoints mostrados: jogo, recepção ou todos
  const [filtroFinalidade, setFiltroFinalidade] = useState<'todos' | 'game' | 'reception' | 'score'>('todos');
  const finalidadeDe = (cp: any): 'game' | 'reception' | 'score' => {
    const valor = String(cp?.proposito || 'game').toLowerCase();
    return valor === 'reception' || valor === 'score' ? valor : 'game';
  };
  const checkpointsVisiveis = checkpointsList.filter((cp) => filtroFinalidade === 'todos' || finalidadeDe(cp) === filtroFinalidade);
  // Sobe quando um checkpoint recebido entra num evento, para a lista recarregar.
  const [recarregar, setRecarregar] = useState(0);

  const [loading, setLoading] = useState(true);

  // Verificar permissão: apenas admin pode acessar
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCheckpoint, setEditingCheckpoint] = useState<any>(null);
  const [instalando, setInstalando] = useState<any>(null);
  // Checkpoint que está trocando de evento (o mesmo aparelho é usado em vários eventos, um de cada vez).
  const [mudandoEvento, setMudandoEvento] = useState<any>(null);

  // Endereço do servidor na rede local, coletado do próprio servidor: o admin costuma abrir o sistema por "localhost",
  // que o checkpoint não alcança.
  const [servidorLocal, setServidorLocal] = useState<string | null>(null);
  useEffect(() => {
    if (!instalando) return;
    let cancelado = false;
    api.getEnderecoInstalacao()
      .then((r) => { if (!cancelado) setServidorLocal(r.servidor); })
      .catch(() => { if (!cancelado) setServidorLocal(null); });
    return () => { cancelado = true; };
  }, [instalando]);

  // Link que abre a página /config do checkpoint já preenchida com o servidor.
  //  - Checkpoint que já está na rede (o sistema conhece o IP dele, informado no heartbeat): abre direto nesse IP.
  //  - Checkpoint sem rede: abre no Wi-Fi próprio dele (192.168.4.1), com esse IP, máscara e gateway já como IP fixo.
  const ipConhecido = (cp: any) => {
    const ip = String(cp.ip || '').trim();
    return /^(\d{1,3}\.){3}\d{1,3}$/.test(ip) ? ip : null;
  };
  const naRede = (cp: any) => cp.status === 'online' && ipConhecido(cp) !== null;
  const linkInstalacao = (cp: any) => {
    const host = window.location.hostname;
    const abertoPorLocalhost = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
    const servidor = abertoPorLocalhost && servidorLocal ? servidorLocal : window.location.origin;
    const params = new URLSearchParams({ servidor });
    const ip = ipConhecido(cp);
    if (ip && naRede(cp)) return `http://${ip}/config?${params.toString()}`;
    if (ip) {
      const gateway = `${ip.split('.').slice(0, 3).join('.')}.1`;
      params.set('ipfixo', '1');
      params.set('ip', ip);
      params.set('mascara', '255.255.255.0');
      params.set('gateway', gateway);
      params.set('dns1', gateway);
    }
    return `http://192.168.4.1/config?${params.toString()}`;
  };

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    type: 'NFC',
    ip: '',
    zone: '',
    ledColor: '#00FF00',
    points: 10,
  });
  const [saving, setSaving] = useState(false);

  // Carregar eventos ao iniciar
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const eventosData = await api.getEventos();
        setEvents(eventosData || []);
        
        // Auto-selecionar evento ativo
        const activeEvent = eventosData?.find((e: any) => e.status === 'active' || e.status === 'ongoing');
        if (activeEvent) {
          setSelectedEventId(activeEvent.eventoId);
        } else {
          // Sem evento ativo, mostra os checkpoints de todos os eventos: o primeiro da
          // lista costuma ser o evento mais novo, que ainda pode não ter nenhum. Também vale sem evento nenhum:
          // os checkpoints recebidos e ainda fora de um evento aparecem em "todos".
          setSelectedEventId(ALL_EVENTS);
        }
      } catch (err) {
        console.error('❌ Erro ao carregar eventos:', err);
        setEvents([]);
      }
    };

    loadEvents();
  }, []);

  // Atualização automática: o contador faz o efeito abaixo recarregar a lista sem o "carregando" (sem piscar)
  const [tickAuto, setTickAuto] = useState(0);
  const cargaDoEvento = useRef<string | null>(null);

  // Carregar checkpoints da API quando evento muda (ou de todos os eventos)
  useEffect(() => {
    let disposed = false;
    // Mesma lista de antes (só atualizando): sem carregando e sem apagar a lista se a atualização falhar
    const silencioso = cargaDoEvento.current === selectedEventId;
    cargaDoEvento.current = selectedEventId;
    const loadData = async () => {
      if (!selectedEventId) {
        setLoading(false);
        setCheckpointsList([]);
        return;
      }

      if (!silencioso) setLoading(true);
      try {
        let data: any[];
        if (selectedEventId === ALL_EVENTS) {
          // Cada checkpoint leva o evento a que pertence (para a coluna Evento e para editar/excluir)
          const [lists, semEvento] = await Promise.all([
            Promise.all(events.map((event) =>
              api.getCheckpoints(event.eventoId, { todos: true })
                .then((list: any[]) => (list || []).map((cp) => ({
                  ...cp,
                  eventoId: cp.eventoId ?? event.eventoId,
                  evento_name: event.nome || `Evento ${event.eventoId}`,
                })))
                .catch(() => [])
            )),
            // Aceitos que ainda não estão em nenhum evento (não saem das listas por evento).
            api.getCheckpointsSemEvento().catch(() => []),
          ]);
          data = [
            ...lists.flat(),
            ...semEvento
              .map((cp) => ({
                id: cp.checkpointId,
                checkpointId: cp.checkpointId,
                codigo: cp.numCheck,
                numCheck: cp.numCheck,
                macAddress: cp.macAddress,
                name: cp.nome,
                type: cp.tipo,
                zone: cp.zona,
                points: cp.pontos,
                status: cp.status,
                proposito: cp.proposito || 'game',
                eventoId: null,
                evento_name: null,
                ultimo_evento_name: cp.ultimoEventoNome ?? null,
              })),
          ];
        } else {
          data = await api.getCheckpoints(selectedEventId, { todos: true });
        }
        if (disposed) return;
        console.log('📍 Checkpoints carregados:', data);
        setCheckpointsList(data || []);
      } catch (err) {
        if (disposed) return;
        console.error('❌ Erro ao carregar checkpoints:', err);
        if (!silencioso) setCheckpointsList([]);
      } finally {
        if (!disposed) setLoading(false);
      }
    };

    loadData();
    return () => { disposed = true; };
  }, [selectedEventId, events, recarregar, tickAuto]);

  const isAllEvents = selectedEventId === ALL_EVENTS;
  // Ainda fora de um evento: só o número pode mudar por enquanto.
  const somenteNumero = Boolean(editingCheckpoint && !editingCheckpoint.eventoId);

  // Coloca num evento um checkpoint aceito que ainda não tinha; a lista recarrega e ele passa a ter o evento.
  const colocarNoEvento = async (checkpoint: any, eventoId: string) => {
    try {
      await api.atribuirEventoCheckpoint(checkpoint.id, eventoId);
      toast.success(`Checkpoint ${numeroDoCheckpoint(checkpoint)} colocado no evento`);
      setRecarregar((n) => n + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível colocar no evento');
    }
  };

  const trocarDeEvento = async (checkpoint: any, eventoId: string) => {
    try {
      await api.atribuirEventoCheckpoint(checkpoint.id, eventoId);
      const destino = events.find((e: any) => e.eventoId === eventoId);
      toast.success(`Checkpoint ${numeroDoCheckpoint(checkpoint)} passou para ${destino?.nome || 'o evento escolhido'}`);
      setMudandoEvento(null);
      setRecarregar((n) => n + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível mudar de evento');
    }
  };

  // Os checkpoints são cadastrados pelo super admin e chegam direto ao buffet: o buffet só edita o que já recebeu.
  // `id` do formulário é o NÚMERO do checkpoint, o único valor que o admin do buffet define.
  const handleOpenModal = (checkpoint: any) => {
    setEditingCheckpoint(checkpoint);
    setFormData({
      id: numeroDoCheckpoint(checkpoint),
      name: checkpoint.name || '',
      type: checkpoint.type || 'NFC',
      ip: checkpoint.ip || '',
      zone: checkpoint.zone || '',
      ledColor: checkpoint.led || checkpoint.corLed || '#00FF00',
      points: checkpoint.points || 10,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingCheckpoint) return;
    const numeroNovo = formData.id.trim();
    if (!numeroNovo) {
      toast.error('O número do checkpoint é obrigatório');
      return;
    }
    if (!formData.name.trim()) {
      toast.error('O nome do checkpoint é obrigatório');
      return;
    }
    const numeroMudou = numeroNovo !== numeroDoCheckpoint(editingCheckpoint);

    // Ainda sem evento: só o número pode mudar (o resto é configurado por evento, depois de colocá-lo em um).
    if (!editingCheckpoint.eventoId) {
      if (!numeroMudou) {
        setModalOpen(false);
        return;
      }
      setSaving(true);
      try {
        await api.alterarNumeroCheckpoint(editingCheckpoint.id, numeroNovo);
        setCheckpointsList(prev => prev.map(cp => cp.id === editingCheckpoint.id ? { ...cp, codigo: numeroNovo, numCheck: numeroNovo } : cp));
        setModalOpen(false);
        toast.success(`Número alterado para ${numeroNovo}`);
      } catch (error: any) {
        toast.error(error.message || 'Não foi possível alterar o número');
      } finally {
        setSaving(false);
      }
      return;
    }

    setSaving(true);
    try {
      // O número é a única coisa que o buffet define; o ID é gerado pelo banco e não muda.
      if (numeroMudou) await api.alterarNumeroCheckpoint(editingCheckpoint.id, numeroNovo);
      await api.saveCheckpointConfig(editingCheckpoint.id, {
        nome: formData.name,
        tipo: formData.type,
        ip: formData.ip,
        zone: formData.zone,
        points: formData.points,
      }, editingCheckpoint.eventoId);
      setCheckpointsList(prev =>
        prev.map(cp => cp.id === editingCheckpoint.id ? {
          ...cp,
          ...(numeroMudou ? { codigo: numeroNovo, numCheck: numeroNovo } : {}),
          name: formData.name, type: formData.type, ip: formData.ip, zone: formData.zone, points: formData.points,
        } : cp)
      );
      setModalOpen(false);
      toast.success(`Checkpoint ${numeroNovo} atualizado`);
    } catch (error: any) {
      console.error('❌ Erro ao salvar checkpoint:', error);
      toast.error(`Erro ao salvar: ${error.message || 'Tente novamente'}`);
    } finally {
      setSaving(false);
    }
  };

  // Manda a placa acender o LED ou tocar o som; ela busca o comando sozinha (ver esperaSegundos).
  const [testando, setTestando] = useState<string | null>(null);
  const testar = async (checkpoint: any, tipo: 'led' | 'som') => {
    const chave = `${checkpoint.id}-${tipo}`;
    setTestando(chave);
    try {
      const { esperaSegundos } = await api.testarCheckpoint(checkpoint.id, tipo);
      toast.success(`${tipo === 'led' ? 'Teste do LED' : 'Teste do som'} enviado ao checkpoint ${numeroDoCheckpoint(checkpoint)}: a placa executa em até ${esperaSegundos} segundos`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível enviar o teste');
    } finally {
      setTestando(null);
    }
  };

  // Menu "Mais opções" da linha. Fica num portal no <body> (a tabela tem rolagem e cortaria o menu), com a borda direita
  // colada na do botão; abre para baixo e, sem espaço embaixo, para cima.
  const [menu, setMenu] = useState<{ cp: any; rect: DOMRect } | null>(null);
  const [menuTop, setMenuTop] = useState<number | null>(null);
  const menuEl = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!menu || !menuEl.current) { setMenuTop(null); return; }
    const altura = menuEl.current.offsetHeight;
    const { rect } = menu;
    const cabeEmbaixo = window.innerHeight - rect.bottom - 8 >= altura;
    setMenuTop(cabeEmbaixo ? rect.bottom + 4 : Math.max(8, rect.top - altura - 4));
  }, [menu]);

  useEffect(() => {
    if (!menu) return;
    const fora = (e: MouseEvent) => {
      const alvo = e.target as Element;
      if (menuEl.current?.contains(alvo) || alvo.closest('[data-menu-btn]')) return;
      setMenu(null);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(null); };
    const fecha = () => setMenu(null);
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    window.addEventListener('scroll', fecha, true);
    window.addEventListener('resize', fecha);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', esc);
      window.removeEventListener('scroll', fecha, true);
      window.removeEventListener('resize', fecha);
    };
  }, [menu]);

  // Online/offline e pontos dos checkpoints se atualizam sozinhos; pausa com menu, modal ou instalação abertos
  useAutoRefresh(() => setTickAuto((n) => n + 1), { topicos: ['checkpoints', 'eventos'], intervaloMs: 15_000, pausado: Boolean(menu) || modalOpen || Boolean(instalando) });

  // Devolver/excluir passam por um modal de confirmação (nada de confirm/alert do navegador).
  const [confirmar, setConfirmar] = useState<{ cp: any; acao: 'devolver' | 'excluir'; enviando: boolean } | null>(null);

  // Aparelho cadastrado pelo super admin (tem MAC): não é apagado, volta para o estoque dele.
  const devolverSemEvento = (checkpoint: any) => setConfirmar({ cp: checkpoint, acao: 'devolver', enviando: false });
  const handleDelete = (checkpoint: any) => {
    const eventId = checkpoint.eventoId || selectedEventId;
    if (!eventId || eventId === ALL_EVENTS) {
      toast.error('Selecione um evento primeiro');
      return;
    }
    setConfirmar({ cp: checkpoint, acao: checkpoint.macAddress ? 'devolver' : 'excluir', enviando: false });
  };

  const executarConfirmacao = async () => {
    if (!confirmar) return;
    const { cp, acao } = confirmar;
    setConfirmar({ ...confirmar, enviando: true });
    try {
      if (cp.eventoId) await api.deleteCheckpoint(cp.eventoId, cp.id);
      else await api.devolverCheckpoint(cp.id);
      setCheckpointsList(prev => prev.filter(item => item.id !== cp.id));
      toast.success(acao === 'devolver' ? 'Checkpoint devolvido ao super admin' : 'Checkpoint excluído');
      setConfirmar(null);
    } catch (err) {
      console.error('Erro ao confirmar a ação do checkpoint:', err);
      toast.error(err instanceof Error ? err.message : 'Não foi possível concluir, tente novamente');
      setConfirmar(atual => (atual ? { ...atual, enviando: false } : atual));
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-dark text-white overflow-hidden">
        <AdminSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-400">Carregando checkpoints...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-dark text-white overflow-hidden">
      <AdminSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <BuffetTopBar subtitle="Checkpoints" />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <PageHeader
            title="Checkpoints"
            description="Os checkpoints são cadastrados pelo super admin e chegam direto para você. Defina o número de cada um"
            icon={<MapPin size={28} />}
            action={<SolicitarCheckpoints />}
          />

          {/* Checkpoints que o super admin transferiu para este buffet */}
          <CheckpointsRecebidos
            events={events}
            eventoPadrao={isAllEvents ? null : selectedEventId}
            onChange={() => setRecarregar((n) => n + 1)}
          />

          {/* Event Selector */}
          <Card>
            <div className="flex items-center gap-4">
              <label className="text-sm font-body font-medium text-gray-300">Evento:</label>
              <select
                value={selectedEventId || ''}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="min-w-[14rem] px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white font-body text-sm cursor-pointer"
              >
                <option value={ALL_EVENTS} style={{ backgroundColor: '#1a1a2e', color: '#fff' }}>Todos os eventos</option>
                {(events || []).map(event => (
                  <option key={event.eventoId} value={event.eventoId} style={{ backgroundColor: '#1a1a2e', color: '#fff' }}>
                    {event.nome || `Evento ${event.eventoId}`}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-1.5" role="group" aria-label="Finalidade dos checkpoints">
                {([['todos', 'Todos'], ['game', 'Jogo'], ['reception', 'Recepção'], ['score', 'Pontuação']] as const).map(([valor, rotulo]) => {
                  const total = checkpointsList.filter((cp) => valor === 'todos' || finalidadeDe(cp) === valor).length;
                  return (
                    <button
                      key={valor}
                      type="button"
                      onClick={() => setFiltroFinalidade(valor)}
                      aria-pressed={filtroFinalidade === valor}
                      className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${filtroFinalidade === valor ? 'border-primary-400/60 bg-primary-500/15 text-white' : 'border-white/10 text-gray-400 hover:bg-white/[0.04] hover:text-white'}`}
                    >
                      {rotulo} <span className="ml-1 font-semibold">{total}</span>
                    </button>
                  );
                })}
              </div>
              {selectedEventId && checkpointsList.length > 0 && (
                <span className="text-xs text-gray-400 ml-auto">
                  ✓ {checkpointsVisiveis.length} checkpoint(s)
                </span>
              )}
            </div>
          </Card>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-3 text-sm font-body font-semibold text-gray-400">ID</th>
                    <th className="pb-3 text-sm font-body font-semibold text-gray-400">Nome</th>
                    {isAllEvents && (
                      <th className="pb-3 text-sm font-body font-semibold text-gray-400">Evento</th>
                    )}
                    <th className="pb-3 text-sm font-body font-semibold text-gray-400">Tipo</th>
                    <th className="pb-3 text-sm font-body font-semibold text-gray-400">Finalidade</th>
                    <th className="pb-3 text-sm font-body font-semibold text-gray-400">Zona</th>
                    <th className="pb-3 text-sm font-body font-semibold text-gray-400">Status</th>
                    <th className="pb-3 text-sm font-body font-semibold text-gray-400">Pontos</th>
                    <th className="pb-3 text-sm font-body font-semibold text-gray-400">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {checkpointsVisiveis.length > 0 ? (
                    checkpointsVisiveis.map(cp => (
                      <tr key={`${cp.eventoId || ''}-${cp.id}`} className="hover:bg-surface/50 transition-colors">
                        <td className="py-3 pr-4">
                          <p className="text-sm font-mono text-gray-300">{numeroDoCheckpoint(cp)}</p>
                          {cp.macAddress && (
                            <p className="text-xs text-gray-500" title="O aparelho é identificado pelo MAC; o número pode ser trocado aqui sem regravar o ESP32.">
                              MAC <span className="font-mono">{cp.macAddress}</span>
                            </p>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <p className="text-sm font-semibold text-white">{cp.name}</p>
                        </td>
                        {isAllEvents && (
                          <td className="py-3 pr-4">
                            {cp.macAddress && !cp.eventoId ? (
                              <div className="space-y-1">
                                <AtribuirEvento
                                  events={events}
                                  nomeCheckpoint={cp.name}
                                  onAtribuir={(eventoId) => colocarNoEvento(cp, eventoId)}
                                />
                                {/* Livre: entra sozinho no próximo evento que começar, se estiver ligado */}
                                <p className="text-xs text-gray-500">
                                  Último evento: <span className="text-gray-300">{cp.ultimo_evento_name || 'nenhum ainda'}</span>
                                </p>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-300">{cp.evento_name || '-'}</p>
                            )}
                          </td>
                        )}
                        <td className="py-3 pr-4">
                          <Badge variant="secondary">{cp.type}</Badge>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant={finalidadeDe(cp) === 'game' ? 'primary' : finalidadeDe(cp) === 'reception' ? 'accent' : 'success'}>
                            {finalidadeDe(cp) === 'game' ? 'Jogo' : finalidadeDe(cp) === 'reception' ? 'Recepção' : 'Pontuação'}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4">
                          <p className="text-sm text-gray-300">{cp.zone || '-'}</p>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <StatusDot status={cp.status === 'online' ? 'online' : 'offline'} />
                            <span className="text-sm text-gray-300">
                              {cp.status === 'online' ? 'Online' : cp.status === 'configured' ? 'Configurado' : 'Offline'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant="primary">{cp.points || 10} pts</Badge>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenModal(cp)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-surface transition-colors"
                              title="Editar"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => testar(cp, 'led')}
                              disabled={!podeTestar(cp) || testando === `${cp.id}-led`}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-accent hover:bg-surface transition-colors disabled:opacity-40 disabled:hover:text-gray-400 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                              title={podeTestar(cp) ? 'Testar LED' : motivoSemTeste()}
                              aria-label={`Testar LED do checkpoint ${numeroDoCheckpoint(cp)}`}
                            >
                              <Lightbulb size={16} />
                            </button>
                            <button
                              onClick={() => testar(cp, 'som')}
                              disabled={!podeTestar(cp) || testando === `${cp.id}-som`}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-secondary hover:bg-surface transition-colors disabled:opacity-40 disabled:hover:text-gray-400 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                              title={podeTestar(cp) ? 'Testar Som' : motivoSemTeste()}
                              aria-label={`Testar som do checkpoint ${numeroDoCheckpoint(cp)}`}
                            >
                              <Volume2 size={16} />
                            </button>
                            {/* Mais opções: QR code de instalação e devolução ao super admin */}
                            <button
                              data-menu-btn
                              onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setMenuTop(null);
                                setMenu(menu?.cp.id === cp.id ? null : { cp, rect });
                              }}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-surface transition-colors"
                              title="Mais opções"
                              aria-label={`Mais opções do checkpoint ${numeroDoCheckpoint(cp)}`}
                              aria-haspopup="menu"
                              aria-expanded={menu?.cp.id === cp.id}
                            >
                              <MoreVertical size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={isAllEvents ? 9 : 8} className="py-8 text-center text-gray-500">
                        {isAllEvents
                          ? 'Nenhum checkpoint em nenhum evento.'
                          : 'Nenhum checkpoint neste evento. Os checkpoints chegam do super admin e você os coloca no evento.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </main>
      </div>

      {menu && createPortal(
        <div
          ref={menuEl}
          role="menu"
          style={{ top: menuTop ?? menu.rect.bottom + 4, right: window.innerWidth - menu.rect.right, visibility: menuTop === null ? 'hidden' : 'visible' }}
          className="fixed z-[60] w-60 rounded-xl border border-border bg-dark p-1 shadow-xl"
        >
          <button
            role="menuitem"
            onClick={() => { const cp = menu.cp; setMenu(null); setInstalando(cp); }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-white hover:bg-surface"
          >
            <QrCode size={16} className="text-primary" /> QR code de instalação
          </button>
          {menu.cp.macAddress && menu.cp.eventoId && (
            <button
              role="menuitem"
              onClick={() => { const cp = menu.cp; setMenu(null); setMudandoEvento(cp); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-white hover:bg-surface"
            >
              <ArrowRightLeft size={16} className="text-primary" /> Mudar de evento
            </button>
          )}
          {menu.cp.macAddress && (
            <button
              role="menuitem"
              onClick={() => { const cp = menu.cp; setMenu(null); void (cp.eventoId ? handleDelete(cp) : devolverSemEvento(cp)); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-white hover:bg-surface"
            >
              <Undo2 size={16} className="text-warning" /> Devolver
            </button>
          )}
          {!menu.cp.macAddress && menu.cp.eventoId && (
            <button
              role="menuitem"
              onClick={() => { const cp = menu.cp; setMenu(null); void handleDelete(cp); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-danger hover:bg-surface"
            >
              <Trash2 size={16} /> Excluir
            </button>
          )}
        </div>,
        document.body
      )}

      {/* Mudar o checkpoint de evento */}
      <Modal isOpen={Boolean(mudandoEvento)} onClose={() => setMudandoEvento(null)} title="Mudar de evento" size="md">
        {mudandoEvento && (
          <div className="space-y-4 text-sm">
            <p className="text-gray-300">
              O checkpoint <strong>{numeroDoCheckpoint(mudandoEvento)}{mudandoEvento.name ? ` (${mudandoEvento.name})` : ''}</strong> está em{' '}
              <strong>{mudandoEvento.evento_name || 'um evento'}</strong>. Escolha o evento para onde ele vai.
            </p>
            <AtribuirEvento
              events={events.filter((e: any) => e.eventoId !== mudandoEvento.eventoId)}
              nomeCheckpoint={mudandoEvento.name || numeroDoCheckpoint(mudandoEvento)}
              onAtribuir={(eventoId) => trocarDeEvento(mudandoEvento, eventoId)}
            />
            <p className="text-xs text-gray-500">
              O que já aconteceu fica no evento antigo (leituras e pontos). Só o território conquistado neste checkpoint é zerado.
            </p>
          </div>
        )}
      </Modal>

      {/* Confirmação de devolver/excluir */}
      <Modal
        isOpen={Boolean(confirmar)}
        onClose={() => { if (!confirmar?.enviando) setConfirmar(null); }}
        title={confirmar?.acao === 'devolver' ? 'Devolver checkpoint' : 'Excluir checkpoint'}
        size="md"
      >
        {confirmar && (() => {
          const { cp, acao, enviando } = confirmar;
          const rotulo = `${numeroDoCheckpoint(cp)}${cp.name ? ` (${cp.name})` : ''}`;
          return (
            <div className="space-y-4">
              {acao === 'devolver' ? (
                <>
                  <p className="text-base text-gray-200">
                    Devolver o checkpoint <strong className="text-white">{rotulo}</strong> ao super admin?
                  </p>
                  <ul className="list-disc space-y-1 pl-6 text-sm text-gray-300">
                    <li>Ele sai do seu buffet{cp.eventoId ? ' e do evento' : ''} e volta para o estoque do super admin.</li>
                    {cp.eventoId && <li>As leituras e os pontos dele neste buffet são apagados.</li>}
                    <li>Para usá-lo de novo, o super admin precisa transferi-lo outra vez.</li>
                  </ul>
                </>
              ) : (
                <>
                  <p className="text-base text-gray-200">
                    Excluir o checkpoint <strong className="text-white">{rotulo}</strong>?
                  </p>
                  <p className="text-sm text-gray-300">Essa ação não pode ser desfeita.</p>
                </>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" disabled={enviando} onClick={() => setConfirmar(null)}>Cancelar</Button>
                <Button variant={acao === 'devolver' ? 'warning' : 'danger'} disabled={enviando} onClick={() => void executarConfirmacao()}>
                  {enviando ? 'Aguarde...' : acao === 'devolver' ? 'Devolver' : 'Excluir'}
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Modal de instalação: QR code que abre a página /config do checkpoint já preenchida */}
      <Modal
        isOpen={Boolean(instalando)}
        onClose={() => setInstalando(null)}
        title={`Instalar checkpoint ${instalando?.id ?? ''}`}
        size="md"
      >
        {instalando && (
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-xl bg-white p-4">
              <QRCodeSVG value={linkInstalacao(instalando)} size={220} />
            </div>
            <ol className="text-sm text-gray-300 list-decimal pl-5 space-y-1">
              {naRede(instalando) ? (
                <>
                  <li>Conecte o celular à mesma rede Wi-Fi do checkpoint (ele está online em <span className="font-mono">{ipConhecido(instalando)}</span>).</li>
                  <li>Escaneie o QR code: abre a configuração do checkpoint já com o servidor preenchido. Confira e salve.</li>
                </>
              ) : (
                <>
                  <li>Ligue o checkpoint sem configuração, ou segure o botão BOOT por 3 s.</li>
                  <li>Conecte o celular ao Wi-Fi <span className="font-mono">Pulyn-CP-…</span> (em placa nova o nome termina no MAC, não no ID).</li>
                  <li>Escaneie o QR code: o servidor {ipConhecido(instalando) ? 'e o último IP conhecido ' : ''}já vêm preenchidos. Preencha o nome e a senha do Wi-Fi e salve.</li>
                </>
              )}
            </ol>
            <p className="text-xs text-gray-500 break-all font-mono">{linkInstalacao(instalando)}</p>
          </div>
        )}
      </Modal>

      {/* Modal de Cadastro/Edição de Checkpoint */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCheckpoint ? `Editar Checkpoint: ${numeroDoCheckpoint(editingCheckpoint)}` : 'Editar Checkpoint'}
        size="lg"
      >
        <div className="space-y-4">
          {somenteNumero && (
            <p className="text-sm text-gray-400">
              Este checkpoint ainda não está em nenhum evento. Por enquanto só o número pode mudar; o restante é configurado depois de colocá-lo em um evento.
            </p>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Número do Checkpoint"
              placeholder="Ex: 12"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value.toUpperCase() })}
              required
            />
            <Input
              label="Nome"
              placeholder="Ex: Entrada Principal"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={somenteNumero}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="checkpoint-type" className="mb-1.5 block text-sm font-body font-semibold text-gray-300">Tipo</label>
              <select
                id="checkpoint-type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                disabled={somenteNumero}
                className="input-dark w-full rounded-xl border border-white/[0.10] bg-dark-card px-3.5 py-3 font-body text-white transition-all duration-200 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/15"
              >
                <option value="NFC">NFC/RFID</option>
                <option value="UHF">UHF Longa Distância</option>
              </select>
            </div>
            <Input
              label="Zona/Localização"
              placeholder="Ex: Área 1"
              value={formData.zone}
              onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
              disabled={somenteNumero}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Endereço IP (opcional)"
              placeholder="192.168.0.60"
              value={formData.ip}
              onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
              disabled={somenteNumero}
            />
          </div>

          <Input
            label="Pontos por Leitura"
            type="number"
            value={formData.points}
            onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
            disabled={somenteNumero}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Atualizar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}