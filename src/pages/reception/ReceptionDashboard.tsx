import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { usePulynStore } from '../../store/mockData';
import { api } from '../../services/api';
import Sidebar from '../../components/layout/Sidebar';
import TopBar from '../../components/layout/TopBar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
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

export default function ReceptionDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { setEventoAtual } = usePulynStore();
  
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [bracelets, setBracelets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Carregar eventos ao iniciar
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const eventosData = await api.getEventos();
        setEvents(eventosData || []);
        
        // Selecionar evento ativo ou o primeiro
        const activeEvent = eventosData?.find(e => e.status === 'active' || e.status === 'ongoing');
        if (activeEvent) {
          setSelectedEventId(activeEvent.id);
          setEventoAtual(activeEvent.id);
        } else if (eventosData && eventosData.length > 0) {
          setSelectedEventId(eventosData[0].id);
          setEventoAtual(eventosData[0].id);
        }
      } catch (err) {
        console.error('❌ Erro ao carregar eventos:', err);
        setEvents([]);
      }
    };
    
    loadEvents();
  }, [setEventoAtual]);

  // Carregar dados quando evento muda
  useEffect(() => {
    const loadData = async () => {
      if (!selectedEventId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [criancasData, timesData, pulseirasData] = await Promise.all([
          api.getCriancas(selectedEventId),
          api.getTimes(selectedEventId),
          api.getPulseiras()
        ]);
        
        setChildren(criancasData || []);
        setTeams(timesData || []);
        setBracelets(pulseirasData || []);
      } catch (err) {
        console.error('❌ Erro ao carregar dados:', err);
        setChildren([]);
        setTeams([]);
        setBracelets([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedEventId]);

  // Calcular estatísticas
  const totalChildren = children.length;
  const withBracelet = children.filter(c => c.bracelet_code || c.bracelet).length;
  const withoutBracelet = totalChildren - withBracelet;
  
  // Pulseiras disponíveis = pulseiras com status 'disponivel' na tabela bracelets
  const availableBracelets = bracelets.filter(b => b.status === 'disponivel').length;
  const totalBracelets = bracelets.length;

  const recentChildren = [...children].slice(-5).reverse();
  const activeEvent = events.find(e => e.status === 'active' || e.status === 'ongoing');

  const kpis = [
    { label: 'Crianças cadastradas', value: totalChildren, color: 'text-primary' },
    { label: 'Com pulseira', value: withBracelet, color: 'text-success' },
    { label: 'Sem pulseira', value: withoutBracelet, color: 'text-accent' },
    { label: 'Pulseiras disponíveis', value: availableBracelets, color: 'text-secondary' },
    { label: 'Total pulseiras', value: totalBracelets, color: 'text-gray-400' },
  ];

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
            <p className="text-gray-400">Carregando dashboard...</p>
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
        <TopBar
          title="Recepcao"
          subtitle="Visão geral do evento"
          actions={
            <NavLink to="/reception/checkin">
              <Button variant="accent" size="sm">
                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Novo Cadastro
              </Button>
            </NavLink>
          }
        />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <PageHeader
            title="Dashboard"
            description="Acompanhe o status da recepção em tempo real"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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

          {/* Active Event Card */}
          {selectedEventId && events.length > 0 && (
            (() => {
              const activeEvent = events.find(e => e.id === selectedEventId);
              return activeEvent ? (
                <Card variant="glow" className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <StatusDot status="online" size="lg" />
                    <span className="text-sm font-body text-gray-400">Evento selecionado</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-lg text-white">{activeEvent.name}</h3>
                    <p className="text-sm text-gray-400 font-body">
                      {activeEvent.date} &middot; {activeEvent.location || 'Local não definido'}
                    </p>
                  </div>
                  <Badge variant="success">{activeEvent.status === 'active' ? 'Ativo' : 'Agendado'}</Badge>
                </Card>
              ) : null;
            })()
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {kpis.map(kpi => (
              <Card key={kpi.label} className="text-center">
                <p className="text-sm font-body text-gray-400 mb-1">{kpi.label}</p>
                <p className={`font-display text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
              </Card>
            ))}
          </div>

          {/* Large Novo Cadastro Button */}
          <Card
            variant="glow"
            onClick={() => navigate('/reception/checkin')}
            className="flex items-center justify-center gap-3 py-8 cursor-pointer hover:border-accent/70 transition-all"
          >
            <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            <span className="font-display text-xl text-white">Novo Cadastro</span>
          </Card>

          {/* Recent Participants */}
          <div>
            <h2 className="font-display text-lg text-white mb-3">Participantes recentes</h2>
            <Card>
              {recentChildren.length > 0 ? (
                <div className="divide-y divide-dark-border">
                  {recentChildren.map(child => {
                    // Prioriza dados do backend (time_name, time_color)
                    let team = null;
                    if ((child as any).time_name) {
                      team = {
                        id: child.team_id || (child as any).teamId,
                        name: (child as any).time_name,
                        color: (child as any).time_color || '#999999'
                      };
                    } else {
                      // Fallback: busca na array de times
                      team = teams.find(t => t.id === (child.teamId || child.team_id));
                    }
                    const braceletCode = child.bracelet_code || child.bracelet;
                    return (
                      <div key={child.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                        <Avatar emoji={child.avatar || '👤'} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="font-body text-white text-sm truncate">{child.name}</p>
                          <p className="text-xs text-gray-500 font-body">{child.nickname || child.name}</p>
                        </div>
                        {team ? (
                          <span
                            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-body font-semibold"
                            style={{ backgroundColor: team.color + '20', color: team.color }}
                          >
                            👥 {team.name}
                          </span>
                        ) : (
                          <Badge variant="muted">Sem time</Badge>
                        )}
                        {braceletCode ? (
                          <Badge variant="success">{braceletCode}</Badge>
                        ) : (
                          <Badge variant="warning">Sem pulseira</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Nenhuma criança cadastrada ainda</p>
                  <Button 
                    variant="primary" 
                    onClick={() => navigate('/reception/checkin')} 
                    className="mt-4"
                  >
                    Cadastrar primeira criança
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}