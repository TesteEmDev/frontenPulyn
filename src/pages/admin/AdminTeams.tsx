import { useState, useEffect } from 'react';
import {
  Users, Plus, Loader2, Edit2, Trash2, Download, Bookmark, CalendarDays, Check
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import AdminSidebar from '../../components/layout/AdminSidebar';
import BuffetTopBar from '../../components/layout/BuffetTopBar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ColorPicker from '../../components/ui/ColorPicker';
import AllEventsTeams, { type EventTeam } from '../../components/team/AllEventsTeams';
import { normalizeHex, readableTextOn } from '../../utils/color';

interface Team {
  timeId: string;
  nome: string;
  cor: string;
  eventoId?: string;
  created_at?: string;
}

interface Event {
  eventoId: string;
  nome: string;
  data: string;
}

const DEFAULT_TEAM_COLOR = '#1E9BD7';

export default function AdminTeams() {
  const { user } = useAuth();
  const [teamsList, setTeamsList] = useState<Team[]>([]);
  // 'event' = times do evento selecionado; 'default' = times padrão (modelos da empresa).
  // 'all' = visão somente leitura dos times de todos os eventos.
  const [scope, setScope] = useState<'event' | 'default' | 'all'>('event');
  const [allTeams, setAllTeams] = useState<EventTeam[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [defaultTeams, setDefaultTeams] = useState<Team[]>([]);
  const [applying, setApplying] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  // scope: onde o time vale. 'default' = modelo da empresa; 'event' = só no evento selecionado.
  const [newTeam, setNewTeam] = useState<{ name: string; color: string; scope: 'default' | 'event' }>({
    name: '',
    color: DEFAULT_TEAM_COLOR,
    scope: 'event',
  });

  // Carregar eventos e times
  const loadData = async () => {
    if (!user?.empresaId) {
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
        const firstEventId = eventosData[0].eventoId;
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
    loadDefaultTeams();
  }, [user]);

  useEffect(() => {
    if (scope !== 'all') return;
    let active = true;
    setLoadingAll(true);
    api.getTimes()
      .then(data => { if (active) setAllTeams(Array.isArray(data) ? data : []); })
      .catch(err => {
        console.error('❌ Erro ao carregar times de todos os eventos:', err);
        if (active) setError('Não foi possível carregar os times de todos os eventos');
      })
      .finally(() => { if (active) setLoadingAll(false); });
    return () => { active = false; };
  }, [scope]);

  const openEventTeams = (eventoId: string) => {
    setSelectedEventId(eventoId);
    setScope('event');
    setError(null);
    setNotice(null);
  };

  const loadDefaultTeams = async () => {
    try {
      setDefaultTeams(await api.getDefaultTimes());
    } catch (err) {
      console.error('❌ Erro ao carregar times padrão:', err);
      setError('Erro ao carregar times padrão');
    }
  };

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
    const name = newTeam.name.trim();
    const color = normalizeHex(newTeam.color);
    const asDefault = editingId ? isDefaultScope : newTeam.scope === 'default';
    if (!name) {
      setModalError('Dê um nome ao time.');
      return;
    }
    if (!color) {
      setModalError('Escolha uma cor válida.');
      return;
    }
    if (!asDefault && !selectedEventId) {
      setModalError('Selecione um evento para criar o time nele.');
      return;
    }

    setSubmitting(true);
    setModalError(null);

    try {
      if (editingId) {
        await api.updateTime(editingId, { nome: name, color });
        setVisibleTeams(prev => prev.map(t => (t.timeId === editingId ? { ...t, name, color } : t)));
        setNotice(`Time "${name}" atualizado.`);
      } else {
        const createdTeam = await api.createTime({
          nome: name,
          color,
          eventoId: asDefault ? undefined : selectedEventId,
        });
        if (asDefault) setDefaultTeams(prev => [...prev, createdTeam]);
        else setTeamsList(prev => [...prev, createdTeam]);
        // Mostra o time recém-criado na aba onde ele mora.
        setScope(asDefault ? 'default' : 'event');
        setNotice(asDefault
          ? `Time padrão "${name}" criado. Use "Usar times padrão" em um evento para copiá-lo.`
          : `Time "${name}" criado em ${selectedEventName}.`);
      }
      closeModal();
    } catch (err: any) {
      console.error('❌ Erro ao salvar time:', err);
      setModalError(err.message || 'Erro ao salvar time. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTeam = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover este time? Esta ação não pode ser desfeita!')) return;

    try {
      await api.deleteTime(id);
      setVisibleTeams(prev => prev.filter(t => t.timeId !== id));
    } catch (err) {
      console.error('❌ Erro ao remover time:', err);
      setError('Erro ao remover time');
    }
  };

  const handleEditTeam = (team: Team) => {
    setNewTeam({ name: team.nome, color: team.cor, scope: isDefaultScope ? 'default' : 'event' });
    setEditingId(team.timeId);
    setModalError(null);
    setNotice(null);
    setShowAddModal(true);
  };

  const openCreateModal = () => {
    setEditingId(null);
    setNewTeam({ name: '', color: DEFAULT_TEAM_COLOR, scope: isDefaultScope || !selectedEventId ? 'default' : 'event' });
    setModalError(null);
    setNotice(null);
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingId(null);
    setModalError(null);
  };

  const isDefaultScope = scope === 'default';
  const visibleTeams = isDefaultScope ? defaultTeams : teamsList;
  const setVisibleTeams = isDefaultScope ? setDefaultTeams : setTeamsList;
  const selectedEventName = events.find(event => event.eventoId === selectedEventId)?.nome || 'o evento selecionado';

  const handleApplyDefaults = async () => {
    if (!selectedEventId) return;
    setApplying(true);
    setError(null);
    setNotice(null);
    try {
      const { created, skipped } = await api.applyDefaultTimes(selectedEventId);
      await loadTeams();
      setNotice(
        created === 0
          ? 'Este evento já tem todos os times padrão.'
          : `${created} time${created !== 1 ? 's' : ''} padrão adicionado${created !== 1 ? 's' : ''} ao evento${skipped > 0 ? ` (${skipped} já existia${skipped !== 1 ? 'm' : ''})` : ''}.`
      );
    } catch (err: any) {
      setError(err.message || 'Não foi possível aplicar os times padrão');
    } finally {
      setApplying(false);
    }
  };

  const handleChangeEvent = (eventoId: string) => {
    setSelectedEventId(eventoId);
  };

  return (
    <div className="flex h-screen bg-dark text-white overflow-hidden">
      <AdminSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <BuffetTopBar subtitle="Times" />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <PageHeader
            title="Times"
            description="Crie times para cada evento ou mantenha times padrão para reaproveitar"
            icon={<Users size={28} />}
            action={scope === 'all' ? undefined : (
              <div className="flex gap-3">
                {!isDefaultScope && (
                  <Button
                    variant="secondary"
                    onClick={handleApplyDefaults}
                    disabled={!selectedEventId || defaultTeams.length === 0 || applying}
                    title={defaultTeams.length === 0 ? 'Cadastre times padrão na aba "Times padrão"' : 'Copiar os times padrão para este evento'}
                  >
                    {applying ? <Loader2 size={16} className="mr-1.5 animate-spin" /> : <Download size={16} className="mr-1.5" />}
                    Usar times padrão
                  </Button>
                )}
                <Button variant="primary" onClick={openCreateModal}>
                  <Plus size={16} className="mr-1.5" />
                  {isDefaultScope ? 'Novo Time Padrão' : 'Novo Time'}
                </Button>
              </div>
            )}
          />

          <div className="inline-flex rounded-lg border border-dark-border bg-dark-surface p-1" role="tablist" aria-label="Tipo de time">
            {([
              ['event', 'Times do evento'],
              ['default', `Times padrão (${defaultTeams.length})`],
              ['all', 'Todos os eventos'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={scope === value}
                onClick={() => { setScope(value); setError(null); setNotice(null); }}
                className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${
                  scope === value ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {notice && (
            <div className="bg-success/10 border border-success/30 rounded-lg px-4 py-3 text-success text-sm" role="status">
              {notice}
            </div>
          )}

          {error && (
            <div className="bg-danger/10 border border-danger/30 rounded-lg px-4 py-3 text-danger text-sm">
              {error}
            </div>
          )}

          {scope === 'all' ? (
            <AllEventsTeams events={events} teams={allTeams} loading={loadingAll} onOpenEvent={openEventTeams} />
          ) : (<>
          {/* Seletor de Evento */}
          {isDefaultScope ? (
            <Card>
              <p className="text-sm text-gray-400">
                Os times padrão são modelos da empresa. Em cada evento, use <strong className="text-white">Usar times padrão</strong> para copiá-los (sem duplicar os que o evento já tem). Alterar um time padrão não muda os eventos que já o copiaram.
              </p>
            </Card>
          ) : (
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
                  <option key={event.eventoId} value={event.eventoId}>
                    {event.nome}
                  </option>
                ))}
              </select>
            </div>
          </Card>
          )}

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
                      {visibleTeams.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-8 text-center text-gray-500">
                            {isDefaultScope
                              ? 'Nenhum time padrão. Crie os modelos que você mais usa nos eventos!'
                              : 'Nenhum time criado. Crie o primeiro time ou use os times padrão!'}
                          </td>
                        </tr>
                      ) : (
                        visibleTeams.map((team, index) => (
                          <tr key={team.timeId ?? team.id ?? `${team.nome ?? team.name ?? 'time'}-${index}`} className="hover:bg-surface/50 transition-colors">
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-6 h-6 rounded-full border-2 border-gray-400"
                                  style={{ backgroundColor: team.cor }}
                                />
                                <span className="text-xs text-gray-400 font-mono">{team.cor}</span>
                              </div>
                            </td>
                            <td className="py-3 pr-4">
                              <p className="text-sm font-semibold text-white">{team.nome}</p>
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
                                  onClick={() => handleDeleteTeam(team.timeId)}
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
                {visibleTeams.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm text-gray-500">{visibleTeams.length} time(s) {isDefaultScope ? 'padrão' : 'criado(s)'}</p>
                  </div>
                )}
              </>
            )}
          </Card>

          </>)}

          {/* Add/Edit Team Modal */}
          <Modal
            isOpen={showAddModal}
            onClose={submitting ? () => undefined : closeModal}
            title={editingId ? 'Editar time' : 'Novo time'}
            size="lg"
          >
            {(() => {
              const previewColor = normalizeHex(newTeam.color) || DEFAULT_TEAM_COLOR;
              const previewName = newTeam.name.trim() || 'Nome do time';
              const asDefault = editingId ? isDefaultScope : newTeam.scope === 'default';
              const noEvent = !selectedEventId;

              const scopeOption = (
                value: 'default' | 'event',
                icon: JSX.Element,
                title: string,
                description: string,
                disabled = false,
              ) => {
                const selected = newTeam.scope === value;
                return (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={disabled}
                    onClick={() => setNewTeam(prev => ({ ...prev, scope: value }))}
                    className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      selected ? 'border-primary bg-primary/10' : 'border-dark-border hover:border-primary/50'
                    }`}
                  >
                    <span className={`mt-0.5 ${selected ? 'text-primary' : 'text-gray-400'}`}>{icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-white">{title}</span>
                      <span className="mt-0.5 block text-xs text-gray-400">{description}</span>
                    </span>
                    {selected && <Check size={16} className="mt-0.5 shrink-0 text-primary" />}
                  </button>
                );
              };

              return (
                <div className="space-y-5">
                  {editingId ? (
                    <p className="flex items-center gap-2 text-sm text-gray-400">
                      {asDefault ? <Bookmark size={16} /> : <CalendarDays size={16} />}
                      {asDefault
                        ? 'Time padrão: a alteração vale para os próximos eventos que copiarem este modelo.'
                        : `Time de ${selectedEventName}: a alteração vale só neste evento.`}
                    </p>
                  ) : (
                    <div role="radiogroup" aria-label="Onde este time vale" className="grid gap-3 sm:grid-cols-2">
                      {scopeOption(
                        'default',
                        <Bookmark size={20} />,
                        'Time padrão',
                        'Modelo da empresa. Fica guardado para você copiar em qualquer evento.',
                      )}
                      {scopeOption(
                        'event',
                        <CalendarDays size={20} />,
                        'Só neste evento',
                        noEvent ? 'Selecione um evento na tela de Times primeiro.' : `Criado apenas em ${selectedEventName}.`,
                        noEvent,
                      )}
                    </div>
                  )}

                  <div className="grid gap-5 md:grid-cols-[1fr_1fr]">
                    <div className="space-y-4">
                      <Input
                        label="Nome do time *"
                        placeholder="Ex: Águias"
                        maxLength={50}
                        autoFocus
                        value={newTeam.name}
                        onChange={e => setNewTeam(prev => ({ ...prev, name: e.target.value }))}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && newTeam.name.trim() && !submitting) handleAddTeam();
                        }}
                      />
                      <div>
                        <span className="mb-2 block text-sm font-semibold text-gray-300">Como vai aparecer</span>
                        <div className="flex items-center gap-3 rounded-xl border border-dark-border bg-dark-surface p-4">
                          <span
                            className="inline-flex max-w-full items-center rounded-full px-4 py-1.5 text-sm font-bold"
                            style={{ backgroundColor: previewColor, color: readableTextOn(previewColor) }}
                          >
                            <span className="truncate">{previewName}</span>
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-gray-500">
                          Escolha uma cor bem diferente das outras para o time se destacar no telão.
                        </p>
                      </div>
                    </div>

                    <ColorPicker
                      label="Cor *"
                      value={newTeam.color}
                      onChange={color => setNewTeam(prev => ({ ...prev, color }))}
                    />
                  </div>

                  {modalError && (
                    <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                      {modalError}
                    </p>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={closeModal} disabled={submitting}>
                      Cancelar
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleAddTeam}
                      disabled={!newTeam.name.trim() || submitting || (!editingId && !asDefault && noEvent)}
                    >
                      {submitting ? (
                        <><Loader2 size={16} className="mr-2 animate-spin" /> Salvando...</>
                      ) : editingId ? (
                        'Salvar alterações'
                      ) : asDefault ? (
                        'Criar time padrão'
                      ) : (
                        'Criar time no evento'
                      )}
                    </Button>
                  </div>
                </div>
              );
            })()}
          </Modal>
        </main>
      </div>
    </div>
  );
}
