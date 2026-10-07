// src/store/mockData.ts
import { create } from 'zustand';
import { api } from '../services/api';

// Tipos
export interface Child {
  id: string;
  name: string;
  nickname: string;
  avatar: string;
  age: number;
  parentId?: string;
  teamId?: string | null;
  team_id?: string | null;
  timeId?: string | null;
  team?: string | null;
  scores: number;
  score?: number;
  status: 'active' | 'inactive' | 'pending';
  achievements: string[];
  codigoPulseira?: string;
  bracelet?: string | null;
  eventoId?: string;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  points: number;
  score?: number;
  members: string[];
  icon: string;
}

export interface Checkpoint {
  id: string;
  eventoId?: string;
  name: string;
  type: string;
  ip: string;
  zone: string;
  location?: string | null;
  mapaX?: number | null;
  mapaY?: number | null;
  mapX?: number | null;
  mapY?: number | null;
  territorioDonoTimeId?: string | null;
  territory_owner_color?: string | null;
  territorioTravadoAte?: string | null;
  territorioCooldownAte?: string | null;
  ultimoConquistadoEm?: string | null;
  led: string;
  status: 'online' | 'offline' | 'configured';
  points: number;
  authorizedTags?: string[];
}

export interface Game {
  id: string;
  name: string;
  description: string;
  type: 'team' | 'individual' | 'cooperative' | 'treasure_hunt' | 'monster_hunt';
  duration: number;
  checkpoints: string[];
  status: 'active' | 'paused' | 'finished' | 'inactive';
  eventoId?: string;
}

export interface ReadingLog {
  id: string;
  checkpointId: string;
  uid: string;
  authorized: boolean;
  signal: number;
  timestamp: string;
  gameId: string;
}

export interface ScoreLog {
  id: string;
  childId: string;
  child_id?: string;
  childName: string;
  checkpointId: string;
  checkpoint: string;
  checkpoint_name?: string;
  game?: string;
  brincadeiraId?: string;
  points: number;
  timestamp: string;
  created_at?: string;
  justification?: string;
}

export interface Event {
  eventoId: string;
  nome: string;
  data: string;
  hora?: string;
  location: string;
  duracao?: number;
  childrenCount?: number;
  status: 'active' | 'scheduled' | 'finished' | 'upcoming' | 'ongoing' | 'completed';
  nomeResponsavel?: string | null;
  iniciadoEm?: string | null;
  finalizadoEm?: string | null;
  autoInicio?: number | null;
  autoFim?: number | null;
}

export interface DisplayMessage {
  id: string;
  text: string;
  type: 'preset' | 'custom';
  timestamp: string;
}

export interface Settings {
  [key: string]: string;
}

interface PulynStore {
  children: Child[];
  teams: Team[];
  checkpoints: Checkpoint[];
  games: Game[];
  events: Event[];
  currentGameId: string | null;
  currentPartidaId: string | null;
  readingsLog: ReadingLog[];
  scoreLog: ScoreLog[];
  activeGame: Game | null;
  gameTimer: number;
  gameRunning: boolean;
  gameRound: number;
  eventoAtualId: string | null;
  clientes: any[];
  brincadeiras: any[];
  settings: Settings;
  
  // Ações existentes...
  addChild: (child: Omit<Child, 'id'>) => Promise<void>;
  updateChild: (id: string, data: Partial<Child>) => Promise<void>;
  deleteChild: (id: string) => Promise<void>;
  
  addTeam: (team: Omit<Team, 'id' | 'points' | 'members'>) => Promise<void>;
  updateTeam: (id: string, data: Partial<Team>) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
  
  addCheckpoint: (checkpoint: Checkpoint) => void;
  updateCheckpoint: (id: string, data: Partial<Checkpoint>) => void;
  applyTerritoryConquest: (checkpointId: string, teamId?: string | null, teamColor?: string | null) => void;
  deleteCheckpoint: (id: string) => void;
  updateCheckpointStatus: (id: string, status: Checkpoint['status']) => void;
  
  addGame: (game: Game) => void;
  updateGame: (id: string, data: Partial<Game>) => void;
  deleteGame: (id: string) => void;
  setCurrentGame: (id: string | null) => void;
  setCurrentPartida: (id: string | null) => void;
  
  addScore: (childId: string, checkpointId: string, points: number) => void;
  addScoreWithReason: (childId: string, checkpointId: string, points: number, justification?: string) => void;
  addReadingLog: (reading: ReadingLog) => void;
  
