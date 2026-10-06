import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Users, Gamepad2, MapPin, Map,
  FileText, RefreshCw, Settings
} from 'lucide-react';
import Sidebar from './Sidebar';

// Menu do painel administrativo do buffet. Era duplicado literalmente em
// cada página de /admin (14 arquivos); qualquer mudança de rota ou label
// exigia editar todos. Agora existe em um único lugar.
export const ADMIN_NAV_ITEMS = [
  { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/admin' },
  { icon: <Calendar size={20} />, label: 'Eventos', path: '/admin/events' },
  { icon: <Users size={20} />, label: 'Crianças', path: '/admin/children' },
  { icon: <Gamepad2 size={20} />, label: 'Jogos', path: '/admin/games' },
  { icon: <MapPin size={20} />, label: 'Checkpoints', path: '/admin/checkpoints' },
  { icon: <Map size={20} />, label: 'Mapa', path: '/admin/map' },
  { icon: <Users size={20} />, label: 'Usuários', path: '/admin/users' },
  { icon: <Users size={20} />, label: 'Times', path: '/admin/teams' },
  { icon: <FileText size={20} />, label: 'Relatórios', path: '/admin/reports' },
  { icon: <RefreshCw size={20} />, label: 'Sincronização', path: '/admin/sync' },
  { icon: <Settings size={20} />, label: 'Configurações', path: '/admin/settings' },
];

interface AdminSidebarProps {
  // Só precisa ser passado quando a rota da página não bate com o pathname
  // atual (ex.: uma tela de edição em "/admin/games/:id" que deve destacar
  // "/admin/games" no menu).
  activePath?: string;
}

export default function AdminSidebar({ activePath }: AdminSidebarProps) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Sidebar
      items={ADMIN_NAV_ITEMS}
      activePath={activePath ?? location.pathname}
      collapsed={collapsed}
      onToggleCollapse={() => setCollapsed((prev) => !prev)}
      title="Pulyn Admin"
      accentColor="#1E9BD7"
    />
  );
}
