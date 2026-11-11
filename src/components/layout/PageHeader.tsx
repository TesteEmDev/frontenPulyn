import { type ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  /** A partir de qual largura o título e a ação ficam lado a lado (padrão: sm). Use 'lg' quando a ação for larga. */
  stackBelow?: 'sm' | 'lg';
  /** Menos espaço embaixo do cabeçalho, para telas que precisam caber sem rolagem. */
  compact?: boolean;
}

const ROW = {
  sm: 'sm:flex-row sm:items-start sm:justify-between',
  lg: 'lg:flex-row lg:items-start lg:justify-between',
} as const;
const ACTION = { sm: 'sm:w-auto', lg: 'lg:w-auto' } as const;

export default function PageHeader({ title, description, action, icon, stackBelow = 'sm', compact = false }: PageHeaderProps) {
  return (
    <div className={`flex flex-col gap-4 border-b border-white/[0.08] ${compact ? 'mb-4 pb-3' : 'mb-7 pb-5'} ${ROW[stackBelow]}`}>
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary-400/20 bg-primary-500/10 text-primary-300">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="break-words font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1>
          {description && <p className="mt-1.5 text-sm leading-6 text-gray-400">{description}</p>}
        </div>
      </div>
      {action && <div className={`w-full shrink-0 ${ACTION[stackBelow]}`}>{action}</div>}
    </div>
  );
}
