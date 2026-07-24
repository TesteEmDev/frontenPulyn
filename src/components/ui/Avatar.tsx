import React from 'react';

type AvatarSize = 'sm' | 'md' | 'lg';

interface AvatarProps {
  emoji: string;
  size?: AvatarSize;
  bgColor?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-lg',
  lg: 'w-14 h-14 text-2xl',
};

const Avatar: React.FC<AvatarProps> = ({
  emoji,
  size = 'md',
  bgColor = 'bg-primary-500/30',
}) => {
  return (
    <div
      className={`
        inline-flex items-center justify-center rounded-full
        font-body select-none
        ${sizeClasses[size]}
        ${bgColor}
      `}
    >
      {emoji}
    </div>
  );
};

export default Avatar;
