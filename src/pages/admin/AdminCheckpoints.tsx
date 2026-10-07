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

// Valor do seletor para listar os checkpoints de todos os eventos
const ALL_EVENTS = 'all';

export default function AdminCheckpoints() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [checkpointsList, setCheckpointsList] = useState<any[]>([]);
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
        } else if (eventosData && eventosData.length > 0) {
          // Sem evento ativo, mostra os checkpoints de todos os eventos: o primeiro da
          // lista costuma ser o evento mais novo, que ainda pode não ter nenhum.
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
          const lists = await Promise.all(events.map((event) =>
            api.getCheckpoints(event.eventoId)
              .then((list: any[]) => (list || []).map((cp) => ({
                ...cp,
                eventoId: cp.eventoId ?? event.eventoId,
                evento_name: event.nome || `Evento ${event.eventoId}`,
              })))
              .catch(() => [])
          ));
          data = lists.flat();
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
  }, [selectedEventId, events]);

  const isAllEvents = selectedEventId === ALL_EVENTS;

  const handleOpenModal = (checkpoint?: any) => {
    if (checkpoint) {
      setEditingCheckpoint(checkpoint);
      setFormData({
        id: checkpoint.id,
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
    // Editando, vale o evento do próprio checkpoint (em "todos os eventos" não há um evento selecionado).
    const targetEventId = editingCheckpoint?.eventoId || selectedEventId;
    if (!targetEventId || targetEventId === ALL_EVENTS) {
      alert('Selecione um evento primeiro');
      return;
    }

    setSaving(true);
    
    try {
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
        // Atualizar checkpoint existente
        await api.saveCheckpointConfig(formData.id, config, targetEventId);
        setCheckpointsList(prev => 
          prev.map(cp => cp.id === formData.id ? { ...cp, name: formData.name, type: formData.type, ip: formData.ip, zone: formData.zone, points: formData.points } : cp)
        );
      } else {
        // Criar novo checkpoint
        await api.createCheckpoint(targetEventId, config);
        setCheckpointsList(prev => [...prev, {
          id: formData.id,
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
      alert(`Checkpoint ${formData.id} ${editingCheckpoint ? 'atualizado' : 'criado'} com sucesso!`);
      
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

          {/* Event Selector */}
          <Card>
            <div className="flex items-center gap-4">
              <label className="text-sm font-body font-medium text-gray-300">Evento:</label>
              <select
                value={selectedEventId || ''}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="min-w-[14rem] px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white font-body text-sm cursor-pointer"
              >
                {events && events.length > 0 ? (
                  <>
                    <option value={ALL_EVENTS} style={{ backgroundColor: '#1a1a2e', color: '#fff' }}>Todos os eventos</option>
                    {events.map(event => (
                      <option key={event.eventoId} value={event.eventoId} style={{ backgroundColor: '#1a1a2e', color: '#fff' }}>
                        {event.nome || `Evento ${event.eventoId}`}
                      </option>
                    ))}
                  </>
                ) : (
                  <option value="" disabled style={{ backgroundColor: '#1a1a2e', color: '#999' }}>Nenhum evento disponível</option>
                )}
              </select>
              {isAllEvents && (
                <span className="text-xs text-gray-500">Para cadastrar um checkpoint, escolha um evento.</span>
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
                          <p className="text-sm font-mono text-gray-300">{cp.id}</p>
                        </td>
                        <td className="py-3 pr-4">
                          <p className="text-sm font-semibold text-white">{cp.name}</p>
                        </td>
                        {isAllEvents && (
                          <td className="py-3 pr-4">
                            <p className="text-sm text-gray-300">{cp.evento_name || '-'}</p>
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
                            <button
                              onClick={() => handleDelete(cp)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-danger hover:bg-surface transition-colors"
                              title="Excluir"
                            >
                              <Trash2 size={16} />
                            </button>
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
        title={editingCheckpoint ? `Editar Checkpoint: ${editingCheckpoint.id}` : 'Cadastrar Novo Checkpoint'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="ID do Checkpoint"
              placeholder="Ex: CP-01"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value.toUpperCase() })}
              disabled={!!editingCheckpoint}
              required
            />
            <Input
              label="Nome"
              placeholder="Ex: Entrada Principal"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Endereço IP"
              placeholder="192.168.0.60"
              value={formData.ip}
              onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
            />
          </div>

          <Input
            label="Pontos por Leitura"
            type="number"
            value={formData.points}
            onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
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