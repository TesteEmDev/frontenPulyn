import { type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

interface BottomNavItem {
  icon: ReactNode;
  label: string;
  path: string;
}

interface BottomNavProps {
  items: BottomNavItem[];
  activePath: string;
}

export default function BottomNav({ items, activePath }: BottomNavProps) {
  const visibleItems = items.slice(0, 5);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-dark-card border-t border-dark-border pb-safe">
      <div className="flex items-stretch justify-around h-16">
        {visibleItems.map((item) => {
          const isActive = activePath === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 transition-colors duration-200 ${
                isActive ? 'text-primary-500' : ''
              }`}
              style={{ color: isActive ? '#1E9BD7' : '#6B8BA4' }}
            >
              <span className="w-6 h-6">{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
