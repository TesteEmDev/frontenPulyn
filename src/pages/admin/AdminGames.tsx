import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Gamepad2, Plus, ToggleLeft, ToggleRight, Trash2
} from 'lucide-react';
import { usePulynStore } from '../../store/mockData';
import { api } from '../../services/api';
import AdminSidebar from '../../components/layout/AdminSidebar';
import BuffetTopBar from '../../components/layout/BuffetTopBar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

const typeBadge: Record<string, { variant: 'primary' | 'secondary' | 'accent'; label: string }> = {
  team: { variant: 'primary', label: 'Equipe' },
  individual: { variant: 'secondary', label: 'Individual' },
  cooperative: { variant: 'accent', label: 'Cooperativo' },
  treasure_hunt: { variant: 'secondary', label: 'Caça ao Tesouro' },
  monster_hunt: { variant: 'primary', label: 'Caça ao Monstro' },
  bomb_defusal: { variant: 'accent', label: 'Conquistar e Destruir' },
};

export default function AdminGames() {
  const navigate = useNavigate();
  const { brincadeiras, loadBrincadeiras } = usePulynStore();

  const [localGames, setLocalGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingGameId, setDeletingGameId] = useState<string | null>(null);
  const [togglingGameId, setTogglingGameId] = useState<string | null>(null);
  // Trava síncrona: o estado só vale depois da próxima renderização, e um duplo clique rápido passaria.
  const togglingRef = useRef(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Carregar brincadeiras quando o componente monta
  useEffect(() => {
    const loadGames = async () => {
      setLoading(true);
      await loadBrincadeiras();
      setLoading(false);
    };
    loadGames();
  }, [loadBrincadeiras]);

  // Atualizar localGames quando brincadeiras mudar
  useEffect(() => {
    setLocalGames(Array.isArray(brincadeiras) ? brincadeiras : []);
  }, [brincadeiras]);

  // Sem status registrado, o servidor trata o jogo como ativo.
  const isGameActive = (game: any) => String(game.status || 'active').toLowerCase() === 'active';

  // Some a mensagem de sucesso sozinha; erros ficam até a próxima ação.
  useEffect(() => {
    if (feedback?.type !== 'success') return undefined;
    const timer = setTimeout(() => setFeedback(null), 3500);
    return () => clearTimeout(timer);
  }, [feedback]);

  // Ativa/desativa o jogo de verdade (salva no servidor). A tela muda na hora e
  // volta atrás se o servidor recusar. Antes o botão só mudava o estado local,
  // então o status não era salvo e o jogo voltava ao que estava ao recarregar.
  const toggleGameStatus = async (game: any) => {
    if (togglingRef.current) return;
    togglingRef.current = true;
    const wasActive = isGameActive(game);
    const nextStatus = wasActive ? 'inactive' : 'active';

    setTogglingGameId(game.id);
    setFeedback(null);
    setLocalGames(prev => prev.map(g => (g.id === game.id ? { ...g, status: nextStatus } : g)));
    try {
      await api.setBrincadeiraStatus(game.id, nextStatus);
      await loadBrincadeiras();
      setFeedback({
        type: 'success',
        message: `Jogo "${game.name}" ${nextStatus === 'active' ? 'ativado' : 'desativado'}.`,
      });
    } catch (error) {
      setLocalGames(prev => prev.map(g => (g.id === game.id ? { ...g, status: wasActive ? 'active' : 'inactive' } : g)));
      setFeedback({
        type: 'error',
        message: error instanceof Error && error.message
          ? error.message
          : `Não foi possível ${wasActive ? 'desativar' : 'ativar'} o jogo.`,
      });
    } finally {
      togglingRef.current = false;
      setTogglingGameId(null);
    }
  };

  const handleDeleteGame = async (game: any) => {
    const confirmed = window.confirm(
      `Arquivar o jogo "${game.name}"? Ele sairá da lista, mas o histórico de leituras e pontuações será preservado.`
    );
    if (!confirmed) return;

    setDeletingGameId(game.id);
    setFeedback(null);
    try {
      await api.deleteBrincadeira(game.id);
      await loadBrincadeiras();
      setFeedback({ type: 'success', message: `Jogo "${game.name}" arquivado com sucesso.` });
    } catch (error) {
      const status = typeof error === 'object' && error !== null && 'status' in error
        ? Number((error as { status?: number }).status)
        : 0;
      const message = error instanceof Error ? error.message : 'Não foi possível arquivar o jogo.';
      setFeedback({
        type: 'error',
        message: status === 409
          ? message
          : message || 'Não foi possível arquivar o jogo.',
      });
    } finally {
      setDeletingGameId(null);
    }
  };

  return (
    <div className="flex h-screen bg-dark text-white overflow-hidden">
      <AdminSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <BuffetTopBar subtitle="Jogos" />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <PageHeader
            title="Jogos"
            description="Gerencie os jogos disponíveis no sistema"
            icon={<Gamepad2 size={28} />}
            action={
              <Button variant="primary" onClick={() => navigate('/admin/games/new')}>
                <Plus size={16} className="mr-1.5" />
                Criar Jogo
              </Button>
            }
          />

          {feedback && (
            <div
              role="status"
              className={`rounded-lg border px-4 py-3 text-sm ${
                feedback.type === 'success'
                  ? 'border-success/40 bg-success/10 text-success'
                  : 'border-danger/40 bg-danger/10 text-danger'
              }`}
            >
              {feedback.message}
            </div>
          )}

          {/* Game Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {loading ? (
              <div className="col-span-full text-center py-12 text-gray-400">
                Carregando jogos...
              </div>
            ) : localGames && localGames.length > 0 ? (
              localGames.map(game => {
                const typeInfo = typeBadge[game.type] || { variant: 'muted' as const, label: game.type };
                const isActive = isGameActive(game);
                const isToggling = togglingGameId === game.id;

                return (
                  <Card
                    key={game.id}
                    variant={isActive ? 'glow' : 'default'}
                    className="cursor-pointer"
                    onClick={() => navigate(`/admin/games/${game.id}`)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-display text-lg text-white">{game.name}</h3>
                        <Badge variant={typeInfo.variant} className="mt-1">
                          {typeInfo.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            void toggleGameStatus(game);
                          }}
                          disabled={isToggling}
                          role="switch"
                          aria-checked={isActive}
                          aria-label={`${isActive ? 'Desativar' : 'Ativar'} o jogo ${game.name}`}
                          className="text-gray-400 hover:text-white transition-colors disabled:cursor-wait disabled:opacity-50"
                          title={isToggling ? 'Salvando...' : isActive ? 'Desativar' : 'Ativar'}
                        >
                          {isActive ? (
                            <ToggleRight size={28} className="text-success" />
                          ) : (
                            <ToggleLeft size={28} className="text-gray-500" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            void handleDeleteGame(game);
                          }}
                          disabled={deletingGameId === game.id}
                          className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-danger/10 hover:text-danger disabled:cursor-wait disabled:opacity-50"
                          title="Arquivar jogo"
                          aria-label={`Arquivar jogo ${game.name}`}
                        >
                          <Trash2 size={19} />
                        </button>
                      </div>
                    </div>

                    <p className="text-sm text-gray-400 mb-4 line-clamp-2">{game.description}</p>

                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-xs text-gray-500">Duração</p>
                          <p className="text-sm text-white font-semibold">{game.duration}min</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Checkpoints</p>
                          <p className="text-sm text-white font-semibold">{game.checkpoints?.length || 0}</p>
                        </div>
                      </div>
                      <Badge variant={isActive ? 'success' : 'muted'}>
                        {isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </Card>
                );
              })
            ) : (
              <div className="col-span-full text-center py-12 text-gray-400">
                Nenhum jogo cadastrado ainda. Crie seu primeiro jogo!
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
