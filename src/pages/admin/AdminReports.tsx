// src/pages/admin/AdminReports.tsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  MapPin, FileText, Download, Trophy
} from 'lucide-react';
import {
  BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';
import { usePulynStore } from '../../store/mockData';
import { api } from '../../services/api';
import AdminSidebar from '../../components/layout/AdminSidebar';
import BuffetTopBar from '../../components/layout/BuffetTopBar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import GeneralReport, { formatReportDate } from '../../components/reports/GeneralReport';
import type { GeneralReportData } from '../../services/api';
import { toCsv, downloadCsv } from '../../utils/csv';

// Pulseira usada pela criança: a atual ou, depois que o evento termina e a pulseira é liberada, a última que ela usou.
const braceletOf = (child: any): string => child.bracelet_code || child.last_bracelet_code || '';

export default function AdminReports() {
  const { events = [], loadEvents } = usePulynStore();

  // 'event' = relatório de um evento; 'general' = todos os eventos juntos.
  const [view, setView] = useState<'event' | 'general'>('event');
  const [overview, setOverview] = useState<GeneralReportData | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [overviewError, setOverviewError] = useState('');

  const [loading, setLoading] = useState(true);
  const [loadingEventData, setLoadingEventData] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [children, setChildren] = useState<any[]>([]);
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [scoreLog, setScoreLog] = useState<any[]>([]);

  // Carregar a lista de eventos da empresa (só para popular o dropdown)
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        if (loadEvents) await loadEvents();
      } catch (error) {
        console.error('Erro ao carregar eventos:', error);
      }
      setLoading(false);
    };
    loadData();
  }, [loadEvents]);

  const safeEvents = Array.isArray(events) ? events : [];

  // Selecionar um evento por padrão assim que a lista carregar: o ativo, ou
  // o mais recente por data — nunca todos misturados (mesmo critério do
  // Dashboard).
  useEffect(() => {
    if (selectedEventId || safeEvents.length === 0) return;
    const active = safeEvents.find((e) => e?.status === 'active' || e?.status === 'ongoing');
    if (active) {
      setSelectedEventId(active.id);
      return;
    }
    const mostRecent = [...safeEvents].sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
    setSelectedEventId(mostRecent?.id || '');
  }, [safeEvents, selectedEventId]);

  // Carregar os dados do evento selecionado direto da API — mesmo padrão do
  // Dashboard: não depende do "eventoAtualId" global (evento operacional de
  // recepção/game-master), e sim de uma seleção própria desta tela.
  useEffect(() => {
    if (!selectedEventId) {
      setChildren([]);
      setCheckpoints([]);
      setTeams([]);
      setGames([]);
      setScoreLog([]);
      return;
    }

    let disposed = false;
    const loadEventData = async () => {
      setLoadingEventData(true);
      try {
        const [criancasData, checkpointsData, timesData, gamesData, historyData] = await Promise.all([
          api.getCriancas(selectedEventId).catch(() => []),
          api.getCheckpoints(selectedEventId).catch(() => []),
          api.getTimes(selectedEventId).catch(() => []),
          api.getBrincadeiras(selectedEventId).catch(() => []),
          api.getScoreHistory(selectedEventId, 200).catch(() => []),
        ]);
        if (disposed) return;
        setChildren(Array.isArray(criancasData) ? criancasData : []);
        setCheckpoints(Array.isArray(checkpointsData) ? checkpointsData : []);
        setTeams(Array.isArray(timesData) ? timesData : []);
        setGames(Array.isArray(gamesData) ? gamesData : []);
        setScoreLog(Array.isArray(historyData) ? historyData : []);
      } catch (error) {
        console.error('Erro ao carregar dados do evento:', error);
      } finally {
        if (!disposed) setLoadingEventData(false);
      }
    };
    loadEventData();
    return () => { disposed = true; };
  }, [selectedEventId]);

  // O relatório geral é buscado ao abrir a aba (e a cada volta a ela, para vir sempre atualizado).
  useEffect(() => {
    if (view !== 'general') return;
    let disposed = false;
    setLoadingOverview(true);
    setOverviewError('');
    api.getGeneralReport()
      .then(data => { if (!disposed) setOverview(data); })
      .catch(error => {
        console.error('Erro ao carregar o relatório geral:', error);
        if (!disposed) setOverviewError(error instanceof Error ? error.message : 'Não foi possível carregar o relatório geral.');
      })
      .finally(() => { if (!disposed) setLoadingOverview(false); });
    return () => { disposed = true; };
  }, [view]);

  const openEventReport = useCallback((eventId: string) => {
    setSelectedEventId(eventId);
    setView('event');
  }, []);

  const safeChildren = Array.isArray(children) ? children : [];
  const safeCheckpoints = Array.isArray(checkpoints) ? checkpoints : [];
  const safeTeams = Array.isArray(teams) ? teams : [];
  const safeScoreLog = Array.isArray(scoreLog) ? scoreLog : [];
  const safeGames = Array.isArray(games) ? games : [];

  const eventOptions = useMemo(() => (
    [...safeEvents]
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .map((e) => ({ value: e.id, label: `${e.name || 'Evento'} — ${e.date || 'sem data'}` }))
  ), [safeEvents]);

  const handleSelectEvent = useCallback((eventId: string) => {
    setSelectedEventId(eventId);
  }, []);

  // Pontuação por equipe, dentro do evento selecionado
  const scoreByTeamData = useMemo(() => (
    [...safeTeams]
      .map(team => ({ name: team.name, pontos: team.points || 0, color: team.color }))
      .sort((a, b) => b.pontos - a.pontos)
  ), [safeTeams]);

  // Engajamento por zona, dentro do evento selecionado
  const engagementByZoneData = useMemo(() => {
    const zoneCounts: Record<string, number> = {};
    safeCheckpoints.forEach(cp => {
      const zone = cp.zone || 'Sem zona';
      zoneCounts[zone] = (zoneCounts[zone] || 0) + 1;
    });
    return Object.entries(zoneCounts).map(([zone, valor]) => ({
      zone,
      valor: Math.min(valor * 20, 100), // Normalizar para escala 0-100
    }));
  }, [safeCheckpoints]);

  const totalParticipants = safeChildren.length;
  const avgPoints = safeChildren.length > 0
    ? Math.round(safeChildren.reduce((sum, c) => sum + (c.scores || 0), 0) / safeChildren.length)
    : 0;

  // Checkpoints mais acessados
  const checkpointCounts = safeCheckpoints.map(cp => ({
    id: cp.id,
    name: cp.name,
    zone: cp.zone,
    count: safeScoreLog.filter(s => s.checkpoint === cp.id || s.checkpoint_id === cp.id).length,
  }));
  const mostVisited = checkpointCounts.sort((a, b) => b.count - a.count)[0];
  const topCheckpoints = checkpointCounts.slice(0, 5);

  // Jogos mais populares
  const gameCounts = safeGames.map(g => ({
    ...g,
    count: safeScoreLog.filter(s => s.game === g.name || s.game_id === g.id).length,
  }));
  const mostPopular = gameCounts.sort((a, b) => b.count - a.count)[0];

  // Ranking dos participantes
  const rankingData = [...safeChildren]
    .filter(c => c.status === 'active')
    .sort((a, b) => (b.scores || 0) - (a.scores || 0))
    .slice(0, 10);

  const handleExportGeneralCSV = () => {
    if (!overview) return;
    const statusLabel: Record<string, string> = {
      scheduled: 'Agendado', active: 'Em andamento', ongoing: 'Em andamento',
      finished: 'Encerrado', completed: 'Encerrado', cancelled: 'Cancelado', canceled: 'Cancelado',
    };
    const csv = toCsv(
      ['Evento', 'Data', 'Status', 'Participantes', 'Times', 'Pontos totais', 'Média de pontos', 'Pontuações'],
      overview.events.map(event => [
        event.name, formatReportDate(event.date), statusLabel[event.status] || event.status,
        event.participants, event.teams, event.totalPoints, event.avgPoints, event.scorings,
      ])
    );
    downloadCsv('relatorio-geral.csv', csv);
  };

  const handleExportCSV = () => {
    const headers = ['Posição', 'Nome', 'Apelido', 'Idade', 'Pulseira', 'Pontuação'];
    const rows = rankingData.map((child, i) =>
      [i + 1, child.name, child.nickname || child.name, child.age, braceletOf(child) || '', child.scores || 0].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ranking.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-dark text-white overflow-hidden">
        <AdminSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-400">Carregando relatórios...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-dark text-white overflow-hidden">
      <AdminSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <BuffetTopBar subtitle="Relatórios" />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <PageHeader
            title="Relatórios"
            description={view === 'general' ? 'Visão geral de todos os eventos do buffet' : 'Análise de dados e métricas do evento selecionado'}
            icon={<FileText size={28} />}
            action={
              <Button
                variant="accent"
                onClick={view === 'general' ? handleExportGeneralCSV : handleExportCSV}
                disabled={view === 'general' && !overview}
              >
                <Download size={16} className="mr-1.5" />
                Exportar CSV
              </Button>
            }
          />

          <div className="inline-flex rounded-lg border border-dark-border bg-dark-surface p-1" role="tablist" aria-label="Tipo de relatório">
            {([
              ['event', 'Por evento'],
              ['general', 'Geral (todos os eventos)'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={view === value}
                onClick={() => setView(value)}
                className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${
                  view === value ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {view === 'general' ? (
            loadingOverview && !overview ? (
              <Card>
                <p className="py-10 text-center text-gray-400">Carregando relatório geral...</p>
              </Card>
            ) : overviewError ? (
              <Card>
                <p role="alert" className="py-6 text-center text-sm text-danger">{overviewError}</p>
              </Card>
            ) : overview ? (
              <div className={loadingOverview ? 'opacity-60' : undefined}>
                <GeneralReport data={overview} onOpenEvent={openEventReport} />
              </div>
            ) : null
          ) : (<>

          {/* Event Selector */}
          {safeEvents.length > 0 && (
            <Card>
              <Select
                label="Selecionar Evento"
                options={eventOptions}
                value={selectedEventId}
                onChange={e => handleSelectEvent(e.target.value)}
              />
            </Card>
          )}

          {!selectedEventId ? (
            <Card>
              <p className="text-gray-500 text-sm text-center py-6">Nenhum evento cadastrado ainda.</p>
            </Card>
          ) : (
            <div className={loadingEventData ? 'space-y-6 opacity-60' : 'space-y-6'}>
              {/* KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="text-center">
                  <p className="text-sm font-body text-gray-400 mb-1">Total participantes</p>
                  <p className="font-display text-3xl font-bold text-primary">{totalParticipants}</p>
                </Card>
                <Card className="text-center">
                  <p className="text-sm font-body text-gray-400 mb-1">Média de pontos</p>
                  <p className="font-display text-3xl font-bold text-secondary">{avgPoints}</p>
                </Card>
                <Card className="text-center">
                  <p className="text-sm font-body text-gray-400 mb-1">Checkpoint + visitado</p>
                  <p className="font-display text-lg font-bold text-accent">{mostVisited?.name || '--'}</p>
                </Card>
                <Card className="text-center">
                  <p className="text-sm font-body text-gray-400 mb-1">Jogo + popular</p>
                  <p className="font-display text-lg font-bold text-success">{mostPopular?.name || '--'}</p>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <h3 className="font-display text-lg text-white mb-4">Pontuação por Equipe</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={scoreByTeamData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                      <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1E1B2E', border: '1px solid #374151', borderRadius: 8 }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Bar dataKey="pontos" fill="#1E9BD7" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                <Card>
                  <h3 className="font-display text-lg text-white mb-4">Engajamento por Zona</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <RadarChart data={engagementByZoneData}>
                      <PolarGrid stroke="#374151" />
                      <PolarAngleAxis dataKey="zone" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                      <PolarRadiusAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1E1B2E', border: '1px solid #374151', borderRadius: 8 }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Radar
                        name="Engajamento"
                        dataKey="valor"
                        stroke="#29B6F6"
                        fill="#29B6F6"
                        fillOpacity={0.3}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </Card>
              </div>

              {/* Checkpoints mais acessados */}
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <MapPin size={20} className="text-secondary" />
                  <h3 className="font-display text-lg text-white">Checkpoints mais acessados</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {topCheckpoints.length > 0 ? (
                    topCheckpoints.map((cp, index) => (
                      <div key={cp.id} className="flex items-center gap-3 p-2 rounded-lg bg-surface/50">
                        <span className="font-mono text-lg font-bold text-gray-500 w-6 text-center">{index + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{cp.name}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {cp.zone || 'Sem zona'} &middot; {cp.count} leituras
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm text-center py-4 col-span-full">Nenhum checkpoint cadastrado</p>
                  )}
                </div>
              </Card>

              {/* Ranking Table */}
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Trophy size={20} className="text-accent" />
                    <h3 className="font-display text-lg text-white">Ranking</h3>
                  </div>
                  <Badge variant="primary">Top 10</Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="pb-3 text-sm font-body font-semibold text-gray-400">#</th>
                        <th className="pb-3 text-sm font-body font-semibold text-gray-400">Nome</th>
                        <th className="pb-3 text-sm font-body font-semibold text-gray-400">Apelido</th>
                        <th className="pb-3 text-sm font-body font-semibold text-gray-400">Idade</th>
                        <th className="pb-3 text-sm font-body font-semibold text-gray-400">Pulseira</th>
                        <th className="pb-3 text-sm font-body font-semibold text-gray-400">Pontuação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {rankingData.map((child, index) => (
                        <tr key={child.id} className="hover:bg-surface/50 transition-colors">
                          <td className="py-3 pr-4">
                            <span className={`font-mono text-lg font-bold ${
                              index === 0 ? 'text-accent' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-amber-700' : 'text-gray-500'
                            }`}>
                              {index + 1}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            <p className="text-sm font-semibold text-white">{child.name}</p>
                          </td>
                          <td className="py-3 pr-4">
                            <p className="text-sm text-gray-300">{child.nickname || child.name}</p>
                          </td>
                          <td className="py-3 pr-4">
                            <p className="text-sm text-gray-300">{child.age}</p>
                          </td>
                          <td className="py-3 pr-4">
                            <p className="text-sm text-gray-300 font-mono">{braceletOf(child) || '--'}</p>
                            {!child.bracelet_code && child.last_bracelet_code && (
                              <p className="text-[10px] text-gray-500">liberada</p>
                            )}
                          </td>
                          <td className="py-3 pr-4">
                            <p className="text-sm font-bold text-primary">{child.scores || 0}</p>
                          </td>
                        </tr>
                      ))}
                      {rankingData.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-gray-500">
                            Nenhum participante ativo
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
          </>)}
        </main>
      </div>
    </div>
  );
}
