import { useCallback, useEffect, useState } from 'react';
import { Package, Plus, Pencil, Trash2, Check, X, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import Card from '../ui/Card';
import Button from '../ui/Button';

interface ParallelObject {
  id: string;
  name: string;
}

interface ParallelObjectsListProps {
  // Avisa a tela quando a quantidade de objetos muda (sem objetos não dá para iniciar).
  onCountChange?: (count: number) => void;
}

// Lista de objetos da brincadeira "Ache o objeto": vem com uns itens fáceis de achar numa festa,
// e o recreacionista pode acrescentar, renomear e remover.
export default function ParallelObjectsList({ onCountChange }: ParallelObjectsListProps) {
  const [objects, setObjects] = useState<ParallelObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.getParallelObjects();
      setObjects(list);
      onCountChange?.(list.length);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar a lista de objetos.');
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => { load(); }, [load]);

  const sync = (next: ParallelObject[]) => {
    setObjects(next);
    onCountChange?.(next.length);
  };

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name || adding) return;
    setAdding(true);
    setError('');
    try {
      const created = await api.addParallelObject(name);
      sync([...objects, created]);
      setNewName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível adicionar o objeto.');
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (item: ParallelObject) => {
    setEditingId(item.id);
    setEditingName(item.name);
    setError('');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setBusyId(editingId);
    setError('');
    try {
      const updated = await api.renameParallelObject(editingId, editingName);
      sync(objects.map(item => (item.id === updated.id ? updated : item)));
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível renomear o objeto.');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (item: ParallelObject) => {
    setBusyId(item.id);
    setError('');
    try {
      await api.deleteParallelObject(item.id);
      sync(objects.filter(other => other.id !== item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível remover o objeto.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Package size={20} className="text-secondary" />
          <h3 className="font-display text-lg text-white">Objetos da brincadeira</h3>
        </div>
        <span className="text-xs text-gray-500">{objects.length} na roleta</span>
      </div>
      <p className="mb-4 text-sm text-gray-400">
        A roleta sorteia um destes objetos para as crianças acharem. Acrescente o que combina com o seu espaço.
      </p>

      <div className="mb-4 flex gap-2">
        <input
          value={newName}
          onChange={event => setNewName(event.target.value)}
          onKeyDown={event => { if (event.key === 'Enter') handleAdd(); }}
          placeholder="Ex: Uma bola"
          maxLength={60}
          aria-label="Novo objeto"
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-white placeholder-gray-500 focus:border-primary focus:outline-none"
        />
        <Button variant="primary" onClick={handleAdd} disabled={!newName.trim() || adding}>
          {adding ? <Loader2 size={16} className="mr-1.5 animate-spin" /> : <Plus size={16} className="mr-1.5" />}
          Adicionar
        </Button>
      </div>

      {error && <p role="alert" className="mb-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      {loading ? (
        <p className="py-4 text-center text-sm text-gray-500">Carregando objetos...</p>
      ) : objects.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-500">Nenhum objeto. Adicione pelo menos um para poder sortear.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {objects.map(item => (
            <li key={item.id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-surface/30 px-3 py-2">
              {editingId === item.id ? (
                <>
                  <input
                    autoFocus
                    value={editingName}
                    onChange={event => setEditingName(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === 'Enter') saveEdit();
                      if (event.key === 'Escape') setEditingId(null);
                    }}
                    maxLength={60}
                    aria-label={`Novo nome para ${item.name}`}
                    className="min-w-0 flex-1 rounded border border-border bg-surface px-2 py-1 text-sm text-white focus:border-primary focus:outline-none"
                  />
                  <button type="button" onClick={saveEdit} disabled={busyId === item.id} aria-label="Salvar nome" className="rounded p-1 text-success hover:bg-white/10">
                    {busyId === item.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  </button>
                  <button type="button" onClick={() => setEditingId(null)} aria-label="Cancelar edição" className="rounded p-1 text-gray-400 hover:bg-white/10">
                    <X size={16} />
                  </button>
                </>
              ) : (
                <>
                  <span className="min-w-0 flex-1 truncate text-sm text-white">{item.name}</span>
                  <button type="button" onClick={() => startEdit(item)} aria-label={`Renomear ${item.name}`} className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white">
                    <Pencil size={15} />
                  </button>
                  <button type="button" onClick={() => remove(item)} disabled={busyId === item.id} aria-label={`Remover ${item.name}`} className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-danger">
                    {busyId === item.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
