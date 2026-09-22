import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'accent' | 'warning';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-primary-500 to-lightblue-400 text-white hover:shadow-[0_0_20px_rgba(30,155,215,0.5)]',
  secondary:
    'bg-secondary-500 text-white hover:bg-secondary-600 hover:shadow-[0_0_20px_rgba(76,175,80,0.4)]',
  success:
    'bg-success-500 text-white hover:bg-success-600 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]',
  danger:
    'bg-danger-500 text-white hover:bg-danger-600 hover:shadow-[0_0_20px_rgba(229,57,53,0.4)]',
  ghost:
    'bg-transparent text-primary-500 hover:bg-dark-surface hover:text-white',
  accent:
    'bg-accent-500 text-dark hover:bg-accent-600 hover:shadow-[0_0_20px_rgba(245,166,35,0.4)]',
  warning:
    'bg-warning-500 text-dark hover:bg-warning-600 hover:shadow-[0_0_20px_rgba(245,166,35,0.4)]',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  disabled,
  className = '',
  type = 'button',
  onClick,
  ...rest
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center rounded-xl font-body font-semibold
        min-h-10 border border-white/10
        transition-all duration-200 ease-out
        focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2 focus:ring-offset-dark
        active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none
        hover:-translate-y-0.5
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      {...rest}
    >
      {children}
    </button>
  );
};

export default Button;
