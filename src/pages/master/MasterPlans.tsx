import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import React from 'react';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Activity,
  ScrollText,
  LifeBuoy,
  BarChart3,
  Check,
  Zap,
  Building2,
  Crown,
  Rocket,
  MapPin,
} from 'lucide-react';
import { api } from '../../services/api';
import Sidebar from '../../components/layout/Sidebar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

const masterNavItems = [
  { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/master' },
  { icon: <Users size={20} />, label: 'Clientes', path: '/master/clients' },
  { icon: <CreditCard size={20} />, label: 'Planos', path: '/master/plans' },
  { icon: <Activity size={20} />, label: 'Monitoramento', path: '/master/monitoring' },
  { icon: <ScrollText size={20} />, label: 'Logs', path: '/master/logs' },
  { icon: <LifeBuoy size={20} />, label: 'Suporte', path: '/master/support' },
  { icon: <BarChart3 size={20} />, label: 'Analytics', path: '/master/analytics' },
];

interface Plan {
  id: string;
  name: string;
  price: number;
  icon: React.ReactNode;
  color: string;
  features: string[];
  checkpointLimit: number;
  eventsPerMonth: number;
  clientCount: number;
}

const plans: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 497,
    icon: <Rocket size={32} />,
    color: '#F59E0B',
    features: [
      'Até 3 checkpoints simultâneos',
      'Até 4 eventos por mês',
      'Dashboard básico',
      'Suporte por e-mail',
      'Relatórios mensais',
    ],
    checkpointLimit: 3,
    eventsPerMonth: 4,
    clientCount: 4,
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 997,
    icon: <Zap size={32} />,
    color: '#29B6F6',
    features: [
      'Até 8 checkpoints simultâneos',
      'Até 12 eventos por mês',
      'Dashboard completo',
      'Suporte prioritário',
      'Relatórios semanais',
      'Jogos cooperativos',
      'Customização de branding',
    ],
    checkpointLimit: 8,
    eventsPerMonth: 12,
    clientCount: 4,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 2497,
    icon: <Crown size={32} />,
    color: '#1E9BD7',
    features: [
      'Checkpoints ilimitados',
      'Eventos ilimitados',
      'Dashboard completo + analytics',
      'Suporte 24/7 dedicado',
      'Relatórios em tempo real',
      'Todos os tipos de jogos',
      'Customização total de branding',
      'API de integração',
      'Gerente de conta dedicado',
    ],
    checkpointLimit: -1,
    eventsPerMonth: -1,
    clientCount: 2,
  },
];

interface PlanClient {
  id: string;
  name: string;
  city: string;
  plan: 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'blocked' | 'trial';
  since: string;
}

const planClients: PlanClient[] = [
  { id: 'c1', name: 'Buffet Festa Mágica', city: 'São Paulo', plan: 'professional', status: 'active', since: '2025-03' },
  { id: 'c2', name: 'Espaço Kids Divertido', city: 'Rio de Janeiro', plan: 'enterprise', status: 'active', since: '2024-11' },
  { id: 'c3', name: 'Buffet Alegria', city: 'Belo Horizonte', plan: 'starter', status: 'active', since: '2025-08' },
  { id: 'c4', name: 'Mundo Encantado', city: 'Curitiba', plan: 'starter', status: 'trial', since: '2026-04' },
  { id: 'c5', name: 'Festas & Cia', city: 'Salvador', plan: 'professional', status: 'active', since: '2025-06' },
  { id: 'c6', name: 'Buffet Aventura', city: 'Recife', plan: 'starter', status: 'blocked', since: '2025-01' },
  { id: 'c7', name: 'Pulyn Norte', city: 'Manaus', plan: 'professional', status: 'active', since: '2025-05' },
  { id: 'c8', name: 'Buffet Brasília', city: 'Brasília', plan: 'enterprise', status: 'active', since: '2024-06' },
  { id: 'c9', name: 'Espaço Lúdico', city: 'Porto Alegre', plan: 'professional', status: 'active', since: '2025-07' },
  { id: 'c10', name: 'Festas Goianas', city: 'Goiânia', plan: 'starter', status: 'trial', since: '2026-05' },
];

const planBadgeVariant: Record<string, 'primary' | 'secondary' | 'muted'> = {
  enterprise: 'primary',
  professional: 'secondary',
  starter: 'muted',
};

