// src/services/api.ts
import { useAuth } from '../hooks/useAuth';

const LOCAL_API_URL = `${window.location.protocol === 'https:' ? 'https' : 'http'}://${window.location.hostname}:3001/api`;
const PRODUCTION_API_URL = 'https://backendpulyn.onrender.com/api';
const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

function hasRepeatedHost(hostname: string) {
  const host = hostname.toLowerCase();
  for (let partLength = 1; partLength <= host.length / 2; partLength += 1) {
    if (host.length % partLength !== 0) continue;
    const repetitions = host.length / partLength;
    if (repetitions > 1 && host === host.slice(0, partLength).repeat(repetitions)) {
      return true;
    }
  }
  return false;
}

function isLocalNetworkUrl(value: string | undefined | null) {
  try {
    const hostname = new URL(String(value || '')).hostname.toLowerCase();
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname.endsWith('.local')) {
      return true;
    }

    const octets = hostname.split('.').map(Number);
    if (octets.length !== 4 || octets.some(Number.isNaN)) return false;
    return octets[0] === 10
      || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
      || (octets[0] === 192 && octets[1] === 168);
  } catch {
    return false;
  }
}

function normalizeApiUrl(value: string | undefined | null) {
  const rawValue = String(value || '').trim();
  if (!rawValue) return null;

  try {
    const parsed = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(rawValue) ? rawValue : `https://${rawValue}`);
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname || hasRepeatedHost(parsed.hostname)) {
      return null;
    }

    const pathParts = parsed.pathname.split('/').filter(Boolean);
    const apiIndex = pathParts.findIndex(part => part.toLowerCase() === 'api');
    const apiPath = apiIndex >= 0 ? `/${pathParts.slice(0, apiIndex + 1).join('/')}` : '/api';
    return `${parsed.protocol}//${parsed.host}${apiPath}`.replace(/\/+$/, '');
  } catch {
    return null;
  }
}

const normalizedConfiguredApiUrl = normalizeApiUrl(configuredApiUrl);
const isLocalConfiguredUrl = isLocalNetworkUrl(normalizedConfiguredApiUrl);
const isLocalPage = isLocalNetworkUrl(window.location.origin);
const fallbackApiUrl = isLocalPage ? LOCAL_API_URL : PRODUCTION_API_URL;