  addEvent: (event: Event) => void;
  updateEvent: (id: string, data: Partial<Event>) => void;
  deleteEvent: (id: string) => void;
  
  setGameTimer: (timer: number) => void;
  setGameRunning: (running: boolean) => void;
  setActiveGame: (game: Game | null) => void;
  nextRound: () => void;
  
  // Sincronização
  syncAll: () => Promise<void>;
  loadTeams: () => Promise<void>;
  loadChildren: () => Promise<void>;
  loadCheckpoints: () => Promise<void>;
  loadReadings: () => Promise<void>;
  loadEventos: () => Promise<any[]>;
  loadEvents: () => Promise<Event[]>;
  loadBrincadeiras: () => Promise<any[]>;
  loadGames: () => Promise<Game[]>;
  loadScoreLog: () => Promise<void>;
  clearScoreLog: () => void;
  loadClientes: () => Promise<any[]>;
  loadTimes: () => Promise<void>;
  loadPulseiras: () => Promise<any[]>;
  createPulseira: (code: string) => Promise<void>;
  setEventoAtual: (id: string | null) => void;
  loadEventoAtual: () => Promise<any>;
  
  // Settings
  loadSettings: () => Promise<Settings>;
  updateSetting: (key: string, value: string) => Promise<void>;
  updateSettings: (settings: Settings) => Promise<void>;
}

// Estado inicial mockado
const mockChildren: Child[] = [];
const mockTeams: Team[] = [];
const mockCheckpoints: Checkpoint[] = [];
const mockGames: Game[] = [];
const mockEvents: Event[] = [];

