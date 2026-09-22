import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Users, Gamepad2, MapPin, Map,
  FileText, RefreshCw, Settings, Plus, Loader2, Edit2, Trash2
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import Sidebar from '../../components/layout/Sidebar';
import TopBar from '../../components/layout/TopBar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';

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

interface Team {
  id: string;
  name: string;
  color: string;
  evento_id?: string;
  created_at?: string;
}

interface Event {
  id: string;
  name: string;
  date: string;
}

export default function AdminTeams() {
  const location = useLocation();
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [teamsList, setTeamsList] = useState<Team[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTeam, setNewTeam] = useState({
    name: '',
    color: '#FF0000',
    evento_id: '',
  });

  // Cores predefinidas
  const colorPresets = [
    { label: 'Vermelho', value: '#FF0000' },
    { label: 'Azul', value: '#0000FF' },
    { label: 'Verde', value: '#00AA00' },
    { label: 'Amarelo', value: '#FFFF00' },
    { label: 'Roxo', value: '#AA00FF' },
    { label: 'Laranja', value: '#FF6600' },
    { label: 'Rosa', value: '#FF1493' },
    { label: 'Ciano', value: '#00FFFF' },
  ];

  // Carregar eventos e times
  const loadData = async () => {
    if (!user?.empresa_id) {
      setError('Empresa não identificada');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Carregar eventos
      const eventosData = await api.getEventos();
      setEvents(eventosData || []);

      // Carregar times do primeiro evento por padrão
      if (eventosData && eventosData.length > 0) {
        const firstEventId = eventosData[0].id;
        // Atualizar selectedEventId dispara o useEffect que carrega times
        setSelectedEventId(firstEventId);
      }
    } catch (err) {
      console.error('❌ Erro ao carregar dados:', err);
      setError('Não foi possível carregar os dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Carregar times quando evento muda
  useEffect(() => {
    if (selectedEventId) {
      loadTeams();
    }
  }, [selectedEventId]);

  const loadTeams = async () => {
    if (!selectedEventId) return;
    try {
      const timesData = await api.getTimes(selectedEventId);
      setTeamsList(timesData || []);
    } catch (err) {
      console.error('❌ Erro ao carregar times:', err);
      setError('Erro ao carregar times');
    }
  };

  const handleAddTeam = async () => {
    if (!newTeam.name || !selectedEventId) {
      setError('Preencha o nome do time e selecione um evento');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (editingId) {
        // Editar time existente
        await api.updateTime(editingId, {
          name: newTeam.name,
          color: newTeam.color,
        });
        setTeamsList(prev => prev.map(t => 
          t.id === editingId 
            ? { ...t, name: newTeam.name, color: newTeam.color }
            : t
        ));
      } else {
        // Criar novo time
        const createdTeam = await api.createTime({
          name: newTeam.name,
          color: newTeam.color,
          evento_id: selectedEventId,
        });
        setTeamsList(prev => [...prev, createdTeam]);
      }

      setNewTeam({ name: '', color: '#FF0000', evento_id: selectedEventId });
      setEditingId(null);
      setShowAddModal(false);
      
    } catch (err: any) {
      console.error('❌ Erro ao salvar time:', err);
      setError(err.message || 'Erro ao salvar time. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTeam = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover este time? Esta ação não pode ser desfeita!')) return;

    try {
      await api.deleteTime(id);
      setTeamsList(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error('❌ Erro ao remover time:', err);
      setError('Erro ao remover time');
    }
  };

  const handleEditTeam = (team: Team) => {
    setNewTeam({
      name: team.name,
      color: team.color,
      evento_id: team.evento_id || selectedEventId,
    });
    setEditingId(team.id);
    setShowAddModal(true);
  };

  const handleChangeEvent = (eventoId: string) => {
    setSelectedEventId(eventoId);
    setNewTeam(prev => ({ ...prev, evento_id: eventoId }));
  };

  return (
    <div className="flex h-screen bg-dark text-white overflow-hidden">
      <Sidebar
        items={navItems}
        activePath={location.pathname}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
        title="Pulyn Admin"
        accentColor="#1E9BD7"
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Gestão do Buffet" subtitle="Times" />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <PageHeader
            title="Times"
            description="Crie e gerencie os times para seus eventos"
            icon={<Users size={28} />}
            action={
              <Button variant="primary" onClick={() => {
                setEditingId(null);
                setNewTeam({ name: '', color: '#FF0000', evento_id: selectedEventId });
                setShowAddModal(true);
              }}>
                <Plus size={16} className="mr-1.5" />
                Novo Time
              </Button>
            }
          />

          {error && (
            <div className="bg-danger/10 border border-danger/30 rounded-lg px-4 py-3 text-danger text-sm">
              {error}
            </div>
          )}

          {/* Seletor de Evento */}
          <Card>
            <div className="flex items-center gap-4">
              <label className="text-sm font-semibold text-gray-300">Evento:</label>
              <select
                value={selectedEventId}
                onChange={e => handleChangeEvent(e.target.value)}
                className="flex-1 px-4 py-2 rounded-lg bg-dark-surface border border-dark-border text-white focus:outline-none focus:border-primary"
              >
                <option value="">Selecionar evento...</option>
                {events.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </select>
            </div>
          </Card>

          <Card>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={32} className="animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="pb-3 text-sm font-body font-semibold text-gray-400">Cor</th>
                        <th className="pb-3 text-sm font-body font-semibold text-gray-400">Nome</th>
                        <th className="pb-3 text-sm font-body font-semibold text-gray-400">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {teamsList.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-8 text-center text-gray-500">
                            Nenhum time criado. Crie o primeiro time para começar!
                          </td>
                        </tr>
                      ) : (
                        teamsList.map(team => (
                          <tr key={team.id} className="hover:bg-surface/50 transition-colors">
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-6 h-6 rounded-full border-2 border-gray-400"
                                  style={{ backgroundColor: team.color }}
                                />
                                <span className="text-xs text-gray-400 font-mono">{team.color}</span>
                              </div>
                            </td>
                            <td className="py-3 pr-4">
                              <p className="text-sm font-semibold text-white">{team.name}</p>
                            </td>
                            <td className="py-3">
                              <div className="flex items-center gap-1">
                                <button
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-surface transition-colors"
                                  title="Editar"
                                  onClick={() => handleEditTeam(team)}
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-danger hover:bg-surface transition-colors"
                                  title="Remover"
                                  onClick={() => handleDeleteTeam(team.id)}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {teamsList.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm text-gray-500">{teamsList.length} time(s) criado(s)</p>
                  </div>
                )}
              </>
            )}
          </Card>

          {/* Add/Edit Team Modal */}
          <Modal
            isOpen={showAddModal}
            onClose={() => {
              setShowAddModal(false);
              setEditingId(null);
              setNewTeam({ name: '', color: '#FF0000', evento_id: selectedEventId });
              setError(null);
            }}
            title={editingId ? 'Editar Time' : 'Criar Novo Time'}
          >
            <div className="space-y-4">
              <Input
                label="Nome do Time *"
                placeholder="Ex: Time Vermelho"
                value={newTeam.name}
                onChange={e => setNewTeam(prev => ({ ...prev, name: e.target.value }))}
              />

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Cor *</label>
                <div className="flex gap-2 flex-wrap mb-3">
                  {colorPresets.map(preset => (
                    <button
                      key={preset.value}
                      className={`w-10 h-10 rounded-lg border-2 transition-all ${
                        newTeam.color === preset.value 
                          ? 'border-white scale-110' 
                          : 'border-gray-600 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: preset.value }}
                      onClick={() => setNewTeam(prev => ({ ...prev, color: preset.value }))}
                      title={preset.label}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newTeam.color}
                    onChange={e => setNewTeam(prev => ({ ...prev, color: e.target.value }))}
                    className="w-12 h-10 rounded-lg cursor-pointer"
                  />
                  <span className="text-sm text-gray-400">{newTeam.color}</span>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <p className="text-xs text-blue-200">
                  💡 <strong>Dica:</strong> Escolha cores bem diferenciadas para facilitar a visualização no telão.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button 
                  variant="ghost" 
                  onClick={() => setShowAddModal(false)}
                  disabled={submitting}
                >
                  Cancelar
                </Button>
                <Button 
                  variant="primary" 
                  onClick={handleAddTeam}
                  disabled={!newTeam.name || submitting}
                >
                  {submitting ? (
                    <><Loader2 size={16} className="mr-2 animate-spin" /> Salvando...</>
                  ) : editingId ? (
                    'Atualizar Time'
                  ) : (
                    'Criar Time'
                  )}
                </Button>
              </div>
            </div>
          </Modal>
        </main>
      </div>
    </div>
  );
}
