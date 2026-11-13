import React, { useEffect, useMemo, useState } from 'react';
import {
  findAdventurerAvatar,
  getAvatarLabel,
  getDefaultAvatar,
} from '../../avatar/adventurerAvatars';
import { avatarCodeImageUrl } from '@pulyn/avatar';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';
type AvatarShape = 'circle' | 'square';

interface AvatarProps {
  emoji?: string;
  avatar?: string;
  value?: string;
  size?: AvatarSize;
  shape?: AvatarShape;
  bgColor?: string;
  alt?: string;
  decorative?: boolean;
  loading?: 'eager' | 'lazy';
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-lg',
  lg: 'h-14 w-14 text-2xl',
  xl: 'h-20 w-20 text-4xl',
};

const shapeClasses: Record<AvatarShape, string> = {
  circle: 'rounded-full',
  square: 'rounded-2xl',
};

const isLegacyEmoji = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= 4 && value.split('').some(character => character.charCodeAt(0) > 127);

const Avatar: React.FC<AvatarProps> = ({
  emoji,
  avatar,
  value,
  size = 'md',
  shape = 'circle',
  bgColor = 'bg-primary-500/30',
  alt,
  decorative = false,
  loading = 'eager',
}) => {
  const resolvedValue = value ?? avatar ?? emoji ?? null;
  const knownAvatar = findAdventurerAvatar(resolvedValue);
  const fallbackAvatar = getDefaultAvatar();
  const legacyEmoji = isLegacyEmoji(resolvedValue) ? resolvedValue : null;
  // Avatar montado pela criança (código pulyn1-...): o desenho é refeito a partir do código.
  const customSource = useMemo(() => avatarCodeImageUrl(resolvedValue), [resolvedValue]);
  const preferredSource = customSource || knownAvatar?.src || fallbackAvatar.src;
  const [imageSource, setImageSource] = useState(preferredSource);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageSource(preferredSource);
    setImageFailed(false);
  }, [preferredSource]);

  const accessibleLabel = alt || (customSource
    ? 'Avatar personalizado'
    : knownAvatar ? getAvatarLabel(knownAvatar.id) : legacyEmoji ? 'Avatar legado' : 'Avatar padrão');

  return (
    <div
      className={`inline-flex items-center justify-center overflow-hidden font-body select-none ${shapeClasses[shape]} ${sizeClasses[size]} ${bgColor}`}
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
          loading={loading}
          decoding="async"
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

export default React.memo(Avatar);
