import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, icon, error, className = '', ...rest }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-1.5 block text-sm font-body font-medium text-gray-300">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`
              input-dark w-full rounded-lg border border-dark-border bg-dark-surface px-3 py-2
              text-white placeholder-gray-500 font-body
              transition-colors duration-200
              focus:border-[#1E9BD7] focus:outline-none focus:ring-1 focus:ring-[rgba(30,155,215,0.15)]
              disabled:opacity-50 disabled:cursor-not-allowed
              ${icon ? 'pl-10' : ''}
              ${error ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/50' : ''}
              ${className}
            `}
            {...rest}
          />
        </div>
        {error && (
          <p className="mt-1 text-xs font-body text-danger-500">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
