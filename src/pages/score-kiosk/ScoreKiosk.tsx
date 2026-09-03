import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNFCReader } from '../../hooks/useNFCReader';
import { usePulynStore } from '../../store/mockData';
import { api } from '../../services/api';
import Avatar from '../../components/ui/Avatar';
import StatusDot from '../../components/ui/StatusDot';

const CLOSED_EVENT_STATUSES = ['completed', 'cancelled', 'canceled', 'finished'];

type ScoreKioskState = 'waiting' | 'reading' | 'displaying' | 'error';

type ScoreData = {
  child: {
    name: string;
    fullName?: string;
    avatar: string;
    scores: number;
    teamName?: string | null;
    teamColor?: string;
  };
  scores: Array<{
    id: string;
    points: number;
    checkpointName: string;
    createdAt?: string;
  }>;
};

const normalizeUid = (value: string) => value.trim().toUpperCase().replace(/[^0-9A-F]/g, '');
const isOpenEvent = (event: any) => !CLOSED_EVENT_STATUSES.includes(String(event?.status || '').toLowerCase());

function getErrorMessage(error: unknown) {
  return error instanceof Error && error.message ? error.message : 'Não foi possível consultar esta pulseira.';
}

function BraceletReaderIllustration({ active }: { active: boolean }) {
  return (
    <div className="relative flex h-52 w-52 items-center justify-center sm:h-60 sm:w-60" aria-hidden="true">
      <div className={`absolute inset-2 rounded-full border border-cyan-300/20 ${active ? 'animate-ping' : 'animate-pulse'}`} />
      <div className="absolute inset-8 rounded-full border-2 border-cyan-300/30 shadow-[0_0_55px_rgba(34,211,238,0.25)]" />
      <div className="absolute inset-14 rounded-full bg-cyan-300/10 blur-xl" />
      <div className="relative flex h-32 w-44 -rotate-6 items-center justify-center rounded-[1.7rem] border-4 border-cyan-200/80 bg-gradient-to-br from-cyan-300 via-blue-500 to-violet-600 shadow-[0_12px_35px_rgba(14,165,233,0.45)] sm:h-36 sm:w-52">
        <div className="flex h-16 w-28 items-center justify-center rounded-2xl border-2 border-white/50 bg-slate-950/35">
          <div className="flex items-center gap-1 text-2xl text-white"><span className="text-cyan-200">◔</span><span className="text-cyan-100">◕</span><span className="text-cyan-200">◔</span></div>
        </div>
        <span className="absolute -bottom-7 rounded-full border border-cyan-200/30 bg-slate-950/80 px-3 py-1 text-[10px] font-black tracking-[0.3em] text-cyan-100">NFC</span>
      </div>
    </div>
  );
}

