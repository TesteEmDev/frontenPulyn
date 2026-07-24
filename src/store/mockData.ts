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
  scores: number;
  status: 'active' | 'inactive';
  achievements: string[];
  bracelet_code?: string;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  points: number;
  members: string[];
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
  displayMessages: DisplayMessage[];
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
  simulateScore: () => void;
  addDisplayMessage: (text: string, type: 'preset' | 'custom') => void;
  clearDisplayMessages: () => void;
  
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
  displayMessages: [],
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
      set({ teams });
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
      set({ children });
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
      set({ checkpoints });
    } catch (error) {
      // Erro silencioso
    }
  },

  loadReadings: async () => {
    try {
      const readings = await api.getLogs(50);
      set({ readingsLog: readings });
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
    // Placeholder
  },

  deleteChild: async (id) => {
    // Placeholder
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
  
  simulateScore: () => {
    const state = get();
    if (!state.gameRunning || state.children.length === 0) return;
    
    const randomChild = state.children[Math.floor(Math.random() * state.children.length)];
    const randomCheckpoint = state.checkpoints[Math.floor(Math.random() * state.checkpoints.length)];
    const randomPoints = Math.floor(Math.random() * 20) + 5;
    
    state.addScore(randomChild.id, randomCheckpoint.id, randomPoints);
  },

  // ==================== DISPLAY MESSAGES ====================
  
  addDisplayMessage: (text, type) => set((state) => ({
    displayMessages: [
      { id: Date.now().toString(), text, type, timestamp: new Date().toLocaleTimeString() }, 
      ...state.displayMessages
    ].slice(0, 50)
  })),
  
  clearDisplayMessages: () => set({ displayMessages: [] }),

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