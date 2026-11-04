import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ChevronDown, Loader2, LogOut } from 'lucide-react';
import PulynLogo from '../ui/PulynLogo';
import { useAuth, roleLabels } from '../../hooks/useAuth';
import { useBuffetName, useBuffetNameStore, DEFAULT_BUFFET_TITLE } from '../../hooks/useBuffetName';
import { itensDoAdmin } from './AdminSidebar';
import { RECEPTION_NAV_ITEMS } from './ReceptionSidebar';
import { GAME_MASTER_NAV_ITEMS } from './gameMasterNav';

interface SidebarItem {
  icon: ReactNode;
  label: string;
  path: string;
}

// Cor de identificação de cada área no menu.
const AREA_COR: Record<string, string> = {
  admin: '#1E9BD7',
  reception: '#A78BFA',
  game_master: '#F59E0B',
};

// Cor do destaque do menu da área principal da conta (a mesma que a tela de cada área usa).
const AREA_DESTAQUE: Record<string, string> = {
  admin: '#1E9BD7',
  reception: '#F59E0B',
  game_master: '#06B6D4',
};

// Menu de cada área. Conta com mais de uma área mostra o menu da área principal e, abaixo, as outras áreas.
const navegacaoDaArea = (role: string, plan?: string): SidebarItem[] => {
  if (role === 'admin') return itensDoAdmin(plan);
  if (role === 'reception') return RECEPTION_NAV_ITEMS;
  if (role === 'game_master') return GAME_MASTER_NAV_ITEMS;
  return [];
};

