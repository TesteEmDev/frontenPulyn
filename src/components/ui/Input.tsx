import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, icon, error, className = '', ...rest }, ref) => {
    const generatedId = React.useId();
    const inputId = rest.id || generatedId;
    const errorId = `${inputId}-error`;
    const describedBy = [rest['aria-describedby'], error ? errorId : null]
      .filter(Boolean)
      .join(' ') || undefined;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-1.5 block text-sm font-body font-semibold text-gray-300">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : rest['aria-invalid']}
            aria-describedby={describedBy}
            className={`
              input-dark w-full rounded-xl border border-white/[0.10] bg-dark-card px-3.5 py-3
              font-body text-white placeholder-gray-500 transition-all duration-200
              focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/15
              disabled:cursor-not-allowed disabled:opacity-50
              ${icon ? 'pl-10' : ''}
              ${error ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20' : ''}
              ${className}
            `}
            {...rest}
          />
        </div>
        {error && (
          <p id={errorId} role="alert" className="mt-1.5 text-xs font-body text-danger-300">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
