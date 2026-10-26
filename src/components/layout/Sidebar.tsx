import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut } from 'lucide-react';
import PulynLogo from '../ui/PulynLogo';
import { useAuth, roleLabels } from '../../hooks/useAuth';
import { useBuffetName, useBuffetNameStore, DEFAULT_BUFFET_TITLE } from '../../hooks/useBuffetName';
import { ADMIN_NAV_ITEMS } from './AdminSidebar';
import { RECEPTION_NAV_ITEMS } from './ReceptionSidebar';
import { GAME_MASTER_NAV_ITEMS } from './gameMasterNav';

interface SidebarItem {
  icon: ReactNode;
  label: string;
  path: string;
}

// Menu de cada área. Conta com mais de uma área mostra as outras áreas abaixo do menu atual.
const navegacaoDaArea = (role: string): SidebarItem[] => {
  if (role === 'admin') return ADMIN_NAV_ITEMS;
  if (role === 'reception') return RECEPTION_NAV_ITEMS;
  if (role === 'game_master') return GAME_MASTER_NAV_ITEMS;
  return [];
};

interface SidebarProps {
  items: SidebarItem[];
  activePath: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  title?: string;
  accentColor?: string;
}

export default function Sidebar({
  items,
  activePath,
  collapsed,
  onToggleCollapse,
  accentColor = '#1E9BD7',
}: SidebarProps) {
  const { user, logout, trocarArea } = useAuth();
  const navigate = useNavigate();

  // Áreas extras da conta: aparecem no menu. Clicar em um item troca de área e abre a tela.
  const outrasAreas = (user?.papeis ?? [])
    .filter((role) => role !== user?.role)
    .map((role) => ({ role, items: navegacaoDaArea(role) }))
    .filter((area) => area.items.length > 0);

  // Dropdown de cada área extra. Abre sozinha quando a tela atual é dela.
  const [areasAbertas, setAreasAbertas] = useState<Record<string, boolean>>({});
  const areaEstaAberta = (role: string, items: SidebarItem[]) =>
    areasAbertas[role] ?? items.some((item) => activePath === item.path || activePath.startsWith(`${item.path}/`));
  const alternarArea = (role: string, items: SidebarItem[]) =>
    setAreasAbertas((prev) => ({ ...prev, [role]: !areaEstaAberta(role, items) }));

  const irParaArea = async (role: string, path: string) => {
    const resultado = await trocarArea(role);
    if (resultado.success) {
      navigate(path);
    } else {
      alert(resultado.error || 'Não foi possível abrir essa área');
    }
  };
  // No admin, o nome exibido é o "Nome da unidade" do cadastro do buffet.
  const unitName = useBuffetName(user?.role === 'admin');
  const displayName = user?.role === 'admin' && unitName !== DEFAULT_BUFFET_TITLE ? unitName : user?.name || '';
  const logoUrl = useBuffetNameStore(state => (user?.role === 'admin' && state.empresaId === user.empresaId ? state.logoUrl : ''));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside
      className="flex h-screen shrink-0 flex-col overflow-hidden border-r border-white/[0.08] bg-gradient-to-br from-dark/90 via-dark-card to-dark-surface/80 px-3 py-2.5 shadow-[8px_0_30px_rgba(2,10,24,0.18)] transition-all duration-300 ease-in-out"
      style={{ width: collapsed ? 72 : 256 }}
    >
      {/* Logo */}
      <div className="flex items-center justify-center px-4 h-16 border-b border-dark-border overflow-hidden">
        <PulynLogo size="md" clickable={false} />
      </div>

      {/* User Info */}
      {user && (
        <div className="flex items-center gap-3 px-4 py-3 border-b border-dark-border overflow-hidden">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden text-white font-bold text-sm"
            style={{
              background: logoUrl ? 'rgba(255,255,255,0.08)' : `linear-gradient(135deg, ${accentColor}, #29B6F6)`,
            }}
          >
            {logoUrl ? (
              <img src={logoUrl} alt={`Logo de ${displayName}`} className="h-full w-full object-cover" />
            ) : (
              displayName.charAt(0)
            )}
          </div>
          <div
            className="min-w-0 transition-opacity duration-300"
            style={{ opacity: collapsed ? 0 : 1 }}
          >
            <p className="text-sm font-medium text-white truncate" title={displayName}>{displayName}</p>
            <p className="text-xs truncate" style={{ color: '#6B8BA4' }}>
              {roleLabels[user.role] || user.role}
            </p>
          </div>
        </div>
      )}

      <nav aria-label="Navegação principal" className="flex-1 space-y-1 overflow-y-auto py-4">
        {items.map((item) => {
          const isActive = activePath === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 ${
                isActive
                  ? 'bg-primary-500/10 text-primary-300 shadow-[inset_3px_0_0_currentColor]'
                  : 'text-gray-400 hover:bg-white/[0.05] hover:text-white'
              }`}
              style={{ color: isActive ? accentColor : undefined }}
            >
              <span className="shrink-0">{item.icon}</span>
              <span
                className="whitespace-nowrap transition-opacity duration-300"
                style={{ opacity: collapsed ? 0 : 1 }}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}

        {/* Outras áreas da conta: só com o menu aberto, para não trocar de área por engano */}
        {!collapsed && outrasAreas.map((area) => {
          const aberta = areaEstaAberta(area.role, area.items);
          return (
            <div key={area.role} className="pt-2">
              <button
                onClick={() => alternarArea(area.role, area.items)}
                aria-expanded={aberta}
                className="group w-full flex items-center justify-between rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 transition-colors duration-200 hover:bg-white/[0.04] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60"
              >
                <span>{roleLabels[area.role] || area.role}</span>
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${aberta ? 'rotate-180' : ''}`}
                />
              </button>
              {aberta && (
                <div className="mt-1 ml-4 space-y-0.5 border-l border-white/[0.08] pl-2">
                  {area.items.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => {
                        if (window.confirm(`Trocar para a área "${roleLabels[area.role] || area.role}"?`)) {
                          irParaArea(area.role, item.path);
                        }
                      }}
                      className="w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-gray-400 transition-colors duration-200 hover:bg-white/[0.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60"
                    >
                      <span className="shrink-0">{item.icon}</span>
                      <span className="whitespace-nowrap">{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="p-3 border-t border-dark-border">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors duration-200 hover:bg-dark-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60"
          style={{ color: '#6B8BA4' }}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span
            className="text-sm whitespace-nowrap transition-opacity duration-300"
            style={{ opacity: collapsed ? 0 : 1 }}
          >
            Sair
          </span>
        </button>
      </div>

      {/* Toggle Button */}
      <div className="p-3 border-t border-dark-border">
        <button
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          aria-expanded={!collapsed}
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors duration-200 hover:bg-dark-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60"
          style={{ color: '#6B8BA4' }}
        >
          <svg
            className={`w-5 h-5 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span
            className="text-sm whitespace-nowrap transition-opacity duration-300"
            style={{ opacity: collapsed ? 0 : 1 }}
          >
            Recolher
          </span>
        </button>
      </div>
    </aside>
  );
}
