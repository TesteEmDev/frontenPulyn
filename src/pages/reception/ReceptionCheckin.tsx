import { useState, useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { usePulynStore } from '../../store/mockData';
import { api } from '../../services/api';
import { useNFCReader } from '../../hooks/useNFCReader';
import Sidebar from '../../components/layout/Sidebar';
import TopBar from '../../components/layout/TopBar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
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
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 20a6 6 0 00-12 0m12 0h3v-2a3 3 0 00-5.356-1.857M6 20H3v-2a3 3 0 015.356-1.857M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
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

const normalizeUid = (value: string) => value.trim().toUpperCase().replace(/[^0-9A-F]/g, '');

type BraceletStatus = 'idle' | 'checking' | 'available' | 'registered' | 'not-found' | 'error';

export default function ReceptionCheckin() {
  const location = useLocation();
  const { loadEventos, eventoAtualId, setEventoAtual } = usePulynStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [braceletCode, setBraceletCode] = useState('');
  const [braceletStatus, setBraceletStatus] = useState<BraceletStatus>('idle');
  const [lastReadAt, setLastReadAt] = useState<Date | null>(null);
  const braceletCheckIdRef = useRef(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(true);
  const [nfcConnected, setNFCConnected] = useState(false);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const clearBracelet = useCallback(() => {
    braceletCheckIdRef.current += 1;
    setBraceletCode('');
    setBraceletStatus('idle');
    setLastReadAt(null);
  }, []);

  const handleBraceletDetected = useCallback((code: string) => {
    const normalizedCode = normalizeUid(code);
    if (!normalizedCode) return;

    const checkId = ++braceletCheckIdRef.current;
    setBraceletCode(normalizedCode);
    setBraceletStatus('checking');
    setLastReadAt(new Date());

    api.getPulseiras()
      .then(pulseiras => {
        if (checkId !== braceletCheckIdRef.current) return;
        const pulseira = pulseiras.find(item => normalizeUid(String(item.code || '')) === normalizedCode);
        if (!pulseira) {
          setBraceletStatus('not-found');
          showToast('Pulseira não encontrada no cadastro.', 'error');
          return;
        }
        if (pulseira.status === 'disponivel') {
          setBraceletStatus('available');
          showToast(`Pulseira ${normalizedCode} disponível para cadastro.`, 'success');
          return;
        }
        setBraceletStatus('registered');
        showToast(`Pulseira já vinculada para ${pulseira.crianca_name || 'uma criança'}.`, 'success');
      })
      .catch(error => {
        if (checkId !== braceletCheckIdRef.current) return;
        console.error('Erro ao verificar pulseira:', error);
        setBraceletStatus('error');
        showToast('Não foi possível verificar a pulseira. Tente novamente.', 'error');
      });
  }, [showToast]);

  const { isConnected } = useNFCReader(handleBraceletDetected, 'checkin', selectedEventId);

  useEffect(() => {
    setNFCConnected(isConnected);
  }, [isConnected]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [eventosData, controlData] = await Promise.all([
          loadEventos(),
          api.getActiveEventControl().catch(() => ({ event: null })),
        ]);
        const availableEvents = eventosData || [];
        setEvents(availableEvents);
        const controlledEvent = controlData?.event
          ? availableEvents.find(event => String(event.id) === String(controlData.event.id))
          : null;
        const isOpenEvent = (event: any) => ![
          'completed',
          'cancelled',
          'canceled',
          'finished',
        ].includes(String(event.status || '').toLowerCase());
        const activeEvent = availableEvents.find(event => ['active', 'ongoing'].includes(String(event.status || '').toLowerCase()));
        const storedEvent = eventoAtualId
          ? availableEvents.find(event => String(event.id) === String(eventoAtualId) && isOpenEvent(event))
          : null;
        const openEvents = availableEvents.filter(isOpenEvent);
        const eventToSelect = controlledEvent || activeEvent || storedEvent || (openEvents.length === 1 ? openEvents[0] : null);

        setSelectedEventId(currentId => currentId && availableEvents.some(event => String(event.id) === String(currentId))
          ? currentId
          : eventToSelect?.id || null);
        if (eventToSelect) {
          setEventoAtual(eventToSelect.id);
          if (!controlledEvent) await api.setActiveEventControl(eventToSelect.id).catch(() => {});
        }
      } catch (error) {
        console.error('Erro ao carregar eventos:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [eventoAtualId, loadEventos, setEventoAtual]);

  if (loading) {
    return (
      <div className="flex h-screen bg-dark">
        <Sidebar
          items={navItems}
          activePath={location.pathname}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(previous => !previous)}
          title="Recepcao"
          accentColor="#F59E0B"
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-gray-400">Carregando eventos...</p>
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
        onToggleCollapse={() => setSidebarCollapsed(previous => !previous)}
        title="Recepcao"
        accentColor="#F59E0B"
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Check-in" subtitle="Conferência de pulseiras NFC" />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <PageHeader
            title="Check-in de pulseiras"
            description="Confira se a pulseira já está vinculada a uma criança"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
              </svg>
            }
          />

          <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label htmlFor="checkin-event" className="text-sm font-semibold text-gray-300 whitespace-nowrap">Evento controlado pela recepção:</label>
              <select
                id="checkin-event"
                value={selectedEventId || ''}
                onChange={event => {
                  const eventId = event.target.value || null;
                  setSelectedEventId(eventId);
                  setEventoAtual(eventId);
                  clearBracelet();
                  api.setActiveEventControl(eventId).catch(error => {
                    console.error('Não foi possível sincronizar o evento:', error);
                    showToast('Não foi possível sincronizar o evento com os outros terminais.', 'error');
                  });
                }}
                className="flex-1 rounded-lg border border-dark-border bg-dark-surface px-4 py-2 text-white focus:border-primary focus:outline-none"
              >
                <option value="">Selecione um evento</option>
                {events.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.name} - {new Date(event.date).toLocaleDateString('pt-BR')}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              A seleção feita aqui é compartilhada com o Kiosk de cadastro, o totem de pontuação e os telões.
            </p>
          </Card>

          <Card variant="secondary" className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-dark-surface to-secondary/10">
            <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative flex flex-col items-center py-6 text-center sm:py-10">
              <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-full border-4 border-primary/30 bg-primary/10 text-5xl shadow-[0_0_40px_rgba(139,92,246,0.2)]">
                {braceletStatus === 'available' ? '✅' : braceletStatus === 'registered' ? '🔗' : braceletStatus === 'not-found' ? '❔' : '📡'}
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">Conferência NFC</p>
              <h2 className="mt-2 font-display text-3xl text-white sm:text-4xl">
                {braceletStatus === 'checking' ? 'Verificando pulseira...' : 'Aproxime uma pulseira'}
              </h2>
              <p className="mt-3 max-w-xl text-sm text-gray-400">
                {braceletStatus === 'available'
                  ? 'Esta pulseira está disponível. Para cadastrar a criança e criar o personagem, use o terminal Kiosk.'
                  : braceletStatus === 'registered'
                    ? 'Esta pulseira já está vinculada a uma criança. Confira os dados abaixo ou consulte a tela de participantes.'
                    : braceletStatus === 'not-found'
                      ? 'Esta pulseira ainda não está cadastrada no estoque. Cadastre-a na área de Pulseiras antes de usar o Kiosk.'
                      : braceletStatus === 'error'
                        ? 'Não foi possível concluir a conferência. Aproxime a pulseira novamente.'
                        : 'Aproxime a pulseira do leitor para conferir se ela está disponível ou vinculada.'}
              </p>

              <div className={`mt-6 w-full max-w-xl rounded-2xl border p-4 text-left ${
                braceletStatus === 'available'
                  ? 'border-success/30 bg-success/10'
                  : braceletStatus === 'registered'
                    ? 'border-warning/30 bg-warning/10'
                    : braceletStatus === 'not-found' || braceletStatus === 'error'
                      ? 'border-danger/30 bg-danger/10'
                      : 'border-white/10 bg-black/10'
              }`} aria-live="polite">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <StatusDot status={
                      braceletStatus === 'available' ? 'online' :
                        braceletStatus === 'registered' ? 'warning' :
                          braceletStatus === 'not-found' || braceletStatus === 'error' ? 'offline' :
                            nfcConnected ? 'online' : 'offline'
                    } />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">
                        {braceletCode ? `Pulseira ${braceletCode}` : 'Nenhuma pulseira lida'}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {braceletStatus === 'available' ? 'Disponível para ser vinculada no Kiosk.' :
                          braceletStatus === 'registered' ? 'Já vinculada ou indisponível.' :
                            braceletStatus === 'not-found' ? 'Não encontrada no cadastro.' :
                              braceletStatus === 'error' ? 'Conferência não concluída.' :
                                nfcConnected ? 'Leitor conectado e aguardando leitura.' : 'Leitor aguardando conexão.'}
                      </p>
                    </div>
                  </div>
                  {lastReadAt && <span className="shrink-0 text-xs text-gray-500">{lastReadAt.toLocaleTimeString('pt-BR')}</span>}
                </div>
              </div>

              <div className="mt-6 flex items-center gap-2 text-xs text-gray-500">
                <StatusDot status={nfcConnected ? 'online' : 'offline'} size="sm" />
                {nfcConnected ? 'Leitor NFC conectado' : 'Leitor NFC aguardando conexão'}
              </div>
            </div>
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={clearBracelet}
              disabled={!braceletCode && braceletStatus === 'idle'}
              className="flex-1 rounded-xl border border-white/10 bg-dark-surface px-5 py-3 text-sm font-semibold text-gray-200 transition hover:border-primary/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Limpar leitura
            </button>
          </div>

          <p className="text-center text-xs text-gray-500">
            O cadastro de nome, avatar, idade, responsável e time é feito exclusivamente no terminal Kiosk.
          </p>

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
