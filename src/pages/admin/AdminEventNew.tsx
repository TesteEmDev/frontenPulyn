import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Check, ChevronLeft, ChevronRight
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import AdminSidebar from '../../components/layout/AdminSidebar';
import TopBar from '../../components/layout/TopBar';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import TimeInput from '../../components/ui/TimeInput';

// Nome do tipo de jogo na lista (antes tudo que não era equipe/individual aparecia como "Cooperativo").
const TIPO_DO_JOGO: Record<string, string> = {
  team: 'Zona (equipe)',
  individual: 'Zona (individual)',
  cooperative: 'Cooperativo',
  treasure_hunt: 'Caça ao Tesouro',
  monster_hunt: 'Caça ao Monstro',
  bomb_defusal: 'Conquistar e Destruir',
  zone_domination: 'Zona (domínio total)',
  hostage_rescue: 'Resgate do Refém',
};
const tipoDoJogo = (tipo?: string) => TIPO_DO_JOGO[String(tipo || '')] || 'Jogo';

// Plano PulynBall: só os jogos de paintball.
const JOGOS_PULYNBALL = ['bomb_defusal', 'zone_domination', 'hostage_rescue'];

const steps = [
  { number: 1, label: 'Informações' },
  { number: 2, label: 'Jogos e Config' },
  { number: 3, label: 'Revisão' },
];

