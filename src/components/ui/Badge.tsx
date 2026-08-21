import React from 'react';

type BadgeVariant = 'primary' | 'secondary' | 'accent' | 'success' | 'danger' | 'warning' | 'muted';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  primary: 'border-primary-400/20 bg-primary-500/12 text-primary-300',
  secondary: 'border-secondary-400/20 bg-secondary-500/12 text-secondary-300',
  accent: 'border-accent-400/20 bg-accent-500/12 text-accent-300',
  success: 'border-success-400/20 bg-success-500/12 text-success-300',
  danger: 'border-danger-400/20 bg-danger-500/12 text-danger-300',
  warning: 'border-warning-400/20 bg-warning-500/12 text-warning-300',
  muted: 'border-white/10 bg-white/[0.05] text-gray-400',
};

const Badge: React.FC<BadgeProps> = ({
  variant = 'primary',
  children,
  className = '',
}) => {
  return (
    <span
      className={`
        inline-flex items-center rounded-full border px-2.5 py-1
        text-[11px] font-body font-bold uppercase tracking-wide
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
};

export default Badge;
