import { Check } from 'lucide-react';
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
  /** Tela só de avatar: mais colunas e altura maior, usando a largura toda. */
  wide?: boolean;
  /** Avatares que outro participante do evento já usa: aparecem apagados e não podem ser escolhidos. */
  indisponiveis?: readonly string[];
}

function AvatarSelector({
  value,
  onChange,
  disabled = false,
  className = '',
  compact = false,
  wide = false,
  indisponiveis = [],
}: AvatarSelectorProps) {
  const selectedValue = ADVENTURER_AVATARS.some(option => option.id === value)
    ? value
    : DEFAULT_AVATAR_ID;

  const scrollClasses = wide
    ? 'max-h-[50dvh] sm:max-h-[55dvh]'
    : compact
    ? 'max-h-[260px] sm:max-h-[340px] xl:max-h-[420px]'
    : 'max-h-[420px] sm:max-h-[520px]';
  const gridClasses = wide
    ? 'grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 lg:grid-cols-5'
    : `grid-cols-2 ${compact ? 'gap-2 sm:gap-4' : 'gap-4'}`;

  return (
    <div className={className} role="group" aria-label="Escolha seu avatar">
      <div className={`overflow-y-auto overscroll-contain pr-2 scrollbar-thin scrollbar-thumb-primary/50 scrollbar-track-white/5 ${scrollClasses}`}>
        <div className={`grid px-1 py-2 ${gridClasses}`}>
          {ADVENTURER_AVATARS.map((option, index) => {
            const selected = selectedValue === option.id;
            const tilt = index % 2 === 0 ? '-rotate-2' : 'rotate-2';
            const emUso = !selected && indisponiveis.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                disabled={disabled || emUso}
                aria-label={emUso ? `${getAvatarLabel(option.id)} (já escolhido por outro participante)` : `Escolher ${getAvatarLabel(option.id)}`}
                aria-pressed={selected}
                onClick={() => onChange(option.id)}
                className={`group relative flex aspect-square w-full transform-gpu flex-col items-center justify-center gap-3 rounded-2xl border p-3 transition-all duration-200 ${tilt} hover:rotate-0 hover:scale-[1.03] focus-visible:rotate-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-50 ${
                  selected
                    ? 'border-primary bg-primary/20 shadow-[0_0_22px_rgba(139,92,246,0.3)] ring-2 ring-primary/40'
                    : emUso
                      ? 'border-white/5 bg-black/20 opacity-40 grayscale'
                      : 'border-white/10 bg-black/10 hover:border-primary/60 hover:bg-primary/10'
                }`}
              >
                <Avatar emoji={option.id} size="xl" shape="square" loading="lazy" decorative />
                {emUso && (
                  <span className="absolute inset-x-2 bottom-2 rounded-full bg-black/70 px-2 py-0.5 text-center text-xs font-semibold text-gray-200">Em uso</span>
                )}
                {selected && (
                  <span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white/80 bg-primary text-white shadow-lg" aria-hidden="true">
                    <Check size={18} strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default memo(AvatarSelector);
