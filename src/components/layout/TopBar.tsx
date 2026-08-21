import { type ReactNode } from 'react';

interface TopBarProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  onBack?: () => void;
}

export default function TopBar({ title, subtitle, actions, onBack }: TopBarProps) {
  return (
    <div className="sticky top-0 z-20 flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] bg-dark/80 px-4 py-3 backdrop-blur-xl sm:px-6 sm:py-0">
      <div className="flex min-w-0 items-center gap-3">
        {onBack && (
          <button
            aria-label="Voltar"
            onClick={onBack}
            className="p-1.5 rounded-lg hover:text-primary-500 hover:bg-dark-surface transition-colors duration-200"
            style={{ color: '#6B8BA4' }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div className="min-w-0">
          <h1 className="font-display text-lg text-white leading-tight break-words">{title}</h1>
          {subtitle && <p className="text-sm break-words" style={{ color: '#6B8BA4' }}>{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>}
    </div>
  );
}
