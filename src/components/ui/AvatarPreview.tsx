import { memo, useMemo } from 'react';
import { Dices } from 'lucide-react';
import Avatar from './Avatar';
import {
  avatarImageUrl,
  decodeAvatar,
  DEFAULT_AVATAR_CONFIG,
  encodeAvatar,
  isAvatarCode,
  randomAvatarConfig,
} from '@pulyn/avatar';

interface AvatarPreviewProps {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  className?: string;
  /** Ocupa a altura disponível da coluna e ajusta o tamanho da foto a ela (em vez de um tamanho fixo). */
  fill?: boolean;
}

// Foto do personagem em tamanho grande, para ficar separada dos controles do montador (AvatarBuilder),
// por exemplo embaixo dos dados do participante no check-in.
function AvatarPreview({ value, onChange, disabled = false, className = '', fill = false }: AvatarPreviewProps) {
  const config = useMemo(() => decodeAvatar(value) ?? DEFAULT_AVATAR_CONFIG, [value]);
  const isCode = isAvatarCode(value);

  // Modo "fill": a foto ocupa toda a altura disponível e os controles ficam ao lado dela
  if (fill) {
    return (
      <div className={`flex h-full min-h-0 flex-row items-center gap-4 rounded-2xl border border-cyan-300/20 bg-black/20 p-3 ${className}`}>
        <div className="flex h-full min-h-0 shrink-0 items-center">
          {isCode ? (
            <img
              src={avatarImageUrl(config)}
              alt="Personagem do participante"
              className="aspect-square h-full max-h-full rounded-full border-4 border-white/70 object-cover shadow-[0_0_24px_rgba(217,70,239,0.45)]"
            />
          ) : (
            <div className="aspect-square h-full max-h-full overflow-hidden rounded-full border-4 border-white/70 shadow-[0_0_24px_rgba(217,70,239,0.45)] [&>div]:!h-full [&>div]:!w-full [&>div]:!rounded-none">
              <Avatar emoji={value} size="xl" shape="square" decorative />
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Pré-visualização</p>
          {!isCode && <p className="text-xs text-gray-400">Escolha uma peça ao lado para criar um personagem novo.</p>}
          <button
            type="button"
            onClick={() => onChange(encodeAvatar(randomAvatarConfig()))}
            disabled={disabled}
            className="flex w-full max-w-[260px] items-center justify-center gap-2 rounded-xl border border-cyan-300/40 bg-cyan-300/10 px-4 py-3 text-sm font-bold text-cyan-100 transition hover:bg-cyan-300/20 active:scale-95 disabled:opacity-50"
          >
            <Dices className="h-4 w-4 shrink-0" aria-hidden="true" />
            Surpreenda-me
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center rounded-2xl border border-cyan-300/20 bg-black/20 gap-3 p-4 ${className}`}>
      <p className="shrink-0 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Pré-visualização</p>
      <div className={fill ? 'flex min-h-0 w-full flex-1 items-center justify-center' : 'aspect-square w-full max-w-[260px]'}>
        {isCode ? (
          <img
            src={avatarImageUrl(config)}
            alt="Personagem do participante"
            className={fill ? 'aspect-square h-full max-h-full max-w-full rounded-3xl border-4 border-cyan-300/40 shadow-lg' : 'h-full w-full rounded-3xl border-4 border-cyan-300/40 shadow-lg'}
          />
        ) : (
          // Cadastro antigo com personagem pronto: mostra o atual até trocar a primeira peça.
          <div className={`overflow-hidden rounded-3xl border-4 border-cyan-300/40 shadow-lg [&>div]:!h-full [&>div]:!w-full [&>div]:!rounded-none ${fill ? 'aspect-square h-full max-h-full max-w-full' : 'h-full w-full'}`}>
            <Avatar emoji={value} size="xl" shape="square" decorative />
          </div>
        )}
      </div>
      {!isCode && (
        <p className="text-center text-xs text-gray-400">Escolha uma peça ao lado para criar um personagem novo.</p>
      )}
      <button
        type="button"
        onClick={() => onChange(encodeAvatar(randomAvatarConfig()))}
        disabled={disabled}
        className="flex w-full max-w-[260px] shrink-0 items-center justify-center gap-2 rounded-xl border border-cyan-300/40 bg-cyan-300/10 px-4 py-3 text-sm font-bold text-cyan-100 transition hover:bg-cyan-300/20 active:scale-95 disabled:opacity-50"
      >
        <Dices className="h-4 w-4 shrink-0" aria-hidden="true" />
        Surpreenda-me
      </button>
    </div>
  );
}

export default memo(AvatarPreview);
