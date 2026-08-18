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

export default function AvatarSelector({
  value,
  onChange,
  disabled = false,
  className = '',
  compact = false,
}: AvatarSelectorProps) {
  const selectedValue = ADVENTURER_AVATARS.some(option => option.id === value)
    ? value
    : DEFAULT_AVATAR_ID;

  return (
    <div className={className} role="group" aria-label="Escolha seu avatar">
      <div className={`grid gap-2 ${compact ? 'grid-cols-4 sm:grid-cols-5' : 'grid-cols-4 sm:grid-cols-5 md:grid-cols-10'}`}>
        {ADVENTURER_AVATARS.map(option => {
          const selected = selectedValue === option.id;
          return (
            <button
              key={option.id}
              type="button"
              disabled={disabled}
              aria-label={`Escolher ${getAvatarLabel(option.id)}`}
              aria-pressed={selected}
              onClick={() => onChange(option.id)}
              className={`group flex min-h-[76px] flex-col items-center justify-center gap-1 rounded-xl border p-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-50 ${
                selected
                  ? 'border-primary bg-primary/20 shadow-[0_0_18px_rgba(139,92,246,0.25)] ring-2 ring-primary/40'
                  : 'border-white/10 bg-black/10 hover:border-primary/60 hover:bg-primary/10'
              }`}
            >
              <Avatar emoji={option.id} size={compact ? 'sm' : 'md'} decorative />
              <span className={`text-[10px] ${selected ? 'font-semibold text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>
                {String(option.label).replace('Avatar ', '')}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