export default function AdminEventNew() {
  const navigate = useNavigate();
  const { id: editingId } = useParams<{ id: string }>();
  const isEditing = Boolean(editingId);
  const auth = useAuth();
  const soPulynBall = auth.user?.plan === 'pulynball';
  const [brincadeiras, setBrincadeiras] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  // Na edição, os jogos atuais do evento precisam ter sido carregados para a lista poder ser enviada:
  // se falhar, os jogos do evento ficam como estão em vez de serem apagados por engano.
  const [gamesLoaded, setGamesLoaded] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    date: '',
    time: '',
    duration: '120',
    enableDisplay: true,
    enableLocation: false,
    responsibleName: '',
    autoStart: true,
    autoEnd: true,
    selectedGames: [] as string[],
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Buscar brincadeiras da API
        const brincadeirasData = await api.getBrincadeiras();
        const todosOsJogos = Array.isArray(brincadeirasData) ? brincadeirasData : [];
        // Quem tem o plano PulynBall só enxerga (e só pode escolher) os jogos de paintball.
        const jogosDoPlano = soPulynBall ? todosOsJogos.filter((game: any) => JOGOS_PULYNBALL.includes(game.type)) : todosOsJogos;
        setBrincadeiras(jogosDoPlano);

        // Edição: carrega o evento existente no formulário
        if (editingId) {
          const evento = await api.getEvento(editingId);
          if (!evento || evento.error || !evento.eventoId) {
            alert('Evento não encontrado.');
            navigate('/admin/events');
            return;
          }
          setFormData(prev => ({
            ...prev,
            name: evento.nome || '',
            description: evento.descricao || '',
            date: String(evento.data || '').split('T')[0],
            time: String(evento.hora || '').slice(0, 5),
            duration: String(evento.duracao || 120),
            enableDisplay: Boolean(evento.exibirDisplay),
            enableLocation: Boolean(evento.exibirLocalizacao),
            responsibleName: evento.nomeResponsavel || '',
            autoStart: Boolean(evento.autoInicio),
            autoEnd: Boolean(evento.autoFim),
          }));

          // Jogos que já fazem parte do evento vêm marcados
          try {
            const eventGames = await api.getBrincadeiras(editingId);
            const doEvento = soPulynBall ? eventGames.filter((game: any) => JOGOS_PULYNBALL.includes(game.type)) : eventGames;
            setFormData(prev => ({ ...prev, selectedGames: doEvento.map((game: any) => String(game.id)) }));
          } catch (gamesError) {
            console.error('Erro ao carregar os jogos do evento:', gamesError);
            setGamesLoaded(false);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const updateField = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleGame = (gameId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedGames: prev.selectedGames.includes(gameId)
        ? prev.selectedGames.filter(id => id !== gameId)
        : [...prev.selectedGames, gameId],
    }));
  };

  const canGoNext = () => {
    if (currentStep === 1) {
      return formData.name && formData.responsibleName.trim() && formData.date && formData.time;
    }
    return true;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        nome: formData.name,
        description: formData.description,
        date: formData.date,
        time: formData.time,
        duration: parseInt(formData.duration),
        enableDisplay: formData.enableDisplay,
        enableLocation: formData.enableLocation,
        responsibleNome: formData.responsibleName.trim(),
        autoStart: formData.autoStart,
        autoEnd: formData.autoEnd,
        // Jogos do evento (vínculo gravado no banco)
        ...(gamesLoaded ? { games: formData.selectedGames } : {}),
      };
      if (editingId) await api.updateEvento(editingId, payload);
      else await api.createEvento(payload);
      navigate('/admin/events');
    } catch (error) {
      console.error('Erro ao salvar evento:', error);
      alert(error instanceof Error && error.message ? error.message : 'Erro ao salvar evento. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-dark text-white overflow-hidden">
        <AdminSidebar activePath="/admin/events" />
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
    <div className="flex h-screen bg-dark text-white overflow-hidden">
      <AdminSidebar activePath="/admin/events" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          title={isEditing ? 'Editar Evento' : 'Novo Evento'}
          subtitle={`Etapa ${currentStep} de 3`}
          onBack={() => navigate('/admin/events')}
        />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-4 mb-8">
              {steps.map((step, index) => (
                <div key={step.number} className="flex items-center">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                        currentStep > step.number
                          ? 'bg-success text-white'
                          : currentStep === step.number
                          ? 'bg-primary text-white'
                          : 'bg-surface text-gray-500'
                      }`}
                    >
                      {currentStep > step.number ? <Check size={18} /> : step.number}
                    </div>
                    <span
                      className={`text-sm font-body font-semibold ${
                        currentStep >= step.number ? 'text-white' : 'text-gray-500'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-16 h-0.5 mx-2 ${
                        currentStep > step.number ? 'bg-success' : 'bg-surface'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Step 1: Informações */}
            {currentStep === 1 && (
              <Card>
                <h2 className="font-display text-lg text-white mb-4">Informações do Evento</h2>
                <div className="space-y-4">
                  {/* Empresa do usuário (informação, não select) */}
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-xs text-gray-400 mb-1">Buffet</p>
                    <p className="text-sm font-semibold text-white">{auth.user?.name || 'Seu Buffet'}</p>
                  </div>
                  
                  <Input
                    label="Nome do Evento"
                    placeholder="Ex: Festa do João"
                    value={formData.name}
                    onChange={e => updateField('name', e.target.value)}
                    required
                  />
                  <div>
                    <Input
                      label="Contratante / Responsável"
                      placeholder="Ex: Maria da Silva"
                      value={formData.responsibleName}
                      onChange={e => updateField('responsibleName', e.target.value)}
                      maxLength={150}
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">Nome de quem contratou o evento.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Data"
                      type="date"
                      value={formData.date}
                      onChange={e => updateField('date', e.target.value)}
                      required
                    />
                    <TimeInput
                      label="Horário"
                      value={formData.time}
                      onChange={time => updateField('time', time)}
                      required
                    />
                  </div>
                  <Input
                    label="Duração (minutos)"
                    type="number"
                    placeholder="180"
                    value={formData.duration}
                    onChange={e => updateField('duration', e.target.value)}
                  />

                  <div className="rounded-lg border border-border bg-surface/40 p-4 space-y-3">
                    <p className="text-sm font-body font-semibold text-gray-300">Início e encerramento</p>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.autoStart}
                        onChange={e => updateField('autoStart', e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded border-border bg-surface text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-gray-300">
                        Iniciar automaticamente na data e horário agendados
                        <span className="block text-xs text-gray-500">
                          Desmarcado, o evento só começa quando você clicar em "Iniciar" na lista de eventos.
                        </span>
                      </span>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.autoEnd}
                        onChange={e => updateField('autoEnd', e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded border-border bg-surface text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-gray-300">
                        Encerrar automaticamente após a duração
                        <span className="block text-xs text-gray-500">
                          A contagem começa quando o evento realmente inicia (automático ou manual).
                        </span>
                      </span>
                    </label>
                  </div>
                  <div className="w-full">
                    <label className="mb-1.5 block text-sm font-body font-medium text-gray-300">
                      Descrição
                    </label>
                    <textarea
                      className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-white placeholder-gray-500 font-body transition-colors duration-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 min-h-[80px]"
                      placeholder="Descrição do evento..."
                      value={formData.description}
                      onChange={e => updateField('description', e.target.value)}
                    />
                  </div>
                </div>
              </Card>
            )}

            {/* Step 2: Jogos e Config */}
            {currentStep === 2 && (
              <Card>
                <h2 className="font-display text-lg text-white mb-4">Jogos e Configuração</h2>
                <div className="space-y-4">
                  <p className="text-sm text-gray-400">
                    {soPulynBall ? 'Selecione os jogos de paintball (PulynBall) para este evento:' : 'Selecione os jogos para este evento:'}
                  </p>
                  {soPulynBall && (
                    <p className="text-xs text-gray-500">Seu plano PulynBall usa apenas os jogos de paintball. As regras de cada jogo ficam na tela PulynBall do menu.</p>
                  )}
                  {(brincadeiras || []).length === 0 && (
                    <div className="rounded-lg border border-border bg-surface/40 p-4 text-center">
                      <p className="text-sm text-gray-300">
                        {soPulynBall ? 'Você ainda não tem jogos do PulynBall cadastrados.' : 'Você ainda não tem jogos cadastrados.'}
                      </p>
                      <Button variant="accent" size="sm" className="mt-3" onClick={() => navigate('/admin/games/new')}>Criar jogo</Button>
                    </div>
                  )}
                  {!gamesLoaded && (
                    <p className="text-xs text-warning" role="alert">
                      Não foi possível carregar os jogos atuais deste evento. Eles serão mantidos como estão ao salvar.
                    </p>
                  )}
                  <div className="grid grid-cols-1 gap-3">
                    {(brincadeiras || []).map((game: any) => {
                      const isSelected = formData.selectedGames.includes(game.id);
                      return (
                        <div
                          key={game.id}
                          onClick={() => toggleGame(game.id)}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            isSelected
                              ? 'border-primary bg-primary/10'
                              : 'border-border bg-surface/50 hover:bg-surface'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              isSelected ? 'border-primary bg-primary' : 'border-gray-500'
                            }`}
                          >
                            {isSelected && <Check size={14} className="text-white" />}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-white">{game.name}</p>
                            <p className="text-xs text-gray-500">
                              {tipoDoJogo(game.type)} &middot; {game.duration}min
                            </p>
                          </div>
                          <Badge variant={game.status === 'active' ? 'success' : 'muted'}>
                            {game.status === 'active' ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div className="space-y-3 pt-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.enableDisplay}
                          onChange={e => updateField('enableDisplay', e.target.checked)}
                          className="w-4 h-4 rounded border-border bg-surface text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-gray-300">Habilitar Display</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.enableLocation}
                          onChange={e => updateField('enableLocation', e.target.checked)}
                          className="w-4 h-4 rounded border-border bg-surface text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-gray-300">Habilitar Localização</span>
                      </label>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Step 3: Revisão */}
            {currentStep === 3 && (
              <Card>
                <h2 className="font-display text-lg text-white mb-4">Revisão do Evento</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Buffet</p>
                      <p className="text-sm text-white font-semibold">{auth.user?.name || 'Seu Buffet'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Nome</p>
                      <p className="text-sm text-white font-semibold">{formData.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Contratante / Responsável</p>
                      <p className="text-sm text-white font-semibold">{formData.responsibleName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Data</p>
                      <p className="text-sm text-white font-semibold">{formData.date}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Horário</p>
                      <p className="text-sm text-white font-semibold">{formData.time}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Duração</p>
                      <p className="text-sm text-white font-semibold">{formData.duration}min</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Início</p>
                      <p className="text-sm text-white font-semibold">{formData.autoStart ? 'Automático' : 'Manual'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Encerramento</p>
                      <p className="text-sm text-white font-semibold">{formData.autoEnd ? 'Automático' : 'Manual'}</p>
                    </div>
                  </div>
                  {formData.description && (
                    <div>
                      <p className="text-xs text-gray-500">Descrição</p>
                      <p className="text-sm text-gray-300">{formData.description}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Jogos selecionados</p>
                    {formData.selectedGames.length === 0 && <p className="text-sm text-gray-500">Nenhum jogo selecionado.</p>}
                    <div className="flex flex-wrap gap-2">
                      {formData.selectedGames.map(gId => {
                        const game = (brincadeiras || []).find((g: any) => g.id === gId);
                        return game ? (
                          <Badge key={gId} variant="primary">{game.name}</Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Display</p>
                      <p className="text-sm text-white font-semibold">{formData.enableDisplay ? 'Habilitado' : 'Desabilitado'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Localização</p>
                      <p className="text-sm text-white font-semibold">{formData.enableLocation ? 'Habilitada' : 'Desabilitada'}</p>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-4">
              <Button
                variant="ghost"
                onClick={() => setCurrentStep(prev => prev - 1)}
                disabled={currentStep === 1}
                className="border border-border"
              >
                <ChevronLeft size={16} className="mr-1" />
                Anterior
              </Button>
              {currentStep < 3 ? (
                <Button
                  variant="primary"
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  disabled={!canGoNext()}
                >
                  Próximo
                  <ChevronRight size={16} className="ml-1" />
                </Button>
              ) : (
                <Button variant="primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Salvando...' : <><Check size={16} className="mr-1" /> {isEditing ? 'Salvar alterações' : 'Criar Evento'}</>}
                </Button>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
