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
  parentId: string;
  teamId?: string;
  team_id?: string | null;
  team?: string | null;
  scores: number;
  score?: number;
  status: 'active' | 'inactive';
  achievements: string[];
  bracelet_code?: string;
  bracelet?: string | null;
  time_id?: string | null;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  points: number;
  score?: number;
  members: string[];
  icon?: string;
}

export interface Checkpoint {
  id: string;
  name: string;
  type: string;
  ip: string;
  zone: string;
  led: string;
  status: 'online' | 'offline' | 'configured';
  points?: number;
  authorizedTags?: string[];
}

export interface Game {
  id: string;
  name: string;
  description: string;
  type: 'team' | 'individual' | 'cooperative' | 'treasure_hunt';
  duration: number;
  checkpoints: string[];
  status: 'active' | 'paused' | 'finished';
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
  childName: string;
  checkpointId: string;
  checkpoint: string;
  points: number;
  timestamp: string;
  justification?: string;
}

export interface Event {
  id: string;
  name: string;
  date: string;
  location: string;
  status: 'upcoming' | 'ongoing' | 'completed';
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
  deleteCheckpoint: (id: string) => void;
  updateCheckpointStatus: (id: string, status: Checkpoint['status']) => void;
  
  addGame: (game: Game) => void;
  updateGame: (id: string, data: Partial<Game>) => void;
  deleteGame: (id: string) => void;
  setCurrentGame: (id: string | null) => void;
  
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
  loadBrincadeiras: () => Promise<any[]>;
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
      get().loadBrincadeiras(),
    ]);
  },

  loadTeams: async () => {
    try {
      const state = get();
      if (!state.eventoAtualId) {
        return;
      }
      const teams = await api.getTimes(state.eventoAtualId);
      const normalizedTeams = (Array.isArray(teams) ? teams : []).map((team: any) => ({
        ...team,
        points: Number(team.points ?? team.score ?? 0),
        score: Number(team.score ?? team.points ?? 0),
        members: Array.isArray(team.members) ? team.members : state.children.filter((child) => (child.teamId ?? child.team_id ?? child.time_id) === team.id).map((child) => child.id),
        icon: team.icon || '🏆',
      }));
      set({ teams: normalizedTeams });
    } catch (error) {
      // Erro silencioso
    }
  },

  loadChildren: async () => {
    try {
      const state = get();
      if (!state.eventoAtualId) {
        return;
      }
      const children = await api.getCriancas(state.eventoAtualId);
      const normalizedChildren = (Array.isArray(children) ? children : []).map((child: any) => ({
        ...child,
        teamId: child.teamId ?? child.team_id ?? child.time_id ?? null,
        team_id: child.team_id ?? child.teamId ?? child.time_id ?? null,
        time_id: child.time_id ?? child.team_id ?? child.teamId ?? null,
        team: child.team ?? child.team_id ?? child.teamId ?? child.time_id ?? null,
        scores: Number(child.scores ?? child.score ?? 0),
        score: Number(child.score ?? child.scores ?? 0),
        bracelet: child.bracelet ?? child.bracelet_code ?? null,
        achievements: child.achievements || [],
      }));
      set((state) => ({
        children: normalizedChildren,
        teams: state.teams.map((team) => ({
          ...team,
          members: normalizedChildren.filter((child) => child.teamId === team.id).map((child) => child.id),
        })),
      }));
    } catch (error) {
      // Erro silencioso
    }
  },

  loadCheckpoints: async () => {
    try {
      const state = get();
      if (!state.eventoAtualId) {
        return;
      }
      const checkpoints = await api.getCheckpoints(state.eventoAtualId);
      set({ checkpoints: Array.isArray(checkpoints) ? checkpoints : [] });
    } catch (error) {
      // Erro silencioso
    }
  },

  loadReadings: async () => {
    try {
      const readings = await api.getLogs(50);
      set({ readingsLog: Array.isArray(readings) ? readings : [] });
    } catch (error) {
      // Erro silencioso
    }
  },

  loadEventos: async () => {
    try {
      const eventos = await api.getEventos();
      set({ events: eventos });
      return eventos;
    } catch (error) {
      return [];
    }
  },

  loadBrincadeiras: async () => {
    try {
      const brincadeiras = await api.getBrincadeiras();
      set({ brincadeiras });
      return brincadeiras;
    } catch (error) {
      return [];
    }
  },

  loadClientes: async () => {
    try {
      const clientes = await api.getClientes();
      set({ clientes });
      return clientes;
    } catch (error) {
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

  setEventoAtual: (id) => set({ eventoAtualId: id }),

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
      name: data.name,
      nickname: data.nickname,
      age: data.age,
      avatar: data.avatar,
      braceletCode: data.bracelet_code ?? data.bracelet,
      timeId: data.teamId ?? data.team_id ?? data.time_id,
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
    events: state.events.map((event) => event.id === id ? { ...event, ...data } : event)
  })),
  
  deleteEvent: (id) => set((state) => ({ events: state.events.filter((e) => e.id !== id) })),

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
    try {
      const settings = await api.getSettings();
      set({ settings });
      return settings;
    } catch (error) {
      console.error('❌ Erro ao carregar configurações:', error);
      return {};
    }
  },

  updateSetting: async (key: string, value: string) => {
    try {
      await api.updateSetting(key, value);
      await get().loadSettings();
    } catch (error) {
      console.error('❌ Erro ao atualizar configuração:', error);
    }
  },

  updateSettings: async (settings: Record<string, string>) => {
    try {
      await api.updateSettings(settings);
      await get().loadSettings();
    } catch (error) {
      console.error('❌ Erro ao atualizar configurações:', error);
    }
  },
}));