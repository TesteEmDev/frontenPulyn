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

// Mensagens do telão: a API devolve "texto"; as telas leem "text".
export function mensagemParaTela(mensagem: any) {
  if (!mensagem || typeof mensagem !== 'object') return mensagem;
  return { ...mensagem, text: mensagem.text ?? mensagem.texto };
}

// A API de suporte devolve "cliente" e "atribuidoPara"; as telas do master usam client / assignee.
function ticketParaTela(ticket: any) {
  if (!ticket || typeof ticket !== 'object') return ticket;
  return { ...ticket, client: ticket.client ?? ticket.cliente, assignee: ticket.assignee ?? ticket.atribuidoPara };
}

async function analyticsRequest(path: string) {
  const res = await fetch(`${API_URL}${path}`, { headers: getAuthHeaders() });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.error) || `Erro ao carregar analytics (${res.status})`);
  return data;
}

// Relatório geral (todos os eventos do buffet), devolvido por GET /reports/overview.
// Uma zona do evento com o que os checkpoints dela realmente registraram.
export interface ZoneEngagement {
  zona: string;
  checkpoints: number;
  leituras: number;
  participantes: number;
  pontos: number;
}

export interface GeneralReportData {
  totals: {
    events: number;
    finishedEvents: number;
    runningEvents: number;
    participants: number;
    teams: number;
    totalPoints: number;
    avgPoints: number;
    scorings: number;
  };
  events: Array<{
    id: string; name: string; date: string; status: string;
    participants: number; teams: number; totalPoints: number; avgPoints: number; scorings: number;
  }>;
  byMonth: Array<{ month: string; events: number; participants: number }>;
  topParticipants: Array<{
    id: string; name: string; nickname: string; age: number | null; scores: number; braceletCode: string;
    eventName: string; teamName: string; teamColor: string;
  }>;
  topTeams: Array<{ id: string; name: string; color: string; points: number; eventName: string }>;
  topCheckpoints: Array<{ id: string; name: string; zone: string; eventName: string; readings: number }>;
  topGames: Array<{ id: string; name: string; plays: number }>;
}

// Cadastro do buffet logado: nome, e-mail, telefone, endereço e backup vêm de `clientes`; cnpj de `empresas`.
export interface EmpresaProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  backupFrequency: string;
  cnpj: string;
  // Domínio dos e-mails dos usuários do buffet, derivado do nome (ex.: "buffetadv.com").
  emailDomain: string | null;
}

