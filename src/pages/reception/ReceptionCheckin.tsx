import { useState, useCallback, useEffect, useRef } from 'react';
import { usePulynStore } from '../../store/mockData';
import { api } from '../../services/api';
import { useNFCReader } from '../../hooks/useNFCReader';
import { ehLeituraDoBalcao } from '../../utils/recepcao';
import ReceptionSidebar from '../../components/layout/ReceptionSidebar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { PARENTESCO_OPCOES } from '../../utils/parentesco';
import StatusDot from '../../components/ui/StatusDot';
import Avatar from '../../components/ui/Avatar';
import AvatarBuilder from '../../components/ui/AvatarBuilder';
import AvatarPreview from '../../components/ui/AvatarPreview';
import { erroNascimentoSemLimite, hojeIso } from '../../utils/nascimento';
import { ADVENTURER_AVATARS } from '../../avatar/adventurerAvatars';
import { corDoAvatar, isAvatarCode, newAvatarCode } from '../../avatar/builder/code';
import { useAvatarUnico, MENSAGEM_AVATAR_REPETIDO } from '../../hooks/useAvatarUnico';
import { CHAVE_RASCUNHO_CHECKIN, lerAvatarRascunho, salvarAvatarRascunho } from '../../avatar/builder/rascunho';

const normalizeUid = (value: string) => value.trim().toUpperCase().replace(/[^0-9A-F]/g, '');

const AVATAR_OPTIONS = ADVENTURER_AVATARS.map(option => ({
  emoji: option.id,
  name: option.label.replace('Avatar ', ''),
  color: 'bg-primary/20',
}));

type BraceletStatus = 'idle' | 'checking' | 'available' | 'registered' | 'not-found' | 'error';

const CLOSED_EVENT_STATUSES = ['completed', 'cancelled', 'canceled', 'finished'];
// Só eventos abertos podem ser escolhidos: o servidor recusa (409) tirar para o telão um evento já encerrado
const isOpenEvent = (event: any) => !CLOSED_EVENT_STATUSES.includes(String(event.status || '').trim().toLowerCase());

