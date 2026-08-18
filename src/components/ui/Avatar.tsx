import React, { useEffect, useState } from 'react';
import {
  findAdventurerAvatar,
  getAvatarLabel,
  getDefaultAvatar,
} from '../../avatar/adventurerAvatars';

type AvatarSize = 'sm' | 'md' | 'lg';

interface AvatarProps {
  emoji?: string;
  avatar?: string;
  value?: string;
  size?: AvatarSize;
  bgColor?: string;
  alt?: string;
  decorative?: boolean;
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-lg',
  lg: 'h-14 w-14 text-2xl',
};

const isLegacyEmoji = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= 4 && value.split('').some(character => character.charCodeAt(0) > 127);

const Avatar: React.FC<AvatarProps> = ({
  emoji,
  avatar,
  value,
  size = 'md',
  bgColor = 'bg-primary-500/30',
  alt,
  decorative = false,
}) => {
  const resolvedValue = value ?? avatar ?? emoji ?? null;
  const knownAvatar = findAdventurerAvatar(resolvedValue);
  const fallbackAvatar = getDefaultAvatar();
  const legacyEmoji = isLegacyEmoji(resolvedValue) ? resolvedValue : null;
  const [imageSource, setImageSource] = useState(knownAvatar?.src || fallbackAvatar.src);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageSource(knownAvatar?.src || fallbackAvatar.src);
    setImageFailed(false);
  }, [knownAvatar?.id, knownAvatar?.src, fallbackAvatar.src]);

  const accessibleLabel = alt || (knownAvatar ? getAvatarLabel(knownAvatar.id) : legacyEmoji ? 'Avatar legado' : 'Avatar padrão');

  return (
    <div
      className={`inline-flex items-center justify-center overflow-hidden rounded-full font-body select-none ${sizeClasses[size]} ${bgColor}`}
      aria-label={decorative ? undefined : accessibleLabel}
      aria-hidden={decorative ? true : undefined}
    >
      {legacyEmoji ? (
        <span aria-hidden={decorative}>{legacyEmoji}</span>
      ) : imageFailed ? (
        <span aria-hidden={decorative}>👤</span>
      ) : (
        <img
          src={imageSource}
          alt={decorative ? '' : accessibleLabel}
          className="h-full w-full object-cover"
          onError={() => {
            if (imageSource !== fallbackAvatar.src) {
              setImageSource(fallbackAvatar.src);
            } else {
              setImageFailed(true);
            }
          }}
        />
      )}
    </div>
  );
};

export default Avatar;
