import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import ReceptionSidebar from '../../components/layout/ReceptionSidebar';
import ReceptionTopBar from '../../components/layout/ReceptionTopBar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import ActiveEventPanel from '../../components/reception/ActiveEventPanel';

export default function ReceptionDashboard() {
  const navigate = useNavigate();
  // Evento que está no telão (escolhido no painel "Evento no telão"); os números abaixo são dele
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [bracelets, setBracelets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Carregar dados quando evento muda
  useEffect(() => {
    const loadData = async () => {
      if (!selectedEventId) {
        setChildren([]);
        setTeams([]);
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

  const kpis = [
    { label: 'Crianças cadastradas', value: totalChildren, color: 'text-primary' },
    { label: 'Com pulseira', value: withBracelet, color: 'text-success' },
    { label: 'Sem pulseira', value: withoutBracelet, color: 'text-accent' },
    { label: 'Pulseiras disponíveis', value: availableBracelets, color: 'text-secondary' },
    { label: 'Total pulseiras', value: totalBracelets, color: 'text-gray-400' },
  ];

  return (
    <div className="flex h-screen bg-dark">
      <ReceptionSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <ReceptionTopBar subtitle="Visão geral do evento"
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

          {/* Onde a recepção escolhe o evento que aparece no telão */}
          <ActiveEventPanel onChange={setSelectedEventId} />

          {!selectedEventId && (
            <p className="text-sm text-gray-500">Escolha o evento do telão acima para ver os números dele.</p>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {kpis.map(kpi => (
              <Card key={kpi.label} className="text-center">
                <p className="text-sm font-body text-gray-400 mb-1">{kpi.label}</p>
                <p className={`font-display text-3xl font-bold ${kpi.color}`}>{loading ? '…' : kpi.value}</p>
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
