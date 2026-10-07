import { useState, useMemo, useCallback, useEffect } from 'react';
import { QrCode, Edit, RotateCw, Unlink } from 'lucide-react';
import { usePulynStore } from '../../store/mockData';
import { useNFCReader } from '../../hooks/useNFCReader';
import { api } from '../../services/api';
import ReceptionSidebar from '../../components/layout/ReceptionSidebar';
import ReceptionTopBar from '../../components/layout/ReceptionTopBar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import Modal from '../../components/ui/Modal';
import QRCodeModal from '../../components/ui/QRCodeModal';
import StatusDot from '../../components/ui/StatusDot';

type FilterTab = 'all' | 'with-bracelet' | 'without-bracelet' | 'by-team';

interface Child {
  criancaId: string;
  nome: string;
  apelido: string;
  idade: number;
  codigoPulseira?: string | null;
  // Última pulseira que a criança usou (fica guardada depois que a pulseira é liberada).
  ultimaPulseira?: string | null;
  timeId?: string | null;
  status?: 'active' | 'inactive' | 'pending';
  avatar?: string;
}

interface Team {
  id: string;
  name: string;
  color: string;
}

export default function ReceptionParticipants() {
  const { eventoAtualId, setEventoAtual } = usePulynStore();

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
  const [modalAction, setModalAction] = useState<'unlink' | 'change' | 'edit-name' | 'delete' | 'generate-qrcode' | null>(null);
  const [braceletInput, setBraceletInput] = useState('');
  const [nfcConnected, setNFCConnected] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingTeamId, setSavingTeamId] = useState<string | null>(null);
  const [teamSelections, setTeamSelections] = useState<Record<string, string>>({});
  const [editingName, setEditingName] = useState('');
  const [editingNickname, setEditingNickname] = useState('');
  const [qrCodeModalOpen, setQrCodeModalOpen] = useState(false);
  const [qrCodeLoading, setQrCodeLoading] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [qrCodeError, setQrCodeError] = useState<string | null>(null);
  const [selectedChildForQR, setSelectedChildForQR] = useState<{ id: string; name: string } | null>(null);

  // Callback para quando uma pulseira é detectada pelo Arduino
  const handleBraceletDetected = useCallback((code: string) => {
    setBraceletInput(code.toUpperCase());
  }, []);

  // O checkpoint já está validado no modo checkin; reutilizamos esse modo
  // durante cadastro/troca para manter o mesmo comportamento do fluxo que funciona.
  const { isConnected } = useNFCReader(
    handleBraceletDetected,
    'checkin',
    selectedEventId,
    'reception',
  );

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
          ? eventosData?.find(e => e.eventoId === eventoAtualId && isOpenEvent(e))
          : null;
        const openEvents = (eventosData || []).filter(isOpenEvent);
        const eventToSelect = activeEvent || storedEvent || (openEvents.length === 1 ? openEvents[0] : null);

        setSelectedEventId(currentId => {
          if (currentId && eventosData?.some(event => event.eventoId === currentId)) return currentId;
          return eventToSelect?.eventoId || null;
        });
        if (eventToSelect) {
          setEventoAtual(eventToSelect.eventoId);
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
          (criancasData || []).map((child: Child) => [child.criancaId, child.timeId || ''])
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
          c.nome.toLowerCase().includes(q) ||
          c.apelido.toLowerCase().includes(q) ||
          (c.codigoPulseira && c.codigoPulseira.toLowerCase().includes(q)) ||
          (c.ultimaPulseira && c.ultimaPulseira.toLowerCase().includes(q))
      );
    }

    // Tab filter
    switch (activeTab) {
      case 'with-bracelet':
        result = result.filter(c => c.codigoPulseira !== null && c.codigoPulseira !== undefined);
        break;
      case 'without-bracelet':
        result = result.filter(c => !c.codigoPulseira);
        break;
      case 'by-team':
        result = result.filter(c => c.timeId === selectedTeam);
        break;
    }

    return result;
  }, [children, search, activeTab, selectedTeam]);

  const handleOpenModal = useCallback((childId: string, action: 'unlink' | 'change' | 'edit-name' | 'delete' | 'generate-qrcode') => {
    setModalChild(childId);
    setModalAction(action);
    
    // Se é editar nome, preencher os campos com os valores atuais
    if (action === 'edit-name') {
      const child = children.find(c => c.criancaId === childId);
      if (child) {
        setEditingName(child.nome);
        setEditingNickname(child.apelido);
      }
    }

    // Se é gerar QR Code, abrir o modal de QR Code e buscar o código
    if (action === 'generate-qrcode') {
      const child = children.find(c => c.criancaId === childId);
      if (child) {
        setSelectedChildForQR({ id: childId, name: child.nome });
        setQrCodeModalOpen(true);
        loadQRCode(childId);
      }
      return;
    }
    
    setModalOpen(true);
  }, [children]);

  const loadQRCode = useCallback(async (childId: string) => {
    try {
      setQrCodeLoading(true);
      setQrCodeError(null);
      setQrCodeDataUrl(null);

      const response = await api.generateQRCode(childId);
      
      if (response?.qrCodeDataUrl) {
        setQrCodeDataUrl(response.qrCodeDataUrl);
      } else if (response?.url) {
        // Se o backend retornar uma URL em vez de data URL
        setQrCodeDataUrl(response.url);
      } else {
        throw new Error('Formato de resposta inválido');
      }
    } catch (error: any) {
      console.error('❌ Erro ao carregar QR Code:', error);
      setQrCodeError(error.message || 'Erro ao gerar QR Code');
    } finally {
      setQrCodeLoading(false);
    }
  }, []);

  const handleConfirmModal = useCallback(async () => {
    if (!modalChild || !modalAction) return;

    try {
      setSaving(true);

      if (modalAction === 'delete') {
        if (!selectedEventId) {
          throw new Error('Evento não selecionado');
        }

        await api.deleteCrianca(selectedEventId, modalChild);
      } else if (modalAction === 'unlink') {
        // Desvincular pulseira
        await api.unassignBracelet(modalChild);
      } else if (modalAction === 'edit-name') {
        // Editar nome
        if (!editingName.trim()) {
          alert('O nome não pode estar vazio');
          setSaving(false);
          return;
        }

        const child = children.find(c => c.criancaId === modalChild);
        if (!child || !selectedEventId) {
          alert('Erro ao atualizar criança');
          setSaving(false);
          return;
        }

        
        await api.updateCrianca(selectedEventId, modalChild, {
          nome: editingName.trim(),
          apelido: editingNickname.trim() || editingName.trim(),
          age: child.idade,
          avatar: child.avatar,
          braceletCode: child.codigoPulseira,
          timeId: child.timeId
        });} else if (modalAction === 'change') {
        // Trocar pulseira - LÓGICA ORIGINAL
        const inputValue = braceletInput;if (!inputValue || !inputValue.trim()) {
          console.error(`❌ inputValue vazio: "${inputValue}"`);
          alert('Leia a pulseira antes de confirmar');
          setSaving(false);
          return;
        }

        const normalizedInput = inputValue.trim().toUpperCase();const pulseiras = await api.getPulseiras();let pulseira = pulseiras.find(p =>
          p.codigo.trim().toUpperCase() === normalizedInput
        );

        if (!pulseira) {await api.createPulseira(normalizedInput);
          pulseira = { code: normalizedInput, status: 'disponivel' };
        }if (pulseira.status !== 'disponivel') {
          console.error(`❌ Pulseira indisponível: ${pulseira.status}`);
          alert(`Pulseira indisponível. Status: ${pulseira.status}`);
          setSaving(false);
          return;
        }

        const child = children.find(c => c.criancaId === modalChild);
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
        }if (child.codigoPulseira && child.codigoPulseira.trim().toUpperCase() !== normalizedInput) {await api.unassignBracelet(modalChild);
        }

        await api.updateCrianca(selectedEventId, modalChild, {
          nome: child.nome,
          apelido: child.apelido,
          age: child.idade,
          avatar: child.avatar,
          braceletCode: normalizedInput,
          timeId: child.timeId
        });}

      // Recarregar dados
      if (selectedEventId) {const criancasData = await api.getCriancas(selectedEventId);const updatedChild = criancasData?.find((c: Child) => c.criancaId === modalChild);
        if (updatedChild) {}
        
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

    const previousTimeId = teamSelections[child.criancaId] || child.timeId || '';
    setTeamSelections((current) => ({ ...current, [child.criancaId]: timeId }));
    setSavingTeamId(child.criancaId);

    try {
      await api.updateCrianca(selectedEventId, child.criancaId, {
        nome: child.nome,
        apelido: child.apelido,
        age: child.idade,
        avatar: child.avatar,
        braceletCode: child.codigoPulseira || null,
        timeId: timeId || null,
      });

      const updatedChildren = await api.getCriancas(selectedEventId);
      setChildren(updatedChildren || []);
      setTeamSelections(Object.fromEntries(
        (updatedChildren || []).map((item: Child) => [item.criancaId, item.timeId || ''])
      ));
    } catch (error: any) {
      setTeamSelections((current) => ({ ...current, [child.criancaId]: previousTimeId }));
      console.error('❌ Erro ao atualizar time da criança:', error);
      alert(`Não foi possível atualizar o time: ${error.message || 'Tente novamente.'}`);
    } finally {
      setSavingTeamId(null);
    }
  }, [selectedEventId, teamSelections]);

  const getTeamName = useCallback(
    (child: Child) => {
      // Primeiro tenta usar time_nome que vem do backend
      if ((child as any).time_nome) {
        return {
          id: child.timeId,
          name: (child as any).time_nome,
          color: (child as any).time_color || '#999999'
        };
      }
      // Fallback: busca na array de times
      if (child.timeId) {
        return teamsData.find(t => t.id === child.timeId);
      }
      return null;
    },
    [teamsData]
  );

  const getChildName = useCallback(
    (childId: string) => {
      return children.find(c => c.criancaId === childId)?.nome || '';
    },
    [children]
  );

  return (
    <div className="flex h-screen bg-dark">
      <ReceptionSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <ReceptionTopBar subtitle="Gerencie criancas e pulseiras" />

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
                    <option key={event.eventoId} value={event.eventoId}>
                      {event.nome} - {new Date(event.data).toLocaleDateString('pt-BR')}
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
                        <tr key={child.criancaId} className="hover:bg-dark-surface/50 transition-colors duration-150">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Avatar emoji={child.avatar || '👧'} size="sm" />
                              <span className="font-body text-white text-sm">{child.nome}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-body text-gray-300 text-sm">{child.apelido}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-body text-gray-300 text-sm">{child.idade}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex min-w-[170px] flex-col gap-1.5">
                              <select
                                value={teamSelections[child.criancaId] ?? child.timeId ?? ''}
                                onChange={(event) => handleTeamChange(child, event.target.value)}
                                disabled={savingTeamId === child.criancaId || teamsData.length === 0}
                                className="rounded-lg border border-dark-border bg-dark-surface px-2.5 py-1.5 text-xs text-white focus:border-primary focus:outline-none disabled:cursor-wait disabled:opacity-60"
                                aria-label={`Selecionar time de ${child.nome}`}
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
                            {child.codigoPulseira ? (
                              <Badge variant="success">{child.codigoPulseira}</Badge>
                            ) : child.ultimaPulseira ? (
                              <div className="flex flex-col items-start gap-0.5" title="Pulseira liberada: era a última que esta criança usou">
                                <Badge variant="muted">{child.ultimaPulseira}</Badge>
                                <span className="text-[10px] text-gray-500">última pulseira</span>
                              </div>
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
                              {/* QrCode icon */}
                              <button
                                className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-dark-surface transition-colors duration-200"
                                title="Gerar QR Code"
                                onClick={() => handleOpenModal(child.criancaId, 'generate-qrcode')}
                              >
                                <QrCode className="w-4 h-4" />
                              </button>
                              {/* Edit icon */}
                              <button
                                className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-dark-surface transition-colors duration-200"
                                title="Editar"
                                onClick={() => handleOpenModal(child.criancaId, 'edit-name')}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              {/* Change bracelet */}
                              <button
                                className="p-1.5 rounded-lg text-gray-400 hover:text-secondary hover:bg-dark-surface transition-colors duration-200"
                                title={child.codigoPulseira ? 'Trocar pulseira' : 'Cadastrar pulseira'}
                                onClick={() => handleOpenModal(child.criancaId, 'change')}
                              >
                                <RotateCw className="w-4 h-4" />
                              </button>
                              {/* Unlink bracelet */}
                              {child.codigoPulseira && (
                                <button
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-danger hover:bg-dark-surface transition-colors duration-200"
                                  title="Desvincular pulseira"
                                  onClick={() => handleOpenModal(child.criancaId, 'unlink')}
                                >
                                  <Unlink className="w-4 h-4" />
                                </button>
                              )}
                              {/* Delete participant */}
                              <button
                                className="p-1.5 rounded-lg text-gray-400 hover:text-danger hover:bg-danger/10 transition-colors duration-200"
                                title="Excluir participante"
                                onClick={() => handleOpenModal(child.criancaId, 'delete')}
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
            ? `${children.find((child) => child.criancaId === modalChild)?.codigoPulseira ? 'Trocar' : 'Cadastrar'} pulseira de ${getChildName(modalChild || '')}`
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

      {/* Modal para QR Code */}
      <QRCodeModal
        isOpen={qrCodeModalOpen}
        onClose={() => {
          setQrCodeModalOpen(false);
          setQrCodeDataUrl(null);
          setQrCodeError(null);
          setSelectedChildForQR(null);
        }}
        childName={selectedChildForQR?.name || ''}
        childId={selectedChildForQR?.id || ''}
        qrCodeDataUrl={qrCodeDataUrl || undefined}
        loading={qrCodeLoading}
        error={qrCodeError || undefined}
      />

    </div>
  );
}