// Cada tela monta o próprio menu, então ele nasce de novo a cada troca de tela. O que o usuário já fez nele (até onde
// rolou e quais áreas abriu ou fechou) fica guardado aqui para a próxima tela montar o menu do mesmo jeito.
let rolagemDoMenu = 0;
const areasAbertasDoMenu: Record<string, boolean> = {};

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
  const { user, logout, trocarArea, atualizarAreas } = useAuth();
  const navigate = useNavigate();

  // Só a equipe acumula áreas. Quem ganhou uma área nova vê o menu mudar ao abrir a tela ou voltar para a aba,
  // sem sair e entrar de novo.
  const papelAtual = user?.role;
  useEffect(() => {
    if (papelAtual !== 'admin' && papelAtual !== 'reception' && papelAtual !== 'game_master') return;
    atualizarAreas();
    const aoVoltar = () => { if (document.visibilityState === 'visible') atualizarAreas(); };
    document.addEventListener('visibilitychange', aoVoltar);
    window.addEventListener('focus', aoVoltar);
    return () => {
      document.removeEventListener('visibilitychange', aoVoltar);
      window.removeEventListener('focus', aoVoltar);
    };
  }, [papelAtual, atualizarAreas]);

  // Conta com mais de uma área: o menu é sempre o da área principal (a primeira da conta, ex.: recepção), em qualquer tela,
  // e as outras áreas ficam abaixo, para abrir e fechar. Entrar numa tela de outra área não troca o menu.
  const papeis = user?.papeis ?? [];
  const variasAreas = papeis.length > 1;
  const areaPrincipal = variasAreas ? papeis[0] : user?.role ?? '';
  const itensPrincipais = variasAreas ? navegacaoDaArea(areaPrincipal, user?.plan) : items;
  const destaque = variasAreas ? (AREA_DESTAQUE[areaPrincipal] ?? accentColor) : accentColor;
  const outrasAreas = papeis
    .filter((role) => role !== areaPrincipal)
    .map((role) => ({ role, items: navegacaoDaArea(role, user?.plan) }))
    .filter((area) => area.items.length > 0);

  // Dropdown de cada área extra. Abre sozinha quando a tela atual é dela.
  const [areasAbertas, setAreasAbertas] = useState<Record<string, boolean>>(() => ({ ...areasAbertasDoMenu }));
  const areaEstaAberta = (role: string, items: SidebarItem[]) =>
    areasAbertas[role] ?? items.some((item) => activePath === item.path || activePath.startsWith(`${item.path}/`));
  const alternarArea = (role: string, items: SidebarItem[]) => {
    const aberta = !areaEstaAberta(role, items);
    areasAbertasDoMenu[role] = aberta;
    setAreasAbertas((prev) => ({ ...prev, [role]: aberta }));
  };

  // Ao trocar de tela o menu volta para onde estava; na primeira vez (ou ao recarregar) mostra o item da tela atual.
  const navRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    if (rolagemDoMenu > 0) {
      nav.scrollTop = rolagemDoMenu;
    } else {
      nav.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest' });
      rolagemDoMenu = nav.scrollTop;
    }
  }, []);

  // Abre uma tela de qualquer área da conta. Se ela é de outra área, antes pede o acesso dessa área (o menu continua o mesmo).
  const [trocando, setTrocando] = useState<string | null>(null);
  const irParaArea = async (role: string, path: string) => {
    if (role === user?.role) {
      navigate(path);
      return;
    }
    setTrocando(`${role}|${path}`);
    const resultado = await trocarArea(role);
    setTrocando(null);
    if (resultado.success) {
      navigate(path);
    } else {
      alert(resultado.error || 'Não foi possível abrir essa área');
    }
  };
  // No admin, o nome exibido é o "Nome da unidade" do cadastro do buffet.
  const unitName = useBuffetName(user?.role === 'admin');
  const displayName = user?.role === 'admin' && areaPrincipal === 'admin' && unitName !== DEFAULT_BUFFET_TITLE ? unitName : user?.name || '';
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
              {roleLabels[areaPrincipal] || areaPrincipal}
            </p>
          </div>
        </div>
      )}

      <nav
        ref={navRef}
        aria-label="Navegação principal"
        className="flex-1 space-y-1 overflow-y-auto py-4"
        onScroll={(e) => { rolagemDoMenu = e.currentTarget.scrollTop; }}
      >
        {itensPrincipais.map((item) => {
          const isActive = activePath === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              // Estando numa tela de outra área, voltar a um item da principal pede o acesso dela antes de abrir
              onClick={variasAreas && user?.role !== areaPrincipal ? (e) => { e.preventDefault(); irParaArea(areaPrincipal, item.path); } : undefined}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 ${
                isActive
                  ? 'bg-primary-500/10 text-primary-300 shadow-[inset_3px_0_0_currentColor]'
                  : 'text-gray-400 hover:bg-white/[0.05] hover:text-white'
              }`}
              style={{ color: isActive ? destaque : undefined }}
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
        {!collapsed && outrasAreas.length > 0 && (
          <div className="mt-5 px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
            Outras áreas
          </div>
        )}
        {!collapsed && outrasAreas.map((area) => {
          const aberta = areaEstaAberta(area.role, area.items);
          const cor = AREA_COR[area.role] || '#1E9BD7';
          return (
            <div key={area.role} className="mt-1">
              <button
                onClick={() => alternarArea(area.role, area.items)}
                aria-expanded={aberta}
                className="group w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors duration-200 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60"
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: cor, boxShadow: `0 0 8px ${cor}` }} />
                <span className="flex-1 text-sm font-medium text-gray-200 group-hover:text-white">
                  {roleLabels[area.role] || area.role}
                </span>
                <span className="rounded-full bg-white/[0.08] px-1.5 py-0.5 text-[10px] tabular-nums text-gray-400">
                  {area.items.length}
                </span>
                <ChevronDown
                  size={14}
                  className={`text-gray-500 transition-transform duration-200 ${aberta ? 'rotate-180' : ''}`}
                />
              </button>
              <div
                className={`grid transition-all duration-200 ease-out ${aberta ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
              >
                <div className="overflow-hidden">
                  <div className="mt-1 ml-3 space-y-0.5 border-l-2 pl-2" style={{ borderColor: `${cor}40` }}>
                    {area.items.map((item) => {
                      const trocandoEste = trocando === `${area.role}|${item.path}`;
                      const itemAtivo = activePath === item.path;
                      return (
                        <button
                          key={item.path}
                          onClick={() => irParaArea(area.role, item.path)}
                          disabled={trocando !== null}
                          aria-current={itemAtivo ? 'page' : undefined}
                          className={`group w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-all duration-200 hover:bg-white/[0.06] hover:text-white disabled:cursor-wait focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 ${itemAtivo ? 'bg-white/[0.06] text-white' : 'text-gray-400'}`}
                          style={itemAtivo ? { color: cor } : undefined}
                        >
                          <span className="shrink-0 transition-transform duration-200 group-hover:scale-110">{item.icon}</span>
                          <span className="flex-1 whitespace-nowrap text-left">{item.label}</span>
                          {trocandoEste && <Loader2 size={14} className="animate-spin" style={{ color: cor }} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
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
