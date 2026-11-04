import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAutoRefresh } from './useAutoRefresh';

export interface FamilyChild {
  id: string;
  eventoId: string;
  name: string;
  nickname?: string;
  age?: number;
  avatar?: string;
  codigoPulseira?: string | null;
  scores: number;
  status: string;
  evento_name?: string;
  evento_date?: string;
  evento_status?: string;
  timeId?: string | null;
  time_nome?: string | null;
  time_color?: string | null;
  team_points?: number;
  achievements?: string[];
}

export function useFamilyData() {
  const [children, setChildren] = useState<FamilyChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const reload = useCallback(async (silencioso = false) => {
    try {
      if (!silencioso) {
        setLoading(true);
        setError('');
      }
      const data = await api.getFamilyChildren();
      const lista = Array.isArray(data) ? data : [];
      // Atualizando: só troca a lista se mudou algo, para as telas não recarregarem placar e histórico à toa
      setChildren((anterior) => (silencioso && JSON.stringify(anterior) === JSON.stringify(lista) ? anterior : lista));
    } catch (err: any) {
      if (silencioso) return;
      setError(err.message || 'Não foi possível carregar os dados da família.');
      setChildren([]);
    } finally {
      if (!silencioso) setLoading(false);
    }
  }, []);
  useEffect(() => { reload(); }, [reload]);
  // Pontos, time e evento das crianças se atualizam sozinhos (sem F5)
  useAutoRefresh(() => reload(true), { intervaloMs: 15_000 });
  return { children, loading, error, reload };
}
