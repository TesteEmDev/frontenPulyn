import React from 'react';

type CardVariant = 'default' | 'glow' | 'secondary';

interface CardProps {
  variant?: CardVariant;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const variantClasses: Record<CardVariant, string> = {
  default: 'bg-dark-card border-dark-border',
  glow: 'bg-dark-card border-primary-500/50 shadow-[0_0_30px_rgba(30,155,215,0.3)]',
  secondary: 'bg-dark-card border-secondary-500/50 shadow-[0_0_30px_rgba(76,175,80,0.15)]',
};

const Card: React.FC<CardProps> = ({
  variant = 'default',
  children,
  className = '',
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        rounded-xl border p-4 transition-all duration-200
        ${variantClasses[variant]}
        ${onClick ? 'cursor-pointer hover:border-primary-500/70' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default Card;
