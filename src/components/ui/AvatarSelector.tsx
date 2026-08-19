import { memo } from 'react';
import Avatar from './Avatar';
import {
  ADVENTURER_AVATARS,
  DEFAULT_AVATAR_ID,
  getAvatarLabel,
} from '../../avatar/adventurerAvatars';

interface AvatarSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
}

function AvatarSelector({
  value,
  onChange,
  disabled = false,
  className = '',
  compact = false,
}: AvatarSelectorProps) {
  const selectedValue = ADVENTURER_AVATARS.some(option => option.id === value)
    ? value
    : DEFAULT_AVATAR_ID;

  const scrollClasses = compact
    ? 'max-h-[300px] sm:max-h-[340px] xl:max-h-[420px]'
    : 'max-h-[420px] sm:max-h-[520px]';

  return (
    <div className={className} role="group" aria-label="Escolha seu avatar">
      <div className={`overflow-y-auto overscroll-contain pr-2 scrollbar-thin scrollbar-thumb-primary/50 scrollbar-track-white/5 ${scrollClasses}`}>
        <div className="grid grid-cols-2 gap-4 px-1 py-2">
          {ADVENTURER_AVATARS.map((option, index) => {
            const selected = selectedValue === option.id;
            const tilt = index % 2 === 0 ? '-rotate-2' : 'rotate-2';
            return (
              <button
                key={option.id}
                type="button"
                disabled={disabled}
                aria-label={`Escolher ${getAvatarLabel(option.id)}`}
                aria-pressed={selected}
                onClick={() => onChange(option.id)}
                className={`group flex aspect-square w-full transform-gpu flex-col items-center justify-center gap-3 rounded-2xl border p-3 transition-all duration-200 ${tilt} hover:rotate-0 hover:scale-[1.03] focus-visible:rotate-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-50 ${
                  selected
                    ? 'border-primary bg-primary/20 shadow-[0_0_22px_rgba(139,92,246,0.3)] ring-2 ring-primary/40'
                    : 'border-white/10 bg-black/10 hover:border-primary/60 hover:bg-primary/10'
                }`}
              >
                <Avatar emoji={option.id} size="xl" shape="square" loading="lazy" decorative />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default memo(AvatarSelector);
