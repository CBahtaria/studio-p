export type UserRole = 'admin' | 'editor' | 'viewer' | 'guest';
export type AuthProvider = 'google' | 'apple' | 'email' | 'demo';
export type OS = 'ios' | 'android' | 'macos' | 'windows' | 'linux' | 'generic';

export interface OAuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  provider: AuthProvider;
  scope: string[];
}

export interface UserPreferences {
  themeId: string;
  bgPresetId: string;
  fontSize: 'sm' | 'md' | 'lg';
  animations: boolean;
  blur: number;
  customBg?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  emailVerified?: boolean;
  avatar?: string;
  phone?: string;
  role: UserRole;
  provider: AuthProvider;
  createdAt: number;
  updatedAt: number;
  memberTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  visitCount: number;
  uploadCount: number;
  preferences?: UserPreferences;
}

export interface SignUpData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: 'viewer' | 'editor';
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface Booking {
  id: string;
  clientId: string;
  clientName: string;
  service: string;
  barber: string;
  date: string;
  time: string;
  scheduledAt: string;
  status: BookingStatus;
  price?: string;
  notes?: string;
}

export type AgentStatus = 'idle' | 'run' | 'ok' | 'err' | 'warn';

export interface Agent {
  id: string;
  name: string;
  icon: string;
  status: AgentStatus;
  output?: Record<string, unknown>;
  error?: string;
  ms?: number;
  round: number;
}

export interface OrchestrationResult {
  bookingId: string;
  approved: boolean;
  confidence: number;
  parallelMs: number;
  rounds: number;
  agents: Agent[];
  issuesFixed: number;
  reason?: string;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  module: string;
  message: string;
  data?: Record<string, unknown>;
  sessionId: string;
  userId?: string;
  durationMs?: number;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  tag: string;
  price: number;       // Emalangeni (converted from cents)
  priceCents: number;  // raw DB value (price_swl)
  duration: number;    // minutes
  active: boolean;
}

export interface PerfMark {
  name: string;
  startMs: number;
  endMs?: number;
  durationMs?: number;
  tags?: Record<string, string>;
}

export interface HealthStatus {
  api: 'up' | 'down' | 'degraded';
  db: 'up' | 'down' | 'degraded';
  cdn: 'up' | 'down' | 'degraded';
  uptime: number;
  responseMs: number;
}

export interface OSInfo {
  os: OS;
  label: string;
  icon: string;
  mobile: boolean;
  chromeHeight: number;
}
