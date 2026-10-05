import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';

export interface FamilyChild {
  id: string;
  evento_id: string;
  name: string;
  nickname?: string;
  age?: number;
  avatar?: string;
  bracelet_code?: string | null;
  scores: number;
  status: string;
  evento_name?: string;
  evento_date?: string;
  evento_status?: string;
  time_id?: string | null;
  time_name?: string | null;
  time_color?: string | null;
  time_points?: number;
  achievements?: string[];
}

export function useFamilyData() {
  const [children, setChildren] = useState<FamilyChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.getFamilyChildren();
      setChildren(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Não foi possível carregar os dados da família.');
      setChildren([]);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { reload(); }, [reload]);
  return { children, loading, error, reload };
}
