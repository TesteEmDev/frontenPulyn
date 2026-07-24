// src/services/api.ts
import { useAuth } from '../hooks/useAuth';

const API_PROTOCOL = window.location.protocol === 'https:' ? 'https' : 'http';
const API_URL = `${API_PROTOCOL}://${window.location.hostname}:3001/api`;

// Helper para obter headers com autenticação
function getAuthHeaders() {
  try {
    const token = localStorage.getItem('authToken') || useAuth.getState().token;
    if (!token) {
      throw new Error('Sessão expirada. Faça login novamente.');
    }

    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  } catch (err) {
    console.error('❌ Erro ao obter headers de autenticação:', err);
    throw err;
  }
}

export const api = {
  // ==================== AUTENTICAÇÃO ====================
  async login(email: string, password: string) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  },

  async logout() {
    const res = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.json();
  },

  // ==================== CLIENTES ====================
  async getClientes() {
    const res = await fetch(`${API_URL}/clientes`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async createCliente(data: any) {
    try {
      const res = await fetch(`${API_URL}/clientes`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Resposta do servidor:', errorText);
        throw new Error(`Erro ${res.status}: ${errorText}`);
      }
      
      return res.json();
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      throw error;
    }
  },

  async updateCliente(id: string, data: any) {
    try {
      const res = await fetch(`${API_URL}/clientes/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Resposta do servidor:', errorText);
        throw new Error(`Erro ${res.status}: ${errorText}`);
      }
      
      return res.json();
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      throw error;
    }
  },

  async deleteCliente(id: string) {
    try {
      const res = await fetch(`${API_URL}/clientes/${id}`, { 
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Resposta do servidor:', errorText);
        throw new Error(`Erro ${res.status}: ${errorText}`);
      }
      
      return res.json();
    } catch (error) {
      console.error('Erro ao deletar cliente:', error);
      throw error;
    }
  },

  // ==================== PLANOS ====================
  async getPlanos() {
    const res = await fetch(`${API_URL}/planos`);
    return res.json();
  },

  async getClientesByPlano(plano: string) {
    const res = await fetch(`${API_URL}/planos/${plano}/clients`);
    return res.json();
  },

  async getTotalRevenue() {
    const res = await fetch(`${API_URL}/planos/revenue`);
    return res.json();
  },

  // ==================== ANALYTICS ====================
  // ==================== MASTER DASHBOARD ====================
  
  async getMasterDashboard() {
    try {
      const res = await fetch(`${API_URL}/master/dashboard`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return {};
      return res.json();
    } catch (err) {
      console.error('Erro ao buscar dados do dashboard:', err);
      return {};
    }
  },

  async getMasterClients() {
    try {
      const res = await fetch(`${API_URL}/master/clients`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return [];
      return res.json();
    } catch (err) {
      console.error('Erro ao buscar clientes:', err);
      return [];
    }
  },

  async getMasterActiveEvents() {
    try {
      const res = await fetch(`${API_URL}/master/active-events`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return [];
      return res.json();
    } catch (err) {
      console.error('Erro ao buscar eventos ativos:', err);
      return [];
    }
  },

  async getMasterAlerts() {
    try {
      const res = await fetch(`${API_URL}/master/alerts`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return [];
      return res.json();
    } catch (err) {
      console.error('Erro ao buscar alertas:', err);
      return [];
    }
  },

  async getMetricsAnalytics() {
    try {
      const res = await fetch(`${API_URL}/analytics/metrics`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return {};
      return res.json();
    } catch (err) {
      console.error('Erro ao buscar métricas:', err);
      return {};
    }
  },

  async getMRR() {
    try {
      const res = await fetch(`${API_URL}/analytics/mrr`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return { mrr: 0 };
      return res.json();
    } catch (err) {
      console.error('Erro ao buscar MRR:', err);
      return { mrr: 0 };
    }
  },

  async getClientGrowth() {
    try {
      const res = await fetch(`${API_URL}/analytics/client-growth`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return [];
      return res.json();
    } catch (err) {
      console.error('Erro ao buscar crescimento de clientes:', err);
      return [];
    }
  },

  async getEventsPerMonth() {
    try {
      const res = await fetch(`${API_URL}/analytics/events-per-month`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return [];
      return res.json();
    } catch (err) {
      console.error('Erro ao buscar eventos por mês:', err);
      return [];
    }
  },

  async getCheckpointsOverTime() {
    try {
      const res = await fetch(`${API_URL}/analytics/checkpoints-over-time`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return [];
      return res.json();
    } catch (err) {
      console.error('Erro ao buscar checkpoints:', err);
      return [];
    }
  },

  async getRevenueByPlan() {
    try {
      const res = await fetch(`${API_URL}/analytics/revenue-by-plan`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return [];
      return res.json();
    } catch (err) {
      console.error('Erro ao buscar receita por plano:', err);
      return [];
    }
  },

  // ==================== LOGS ====================
  async getLogs(limit = 100) {
    const res = await fetch(`${API_URL}/logs?limit=${limit}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async createLog(data: any) {
    const res = await fetch(`${API_URL}/logs`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getLogsByClient(client: string) {
    const res = await fetch(`${API_URL}/logs/client/${client}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // ==================== MONITORAMENTO ====================
  async getMonitoringUnits() {
    const res = await fetch(`${API_URL}/monitoring/units`);
    return res.json();
  },

  async getMonitoringUnitById(id: string) {
    const res = await fetch(`${API_URL}/monitoring/units/${id}`);
    return res.json();
  },

  async getSystemStatus() {
    const res = await fetch(`${API_URL}/monitoring/status`);
    return res.json();
  },

  // ==================== SUPORTE ====================
  async getTickets(limit = 100) {
    const res = await fetch(`${API_URL}/support?limit=${limit}`);
    return res.json();
  },

  async createTicket(data: any) {
    const res = await fetch(`${API_URL}/support`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateTicketStatus(id: string, status: string) {
    const res = await fetch(`${API_URL}/support/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return res.json();
  },

  async getTicketStats() {
    const res = await fetch(`${API_URL}/support/stats`);
    return res.json();
  },

  // ==================== EVENTOS ====================
  async getEventos(cliente_id?: string) {
    try {
      const res = await fetch(`${API_URL}/eventos`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) {
        const errorText = await res.text();
        const message = `Erro ao buscar eventos (${res.status})`;
        console.error(`❌ ${message}:`, errorText);
        throw new Error(message);
      }
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('❌ Erro ao buscar eventos:', err);
      throw err;
    }
  },

  async getEvento(id: string) {
    const res = await fetch(`${API_URL}/eventos/${id}`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async createEvento(data: any) {
    const res = await fetch(`${API_URL}/eventos`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateEvento(id: string, data: any) {
    const res = await fetch(`${API_URL}/eventos/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteEvento(id: string) {
    const res = await fetch(`${API_URL}/eventos/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // ==================== BRINCADEIRAS / JOGOS ====================
  async getBrincadeiras(eventoId?: string) {
    const query = eventoId ? `?evento_id=${encodeURIComponent(eventoId)}` : '';
    const res = await fetch(`${API_URL}/brincadeiras${query}`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Erro ao carregar jogos (${res.status})`);
    }
    return Array.isArray(data) ? data : [];
  },

  async createBrincadeira(data: any) {
    const res = await fetch(`${API_URL}/brincadeiras`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateBrincadeira(id: string, data: any) {
    const res = await fetch(`${API_URL}/brincadeiras/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteBrincadeira(id: string) {
    const res = await fetch(`${API_URL}/brincadeiras/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // ==================== CAÇA AO TESOURO ====================
  async getTreasureEventStatus(eventoId: string) {
    const res = await fetch(`${API_URL}/treasure/eventos/${eventoId}/status`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Erro ao consultar Caça ao Tesouro (${res.status})`);
    }
    return res.json();
  },

  async startGame(gameId: string, gameName: string, eventoId: string) {
    const res = await fetch(`${API_URL}/debug/start-game`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ gameId, gameName, eventoId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao iniciar jogo');
    return data;
  },

  async stopGame(eventoId: string) {
    const res = await fetch(`${API_URL}/debug/stop-game`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ eventoId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao finalizar jogo');
    return data;
  },

  // ==================== TIMES ====================
  async getTimes(eventoId?: string) {
    try {
      const url = eventoId 
        ? `${API_URL}/times/eventos/${eventoId}/times`
        : `${API_URL}/times`;
      
      const res = await fetch(url, {
        headers: getAuthHeaders()
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`❌ Erro na API (${res.status}):`, errorText);
        return [];
      }
      
      return await res.json();
    } catch (err) {
      console.error('❌ Erro ao buscar times:', err);
      return [];
    }
  },

  async createTime(data: any) {
    const res = await fetch(`${API_URL}/times`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateTime(id: string, data: any) {
    const res = await fetch(`${API_URL}/times/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteTime(id: string) {
    const res = await fetch(`${API_URL}/times/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // ==================== CRIANÇAS ====================
  async getCriancas(eventoId: string) {
    try {
      const res = await fetch(`${API_URL}/criancas/eventos/${eventoId}/criancas`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) return [];
      return res.json();
    } catch (err) {
      console.error('Erro ao carregar crianças:', err);
      return [];
    }
  },

  async createCrianca(eventoId: string, data: any) {
    try {
      const res = await fetch(`${API_URL}/criancas/eventos/${eventoId}/criancas`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }
      
      return res.json();
    } catch (err) {
      console.error('❌ Erro ao criar criança:', err);
      throw err;
    }
  },

  async getCriancaByBracelet(code: string) {
    const res = await fetch(`${API_URL}/criancas/by-bracelet/${encodeURIComponent(code)}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async updateCrianca(eventoId: string, criancaId: string, data: any) {
    try {
      const res = await fetch(`${API_URL}/criancas/eventos/${eventoId}/criancas/${criancaId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }
      
      return res.json();
    } catch (err) {
      console.error('❌ Erro ao atualizar criança:', err);
      throw err;
    }
  },

  async unassignBracelet(criancaId: string) {
    try {
      const res = await fetch(`${API_URL}/criancas/${criancaId}/unassign-bracelet`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }
      
      return res.json();
    } catch (err) {
      console.error('❌ Erro ao desvincular pulseira:', err);
      throw err;
    }
  },

  // ==================== PULSEIRAS ====================
  async getPulseiras() {
    try {
      const res = await fetch(`${API_URL}/pulseiras`, {
        headers: getAuthHeaders()
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Erro ao carregar pulseiras (${res.status}): ${errorText}`);
      }
      
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Erro ao buscar pulseiras:', err);
      throw err;
    }
  },

  async createPulseira(code: string) {
    const res = await fetch(`${API_URL}/pulseiras`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ code }),
    });
    
    if (!res.ok) {
      const error = await res.text();
      throw new Error(error);
    }
    
    return res.json();
  },

  async updatePulseiraStatus(code: string, status: string) {
    try {
      const res = await fetch(`${API_URL}/pulseiras/${code}/status`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
      });
      
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }
      
      return res.json();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      throw error;
    }
  },

  // ==================== CHECKPOINTS ====================
  async getCheckpoints(eventoId: string) {
    try {
      const res = await fetch(`${API_URL}/checkpoints/evento/${eventoId}`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) return [];
      return res.json();
    } catch (err) {
      console.error('Erro ao carregar checkpoints:', err);
      return [];
    }
  },

  async saveCheckpointConfig(checkpointId: string, config: any, eventoId?: string) {
    try {
      // Se eventoId for fornecido, usar rota com contexto de evento
      const url = eventoId 
        ? `${API_URL}/checkpoints/evento/${eventoId}/config/${checkpointId}`
        : `${API_URL}/checkpoints/${checkpointId}/config`;
      
      const res = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(config),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }
      
      return res.json();
    } catch (err) {
      console.error('Erro ao salvar configuração do checkpoint:', err);
      throw err;
    }
  },

  async getCheckpointConfig(checkpointId: string) {
    const res = await fetch(`${API_URL}/checkpoints/${checkpointId}/config`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async createCheckpoint(eventoId: string, data: any) {
    try {
      const res = await fetch(`${API_URL}/checkpoints/evento/${eventoId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }
      
      return res.json();
    } catch (err) {
      console.error('Erro ao criar checkpoint:', err);
      throw err;
    }
  },

  async deleteCheckpoint(eventoId: string, checkpointId: string) {
    try {
      const res = await fetch(`${API_URL}/checkpoints/evento/${eventoId}/${checkpointId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }
      
      return res.json();
    } catch (err) {
      console.error('Erro ao deletar checkpoint:', err);
      throw err;
    }
  },

  // ==================== LEITURAS ====================
  async sendLeitura(data: any) {
    const res = await fetch(`${API_URL}/leituras`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // ==================== RANKING ====================
  async getRankingCriancas(eventoId: string) {
    const res = await fetch(`${API_URL}/ranking/eventos/${eventoId}/ranking/criancas`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getRankingTimes(eventoId: string) {
    const res = await fetch(`${API_URL}/ranking/eventos/${eventoId}/ranking/times`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // ==================== SETTINGS ====================
  async getSettings() {
    const res = await fetch(`${API_URL}/settings`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getSetting(key: string) {
    const res = await fetch(`${API_URL}/settings/${key}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async updateSetting(key: string, value: string) {
    const res = await fetch(`${API_URL}/settings/${key}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ value }),
    });
    return res.json();
  },

  async updateSettings(settings: Record<string, string>) {
    const res = await fetch(`${API_URL}/settings`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(settings),
    });
    return res.json();
  },

  // ==================== USUÁRIOS (LOGINS) ====================
  async getUsers(empresaId: string) {
    try {
      const res = await fetch(`${API_URL}/logins/empresa/${empresaId}`, {
        headers: getAuthHeaders()
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Erro ao carregar usuários:', errorText);
        return [];
      }
      
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('❌ Erro ao buscar usuários:', err);
      return [];
    }
  },

  async createUser(userData: any) {
    try {
      const res = await fetch(`${API_URL}/logins`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(userData),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro ao criar usuário');
      }
      
      return res.json();
    } catch (error) {
      console.error('❌ Erro ao criar usuário:', error);
      throw error;
    }
  },

  async deleteUser(userId: string) {
    try {
      const res = await fetch(`${API_URL}/logins/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro ao deletar usuário');
      }
      
      return res.json();
    } catch (error) {
      console.error('❌ Erro ao deletar usuário:', error);
      throw error;
    }
  },
};