export const api = {
  // ==================== AUTENTICAÇÃO ====================
  async login(email: string, password: string) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha: password }),
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
    const query = eventoId ? `?eventoId=${encodeURIComponent(eventoId)}` : '';
    const res = await fetch(`${API_URL}/familias/pending${query}`, { headers: getAuthHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erro ao carregar aprovações familiares (${res.status})`);
    return data;
  },

  async getApprovedFamilyLinks(eventoId?: string) {
    const query = eventoId ? `?eventoId=${encodeURIComponent(eventoId)}` : '';
    const res = await fetch(`${API_URL}/familias/approved${query}`, { headers: getAuthHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erro ao carregar famílias aprovadas (${res.status})`);
    return data;
  },

  // Todas as vinculações (aprovadas, pendentes, desvinculadas e rejeitadas), com criança e responsável.
  async getFamilyLinks(eventoId?: string) {
    const query = eventoId ? `?eventoId=${encodeURIComponent(eventoId)}` : '';
    const res = await fetch(`${API_URL}/familias/links${query}`, { headers: getAuthHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erro ao carregar vinculações (${res.status})`);
    return data;
  },

  async unlinkFamilyLink(linkId: string) {
    const res = await fetch(`${API_URL}/familias/links/${linkId}/unlink`, { method: 'POST', headers: getAuthHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Erro ao desvincular');
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

  // Detalhes completos de um cliente (somente master): cadastro, plano e uso, usuários, eventos e suporte
  async getClienteDetalhes(id: string) {
    const res = await fetch(`${API_URL}/clientes/${encodeURIComponent(id)}/detalhes`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erro ao carregar detalhes do cliente (${res.status})`);
    return data;
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
      const eventos = await res.json();
      return Array.isArray(eventos) ? eventos.map((evento: any) => ({ ...evento, client: evento.client ?? evento.cliente })) : eventos;
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

  // Analytics do master: falha de rede ou da API vira erro (a tela mostra o motivo em vez de
  // exibir gráficos vazios como se não houvesse dados).
  async getMetricsAnalytics() {
    return analyticsRequest('/analytics/metrics');
  },

  async getMRR() {
    return analyticsRequest('/analytics/mrr');
  },

  async getClientGrowth() {
    return analyticsRequest('/analytics/cliente-growth');
  },

  async getEventsPerMonth() {
    return analyticsRequest('/analytics/events-per-month');
  },

  async getCheckpointsOverTime() {
    return analyticsRequest('/analytics/pontoVerificacao-over-time');
  },

  async getRevenueByPlan() {
    return analyticsRequest('/analytics/revenue-by-plan');
  },

  // ==================== LOGS ====================
  async getLogs(limit = 100) {
    const res = await fetch(`${API_URL}/logs?limit=${limit}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getScoreHistory(eventoId: string, limit = 100, sessionId?: string) {
    let url = `${API_URL}/leituras/evento/${encodeURIComponent(eventoId)}/historico?limit=${limit}`;

    // 🆕 Adicionar sessionId como query param se fornecido — o backend filtra
    // leituras.sessaoId por esse valor (routes/leituras.js), não por
    // brincadeira_id, então esse é o único parâmetro que ele reconhece.
    if (sessionId) {
      url += `&sessionId=${encodeURIComponent(sessionId)}`;
    }

    const res = await fetch(url, {
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
    const tickets = await res.json();
    return Array.isArray(tickets) ? tickets.map(ticketParaTela) : tickets;
  },

  async createTicket(data: any) {
    const res = await fetch(`${API_URL}/support`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente: data.client,
        subject: data.subject,
        priority: data.priority,
        description: data.description,
        atribuidoPara: data.assignee,
      }),
    });
    if (!res.ok) throw new Error(`Erro ao criar ticket (${res.status})`);
    return ticketParaTela(await res.json());
  },

  async updateTicketStatus(id: string, status: string) {
    const res = await fetch(`${API_URL}/support/${id}/status`, {
      method: 'PUT',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error(`Erro ao atualizar ticket (${res.status})`);
    return ticketParaTela(await res.json());
  },

  async getTicketStats() {
    const res = await fetch(`${API_URL}/support/stats`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(`Erro ao carregar estatísticas de suporte (${res.status})`);
    return res.json();
  },

  // Troca só os checkpoints de um jogo (vale também com a partida em andamento).
  async updateGameCheckpoints(gameId: string, data: { checkpoints: string[]; specialCheckpointId?: string }) {
    const res = await fetch(`${API_URL}/brincadeiras/${encodeURIComponent(gameId)}/checkpoints`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `Erro ao salvar os checkpoints (${res.status})`);
    return body;
  },

  // ==================== BRINCADEIRA PARALELA (recreacionista) ====================
  async getParallelGame(eventoId: string) {
    const res = await fetch(`${API_URL}/parallel-games/eventos/${encodeURIComponent(eventoId)}`, { headers: getAuthHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erro ao carregar a brincadeira paralela (${res.status})`);
    return data;
  },

  async startParallelGame(eventoId: string, checkpointId: string) {
    const res = await fetch(`${API_URL}/parallel-games/eventos/${encodeURIComponent(eventoId)}/start`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ checkpointId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erro ao iniciar a brincadeira paralela (${res.status})`);
    return data;
  },

  // Lista de objetos da brincadeira "Ache o objeto" (por empresa).
  async getParallelObjects(): Promise<Array<{ id: string; name: string }>> {
    const res = await fetch(`${API_URL}/parallel-games/objects`, { headers: getAuthHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as any).error || `Erro ao carregar os objetos (${res.status})`);
    return Array.isArray(data) ? data : [];
  },

  async addParallelObject(name: string): Promise<{ id: string; name: string }> {
    const res = await fetch(`${API_URL}/parallel-games/objects`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ name }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as any).error || `Erro ao adicionar o objeto (${res.status})`);
    return data as { id: string; name: string };
  },

  async renameParallelObject(id: string, name: string): Promise<{ id: string; name: string }> {
    const res = await fetch(`${API_URL}/parallel-games/objects/${encodeURIComponent(id)}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ name }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as any).error || `Erro ao renomear o objeto (${res.status})`);
    return data as { id: string; name: string };
  },

  async deleteParallelObject(id: string) {
    const res = await fetch(`${API_URL}/parallel-games/objects/${encodeURIComponent(id)}`, { method: 'DELETE', headers: getAuthHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as any).error || `Erro ao remover o objeto (${res.status})`);
    return data;
  },

  async stopParallelGame(eventoId: string) {
    const res = await fetch(`${API_URL}/parallel-games/eventos/${encodeURIComponent(eventoId)}/stop`, { method: 'POST', headers: getAuthHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erro ao encerrar a brincadeira paralela (${res.status})`);
    return data;
  },

  // ==================== MENSAGENS DO DISPLAY ====================
  async getDisplayMessages(eventoId: string, limit = 50) {
    const res = await fetch(`${API_URL}/messages/evento/${eventoId}?limit=${limit}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(`Erro ao carregar mensagens (${res.status})`);
    const mensagens = await res.json();
    return Array.isArray(mensagens) ? mensagens.map(mensagemParaTela) : mensagens;
  },

  async createDisplayMessage(eventoId: string, data: { texto: string; type: 'preset' | 'custom' }) {
    const res = await fetch(`${API_URL}/messages/evento/${eventoId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Erro ao enviar mensagem (${res.status})`);
    return mensagemParaTela(await res.json());
  },

  // ==================== EVENTOS ====================
  async getEventos() {
    try {
      console.log('🔍 [api.getEventos] Fazendo fetch para:', `${API_URL}/eventos`);
      const res = await fetch(`${API_URL}/eventos`, {
        headers: getAuthHeaders()
      });
      console.log('📡 [api.getEventos] Status:', res.status);
      if (!res.ok) {
        const errorText = await res.text();
        const message = `Erro ao buscar eventos (${res.status})`;
        console.error(`❌ ${message}:`, errorText);
        throw new Error(message);
      }
      const data = await res.json();
      console.log('📊 [api.getEventos] Dados brutos recebidos:', data);
      
      // ✅ Extrai array do wrapper object se necessário
      if (Array.isArray(data)) {
        console.log('✅ [api.getEventos] Data é um array direto. Retornando:', data);
        return data;
      }
      
      // Tenta extrair de diferentes possíveis estruturas
      if (data?.eventos && Array.isArray(data.eventos)) {
        console.log('✅ [api.getEventos] Data tem .eventos. Retornando:', data.eventos);
        return data.eventos;
      }
      if (data?.data && Array.isArray(data.data)) {
        console.log('✅ [api.getEventos] Data tem .data. Retornando:', data.data);
        return data.data;
      }
      if (data?.payload && Array.isArray(data.payload)) {
        console.log('✅ [api.getEventos] Data tem .payload. Retornando:', data.payload);
        return data.payload;
      }
      if (data?.events && Array.isArray(data.events)) {
        console.log('✅ [api.getEventos] Data tem .events. Retornando:', data.events);
        return data.events;
      }
      
      console.warn('⚠️ [api.getEventos] Resposta inesperada:', data);
      return [];
    } catch (err) {
      console.error('❌ [api.getEventos] Erro ao buscar eventos:', err);
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
    
    // ✅ Extrai array do wrapper object se necessário
    if (Array.isArray(data)) {
      return data;
    }
    
    // Tenta extrair de diferentes possíveis estruturas
    if (data?.teams && Array.isArray(data.teams)) {
      return data.teams;
    }
    if (data?.data && Array.isArray(data.data)) {
      return data.data;
    }
    if (data?.payload && Array.isArray(data.payload)) {
      return data.payload;
    }
    
    console.warn('⚠️ getKioskTeams: Resposta inesperada:', data);
    return [];
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

  // Planta do buffet: fica ligada à empresa (não ao evento), já que o espaço
  // físico não muda de uma festa para outra.
  async getFloorPlan() {
    const res = await fetch(`${API_URL}/company-map/floor-plan`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erro ao carregar planta (${res.status})`);
    return data.floorPlan || null;
  },

  async saveFloorPlan(data: { dataUrl: string; nome: string; type: string }) {
    const res = await fetch(`${API_URL}/company-map/floor-plan`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const response = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(response.error || `Erro ao salvar planta (${res.status})`);
    return response;
  },

  async deleteFloorPlan() {
    const res = await fetch(`${API_URL}/company-map/floor-plan`, {
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
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `Erro ao criar evento (${res.status})`);
    return body;
  },

  async updateEvento(id: string, data: any) {
    const res = await fetch(`${API_URL}/eventos/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `Erro ao atualizar evento (${res.status})`);
    return body;
  },

  // Ciclo de vida do evento: agendado -> ativo -> encerrado
  async startEvento(id: string) {
    const res = await fetch(`${API_URL}/eventos/${encodeURIComponent(id)}/start`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `Erro ao iniciar evento (${res.status})`);
    return body;
  },

  async rescheduleEvento(id: string, data: { date: string; time: string; duration?: number | null }) {
    const res = await fetch(`${API_URL}/eventos/${encodeURIComponent(id)}/reschedule`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `Erro ao reagendar evento (${res.status})`);
    return body;
  },

  // Reabre um evento encerrado: volta a "agendado" numa nova data e horário (no futuro)
  async reopenEvento(id: string, data: { date: string; time: string; duration?: number | null }) {
    const res = await fetch(`${API_URL}/eventos/${encodeURIComponent(id)}/reopen`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `Erro ao reabrir evento (${res.status})`);
    return body;
  },

  async finishEvento(id: string) {
    const res = await fetch(`${API_URL}/eventos/${encodeURIComponent(id)}/finish`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `Erro ao encerrar evento (${res.status})`);
    return body;
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
    const query = eventoId ? `?eventoId=${encodeURIComponent(eventoId)}` : '';
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

  // Ativa ou desativa um jogo (só o status)
  async setBrincadeiraStatus(id: string, status: 'active' | 'inactive') {
    const res = await fetch(`${API_URL}/brincadeiras/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erro ao alterar o status do jogo (${res.status})`);
    return data;
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
    const res = await fetch(`${API_URL}/treasure/evento/${eventoId}/status`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Erro ao consultar Caça ao Tesouro (${res.status})`);
    }
    return res.json();
  },

  async getMonsterEventStatus(eventoId: string) {
    const res = await fetch(`${API_URL}/monster/evento/${eventoId}/status`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Erro ao consultar Caça ao Monstro (${res.status})`);
    }
    return res.json();
  },

  async getZoneConquestStatus(eventoId: string) {
    const res = await fetch(`${API_URL}/leituras/${encodeURIComponent(eventoId)}/zone-conquest/status`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Erro ao consultar Zone Conquest (${res.status})`);
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

  // O modo equipe/individual do Zone Conquest não é mais enviado pelo
  // cliente: o backend deriva isso de brincadeiras.type (escolhido no
  // AdminGameForm ao criar o jogo), que é a fonte de verdade persistida.
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
        ? `${API_URL}/times/evento/${eventoId}/time`
        : `${API_URL}/times`;
      
      const res = await fetch(url, {
        headers: getAuthHeaders()
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Erro ao carregar times (${res.status})`);
      }
      
      const data = await res.json();
      
      // ✅ Extrai array do wrapper object se necessário
      if (Array.isArray(data)) {
        return data;
      }
      
      // Tenta extrair de diferentes possíveis estruturas
      if (data?.times && Array.isArray(data.times)) {
        return data.times;
      }
      if (data?.data && Array.isArray(data.data)) {
        return data.data;
      }
      if (data?.payload && Array.isArray(data.payload)) {
        return data.payload;
      }
      
      console.warn('⚠️ getTimes: Resposta inesperada:', data);
      return [];
    } catch (err) {
      console.error('❌ Erro ao buscar times:', err);
      throw err;
    }
  },

  async createTime(eventoIdOrData: string | any, maybeData?: any) {
    const data = maybeData
      ? { ...maybeData, eventoId: eventoIdOrData }
      : eventoIdOrData;
    const res = await fetch(`${API_URL}/times`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Erro ao criar time (${res.status})`);
    return res.json();
  },

  // Times padrão da empresa (modelos sem evento) e cópia deles para um evento.
  async getDefaultTimes() {
    const res = await fetch(`${API_URL}/times/padrao`, { headers: getAuthHeaders() });
    const data = await res.json().catch(() => ([]));
    if (!res.ok) throw new Error((data as any).error || `Erro ao carregar times padrão (${res.status})`);
    return Array.isArray(data) ? data : [];
  },

  async applyDefaultTimes(eventoId: string) {
    const res = await fetch(`${API_URL}/times/evento/${encodeURIComponent(eventoId)}/aplicar-padrao`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erro ao aplicar times padrão (${res.status})`);
    return data as { created: number; skipped: number };
  },

  // Sorteia as crianças do evento entre os times. 'unassigned' = só quem está sem time.
  async distributeChildrenRandomly(eventoId: string, mode: 'unassigned' | 'all') {
    const res = await fetch(`${API_URL}/times/evento/${encodeURIComponent(eventoId)}/distribuir-aleatorio`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ mode }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erro ao distribuir participantes (${res.status})`);
    return data as {
      mode: 'unassigned' | 'all';
      distributed: number;
      totalChildren: number;
      teams: Array<{ id: string; name: string; members: number }>;
    };
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
  // Crianças de todos os eventos do buffet (com evento e time já resolvidos)
  async getAllCriancas() {
    const res = await fetch(`${API_URL}/criancas`, { headers: getAuthHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erro ao carregar crianças (${res.status})`);
    return Array.isArray(data) ? data : [];
  },

  async getCriancas(eventoId: string) {
    try {
      const res = await fetch(`${API_URL}/criancas/evento/${eventoId}/crianca`, {
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
      const res = await fetch(`${API_URL}/criancas/evento/${eventoId}/crianca`, {
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
    const res = await fetch(`${API_URL}/criancas/crianca/by-bracelet/${encodeURIComponent(code)}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async updateCrianca(eventoId: string, criancaId: string, data: any) {
    try {
      const res = await fetch(`${API_URL}/criancas/evento/${eventoId}/crianca/${criancaId}`, {
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
      const res = await fetch(`${API_URL}/criancas/evento/${eventoId}/crianca/${criancaId}`, {
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
      body: JSON.stringify({ codigo: code }),
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
  // Contagem de checkpoints por evento (cadastrados e online) de todos os eventos do buffet
  async getCheckpointsSummary() {
    const res = await fetch(`${API_URL}/pontoVerificacao/resumo`, { headers: getAuthHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erro ao carregar resumo de checkpoints (${res.status})`);
    return Array.isArray(data) ? data : [];
  },

  async getCheckpoints(eventoId: string) {
    try {
      const res = await fetch(`${API_URL}/pontoVerificacao/evento/${eventoId}`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data)
        ? data.filter(checkpoint => String(checkpoint?.proposito || 'game').toLowerCase() !== 'reception')
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
        ? `${API_URL}/pontoVerificacao/evento/${eventoId}/config/${checkpointId}`
        : `${API_URL}/pontoVerificacao/${checkpointId}/config`;
      
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
    const res = await fetch(`${API_URL}/pontoVerificacao/${checkpointId}/config`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async createCheckpoint(eventoId: string, data: any) {
    try {
      const res = await fetch(`${API_URL}/pontoVerificacao/evento/${eventoId}`, {
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
      const res = await fetch(`${API_URL}/pontoVerificacao/evento/${eventoId}/${checkpointId}`, {
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
    const res = await fetch(`${API_URL}/ranking/evento/${eventoId}/ranking/crianca`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getRankingTimes(eventoId: string) {
    const res = await fetch(`${API_URL}/ranking/evento/${eventoId}/ranking/time`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // ==================== EMPRESA (dados do próprio buffet) ====================
  async getEmpresa() {
    const res = await fetch(`${API_URL}/empresa/me`, { headers: getAuthHeaders() });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `Erro ao carregar dados do buffet (${res.status})`);
    return body as EmpresaProfile;
  },

  // Atualiza só os campos enviados. O cadastro fica em `clientes` e o CNPJ em `empresas`.
  async updateEmpresa(data: Partial<Pick<EmpresaProfile, 'name' | 'email' | 'phone' | 'address' | 'backupFrequency' | 'cnpj'>>): Promise<EmpresaProfile> {
    const res = await fetch(`${API_URL}/empresa/me`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `Erro ao salvar dados do buffet (${res.status})`);
    return body as EmpresaProfile;
  },

  // Relatório geral: totais, resumo por evento e destaques de todos os eventos do buffet.
  async getGeneralReport(): Promise<GeneralReportData> {
    const res = await fetch(`${API_URL}/reports/overview`, { headers: getAuthHeaders() });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `Erro ao carregar o relatório geral (${res.status})`);
    return body as GeneralReportData;
  },

  // Engajamento por zona de um evento, calculado das leituras reais dos checkpoints.
  async getZoneEngagement(eventoId: string): Promise<ZoneEngagement[]> {
    const res = await fetch(`${API_URL}/reports/evento/${encodeURIComponent(eventoId)}/zonas`, { headers: getAuthHeaders() });
    const body = await res.json().catch(() => ([]));
    if (!res.ok) throw new Error((body as any)?.error || `Erro ao carregar o engajamento por zona (${res.status})`);
    return Array.isArray(body) ? body : [];
  },

  // Logo/foto da unidade (guardada em `clientes`, como data URL).
  async getEmpresaLogo(): Promise<{ dataUrl: string; name: string; type: string } | null> {
    const res = await fetch(`${API_URL}/empresa/me/logo`, { headers: getAuthHeaders() });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `Erro ao carregar a logo (${res.status})`);
    return body.logo || null;
  },

  async saveEmpresaLogo(data: { dataUrl: string; name: string }) {
    const res = await fetch(`${API_URL}/empresa/me/logo`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `Erro ao salvar a logo (${res.status})`);
    return body;
  },

  async deleteEmpresaLogo() {
    const res = await fetch(`${API_URL}/empresa/me/logo`, { method: 'DELETE', headers: getAuthHeaders() });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `Erro ao remover a logo (${res.status})`);
    return body;
  },

  // ==================== SETTINGS ====================
  // Retorna as configurações do buffet como objeto { chave: valor }.
  async getSettings(): Promise<Record<string, string>> {
    const res = await fetch(`${API_URL}/configuracoes`, {
      headers: getAuthHeaders(),
    });
    const body = await res.json().catch(() => ([]));
    if (!res.ok) throw new Error((body as any).error || `Erro ao carregar configurações (${res.status})`);
    const rows: Array<{ chave: string; valor: string | null }> = Array.isArray(body) ? body : [];
    return Object.fromEntries(rows.map(row => [row.chave, row.valor ?? '']));
  },

  async getSetting(key: string) {
    const res = await fetch(`${API_URL}/configuracoes/${key}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async updateSetting(key: string, value: string) {
    const res = await fetch(`${API_URL}/configuracoes/${key}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ value }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `Erro ao salvar configuração (${res.status})`);
    return body;
  },

  async updateSettings(settings: Record<string, string>) {
    const res = await fetch(`${API_URL}/configuracoes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(settings),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `Erro ao salvar configurações (${res.status})`);
    return body;
  },

  // ==================== USUÁRIOS (LOGINS) ====================
  async getUsers(empresaId: string) {
    try {
      const res = await fetch(`${API_URL}/acessos/empresa/${empresaId}`, {
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
      const res = await fetch(`${API_URL}/acessos`, {
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
      const res = await fetch(`${API_URL}/acessos/${userId}`, {
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

  // ==================== QR CODE ====================
  async generateQRCode(criancaId: string) {
    try {
      const res = await fetch(`${API_URL}/qrcode/generate/${encodeURIComponent(criancaId)}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ao gerar QR Code (${res.status})`);
      }
      
      return res.json();
    } catch (error) {
      console.error('❌ Erro ao gerar QR Code:', error);
      throw error;
    }
  },

  async getQRCode(criancaId: string) {
    try {
      const res = await fetch(`${API_URL}/qrcode/${encodeURIComponent(criancaId)}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ao buscar QR Code (${res.status})`);
      }
      
      return res.json();
    } catch (error) {
      console.error('❌ Erro ao buscar QR Code:', error);
      throw error;
    }
  },

  // ==================== ZONAS DO MAPA (por buffet, não por evento) ====================
  async getZones() {
    try {
      const res = await fetch(`${API_URL}/company-map/zones`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ao carregar zonas (${res.status})`);
      }

      return res.json();
    } catch (error) {
      console.error('❌ Erro ao carregar zonas:', error);
      throw error;
    }
  },

  async saveZones(zones: any[]) {
    try {
      const res = await fetch(`${API_URL}/company-map/zones`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ zones }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ao salvar zonas (${res.status})`);
      }

      return res.json();
    } catch (error) {
      console.error('❌ Erro ao salvar zonas:', error);
      throw error;
    }
  },

  // ==================== ZONE CONQUEST STATE ====================
  
  /**
   * Inicializa os estados de checkpoint e zona para uma nova partida
   */
  async initializeZoneConquestState(
    eventoId: string,
    partidaId: string,
    empresaId: string,
    gameType: 'team' | 'individual' = 'team'
  ) {
    try {
      const res = await fetch(
        `${API_URL}/zone-conquest/initialize/${encodeURIComponent(eventoId)}/${encodeURIComponent(partidaId)}?gameType=${gameType}`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ empresaId }),
        }
      );
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ao inicializar zone conquest state (${res.status})`);
      }
      return res.json();
    } catch (error) {
      console.error('❌ Erro ao inicializar zone conquest state:', error);
      throw error;
    }
  },

  /**
   * Recupera todos os estados de checkpoint para uma partida
   */
  async getCheckpointStates(eventoId: string, partidaId: string) {
    try {
      const res = await fetch(
        `${API_URL}/zone-conquest/checkpoint-estados/${encodeURIComponent(eventoId)}/${encodeURIComponent(partidaId)}`,
        {
          headers: getAuthHeaders(),
        }
      );
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ao carregar checkpoint states (${res.status})`);
      }
      return res.json();
    } catch (error) {
      console.error('❌ Erro ao carregar checkpoint states:', error);
      throw error;
    }
  },

  /**
   * Recupera estado de um checkpoint específico
   */
  async getCheckpointState(eventoId: string, checkpointId: string, partidaId: string) {
    try {
      const res = await fetch(
        `${API_URL}/zone-conquest/checkpoint-estado/${encodeURIComponent(eventoId)}/${encodeURIComponent(checkpointId)}/${encodeURIComponent(partidaId)}`,
        {
          headers: getAuthHeaders(),
        }
      );
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ao carregar checkpoint state (${res.status})`);
      }
      return res.json();
    } catch (error) {
      console.error('❌ Erro ao carregar checkpoint state:', error);
      throw error;
    }
  },

  /**
   * Atualiza o estado de um checkpoint
   */
  async updateCheckpointState(stateId: string, updates: any) {
    try {
      const res = await fetch(
        `${API_URL}/zone-conquest/checkpoint-estado/${encodeURIComponent(stateId)}`,
        {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(updates),
        }
      );
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ao atualizar checkpoint state (${res.status})`);
      }
      return res.json();
    } catch (error) {
      console.error('❌ Erro ao atualizar checkpoint state:', error);
      throw error;
    }
  },

  /**
   * Recupera todos os estados de zona para uma partida
   */
  async getZoneStates(eventoId: string, partidaId: string) {
    try {
      const res = await fetch(
        `${API_URL}/zone-conquest/zone-estados/${encodeURIComponent(eventoId)}/${encodeURIComponent(partidaId)}`,
        {
          headers: getAuthHeaders(),
        }
      );
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ao carregar zone states (${res.status})`);
      }
      return res.json();
    } catch (error) {
      console.error('❌ Erro ao carregar zone states:', error);
      throw error;
    }
  },

  /**
   * Recupera estado de uma zona específica
   */
  async getZoneState(eventoId: string, zoneId: string, partidaId: string) {
    try {
      const res = await fetch(
        `${API_URL}/zone-conquest/zone-estado/${encodeURIComponent(eventoId)}/${encodeURIComponent(zoneId)}/${encodeURIComponent(partidaId)}`,
        {
          headers: getAuthHeaders(),
        }
      );
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ao carregar zone state (${res.status})`);
      }
      return res.json();
    } catch (error) {
      console.error('❌ Erro ao carregar zone state:', error);
      throw error;
    }
  },

  /**
   * Atualiza o estado de uma zona
   */
  async updateZoneState(stateId: string, updates: any) {
    try {
      const res = await fetch(
        `${API_URL}/zone-conquest/zone-estado/${encodeURIComponent(stateId)}`,
        {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(updates),
        }
      );
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ao atualizar zone state (${res.status})`);
      }
      return res.json();
    } catch (error) {
      console.error('❌ Erro ao atualizar zone state:', error);
      throw error;
    }
  },

  /**
   * Recupera todas as partidas TEAM para um evento
   */
  async getZoneConquestTeamPartidas(eventoId: string) {
    try {
      const res = await fetch(
        `${API_URL}/zone-conquest/team-partidas/${encodeURIComponent(eventoId)}`,
        {
          headers: getAuthHeaders(),
        }
      );
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ao carregar partidas TEAM (${res.status})`);
      }
      return res.json();
    } catch (error) {
      console.error('❌ Erro ao carregar partidas TEAM:', error);
      throw error;
    }
  },

  /**
   * Recupera todas as partidas INDIVIDUAL para um evento
   */
  async getZoneConquestIndividualPartidas(eventoId: string) {
    try {
      const res = await fetch(
        `${API_URL}/zone-conquest/individual-partidas/${encodeURIComponent(eventoId)}`,
        {
          headers: getAuthHeaders(),
        }
      );
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ao carregar partidas INDIVIDUAL (${res.status})`);
      }
      return res.json();
    } catch (error) {
      console.error('❌ Erro ao carregar partidas INDIVIDUAL:', error);
      throw error;
    }
  },

  /**
   * Limpa todos os estados de uma partida
   */
  async clearZoneConquestState(eventoId: string, partidaId: string) {
    try {
      const res = await fetch(
        `${API_URL}/zone-conquest/clear/${encodeURIComponent(eventoId)}/${encodeURIComponent(partidaId)}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        }
      );
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ao limpar zone conquest state (${res.status})`);
      }
      return res.json();
    } catch (error) {
      console.error('❌ Erro ao limpar zone conquest state:', error);
      throw error;
    }
  },
};

