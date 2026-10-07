import { useEffect } from 'react';
import { create } from 'zustand';
import { api } from '../services/api';
import { useAuth } from './useAuth';

export const DEFAULT_BUFFET_TITLE = 'Gestão do Buffet';

interface BuffetNameStore {
  empresaId: string | null; // de qual empresa são o nome e a logo em cache
  name: string;
  logoUrl: string;
  setName: (empresaId: string, name: string) => void;
  setLogo: (empresaId: string, logoUrl: string) => void;
}

// Cache do nome da unidade (campo "Nome da unidade" do cadastro em clientes). Fica por empresa para não
// mostrar o nome de outro buffet se alguém trocar de conta sem recarregar a página.
export const useBuffetNameStore = create<BuffetNameStore>((set) => ({
  empresaId: null,
  name: '',
  logoUrl: '',
  // Ao mudar de empresa, o que era da anterior (nome ou logo) é descartado.
  setName: (empresaId, name) => set((state) => ({
    empresaId,
    name: name.trim(),
    logoUrl: state.empresaId === empresaId ? state.logoUrl : '',
  })),
  setLogo: (empresaId, logoUrl) => set((state) => ({
    empresaId,
    name: state.empresaId === empresaId ? state.name : '',
    logoUrl,
  })),
}));

let loadingFor: string | null = null;

// Nome do buffet para o cabeçalho: o "Nome da unidade" das Configurações; se ainda não
// carregou (ou falhou), o nome da empresa no token; por último, o título genérico.
export function useBuffetName(enabled = true): string {
  const empresaId = useAuth(state => state.user?.empresaId) || null;
  const accountName = useAuth(state => state.user?.name) || '';
  const cached = useBuffetNameStore(state => (state.empresaId === empresaId ? state.name : ''));

  useEffect(() => {
    // O cadastro só pode ser lido pelo admin; os outros perfis não disparam a busca.
    if (!enabled || !empresaId || useBuffetNameStore.getState().empresaId === empresaId || loadingFor === empresaId) return;
    loadingFor = empresaId;
    Promise.allSettled([api.getEmpresa(), api.getEmpresaLogo()])
      .then(([profile, logo]) => {
        const store = useBuffetNameStore.getState();
        // Só marca como carregado o que veio; se o perfil falhar, tenta de novo na próxima tela.
        if (profile.status === 'fulfilled') store.setName(empresaId, profile.value.name || '');
        if (logo.status === 'fulfilled') store.setLogo(empresaId, logo.value?.dataUrl || '');
      })
      .finally(() => { if (loadingFor === empresaId) loadingFor = null; });
  }, [empresaId, enabled]);

  // user.name cai no e-mail quando o token não traz o nome da empresa; e-mail não é nome de buffet.
  const companyName = accountName && !accountName.includes('@') ? accountName.trim() : '';
  return cached || companyName || DEFAULT_BUFFET_TITLE;
}
