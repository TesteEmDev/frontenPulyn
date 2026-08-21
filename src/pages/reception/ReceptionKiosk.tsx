import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { usePulynStore } from '../../store/mockData';
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
  const selectedEventId = usePulynStore(state => state.eventoAtualId || '');
  const [events, setEvents] = useState<any[]>([]);
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
    <main className="kiosk-performance relative min-h-screen overflow-y-auto bg-[#080f1e] px-3 py-3 text-white sm:px-5 sm:py-4 lg:px-4 lg:py-3 xl:overflow-hidden">
      <div className="pointer-events-none absolute -left-40 top-16 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-fuchsia-500/10 blur-3xl" />
      <div className="relative mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-6xl flex-col">
        <header className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-dark-card/60 px-3 py-2.5 shadow-[0_12px_35px_rgba(2,10,24,0.18)] backdrop-blur-xl sm:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary-300/20 bg-primary-500/10 text-2xl shadow-[0_0_28px_rgba(30,155,215,0.18)]">⚡</div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary-300">Pulyn Kiosk</p>
                <span className="hidden rounded-full border border-success-400/20 bg-success-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-success-300 sm:inline-flex">Cadastro rápido</span>
              </div>
              <h1 className="truncate font-display text-xl font-bold text-white sm:text-2xl">Monte seu personagem</h1>
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
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm font-semibold text-gray-300 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary-300/40 hover:bg-primary-500/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/60 sm:px-4 sm:text-xs"
            >
              <span aria-hidden="true">⛶</span>
              <span className="ml-1 hidden sm:inline">{isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}</span>
            </button>
          </div>
        </header>

        <section className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/[0.08] bg-dark-card/55 px-3 py-2.5 shadow-[0_8px_24px_rgba(2,10,24,0.12)] backdrop-blur-xl sm:px-4">
          <div className="flex min-w-0 items-center gap-2.5 text-xs text-gray-400">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ring-4 ${selectedEventId ? 'bg-success ring-success/10 shadow-[0_0_12px_rgba(76,175,80,0.7)]' : 'bg-warning ring-warning/10'}`} />
            <span className="truncate">
              {selectedEventId ? <>Evento da recepção: <strong className="font-semibold text-white">{selectedEvent?.name || 'carregando...'}</strong></> : 'Aguardando a recepção selecionar um evento'}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2.5 text-[11px] text-gray-500 sm:gap-3">
            <span className="hidden rounded-full border border-primary-400/15 bg-primary-500/10 px-2.5 py-1 text-primary-300 sm:inline-flex">Cadastro de crianças</span>
            <button type="button" onClick={logout} className="rounded-lg px-2 py-1 underline decoration-white/20 underline-offset-2 transition hover:bg-white/5 hover:text-white">Sair</button>
          </div>
        </section>

        {!selectedEventId ? (
          <section className="relative flex flex-1 items-center justify-center overflow-hidden rounded-3xl border border-primary-300/15 bg-dark-card/55 p-6 text-center shadow-[0_20px_60px_rgba(2,10,24,0.25)] backdrop-blur-xl sm:p-10">
            <div className="pointer-events-none absolute left-1/2 top-0 h-48 w-96 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative max-w-md">
              <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-[2rem] border border-primary-300/20 bg-primary-500/10 text-5xl shadow-[0_0_55px_rgba(30,155,215,0.2)]">🎮</div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary-300">Tudo pronto</p>
              <h2 className="mt-2 font-display text-3xl font-bold text-white sm:text-4xl">Prepare seu personagem</h2>
              <p className="mt-3 leading-6 text-gray-400">A recepção ainda não selecionou um evento. Assim que a configuração terminar, aproxime a pulseira para começar.</p>
              <div className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full border border-warning-400/20 bg-warning-500/10 px-3 py-2 text-xs font-semibold text-warning-300">
                <span className="h-2 w-2 animate-pulse rounded-full bg-warning-400" /> Aguardando a recepção
              </div>
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

            {registrationVisible && <div className="animate-kiosk-register motion-reduce:animate-none relative z-10 grid min-h-[calc(100vh-13rem)] gap-3 overflow-hidden rounded-[2rem] border border-fuchsia-300/15 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.18),transparent_42%),linear-gradient(135deg,#0d1428,#20103d_58%,#100b27)] p-3 shadow-[0_24px_80px_rgba(19,8,51,0.45)] sm:p-5 lg:min-h-0 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:grid-cols-[minmax(260px,0.72fr)_minmax(420px,1.28fr)] lg:p-3 xl:grid-cols-[minmax(190px,0.55fr)_minmax(360px,1.45fr)]">
              <section className="flex flex-col rounded-3xl border border-cyan-300/15 bg-[#091226]/80 p-4 shadow-[0_16px_40px_rgba(2,10,24,0.28)] backdrop-blur-xl sm:p-5 lg:p-3">
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

              <section className="flex flex-col rounded-[2rem] border border-fuchsia-300/20 bg-[#1b1037]/90 p-4 shadow-[0_16px_45px_rgba(55,12,92,0.28)] backdrop-blur-xl sm:p-5 lg:p-3">
                <div className="mb-4 flex items-center gap-3 rounded-3xl border border-fuchsia-300/20 bg-black/20 p-3">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-fuchsia-300/50 bg-fuchsia-300/10 p-1.5 shadow-[0_0_35px_rgba(217,70,239,0.3)]">
                    <Avatar emoji={selectedAvatar.emoji} size="md" bgColor={selectedAvatar.color} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-fuchsia-300">Seu personagem</p>
                    <h3 className="font-display text-xl font-bold leading-tight text-white sm:text-2xl">Como você se chama?</h3>
                  </div>
                  <span className="shrink-0 text-xl sm:text-2xl">✍️</span>
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

              <section className="rounded-3xl border border-white/[0.08] bg-dark-card/75 p-4 shadow-[0_16px_40px_rgba(2,10,24,0.24)] backdrop-blur-xl sm:p-5 lg:col-span-2">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-500">Último passo</p>
                    <h3 className="mt-1 font-display text-xl font-bold text-white sm:text-2xl">Escolha seu time</h3>
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
                        className={`rounded-2xl border px-3 py-3.5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/[0.04] ${selected ? 'ring-2 ring-white/60 shadow-lg' : 'border-white/10 hover:border-white/30'} disabled:cursor-not-allowed disabled:opacity-50`}
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
        <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] px-1 pt-3 text-[10px] text-gray-600 sm:text-xs">
          <span className="truncate">{selectedEvent?.name || 'Nenhum evento selecionado'}</span>
          <span className="hidden sm:inline">Autoatendimento conectado ao checkpoint de recepção</span>
        </footer>
      </div>
    </main>
  );
}
