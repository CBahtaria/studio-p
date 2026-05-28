import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { UserPreferences, UserProfile } from '@/types';

const DEFAULT_PREFS: UserPreferences = {
  themeId: 'midnight',
  bgPresetId: 'default',
  fontSize: 'md',
  animations: true,
  blur: 50,
};

const LOCAL_KEY = 'studiop_prefs_local';

function loadLocal(): UserPreferences {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export function usePreferences(profile: UserProfile | null) {
  const [prefs, setPrefs] = useState<UserPreferences>(() => {
    return profile?.preferences ? { ...DEFAULT_PREFS, ...profile.preferences } : loadLocal();
  });

  // Sync from DB when profile loads/changes
  useEffect(() => {
    if (profile?.preferences) {
      setPrefs({ ...DEFAULT_PREFS, ...profile.preferences });
    }
  }, [profile?.id]);

  const updatePrefs = useCallback(async (updates: Partial<UserPreferences>) => {
    const next = { ...prefs, ...updates };
    setPrefs(next);

    // Always mirror to localStorage as fallback
    localStorage.setItem(LOCAL_KEY, JSON.stringify(next));

    // Persist to DB if authenticated
    if (profile?.id && profile.provider !== 'demo') {
      await supabase
        .from('profiles')
        .update({ preferences: next, updated_at: new Date().toISOString() })
        .eq('id', profile.id);
    }
  }, [prefs, profile]);

  const resetPrefs = useCallback(async () => {
    setPrefs(DEFAULT_PREFS);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(DEFAULT_PREFS));
    if (profile?.id && profile.provider !== 'demo') {
      await supabase
        .from('profiles')
        .update({ preferences: DEFAULT_PREFS, updated_at: new Date().toISOString() })
        .eq('id', profile.id);
    }
  }, [profile]);

  return { prefs, updatePrefs, resetPrefs };
}