// ==================== NOMES DOS CAMPOS DA API ====================
// A API devolve as linhas do banco com os nomes novos (eventoId, timeId, criancaId, nome, cor,
// pontos...). Telas ainda escritas com os nomes antigos (id, name, color, points...) continuam
// funcionando porque cada linha ganha também esses apelidos de LEITURA, apontando para o valor
// novo. Os nomes novos são a fonte da verdade: ao migrar uma tela, passe a ler os novos e o
// apelido correspondente deixa de ser usado. Um apelido nunca sobrescreve um campo existente.
type TipoLinha = 'evento' | 'time' | 'crianca' | 'checkpoint' | 'brincadeira' | 'pulseira' | 'login';

const APELIDOS_DE_LEITURA: Record<TipoLinha, Record<string, string>> = {
  evento: { id: 'eventoId', name: 'nome', description: 'descricao', date: 'data', time: 'hora', duration: 'duracao' },
  time: { id: 'timeId', name: 'nome', color: 'cor', points: 'pontos', score: 'pontos' },
  crianca: { id: 'criancaId', name: 'nome', nickname: 'apelido', age: 'idade', scores: 'pontos', score: 'pontos', points: 'pontos' },
  checkpoint: { id: 'checkpointId', name: 'nome', type: 'tipo', zone: 'zona', location: 'localizacao', points: 'pontos' },
  brincadeira: { id: 'brincadeiraId', name: 'nome', description: 'descricao', rules: 'regras', type: 'tipo', duration: 'duracao' },
  pulseira: { code: 'codigo' },
  login: { id: 'loginId', role: 'perfil' },
};