export default function ScoreKiosk() {
  const { logout } = useAuth();
  const selectedEventId = usePulynStore(state => state.eventoAtualId || '');
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [nfcConnected, setNfcConnected] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [state, setState] = useState<ScoreKioskState>('waiting');
  const [message, setMessage] = useState('Aproxime sua pulseira para consultar seus pontos');
  const [scoreData, setScoreData] = useState<ScoreData | null>(null);
  const lastReadRef = useRef<{ code: string; at: number } | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scoreStateRef = useRef<ScoreKioskState>('waiting');

  const selectedEvent = events.find(event => String(event.id) === String(selectedEventId));

  useEffect(() => {
    scoreStateRef.current = state;
  }, [state]);

  const resetScreen = useCallback(() => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    lastReadRef.current = null;
    scoreStateRef.current = 'waiting';
    setScoreData(null);
    setState('waiting');
    setMessage('Aproxime sua pulseira para consultar seus pontos');
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
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

  useEffect(() => {
    let active = true;
    api.getScoreKioskEvents()
      .then(data => {
        if (!active) return;
        const openEvents = (Array.isArray(data) ? data : []).filter(isOpenEvent);
        setEvents(openEvents);
      })
      .catch(error => {
        if (active) setMessage(getErrorMessage(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    resetScreen();
  }, [resetScreen, selectedEventId]);

  const handleBraceletDetected = useCallback((code: string) => {
    const normalizedCode = normalizeUid(code);
    if (!normalizedCode || !selectedEventId) return;
    if (scoreStateRef.current === 'reading' || scoreStateRef.current === 'displaying') return;

    const now = Date.now();
    const previousRead = lastReadRef.current;
    if (previousRead?.code === normalizedCode && now - previousRead.at < 3000) return;
    lastReadRef.current = { code: normalizedCode, at: now };
    scoreStateRef.current = 'reading';
    setState('reading');
    setMessage('Pulseira reconhecida! Buscando sua pontuação...');

    api.getScoreKioskScore(selectedEventId, normalizedCode)
      .then(data => {
        if (lastReadRef.current?.code !== normalizedCode) return;
        scoreStateRef.current = 'displaying';
        setScoreData(data);
        setState('displaying');
        setMessage('Essa é a sua pontuação até agora!');
        resetTimerRef.current = setTimeout(resetScreen, 9000);
      })
      .catch(error => {
        if (lastReadRef.current?.code !== normalizedCode) return;
        scoreStateRef.current = 'error';
        setState('error');
        setMessage(getErrorMessage(error));
        resetTimerRef.current = setTimeout(resetScreen, 5000);
      });
  }, [resetScreen, selectedEventId]);

  const { isConnected } = useNFCReader(
    handleBraceletDetected,
    'score-kiosk',
    selectedEventId || null,
    'score-kiosk',
    true,
    'score-kiosk',
  );

  useEffect(() => setNfcConnected(isConnected), [isConnected]);
  useEffect(() => () => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
  }, []);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-dark text-white"><div className="text-center"><div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary/30 border-t-primary" /><p>Preparando a consulta...</p></div></div>;
  }

  return (
    <main className="kiosk-performance min-h-screen overflow-y-auto bg-[radial-gradient(circle_at_top,#164e63_0%,#111827_45%,#030712_100%)] px-3 py-3 text-white sm:px-5 sm:py-4">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-6xl flex-col">
        <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/20 text-2xl shadow-lg shadow-cyan-500/20">🏆</div><div><p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">Pulyn</p><h1 className="font-display text-2xl font-bold sm:text-3xl">Veja seus pontos</h1></div></div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs text-gray-300" title={!isOnline ? 'Sem conexão com a internet' : nfcConnected ? 'Leitor NFC conectado' : 'Aguardando conexão do leitor NFC'}><StatusDot status={!isOnline ? 'offline' : nfcConnected ? 'online' : 'warning'} size="sm" /><span className="hidden sm:inline">{!isOnline ? 'Sem internet' : nfcConnected ? 'Leitor conectado' : 'Leitor aguardando'}</span></div>
            <button type="button" onClick={toggleFullscreen} aria-pressed={isFullscreen} className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-sm text-gray-300 transition hover:border-cyan-300/60 hover:text-white sm:px-4 sm:text-xs"><span aria-hidden="true">⛶</span><span className="ml-1 hidden sm:inline">{isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}</span></button>
          </div>
        </header>
        <section className="mb-3 flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-3 py-2 backdrop-blur">
          <div className="flex min-w-0 items-center gap-2 text-xs text-gray-400"><span className={`h-2 w-2 shrink-0 rounded-full ${selectedEventId ? 'bg-success shadow-[0_0_10px_rgba(34,197,94,0.8)]' : 'bg-warning'}`} /><span className="truncate">{selectedEventId ? <>Evento controlado pela recepção: <strong className="text-white">{selectedEvent?.name || 'carregando...'}</strong></> : 'Aguardando a recepção selecionar um evento'}</span></div>
          <div className="flex shrink-0 items-center gap-3 text-xs text-gray-500"><span>Consulta de pontuação</span><button type="button" onClick={logout} className="underline hover:text-white">Sair</button></div>
        </section>

        {!selectedEventId ? (
          <section className="flex flex-1 items-center justify-center rounded-3xl border border-dashed border-cyan-300/40 bg-black/20 p-8 text-center"><div className="max-w-md"><div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-cyan-400/15 text-5xl shadow-[0_0_50px_rgba(34,211,238,0.25)]">🏆</div><h2 className="font-display text-3xl font-bold">Pronto para consultar</h2><p className="mt-3 text-gray-400">A recepção ainda não selecionou um evento. Aguarde a configuração no terminal da recepção.</p></div></section>
        ) : state === 'displaying' && scoreData ? (
          <ScoreResult data={scoreData} onReset={resetScreen} />
        ) : (
          <section className="relative flex flex-1 items-center justify-center overflow-hidden rounded-3xl border border-cyan-300/25 bg-black/20 p-4 shadow-2xl shadow-cyan-950/20 backdrop-blur sm:p-8">
            <div className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="relative flex w-full max-w-2xl flex-col items-center justify-center text-center">
              <div className={`mb-6 rounded-full border-4 ${state === 'error' ? 'border-danger/40 bg-danger/10' : 'border-cyan-300/30 bg-cyan-300/5'} p-2 shadow-[0_0_50px_rgba(34,211,238,0.18)]`}><BraceletReaderIllustration active={state === 'reading'} /></div>
              <p className={`text-sm font-semibold uppercase tracking-[0.25em] ${state === 'error' ? 'text-danger' : state === 'reading' ? 'text-cyan-200' : 'text-success'}`}>{state === 'reading' ? 'Consultando pontuação' : state === 'error' ? 'Não foi possível consultar' : 'Aguardando pulseira'}</p>
              <h2 className="mt-3 max-w-xl font-display text-3xl font-bold sm:text-5xl">{state === 'reading' ? 'Só um instante...' : state === 'error' ? 'Aproxime novamente' : 'Aproxime sua pulseira'}</h2>
              <p className={`mt-4 max-w-lg text-base sm:text-lg ${state === 'error' ? 'text-danger' : 'text-gray-400'}`}>{message}</p>
              {state === 'error' && <button type="button" onClick={resetScreen} className="mt-6 rounded-xl border border-danger/40 bg-danger/10 px-5 py-3 text-sm font-semibold text-danger transition hover:bg-danger/20">Tentar novamente</button>}
              <div className="mt-8 flex items-center gap-2 text-xs text-gray-500"><span className={`h-2 w-2 rounded-full ${nfcConnected ? 'animate-pulse bg-success' : 'bg-warning'}`} />{nfcConnected ? 'Leitor pronto para receber a pulseira' : 'Verifique a conexão do leitor NFC'}</div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function ScoreResult({ data, onReset }: { data: ScoreData; onReset: () => void }) {
  const teamColor = data.child.teamColor || '#8b5cf6';
  return (
    <section className="relative flex flex-1 items-center justify-center overflow-hidden rounded-3xl border border-cyan-300/30 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.16),transparent_42%),rgba(0,0,0,0.22)] p-4 shadow-2xl shadow-cyan-950/30 sm:p-8">
      <div className="pointer-events-none absolute -bottom-40 -left-20 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="relative grid w-full max-w-4xl gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-black/20 p-5 text-center sm:p-8">
          <div className="rounded-full border-4 p-2 shadow-[0_0_55px_rgba(34,211,238,0.25)]" style={{ borderColor: `${teamColor}99`, backgroundColor: `${teamColor}22` }}><Avatar emoji={data.child.avatar} size="xl" bgColor="bg-transparent" /></div>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.28em] text-cyan-200">Olá,</p>
          <h2 className="mt-1 max-w-full truncate px-2 font-display text-3xl font-bold sm:text-4xl">{data.child.name}</h2>
          {data.child.teamName && <p className="mt-3 rounded-full border px-4 py-1.5 text-sm font-semibold" style={{ color: teamColor, borderColor: `${teamColor}66`, backgroundColor: `${teamColor}18` }}>Time {data.child.teamName}</p>}
          <button type="button" onClick={onReset} className="mt-7 rounded-full border border-white/10 px-4 py-2 text-xs text-gray-400 transition hover:bg-white/10 hover:text-white">Consultar outra pulseira</button>
        </div>

        <div className="rounded-3xl border border-white/10 bg-gray-950/45 p-5 sm:p-8">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-200">Sua pontuação</p><p className="mt-1 text-sm text-gray-400">Pontos conquistados no evento</p></div><span className="text-3xl">⭐</span></div>
          <div className="mt-4 flex items-end gap-3"><span className="font-display text-6xl font-black leading-none text-white sm:text-7xl">{data.child.scores}</span><span className="pb-1 font-semibold text-cyan-200">pontos</span></div>
          <div className="mt-7 border-t border-white/10 pt-5"><div className="mb-3 flex items-center justify-between"><h3 className="font-display text-lg font-bold">Últimas conquistas</h3><span className="text-xs text-gray-500">Atualizado agora</span></div>
            {data.scores.length === 0 ? <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-gray-500">Ainda não há conquistas registradas.</p> : <div className="space-y-2">{data.scores.map(score => <div key={score.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5"><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{score.checkpointName}</p><p className="text-xs text-gray-500">{score.createdAt ? new Date(score.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Agora'}</p></div><span className="shrink-0 font-mono font-bold text-success">+{score.points}</span></div>)}</div>}
          </div>
          <p className="mt-6 text-center text-xs text-gray-500">Esta tela voltará ao início automaticamente.</p>
        </div>
      </div>
    </section>
  );
}
