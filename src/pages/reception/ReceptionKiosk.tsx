import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNFCReader } from '../../hooks/useNFCReader';
import { api } from '../../services/api';
import Avatar from '../../components/ui/Avatar';
import AvatarSelector from '../../components/ui/AvatarSelector';
import { ADVENTURER_AVATARS, DEFAULT_AVATAR_ID } from '../../avatar/adventurerAvatars';
import Button from '../../components/ui/Button';
import StatusDot from '../../components/ui/StatusDot';

const AVATAR_OPTIONS = ADVENTURER_AVATARS.map(option => ({
  emoji: option.id,
  name: option.label.replace('Avatar ', ''),
  color: 'bg-primary/20',
}));

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

const normalizeUid = (value: string) =>
  value.trim().toUpperCase().replace(/[^0-9A-F]/g, '');

const KIOSK_EVENT_STORAGE_KEY = 'pulyn:kiosk-event-id';

const isOpenEvent = (event: any) => ![
  'completed',
  'cancelled',
  'canceled',
  'finished',
].includes(String(event?.status || '').toLowerCase());

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message);
      return parsed.error || error.message;
    } catch {
      return error.message;
    }
  }
  return 'Não foi possível concluir o cadastro.';
};

function BraceletReaderIllustration({ active = false, animated = true }: { active?: boolean; animated?: boolean }) {
  return (
    <div className="relative flex h-64 w-64 items-center justify-center sm:h-72 sm:w-72 lg:h-80 lg:w-80" aria-hidden="true">
      <div className={`absolute inset-2 rounded-full border border-cyan-300/20 ${animated ? (active ? 'animate-ping' : 'animate-pulse') : ''}`} />
      <div className="absolute inset-8 rounded-full border-2 border-cyan-300/30 shadow-[0_0_55px_rgba(34,211,238,0.25)]" />
      <div className="absolute inset-14 rounded-full bg-cyan-300/10 blur-xl" />
      <div className="relative flex h-36 w-52 -rotate-6 items-center justify-center rounded-[2rem] border-4 border-cyan-200/80 bg-gradient-to-br from-cyan-300 via-blue-500 to-violet-600 shadow-[0_12px_35px_rgba(14,165,233,0.45)] lg:h-40 lg:w-60">
        <div className="flex h-20 w-32 items-center justify-center rounded-2xl border-2 border-white/50 bg-slate-950/35 lg:h-24 lg:w-36">
          <div className="flex items-center gap-1 text-2xl text-white">
            <span className="text-cyan-200">◔</span><span className="text-cyan-100">◕</span><span className="text-cyan-200">◔</span>
          </div>
        </div>
        <span className="absolute -bottom-7 rounded-full border border-cyan-200/30 bg-slate-950/80 px-3 py-1 text-[10px] font-black tracking-[0.3em] text-cyan-100">NFC</span>
      </div>
    </div>
  );
}

type KioskState = 'waiting' | 'reading' | 'ready' | 'saving' | 'success' | 'error';