function comApelidos(linha: any, tipo: TipoLinha): any {
  if (!linha || typeof linha !== 'object' || Array.isArray(linha)) return linha;
  const copia = { ...linha };
  for (const [apelido, campo] of Object.entries(APELIDOS_DE_LEITURA[tipo])) {
    if (!(apelido in copia) && campo in copia) copia[apelido] = copia[campo];
  }
  return copia;
}

function listaComApelidos(dados: any, tipo: TipoLinha): any {
  return Array.isArray(dados) ? dados.map((linha) => comApelidos(linha, tipo)) : comApelidos(dados, tipo);
}

const METODOS_QUE_DEVOLVEM_LINHAS: Record<string, TipoLinha> = {
  getEventos: 'evento',
  getEvento: 'evento',
  getBrincadeiras: 'brincadeira',
  getTimes: 'time',
  getRankingTimes: 'time',
  getAllCriancas: 'crianca',
  getCriancas: 'crianca',
  getRankingCriancas: 'crianca',
  getPulseiras: 'pulseira',
  getCheckpoints: 'checkpoint',
  getUsers: 'login',
};

for (const [metodo, tipo] of Object.entries(METODOS_QUE_DEVOLVEM_LINHAS)) {
  const original = (api as any)[metodo];
  if (typeof original !== 'function') continue;
  (api as any)[metodo] = async (...args: unknown[]) => listaComApelidos(await original.apply(api, args), tipo);
}
