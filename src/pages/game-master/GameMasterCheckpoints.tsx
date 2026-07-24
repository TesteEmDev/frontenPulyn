import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Gamepad2, Users, Play, MapPin, Trophy, Radio, Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { usePulynStore } from '../../store/mockData';
import { api } from '../../services/api';
import Sidebar from '../../components/layout/Sidebar';
import TopBar from '../../components/layout/TopBar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';

const sidebarItems = [
  { icon: <Gamepad2 size={20} />, label: 'Painel', path: '/game-master' },
  { icon: <Users size={20} />, label: 'Times', path: '/game-master/teams' },
  { icon: <MapPin size={20} />, label: 'Checkpoints', path: '/game-master/checkpoints' },
  { icon: <Play size={20} />, label: 'Controle', path: '/game-master/control' },
  { icon: <Trophy size={20} />, label: 'Ranking', path: '/game-master/ranking' },
];

interface Checkpoint {
  id: string;
  name: string;
  location: string;
  points: number;
  status: 'active' | 'inactive' | 'offline';
  event_id?: string;
  territorio_locked_until?: string | null;
  territorio_cooldown_until?: string | null;
}

export default function GameMasterCheckpoints() {
  const location = useLocation();
  const { setEventoAtual } = usePulynStore();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewCheckpointModal, setShowNewCheckpointModal] = useState(false);
  const [editingCheckpointId, setEditingCheckpointId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    points: 10,
    status: 'active' as const,
  });

  // Carregar eventos ao iniciar
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const eventosData = await api.getEventos();
        setEvents(eventosData || []);
        
        // Auto-selecionar evento ativo
        const activeEvent = eventosData?.find(e => e.status === 'active' || e.status === 'ongoing');
        if (activeEvent) {
          setSelectedEventId(activeEvent.id);
          setEventoAtual(activeEvent.id);
        } else if (eventosData && eventosData.length > 0) {
          setSelectedEventId(eventosData[0].id);
          setEventoAtual(eventosData[0].id);
        }
      } catch (err) {
        console.error('❌ Erro ao carregar eventos:', err);
        setEvents([]);
      }
    };

    loadEvents();
  }, [setEventoAtual]);

  // Carregar checkpoints quando evento mudar
  useEffect(() => {
    if (!selectedEventId) {
      setLoading(false);
      return;
    }

    const loadCheckpoints = async () => {
      try {
        setLoading(true);
        const data = await api.getCheckpoints(selectedEventId);
        setCheckpoints(data || []);
      } catch (err) {
        console.error('❌ Erro ao carregar checkpoints:', err);
        setCheckpoints([]);
      } finally {
        setLoading(false);
      }
    };

    loadCheckpoints();
  }, [selectedEventId]);

  // Abrir modal para criar novo checkpoint
  const handleNewCheckpoint = () => {
    setModalMode('create');
    setFormData({ name: '', location: '', points: 10, status: 'active' });
    setEditingCheckpointId(null);
    setShowNewCheckpointModal(true);
  };

  // Abrir modal para editar checkpoint
  const handleEditCheckpoint = (checkpoint: Checkpoint) => {
    setModalMode('edit');
    setFormData({
      name: checkpoint.name,
      location: checkpoint.location,
      points: checkpoint.points,
      status: checkpoint.status,
    });
    setEditingCheckpointId(checkpoint.id);
    setShowNewCheckpointModal(true);
  };

  // Salvar checkpoint (criar ou editar)
  const handleSaveCheckpoint = async () => {
    if (!formData.name.trim() || !selectedEventId) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      if (modalMode === 'create') {
        // Criar novo checkpoint
        // Por enquanto, vamos apenas recarregar
        // Você precisará implementar a rota POST no backend
        alert('✅ Checkpoint criado! (Implementação em progresso)');
      } else if (modalMode === 'edit' && editingCheckpointId) {
        // Editar checkpoint existente
        await api.updateCheckpointConfig(selectedEventId, editingCheckpointId, formData);
        alert('✅ Checkpoint atualizado com sucesso!');
      }

      // Recarregar checkpoints
      const data = await api.getCheckpoints(selectedEventId);
      setCheckpoints(data || []);
      setShowNewCheckpointModal(false);
    } catch (err) {
      console.error('❌ Erro ao salvar checkpoint:', err);
      alert('❌ Erro ao salvar checkpoint');
    }
  };

  // Deletar checkpoint
  const handleDeleteCheckpoint = async (checkpointId: string) => {
    if (confirm('Tem certeza que deseja excluir este checkpoint?')) {
      try {
        // Implementar rota DELETE quando estiver disponível
        alert('✅ Checkpoint deletado! (Implementação em progresso)');
        setCheckpoints(checkpoints.filter(cp => cp.id !== checkpointId));
      } catch (err) {
        console.error('❌ Erro ao deletar:', err);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'muted';
      case 'offline':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ativo';
      case 'inactive':
        return 'Inativo';
      case 'offline':
        return 'Offline';
      default:
        return status;
    }
  };

  return (
    <div className="flex h-screen bg-dark">
      <Sidebar
        items={sidebarItems}
        activePath={location.pathname}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
        title="Recreacionista"
        accentColor="#06B6D4"
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Checkpoints" subtitle="Cadastre e configure os pontos do jogo" />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <PageHeader
            title="Checkpoints"
            description="Gerenciamento dos pontos de interação do jogo"
            icon={<MapPin className="w-6 h-6" />}
            action={
              <Button variant="primary" onClick={handleNewCheckpoint}>
                <Plus className="w-4 h-4 mr-1" />
                Novo Checkpoint
              </Button>
            }
          />

          {/* Seletor de Evento */}
          {events.length > 0 && (
            <Card>
              <div className="flex items-center gap-4">
                <label className="text-sm font-semibold text-gray-300 whitespace-nowrap">Evento:</label>
                <select
                  value={selectedEventId || ''}
                  onChange={e => {
                    setSelectedEventId(e.target.value);
                    setEventoAtual(e.target.value);
                  }}
                  className="flex-1 px-4 py-2 rounded-lg bg-dark-surface border border-dark-border text-white focus:outline-none focus:border-primary"
                >
                  <option value="">Selecione um evento</option>
                  {events.map(event => (
                    <option key={event.id} value={event.id}>
                      {event.name} - {new Date(event.date).toLocaleDateString('pt-BR')}
                    </option>
                  ))}
                </select>
              </div>
            </Card>
          )}

          {!selectedEventId ? (
            <Card className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-5xl mb-4">📅</span>
              <h3 className="font-display text-lg text-white mb-2">Nenhum evento selecionado</h3>
              <p className="text-sm text-gray-400 font-body">
                Selecione um evento acima para visualizar checkpoints
              </p>
            </Card>
          ) : loading ? (
            <Card className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-5xl mb-4 animate-spin">⏳</span>
              <h3 className="font-display text-lg text-white mb-2">Carregando checkpoints...</h3>
            </Card>
          ) : (
            <>
              {/* Checkpoints Grid */}
              {checkpoints.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {checkpoints.map(checkpoint => (
                    <Card key={checkpoint.id} className="relative">
                      <div className="space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-display text-lg text-white">{checkpoint.name}</h3>
                            <p className="text-sm text-gray-400 font-body">
                              <MapPin className="inline w-3 h-3 mr-1" />
                              {checkpoint.location}
                            </p>
                          </div>
                          <Badge variant={getStatusColor(checkpoint.status)}>
                            {getStatusLabel(checkpoint.status)}
                          </Badge>
                        </div>

                        {/* Pontos */}
                        <div className="flex items-center gap-2 py-2 px-3 bg-dark-surface rounded-lg">
                          <span className="text-sm text-gray-400">Pontos:</span>
                          <span className="text-lg font-display text-primary font-bold">{checkpoint.points}</span>
                        </div>

                        {/* Territory Status */}
                        {checkpoint.territorio_locked_until && (
                          <div className="text-xs text-warning bg-warning/10 p-2 rounded">
                            <Radio className="inline w-3 h-3 mr-1" />
                            Território bloqueado até {new Date(checkpoint.territorio_locked_until).toLocaleTimeString('pt-BR')}
                          </div>
                        )}

                        {/* Ações */}
                        <div className="flex gap-2 pt-2 border-t border-dark-border">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleEditCheckpoint(checkpoint)}
                          >
                            <Edit2 className="w-3 h-3 mr-1" />
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex-1 text-danger hover:text-danger"
                            onClick={() => handleDeleteCheckpoint(checkpoint.id)}
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Deletar
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="flex flex-col items-center justify-center py-16 text-center">
                  <span className="text-5xl mb-4">🗺️</span>
                  <h3 className="font-display text-lg text-white mb-2">Nenhum checkpoint cadastrado</h3>
                  <p className="text-sm text-gray-400 font-body mb-4">
                    Crie seu primeiro checkpoint para começar o jogo
                  </p>
                  <Button variant="primary" onClick={handleNewCheckpoint}>
                    <Plus className="w-4 h-4 mr-1" />
                    Novo Checkpoint
                  </Button>
                </Card>
              )}
            </>
          )}
        </main>
      </div>

      {/* Modal para criar/editar checkpoint */}
      <Modal
        isOpen={showNewCheckpointModal}
        onClose={() => setShowNewCheckpointModal(false)}
        title={modalMode === 'create' ? 'Novo Checkpoint' : 'Editar Checkpoint'}
      >
        <div className="space-y-4">
          <Input
            label="Nome do Checkpoint"
            placeholder="Ex: Torre Encantada, Base Secreta"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
          />

          <Input
            label="Localização"
            placeholder="Ex: Sala principal, Corredor"
            value={formData.location}
            onChange={e => setFormData({ ...formData, location: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-300 mb-2 block">Pontos</label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.points}
                onChange={e => setFormData({ ...formData, points: parseInt(e.target.value) || 10 })}
                className="w-full px-3 py-2 rounded-lg bg-dark-surface border border-dark-border text-white focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-300 mb-2 block">Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 rounded-lg bg-dark-surface border border-dark-border text-white focus:outline-none focus:border-primary"
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
                <option value="offline">Offline</option>
              </select>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <p className="text-xs text-blue-200 font-body">
              💡 <strong>Dica:</strong> Os checkpoints serão ligados aos Arduino/ESP32 de forma automática através da rede.
            </p>
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t border-dark-border">
            <Button variant="ghost" onClick={() => setShowNewCheckpointModal(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSaveCheckpoint}>
              {modalMode === 'create' ? (
                <>
                  <Plus className="w-4 h-4 mr-1" />
                  Criar Checkpoint
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
