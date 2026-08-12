export type UserRole = 'participant' | 'organizer' | 'admin';
export type ReviewStatus = 'pending' | 'approved' | 'rejected';
export type EventStatus = 'active' | 'draft' | 'archived';
export type EventDifficulty = 'Начальный' | 'Средний' | 'Высокий' | 'Экспертный';
export type EventFormat = 'online' | 'offline' | 'hybrid';
export type EventCategory = 'elite' | 'local' | 'training';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  verified: boolean;
  createdAt: string;
  city?: string;
  organization?: string;
}

export interface Session {
  user: User;
  expiresAt?: string;
}

export interface AuthResponse {
  accessToken: string;
  session: Session;
}

export interface RefreshResponse {
  accessToken: string;
  session?: Session;
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface ApiError {
  status: number;
  message: string;
  code?: string;
  field?: string;
  details?: Record<string, string>;
}

export interface AdminEvent {
  id: string;
  slug: string;
  title: string;
  shortTitle: string;
  category: EventCategory;
  difficulty: EventDifficulty;
  format: EventFormat;
  regionId: string;
  city: string;
  lat: number;
  lng: number;
  rating: number;
  weight: number;
  organizer: string;
  url: string;
  description: string;
  tags: string[];
  status: EventStatus;
  source: string;
  startDate: string;
  endDate: string;
}

export interface VerificationTicket {
  id: string;
  user: User;
  submittedAt: string;
  status: ReviewStatus;
  details: string;
  contact: string;
  comment?: string;
}

export interface CompetitionRegistrationTicket {
  id: string;
  title: string;
  organizer: string;
  contact: string;
  startDate: string;
  endDate: string;
  format: EventFormat;
  city: string;
  region: string;
  url: string;
  description: string;
  status: ReviewStatus;
  comment?: string;
}

export interface EventUpdate {
  title: string;
  description: string;
  url: string;
  organizer: string;
  format: EventFormat;
  difficulty: EventDifficulty;
  startDate: string;
  endDate: string;
  city: string;
  region: string;
  lat: number;
  lng: number;
  tags: string;
}

export interface UserUpdate {
  username: string;
  email: string;
  role: UserRole;
  verified: boolean;
  city: string;
  organization: string;
}
