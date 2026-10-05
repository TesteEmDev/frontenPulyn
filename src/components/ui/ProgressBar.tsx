import React from 'react';

interface ProgressBarProps {
  value: number;
  color?: string;
  className?: string;
  animated?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  color = '#1E9BD7',
  className = '',
  animated = true,
}) => {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div
      className={`
        w-full h-2 rounded-full bg-dark-surface overflow-hidden
        ${className}
      `}
    >
      <div
        className={`
          h-full rounded-full
          ${animated ? 'transition-all duration-500 ease-out' : ''}
        `}
        style={{ width: `${clamped}%`, backgroundColor: color }}
      />
    </div>
  );
};

export default ProgressBar;
