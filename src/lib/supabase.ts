import { createClient } from '@supabase/supabase-js';
import type { UserProfile, UserPreferences, Booking, AuthProvider } from '@/types';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !key) {
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set');
}

export const supabase = createClient(url, key, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Typed DB row shapes (snake_case from Postgres → camelCase in app via helpers below)
export interface ProfileRow {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  phone: string | null;
  role: 'admin' | 'editor' | 'viewer' | 'guest';
  provider: string;
  member_tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  visit_count: number;
  upload_count: number;
  preferences: UserPreferences | null;
  created_at: string;
  updated_at: string;
}

export interface BookingRow {
  id: string;
  client_id: string | null;
  client_name: string;
  service: string;
  barber: string;
  scheduled_at: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  price_swl: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function rowToProfile(row: Record<string, unknown>): UserProfile {
  // Basic runtime validation for critical properties
  if (
    typeof row.id !== 'string' ||
    typeof row.name !== 'string' ||
    typeof row.email !== 'string' ||
    typeof row.role !== 'string' ||
    typeof row.provider !== 'string' ||
    typeof row.member_tier !== 'string' ||
    typeof row.visit_count !== 'number' ||
    typeof row.upload_count !== 'number' ||
    typeof row.created_at !== 'string' ||
    typeof row.updated_at !== 'string'
  ) {
    throw new Error('Invalid ProfileRow structure received from database.');
  }

  // Now we can safely cast 'row' to 'ProfileRow' for easier access,
  // knowing basic types are correct. This 'as ProfileRow' is now conditionally safe.
  const typedRow = row as ProfileRow;

  const validProviders: AuthProvider[] = ['email', 'google', 'apple', 'demo'];
  const validatedProvider: AuthProvider = 
    (validProviders.includes(typedRow.provider as AuthProvider))
      ? typedRow.provider as AuthProvider
      : 'email'; // Default to 'email' if it's not one of the known types

  return {
    id: typedRow.id,
    name: typedRow.name,
    email: typedRow.email,
    avatar: typedRow.avatar ?? undefined,
    phone: typedRow.phone ?? undefined,
    role: typedRow.role,
    provider: validatedProvider,
    memberTier: typedRow.member_tier,
    visitCount: typedRow.visit_count,
    uploadCount: typedRow.upload_count,
    preferences: typedRow.preferences ?? undefined,
    createdAt: new Date(typedRow.created_at).getTime(),
    updatedAt: new Date(typedRow.updated_at).getTime(),
    emailVerified: true,
  };
}

export function rowToBooking(row: BookingRow): Booking {
  const dt = new Date(row.scheduled_at);
  return {
    id: row.id,
    clientId: row.client_id ?? '',
    clientName: row.client_name,
    service: row.service,
    barber: row.barber,
    date: dt.toLocaleDateString('en-ZA'),
    time: dt.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false }),
    scheduledAt: row.scheduled_at,
    status: row.status,
    price: row.price_swl ? `E${Math.round(row.price_swl / 100)}` : undefined,
    notes: row.notes ?? undefined,
  };
}
