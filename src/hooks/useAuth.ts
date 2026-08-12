import { create } from 'zustand';
import { api } from '../services/api';

export interface User {
  id: string;
  empresa_id?: string;
  name: string;
  email: string;
  role: string;
  redirect: string;
  plan?: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

export const roleLabels: Record<string, string> = {
  master: 'Master Pulyn',
  admin: 'Gestão do Buffet',
  reception: 'Recepção',
  game_master: 'Recreacionista',
  family: 'Família',
  display: 'Telão',
};

export const useAuth = create<AuthStore>((set) => {
  // Helper para decodificar JWT (sem validação, apenas para recuperar dados)
  function decodeToken(token: string): any {
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      return decoded;
    } catch {
      return null;
    }
  }

  // Tentar recuperar token do localStorage ao iniciar
  const savedToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  let initialUser: User | null = null;
  let isInitiallyAuthenticated = false;

  if (savedToken && savedToken !== 'demo-token') {
    // Decodificar JWT real
    const decoded = decodeToken(savedToken);
    if (decoded && decoded.email && (!decoded.exp || decoded.exp * 1000 > Date.now())) {
      initialUser = {
        id: decoded.id || decoded.empresa_id,
        empresa_id: decoded.empresa_id,
        name: decoded.empresa_nome || decoded.email,
        email: decoded.email,
        role: decoded.role || 'admin',
        redirect: decoded.role === 'reception' ? '/reception'
                : decoded.role === 'game_master' ? '/game-master'
                : decoded.role === 'display' ? '/display'
                : decoded.role === 'family' ? '/family'
                : decoded.role === 'master' ? '/master'
                : '/admin',
        plan: decoded.plan
      };
      isInitiallyAuthenticated = true;
    }
  }
  
  return {
    user: initialUser,
    token: isInitiallyAuthenticated ? savedToken : null,
    isAuthenticated: isInitiallyAuthenticated,

    login: async (email, password) => {
      try {
        // Tentar autenticar via API (banco de dados)
        const response = await api.login(email, password);

        if (response.success && response.user && response.token) {
          set({ 
            user: response.user, 
            token: response.token,
            isAuthenticated: true 
          });
          // Armazenar token no localStorage
          localStorage.setItem('authToken', response.token);
          return { success: true };
        }

        return { success: false, error: response.error || 'E-mail ou senha incorretos' };
      } catch (err) {
        console.error('Erro ao fazer login:', err);
        return { success: false, error: 'Não foi possível conectar ao servidor. Tente novamente.' };
      }
    },

    logout: () => {
      api.logout().catch(err => console.error('Erro ao fazer logout:', err));
      localStorage.removeItem('authToken');
      set({ user: null, token: null, isAuthenticated: false });
    },
  };
});
