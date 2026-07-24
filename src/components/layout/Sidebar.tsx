import { type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import PulynLogo from '../ui/PulynLogo';
import { useAuth, roleLabels } from '../../hooks/useAuth';

interface SidebarItem {
  icon: ReactNode;
  label: string;
  path: string;
}

interface SidebarProps {
  items: SidebarItem[];
  activePath: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  accentColor?: string;
}

export default function Sidebar({
  items,
  activePath,
  collapsed,
  onToggleCollapse,
  accentColor = '#1E9BD7',
}: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside
      className="flex flex-col h-screen overflow-hidden bg-dark-sidebar border-r border-dark-border transition-all duration-300 ease-in-out shrink-0"
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
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-sm"
            style={{
              background: `linear-gradient(135deg, ${accentColor}, #29B6F6)`,
            }}
          >
            {user.name.charAt(0)}
          </div>
          <div
            className="min-w-0 transition-opacity duration-300"
            style={{ opacity: collapsed ? 0 : 1 }}
          >
            <p className="text-sm font-medium text-white truncate">{user.name}</p>
            <p className="text-xs truncate" style={{ color: '#6B8BA4' }}>
              {roleLabels[user.role] || user.role}
            </p>
          </div>
        </div>
      )}

      {/* Navigation Items */}
      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {items.map((item) => {
          const isActive = activePath === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-r-lg transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 ${
                isActive
                  ? 'bg-dark-surface text-primary-500'
                  : 'hover:bg-dark-hover'
              }`}
              style={{
                borderLeft: isActive ? `3px solid ${accentColor}` : '3px solid transparent',
                color: isActive ? accentColor : '#6B8BA4',
              }}
            >
              <span className={`shrink-0 ${isActive ? '' : ''}`}>
                {item.icon}
              </span>
              <span
                className="whitespace-nowrap transition-opacity duration-300"
                style={{ opacity: collapsed ? 0 : 1 }}
              >
                {item.label}
              </span>
            </NavLink>
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
