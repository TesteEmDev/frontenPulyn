/**
 * Tipos centralizados da aplicação
 */

export interface Event {
  id: string;
  name: string;
  date: string;
  time: string;
  duration: number;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  empresa_id: string;
  enable_display: boolean;
  enable_location: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  points: number;
  ranking: number;
  evento_id: string;
  createdAt: string;
}

export interface Child {
  id: string;
  name: string;
  nickname: string;
  age: number;
  avatar?: string;
  bracelet_code?: string;
  scores: number;
  status: 'active' | 'pending' | 'inactive';
  time_id?: string;
  time_name?: string;
  time_color?: string;
  evento_id: string;
  empresa_id: string;
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  points: number;
  ranking: number;
  evento_id: string;
  childrenIds?: string[];
}

export interface Checkpoint {
  id: string;
  name: string;
  location: string;
  points: number;
  territorio_locked_until?: string;
  territorio_cooldown_until?: string;
  evento_id: string;
  createdAt: string;
}

export interface Score {
  id: string;
  crianca_id: string;
  evento_id: string;
  points: number;
  checkpoint_id?: string;
  checkpoint_name?: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'reception' | 'game_master' | 'display' | 'family' | 'master' | 'kiosk' | 'score_kiosk';
  empresa_id: string;
  status: 'active' | 'pending' | 'inactive';
  plan?: string;
  createdAt?: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  plan: 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'blocked' | 'trial';
  eventsDone: number;
  lastAccess: string;
  createdAt: string;
}

export interface Metric {
  label: string;
  value: number;
  change?: number;
  status?: 'up' | 'down' | 'stable';
}

export interface GameEvent {
  type: string;
  payload?: Record<string, any>;
  timestamp?: string;
}

export interface TerritoryConquest {
  checkpointId: string;
  teamId: string;
  teamColor: string;
  criancaName: string;
  points: number;
  timestamp: string;
}