export default function MasterPlans() {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [planClients, setPlanClients] = useState<any[]>([]);

  React.useEffect(() => {
    const loadData = async () => {
      try {
        const plansData = await api.getPlanos();
        setPlans(plansData);
      } catch (error) {
        console.error('Erro ao buscar planos:', error);
      }
    };
    loadData();
  }, []);

  React.useEffect(() => {
    const loadClients = async () => {
      if (selectedPlan) {
        try {
          const clients = await api.getClientesByPlano(selectedPlan);
          setPlanClients(clients);
        } catch (error) {
          console.error('Erro ao buscar clientes por plano:', error);
        }
      }
    };
    loadClients();
  }, [selectedPlan]);

  return (
    <div className="flex h-screen bg-dark text-white overflow-hidden">
      <Sidebar
        items={masterNavItems}
        activePath={location.pathname}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        accentColor="#1E9BD7"
      />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">
          <PageHeader
            title="Planos e Licenças"
            description="Gerencie os planos da plataforma e clientes por plano"
            icon={<CreditCard size={28} />}
            action={
              <div className="text-right">
                <p className="text-xs text-gray-500">MRR Total</p>
                <p className="font-display text-xl text-primary font-bold">
                  R$ {(plans.reduce((sum, plan) => sum + plan.price * (planClients.filter(c => c.plan === plan.id).length || 0), 0)).toLocaleString('pt-BR')}
                </p>
              </div>
            }
          />

          {/* Plan Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {plans.map(plan => (
              <Card
                key={plan.id}
                variant={plan.id === 'professional' ? 'secondary' : plan.id === 'enterprise' ? 'glow' : 'default'}
                className="relative overflow-hidden"
              >
                {plan.id === 'enterprise' && (
                  <div className="absolute top-0 right-0 bg-primary text-white text-xs font-semibold px-3 py-1 rounded-bl-lg">
                    Popular
                  </div>
                )}
                <div className="text-center mb-6">
                  <div
                    className="w-16 h-16 rounded-xl mx-auto mb-4 flex items-center justify-center"
                    style={{ backgroundColor: plan.color + '20' }}
                  >
                    <span style={{ color: plan.color }}>{plan.icon}</span>
                  </div>
                  <h3 className="font-display text-xl text-white">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="font-display text-3xl font-bold" style={{ color: plan.color }}>
                      R$ {plan.price.toLocaleString('pt-BR')}
                    </span>
                    <span className="text-gray-500 text-sm">/mês</span>
                  </div>
                </div>

                {/* Limits */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="text-center p-3 rounded-lg bg-surface/50">
                    <p className="font-display text-lg font-bold text-white">
                      {plan.checkpointLimit === -1 ? '∞' : plan.checkpointLimit}
                    </p>
                    <p className="text-xs text-gray-500">Checkpoints</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-surface/50">
                    <p className="font-display text-lg font-bold text-white">
                      {plan.eventsPerMonth === -1 ? '∞' : plan.eventsPerMonth}
                    </p>
                    <p className="text-xs text-gray-500">Eventos/mês</p>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature: string, i: number) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                      <Check size={14} style={{ color: plan.color }} className="shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* Client count */}
                <div className="text-center pt-4 border-t border-border">
                  <p className="text-sm text-gray-500">
                    <span className="font-semibold text-white">{planClients.filter(c => c.plan === plan.id).length}</span> clientes ativos
                  </p>
                </div>
              </Card>
            ))}
          </div>

          {/* Clients per Plan Table */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg text-white">Clientes por Plano</h3>
              <div className="flex gap-2">
                <Button
                  variant={selectedPlan === null ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedPlan(null)}
                >
                  Todos
                </Button>
                {plans.map(plan => (
                  <Button
                    key={plan.id}
                    variant={selectedPlan === plan.id ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setSelectedPlan(plan.id)}
                  >
                    {plan.name}
                  </Button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-gray-400">
                    <th className="text-left py-3 px-4 font-semibold">Cliente</th>
                    <th className="text-left py-3 px-4 font-semibold">Cidade</th>
                    <th className="text-left py-3 px-4 font-semibold">Plano</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Desde</th>
                    <th className="text-right py-3 px-4 font-semibold">Mensalidade</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedPlan ? planClients.filter(c => c.plan === selectedPlan) : planClients).map(client => {
                    const plan = plans.find(p => p.id === client.plan);
                    return (
                      <tr key={client.id} className="border-b border-border/50 hover:bg-surface/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Building2 size={14} className="text-gray-500" />
                            <span className="font-semibold text-white">{client.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <MapPin size={12} className="text-gray-500" />
                            <span className="text-gray-300">{client.city}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={client.plan === 'enterprise' ? 'primary' : client.plan === 'professional' ? 'secondary' : 'muted'}>
                            {client.plan.charAt(0).toUpperCase() + client.plan.slice(1)}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={client.status === 'active' ? 'success' : client.status === 'blocked' ? 'danger' : 'accent'}>
                            {client.status === 'active' ? 'Ativo' : client.status === 'blocked' ? 'Bloqueado' : 'Trial'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-gray-400 font-mono text-xs">{client.since}</td>
                        <td className="py-3 px-4 text-right font-mono text-gray-300">
                          R$ {plan?.price.toLocaleString('pt-BR')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4 pt-4 border-t border-border text-sm text-gray-500">
              {(selectedPlan ? planClients.filter(c => c.plan === selectedPlan) : planClients).length} clientes | Receita: R$ {(selectedPlan ? planClients.filter(c => c.plan === selectedPlan) : planClients).reduce((sum, c) => {
                const plan = plans.find(p => p.id === c.plan);
                return sum + (plan?.price || 0);
              }, 0).toLocaleString('pt-BR')}/mês
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