export const usePulynStore = create<PulynStore>((set, get) => ({
  // Estado inicial
  children: mockChildren,
  teams: mockTeams,
  checkpoints: mockCheckpoints,
  games: mockGames,
  events: mockEvents,
  currentGameId: null,
  currentPartidaId: null,
  readingsLog: [],
  scoreLog: [],
  activeGame: null,
  gameTimer: 0,
  gameRunning: false,
  gameRound: 1,
  eventoAtualId: null,
  clientes: [],
  brincadeiras: [],
  settings: {},

  // ==================== SINCRONIZAÇÃO ====================
  
  syncAll: async () => {
    await Promise.all([
      get().loadTeams(),
      get().loadChildren(),
      get().loadCheckpoints(),
      get().loadReadings(),
      get().loadScoreLog(),
      get().loadBrincadeiras(),
    ]);
  },

  loadTeams: async () => {
    try {
      const state = get();
      if (!state.eventoAtualId) {
        console.warn('⚠️ loadTeams: Nenhum evento selecionado');
        return;
      }
      const eventId = state.eventoAtualId;
      const teams = await api.getTimes(eventId);
      if (get().eventoAtualId !== eventId) return;
      
      console.log(`✅ loadTeams: ${(Array.isArray(teams) ? teams : []).length} times carregados`);
      
      const normalizedTeams = (Array.isArray(teams) ? teams : []).map((team: any) => ({
        ...team,
        // A API devolve a linha do banco (timeId, nome, cor, pontos); o resto do app usa id/name/color.
        id: team.id ?? team.timeId,
        name: team.name ?? team.nome,
        color: team.color ?? team.cor,
        points: Number(team.pontos ?? team.points ?? team.score ?? 0),
        score: Number(team.pontos ?? team.score ?? team.points ?? 0),
        members: Array.isArray(team.members) ? team.members : state.children.filter((child) => (child.teamId ?? child.team_id ?? child.timeId) === team.id).map((child) => child.id),
        icon: team.icon || '🏆',
      }));
      set({ teams: normalizedTeams });
    } catch (error) {
      console.error('❌ Erro ao carregar times:', error);
    }
  },

  loadChildren: async () => {
    try {
      const state = get();
      if (!state.eventoAtualId) {
        return;
      }
      const eventId = state.eventoAtualId;
      const children = await api.getCriancas(eventId);
      if (get().eventoAtualId !== eventId) return;
      const normalizedChildren = (Array.isArray(children) ? children : []).map((child: any) => ({
        ...child,
        // Linha do banco (criancaId, nome, apelido, idade) -> modelo usado pelas telas.
        id: child.id ?? child.criancaId,
        name: child.name ?? child.nome,
        nickname: child.nickname ?? child.apelido,
        age: child.age ?? child.idade,
        teamId: child.teamId ?? child.team_id ?? child.timeId ?? null,
        team_id: child.team_id ?? child.teamId ?? child.timeId ?? null,
        timeId: child.timeId ?? child.team_id ?? child.teamId ?? null,
        team: child.team ?? child.team_id ?? child.teamId ?? child.timeId ?? null,
        scores: Number(child.pontos ?? child.pontos ?? 0),
        score: Number(child.pontos ?? child.pontos ?? 0),
        bracelet: child.bracelet ?? child.codigoPulseira ?? null,
        achievements: child.achievements || [],
      }));
      set((state) => ({
        children: normalizedChildren,
        teams: state.teams.map((team) => ({
          ...team,
          members: normalizedChildren.filter((child) => child.teamId === team.id).map((child) => child.id),
        })),
      }));
    } catch {
      // Erro silencioso
    }
  },

  loadCheckpoints: async () => {
    try {
      const state = get();
      if (!state.eventoAtualId) {
        return;
      }
      const eventId = state.eventoAtualId;
      const checkpoints = await api.getCheckpoints(eventId);
      if (get().eventoAtualId !== eventId) return;
      const normalizedCheckpoints = (Array.isArray(checkpoints) ? checkpoints : []).map((checkpoint: any) => ({
        ...checkpoint,
        // Linha do banco (checkpointId, nome, tipo, localizacao) -> modelo usado pelas telas.
        id: checkpoint.id ?? checkpoint.checkpointId,
        name: checkpoint.name ?? checkpoint.nome,
        type: checkpoint.type ?? checkpoint.tipo,
        location: checkpoint.location ?? checkpoint.localizacao,
        points: Number(checkpoint.pontos ?? 0),
        zone: checkpoint.zona || checkpoint.localizacao || 'Sem zona',
        status: checkpoint.status || 'offline',
      }));
      set({ checkpoints: normalizedCheckpoints });
    } catch {
      // Erro silencioso
    }
  },

  loadReadings: async () => {
    try {
      const eventId = get().eventoAtualId;
      if (!eventId) return;
      const readings = await api.getLogs(50);
      if (get().eventoAtualId === eventId) {
        set({ readingsLog: Array.isArray(readings) ? readings : [] });
      }
    } catch (error) {
      console.error('❌ Erro ao carregar leituras:', error);
    }
  },

  loadScoreLog: async () => {
    try {
      const eventId = get().eventoAtualId;
      const currentPartidaId = get().currentPartidaId;
      if (!eventId) return;

      // 🆕 Passar sessionId para filtrar apenas dados da sessão atual
      const history = await api.getScoreHistory(eventId, 100, currentPartidaId ?? undefined);
      if (get().eventoAtualId !== eventId) return;

      const normalizedHistory = (Array.isArray(history) ? history : []).map((entry: any) => ({
        ...entry,
        childId: entry.childId ?? entry.child_id,
        childName: entry.childName ?? entry.child_nome ?? entry.child_apelido ?? 'Participante',
        checkpointId: entry.checkpointId,
        checkpoint: entry.checkpoint ?? entry.checkpoint_nome ?? 'Checkpoint',
        points: Number(entry.pontos ?? entry.points ?? 0),
        timestamp: entry.timestamp ?? entry.criadoEm,
        teamColor: entry.teamColor ?? entry.team_color ?? '#FFFF00',
      }));
      set({ scoreLog: normalizedHistory });
    } catch (error) {
      console.error('❌ Erro ao carregar histórico de pontuações:', error);
    }
  },

  // 🆕 Resetar scoreLog quando novo jogo começa
  clearScoreLog: () => set({ scoreLog: [] }),

  loadEventos: async () => {
    try {
      console.log('🔍 [loadEventos] Chamando api.getEventos()...');
      const eventos = await api.getEventos();
      console.log('✅ [loadEventos] Resposta recebida:', eventos);
      set({ events: eventos });
      return eventos;
    } catch (error) {
      console.error('❌ [loadEventos] Erro ao carregar eventos:', error);
      return [];
    }
  },

  loadEvents: async () => {
    const eventos = await get().loadEventos();
    return Array.isArray(eventos) ? eventos as Event[] : [];
  },

  loadBrincadeiras: async () => {
    try {
      const brincadeiras = await api.getBrincadeiras(get().eventoAtualId || undefined);
      set({ brincadeiras });
      return brincadeiras;
    } catch (error) {
      console.error('❌ Erro ao carregar jogos:', error);
      return [];
    }
  },

  loadGames: async () => {
    const brincadeiras = await get().loadBrincadeiras();
    const games = (Array.isArray(brincadeiras) ? brincadeiras : []).map((game: any) => ({
      ...game,
      // Linha do banco (brincadeiraId, nome, tipo, regras) -> modelo usado pelas telas.
      id: game.id ?? game.brincadeiraId,
      name: game.name ?? game.nome,
      type: game.type ?? game.tipo,
      rules: game.rules ?? game.regras,
      description: game.description || game.descricao || '',
      duration: Number(game.duration ?? game.duracao ?? 0),
      checkpoints: Array.isArray(game.checkpoints) ? game.checkpoints : [],
      status: game.status || 'active',
    })) as Game[];
    set({ games });
    return games;
  },

  loadClientes: async () => {
    try {
      const clientes = await api.getClientes();
      set({ clientes });
      return clientes;
    } catch {
      return [];
    }
  },

  loadTimes: async () => {
    return get().loadTeams();
  },

  loadPulseiras: async () => {
    try {
      const pulseiras = await api.getPulseiras();
      return pulseiras;
    } catch (error) {
      console.error('❌ Erro ao carregar pulseiras:', error);
      return [];
    }
  },

  createPulseira: async (code) => {
    try {
      await api.createPulseira(code);
    } catch (error) {
      console.error('❌ Erro ao criar pulseira:', error);
      throw error;
    }
  },

  setEventoAtual: (id) => set((state) => {
    if (state.eventoAtualId === id) return state;
    return {
      eventoAtualId: id,
      children: [],
      teams: [],
      checkpoints: [],
      readingsLog: [],
      scoreLog: [],
      brincadeiras: [],
      games: [],
      currentGameId: null,
      activeGame: null,
      gameTimer: 0,
      gameRunning: false,
    };
  }),

  loadEventoAtual: async () => {
    const state = get();
    if (!state.eventoAtualId) return null;
    try {
      const evento = await api.getEvento(state.eventoAtualId);
      return evento;
    } catch (error) {
      console.error('Erro ao carregar evento atual:', error);
      return null;
    }
  },

  // ==================== TEAMS ====================
  
  addTeam: async (team) => {
    const state = get();
    if (!state.eventoAtualId) return;
    try {
      await api.createTime(state.eventoAtualId, team);
      await get().loadTeams();
    } catch (error) {
      console.error('❌ Erro ao criar time:', error);
    }
  },

  updateTeam: async (id, data) => {
    try {
      await api.updateTime(id, data);
      await get().loadTeams();
    } catch (error) {
      console.error('❌ Erro ao atualizar time:', error);
    }
  },

  deleteTeam: async (id) => {
    try {
      await api.deleteTime(id);
      await get().loadTeams();
    } catch (error) {
      console.error('❌ Erro ao deletar time:', error);
    }
  },

  // ==================== CHILDREN ====================
  
  addChild: async (child) => {
    const state = get();
    if (!state.eventoAtualId) return;
    try {
      await api.createCrianca(state.eventoAtualId, child);
      await get().loadChildren();
      await get().loadTeams();
    } catch (error) {
      console.error('❌ Erro ao criar criança:', error);
      throw error;
    }
  },

  updateChild: async (id, data) => {
    const state = get();
    if (!state.eventoAtualId) return;
    await api.updateCrianca(state.eventoAtualId, id, {
      nome: data.name,
      apelido: data.nickname,
      age: data.age,
      avatar: data.avatar,
      braceletCode: data.codigoPulseira ?? data.bracelet,
      timeId: data.teamId ?? data.team_id ?? data.timeId,
    });
    await Promise.all([get().loadChildren(), get().loadTeams()]);
  },

  deleteChild: async (id) => {
    const state = get();
    if (!state.eventoAtualId) return;
    await api.deleteCrianca(state.eventoAtualId, id);
    await Promise.all([get().loadChildren(), get().loadTeams()]);
  },

  // ==================== CHECKPOINTS ====================
  
  addCheckpoint: (checkpoint) => set((state) => ({ 
    checkpoints: [...state.checkpoints, checkpoint] 
  })),
  
  updateCheckpoint: (id, data) => set((state) => ({
    checkpoints: state.checkpoints.map((cp) => cp.id === id ? { ...cp, ...data } : cp)
  })),

  applyTerritoryConquest: (checkpointId, teamId, teamColor) => set((state) => ({
    checkpoints: state.checkpoints.map((checkpoint) => String(checkpoint.id) === String(checkpointId)
      ? {
          ...checkpoint,
          territorioDonoTimeId: teamId ?? checkpoint.territorioDonoTimeId,
          territory_owner_color: teamColor || checkpoint.territory_owner_color,
        }
      : checkpoint),
  })),
  
  deleteCheckpoint: (id) => set((state) => ({
    checkpoints: state.checkpoints.filter((cp) => cp.id !== id)
  })),
  
  updateCheckpointStatus: (id, status) => set((state) => ({
    checkpoints: state.checkpoints.map((cp) => cp.id === id ? { ...cp, status } : cp)
  })),

  // ==================== GAMES ====================
  
  addGame: (game) => set((state) => ({ games: [...state.games, game] })),
  
  updateGame: (id, data) => set((state) => ({
    games: state.games.map((game) => game.id === id ? { ...game, ...data } : game)
  })),
  
  deleteGame: (id) => set((state) => ({ games: state.games.filter((g) => g.id !== id) })),
  
  setCurrentGame: (id) => set({ currentGameId: id }),
  setCurrentPartida: (id) => set({ currentPartidaId: id }),

  // ==================== SCORES ====================
  
  addScore: (childId, checkpointId, points) => {
    const state = get();
    const checkpoint = state.checkpoints.find(cp => cp.id === checkpointId);
    const child = state.children.find(c => c.id === childId);
    const actualPoints = checkpoint?.points || points;
    
    if (!child) return;
    
    const updatedChildren = state.children.map(c => 
      c.id === childId ? { ...c, scores: c.scores + actualPoints } : c
    );
    
    const updatedTeams = state.teams.map(team => 
      child.teamId && team.id === child.teamId
        ? { ...team, points: team.points + actualPoints }
        : team
    );
    
    const newScoreLog: ScoreLog = {
      id: Date.now().toString(),
      childId,
      childName: child.nickname || child.name,
      checkpointId,
      checkpoint: checkpoint?.name || checkpointId,
      points: actualPoints,
      timestamp: new Date().toLocaleTimeString('pt-BR'),
    };
    
    set({
      children: updatedChildren,
      teams: updatedTeams,
      scoreLog: [newScoreLog, ...state.scoreLog]
    });
  },
  
  addScoreWithReason: (childId, checkpointId, points, justification) => {
    const state = get();
    const checkpoint = state.checkpoints.find(cp => cp.id === checkpointId);
    const child = state.children.find(c => c.id === childId);
    
    if (!child) return;
    
    const updatedChildren = state.children.map(c => 
      c.id === childId ? { ...c, scores: c.scores + points } : c
    );
    
    const updatedTeams = state.teams.map(team => 
      child.teamId && team.id === child.teamId
        ? { ...team, points: team.points + points }
        : team
    );
    
    const newScoreLog: ScoreLog = {
      id: Date.now().toString(),
      childId,
      childName: child.nickname || child.name,
      checkpointId,
      checkpoint: checkpoint?.name || checkpointId,
      points,
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      justification,
    };
    
    set({
      children: updatedChildren,
      teams: updatedTeams,
      scoreLog: [newScoreLog, ...state.scoreLog]
    });
  },
  
  addReadingLog: (reading) => set((state) => ({
    readingsLog: [reading, ...state.readingsLog].slice(0, 100)
  })),

  // ==================== EVENTS ====================
  
  addEvent: (event) => set((state) => ({ events: [...state.events, event] })),
  
  updateEvent: (id, data) => set((state) => ({
    events: state.events.map((event) => event.eventoId === id ? { ...event, ...data } : event)
  })),
  
  deleteEvent: (id) => set((state) => ({ events: state.events.filter((e) => e.eventoId !== id) })),

  // ==================== GAME CONTROL ====================
  
  setGameTimer: (timer) => set({ gameTimer: timer }),
  
  setGameRunning: (running) => set({ gameRunning: running }),
  
  setActiveGame: (game) => {
    if (game) {
      set({ 
        activeGame: game, 
        gameTimer: game.duration * 60,
        gameRunning: false 
      });
    } else {
      set({ activeGame: null });
    }
  },
  
  nextRound: () => set((state) => ({ 
    gameRound: Math.min(state.gameRound + 1, 3) 
  })),
  
  // ==================== SETTINGS ====================
  
  loadSettings: async () => {
    const settings = await api.getSettings();
    set({ settings });
    return settings;
  },

  // Os erros sobem para quem chamou: engolir a falha fazia a tela mostrar "salvo" sem ter salvo.
  updateSetting: async (key: string, value: string) => {
    await api.updateSetting(key, value);
    await get().loadSettings();
  },

  updateSettings: async (settings: Record<string, string>) => {
    await api.updateSettings(settings);
    await get().loadSettings();
  },
}));