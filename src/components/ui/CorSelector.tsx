import { Check } from 'lucide-react';
import { CORES_PARTICIPANTE } from '../../utils/coresParticipante';

interface CorSelectorProps {
  value: string;
  onChange: (cor: string) => void;
  disabled?: boolean;
  className?: string;
  /** Cores que outro participante do evento já usa: aparecem cinza e não podem ser escolhidas. */
  indisponiveis?: readonly string[];
}

// Escolha da cor do participante (a cor dele no mapa e no ranking dos jogos individuais).
export default function CorSelector({ value, onChange, disabled = false, className = '', indisponiveis = [] }: CorSelectorProps) {
  const usadas = new Set(indisponiveis.map((cor) => cor.toUpperCase()));
  return (
    <div className={className} role="group" aria-label="Escolha a sua cor">
      <div className="flex flex-wrap gap-3">
        {CORES_PARTICIPANTE.map((cor) => {
          const selecionada = value.toUpperCase() === cor.hex;
          const emUso = !selecionada && usadas.has(cor.hex);
          return (
            <button
              key={cor.hex}
              type="button"
              disabled={disabled || emUso}
              aria-pressed={selecionada}
              aria-label={emUso ? `${cor.nome} (já escolhida por outro participante)` : `Escolher a cor ${cor.nome}`}
              title={emUso ? `${cor.nome}: em uso` : cor.nome}
              onClick={() => onChange(cor.hex)}
              className={`relative flex h-12 w-12 items-center justify-center rounded-full border-4 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed sm:h-14 sm:w-14 ${
                selecionada ? 'scale-110 border-white shadow-[0_0_18px_rgba(255,255,255,0.45)]' : 'border-white/20 hover:scale-105'
              }`}
              style={{ backgroundColor: cor.hex }}
            >
              {selecionada && <Check size={22} strokeWidth={3} className="text-white drop-shadow" aria-hidden="true" />}
              {emUso && <span className="absolute inset-0 rounded-full bg-gray-500/75 backdrop-grayscale" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