// Em produção hospedada na LAN, HTTP local continua válido. Em páginas públicas,
// uma configuração HTTP remota é elevada para HTTPS automaticamente.
const configuredForProduction = import.meta.env.PROD
  ? (isLocalConfiguredUrl
      ? normalizedConfiguredApiUrl
      : normalizedConfiguredApiUrl?.replace(/^http:\/\//i, 'https://'))
  : normalizedConfiguredApiUrl;

export const API_URL = (configuredForProduction || fallbackApiUrl).replace(/\/+$/, '');

// Helper para obter headers com autenticação
function getAuthHeaders() {
  const token = localStorage.getItem('authToken');
  if (!token) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
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

  // ==================== FAMÍLIAS E CONVITES ====================
  async getFamilyInvite(token: string) {
    const res = await fetch(`${API_URL}/familias/invites/${encodeURIComponent(token)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erro ao validar convite (${res.status})`);
    return data;
  },

  async registerFamily(token: string, data: any) {
    const res = await fetch(`${API_URL}/familias/invites/${encodeURIComponent(token)}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const response = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(response.error || `Erro ao cadastrar família (${res.status})`);
    return response;
  },

  async createFamilyInvite(data: { eventoId: string; criancaId?: string; email?: string }) {
    const res = await fetch(`${API_URL}/familias/invites`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const response = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(response.error || `Erro ao criar convite (${res.status})`);
    return response;
  },

  async getPendingFamilyLinks(eventoId?: string) {
    const query = eventoId ? `?evento_id=${encodeURIComponent(eventoId)}` : '';
    const res = await fetch(`${API_URL}/familias/pending${query}`, { headers: getAuthHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erro ao carregar aprovações familiares (${res.status})`);
    return data;
  },

  async getApprovedFamilyLinks(eventoId?: string) {
    const query = eventoId ? `?evento_id=${encodeURIComponent(eventoId)}` : '';
    const res = await fetch(`${API_URL}/familias/approved${query}`, { headers: getAuthHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erro ao carregar famílias aprovadas (${res.status})`);
    return data;
  },

  async approveFamilyLink(linkId: string) {
    const res = await fetch(`${API_URL}/familias/links/${linkId}/approve`, { method: 'POST', headers: getAuthHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Erro ao aprovar família');
    return data;
  },

  async rejectFamilyLink(linkId: string) {
    const res = await fetch(`${API_URL}/familias/links/${linkId}/reject`, { method: 'POST', headers: getAuthHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Erro ao rejeitar família');
    return data;
  },

  async getFamilyMe() {
    const res = await fetch(`${API_URL}/familias/me`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(`Erro ao carregar perfil familiar (${res.status})`);
    return res.json();
  },

  async getFamilyChildren() {
    const res = await fetch(`${API_URL}/familias/children`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(`Erro ao carregar crianças da família (${res.status})`);
    return res.json();
  },

  async getFamilyChildScores(childId: string) {
    const res = await fetch(`${API_URL}/familias/children/${encodeURIComponent(childId)}/scores`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(`Erro ao carregar pontuação da criança (${res.status})`);
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
    const res = await fetch(`${API_URL}/planos`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(`Erro ao carregar planos (${res.status})`);
    return res.json();
  },

  async getClientesByPlano(plano: string) {
    const res = await fetch(`${API_URL}/planos/${plano}/clients`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(`Erro ao carregar clientes do plano (${res.status})`);
    return res.json();
  },

  async getTotalRevenue() {
    const res = await fetch(`${API_URL}/planos/revenue`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(`Erro ao carregar receita (${res.status})`);
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

  async getScoreHistory(eventoId: string, limit = 100) {
    const res = await fetch(`${API_URL}/leituras/eventos/${encodeURIComponent(eventoId)}/historico?limit=${limit}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Erro ao carregar histórico do evento (${res.status})`);
    }
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
    const res = await fetch(`${API_URL}/monitoring/units`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(`Erro ao carregar monitoramento (${res.status})`);
    return res.json();
  },

  async getMonitoringUnitById(id: string) {
    const res = await fetch(`${API_URL}/monitoring/units/${id}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(`Erro ao carregar unidade (${res.status})`);
    return res.json();
  },

  async getSystemStatus() {
    const res = await fetch(`${API_URL}/monitoring/status`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(`Erro ao carregar status do sistema (${res.status})`);
    return res.json();
  },

  // ==================== SUPORTE ====================
  async getTickets(limit = 100) {
    const res = await fetch(`${API_URL}/support?limit=${limit}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(`Erro ao carregar tickets (${res.status})`);
    return res.json();
  },

  async createTicket(data: any) {
    const res = await fetch(`${API_URL}/support`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Erro ao criar ticket (${res.status})`);
    return res.json();
  },

  async updateTicketStatus(id: string, status: string) {
    const res = await fetch(`${API_URL}/support/${id}/status`, {
      method: 'PUT',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error(`Erro ao atualizar ticket (${res.status})`);
    return res.json();
  },

  async getTicketStats() {
    const res = await fetch(`${API_URL}/support/stats`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(`Erro ao carregar estatísticas de suporte (${res.status})`);
    return res.json();
  },

  // ==================== MENSAGENS DO DISPLAY ====================
  async getDisplayMessages(eventoId: string, limit = 50) {
    const res = await fetch(`${API_URL}/messages/eventos/${eventoId}?limit=${limit}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(`Erro ao carregar mensagens (${res.status})`);
    return res.json();
  },

  async createDisplayMessage(eventoId: string, data: { text: string; type: 'preset' | 'custom' }) {
    const res = await fetch(`${API_URL}/messages/eventos/${eventoId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Erro ao enviar mensagem (${res.status})`);
    return res.json();
  },

  // ==================== EVENTOS ====================
  async getEventos() {
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

  async getActiveEventControl() {
    const res = await fetch(`${API_URL}/event-control/active`, { headers: getAuthHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erro ao carregar evento selecionado (${res.status})`);
    return data;
  },

  async setActiveEventControl(eventId: string | null) {
    const res = await fetch(`${API_URL}/event-control/active`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ eventId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erro ao selecionar evento (${res.status})`);
    return data;
  },

  // ==================== AUTOATENDIMENTO / KIOSK ====================
  async getKioskEvents() {
    const res = await fetch(`${API_URL}/kiosk/events`, { headers: getAuthHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erro ao carregar eventos (${res.status})`);
    return Array.isArray(data) ? data : [];
  },

  async getScoreKioskEvents() {
    const res = await fetch(`${API_URL}/score-kiosk/events`, { headers: getAuthHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erro ao carregar eventos (${res.status})`);
    return Array.isArray(data) ? data : [];
  },

  async getScoreKioskScore(eventId: string, code: string) {
    const res = await fetch(`${API_URL}/score-kiosk/events/${encodeURIComponent(eventId)}/bracelets/${encodeURIComponent(code)}/score`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erro ao consultar pontuação (${res.status})`);
    return data;
  },

  async getKioskTeams(eventId: string) {
    const res = await fetch(`${API_URL}/kiosk/events/${encodeURIComponent(eventId)}/teams`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erro ao carregar times (${res.status})`);
    return Array.isArray(data) ? data : [];
  },

  async getKioskBracelet(code: string) {
    const res = await fetch(`${API_URL}/kiosk/bracelets/${encodeURIComponent(code)}`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erro ao verificar pulseira (${res.status})`);
    return data;
  },

  async createKioskParticipant(eventId: string, data: any) {
    const res = await fetch(`${API_URL}/kiosk/participants`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ eventId, ...data }),
    });
    const response = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(response.error || `Erro ao cadastrar participante (${res.status})`);
    return response;
  },

  async getEvento(id: string) {
    const res = await fetch(`${API_URL}/eventos/${id}`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async getFloorPlan(eventoId: string) {
    const res = await fetch(`${API_URL}/eventos/${encodeURIComponent(eventoId)}/floor-plan`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erro ao carregar planta (${res.status})`);
    return data.floorPlan || null;
  },

  async saveFloorPlan(eventoId: string, data: { dataUrl: string; name: string; type: string }) {
    const res = await fetch(`${API_URL}/eventos/${encodeURIComponent(eventoId)}/floor-plan`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const response = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(response.error || `Erro ao salvar planta (${res.status})`);
    return response;
  },

  async deleteFloorPlan(eventoId: string) {
    const res = await fetch(`${API_URL}/eventos/${encodeURIComponent(eventoId)}/floor-plan`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const response = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(response.error || `Erro ao remover planta (${res.status})`);
    return response;
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
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = new Error(data.error || `Erro ao excluir jogo (${res.status})`) as Error & { status?: number };
      error.status = res.status;
      throw error;
    }
    return data;
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

  async getMonsterEventStatus(eventoId: string) {
    const res = await fetch(`${API_URL}/monster/eventos/${eventoId}/status`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Erro ao consultar Caça ao Monstro (${res.status})`);
    }
    return res.json();
  },

  async getGameState(eventoId: string) {
    const res = await fetch(`${API_URL}/debug/game-state/${encodeURIComponent(eventoId)}`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erro ao consultar estado do jogo (${res.status})`);
    return data;
  },

  async selectGame(gameId: string, eventoId: string) {
    const res = await fetch(`${API_URL}/debug/select-game`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ gameId, eventoId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Erro ao selecionar jogo');
    return data;
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

  async resetScores(eventoId: string) {
    const res = await fetch(`${API_URL}/debug/reset-scores/${encodeURIComponent(eventoId)}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erro ao resetar pontos (${res.status})`);
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
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Erro ao carregar times (${res.status})`);
      }
      return await res.json();
    } catch (err) {
      console.error('❌ Erro ao buscar times:', err);
      throw err;
    }
  },

  async createTime(eventoIdOrData: string | any, maybeData?: any) {
    const data = maybeData
      ? { ...maybeData, evento_id: eventoIdOrData }
      : eventoIdOrData;
    const res = await fetch(`${API_URL}/times`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Erro ao criar time (${res.status})`);
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
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Erro ao carregar crianças (${res.status})`);
      }
      return res.json();
    } catch (err) {
      console.error('Erro ao carregar crianças:', err);
      throw err;
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

  async deleteCrianca(eventoId: string, criancaId: string) {
    try {
      const res = await fetch(`${API_URL}/criancas/eventos/${eventoId}/criancas/${criancaId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }

      return res.json();
    } catch (err) {
      console.error('❌ Erro ao excluir criança:', err);
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
      const data = await res.json();
      return Array.isArray(data)
        ? data.filter(checkpoint => String(checkpoint?.checkpoint_purpose || 'game').toLowerCase() !== 'reception')
        : [];
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
