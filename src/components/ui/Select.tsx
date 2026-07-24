import React from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  options: SelectOption[];
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, value, onChange, className = '' }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-1.5 block text-sm font-body font-medium text-gray-300">
            {label}
          </label>
        )}
        <select
          ref={ref}
          value={value}
          onChange={onChange}
          className={`
            input-dark w-full rounded-lg border border-dark-border bg-dark-surface px-3 py-2
            text-white font-body appearance-none
            transition-colors duration-200
            focus:border-[#1E9BD7] focus:outline-none focus:ring-1 focus:ring-[rgba(30,155,215,0.15)]
            ${className}
          `}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-dark-surface text-white">
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