export default function ReceptionCheckin() {
  const {
    loadChildren,
    loadEventos,
    eventoAtualId,
    setEventoAtual,
  } = usePulynStore();
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [form, setForm] = useState(() => ({
    name: '',
    nickname: '',
    nascimento: '',   // AAAA-MM-DD
    responsavel: '',  // nome do pai ou responsável
    parentesco: '',   // grau de parentesco / relação com a criança
    // O personagem em montagem fica salvo no aparelho: atualizar a página não perde o avatar
    avatar: lerAvatarRascunho(CHAVE_RASCUNHO_CHECKIN),
  }));
  const [braceletCode, setBraceletCode] = useState('');
  const [braceletStatus, setBraceletStatus] = useState<BraceletStatus>('idle');
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
        const pulseira = pulseiras.find(item => normalizeUid(String(item.codigo || '')) === normalizedCode);
        if (!pulseira) {
          setBraceletStatus('not-found');
          showToast('Esta pulseira não foi fornecida para este cliente.', 'error');
          return;
        }
        if (pulseira.status === 'disponivel') {
          setBraceletStatus('available');
          showToast(`Pulseira ${normalizedCode} disponível para cadastro.`, 'success');
          return;
        }
        setBraceletStatus('registered');
        showToast(`Pulseira já vinculada para ${pulseira.crianca_nome || 'uma criança'}.`, 'success');
      })
      .catch(error => {
        if (checkId !== braceletCheckIdRef.current) return;
        console.error('Erro ao verificar pulseira:', error);
        setBraceletStatus('error');
        showToast('Não foi possível verificar a pulseira. Tente novamente.', 'error');
      });
  }, [showToast]);

  const { isConnected } = useNFCReader(
    handleBraceletDetected,
    'checkin',
    selectedEventId,
    'reception',
    true,
    'kiosk',
    ehLeituraDoBalcao, // o balcão só ouve o leitor R1; R2, R3... são das telas de autoatendimento
  );

  useEffect(() => {
    setNFCConnected(isConnected);
  }, [isConnected]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        console.log('🔍 [ReceptionCheckin] Iniciando carregamento de dados...');
        const [eventosData, controlData] = await Promise.all([
          loadEventos(),
          api.getActiveEventControl().catch(() => ({ event: null })),
        ]);
        console.log('📊 [ReceptionCheckin] eventosData:', eventosData);
        console.log('📊 [ReceptionCheckin] controlData:', controlData);
        const availableEvents = eventosData || [];
        console.log('📊 [ReceptionCheckin] availableEvents:', availableEvents);
        const openEvents = availableEvents.filter(isOpenEvent);
        setEvents(openEvents);
        const controlledEvent = controlData?.event
          ? availableEvents.find(event => String(event.eventoId) === String(controlData.event.id))
          : null;
        const activeEvent = availableEvents.find(event => ['active', 'ongoing'].includes(String(event.status || '').toLowerCase()));
        const storedEvent = eventoAtualId
          ? availableEvents.find(event => String(event.eventoId) === String(eventoAtualId) && isOpenEvent(event))
          : null;
        const eventToSelect = controlledEvent || activeEvent || storedEvent || (openEvents.length === 1 ? openEvents[0] : null);

        setSelectedEventId(currentId => currentId && openEvents.some(event => String(event.eventoId) === String(currentId))
          ? currentId
          : eventToSelect?.eventoId || null);
        if (eventToSelect) {
          setEventoAtual(eventToSelect.eventoId);
          if (!controlledEvent) await api.setActiveEventControl(eventToSelect.eventoId).catch(() => {});
        }
      } catch (error) {
        console.error('Erro ao carregar eventos:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [eventoAtualId, loadEventos, setEventoAtual]);

  // Avatares que os outros participantes do evento já usam: ficam indisponíveis e o cadastro começa num livre
  const [avataresEmUso, setAvataresEmUso] = useState<string[]>([]);
  useEffect(() => { salvarAvatarRascunho(CHAVE_RASCUNHO_CHECKIN, form.avatar); }, [form.avatar]);
  const trocarAvatar = useCallback((avatar: string) => setForm(previous => ({ ...previous, avatar })), []);
  const { repetido: avatarRepetido, marcarEscolhido: marcarAvatarEscolhido, reiniciar: reiniciarAvatar } = useAvatarUnico(avataresEmUso, form.avatar, trocarAvatar);
  const carregarAvatares = useCallback(async () => {
    if (!selectedEventId) {
      setAvataresEmUso([]);
      return;
    }
    try {
      const emUso = await api.getAvataresEmUso(selectedEventId);
      setAvataresEmUso(emUso.avatares);
    } catch (error) {
      console.error('Erro ao carregar os avatares em uso:', error);
    }
  }, [selectedEventId]);
  useEffect(() => { carregarAvatares(); }, [carregarAvatares]);
  // Outro cadastro (kiosk ou outra recepção) pode acontecer nesse meio tempo: relê de tempos em tempos
  useEffect(() => {
    if (!selectedEventId) return undefined;
    const timer = window.setInterval(carregarAvatares, 8000);
    return () => window.clearInterval(timer);
  }, [selectedEventId, carregarAvatares]);

  const handleChange = useCallback((field: 'name' | 'nickname' | 'nascimento' | 'responsavel') => (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setForm(previous => ({ ...previous, [field]: event.target.value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!form.name.trim()) {
      showToast('Preencha o nome da criança.', 'error');
      return;
    }
    if (!form.responsavel.trim()) {
      showToast('Preencha o nome do pai ou responsável.', 'error');
      return;
    }
    if (!form.parentesco) {
      showToast('Escolha o grau de parentesco do responsável.', 'error');
      return;
    }
    const erroDaData = erroNascimentoSemLimite(form.nascimento || null);
    if (erroDaData) {
      showToast(erroDaData, 'error');
      return;
    }
    if (saving) return;

    setSaving(true);
    try {
      // A pulseira é opcional: sem ela o participante é cadastrado e a pulseira pode ser vinculada depois
      let normalizedCode: string | null = null;
      // Sem evento escolhido não há pulseira para vincular: o cadastro fica salvo e a criança se vincula depois
      if (selectedEventId && braceletCode) {
        normalizedCode = normalizeUid(braceletCode);
        const pulseiras = await api.getPulseiras();
        let pulseira = pulseiras.find(item => normalizeUid(String(item.codigo || '')) === normalizedCode);

        // O cliente só usa pulseira que o master forneceu: não cadastra pulseira nova aqui
        if (!pulseira) {
          showToast('Esta pulseira não foi fornecida para este cliente.', 'error');
          setBraceletStatus('not-found');
          return;
        }
        if (pulseira.status !== 'disponivel') {
          showToast('Esta pulseira já está vinculada ou indisponível.', 'error');
          setBraceletStatus('registered');
          return;
        }
      }

      const dados = {
        nome: form.name.trim(),
        apelido: form.nickname.trim() || form.name.trim().split(/\s+/)[0],
        dataNascimento: form.nascimento,
        nomeResponsavel: form.responsavel.trim(),
        parentescoResponsavel: form.parentesco,
        avatar: form.avatar,
      };
      if (selectedEventId) {
        await api.createCrianca(selectedEventId, {
          ...dados,
          // A cor do participante é a cor de fundo do avatar
          cor: corDoAvatar(form.avatar) ?? undefined,
          ...(normalizedCode ? { braceletCode: normalizedCode } : {}),
        });
      } else {
        await api.createPerfilCrianca(dados);
      }
      await loadChildren();

      showToast(`${form.name.trim()} foi cadastrado(a)${!selectedEventId ? '. Ela se vincula ao evento depois, pelo autoatendimento' : normalizedCode ? ' e a pulseira foi vinculada' : ' (sem pulseira por enquanto)'}.`);
      reiniciarAvatar();
      setForm({ name: '', nickname: '', nascimento: '', responsavel: '', parentesco: '', avatar: newAvatarCode() });
      clearBracelet();
      carregarAvatares();
    } catch (error: unknown) {
      carregarAvatares();
      console.error('Erro ao cadastrar participante:', error);
      const message = error instanceof Error ? error.message : 'Não foi possível cadastrar o participante.';
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  }, [braceletCode, carregarAvatares, clearBracelet, form, loadChildren, saving, selectedEventId, showToast]);

  // O que ainda impede o cadastro (aparece embaixo do botão, que fica desativado enquanto algo faltar)
  const erroDaDataAtual = erroNascimentoSemLimite(form.nascimento || null);
  const pendencias = [
    !form.name.trim() && 'informe o nome',
    !form.responsavel.trim() && 'informe o nome do pai ou responsável',
    !form.parentesco && 'escolha o grau de parentesco',
    erroDaDataAtual && (form.nascimento ? erroDaDataAtual.replace(/\.$/, '').toLowerCase() : 'informe a data de nascimento'),
    avatarRepetido && 'mude alguma peça do avatar (já existe um igual)',
    Boolean(braceletCode) && braceletStatus === 'registered' && 'a pulseira lida já está vinculada: aproxime outra',
  ].filter((item): item is string => Boolean(item));

  if (loading) {
    return (
      <div className="flex h-screen bg-dark">
        <ReceptionSidebar />
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
      <ReceptionSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 lg:p-6">
          <PageHeader
            title="Check-in"
            stackBelow="lg"
            compact
            description="Cadastre o participante e, se houver evento, vincule a pulseira"
            action={
              <div className="relative w-full max-w-md lg:w-80 xl:w-96">
                {/* Alerta curto: por cima do seletor em telas largas (não aumenta a altura do cabeçalho) */}
                {events.length === 0 && (
                  <p className="mb-1 truncate rounded-md border border-warning/30 bg-warning/10 px-2 py-0.5 text-[10px] leading-tight text-warning lg:absolute lg:inset-x-0 lg:bottom-full lg:mb-1" role="status">
                    Nenhum evento aberto: o cadastro fica salvo e a criança se vincula depois.
                  </p>
                )}
                <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-dark-card/70 px-3 py-1.5">
                  <label htmlFor="checkin-event" className="whitespace-nowrap text-xs font-semibold text-gray-300">Evento:</label>
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
                        showToast(error instanceof Error && error.message
                          ? `Não foi possível sincronizar o evento com os outros terminais: ${error.message}`
                          : 'Não foi possível sincronizar o evento com os outros terminais.', 'error');
                      });
                    }}
                    className="min-w-0 flex-1 rounded-lg border border-dark-border bg-dark-surface px-3 py-1.5 text-sm text-white focus:border-primary focus:outline-none"
                  >
                    <option value="">Sem evento (só cadastro)</option>
                    {events.map(event => (
                      <option key={event.eventoId} value={event.eventoId}>
                        {event.nome} - {new Date(event.data).toLocaleDateString('pt-BR')}
                      </option>
                    ))}
                  </select>
                  <span
                    title="Compartilhado com o Kiosk, o totem e os telões"
                    aria-label="Compartilhado com o Kiosk, o totem e os telões"
                    className="shrink-0 cursor-help text-xs text-gray-500"
                  >
                    ⓘ
                  </span>
                </div>
              </div>
            }
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
              </svg>
            }
          />

          <div className="flex flex-1 flex-col gap-4 lg:min-h-0">

          {/* No desktop o cadastro ocupa a altura que sobra na tela: só a lista de peças rola, não a página */}
          <Card className="relative flex flex-col gap-4 !p-4 lg:min-h-[520px] lg:flex-1 lg:!p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 text-left">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Novo participante</p>
                <h2 className="mt-1 font-display text-xl text-white lg:text-2xl">Cadastre a criança</h2>
                <p className="mt-1 hidden text-sm text-gray-400 [@media(min-height:900px)]:block">A pulseira é opcional: aproxime uma para já vincular, ou cadastre sem ela e vincule depois.</p>
              </div>
              {/* Leitor NFC: aviso pequeno à direita do título (situação do leitor e da pulseira lida), sem ocupar um cartão à parte */}
              <div
                aria-live="polite"
                title={[
                  nfcConnected ? 'Leitor NFC conectado' : 'Leitor NFC aguardando conexão',
                  braceletCode ? `Pulseira ${braceletCode}` : 'Nenhuma pulseira lida',
                  lastReadAt ? `Última leitura: ${lastReadAt.toLocaleTimeString('pt-BR')}` : '',
                ].filter(Boolean).join(' · ')}
                className={`flex w-full max-w-[280px] shrink-0 items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left sm:w-auto sm:max-w-[260px] ${
                  braceletStatus === 'available'
                    ? 'border-success/30 bg-success/10'
                    : braceletStatus === 'registered'
                      ? 'border-warning/30 bg-warning/10'
                      : braceletStatus === 'not-found' || braceletStatus === 'error'
                        ? 'border-danger/30 bg-danger/10'
                        : 'border-white/10 bg-black/20'
                }`}
              >
                <StatusDot status={
                  braceletStatus === 'available' ? 'online' :
                    braceletStatus === 'registered' ? 'warning' :
                      braceletStatus === 'not-found' || braceletStatus === 'error' ? 'offline' :
                        nfcConnected ? 'online' : 'offline'
                } size="sm" />
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-[11px] font-semibold text-white">
                    {braceletCode ? `Pulseira ${braceletCode}` : nfcConnected ? 'Leitor NFC conectado' : 'Leitor NFC aguardando'}
                  </p>
                  <p className="truncate text-[10px] text-gray-400">
                    {braceletStatus === 'available' ? 'Disponível para vincular' :
                      braceletStatus === 'registered' ? 'Já vinculada a outra criança' :
                        braceletStatus === 'not-found' ? 'Não fornecida a este cliente' :
                          braceletStatus === 'error' ? 'Conferência não concluída' :
                            braceletStatus === 'checking' ? 'Verificando pulseira...' :
                              nfcConnected ? 'Aproxime uma pulseira' : 'Conecte o leitor'}
                  </p>
                </div>
                {(braceletCode || braceletStatus !== 'idle') && (
                  <button
                    type="button"
                    onClick={clearBracelet}
                    aria-label="Limpar leitura da pulseira"
                    title="Limpar leitura"
                    className="ml-auto shrink-0 rounded-md px-1.5 py-0.5 text-xs text-gray-300 transition hover:bg-white/10 hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)] lg:grid-rows-[minmax(0,1fr)]">
              <div className="flex min-w-0 flex-col gap-3 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
                <div className="grid gap-3 sm:grid-cols-[1fr_170px] xl:grid-cols-[1.5fr_1fr_170px]">
                  <div className="sm:col-span-2 xl:col-span-1">
                    <Input label="Nome completo *" placeholder="Ex: Pedro Almeida" value={form.name} onChange={handleChange('name')} />
                  </div>
                  <Input label="Apelido" placeholder="Ex: Pedrinho" value={form.nickname} onChange={handleChange('nickname')} />
                  <Input label="Data de nascimento *" type="date" max={hojeIso()} value={form.nascimento} onChange={handleChange('nascimento')} />
                </div>
                <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
                  <Input label="Nome do pai ou responsável *" placeholder="Ex: Carlos Almeida" value={form.responsavel} onChange={handleChange('responsavel')} />
                  <Select label="Parentesco *" options={PARENTESCO_OPCOES} value={form.parentesco} onChange={e => setForm(previous => ({ ...previous, parentesco: e.target.value }))} />
                </div>

                {/* Desktop: a foto do personagem fica embaixo dos dados; no lado direito ficam só as peças. */}
                <div className="hidden min-h-0 lg:flex lg:min-h-[150px] lg:flex-1">
                  <AvatarPreview fill className="w-full" value={form.avatar} onChange={avatar => setForm(previous => ({ ...previous, avatar }))} />
                </div>
              </div>

              <div className="flex min-w-0 flex-col lg:min-h-0">
                <h3 className="mb-2 shrink-0 text-sm font-semibold text-gray-200">Escolha o avatar</h3>
                <div className="mb-3 flex items-center gap-3 rounded-xl border border-white/10 bg-black/10 p-3 lg:hidden">
                  <Avatar
                    emoji={form.avatar}
                    size="md"
                    bgColor={AVATAR_OPTIONS.find(option => option.emoji === form.avatar)?.color || 'bg-primary/20'}
                  />
                  <div>
                    <p className="text-sm font-semibold text-white">{isAvatarCode(form.avatar) ? 'Personagem criado por você' : AVATAR_OPTIONS.find(option => option.emoji === form.avatar)?.name || 'Aventureiro'}</p>
                    <p className="text-xs text-gray-400">Avatar do participante</p>
                  </div>
                </div>
                <AvatarBuilder value={form.avatar} onChange={avatar => { marcarAvatarEscolhido(); setForm(previous => ({ ...previous, avatar })); }} layout="fill" className="lg:min-h-0 lg:flex-1" previewClassName="lg:hidden" />
                {avatarRepetido && <p role="alert" className="mt-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">{MENSAGEM_AVATAR_REPETIDO}</p>}
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-center gap-1.5">
            {pendencias.length > 0 && (
              <p role="status" className="text-center text-xs font-semibold text-warning">
                Para cadastrar: {pendencias.join(' · ')}
              </p>
            )}
            <Button
              variant="primary"
              size="lg"
              onClick={handleSubmit}
              disabled={!form.name.trim() || !form.responsavel.trim() || !form.parentesco || Boolean(erroNascimentoSemLimite(form.nascimento || null)) || (Boolean(braceletCode) && braceletStatus === 'registered') || avatarRepetido || saving}
              className="w-full"
            >
              {saving ? 'Cadastrando participante...' : braceletCode ? 'Cadastrar participante e vincular pulseira' : 'Cadastrar participante sem pulseira'}
            </Button>
            </div>
          </Card>

          <p className="hidden shrink-0 text-center text-xs text-gray-500 [@media(min-height:960px)]:block">
            O cadastro também pode ser realizado no Kiosk. Nesta tela, a recepção pode cadastrar nome, avatar, data de nascimento, nome do responsável e pulseira.
          </p>
          </div>

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
