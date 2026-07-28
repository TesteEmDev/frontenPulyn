import { useState, useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { usePulynStore } from '../../store/mockData';
import { api } from '../../services/api';
import { useNFCReader } from '../../hooks/useNFCReader';
import Sidebar from '../../components/layout/Sidebar';
import TopBar from '../../components/layout/TopBar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
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

const normalizeUid = (value: string) =>
  value.trim().toUpperCase().replace(/[^0-9A-F]/g, '');

export default function ReceptionCheckin() {
  const location = useLocation();
  const { teams = [], addChild, loadTeams, loadChildren, loadEventos, setEventoAtual, eventoAtualId } = usePulynStore();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    nickname: '',
    age: '',
    guardian: '',
    phone: '',
    notes: '',
  });
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [braceletCode, setBraceletCode] = useState('');
  const [braceletStatus, setBraceletStatus] = useState<'idle' | 'detected' | 'linked' | 'registered' | 'error'>('idle');
  const [lastReadAt, setLastReadAt] = useState<Date | null>(null);
  const braceletCheckIdRef = useRef(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nfcConnected, setNFCConnected] = useState(false);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // A aproximação apenas preenche o rascunho. O cadastro só ocorre no submit.
  const handleBraceletDetected = useCallback((code: string) => {
    const normalizedCode = normalizeUid(code);
    if (!normalizedCode) return;

    const checkId = ++braceletCheckIdRef.current;
    setBraceletCode(normalizedCode);
    setBraceletStatus('detected');
    setLastReadAt(new Date());

    const checkBracelet = async () => {
      try {
        const pulseiras = await api.getPulseiras();
        if (checkId !== braceletCheckIdRef.current) return;

        const pulseira = pulseiras.find(p => normalizeUid(String(p.code || '')) === normalizedCode);
        if (pulseira && pulseira.status !== 'disponivel') {
          setBraceletStatus('registered');
          showToast(`✅ Pulseira já cadastrada para ${pulseira.crianca_name || 'uma criança'}`, 'success');
        } else if (pulseira) {
          setBraceletStatus('linked');
          showToast(`Pulseira ${normalizedCode} detectada e disponível!`, 'success');
        } else {
          setBraceletStatus('detected');
          showToast(`Pulseira ${normalizedCode} detectada. Cadastre-a em Pulseiras antes de vincular.`, 'error');
        }
      } catch (err) {
        if (checkId !== braceletCheckIdRef.current) return;
        console.error('Erro ao verificar pulseira:', err);
        setBraceletStatus('error');
        showToast('Não foi possível verificar a pulseira. Tente novamente.', 'error');
      }
    };

    checkBracelet();
  }, [showToast]);

  // O WebSocket é associado ao evento selecionado para não misturar leituras de eventos.
  const { isConnected } = useNFCReader(handleBraceletDetected, 'checkin', selectedEventId);

  useEffect(() => {
    setNFCConnected(isConnected);
  }, [isConnected]);

  // Carregar eventos e times ao iniciar
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // 1. Carregar eventos
        const eventosData = await loadEventos();
        setEvents(eventosData || []);
        
        // 2. Selecionar automaticamente o evento ativo
        const activeEvent = eventosData?.find(e => e.status === 'active' || e.status === 'ongoing');
        if (activeEvent) {
          setSelectedEventId(activeEvent.id);
          setEventoAtual(activeEvent.id);
        } else if (eventosData && eventosData.length > 0) {
          // Se não houver evento ativo, seleciona o primeiro
          setSelectedEventId(eventosData[0].id);
          setEventoAtual(eventosData[0].id);
        }
      } catch (error) {
        console.error('❌ Erro ao carregar eventos:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [loadEventos, setEventoAtual]);

  // Carregar times quando o evento for selecionado
  useEffect(() => {
    const loadTimesData = async () => {
      if (selectedEventId) {
        await loadTeams();
      }
    };
    loadTimesData();
  }, [selectedEventId, loadTeams]);

  const handleChange = useCallback((field: string) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!form.name.trim()) {
      showToast('Preencha o nome da criança', 'error');
      return;
    }
    if (!selectedTeam) {
      showToast('Selecione um time', 'error');
      return;
    }
    const normalizedBraceletCode = normalizeUid(braceletCode);
    if (!normalizedBraceletCode) {
      showToast('Vincule uma pulseira válida', 'error');
      return;
    }
    if (!selectedEventId) {
      showToast('Evento não selecionado', 'error');
      return;
    }

    setSaving(true);

    try {
      // 1. Verificar se a pulseira existe
      const pulseiras = await api.getPulseiras();
      const pulseira = pulseiras.find(p => normalizeUid(String(p.code || '')) === normalizedBraceletCode);
      
      if (!pulseira) {
        showToast('❌ Pulseira não encontrada. Cadastre-a primeiro na seção "Pulseiras".', 'error');
        setBraceletStatus('error');
        setSaving(false);
        return;
      }

      if (pulseira.status !== 'disponivel') {
        const statusMsg = {
          'em_uso': 'já está em uso por outra criança',
          'perdida': 'foi marcada como perdida',
          'bloqueada': 'está bloqueada'
        };
        showToast(`❌ Pulseira ${statusMsg[pulseira.status as keyof typeof statusMsg] || 'indisponível'}.`, 'error');
        setBraceletStatus('error');
        setSaving(false);
        return;
      }

      // 2. Criar a criança via API
      const newChild = {
        name: form.name,
        nickname: form.nickname || form.name.split(' ')[0],
        age: parseInt(form.age) || 5,
        avatar: '👤',
        braceletCode: normalizedBraceletCode,
        timeId: selectedTeam,
      };

      await api.createCrianca(selectedEventId, newChild);

      // 3. Recarregar dados
      await loadTeams();
      await loadChildren();

      showToast(`✅ ${form.name} cadastrado(a) com sucesso! Time: ${teams.find(t => t.id === selectedTeam)?.name || 'Desconhecido'} Pulseira vinculada.`, 'success');
      
      // Limpar formulário
      setForm({ name: '', nickname: '', age: '', guardian: '', phone: '', notes: '' });
      setSelectedTeam(null);
      setBraceletCode('');
      setBraceletStatus('idle');
      setLastReadAt(null);
      
    } catch (error: any) {
      console.error('Erro ao cadastrar:', error);
      showToast(error.message || 'Erro ao cadastrar. Tente novamente.', 'error');
    } finally {
      setSaving(false);
    }
  }, [form, selectedTeam, braceletCode, selectedEventId, showToast, loadTeams, loadChildren, teams]);

  const handleSwapBracelet = useCallback(() => {
    if (!braceletCode.trim()) {
      showToast('Leia a nova pulseira primeiro', 'error');
      return;
    }
    showToast(`Pulseira trocada para ${braceletCode}`, 'success');
    setBraceletCode('');
    setBraceletStatus('idle');
    setLastReadAt(null);
  }, [braceletCode, showToast]);

  const safeTeams = Array.isArray(teams) ? teams : [];

  if (loading) {
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
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-400">Carregando...</p>
          </div>
        </div>
      </div>
    );
  }

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
        <TopBar title="Check-in" subtitle="Cadastro, time e pulseira" />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <PageHeader
            title="Novo Cadastro"
            description="Cadastre uma criança e vincule pulseira NFC"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
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

          {/* Two-column form */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left column: form fields */}
            <Card className="space-y-4">
              <h3 className="font-display text-lg text-white mb-2">Dados da Criança</h3>
              <Input
                label="Nome completo"
                placeholder="Ex: Pedro Almeida"
                value={form.name}
                onChange={handleChange('name')}
              />
              <Input
                label="Apelido"
                placeholder="Ex: PedrinhoCorre"
                value={form.nickname}
                onChange={handleChange('nickname')}
              />
              <Input
                label="Idade"
                type="number"
                placeholder="Ex: 7"
                value={form.age}
                onChange={handleChange('age')}
              />
              <Input
                label="Nome do responsável"
                placeholder="Ex: Maria Almeida"
                value={form.guardian}
                onChange={handleChange('guardian')}
              />
              <Input
                label="Telefone"
                placeholder="Ex: (11) 99999-9999"
                value={form.phone}
                onChange={handleChange('phone')}
              />
              <Input
                label="Observações"
                placeholder="Alergias, necessidades especiais..."
                value={form.notes}
                onChange={handleChange('notes')}
              />
            </Card>

            {/* Right column: team selection */}
            <Card className="space-y-4">
              <h3 className="font-display text-lg text-white mb-2">Selecione o Time</h3>
              <div className="grid grid-cols-2 gap-3">
                {safeTeams.length > 0 ? (
                  safeTeams.map(team => {
                    const isSelected = selectedTeam === team.id;
                    return (
                      <div
                        key={team.id}
                        onClick={() => setSelectedTeam(team.id)}
                        className={`
                          relative flex flex-col items-center justify-center gap-2 py-6 px-4
                          rounded-xl border p-4 transition-all duration-200 cursor-pointer
                          bg-card ${isSelected ? 'ring-2 ring-offset-2 ring-offset-dark border-primary' : 'border-border'}
                          ${isSelected ? '' : 'hover:border-primary/70'}
                        `}
                        style={isSelected ? { borderColor: team.color, boxShadow: `0 0 20px ${team.color}40` } as React.CSSProperties : undefined}
                      >
                        <div 
                          className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                          style={{ backgroundColor: team.color + '30' }}
                        >
                          👥
                        </div>
                        <span className="font-display text-white text-base">{team.name}</span>
                        {isSelected && (
                          <div className="absolute top-2 right-2">
                            <StatusDot status="online" size="sm" />
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-2 text-center py-8">
                    <p className="text-gray-500">Nenhum time cadastrado</p>
                    <p className="text-xs text-gray-400 mt-2">Crie um time no Game Master</p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Bracelet section */}
          <Card variant="secondary" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg text-white">Vincular Pulseira NFC</h3>
              <div className="flex items-center gap-2">
                {nfcConnected ? (
                  <>
                    <StatusDot status="online" size="sm" />
                    <span className="text-xs text-success font-body">Arduino Conectado</span>
                  </>
                ) : (
                  <>
                    <StatusDot status="offline" size="sm" />
                    <span className="text-xs text-gray-400 font-body">Aguardando Arduino...</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
              <div className="flex-1 w-full">
                <Input
                  label="Código da pulseira"
                  placeholder="Aproxime a pulseira do Arduino..."
                  value={braceletCode}
                  onChange={e => {
                    braceletCheckIdRef.current += 1;
                    setBraceletCode(normalizeUid(e.target.value));
                    setBraceletStatus('idle');
                    setLastReadAt(null);
                  }}
                  icon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  }
                  disabled={!nfcConnected}
                />
              </div>
            </div>

            {/* Bracelet status indicator */}
            <div className="flex flex-wrap items-center gap-2" aria-live="polite">
              {braceletStatus === 'registered' ? (
                <>
                  <StatusDot status="warning" />
                  <span className="text-sm text-warning font-body">⚠️ Pulseira já vinculada a outra criança</span>
                </>
              ) : braceletStatus === 'linked' ? (
                <>
                  <StatusDot status="online" />
                  <span className="text-sm text-success font-body">✅ Pulseira {braceletCode} disponível para vínculo</span>
                </>
              ) : braceletStatus === 'detected' ? (
                <>
                  <StatusDot status="warning" />
                  <span className="text-sm text-warning font-body">⚠️ Pulseira {braceletCode} detectada; verifique o cadastro</span>
                </>
              ) : braceletStatus === 'error' ? (
                <>
                  <StatusDot status="offline" />
                  <span className="text-sm text-danger font-body">Não foi possível validar esta pulseira</span>
                </>
              ) : (
                <>
                  <StatusDot status={nfcConnected ? 'online' : 'offline'} />
                  <span className="text-sm text-gray-400 font-body">
                    {nfcConnected ? 'Aproxime uma pulseira para iniciar a leitura' : 'Conecte o leitor para iniciar'}
                  </span>
                </>
              )}
              {lastReadAt && (
                <span className="text-xs text-gray-500">
                  Última leitura às {lastReadAt.toLocaleTimeString('pt-BR')}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500" aria-live="polite">
              A leitura apenas preenche o formulário. O cadastro só acontece ao clicar em “Cadastrar e Vincular”.
            </p>

            {/* Connection status info */}
            <div className={`rounded-lg border p-3 ${nfcConnected ? 'border-success/30 bg-success/10' : 'border-warning/30 bg-warning/10'}`} aria-live="polite">
              <div className="flex items-start gap-2">
                <StatusDot status={nfcConnected ? 'online' : 'warning'} size="sm" />
                <div>
                  <p className={`text-sm font-semibold ${nfcConnected ? 'text-success' : 'text-warning'}`}>
                    {nfcConnected ? 'Leitor pronto para leitura' : 'Leitor aguardando conexão'}
                  </p>
                  <p className="mt-1 text-xs text-gray-300">
                    {nfcConnected
                      ? 'Aproxime a pulseira do leitor. O código será preenchido automaticamente.'
                      : 'Verifique se o checkpoint está ligado e se o servidor está rodando.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Scanning animation overlay */}
            {nfcConnected && braceletStatus === 'idle' && (
              <div className="flex items-center justify-center gap-3 rounded-lg border border-primary/20 bg-primary/5 py-4">
                <div className="h-10 w-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                <span className="text-sm text-gray-300 font-body">Aproxime a pulseira do leitor...</span>
              </div>
            )}
          </Card>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="primary" size="lg" onClick={handleSubmit} disabled={saving} className="flex-1">
              {saving ? (
                <>
                  <svg className="w-5 h-5 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Cadastrando...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Cadastrar e Vincular
                </>
              )}
            </Button>
            <Button 
              variant="secondary" 
              size="lg" 
              onClick={() => {
                braceletCheckIdRef.current += 1;
                setBraceletCode('');
                setBraceletStatus('idle');
                setLastReadAt(null);
              }} 
              className="flex-1"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Limpar Pulseira
            </Button>
          </div>

          {/* Toast notification */}
          {toast && (
            <div className="fixed bottom-6 right-6 z-50 max-w-[calc(100vw-2rem)] animate-slide-up">
              <div className={`flex items-center gap-2 rounded-lg border px-5 py-3 shadow-lg ${
                toast.type === 'error'
                  ? 'border-danger/50 bg-danger/10 shadow-danger/10'
                  : 'border-success/50 bg-success/10 shadow-success/10'
              }`} role="status" aria-live="polite">
                <StatusDot status={toast.type === 'error' ? 'offline' : 'online'} />
                <span className="text-sm text-white font-body">{toast.message}</span>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}