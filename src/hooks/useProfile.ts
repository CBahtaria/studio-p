import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { rowToProfile, type ProfileRow } from '@/lib/supabase';
import type { UserProfile } from '@/types';

export interface UseProfileReturn {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  fetchProfile: (userId: string) => Promise<void>;
  updateProfile: (updates: Partial<Pick<UserProfile, 'name' | 'phone' | 'avatar' | 'preferences'>>) => Promise<void>;
}

export function useProfile(initialProfile: UserProfile | null = null): UseProfileReturn {
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setLoading(false);
    if (err) { setError(err.message); return; }
    setProfile(rowToProfile(data as ProfileRow));
  }, []);

  const updateProfile = useCallback(async (
    updates: Partial<Pick<UserProfile, 'name' | 'phone' | 'avatar' | 'preferences'>>
  ) => {
    if (!profile) return;
    setLoading(true);
    setError(null);

    const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar;
    if (updates.preferences !== undefined) dbUpdates.preferences = updates.preferences;

    const { error: err } = await supabase
      .from('profiles')
      .update(dbUpdates)
      .eq('id', profile.id);

    setLoading(false);
    if (err) { setError(err.message); return; }
    setProfile({ ...profile, ...updates, updatedAt: Date.now() });
  }, [profile]);

  return { profile, loading, error, fetchProfile, updateProfile };
}
