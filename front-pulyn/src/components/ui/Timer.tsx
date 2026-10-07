import React from 'react';

interface TimerProps {
  seconds: number;
  className?: string;
}

const Timer: React.FC<TimerProps> = ({ seconds, className = '' }) => {
  const mins = Math.floor(Math.abs(seconds) / 60);
  const secs = Math.abs(seconds) % 60;
  const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const isUrgent = seconds < 60;

  return (
    <span
      className={`
        font-mono text-2xl font-bold tracking-wider
        transition-colors duration-300
        ${isUrgent ? 'text-danger-500 animate-pulse' : 'text-primary-500'}
        ${className}
      `}
    >
      {seconds < 0 ? '-' : ''}
      {formatted}
    </span>
  );
};

export default Timer;
