import React from 'react';

type StatusType = 'online' | 'offline' | 'warning' | 'configured';

interface StatusDotProps {
  status: StatusType;
  size?: 'sm' | 'md' | 'lg';
}

const statusClasses: Record<StatusType, string> = {
  online: 'bg-success-500 animate-pulse',
  offline: 'bg-danger-500',
  warning: 'bg-warning-500',
  configured: 'bg-primary-500',
};

const sizeClasses: Record<string, string> = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

const StatusDot: React.FC<StatusDotProps> = ({ status, size = 'md' }) => {
  return (
    <span
      className={`
        inline-block rounded-full
        ${sizeClasses[size]}
        ${statusClasses[status]}
      `}
    />
  );
};

export default StatusDot;
