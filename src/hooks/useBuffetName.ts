import { useEffect } from 'react';
import { create } from 'zustand';
import { api } from '../services/api';
import { useAuth } from './useAuth';

export const DEFAULT_BUFFET_TITLE = 'Gestão do Buffet';

interface BuffetNameStore {
  empresaId: string | null; // de qual empresa é o nome em cache
  name: string;
  setName: (empresaId: string, name: string) => void;
}

// Cache do nome da unidade (configuração unit_name). Fica por empresa para não
// mostrar o nome de outro buffet se alguém trocar de conta sem recarregar a página.
export const useBuffetNameStore = create<BuffetNameStore>((set) => ({
  empresaId: null,
  name: '',
  setName: (empresaId, name) => set({ empresaId, name: name.trim() }),
}));

let loadingFor: string | null = null;

// Nome do buffet para o cabeçalho: o "Nome da unidade" das Configurações; se não houver,
// o nome da empresa do cadastro; por último, o título genérico.
export function useBuffetName(): string {
  const empresaId = useAuth(state => state.user?.empresa_id) || null;
  const accountName = useAuth(state => state.user?.name) || '';
  const cached = useBuffetNameStore(state => (state.empresaId === empresaId ? state.name : ''));

  useEffect(() => {
    if (!empresaId || useBuffetNameStore.getState().empresaId === empresaId || loadingFor === empresaId) return;
    loadingFor = empresaId;
    api.getSettings()
      .then(settings => useBuffetNameStore.getState().setName(empresaId, settings.unit_name || ''))
      .catch(() => undefined)
      .finally(() => { if (loadingFor === empresaId) loadingFor = null; });
  }, [empresaId]);

  // user.name cai no e-mail quando o token não traz o nome da empresa; e-mail não é nome de buffet.
  const companyName = accountName && !accountName.includes('@') ? accountName.trim() : '';
  return cached || companyName || DEFAULT_BUFFET_TITLE;
}