export default function ReceptionKiosk() {
  const { logout } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [setupOpen, setSetupOpen] = useState(false);
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [nfcConnected, setNfcConnected] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [state, setState] = useState<KioskState>('waiting');
  const [message, setMessage] = useState('Encoste a pulseira no leitor abaixo da tela para começar');
  const [braceletCode, setBraceletCode] = useState('');
  const [form, setForm] = useState({ name: '', nickname: '', age: '', avatar: DEFAULT_AVATAR_ID });
  const [successData, setSuccessData] = useState<{ name: string; avatar: string; teamName: string } | null>(null);
  const lastReadRef = useRef<{ code: string; at: number } | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const kioskStateRef = useRef<KioskState>('waiting');

  const selectedAvatar = AVATAR_OPTIONS.find(option => option.emoji === form.avatar) || AVATAR_OPTIONS[0];
  const selectedEvent = events.find(event => String(event.id) === String(selectedEventId));
  const selectedTeamData = teams.find(team => String(team.id) === String(selectedTeam));

  useEffect(() => {
    kioskStateRef.current = state;
  }, [state]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      setMessage('Não foi possível ativar a tela cheia neste navegador.');
    }
  }, []);

  useEffect(() => {
    const syncFullscreenState = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', syncFullscreenState);
    syncFullscreenState();
    return () => document.removeEventListener('fullscreenchange', syncFullscreenState);
  }, []);

  useEffect(() => {
    const updateOnlineState = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineState);
    window.addEventListener('offline', updateOnlineState);
    updateOnlineState();
    return () => {
      window.removeEventListener('online', updateOnlineState);
      window.removeEventListener('offline', updateOnlineState);
    };
  }, []);

  const resetKiosk = useCallback(() => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    lastReadRef.current = null;
    kioskStateRef.current = 'waiting';
    setBraceletCode('');
    setForm({ name: '', nickname: '', age: '', avatar: DEFAULT_AVATAR_ID });
    setSelectedTeam('');
    setSuccessData(null);
    setState('waiting');
    setMessage('Encoste a pulseira no leitor abaixo da tela para começar');
  }, []);

  useEffect(() => {
    if (state !== 'error') return;
    const errorTimer = setTimeout(resetKiosk, 6000);
    return () => clearTimeout(errorTimer);
  }, [resetKiosk, state]);

  const handleBraceletDetected = useCallback((code: string) => {
    const normalizedCode = normalizeUid(code);
    const currentState = kioskStateRef.current;
    if (!normalizedCode || currentState === 'reading' || currentState === 'saving' || currentState === 'success') return;

    const now = Date.now();
    const previousRead = lastReadRef.current;
    if (previousRead?.code === normalizedCode && now - previousRead.at < 2500) return;
    lastReadRef.current = { code: normalizedCode, at: now };
    kioskStateRef.current = 'reading';

    setBraceletCode(normalizedCode);
    setState('reading');
    setMessage('Pulseira reconhecida! A criança ou o responsável pode criar o personagem.');

    api.getKioskBracelet(normalizedCode)
      .then(pulseira => {
        if (lastReadRef.current?.code !== normalizedCode) return;
        if (!pulseira.available) {
          kioskStateRef.current = 'error';
          setState('error');
          setMessage(`Esta pulseira já está ${pulseira.status === 'em_uso' ? 'vinculada a outra criança' : 'indisponível'}.`);
          return;
        }
        kioskStateRef.current = 'ready';
        setState('ready');
      })
      .catch(() => {
        if (lastReadRef.current?.code !== normalizedCode) return;
        kioskStateRef.current = 'error';
        setState('error');
        setMessage('Não foi possível verificar a pulseira. Tente novamente.');
      });
  }, []);

  const registrationVisible = Boolean(braceletCode && (state === 'ready' || state === 'saving'));

  const { isConnected } = useNFCReader(
    handleBraceletDetected,
    'checkin',
    selectedEventId || null,
    'reception',
    !registrationVisible && state !== 'saving' && state !== 'success',
  );

  useEffect(() => {
    setNfcConnected(isConnected);
  }, [isConnected]);

  useEffect(() => {
    let active = true;
    const loadEvents = async () => {
      try {
        const data = await api.getKioskEvents();
        if (!active) return;
        const openEvents = (Array.isArray(data) ? data : []).filter(isOpenEvent);
        setEvents(openEvents);
        const receptionEvents = openEvents.filter(event => event.has_reception_checkpoint);
        const rememberedEventId = localStorage.getItem(KIOSK_EVENT_STORAGE_KEY);
        const rememberedEvent = receptionEvents.find(event => String(event.id) === String(rememberedEventId));
        const activeReceptionEvents = receptionEvents.filter(event => ['active', 'ongoing'].includes(String(event.status || '').toLowerCase()));
        const activeEvents = openEvents.filter(event => ['active', 'ongoing'].includes(String(event.status || '').toLowerCase()));
        // Mantém o evento escolhido no tablet quando ele ainda está aberto e possui recepção.
        if (rememberedEvent) {
          setSelectedEventId(String(rememberedEvent.id));
        } else if (activeReceptionEvents.length === 1) {
          setSelectedEventId(String(activeReceptionEvents[0].id));
        } else if (receptionEvents.length === 1) {
          setSelectedEventId(String(receptionEvents[0].id));
        } else if (activeEvents.length === 1) {
          setSelectedEventId(String(activeEvents[0].id));
        }
      } catch {
        if (active) setMessage('Não foi possível carregar os eventos.');
      } finally {
        if (active) setLoading(false);
      }
    };
    loadEvents();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (selectedEventId) localStorage.setItem(KIOSK_EVENT_STORAGE_KEY, selectedEventId);
  }, [selectedEventId]);

  useEffect(() => {
    let active = true;
    if (!selectedEventId) {
      setTeams([]);
      setSelectedTeam('');
      return;
    }

    setLoadingTeams(true);
    kioskStateRef.current = 'waiting';
    setState('waiting');
    setMessage('Aproxime a pulseira no leitor para começar.');
    api.getKioskTeams(selectedEventId)
      .then(data => {
        if (!active) return;
        setTeams(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (active) setMessage('Não foi possível carregar os times deste evento.');
      })
      .finally(() => {
        if (active) setLoadingTeams(false);
      });

    return () => { active = false; };
  }, [selectedEventId]);

  const handleSubmit = useCallback(async () => {
    if (!selectedEventId) return setMessage('Selecione um evento antes de começar.');
    if (!selectedTeam) return setMessage('Escolha um time para continuar.');
    if (!braceletCode) return setMessage('Aproxime uma pulseira primeiro.');
    if (!form.name.trim()) return setMessage('Digite o nome da criança.');
    if (state === 'saving') return;

    kioskStateRef.current = 'saving';
    setState('saving');
    setMessage('Criando personagem...');
    try {
      await api.createKioskParticipant(selectedEventId, {
        name: form.name.trim(),
        nickname: form.nickname.trim() || form.name.trim().split(' ')[0],
        age: parseInt(form.age, 10) || 5,
        avatar: form.avatar,
        braceletCode,
        timeId: selectedTeam,
      });

      setSuccessData({
        name: form.nickname.trim() || form.name.trim(),
        avatar: form.avatar,
        teamName: selectedTeamData?.name || 'Seu time',
      });
      kioskStateRef.current = 'success';
      setState('success');
      setMessage('Personagem criado com sucesso!');
      successTimerRef.current = setTimeout(resetKiosk, 5000);
    } catch (error) {
      kioskStateRef.current = 'error';
      setState('error');
      setMessage(getErrorMessage(error));
    }
  }, [braceletCode, form, resetKiosk, selectedEventId, selectedTeam, selectedTeamData?.name, state]);

  useEffect(() => () => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
  }, []);

  const canInteract = Boolean(selectedEventId && state === 'ready');

  const handleAvatarChange = useCallback((avatar: string) => {
    setForm(previous => ({ ...previous, avatar }));
  }, []);

  const handleVirtualKey = useCallback((key: string) => {
    if (!canInteract || state === 'saving') return;

    setForm(previous => {
      if (key === '⌫') return { ...previous, name: previous.name.slice(0, -1) };
      if (key === 'ESPAÇO') {
        return previous.name.length < 18 ? { ...previous, name: `${previous.name} ` } : previous;
      }
      if (previous.name.length >= 18) return previous;
      return { ...previous, name: `${previous.name}${key}` };
    });
  }, [canInteract, state]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dark text-white">
        <div className="text-center"><div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary/30 border-t-primary" /><p>Preparando o visor...</p></div>
      </div>
    );
  }

  return (
    <main className="kiosk-performance min-h-screen overflow-y-auto bg-[radial-gradient(circle_at_top,#312e81_0%,#111827_45%,#030712_100%)] px-3 py-3 text-white sm:px-5 sm:py-4 lg:px-4 lg:py-3 xl:overflow-hidden">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-6xl flex-col">
        <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/20 text-2xl shadow-lg shadow-primary/20">⚡</div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-300">Pulyn</p>
                <h1 className="font-display text-2xl font-bold sm:text-3xl">Monte seu personagem</h1>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs text-gray-300" title={!isOnline ? 'Sem conexão com a internet' : nfcConnected ? 'Leitor NFC conectado' : 'Aguardando conexão do leitor NFC'}>
              <StatusDot status={!isOnline ? 'offline' : nfcConnected ? 'online' : 'warning'} size="sm" />
              <span className="hidden sm:inline">
                {!isOnline ? 'Sem internet' : nfcConnected ? 'Leitor conectado' : 'Leitor aguardando'}
              </span>
            </div>
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-pressed={isFullscreen}
              aria-label={isFullscreen ? 'Sair da tela cheia' : 'Ativar tela cheia'}
              title={isFullscreen ? 'Sair da tela cheia' : 'Ativar tela cheia'}
              className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-sm text-gray-300 transition hover:border-primary/60 hover:text-white sm:px-4 sm:text-xs"
            >
              <span aria-hidden="true">⛶</span>
              <span className="ml-1 hidden sm:inline">{isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}</span>
            </button>
          </div>
        </header>

        {selectedEventId && !setupOpen ? (
          <section className="mb-3 flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-3 py-2 backdrop-blur">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="h-2 w-2 rounded-full bg-success shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
              <span>
                Evento conectado: <strong className="text-white">{selectedEvent?.name}</strong>
                {!selectedEvent?.has_reception_checkpoint && (
                  <strong className="ml-2 text-warning">(sem checkpoint de recepção)</strong>
                )}
              </span>
            </div>
            <button type="button" onClick={() => setSetupOpen(true)} className="rounded-lg px-3 py-1 text-xs text-gray-500 transition hover:bg-white/10 hover:text-white">
              ⚙ Configurar visor
            </button>
          </section>
        ) : (
          <section className="mb-3 grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-3 backdrop-blur sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500">Configuração inicial do visor</p>
              <select
                value={selectedEventId}
                onChange={event => {
                  setSelectedEventId(event.target.value);
                  setSetupOpen(false);
                  resetKiosk();
                }}
                className="mt-1 w-full max-w-xl rounded-xl border border-white/10 bg-gray-900/80 px-4 py-3 text-base text-white outline-none transition focus:border-primary"
              >
                <option value="">Selecione um evento aberto</option>
                {events.map(event => <option key={event.id} value={event.id}>{event.name}</option>)}
              </select>
            </div>
            <div className="text-left text-xs text-gray-500 sm:text-right">
              <p className="text-gray-300">Depois, deixe o visor em tela cheia</p>
              {events.length > 0 && !events.some(event => event.has_reception_checkpoint) && (
                <p className="mt-1 text-warning">Nenhum evento possui checkpoint de recepção configurado.</p>
              )}
              <button type="button" onClick={logout} className="mt-1 text-gray-500 underline hover:text-white">Sair da conta</button>
            </div>
          </section>
        )}

        {!selectedEventId ? (
          <section className="flex flex-1 items-center justify-center rounded-3xl border border-dashed border-primary/40 bg-black/20 p-8 text-center">
            <div className="max-w-md">
              <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-primary/15 text-5xl shadow-[0_0_50px_rgba(139,92,246,0.25)]">🎮</div>
              <h2 className="font-display text-3xl font-bold">Pronto para começar</h2>
              <p className="mt-3 text-gray-400">A recepção já entregou sua pulseira? Aproxime-a do leitor para criar seu personagem.</p>
            </div>
          </section>
        ) : (
          <section className="relative flex-1 min-h-0">
            <div className={`transition-all duration-500 ease-out motion-reduce:transition-none ${registrationVisible ? 'pointer-events-none absolute inset-0 z-0 -translate-x-16 scale-95 opacity-0 blur-[2px]' : 'relative z-10 translate-x-0 scale-100 opacity-100'}`}>
              <div className="relative flex min-h-[500px] flex-col overflow-hidden rounded-3xl border border-primary/30 bg-black/20 p-4 shadow-2xl shadow-primary/10 backdrop-blur sm:p-5 lg:min-h-0">
                <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
                <div className="relative flex flex-1 flex-col items-center justify-center text-center">
                {state === 'success' && successData ? (
                  <div className="animate-in zoom-in flex flex-col items-center">
                    <div className="mb-5 rounded-full border-4 border-success/60 bg-success/10 p-5 shadow-[0_0_50px_rgba(34,197,94,0.3)]">
                      <Avatar emoji={successData.avatar} size="lg" bgColor="bg-success/20" />
                    </div>
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-success">Personagem criado</p>
                    <h2 className="mt-2 font-display text-5xl font-bold text-white">{successData.name}</h2>
                    <p className="mt-3 text-lg text-gray-300">Time {successData.teamName}</p>
                    <p className="mt-8 rounded-full border border-success/30 bg-success/10 px-5 py-2 text-sm text-success">Aproxime outra pulseira para continuar</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-5 rounded-full border-4 border-cyan-300/30 bg-cyan-300/5 p-2 shadow-[0_0_50px_rgba(34,211,238,0.18)]">
                      <BraceletReaderIllustration active={state === 'reading'} animated={!registrationVisible} />
                    </div>
                    <p className={`text-sm font-semibold uppercase tracking-[0.25em] ${state === 'error' ? 'text-danger' : state === 'ready' ? 'text-success' : 'text-cyan-200'}`}>
                      {state === 'ready'
                        ? 'Pulseira reconhecida'
                        : state === 'reading'
                          ? 'Verificando pulseira'
                          : state === 'error'
                            ? 'Pulseira indisponível'
                            : 'Aguardando pulseira'}
                    </p>
                    <h2 className="mt-3 max-w-xl font-display text-3xl font-bold sm:text-4xl lg:text-5xl">
                      {state === 'ready'
                        ? 'Pulseira reconhecida!'
                        : state === 'reading'
                          ? 'Só um instante...'
                          : state === 'error'
                            ? 'Aproxime outra pulseira'
                            : 'Aproxime sua pulseira'}
                    </h2>
                    <p className={`mt-4 max-w-lg text-base sm:text-lg ${state === 'error' ? 'text-danger' : 'text-gray-400'}`}>{message}</p>
                    {state === 'error' && (
                      <button
                        type="button"
                        onClick={resetKiosk}
                        className="mt-6 rounded-xl border border-danger/40 bg-danger/10 px-5 py-3 text-sm font-semibold text-danger transition hover:bg-danger/20"
                      >
                        Tentar outra pulseira
                      </button>
                    )}
                  </>
                )}
              </div>
              <div className="relative mt-6 flex items-center justify-center gap-2 text-xs text-gray-500">
                <span className={`h-2 w-2 rounded-full ${nfcConnected ? 'bg-success animate-pulse' : 'bg-warning'}`} />
                {nfcConnected ? 'Aproxime a pulseira no leitor' : 'Verifique a conexão do leitor'}
              </div>
            </div>
            </div>

            {registrationVisible && <div className="animate-kiosk-register motion-reduce:animate-none relative z-10 grid min-h-[calc(100vh-13rem)] gap-3 rounded-[2rem] border border-fuchsia-300/20 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.22),transparent_42%),linear-gradient(135deg,#11152d,#241047_58%,#120b2d)] p-3 shadow-2xl shadow-purple-950/40 sm:p-5 lg:p-3 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:grid-cols-[minmax(260px,0.72fr)_minmax(420px,1.28fr)] xl:grid-cols-[minmax(190px,0.55fr)_minmax(360px,1.45fr)]">
              <section className="flex flex-col rounded-3xl border border-cyan-300/20 bg-[#0b1228]/75 p-4 shadow-xl backdrop-blur sm:p-5 lg:p-3">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">Novo jogador</p>
                    <h3 className="font-display text-2xl font-bold text-white">Escolha seu personagem</h3>
                  </div>
                </div>

                <AvatarSelector
                  value={form.avatar}
                  onChange={handleAvatarChange}
                  disabled={!canInteract}
                  compact
                />
              </section>

              <section className="flex flex-col rounded-[2rem] border border-fuchsia-300/30 bg-[#21103f]/90 p-4 shadow-xl shadow-purple-950/30 backdrop-blur sm:p-5 lg:p-3">
                <div className="mb-4 flex items-center gap-3 rounded-3xl border border-fuchsia-300/20 bg-black/20 p-3">
                  <div className="rounded-full border-4 border-fuchsia-300/50 bg-fuchsia-300/10 p-2 shadow-[0_0_35px_rgba(217,70,239,0.3)]">
                    <Avatar emoji={selectedAvatar.emoji} size="lg" bgColor={selectedAvatar.color} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-fuchsia-300">Seu personagem</p>
                    <h3 className="font-display text-2xl font-bold text-white">Como você se chama?</h3>
                  </div>
                  <span className="text-2xl">✍️</span>
                </div>

                <div className="mb-4 flex min-h-[58px] items-center justify-center rounded-2xl border-2 border-fuchsia-300/60 bg-black/30 px-4 text-center font-display text-xl uppercase tracking-wider text-white shadow-inner">
                  {form.name || <span className="text-sm font-normal tracking-normal text-gray-500">Toque nas letras para digitar</span>}
                </div>

                <div className="space-y-2">
                  {KEYBOARD_ROWS.map((row, rowIndex) => (
                    <div key={`keyboard-row-${rowIndex}`} className="flex justify-center gap-1.5">
                      {row.map(key => (
                        <button
                          key={key}
                          type="button"
                          disabled={!canInteract}
                          onClick={() => handleVirtualKey(key)}
                          className="h-10 min-w-[28px] flex-1 rounded-xl border border-purple-300/30 bg-purple-500/20 px-1 text-sm font-bold text-white shadow-[0_3px_0_rgba(91,33,182,0.65)] transition active:translate-y-0.5 active:shadow-none hover:bg-fuchsia-400/30 disabled:cursor-not-allowed disabled:opacity-40 sm:h-11 sm:text-base"
                        >
                          {key}
                        </button>
                      ))}
                    </div>
                  ))}
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      disabled={!canInteract}
                      onClick={() => handleVirtualKey('⌫')}
                      className="h-10 flex-[0.8] rounded-xl border border-rose-300/30 bg-rose-500/20 text-lg text-white shadow-[0_3px_0_rgba(159,18,57,0.65)] transition active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-40 sm:h-11"
                      aria-label="Apagar última letra"
                    >
                      ⌫
                    </button>
                    <button
                      type="button"
                      disabled={!canInteract}
                      onClick={() => handleVirtualKey('ESPAÇO')}
                      className="h-10 flex-[2] rounded-xl border border-purple-300/30 bg-purple-500/20 text-xs font-bold text-white shadow-[0_3px_0_rgba(91,33,182,0.65)] transition active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-40 sm:h-11"
                    >
                      ESPAÇO
                    </button>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-white/10 bg-gray-900/70 p-5 shadow-xl lg:col-span-2">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-500">Equipe</p>
                    <h3 className="font-display text-2xl font-bold">Escolha seu time</h3>
                  </div>
                  {loadingTeams && <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {teams.map(team => {
                    const selected = selectedTeam === team.id;
                    return (
                      <button
                        key={team.id}
                        type="button"
                        disabled={!canInteract}
                        onClick={() => setSelectedTeam(team.id)}
                        className={`rounded-2xl border px-3 py-3 text-left transition ${selected ? 'ring-2 ring-white/50' : 'border-white/10 hover:border-white/30'} disabled:cursor-not-allowed disabled:opacity-50`}
                        style={{ borderColor: selected ? team.color : undefined, backgroundColor: selected ? `${team.color}22` : undefined }}
                      >
                        <span className="block h-3 w-3 rounded-full" style={{ backgroundColor: team.color || '#8b5cf6' }} />
                        <span className="mt-2 block truncate text-sm font-semibold text-white">{team.name}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <Button variant="primary" size="lg" onClick={handleSubmit} disabled={!canInteract || !form.name.trim() || state === 'saving'} className="min-h-[58px] w-full rounded-2xl text-base lg:col-span-2">
                {state === 'saving' ? 'Salvando cadastro...' : '✨ Finalizar cadastro'}
              </Button>
              <button type="button" onClick={resetKiosk} className="text-sm text-gray-500 transition hover:text-white lg:col-span-2">Não é você? Limpar e aguardar outra pulseira</button>
            </div>}
          </section>
        )}
        <footer className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
          <span>{selectedEvent?.name || 'Nenhum evento selecionado'}</span>
          <span>Autoatendimento conectado ao checkpoint de recepção</span>
        </footer>
      </div>
    </main>
  );
}
