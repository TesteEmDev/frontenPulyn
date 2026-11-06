import {
  LayoutDashboard, Users, CreditCard, Activity, ScrollText, LifeBuoy, BarChart3, Cpu, Watch,
} from 'lucide-react';

// Menu lateral do master, igual em todas as telas dele
export const masterNavItems = [
  { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/master' },
  { icon: <Users size={20} />, label: 'Clientes', path: '/master/clients' },
  { icon: <CreditCard size={20} />, label: 'Planos', path: '/master/plans' },
  { icon: <Cpu size={20} />, label: 'Checkpoints', path: '/master/checkpoints' },
  { icon: <Watch size={20} />, label: 'Pulseiras', path: '/master/pulseiras' },
  { icon: <Activity size={20} />, label: 'Monitoramento', path: '/master/monitoring' },
  { icon: <ScrollText size={20} />, label: 'Logs', path: '/master/logs' },
  { icon: <LifeBuoy size={20} />, label: 'Suporte', path: '/master/support' },
  { icon: <BarChart3 size={20} />, label: 'Analytics', path: '/master/analytics' },
];
