// components/ui/VirtualKeyboardOtimizado.tsx - VERSÃO OTIMIZADA
import { memo, useCallback } from 'react';

// Constantes pré-definidas para evitar recálculos
const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
] as const;

// Memoize cada botão individualmente
const KeyButton = memo(({ 
  keyValue, 
  onKeyPress, 
  disabled 
}: { 
  keyValue: string; 
  onKeyPress: (key: string) => void; 
  disabled: boolean; 
}) => {
  const handleClick = useCallback(() => {
    if (!disabled) {
      onKeyPress(keyValue);
    }
  }, [keyValue, onKeyPress, disabled]);
  
  const isSpecialKey = keyValue === '⌫' || keyValue === 'ESPAÇO';
  const specialClass = keyValue === '⌫' 
    ? 'border-rose-200/25 from-rose-400/25 to-rose-600/20 hover:border-rose-200/50 hover:bg-rose-400/30'
    : 'border-fuchsia-200/20 from-purple-400/25 to-purple-600/20 hover:border-fuchsia-200/50 hover:from-fuchsia-400/30 hover:to-purple-500/30';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      className={`
        h-10 min-w-[28px] flex-1 rounded-xl border px-1 text-sm font-bold text-white 
        shadow-[0_3px_0_rgba(91,33,182,0.65)] transition-all duration-150 
        active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-40 
        sm:h-11 sm:text-base
        ${isSpecialKey 
          ? specialClass 
          : 'border-fuchsia-200/20 bg-gradient-to-b from-purple-400/25 to-purple-600/20 hover:border-fuchsia-200/50 hover:from-fuchsia-400/30 hover:to-purple-500/30'
        }
      `}
    >
      {keyValue}
    </button>
  );
});

KeyButton.displayName = 'KeyButton';

// Componente de linha otimizado
const KeyboardRow = memo(({ 
  keys, 
  onKeyPress, 
  disabled 
}: { 
  keys: readonly string[]; 
  onKeyPress: (key: string) => void; 
  disabled: boolean; 
}) => (
  <div className="flex justify-center gap-1.5">
    {keys.map(key => (
      <KeyButton
        key={key}
        keyValue={key}
        onKeyPress={onKeyPress}
        disabled={disabled}
      />
    ))}
  </div>
));

KeyboardRow.displayName = 'KeyboardRow';

interface VirtualKeyboardOtimizadoProps {
  onKeyPress: (key: string) => void;
  disabled?: boolean;
  compact?: boolean;
}

export default function VirtualKeyboardOtimizado({ 
  onKeyPress, 
  disabled = false,
  compact = false 
}: VirtualKeyboardOtimizadoProps) {
  const handleKeyPress = useCallback((key: string) => {
    onKeyPress(key);
  }, [onKeyPress]);

  return (
    <div className={`space-y-2 rounded-2xl border border-white/[0.06] bg-black/15 p-2 sm:p-3 ${compact ? 'scale-95' : ''}`}>
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <KeyboardRow
          key={`row-${rowIndex}`}
          keys={row}
          onKeyPress={handleKeyPress}
          disabled={disabled}
        />
      ))}
      <div className="flex gap-1.5">
        <KeyButton
          keyValue="⌫"
          onKeyPress={handleKeyPress}
          disabled={disabled}
        />
        <KeyButton
          keyValue="ESPAÇO"
          onKeyPress={handleKeyPress}
          disabled={disabled}
        />
      </div>
    </div>
  );
}