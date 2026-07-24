import { type ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export default function PageHeader({ title, description, action, icon }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        {icon && <span className="mt-1 shrink-0 text-primary-500">{icon}</span>}
        <div className="min-w-0">
          <h1 className="font-display text-2xl text-white break-words">{title}</h1>
          {description && <p className="text-sm mt-1" style={{ color: '#6B8BA4' }}>{description}</p>}
        </div>
      </div>
      {action && <div className="w-full shrink-0 sm:w-auto">{action}</div>}
    </div>
  );
}
