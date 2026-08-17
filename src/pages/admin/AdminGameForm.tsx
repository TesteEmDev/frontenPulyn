import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Users, Gamepad2, MapPin, Map,
  FileText, RefreshCw, Settings, Save, Check, MessageSquare
} from 'lucide-react';
import { usePulynStore } from '../../store/mockData';
import { useEvento } from '../../contexts/EventoContext';
import { api } from '../../services/api';
import Sidebar from '../../components/layout/Sidebar';
import TopBar from '../../components/layout/TopBar';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';

const navItems = [
  { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/admin' },
  { icon: <Calendar size={20} />, label: 'Eventos', path: '/admin/events' },
  { icon: <Users size={20} />, label: 'Crianças', path: '/admin/children' },
  { icon: <Gamepad2 size={20} />, label: 'Jogos', path: '/admin/games' },
  { icon: <MapPin size={20} />, label: 'Checkpoints', path: '/admin/checkpoints' },
  { icon: <Map size={20} />, label: 'Mapa', path: '/admin/map' },
  { icon: <Users size={20} />, label: 'Usuários', path: '/admin/users' },
  { icon: <Users size={20} />, label: 'Times', path: '/admin/teams' },
  { icon: <FileText size={20} />, label: 'Relatórios', path: '/admin/reports' },
  { icon: <RefreshCw size={20} />, label: 'Sincronização', path: '/admin/sync' },
  { icon: <Settings size={20} />, label: 'Configurações', path: '/admin/settings' },
];

interface CheckpointConfig {
  id: string;
  enabled: boolean;
  points: number;
  cooldown: number;
  special?: boolean;
}

interface AutoMessage {
  trigger: string;
  message: string;
}

export default function AdminGameForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { brincadeiras, checkpoints, loadCheckpoints, events, loadEventos } = usePulynStore();
  const { eventoAtualId, setEventoAtualId } = useEvento();
  const [saving, setSaving] = useState(false);
  const [loadingCheckpoints, setLoadingCheckpoints] = useState(true);
  const [loadingEventos, setLoadingEventos] = useState(true);
  const [selectedEventoId, setSelectedEventoId] = useState<string>(eventoAtualId || '');
  const [existingGame, setExistingGame] = useState<any>(null);

  // Carregar o jogo existente se estamos em modo edição
  useEffect(() => {
    if (id && brincadeiras.length > 0) {
      const game = brincadeiras.find(g => g.id === id);
      if (game) {
        setExistingGame(game);
        setSelectedEventoId(game.evento_id || '');
        setFormData({
          name: game.name || '',
          description: game.description || '',
          rules: game.rules || '',
          type: game.type || 'team',
          duration: game.duration?.toString() || '',
          status: game.status || 'active',
        });
        
        // Se o jogo tem checkpoints salvos, inicializar checkpointConfigs direto
        if (game.checkpoints && Array.isArray(game.checkpoints) && game.checkpoints.length > 0) {
          setCheckpointConfigs(
            game.checkpoints.map((cp: any) => ({
              id: cp.id,
              enabled: true,
              points: cp.points || 10,
              cooldown: Number(cp.cooldown) >= 1 ? Number(cp.cooldown) : 15,
              special: Boolean(cp.special),
            }))
          );
          setCheckpointsInitialized(true);
        }
      }
    }
  }, [id, brincadeiras]);

  // Carregar eventos disponíveis
  useEffect(() => {
    const loadData = async () => {
      setLoadingEventos(true);
      await loadEventos();
      setLoadingEventos(false);
    };
    loadData();
  }, [loadEventos]);

  // Carregar checkpoints quando o evento selecionado mudar
  useEffect(() => {
    const loadData = async () => {
      setLoadingCheckpoints(true);
      try {
        if (selectedEventoId) {
          setEventoAtualId(selectedEventoId);
          // Tentar carregar do store primeiro
          await loadCheckpoints();
          
          // Se o store voltou vazio, tentar buscar da API diretamente
          if (checkpoints.length === 0) {
            console.log('📍 Store vazio, buscando checkpoints da API...');
            const apiCheckpoints = await api.getCheckpoints(selectedEventoId);
            if (apiCheckpoints && apiCheckpoints.length > 0) {
              console.log('✅ Checkpoints encontrados:', apiCheckpoints.length);
              setCheckpointConfigs(
                apiCheckpoints.map((cp: any) => ({
                  id: cp.id,
                  enabled: false,
                  points: cp.points || 10,
                  cooldown: formData.type === 'monster_hunt' ? 15 : 30,
                  special: false,
                }))
              );
            }
          }
        }
      } catch (err) {
        console.error('❌ Erro ao carregar checkpoints:', err);
      }
      setLoadingCheckpoints(false);
    };
    loadData();
  }, [selectedEventoId, loadCheckpoints, setEventoAtualId, checkpoints.length]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    rules: '',
    type: 'team',
    duration: '',
    status: 'active',
  });

  const [checkpointConfigs, setCheckpointConfigs] = useState<CheckpointConfig[]>([]);
  const [checkpointsInitialized, setCheckpointsInitialized] = useState(false);

  // Resetar initialized quando existingGame mudar
  useEffect(() => {
    if (existingGame) {
      setCheckpointsInitialized(false);
    }
  }, [existingGame]);

  // Atualizar checkpointConfigs quando checkpoints mudar (só uma vez)
  useEffect(() => {
    if (checkpoints && checkpoints.length > 0 && !checkpointsInitialized) {
      // Se temos existingGame com checkpoints salvos, usar eles
      if (existingGame?.checkpoints && Array.isArray(existingGame.checkpoints) && existingGame.checkpoints.length > 0) {
        // Merge: combinar checkpoints do store com dados salvos
        const updatedConfigs = checkpoints.map(cp => {
          const savedConfig = existingGame.checkpoints.find((x: any) => x.id === cp.id);
          return {
            id: cp.id,
            enabled: !!savedConfig, // enabled se encontrou no saved
            points: savedConfig?.points || cp.points || 10,
            cooldown: Number(savedConfig?.cooldown) >= 1
              ? Number(savedConfig.cooldown)
              : existingGame.type === 'monster_hunt' ? 15 : 30,
            special: Boolean(savedConfig?.special),
          };
        });
        setCheckpointConfigs(updatedConfigs);
      } else {
        // Modo criação novo - mostrar todos os checkpoints desabilitados
        setCheckpointConfigs(
          checkpoints.map(cp => ({
            id: cp.id,
            enabled: false,
            points: cp.points || 10,
            cooldown: formData.type === 'monster_hunt' ? 15 : 30,
            special: false,
          }))
        );
      }
      setCheckpointsInitialized(true);
    }
  }, [checkpoints, existingGame, checkpointsInitialized]);

  const [autoMessages, setAutoMessages] = useState<AutoMessage[]>([
    { trigger: 'on_start', message: 'O jogo começou! Vamos nos divertir!' },
    { trigger: 'on_score', message: 'Parabéns! +{points} pontos!' },
    { trigger: 'on_end', message: 'O jogo terminou. Confira o ranking!' },
  ]);

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleCheckpoint = (cpId: string) => {
    setCheckpointConfigs(prev =>
      prev.map(cp =>
        cp.id === cpId ? { ...cp, enabled: !cp.enabled } : cp
      )
    );
  };

  const updateCheckpointConfig = (cpId: string, field: 'points' | 'cooldown' | 'special', value: number | boolean) => {
    setCheckpointConfigs(prev =>
      prev.map(cp =>
        cp.id === cpId ? { ...cp, [field]: value } : cp
      )
    );
  };

  const updateAutoMessage = (index: number, field: 'trigger' | 'message', value: string) => {
    setAutoMessages(prev =>
      prev.map((msg, i) => i === index ? { ...msg, [field]: value } : msg)
    );
  };

  const handleSave = async () => {
    // Validar campos obrigatórios
    if (!selectedEventoId) {
      alert('Selecione um evento');
      return;
    }
    if (!formData.name || !formData.duration) {
      alert('Preencha o nome e duração do jogo');
      return;
    }

    // Validar se tem checkpoints selecionados
    const selectedCheckpoints = checkpointConfigs.filter(cp => cp.enabled);
    if (selectedCheckpoints.length === 0) {
      alert('Selecione pelo menos um checkpoint para o jogo');
      return;
    }

    if (formData.type === 'monster_hunt' && selectedCheckpoints.some((cp) =>
      !Number.isInteger(cp.cooldown) || cp.cooldown < 1 || cp.cooldown > 120
    )) {
      alert('Defina o bloqueio de cada checkpoint do Monstro entre 1 e 120 segundos.');
      return;
    }

    setSaving(true);
    try {
      const gameData = {
        name: formData.name,
        description: formData.description,
        rules: formData.rules,
        type: formData.type,
        duration: parseInt(formData.duration),
        evento_id: selectedEventoId,
        checkpoints: selectedCheckpoints.map(cp => ({
          id: cp.id,
          points: cp.points,
          cooldown: cp.cooldown,
          special: formData.type === 'monster_hunt' && Boolean(cp.special),
        })),
      };

      if (id) {
        // Modo edição - fazer PUT
        await api.updateBrincadeira(id, gameData);
      } else {
        // Modo criação - fazer POST
        await api.createBrincadeira(gameData);
      }

      navigate('/admin/games');
    } catch (error) {
      console.error('❌ Erro ao salvar jogo:', error);
      alert('Erro ao salvar jogo. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-dark text-white overflow-hidden">
      <Sidebar
        items={navItems}
        activePath="/admin/games"
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
        title="Pulyn Admin"
        accentColor="#1E9BD7"
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          title={existingGame ? 'Editar Jogo' : 'Novo Jogo'}
          subtitle={formData.name || 'Configure o jogo'}
          onBack={() => navigate('/admin/games')}
        />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Basic Info */}
            <Card>
              <h2 className="font-display text-lg text-white mb-4">Informações Básicas</h2>
              <div className="space-y-4">
                <Select
                  label="Evento *"
                  options={
                    loadingEventos
                      ? [{ value: '', label: 'Carregando eventos...' }]
                      : events.map(e => ({ value: e.id, label: e.name }))
                  }
                  value={selectedEventoId}
                  onChange={e => setSelectedEventoId(e.target.value)}
                  disabled={loadingEventos}
                />
                <Input
                  label="Nome do Jogo"
                  placeholder="Ex: Caça ao Tesouro"
                  value={formData.name}
                  onChange={e => updateField('name', e.target.value)}
                />
                <div className="w-full">
                  <label className="mb-1.5 block text-sm font-body font-medium text-gray-300">
                    Descrição
                  </label>
                  <textarea
                    className="w-full rounded-lg border border-gray-500 bg-gray-800 px-3 py-2 text-white placeholder-gray-400 font-body text-sm transition-colors duration-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 min-h-[60px]"
                    placeholder="Descrição do jogo..."
                    value={formData.description}
                    onChange={e => updateField('description', e.target.value)}
                  />
                </div>
                <div className="w-full">
                  <label className="mb-1.5 block text-sm font-body font-medium text-gray-300">
                    Regras
                  </label>
                  <textarea
                    className="w-full rounded-lg border border-gray-500 bg-gray-800 px-3 py-2 text-white placeholder-gray-400 font-body text-sm transition-colors duration-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 min-h-[80px]"
                    placeholder="Regras do jogo..."
                    value={formData.rules}
                    onChange={e => updateField('rules', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Tipo"
                    options={[
                      { value: 'team', label: 'Equipe' },
                      { value: 'individual', label: 'Individual' },
                      { value: 'cooperative', label: 'Cooperativo' },
                      { value: 'treasure_hunt', label: 'Caça ao Tesouro' },
                      { value: 'monster_hunt', label: 'Caça ao Monstro' },
                    ]}
                    value={formData.type}
                    onChange={e => updateField('type', e.target.value)}
                  />
                  <Input
                    label="Duração (minutos)"
                    type="number"
                    placeholder="20"
                    value={formData.duration}
                    onChange={e => updateField('duration', e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <label className="text-sm font-body font-medium text-gray-300">Status:</label>
                  <button
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      status: prev.status === 'active' ? 'inactive' : 'active',
                    }))}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                      formData.status === 'active'
                        ? 'bg-success/20 text-success'
                        : 'bg-surface text-gray-500'
                    }`}
                  >
                    {formData.status === 'active' ? <Check size={16} /> : null}
                    {formData.status === 'active' ? 'Ativo' : 'Inativo'}
                  </button>
                </div>
              </div>
            </Card>

            {/* Checkpoints */}
            <Card>
              <h2 className="font-display text-lg text-white mb-4">Checkpoints</h2>
              {loadingCheckpoints ? (
                <p className="text-sm text-gray-400">Carregando checkpoints...</p>
              ) : checkpointConfigs.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhum checkpoint disponível. Crie um checkpoint antes de criar um jogo.</p>
              ) : (
                <>
                  <p className="text-sm text-gray-400 mb-4">Selecione os checkpoints e configure pontos e cooldown para cada um.</p>
                  <div className="space-y-3">
                    {checkpointConfigs.map(cp => {
                      const checkpoint = checkpoints.find(c => c.id === cp.id);
                      return (
                        <div
                          key={cp.id}
                          className={`p-3 rounded-lg border transition-colors ${
                            cp.enabled
                              ? 'border-primary/50 bg-primary/5'
                              : 'border-border bg-surface/30'
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <button
                              onClick={() => toggleCheckpoint(cp.id)}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                cp.enabled ? 'border-primary bg-primary' : 'border-gray-500'
                              }`}
                            >
                              {cp.enabled && <Check size={14} className="text-white" />}
                            </button>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-white">{checkpoint?.name || cp.id}</p>
                              <p className="text-xs text-gray-500">{checkpoint?.zone} &middot; {checkpoint?.type}</p>
                            </div>
                          </div>
                          {cp.enabled && (
                            <div className="grid grid-cols-2 gap-3 ml-8 mt-2">
                              <div className="col-span-2 flex items-center gap-2 text-xs text-gray-300">
                                <input
                                  type="checkbox"
                                  checked={Boolean(cp.special)}
                                  onChange={e => updateCheckpointConfig(cp.id, 'special', e.target.checked)}
                                  disabled={formData.type !== 'monster_hunt'}
                                  className="h-4 w-4 accent-primary"
                                />
                                <span>Checkpoint especial do monstro (-30 HP)</span>
                              </div>
                              <div>
                                <label className="mb-1.5 block text-sm font-body font-medium text-gray-300">
                                  Pontos
                                </label>
                                <input
                                  type="number"
                                  value={cp.points}
                                  onChange={e => updateCheckpointConfig(cp.id, 'points', Number(e.target.value))}
                                  className="w-full rounded-lg border border-gray-500 bg-gray-800 px-3 py-2 text-white placeholder-gray-400 font-body text-sm transition-colors duration-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
                                />
                              </div>
                              <div>
                                <label className="mb-1.5 block text-sm font-body font-medium text-gray-300">
                                  {formData.type === 'monster_hunt' ? 'Bloqueio do checkpoint (seg)' : 'Cooldown (seg)'}
                                </label>
                                <input
                                  type="number"
                                  value={cp.cooldown}
                                  min={1}
                                  max={120}
                                  step={1}
                                  onChange={e => updateCheckpointConfig(cp.id, 'cooldown', Number(e.target.value))}
                                  className="w-full rounded-lg border border-gray-500 bg-gray-800 px-3 py-2 text-white placeholder-gray-400 font-body text-sm transition-colors duration-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </Card>

            {/* Auto Messages */}
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare size={20} className="text-secondary" />
                <h2 className="font-display text-lg text-white">Mensagens Automáticas</h2>
              </div>
              <div className="space-y-3">
                {autoMessages.map((msg, index) => (
                  <div key={index} className="p-3 rounded-lg bg-surface/50">
                    <Select
                      label="Gatilho"
                      options={[
                        { value: 'on_start', label: 'Ao iniciar' },
                        { value: 'on_score', label: 'Ao pontuar' },
                        { value: 'on_end', label: 'Ao encerrar' },
                        { value: 'on_cooldown', label: 'Ao entrar em cooldown' },
                      ]}
                      value={msg.trigger}
                      onChange={e => updateAutoMessage(index, 'trigger', e.target.value)}
                    />
                    <Input
                      label="Mensagem"
                      placeholder="Mensagem automática..."
                      value={msg.message}
                      onChange={e => updateAutoMessage(index, 'message', e.target.value)}
                      className="mt-2"
                    />
                  </div>
                ))}
              </div>
            </Card>

            {/* Save */}
            <div className="flex justify-end pt-2">
              <Button variant="primary" onClick={handleSave} disabled={saving}>
                <Save size={16} className="mr-1.5" />
                {saving ? 'Salvando...' : 'Salvar Jogo'}
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
