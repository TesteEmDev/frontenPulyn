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

// Usuários de demo (fallback se banco não tiver dados)
const DEMO_USERS = [
  { id: '1', empresa_id: 'demo-master', name: 'Admin Master', email: 'admin@pulyn.com.br', password: 'pulyn2026', role: 'master', redirect: '/master' },
  { id: '2', empresa_id: 'demo-buffet', name: 'Pulyn Admin', email: 'admin@buffet.com.br', password: 'buffet123', role: 'admin', redirect: '/admin' },
  { id: '3', empresa_id: 'demo-buffet', name: 'Recepção', email: 'recepcao@buffet.com.br', password: 'recepcao', role: 'reception', redirect: '/reception' },
  { id: '4', empresa_id: 'demo-buffet', name: 'Recreacionista', email: 'gm@buffet.com.br', password: 'recreacao', role: 'game_master', redirect: '/game-master' },
  { id: '5', empresa_id: 'demo-family', name: 'Família Silva', email: 'familia@email.com', password: 'familia123', role: 'family', redirect: '/family' },
  { id: '6', empresa_id: 'demo-buffet', name: 'Telão', email: 'display@buffet.com.br', password: 'telaon', role: 'display', redirect: '/display' },
];

export const roleLabels: Record<string, string> = {
  master: 'Master Pulyn',
  admin: 'Gestão do Buffet',
  reception: 'Recepção',
  game_master: 'Recreacionista',
  family: 'Família',
  display: 'Telão',
};

export const useAuth = create<AuthStore>((set, get) => {
  // Helper para decodificar JWT (sem validação, apenas para recuperar dados)
  function decodeToken(token: string): any {
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      return decoded;
    } catch (err) {
      return null;
    }
  }

  // Tentar recuperar token do localStorage ao iniciar
  const savedToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  let initialUser: User | null = null;
  let isInitiallyAuthenticated = false;

  if (savedToken) {
    if (savedToken === 'demo-token') {
      // Para demo token, usar usuário de demo
      const demoUser = DEMO_USERS.find(u => u.password === 'demo-token') || DEMO_USERS[1];
      const { password: _, ...user } = demoUser;
      initialUser = user as User;
      isInitiallyAuthenticated = true;
    } else {
      // Decodificar JWT real
      const decoded = decodeToken(savedToken);
      if (decoded && decoded.email) {
        initialUser = {
          id: decoded.empresa_id,
          empresa_id: decoded.empresa_id,
          name: decoded.empresa_nome,
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
  }
  
  return {
    user: initialUser,
    token: savedToken,
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

        // Se falhar, tentar com usuários de demo
        const demoUser = DEMO_USERS.find(
          u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
        );

        if (demoUser) {
          const { password: _, ...user } = demoUser;
          set({ 
            user: user as User,
            token: 'demo-token',
            isAuthenticated: true 
          });
          localStorage.setItem('authToken', 'demo-token');
          console.warn('⚠️ Login com usuário de demo (banco pode não ter dados)');
          return { success: true };
        }

        return { success: false, error: 'Email ou senha incorretos' };
      } catch (err) {
        console.error('Erro ao fazer login:', err);
        // Fallback: tentar com usuários de demo
        const demoUser = DEMO_USERS.find(
          u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
        );
        if (demoUser) {
          const { password: _, ...user } = demoUser;
          set({ 
            user: user as User,
            token: 'demo-token',
            isAuthenticated: true 
          });
          localStorage.setItem('authToken', 'demo-token');
          return { success: true };
        }
        return { success: false, error: 'Erro ao conectar. Tente novamente.' };
      }
    },

    logout: () => {
      api.logout().catch(err => console.error('Erro ao fazer logout:', err));
      localStorage.removeItem('authToken');
      set({ user: null, token: null, isAuthenticated: false });
    },
  };
});

export { DEMO_USERS as USERS };
