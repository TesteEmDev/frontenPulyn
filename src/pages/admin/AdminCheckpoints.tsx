import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Plus, Lightbulb, Volume2, Edit, Trash2
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

// Valor do seletor para listar os checkpoints de todos os eventos
const ALL_EVENTS = 'all';

export default function AdminCheckpoints() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [checkpointsList, setCheckpointsList] = useState<any[]>([]);
  const [codigoBuffet, setCodigoBuffet] = useState<string | null>(null);
  // Sobe quando um checkpoint recebido entra num evento, para a lista recarregar.
  const [recarregar, setRecarregar] = useState(0);

  useEffect(() => { api.getCodigoBuffet().then(setCodigoBuffet); }, []);
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
  // Recebido do super admin e ainda fora de um evento: só o número pode mudar por enquanto.
  const somenteNumero = Boolean(editingCheckpoint && !editingCheckpoint.eventoId && editingCheckpoint.macAddress);

  // Coloca num evento um checkpoint aceito que ainda não tinha; a lista recarrega e ele passa a ter o evento.
  const colocarNoEvento = async (checkpoint: any, eventoId: string) => {
    try {
      await api.atribuirEventoCheckpoint(checkpoint.id, eventoId);
      toast.success(`Checkpoint ${checkpoint.codigo ?? checkpoint.id} colocado no evento`);
      setRecarregar((n) => n + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível colocar no evento');
    }
  };

  const handleOpenModal = (checkpoint?: any) => {
    if (checkpoint) {
      setEditingCheckpoint(checkpoint);
      setFormData({
        id: checkpoint.codigo ?? checkpoint.id,
        name: checkpoint.name || '',
        type: checkpoint.type || 'NFC',
        ip: checkpoint.ip || '',
        zone: checkpoint.zone || '',
        ledColor: checkpoint.led || checkpoint.corLed || '#00FF00',
        points: checkpoint.points || 10,
      });
    } else {
      setEditingCheckpoint(null);
      setFormData({
        id: '',
        name: '',
        type: 'NFC',
        ip: '',
        zone: '',
        ledColor: '#00FF00',
        points: 10,
      });
    }
    setModalOpen(true);
  };

  // Função handleSave CORRIGIDA
  const handleSave = async () => {
    if (!formData.id.trim()) {
      alert('O ID do checkpoint é obrigatório');
      return;
    }
    if (!formData.name.trim()) {
      alert('O nome do checkpoint é obrigatório');
      return;
    }
    // Checkpoint recebido que ainda não está em nenhum evento: só o número pode mudar (o resto é configurado
    // por evento, depois de colocá-lo em um).
    if (editingCheckpoint && !editingCheckpoint.eventoId && editingCheckpoint.macAddress) {
      const numeroNovo = formData.id.trim();
      if (numeroNovo === String(editingCheckpoint.codigo ?? '')) {
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

    // Editando, vale o evento do próprio checkpoint (em "todos os eventos" não há um evento selecionado).
    const targetEventId = editingCheckpoint?.eventoId || selectedEventId;
    if (!targetEventId || targetEventId === ALL_EVENTS) {
      alert('Selecione um evento primeiro');
      return;
    }

    setSaving(true);
    
    try {
      let avisoPrefixo = '';
      const config = {
        id: formData.id,
        nome: formData.name,
        tipo: formData.type,
        ip: formData.ip,
        zone: formData.zone,
        points: formData.points,
      };
      
      // Debug log
      console.log('🔍 Salvando checkpoint com config:', config);
      
      if (editingCheckpoint) {
        // Checkpoint recebido do super admin (tem MAC): o número pode mudar, pois quem o identifica é o MAC.
        const numeroNovo = formData.id.trim();
        const numeroMudou = Boolean(editingCheckpoint.macAddress) && numeroNovo !== String(editingCheckpoint.codigo ?? '');
        if (numeroMudou) await api.alterarNumeroCheckpoint(editingCheckpoint.id, numeroNovo);

        // Atualizar checkpoint existente
        await api.saveCheckpointConfig(editingCheckpoint.id, config, targetEventId);
        setCheckpointsList(prev =>
          prev.map(cp => cp.id === editingCheckpoint.id ? {
            ...cp,
            ...(numeroMudou ? { codigo: numeroNovo, numCheck: numeroNovo } : {}),
            name: formData.name, type: formData.type, ip: formData.ip, zone: formData.zone, points: formData.points,
          } : cp)
        );
      } else {
        // Criar novo checkpoint
        const criado = await api.createCheckpoint(targetEventId, config);
        if (criado?.empresaCodigo) setCodigoBuffet(criado.empresaCodigo);
        avisoPrefixo = criado?.prefixado
          ? `\n\nAtenção: o ID ${criado.codigo} também é usado em outro buffet. Se o ESP32 for gravado só com o número, ele vai falar com o checkpoint do outro buffet. Opções: grave no ESP32 o ID ${criado.id} (na página /config, no campo ID); ou peça ao suporte para passar o ID simples ${criado.codigo} para este checkpoint.`
          : '';
        setCheckpointsList(prev => [...prev, {
          id: criado?.id ?? formData.id,
          codigo: criado?.codigo ?? formData.id,
          empresaCodigo: criado?.empresaCodigo,
          prefixado: Boolean(criado?.prefixado),
          name: formData.name,
          type: formData.type,
          ip: formData.ip,
          zone: formData.zone,
          points: formData.points,
          status: 'configured',
          eventoId: targetEventId,
        }]);
      }
      
      // Fechar modal e mostrar sucesso
      setModalOpen(false);
      alert(`Checkpoint ${formData.id} ${editingCheckpoint ? 'atualizado' : 'criado'} com sucesso!${avisoPrefixo}`);
      
    } catch (error: any) {
      console.error('❌ Erro ao salvar checkpoint:', error);
      alert(`Erro ao salvar: ${error.message || 'Tente novamente'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (checkpoint: any) => {
    const id = checkpoint.id;
    const eventId = checkpoint.eventoId || selectedEventId;
    if (!eventId || eventId === ALL_EVENTS) {
      alert('Selecione um evento primeiro');
      return;
    }
    
    if (confirm(`Tem certeza que deseja excluir o checkpoint ${id}?`)) {
      try {
        await api.deleteCheckpoint(eventId, id);
        setCheckpointsList(prev => prev.filter(cp => cp.id !== id));
        alert('Checkpoint excluído com sucesso!');
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
            description="Gerencie os pontos de leitura do sistema"
            icon={<MapPin size={28} />}
            action={
              <Button
                variant="primary"
                onClick={() => handleOpenModal()}
                disabled={isAllEvents || !selectedEventId}
                title={isAllEvents ? 'Escolha um evento para cadastrar um checkpoint' : undefined}
              >
                <Plus size={16} className="mr-1.5" />
                Cadastrar Checkpoint
              </Button>
            }
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
              {isAllEvents && (
                <span className="text-xs text-gray-500">Para cadastrar um checkpoint, escolha um evento.</span>
              )}
              {codigoBuffet && (
                <span className="text-xs text-gray-400" title="Só preencha no ESP32 se o ID do checkpoint também for usado por outro buffet">
                  Código do buffet: <span className="font-mono text-gray-200">{codigoBuffet}</span>
                </span>
              )}
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
                          <p className="text-sm font-mono text-gray-300">{cp.codigo ?? cp.id}</p>
                          {cp.macAddress && (
                            <p className="text-xs text-gray-500" title="O aparelho é identificado pelo MAC; o número pode ser trocado aqui sem regravar o ESP32.">
                              MAC <span className="font-mono">{cp.macAddress}</span>
                            </p>
                          )}
                          {cp.prefixado && !cp.macAddress && (
                            <p className="text-xs text-warning" title="O mesmo ID também é usado em outro buffet: um ESP32 gravado só com o número fala com o outro. Preencha o código do buffet no ESP32 ou peça ao suporte para passar o ID simples para este checkpoint.">
                              ID repetido em outro buffet · grave no ESP32: <span className="font-mono font-semibold">{cp.id}</span>
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
                                title="Excluir"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                            <button
                              className="p-1.5 rounded-lg text-gray-400 hover:text-accent hover:bg-surface transition-colors"
                              title="Testar LED"
                            >
                              <Lightbulb size={16} />
                            </button>
                            <button
                              className="p-1.5 rounded-lg text-gray-400 hover:text-secondary hover:bg-surface transition-colors"
                              title="Testar Som"
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
                          ? 'Nenhum checkpoint cadastrado em nenhum evento.'
                          : 'Nenhum checkpoint cadastrado. Clique em "Cadastrar Checkpoint" para começar.'}
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
        title={editingCheckpoint ? `Editar Checkpoint: ${editingCheckpoint.codigo ?? editingCheckpoint.id}` : 'Cadastrar Novo Checkpoint'}
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
              label={editingCheckpoint?.macAddress ? 'Número do Checkpoint' : 'ID do Checkpoint'}
              placeholder="Ex: CP-01"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value.toUpperCase() })}
              disabled={!!editingCheckpoint && !editingCheckpoint.macAddress}
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
              label="Endereço IP"
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
              {saving ? 'Salvando...' : editingCheckpoint ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}