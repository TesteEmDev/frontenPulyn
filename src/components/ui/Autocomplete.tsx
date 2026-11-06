import { useEffect, useId, useMemo, useRef, useState } from 'react';
import Input from './Input';

export interface OpcaoAutocomplete {
  // O que fica no campo ao escolher
  valor: string;
  // O que a lista mostra (padrão: o valor)
  rotulo?: string;
}

interface AutocompleteProps {
  label: string;
  value: string;
  onChange: (texto: string) => void;
  // Chamado ao escolher uma sugestão (clique ou Enter)
  onSelect?: (opcao: OpcaoAutocomplete) => void;
  opcoes: OpcaoAutocomplete[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  maxLength?: number;
  // Quantas sugestões aparecem de uma vez
  limite?: number;
  // Texto que o campo mostra quando não há sugestão para o que foi digitado
  semResultado?: string;
}

// Sem acento e sem maiúscula: "sao" encontra "São Paulo"
export const semAcento = (texto: string) => texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

// Campo com lista de sugestões que filtra enquanto se digita (início do nome primeiro, depois qualquer parte).
// Navega com as setas, escolhe com Enter e fecha com Esc.
export default function Autocomplete({
  label, value, onChange, onSelect, opcoes, placeholder, error, disabled, maxLength, limite = 8, semResultado = 'Nada encontrado',
}: AutocompleteProps) {
  const [aberto, setAberto] = useState(false);
  const [ativa, setAtiva] = useState(0);
  const raiz = useRef<HTMLDivElement>(null);
  const idLista = useId();

  const sugestoes = useMemo(() => {
    const busca = semAcento(value);
    const rotulos = opcoes.map((opcao) => ({ opcao, texto: semAcento(opcao.rotulo ?? opcao.valor) }));
    if (!busca) return rotulos.slice(0, limite).map((item) => item.opcao);
    const comeca = rotulos.filter((item) => item.texto.startsWith(busca));
    const contem = rotulos.filter((item) => !item.texto.startsWith(busca) && item.texto.includes(busca));
    return [...comeca, ...contem].slice(0, limite).map((item) => item.opcao);
  }, [value, opcoes, limite]);

  useEffect(() => { setAtiva(0); }, [value]);

  // Clicar fora fecha a lista
  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (evento: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(evento.target as Node)) setAberto(false);
    };
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, [aberto]);

  const escolher = (opcao: OpcaoAutocomplete) => {
    onChange(opcao.valor);
    onSelect?.(opcao);
    setAberto(false);
  };

  const aoTeclar = (evento: React.KeyboardEvent<HTMLInputElement>) => {
    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      setAberto(true);
      setAtiva((atual) => Math.min(atual + 1, Math.max(sugestoes.length - 1, 0)));
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      setAtiva((atual) => Math.max(atual - 1, 0));
    } else if (evento.key === 'Enter' && aberto && sugestoes[ativa]) {
      evento.preventDefault();
      escolher(sugestoes[ativa]);
    } else if (evento.key === 'Escape' && aberto) {
      evento.stopPropagation();
      setAberto(false);
    }
  };

  return (
    <div ref={raiz} className="relative w-full">
      <Input
        label={label}
        value={value}
        onChange={(e) => { onChange(e.target.value); setAberto(true); }}
        onFocus={() => setAberto(true)}
        onKeyDown={aoTeclar}
        placeholder={placeholder}
        error={error}
        disabled={disabled}
        maxLength={maxLength}
        autoComplete="off"
        role="combobox"
        aria-expanded={aberto}
        aria-controls={idLista}
        aria-autocomplete="list"
      />
      {aberto && !disabled && (
        <ul
          id={idLista}
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-1 max-h-60 overflow-y-auto rounded-xl border border-white/10 bg-dark-card py-1 shadow-xl"
        >
          {sugestoes.length === 0 ? (
            <li className="px-3.5 py-2 text-sm text-gray-500">{semResultado}</li>
          ) : sugestoes.map((opcao, indice) => (
            <li
              key={opcao.valor}
              role="option"
              aria-selected={indice === ativa}
              onMouseDown={(evento) => { evento.preventDefault(); escolher(opcao); }}
              onMouseEnter={() => setAtiva(indice)}
              className={`cursor-pointer px-3.5 py-2 text-sm ${indice === ativa ? 'bg-primary/20 text-white' : 'text-gray-300'}`}
            >
              {opcao.rotulo ?? opcao.valor}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
