import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Users, Trophy, Plus, Edit2, Trash2, Save, X, Gamepad2, Play, MapPin } from 'lucide-react';
import { usePulynStore } from '../../store/mockData';
import Sidebar from '../../components/layout/Sidebar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import ScoreCounter from '../../components/ui/ScoreCounter';
import { api } from '../../services/api';

const sidebarItems = [
  { icon: <Gamepad2 size={20} />, label: 'Painel', path: '/game-master' },
  { icon: <Users size={20} />, label: 'Times', path: '/game-master/teams' },
  { icon: <Play size={20} />, label: 'Controle', path: '/game-master/control' },
  { icon: <MapPin size={20} />, label: 'Mensagens', path: '/game-master/messages' },
  { icon: <Trophy size={20} />, label: 'Ranking', path: '/game-master/ranking' },
];

export default function GameMasterTeams() {
  const location = useLocation();
  const { teams = [], children = [], updateTeam, addTeam, deleteTeam, loadTeams, loadChildren, setEventoAtual, eventoAtualId } = usePulynStore();
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [editingTeam, setEditingTeam] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', color: '#1E9BD7' });
  const [showNewTeamForm, setShowNewTeamForm] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: '', color: '#1E9BD7' });
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');

  // Carregar eventos ao montar
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const eventosData = await api.getEventos();
        setEvents(eventosData || []);
        
        // Se não houver evento selecionado, selecionar o primeiro
        if (!eventoAtualId && eventosData && eventosData.length > 0) {
          const firstEventId = eventosData[0].id;
          setSelectedEventId(firstEventId);
          setEventoAtual(firstEventId);
        } else if (eventoAtualId) {
          setSelectedEventId(eventoAtualId);
        }
      } catch (err) {
        console.error('❌ Erro ao carregar eventos:', err);
      }
    };
    loadEvents();
  }, []);

  // Carregar dados da API ao montar
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          loadTeams(),
          loadChildren(),
        ]);
      } catch (err) {
        console.error('❌ Erro ao carregar dados:', err);
      }
      setLoading(false);
    };
    
    // Se tem evento selecionado, carregar dados
    if (selectedEventId) {
      loadData();
    }

    // Recarregar a cada 10 segundos
    const interval = setInterval(() => {
      if (selectedEventId) {
        loadTeams();
        loadChildren();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [loadTeams, loadChildren, selectedEventId]);

  // Função para obter os membros do time
  const getTeamMembers = (teamId: string) => {
    return children.filter(child => child.time_id === teamId);
  };

  // Função para calcular a pontuação total do time
  const getTeamScore = (teamId: string) => {
    const teamMembers = getTeamMembers(teamId);
    return teamMembers.reduce((total, child) => total + (child.scores || 0), 0);
  };


  
  const handleEditTeam = (team: any) => {
    setEditingTeam(team.id);
    setEditForm({ name: team.name, color: team.color });
  };

  const handleSaveEdit = async (teamId: string) => {
    await updateTeam(teamId, editForm);
    await loadTeams();
    setEditingTeam(null);
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (confirm('Tem certeza que deseja excluir este time?')) {
      await deleteTeam(teamId);
      await loadTeams();
    }
  };

  const handleAddTeam = async () => {
    if (!newTeam.name.trim()) return;
    if (!selectedEventId) {
      alert('Por favor, selecione um evento primeiro');
      return;
    }
    
    try {
      // Criar time diretamente com a API
      const createdTeam = await api.createTime({
        name: newTeam.name,
        color: newTeam.color,
        evento_id: selectedEventId,
      });
      
      // Recarregar times
      await loadTeams();
      setNewTeam({ name: '', color: '#1E9BD7' });
      setShowNewTeamForm(false);
    } catch (error) {
      console.error('❌ Erro ao criar time:', error);
      alert('Erro ao criar time');
    }
  };

  const safeTeams = teams || [];
  const sortedTeams = [...safeTeams].sort((a, b) => getTeamScore(b.id) - getTeamScore(a.id));

  if (loading) {
    return (
      <div className="flex h-screen bg-dark text-white overflow-hidden">
        <Sidebar
          items={sidebarItems}
          activePath={location.pathname}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          title="Pulyn GM"
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-400">Carregando times...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-dark text-white overflow-hidden">
      <Sidebar
        items={sidebarItems}
        activePath={location.pathname}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        title="Pulyn GM"
      />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">
          <PageHeader
            title="Times"
            description="Gerencie os times da competição"
            icon={<Users size={28} />}
            action={
              <Button variant="primary" onClick={() => setShowNewTeamForm(true)}>
                <Plus size={16} className="mr-1.5" />
                Novo Time
              </Button>
            }
          />

          {/* Seletor de Evento */}
          <Card className="mb-6">
            <div className="flex items-center gap-4">
              <label className="text-sm font-semibold text-gray-300">Evento:</label>
              <select
                value={selectedEventId}
                onChange={(e) => {
                  const eventId = e.target.value;
                  setSelectedEventId(eventId);
                  setEventoAtual(eventId);
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-dark-surface border border-dark-border text-white focus:outline-none focus:border-primary"
              >
                <option value="">Selecionar evento...</option>
                {events.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </select>
              <Button 
                variant="ghost" 
                onClick={() => {
                  if (selectedEventId) {
                    setLoading(true);
                    Promise.all([loadTeams(), loadChildren()]).finally(() => setLoading(false));
                  }
                }}
              >
                ↻ Recarregar
              </Button>
            </div>
          </Card>

          {/* Formulário para novo time */}
          {showNewTeamForm && (
            <Card className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg text-white">Criar Novo Time</h3>
                <button
                  onClick={() => setShowNewTeamForm(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nome do Time"
                  placeholder="Ex: Águias"
                  value={newTeam.name}
                  onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                />
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Cor do Time</label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="color"
                      value={newTeam.color}
                      onChange={(e) => setNewTeam({ ...newTeam, color: e.target.value })}
                      className="w-12 h-10 rounded border border-border cursor-pointer"
                    />
                    <span className="text-sm text-gray-400">{newTeam.color}</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <Button variant="ghost" onClick={() => setShowNewTeamForm(false)}>
                  Cancelar
                </Button>
                <Button variant="primary" onClick={handleAddTeam}>
                  <Save size={16} className="mr-1.5" />
                  Criar Time
                </Button>
              </div>
            </Card>
          )}

          {/* Lista de Times */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {sortedTeams.length > 0 ? (
              sortedTeams.map(team => {
                const members = getTeamMembers(team.id);
                const teamScore = getTeamScore(team.id);
                const isEditing = editingTeam === team.id;
                
                return (
                  <Card key={team.id} variant="glow" className="overflow-hidden">
                    {/* Header do Time */}
                    <div 
                      className="p-4"
                      style={{ 
                        background: `linear-gradient(135deg, ${team.color}20 0%, ${team.color}05 100%)`,
                        borderBottom: `2px solid ${team.color}40`
                      }}
                    >
                      {isEditing ? (
                        <div className="flex gap-3">
                          <Input
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="flex-1"
                            placeholder="Nome do time"
                          />
                          <input
                            type="color"
                            value={editForm.color}
                            onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                            className="w-12 h-10 rounded border border-border cursor-pointer"
                          />
                          <Button variant="success" size="sm" onClick={() => handleSaveEdit(team.id)}>
                            <Save size={16} />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setEditingTeam(null)}>
                            <X size={16} />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                              style={{ backgroundColor: team.color + '30' }}
                            >
                              👥
                            </div>
                            <div>
                              <h3 className="font-display text-xl text-white">{team.name}</h3>
                              <p className="text-sm text-gray-400">
                                {members.length} membro{members.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <ScoreCounter value={teamScore} className="text-2xl font-bold" />
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleEditTeam(team)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-surface transition-colors"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteTeam(team.id)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-danger hover:bg-surface transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Lista de Membros */}
                    <div className="p-4">
                      <h4 className="text-sm font-semibold text-gray-400 mb-3">MEMBROS</h4>
                      {members.length > 0 ? (
                        <div className="space-y-2">
                          {members.map(child => (
                            <div key={child.id} className="flex items-center justify-between p-2 rounded-lg bg-surface/30">
                              <div className="flex items-center gap-3">
                                <Avatar emoji={child.avatar || '👤'} size="sm" />
                                <div>
                                  <p className="text-sm font-medium text-white">
                                    {child.nickname || child.name}
                                  </p>
                                  <p className="text-xs text-gray-500">{child.age} anos</p>
                                </div>
                              </div>
                              <Badge variant="success" className="text-xs">
                                {child.scores || 0} pts
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm text-center py-4">
                          Nenhum membro neste time ainda
                        </p>
                      )}
                    </div>

                    {/* Footer com estatísticas */}
                    <div className="p-4 border-t border-border bg-surface/20">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Pontuação Total:</span>
                        <span className="text-white font-semibold">{teamScore} pontos</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-400">Média por Membro:</span>
                        <span className="text-white font-semibold">
                          {members.length > 0 ? Math.round(teamScore / members.length) : 0} pontos
                        </span>
                      </div>
                    </div>
                  </Card>
                );
              })
            ) : (
              <div className="col-span-2">
                <Card>
                  <div className="text-center py-12">
                    <Users size={48} className="text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg text-white mb-2">Nenhum time cadastrado</h3>
                    <p className="text-gray-400 mb-4">Clique em "Novo Time" para começar</p>
                    <Button variant="primary" onClick={() => setShowNewTeamForm(true)}>
                      <Plus size={16} className="mr-1.5" />
                      Criar Primeiro Time
                    </Button>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}