export type UserRole = 'participant' | 'organizer' | 'admin';
export type ReviewStatus = 'pending' | 'approved' | 'rejected';
export type EventStatus = 'active' | 'draft' | 'archived';
export type EventDifficulty = '\u041d\u0430\u0447\u0430\u043b\u044c\u043d\u044b\u0439' | '\u0421\u0440\u0435\u0434\u043d\u0438\u0439' | '\u0412\u044b\u0441\u043e\u043a\u0438\u0439' | '\u042d\u043a\u0441\u043f\u0435\u0440\u0442\u043d\u044b\u0439';
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
  telegram?: string;
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
  shortTitle?: string;
  organizer: string;
  contact: string;
  startDate: string;
  endDate: string;
  format: EventFormat;
  category?: EventCategory;
  difficulty?: EventDifficulty;
  city: string;
  region: string;
  url: string;
  registrationUrl?: string;
  ctftimeUrl?: string;
  ctfNewsUrl?: string;
  description: string;
  fullDescription?: string;
  teamSize?: string;
  taskCategories?: string[];
  tags?: string[];
  requirements?: string[];
  status: ReviewStatus;
  comment?: string;
}

export interface CompetitionRegistrationRequest {
  title: string;
  shortTitle: string;
  organizer: string;
  contact: string;
  startDate: string;
  endDate: string;
  format: EventFormat;
  category: EventCategory;
  difficulty: EventDifficulty;
  city: string;
  region: string;
  url: string;
  registrationUrl: string;
  ctftimeUrl?: string;
  ctfNewsUrl?: string;
  description: string;
  fullDescription: string;
  teamSize: string;
  taskCategories: string[];
  tags: string[];
  requirements: string[];
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

/** The only profile field a participant may change on their own account. */
export interface ProfileUpdate {
  telegram: string;
}

export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
}
