import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Watch, Check, X, Undo2, Inbox, PackageCheck } from 'lucide-react';
import { api, type PulseiraRecebida } from '../../services/api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import AdminSidebar from '../../components/layout/AdminSidebar';
import BuffetTopBar from '../../components/layout/BuffetTopBar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

type Pendente = { codigo: string; enviadoEm: string };

const formatarData = (data: string | null) =>
  data ? new Date(data).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

// Seleção de códigos com "selecionar todos"
function useSelecao(codigos: string[]) {
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  // Some da seleção o que saiu da lista (aceito, recusado, devolvido)
  const validos = useMemo(() => codigos.filter((c) => marcados.has(c)), [codigos, marcados]);
  const todos = codigos.length > 0 && validos.length === codigos.length;
  return {
    validos,
    todos,
    marcado: (codigo: string) => marcados.has(codigo),
    alternar: (codigo: string) => setMarcados((atual) => {
      const novo = new Set(atual);
      if (novo.has(codigo)) novo.delete(codigo); else novo.add(codigo);
      return novo;
    }),
    alternarTodos: () => setMarcados(todos ? new Set() : new Set(codigos)),
    limpar: () => setMarcados(new Set()),
  };
}

export default function AdminBracelets() {
  const [pendentes, setPendentes] = useState<Pendente[]>([]);
  const [recebidas, setRecebidas] = useState<PulseiraRecebida[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);

  const livres = useMemo(() => recebidas.filter((p) => !p.emUso && p.status === 'disponivel'), [recebidas]);
  const selPendentes = useSelecao(useMemo(() => pendentes.map((p) => p.codigo), [pendentes]));
  const selLivres = useSelecao(useMemo(() => livres.map((p) => p.codigo), [livres]));

  const carregar = useCallback(async (silencioso = false) => {
    try {
      const [aguardando, minhas] = await Promise.all([api.pulseirasPendentes(), api.pulseirasRecebidasDoMaster()]);
      setPendentes(aguardando);
      setRecebidas(minhas);
    } catch (erro) {
      if (!silencioso) toast.error(erro instanceof Error ? erro.message : 'Não foi possível carregar as pulseiras');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);
  useAutoRefresh(() => carregar(true), { topicos: ['pulseiras'], pausado: ocupado });

  const executar = async (acao: () => Promise<unknown>, sucesso: string, aoConcluir: () => void) => {
    setOcupado(true);
    try {
      await acao();
      toast.success(sucesso);
      aoConcluir();
      await carregar(true);
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : 'Não foi possível concluir');
    } finally {
      setOcupado(false);
    }
  };

  const aceitar = (codigos: string[]) => executar(() => api.aceitarPulseiras(codigos), `${codigos.length} pulseira(s) aceita(s): já podem ser usadas`, selPendentes.limpar);
  const recusar = (codigos: string[]) => {
    if (!confirm(`Recusar ${codigos.length} pulseira(s)? Elas voltam para o estoque do master.`)) return;
    void executar(() => api.recusarPulseiras(codigos), `${codigos.length} pulseira(s) recusada(s)`, selPendentes.limpar);
  };
  const devolver = (codigos: string[]) => {
    if (!confirm(`Devolver ${codigos.length} pulseira(s) ao master? Elas saem do seu cadastro.`)) return;
    void executar(() => api.devolverPulseiras(codigos), `${codigos.length} pulseira(s) devolvida(s) ao master`, selLivres.limpar);
  };

  return (
    <div className="flex h-screen bg-dark text-white overflow-hidden">
      <AdminSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <BuffetTopBar subtitle="Pulseiras" />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <PageHeader
            title="Pulseiras"
            description="Aceite as pulseiras que a Pulyn enviou para o seu buffet ou devolva as que não vai usar"
            icon={<Watch size={28} />}
          />

          <Card>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-display text-lg text-white">
                <Inbox size={18} className="text-warning" />
                Aguardando seu aceite <span className="text-sm text-gray-500">({pendentes.length})</span>
              </h2>
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" className="border border-border" disabled={selPendentes.validos.length === 0 || ocupado} onClick={() => recusar(selPendentes.validos)}>
                  <X size={16} className="mr-1.5" />
                  Recusar{selPendentes.validos.length > 0 ? ` ${selPendentes.validos.length}` : ''}
                </Button>
                <Button variant="success" disabled={pendentes.length === 0 || ocupado} onClick={() => aceitar(selPendentes.validos.length > 0 ? selPendentes.validos : pendentes.map((p) => p.codigo))}>
                  <Check size={16} className="mr-1.5" />
                  {selPendentes.validos.length > 0 ? `Aceitar ${selPendentes.validos.length}` : 'Aceitar todas'}
                </Button>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {carregando ? (
                <p className="py-8 text-center text-gray-500">Carregando...</p>
              ) : pendentes.length === 0 ? (
                <p className="py-8 text-center text-gray-500">Nenhuma pulseira esperando aceite.</p>
              ) : (
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-dark-card">
                    <tr className="border-b border-border">
                      <th className="w-10 pb-3 pr-2">
                        <input type="checkbox" checked={selPendentes.todos} onChange={selPendentes.alternarTodos} aria-label="Selecionar todas as pulseiras pendentes" className="h-4 w-4 cursor-pointer accent-primary" />
                      </th>
                      <th className="pb-3 pr-4 text-sm font-body font-semibold text-gray-400">Código</th>
                      <th className="pb-3 text-sm font-body font-semibold text-gray-400">Enviada em</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pendentes.map((p) => (
                      <tr key={p.codigo} className="hover:bg-surface/50 transition-colors">
                        <td className="py-2.5 pr-2">
                          <input type="checkbox" checked={selPendentes.marcado(p.codigo)} onChange={() => selPendentes.alternar(p.codigo)} aria-label={`Selecionar ${p.codigo}`} className="h-4 w-4 cursor-pointer accent-primary" />
                        </td>
                        <td className="py-2.5 pr-4 font-mono text-sm text-white">{p.codigo}</td>
                        <td className="py-2.5 text-sm text-gray-400">{formatarData(p.enviadoEm)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>

          <Card>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-display text-lg text-white">
                <PackageCheck size={18} className="text-success" />
                Recebidas da Pulyn <span className="text-sm text-gray-500">({recebidas.length})</span>
              </h2>
              <Button variant="ghost" className="border border-border" disabled={selLivres.validos.length === 0 || ocupado} onClick={() => devolver(selLivres.validos)}>
                <Undo2 size={16} className="mr-1.5" />
                Devolver{selLivres.validos.length > 0 ? ` ${selLivres.validos.length}` : ''} ao master
              </Button>
            </div>
            <p className="mb-3 text-xs text-gray-500">Só dá para devolver as pulseiras livres: as que estão em uso por uma criança ou marcadas como perdidas ou bloqueadas ficam com você.</p>
            <div className="max-h-96 overflow-y-auto">
              {recebidas.length === 0 ? (
                <p className="py-8 text-center text-gray-500">Você ainda não recebeu pulseiras da Pulyn.</p>
              ) : (
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-dark-card">
                    <tr className="border-b border-border">
                      <th className="w-10 pb-3 pr-2">
                        {livres.length > 0 && (
                          <input type="checkbox" checked={selLivres.todos} onChange={selLivres.alternarTodos} aria-label="Selecionar todas as pulseiras livres" className="h-4 w-4 cursor-pointer accent-primary" />
                        )}
                      </th>
                      <th className="pb-3 pr-4 text-sm font-body font-semibold text-gray-400">Código</th>
                      <th className="pb-3 pr-4 text-sm font-body font-semibold text-gray-400">Situação</th>
                      <th className="pb-3 text-sm font-body font-semibold text-gray-400">Recebida em</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recebidas.map((p) => {
                      const livre = !p.emUso && p.status === 'disponivel';
                      return (
                        <tr key={p.codigo} className="hover:bg-surface/50 transition-colors">
                          <td className="py-2.5 pr-2">
                            {livre && (
                              <input type="checkbox" checked={selLivres.marcado(p.codigo)} onChange={() => selLivres.alternar(p.codigo)} aria-label={`Selecionar ${p.codigo}`} className="h-4 w-4 cursor-pointer accent-primary" />
                            )}
                          </td>
                          <td className="py-2.5 pr-4 font-mono text-sm text-white">{p.codigo}</td>
                          <td className="py-2.5 pr-4">
                            {livre ? <Badge variant="success">Livre</Badge> : p.emUso ? <Badge variant="primary">Em uso</Badge> : <Badge variant="warning">{p.status === 'perdida' ? 'Perdida' : p.status === 'bloqueada' ? 'Bloqueada' : p.status}</Badge>}
                          </td>
                          <td className="py-2.5 text-sm text-gray-400">{formatarData(p.recebidoDoMasterEm)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
