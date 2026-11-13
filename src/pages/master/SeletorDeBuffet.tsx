import { useMemo, useState } from 'react';
import type { BuffetOpcao } from '../../services/api';
import Input from '../../components/ui/Input';

const semAcento = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

interface Props {
  buffets: BuffetOpcao[];
  // empresaId escolhido ('' = nenhum)
  valor: string;
  onChange: (empresaId: string) => void;
  // Para ligar o rótulo ao campo
  id?: string;
}

// Busca e escolha de um buffet (nome ou cidade), usada nas telas em que o master envia algo a um cliente.
export default function SeletorDeBuffet({ buffets, valor, onChange, id = 'seletor-buffet' }: Props) {
  const [busca, setBusca] = useState('');

  const filtrados = useMemo(() => {
    const termos = semAcento(busca).split(/\s+/).filter(Boolean);
    if (termos.length === 0) return buffets;
    return buffets.filter((b) => {
      const alvo = semAcento(`${b.nome} ${b.cidade || ''} ${b.estado || ''}`);
      return termos.every((termo) => alvo.includes(termo));
    });
  }, [buffets, busca]);

  const escolhido = buffets.find((b) => b.empresaId === valor);

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-body font-semibold text-gray-300">Buffet</label>
      <Input
        id={id}
        autoComplete="off"
        placeholder="Digite o nome ou a cidade do buffet"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && filtrados.length > 0) {
            e.preventDefault();
            onChange(filtrados[0].empresaId);
          }
        }}
      />
      <ul role="listbox" aria-label="Buffets" className="mt-2 max-h-60 overflow-y-auto rounded-lg border border-white/10 bg-dark-card/60">
        {filtrados.map((b) => {
          const ativo = b.empresaId === valor;
          return (
            <li key={b.empresaId} role="option" aria-selected={ativo}>
              <button
                type="button"
                onClick={() => onChange(b.empresaId)}
                className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors ${ativo ? 'bg-primary/20 text-white' : 'text-gray-300 hover:bg-white/5'}`}
              >
                <span className="truncate font-semibold">{b.nome}</span>
                <span className="shrink-0 text-xs text-gray-500">{b.cidade ? `${b.cidade}${b.estado ? `/${b.estado}` : ''}` : ''}</span>
              </button>
            </li>
          );
        })}
        {filtrados.length === 0 && <li className="px-3 py-4 text-center text-sm text-gray-500">Nenhum buffet encontrado</li>}
      </ul>
      {escolhido && (
        <p className="mt-2 text-xs text-gray-400">
          Enviar para: <strong className="text-white">{escolhido.nome}</strong>
        </p>
      )}
    </div>
  );
}
