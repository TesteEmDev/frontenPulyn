import { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { usePulynStore } from '../../store/mockData';
import { useNFCReader } from '../../hooks/useNFCReader';
import { api } from '../../services/api';
import Sidebar from '../../components/layout/Sidebar';
import TopBar from '../../components/layout/TopBar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import Modal from '../../components/ui/Modal';
import StatusDot from '../../components/ui/StatusDot';

const navItems = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
    label: 'Dashboard',
    path: '/reception',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
    label: 'Check-in',
    path: '/reception/checkin',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    label: 'Participantes',
    path: '/reception/participants',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
    label: 'Pulseiras',
    path: '/reception/bracelets',
  },
  {
    icon: <span>👪</span>,
    label: 'Famílias',
    path: '/reception/families',
  },
];

type FilterTab = 'all' | 'with-bracelet' | 'without-bracelet' | 'by-team';

interface Child {
  id: string;
  name: string;
  nickname: string;
  age: number;
  bracelet_code?: string | null;
  time_id?: string | null;
  status?: 'active' | 'inactive' | 'pending';
  avatar?: string;
}

interface Team {
  id: string;
  name: string;
  color: string;
}

export default function ReceptionParticipants() {
  const location = useLocation();
  const { eventoAtualId, setEventoAtual } = usePulynStore();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamsData, setTeamsData] = useState<Team[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalChild, setModalChild] = useState<string | null>(null);
  const [modalAction, setModalAction] = useState<'unlink' | 'change' | 'edit-name' | 'delete' | null>(null);
  const [braceletInput, setBraceletInput] = useState('');
  const [nfcConnected, setNFCConnected] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingTeamId, setSavingTeamId] = useState<string | null>(null);
  const [teamSelections, setTeamSelections] = useState<Record<string, string>>({});
  const [editingName, setEditingName] = useState('');
  const [editingNickname, setEditingNickname] = useState('');

  // Callback para quando uma pulseira é detectada pelo Arduino
  const handleBraceletDetected = useCallback((code: string) => {
    setBraceletInput(code.toUpperCase());
  }, []);

  // O checkpoint já está validado no modo checkin; reutilizamos esse modo
  // durante cadastro/troca para manter o mesmo comportamento do fluxo que funciona.
  const { isConnected } = useNFCReader(handleBraceletDetected, 'checkin', selectedEventId);

  useEffect(() => {
    setNFCConnected(isConnected);
  }, [isConnected]);

  // Carregar eventos ao iniciar
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const eventosData = await api.getEventos();
        setEvents(eventosData || []);
        
        // Selecionar o evento ativo, reaproveitar o evento global ainda aberto
        // ou usar o único evento aberto. Eventos históricos nunca são escolhidos.
        const isOpenEvent = (event: any) => ![
          'completed',
          'cancelled',
          'canceled',
          'finished',
        ].includes(String(event.status || '').toLowerCase());
        const activeEvent = eventosData?.find(e => e.status === 'active' || e.status === 'ongoing');
        const storedEvent = eventoAtualId
          ? eventosData?.find(e => e.id === eventoAtualId && isOpenEvent(e))
          : null;
        const openEvents = (eventosData || []).filter(isOpenEvent);
        const eventToSelect = activeEvent || storedEvent || (openEvents.length === 1 ? openEvents[0] : null);

        setSelectedEventId(currentId => {
          if (currentId && eventosData?.some(event => event.id === currentId)) return currentId;
          return eventToSelect?.id || null;
        });
        if (eventToSelect) {
          setEventoAtual(eventToSelect.id);
        }
      } catch (err) {
        console.error('❌ Erro ao carregar eventos:', err);
        setEvents([]);
      }
    };
    
    loadEvents();
  }, [eventoAtualId, setEventoAtual]);

  // Carregar crianças e times quando evento muda
  useEffect(() => {
    if (!selectedEventId) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        const [criancasData, timesData] = await Promise.all([
          api.getCriancas(selectedEventId),
          api.getTimes(selectedEventId),
        ]);
        setChildren(criancasData || []);
        setTeamSelections(Object.fromEntries(
          (criancasData || []).map((child: Child) => [child.id, child.time_id || ''])
        ));
        setTeamsData(timesData || []);
        if (timesData?.length > 0) {
          setSelectedTeam(timesData[0].id);
        }
      } catch (err) {
        console.error('❌ Erro ao carregar dados:', err);
        setChildren([]);
        setTeamsData([]);
        setTeamSelections({});
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedEventId]);

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'with-bracelet', label: 'Com pulseira' },
    { key: 'without-bracelet', label: 'Sem pulseira' },
    { key: 'by-team', label: 'Por time' },
  ];

  const filteredChildren = useMemo(() => {
    let result = [...children];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        c =>
          c.name.toLowerCase().includes(q) ||
          c.nickname.toLowerCase().includes(q) ||
          (c.bracelet_code && c.bracelet_code.toLowerCase().includes(q))
      );
    }

    // Tab filter
    switch (activeTab) {
      case 'with-bracelet':
        result = result.filter(c => c.bracelet_code !== null && c.bracelet_code !== undefined);
        break;
      case 'without-bracelet':
        result = result.filter(c => !c.bracelet_code);
        break;
      case 'by-team':
        result = result.filter(c => c.time_id === selectedTeam);
        break;
    }

    return result;
  }, [children, search, activeTab, selectedTeam]);

  const handleOpenModal = useCallback((childId: string, action: 'unlink' | 'change' | 'edit-name' | 'delete') => {
    setModalChild(childId);
    setModalAction(action);
    
    // Se é editar nome, preencher os campos com os valores atuais
    if (action === 'edit-name') {
      const child = children.find(c => c.id === childId);
      if (child) {
        setEditingName(child.name);
        setEditingNickname(child.nickname);
      }
    }
    
    setModalOpen(true);
  }, [children]);

  const handleConfirmModal = useCallback(async () => {
    if (!modalChild || !modalAction) return;

    try {
      setSaving(true);

      if (modalAction === 'delete') {
        if (!selectedEventId) {
          throw new Error('Evento não selecionado');
        }

        console.log(`🗑️ Excluindo participante ${modalChild}`);
        await api.deleteCrianca(selectedEventId, modalChild);
      } else if (modalAction === 'unlink') {
        // Desvincular pulseira
        console.log(`🔗 Desvinculando pulseira da criança ${modalChild}`);
        await api.unassignBracelet(modalChild);
      } else if (modalAction === 'edit-name') {
        // Editar nome
        if (!editingName.trim()) {
          alert('O nome não pode estar vazio');
          setSaving(false);
          return;
        }

        const child = children.find(c => c.id === modalChild);
        if (!child || !selectedEventId) {
          alert('Erro ao atualizar criança');
          setSaving(false);
          return;
        }

        console.log(`✏️ Editando criança ${child.name} → ${editingName}`);
        
        await api.updateCrianca(selectedEventId, modalChild, {
          name: editingName.trim(),
          nickname: editingNickname.trim() || editingName.trim(),
          age: child.age,
          avatar: child.avatar,
          braceletCode: child.bracelet_code,
          timeId: child.time_id
        });

        console.log(`✅ Criança ${editingName} atualizada com sucesso`);
      } else if (modalAction === 'change') {
        // Trocar pulseira - LÓGICA ORIGINAL
        const inputValue = braceletInput;
        console.log(`📊 [START] handleConfirmModal - braceletInput: "${inputValue}"`);

        if (!inputValue || !inputValue.trim()) {
          console.error(`❌ inputValue vazio: "${inputValue}"`);
          alert('Leia a pulseira antes de confirmar');
          setSaving(false);
          return;
        }

        const normalizedInput = inputValue.trim().toUpperCase();
        console.log(`🔄 Procurando pulseira: ${normalizedInput}`);

        const pulseiras = await api.getPulseiras();
        console.log(`📋 Pulseiras carregadas: ${pulseiras.length}`);
        
        let pulseira = pulseiras.find(p =>
          p.code.trim().toUpperCase() === normalizedInput
        );

        if (!pulseira) {
          console.log(`📝 Pulseira não cadastrada. Cadastrando ${normalizedInput}...`);
          await api.createPulseira(normalizedInput);
          pulseira = { code: normalizedInput, status: 'disponivel' };
        }

        console.log(`✅ Pulseira disponível para vínculo:`, pulseira);

        if (pulseira.status !== 'disponivel') {
          console.error(`❌ Pulseira indisponível: ${pulseira.status}`);
          alert(`Pulseira indisponível. Status: ${pulseira.status}`);
          setSaving(false);
          return;
        }

        const child = children.find(c => c.id === modalChild);
        if (!child) {
          console.error('❌ Criança não encontrada');
          alert('Criança não encontrada');
          setSaving(false);
          return;
        }

        if (!selectedEventId) {
          console.error('❌ Evento não selecionado');
          alert('Evento não selecionado');
          setSaving(false);
          return;
        }

        console.log(`📝 Atualizando pulseira da criança ${child.name} para ${normalizedInput}`);
        
        if (child.bracelet_code && child.bracelet_code.trim().toUpperCase() !== normalizedInput) {
          console.log(`   → Desvinculando pulseira anterior: ${child.bracelet_code}`);
          await api.unassignBracelet(modalChild);
        }

        await api.updateCrianca(selectedEventId, modalChild, {
          name: child.name,
          nickname: child.nickname,
          age: child.age,
          avatar: child.avatar,
          braceletCode: normalizedInput,
          timeId: child.time_id
        });
        
        console.log(`✅ Pulseira ${normalizedInput} vinculada a ${child.name}`);
      }

      // Recarregar dados
      if (selectedEventId) {
        console.log(`🔄 Recarregando dados do evento`);
        const criancasData = await api.getCriancas(selectedEventId);
        console.log(`📋 Crianças recarregadas:`, criancasData);
        
        const updatedChild = criancasData?.find((c: Child) => c.id === modalChild);
        if (updatedChild) {
          console.log(`✅ Criança ${updatedChild.name} atualizada:`, {
            id: updatedChild.id,
            name: updatedChild.name,
            bracelet_code: updatedChild.bracelet_code,
            time_id: updatedChild.time_id
          });
        }
        
        setChildren(criancasData || []);
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Limpar
      setModalOpen(false);
      setBraceletInput('');
      setEditingName('');
      setEditingNickname('');
      setModalChild(null);
      setModalAction(null);
      alert('✅ Ação realizada com sucesso!');
    } catch (error: any) {
      console.error('❌ Erro:', error);
      alert(`Erro ao processar ação: ${error.message || 'Tente novamente'}`);
    } finally {
      setSaving(false);
    }
  }, [modalChild, modalAction, braceletInput, editingName, editingNickname, selectedEventId, children]);

  const handleTeamChange = useCallback(async (child: Child, timeId: string) => {
    if (!selectedEventId) {
      alert('Selecione um evento antes de definir o time');
      return;
    }

    const previousTimeId = teamSelections[child.id] || child.time_id || '';
    setTeamSelections((current) => ({ ...current, [child.id]: timeId }));
    setSavingTeamId(child.id);

    try {
      await api.updateCrianca(selectedEventId, child.id, {
        name: child.name,
        nickname: child.nickname,
        age: child.age,
        avatar: child.avatar,
        braceletCode: child.bracelet_code || null,
        timeId: timeId || null,
      });

      const updatedChildren = await api.getCriancas(selectedEventId);
      setChildren(updatedChildren || []);
      setTeamSelections(Object.fromEntries(
        (updatedChildren || []).map((item: Child) => [item.id, item.time_id || ''])
      ));
    } catch (error: any) {
      setTeamSelections((current) => ({ ...current, [child.id]: previousTimeId }));
      console.error('❌ Erro ao atualizar time da criança:', error);
      alert(`Não foi possível atualizar o time: ${error.message || 'Tente novamente.'}`);
    } finally {
      setSavingTeamId(null);
    }
  }, [selectedEventId, teamSelections]);

  const getTeamName = useCallback(
    (child: Child) => {
      // Primeiro tenta usar time_name que vem do backend
      if ((child as any).time_name) {
        return {
          id: child.time_id,
          name: (child as any).time_name,
          color: (child as any).time_color || '#999999'
        };
      }
      // Fallback: busca na array de times
      if (child.time_id) {
        return teamsData.find(t => t.id === child.time_id);
      }
      return null;
    },
    [teamsData]
  );

  const getChildName = useCallback(
    (childId: string) => {
      return children.find(c => c.id === childId)?.name || '';
    },
    [children]
  );

  return (
    <div className="flex h-screen bg-dark">
      <Sidebar
        items={navItems}
        activePath={location.pathname}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
        title="Recepcao"
        accentColor="#F59E0B"
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Participantes" subtitle="Gerencie criancas e pulseiras" />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <PageHeader
            title="Participantes"
            description={`${children.length} crianças cadastradas`}
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
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
                Selecione um evento acima para visualizar participantes
              </p>
            </Card>
          ) : loading ? (
            <Card className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-5xl mb-4 animate-spin">⏳</span>
              <h3 className="font-display text-lg text-white mb-2">Carregando participantes...</h3>
            </Card>
          ) : (
            <>
          {/* Search + Team filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por nome, apelido ou pulseira..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                }
              />
            </div>
            {activeTab === 'by-team' && teamsData.length > 0 && (
              <div className="flex gap-2 overflow-x-auto">
                {teamsData.map(team => (
                  <Button
                    key={team.id}
                    variant={selectedTeam === team.id ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setSelectedTeam(team.id)}
                    style={selectedTeam === team.id ? { backgroundColor: team.color } : {}}
                  >
                    {team.name}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {tabs.map(tab => (
              <Button
                key={tab.key}
                variant={activeTab === tab.key ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          {/* Table */}
          {filteredChildren.length > 0 ? (
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b border-dark-border">
                      <th className="text-left text-xs font-body font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Crianca</th>
                      <th className="text-left text-xs font-body font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Apelido</th>
                      <th className="text-left text-xs font-body font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Idade</th>
                      <th className="text-left text-xs font-body font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Time</th>
                      <th className="text-left text-xs font-body font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Pulseira</th>
                      <th className="text-left text-xs font-body font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Status</th>
                      <th className="text-right text-xs font-body font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Acoes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-border">
                    {filteredChildren.map(child => {
                      const team = getTeamName(child);
                      return (
                        <tr key={child.id} className="hover:bg-dark-surface/50 transition-colors duration-150">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Avatar emoji={child.avatar || '👧'} size="sm" />
                              <span className="font-body text-white text-sm">{child.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-body text-gray-300 text-sm">{child.nickname}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-body text-gray-300 text-sm">{child.age}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex min-w-[170px] flex-col gap-1.5">
                              <select
                                value={teamSelections[child.id] ?? child.time_id ?? ''}
                                onChange={(event) => handleTeamChange(child, event.target.value)}
                                disabled={savingTeamId === child.id || teamsData.length === 0}
                                className="rounded-lg border border-dark-border bg-dark-surface px-2.5 py-1.5 text-xs text-white focus:border-primary focus:outline-none disabled:cursor-wait disabled:opacity-60"
                                aria-label={`Selecionar time de ${child.name}`}
                              >
                                <option value="">Sem time</option>
                                {teamsData.map((teamOption) => (
                                  <option key={teamOption.id} value={teamOption.id}>
                                    {teamOption.name}
                                  </option>
                                ))}
                              </select>
                              {team && (
                                <span
                                  className="inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-body font-semibold"
                                  style={{ backgroundColor: team.color + '20', color: team.color }}
                                >
                                  {team.name}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {child.bracelet_code ? (
                              <Badge variant="success">{child.bracelet_code}</Badge>
                            ) : (
                              <Badge variant="muted">--</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={child.status === 'active' ? 'success' : child.status === 'pending' ? 'warning' : 'danger'}>
                              {child.status === 'active' ? 'Ativo' : child.status === 'pending' ? 'Aguardando aprovação' : 'Inativo'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              {/* Edit icon */}
                              <button
                                className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-dark-surface transition-colors duration-200"
                                title="Editar"
                                onClick={() => handleOpenModal(child.id, 'edit-name')}
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              {/* Change bracelet */}
                              <button
                                className="p-1.5 rounded-lg text-gray-400 hover:text-secondary hover:bg-dark-surface transition-colors duration-200"
                                title={child.bracelet_code ? 'Trocar pulseira' : 'Cadastrar pulseira'}
                                onClick={() => handleOpenModal(child.id, 'change')}
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              </button>
                              {/* Unlink bracelet */}
                              {child.bracelet_code && (
                                <button
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-danger hover:bg-dark-surface transition-colors duration-200"
                                  title="Desvincular pulseira"
                                  onClick={() => handleOpenModal(child.id, 'unlink')}
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                  </svg>
                                </button>
                              )}
                              {/* Delete participant */}
                              <button
                                className="p-1.5 rounded-lg text-gray-400 hover:text-danger hover:bg-danger/10 transition-colors duration-200"
                                title="Excluir participante"
                                onClick={() => handleOpenModal(child.id, 'delete')}
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-9 0h10" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            /* Empty state */
            <Card className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-5xl mb-4">🔍</span>
              <h3 className="font-display text-lg text-white mb-2">Nenhum participante encontrado</h3>
              <p className="text-sm text-gray-400 font-body">
                Tente ajustar os filtros ou realize um novo cadastro
              </p>
            </Card>
          )}
            </>
          )}
        </main>
      </div>

      {/* Modal para trocar/desvincular pulseira */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setBraceletInput('');
          setEditingName('');
          setEditingNickname('');
          setModalChild(null);
          setModalAction(null);
        }}
        title={
          modalAction === 'change'
            ? `${children.find((child) => child.id === modalChild)?.bracelet_code ? 'Trocar' : 'Cadastrar'} pulseira de ${getChildName(modalChild || '')}`
            : modalAction === 'edit-name'
            ? `Editar ${getChildName(modalChild || '')}`
            : modalAction === 'delete'
            ? `Excluir ${getChildName(modalChild || '')}`
            : `Desvincular pulseira de ${getChildName(modalChild || '')}`
        }
      >
        <div className="space-y-4">
          {modalAction === 'edit-name' && (
            <>
              <Input
                label="Nome completo"
                placeholder="Digite o nome da criança"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
              />
              
              <Input
                label="Apelido (opcional)"
                placeholder="Digite o apelido"
                value={editingNickname}
                onChange={(e) => setEditingNickname(e.target.value)}
              />
            </>
          )}

          {modalAction === 'change' && (
            <>
              {/* Status de conexão Arduino */}
              <div className="flex items-center justify-between bg-surface rounded-lg p-3">
                <div className="flex items-center gap-2">
                  {nfcConnected ? (
                    <>
                      <StatusDot status="online" size="sm" />
                      <span className="text-sm text-success font-body">Arduino Conectado</span>
                    </>
                  ) : (
                    <>
                      <StatusDot status="offline" size="sm" />
                      <span className="text-sm text-gray-400 font-body">Aguardando Arduino...</span>
                    </>
                  )}
                </div>
              </div>

              <p className="text-sm text-gray-400">
                {nfcConnected 
                  ? '📱 Aproxime a nova pulseira do Arduino para detecção automática:'
                  : 'Digite o código da nova pulseira:'}
              </p>
              
              <Input
                label="Código da pulseira"
                placeholder={nfcConnected ? "Aproxime a pulseira..." : "Ex: XX:XX:XX:XX"}
                value={braceletInput}
                onChange={(e) => setBraceletInput(e.target.value.toUpperCase())}
              />

              {!nfcConnected && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                  <p className="text-xs text-yellow-200 font-body">
                    ⚠️ Arduino não conectado. Verifique se o checkpoint está ligado.
                  </p>
                </div>
              )}
            </>
          )}

          {modalAction === 'unlink' && (
            <p className="text-sm text-gray-300 font-body">
              Deseja desvincular a pulseira desta criança? Ela poderá ser reatribuída a outro participante.
            </p>
          )}

          {modalAction === 'delete' && (
            <div className="space-y-2">
              <p className="text-sm text-gray-200 font-body">
                Deseja excluir este participante do evento?
              </p>
              <p className="text-xs text-red-300 font-body">
                Essa ação remove o cadastro e o histórico de pontuação dele. A pulseira será liberada para uso novamente.
              </p>
            </div>
          )}

          <div className="flex gap-3 justify-end mt-4">
            <Button 
              variant="ghost" 
              onClick={() => {
                setModalOpen(false);
                setBraceletInput('');
                setEditingName('');
                setEditingNickname('');
              }}
            >
              Cancelar
            </Button>
            <Button 
              variant={modalAction === 'unlink' || modalAction === 'delete' ? 'danger' : 'primary'} 
              onClick={handleConfirmModal}
              disabled={saving || (modalAction === 'change' && !braceletInput.trim()) || (modalAction === 'edit-name' && !editingName.trim())}
            >
              {saving ? 'Processando...' : modalAction === 'change' ? 'Cadastrar e vincular' : modalAction === 'edit-name' ? 'Salvar' : modalAction === 'delete' ? 'Excluir participante' : 'Desvincular'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
