import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Lightbulb, Volume2, Edit, Trash2
} from 'lucide-react';
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
import AtribuirEvento from '../../components/checkpoints/AtribuirEvento';
import toast from 'react-hot-toast';
import { numeroDoCheckpoint } from '../../utils/checkpoints';

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

  // Carregar checkpoints da API quando evento muda (ou de todos os eventos)
  useEffect(() => {
    let disposed = false;
    const loadData = async () => {
      if (!selectedEventId) {
        setLoading(false);
        setCheckpointsList([]);
        return;
      }

      setLoading(true);
      try {
        let data: any[];
        if (selectedEventId === ALL_EVENTS) {
          // Cada checkpoint leva o evento a que pertence (para a coluna Evento e para editar/excluir)
          const [lists, semEvento] = await Promise.all([
            Promise.all(events.map((event) =>
              api.getCheckpoints(event.eventoId)
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
              .filter((cp) => String(cp.proposito || 'game').toLowerCase() !== 'reception')
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
                eventoId: null,
                evento_name: null,
              })),
          ];
        } else {
          data = await api.getCheckpoints(selectedEventId);
        }
        if (disposed) return;
        console.log('📍 Checkpoints carregados:', data);
        setCheckpointsList(data || []);
      } catch (err) {
        if (disposed) return;
        console.error('❌ Erro ao carregar checkpoints:', err);
        setCheckpointsList([]);
      } finally {
        if (!disposed) setLoading(false);
      }
    };

    loadData();
    return () => { disposed = true; };
  }, [selectedEventId, events, recarregar]);

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

  // Os checkpoints são cadastrados pelo super admin e chegam aqui para aceitar: o buffet só edita o que já recebeu.
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
      alert('O número do checkpoint é obrigatório');
      return;
    }
    if (!formData.name.trim()) {
      alert('O nome do checkpoint é obrigatório');
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

  const handleDelete = async (checkpoint: any) => {
    const id = checkpoint.id;
    const eventId = checkpoint.eventoId || selectedEventId;
    if (!eventId || eventId === ALL_EVENTS) {
      alert('Selecione um evento primeiro');
      return;
    }
    
    // Aparelho cadastrado pelo super admin (tem MAC): não é apagado, volta para o estoque dele.
    const devolver = Boolean(checkpoint.macAddress);
    const rotulo = `${numeroDoCheckpoint(checkpoint)}${checkpoint.name ? ` (${checkpoint.name})` : ''}`;
    const pergunta = devolver
      ? `Devolver o checkpoint ${rotulo} ao super admin? Ele sai do seu buffet e do evento, e as leituras e pontos dele neste buffet são apagados.`
      : `Tem certeza que deseja excluir o checkpoint ${rotulo}?`;
    if (confirm(pergunta)) {
      try {
        await api.deleteCheckpoint(eventId, id);
        setCheckpointsList(prev => prev.filter(cp => cp.id !== id));
        alert(devolver ? 'Checkpoint devolvido ao super admin!' : 'Checkpoint excluído com sucesso!');
      } catch (error: any) {
        console.error('Erro ao excluir:', error);
        alert(`Erro ao excluir checkpoint: ${error.message || 'Tente novamente'}`);
      }
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
            description="Os checkpoints são cadastrados pelo super admin. Aceite os que chegarem e defina o número de cada um"
            icon={<MapPin size={28} />}
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
              {selectedEventId && checkpointsList.length > 0 && (
                <span className="text-xs text-gray-400 ml-auto">
                  ✓ {checkpointsList.length} checkpoint(s)
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
                    <th className="pb-3 text-sm font-body font-semibold text-gray-400">Zona</th>
                    <th className="pb-3 text-sm font-body font-semibold text-gray-400">Status</th>
                    <th className="pb-3 text-sm font-body font-semibold text-gray-400">Pontos</th>
                    <th className="pb-3 text-sm font-body font-semibold text-gray-400">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {checkpointsList.length > 0 ? (
                    checkpointsList.map(cp => (
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
                              <AtribuirEvento
                                events={events}
                                nomeCheckpoint={cp.name}
                                onAtribuir={(eventoId) => colocarNoEvento(cp, eventoId)}
                              />
                            ) : (
                              <p className="text-sm text-gray-300">{cp.evento_name || '-'}</p>
                            )}
                          </td>
                        )}
                        <td className="py-3 pr-4">
                          <Badge variant="secondary">{cp.type}</Badge>
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
                            {cp.eventoId && (
                              <button
                                onClick={() => handleDelete(cp)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-danger hover:bg-surface transition-colors"
                                title={cp.macAddress ? 'Devolver ao super admin' : 'Excluir'}
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
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
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={isAllEvents ? 8 : 7} className="py-8 text-center text-gray-500">
                        {isAllEvents
                          ? 'Nenhum checkpoint em nenhum evento.'
                          : 'Nenhum checkpoint neste evento. Os checkpoints chegam do super admin para você aceitar e colocar no evento.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </main>
      </div>

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
                <option value="QRCode">QR Code</option>
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