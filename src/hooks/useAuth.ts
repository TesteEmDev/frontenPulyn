import { create } from 'zustand';
import { api } from '../services/api';
import { lerToken, guardarTokenSoDestaAba, sessaoSoDestaAba, limparTokenDestaAba } from '../utils/sessao';

export interface User {
  id: string;
  empresaId?: string;
  name: string;
  email: string;
  role: string;
  // Áreas que a conta pode usar (o papel atual é `role`). Conta com uma área só: lista de um item.
  papeis?: string[];
  redirect: string;
  plan?: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  trocarArea: (role: string) => Promise<{ success: boolean; redirect?: string; error?: string }>;
  // Busca as áreas atuais da conta no servidor (o token da sessão guarda as de quando ela entrou).
  atualizarAreas: () => Promise<void>;
  // Telão sem login (/telao/<código>): `semConexao` diz que vale tentar de novo; sem ele, o código foi recusado.
  entrarComoTelao: (codigo: string) => Promise<{ success: boolean; error?: string; semConexao?: boolean }>;
  // Telão aberto pela equipe logada (botão da recepção): sessão de telão só desta aba, sem mexer na da equipe.
  abrirTelaoDaEquipe: () => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

export const roleLabels: Record<string, string> = {
  master: 'Master Pulyn',
  admin: 'Gestão do Buffet',
  reception: 'Recepção',
  game_master: 'Recreacionista',
  family: 'Família',
  display: 'Telão',
  kiosk: 'Autoatendimento',
  score_kiosk: 'Consulta de pontuação',
};

export const useAuth = create<AuthStore>((set, get) => {
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
  const savedToken = typeof window !== 'undefined' ? lerToken() : null;
  let initialUser: User | null = null;
  let isInitiallyAuthenticated = false;

  if (savedToken && savedToken !== 'demo-token') {
    // Decodificar JWT real
    const decoded = decodeToken(savedToken);
    if (decoded && decoded.email && (!decoded.exp || decoded.exp * 1000 > Date.now())) {
      initialUser = {
        id: decoded.id || decoded.empresaId,
        empresaId: decoded.empresaId,
        name: decoded.empresa_nome || decoded.email,
        email: decoded.email,
        role: decoded.role || 'admin',
        redirect: decoded.role === 'reception' ? '/reception'
                : decoded.role === 'game_master' ? '/game-master'
                : decoded.role === 'display' ? '/display'
                : decoded.role === 'family' ? '/family'
                : decoded.role === 'master' ? '/master'
                : decoded.role === 'kiosk' ? '/reception/kiosk'
                : decoded.role === 'score_kiosk' ? '/score-kiosk'
                : '/login',
        plan: decoded.plan,
        papeis: Array.isArray(decoded.papeis) ? decoded.papeis : [decoded.role || 'admin']
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

    trocarArea: async (role: string): Promise<{ success: boolean; redirect?: string; error?: string }> => {
      try {
        const response = await api.trocarPapel(role);
        if (response.success && response.user && response.token) {
          set({ user: response.user, token: response.token, isAuthenticated: true });
          localStorage.setItem('authToken', response.token);
          return { success: true, redirect: response.user.redirect };
        }
        return { success: false, error: response.error || 'Não foi possível trocar de área' };
      } catch (err: any) {
        return { success: false, error: err.message || 'Não foi possível trocar de área' };
      }
    },

    atualizarAreas: async () => {
      const atual = get().user;
      if (!atual) return;
      try {
        // Pede um token novo para a área em que a pessoa já está: ele já traz a lista de áreas de agora.
        const response = await api.trocarPapel(atual.role);
        if (!response.success || !response.token || !Array.isArray(response.user?.papeis)) return;
        const novas: string[] = response.user.papeis;
        localStorage.setItem('authToken', response.token);
        const mudou = novas.join(',') !== (atual.papeis ?? []).join(',');
        set((estado) => ({ token: response.token, user: estado.user && mudou ? { ...estado.user, papeis: novas } : estado.user }));
      } catch {
        // sem rede ou sessão vencida: o menu fica como está
      }
    },

    entrarComoTelao: async (codigo: string) => {
      try {
        const response = await api.entrarTelao(codigo);
        if (!response.success || !response.user || !response.token) return { success: false, error: 'Resposta inesperada do servidor' };
        set({ user: response.user, token: response.token, isAuthenticated: true });
        localStorage.setItem('authToken', response.token);
        // A TV guarda o código para entrar de novo quando a sessão vencer (ProtectedRoute e TelaoSessao)
        localStorage.setItem('telaoCodigo', codigo);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'Não foi possível abrir o telão', semConexao: Boolean(err.semConexao) };
      }
    },

    abrirTelaoDaEquipe: async () => {
      try {
        const response = await api.abrirTelaoDaEquipe();
        if (!response.success || !response.user || !response.token) return { success: false, error: 'Resposta inesperada do servidor' };
        // Só nesta aba: a conta da equipe segue logada nas outras abas
        guardarTokenSoDestaAba(response.token);
        set({ user: response.user, token: response.token, isAuthenticated: true });
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'Não foi possível abrir o telão' };
      }
    },

    logout: () => {
      api.logout().catch(err => console.error('Erro ao fazer logout:', err));
      if (sessaoSoDestaAba()) {
        // Telão aberto pela equipe: sair daqui não derruba a sessão da equipe nas outras abas
        limparTokenDestaAba();
      } else {
        localStorage.removeItem('authToken');
        localStorage.removeItem('telaoCodigo');
      }
      set({ user: null, token: null, isAuthenticated: false });
    },
  };
});
