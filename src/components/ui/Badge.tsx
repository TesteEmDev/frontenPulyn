import React from 'react';

type BadgeVariant = 'primary' | 'secondary' | 'accent' | 'success' | 'danger' | 'warning' | 'muted';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  primary: 'bg-primary-500/20 text-primary-500',
  secondary: 'bg-secondary-500/20 text-secondary-500',
  accent: 'bg-accent-500/20 text-accent-500',
  success: 'bg-success-500/20 text-success-500',
  danger: 'bg-danger-500/20 text-danger-500',
  warning: 'bg-warning-500/20 text-warning-500',
  muted: 'bg-gray-500/20 text-gray-400',
};

const Badge: React.FC<BadgeProps> = ({
  variant = 'primary',
  children,
  className = '',
}) => {
  return (
    <span
      className={`
        inline-flex items-center rounded-full px-2.5 py-0.5
        text-xs font-body font-semibold
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
};

export default Badge;
