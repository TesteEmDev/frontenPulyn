import React from 'react';

type CardVariant = 'default' | 'glow' | 'secondary';

interface CardProps {
  variant?: CardVariant;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const variantClasses: Record<CardVariant, string> = {
  default: 'border-white/[0.08] bg-gradient-to-br from-dark-card to-dark-surface/60 shadow-[0_10px_30px_rgba(2,10,24,0.12)]',
  glow: 'border-primary-500/35 bg-gradient-to-br from-dark-card to-primary-900/20 shadow-[0_12px_36px_rgba(30,155,215,0.14)]',
  secondary: 'border-secondary-500/30 bg-gradient-to-br from-dark-card to-secondary-900/15 shadow-[0_12px_36px_rgba(76,175,80,0.10)]',
};

const Card: React.FC<CardProps> = ({
  variant = 'default',
  children,
  className = '',
  onClick,
}) => {
  const interactive = Boolean(onClick);

  return (
    <div
      onClick={onClick}
      onKeyDown={(event) => {
        if (interactive && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onClick?.();
        }
      }}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      className={`
        rounded-2xl border p-5 backdrop-blur-sm transition-all duration-200
        ${variantClasses[variant]}
        ${interactive ? 'cursor-pointer hover:-translate-y-0.5 hover:border-primary-400/60 hover:shadow-[0_16px_40px_rgba(30,155,215,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default Card;
