import { useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Avatar from '../../components/ui/Avatar';

// Lista dos cadastros permanentes das crianças (sem depender de um evento escolhido):
// "todos": todo mundo, com o último evento em que a criança esteve; "sem": só quem ainda não entrou em nenhum evento.
export type ModoLista = 'todos' | 'sem';

interface Cadastro {
  perfilCriancaId: string;
  nome: string;
  apelido?: string | null;
  idade?: number | null;
  avatar?: string | null;
  nomeResponsavel?: string | null;
  parentescoResponsavel?: string | null;
  criadoEm?: string | null;
  ultimoEventoNome?: string | null;
  ultimoEventoData?: string | null;
  participacoes: number;
}

const data = (valor?: string | null) => {
  const d = valor ? new Date(valor) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('pt-BR') : '';
};

const cabecalho = 'text-left text-xs font-body font-semibold text-gray-400 uppercase tracking-wider px-4 py-3';

export default function ListaCadastros({ modo, onContagem }: { modo: ModoLista; onContagem?: (total: number) => void }) {
  const [cadastros, setCadastros] = useState<Cadastro[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [tick, setTick] = useState(0);
  useAutoRefresh(() => setTick(n => n + 1), { topicos: ['criancas'], intervaloMs: 15_000 });

  useEffect(() => {
    let ativo = true;
    api.getCadastrosCriancas()
      .then((lista: Cadastro[]) => { if (ativo) { setCadastros(lista || []); setErro(null); } })
      .catch((e: unknown) => { if (ativo) setErro(e instanceof Error ? e.message : 'Não foi possível carregar os cadastros.'); });
    return () => { ativo = false; };
  }, [tick]);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (cadastros || [])
      .filter(c => modo === 'todos' || c.participacoes === 0)
      .filter(c => !q
        || c.nome.toLowerCase().includes(q)
        || (c.apelido || '').toLowerCase().includes(q)
        || (c.nomeResponsavel || '').toLowerCase().includes(q));
  }, [cadastros, modo, busca]);

  useEffect(() => {
    if (cadastros) onContagem?.(cadastros.filter(c => modo === 'todos' || c.participacoes === 0).length);
  }, [cadastros, modo, onContagem]);

  if (erro && !cadastros) {
    return <Card className="py-10 text-center text-sm text-danger">{erro}</Card>;
  }
  if (!cadastros) {
    return <Card className="py-10 text-center text-sm text-gray-400">Carregando cadastros...</Card>;
  }

  return (
    <>
      <Input placeholder="Buscar por nome, apelido ou responsável..." value={busca} onChange={e => setBusca(e.target.value)} />
      {lista.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <span className="mb-4 text-5xl">🧒</span>
          <h3 className="mb-2 font-display text-lg text-white">
            {modo === 'sem' ? 'Nenhuma criança sem evento' : 'Nenhuma criança cadastrada'}
          </h3>
          <p className="font-body text-sm text-gray-400">
            {modo === 'sem'
              ? 'Quem é cadastrada sem evento aberto aparece aqui até entrar em um evento.'
              : 'Os cadastros feitos no Check-in e no app aparecem aqui.'}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-dark-border">
                  <th className={cabecalho}>Criança</th>
                  <th className={cabecalho}>Idade</th>
                  <th className={cabecalho}>Responsável</th>
                  <th className={cabecalho}>Último evento</th>
                  <th className={cabecalho}>Cadastrada em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {lista.map(c => (
                  <tr key={c.perfilCriancaId} className="transition-colors duration-150 hover:bg-dark-surface/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar emoji={c.avatar || '👧'} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-body text-sm text-white">{c.nome}</p>
                          {c.apelido && c.apelido !== c.nome && <p className="truncate text-xs text-gray-400">{c.apelido}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-body text-sm text-gray-300">{c.idade ?? '-'}</td>
                    <td className="px-4 py-3 font-body text-sm text-gray-300">
                      {c.nomeResponsavel ? (
                        <>{c.nomeResponsavel}{c.parentescoResponsavel && <span className="text-gray-500"> · {c.parentescoResponsavel}</span>}</>
                      ) : <span className="text-gray-500">-</span>}
                    </td>
                    <td className="px-4 py-3 font-body text-sm text-gray-300">
                      {c.ultimoEventoNome
                        ? <>{c.ultimoEventoNome}{data(c.ultimoEventoData) && <span className="text-gray-500"> · {data(c.ultimoEventoData)}</span>}</>
                        : <span className="text-gray-500">Nenhum evento ainda</span>}
                    </td>
                    <td className="px-4 py-3 font-body text-sm text-gray-300">{data(c.criadoEm) || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
