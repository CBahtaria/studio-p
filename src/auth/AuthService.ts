// ════════════════════════════════════════════════
// STUDIO P — AuthService (Supabase-backed)
// Real auth: email+password with verification, Google, Apple
// Demo mode gated behind VITE_ENABLE_DEMO_MODE env flag
// ════════════════════════════════════════════════

import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, rowToProfile, type ProfileRow } from '@/lib/supabase';
import type { UserProfile, UserRole, SignUpData } from '@/types';
import { logger } from '@/core/logger';

export interface AuthResult {
  profile: UserProfile;
  needsVerification?: boolean;
}

class AuthService {
  private static instance: AuthService;
  private currentProfile: UserProfile | null = null;

  static getInstance(): AuthService {
    if (!AuthService.instance) AuthService.instance = new AuthService();
    return AuthService.instance;
  }

  private constructor() {}

  async signUp(data: SignUpData): Promise<AuthResult> {
    logger.info('AuthService', 'Sign-up initiated', { email: data.email });

    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { name: data.name, phone: data.phone ?? null, role: data.role ?? 'viewer' },
        emailRedirectTo: `${import.meta.env.VITE_PUBLIC_URL ?? window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      logger.error('AuthService', 'Sign-up failed', { error: error.message });
      throw new Error(error.message);
    }

    if (!authData.user) throw new Error('Sign-up failed — no user returned');

    if (!authData.session) {
      logger.info('AuthService', 'Verification email sent', { email: data.email });
      return {
        profile: {
          id: authData.user.id,
          name: data.name,
          email: data.email,
          role: 'viewer',
          provider: 'email',
          memberTier: 'bronze',
          visitCount: 0,
          uploadCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          emailVerified: false,
        },
        needsVerification: true,
      };
    }

    const profile = await this.fetchProfile(authData.user.id);
    this.currentProfile = profile;
    return { profile };
  }

  async signIn(email: string, password: string): Promise<AuthResult> {
    logger.info('AuthService', 'Sign-in initiated', { email });

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      logger.warn('AuthService', 'Sign-in failed', { error: error.message });
      throw new Error(error.message);
    }

    if (!data.user) throw new Error('Sign-in failed');

    if (!data.user.email_confirmed_at) {
      const userName = typeof data.user.user_metadata?.name === 'string' ? data.user.user_metadata.name : email.split('@')[0];
      return {
        profile: {
          id: data.user.id,
          name: userName,
          email,
          role: 'viewer',
          provider: 'email',
          memberTier: 'bronze',
          visitCount: 0,
          uploadCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          emailVerified: false,
        },
        needsVerification: true,
      };
    }

    const profile = await this.fetchProfile(data.user.id);
    this.currentProfile = profile;
    logger.info('AuthService', 'Sign-in complete', { id: profile.id, role: profile.role });
    return { profile };
  }

  private get callbackUrl(): string {
    const base = import.meta.env.VITE_PUBLIC_URL ?? window.location.origin;
    return `${base}/auth/callback`;
  }

  async signInWithGoogle(): Promise<void> {
    sessionStorage.setItem('oauth_pending', '1');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: this.callbackUrl, scopes: 'openid email profile' },
    });
    if (error) {
      sessionStorage.removeItem('oauth_pending');
      throw new Error(error.message);
    }
  }

  async signInWithApple(): Promise<void> {
    sessionStorage.setItem('oauth_pending', '1');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: this.callbackUrl },
    });
    if (error) {
      sessionStorage.removeItem('oauth_pending');
      throw new Error(error.message);
    }
  }

  async signInDemo(role: UserRole): Promise<UserProfile> {
    if (import.meta.env.VITE_ENABLE_DEMO_MODE !== 'true') {
      throw new Error('Demo mode is disabled in this environment');
    }
    const DEMO: Record<UserRole, UserProfile> = {
      admin:  { id: 'demo-admin',  name: 'Studio P Admin', email: 'admin@studiop.sz',  role: 'admin',  provider: 'demo', memberTier: 'platinum', visitCount: 150, uploadCount: 0,  createdAt: 0, updatedAt: 0 },
      editor: { id: 'demo-editor', name: 'P. Dlamini',     email: 'editor@studiop.sz', role: 'editor', provider: 'demo', memberTier: 'gold',     visitCount: 89,  uploadCount: 12, createdAt: 0, updatedAt: 0 },
      viewer: { id: 'demo-viewer', name: 'Sipho Dlamini',  email: 'sipho@example.com', role: 'viewer', provider: 'demo', memberTier: 'silver',   visitCount: 7,   uploadCount: 2,  createdAt: 0, updatedAt: 0 },
      guest:  { id: 'demo-guest',  name: 'Guest',          email: '',                  role: 'guest',  provider: 'demo', memberTier: 'bronze',   visitCount: 0,   uploadCount: 0,  createdAt: 0, updatedAt: 0 },
    };
    this.currentProfile = DEMO[role];
    logger.warn('AuthService', '⚠️ Demo sign-in — not for production', { role });
    return DEMO[role];
  }

  async resendVerification(email: string): Promise<void> {
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) throw new Error(error.message);
  }

  async resetPassword(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${import.meta.env.VITE_PUBLIC_URL ?? window.location.origin}/auth/reset`,
    });
    if (error) throw new Error(error.message);
  }

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
    this.currentProfile = null;
    logger.info('AuthService', 'Signed out');
  }

  getProfile(): UserProfile | null { return this.currentProfile; }

  async isAuthenticated(): Promise<boolean> {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  }

  onAuthStateChange(cb: (profile: UserProfile | null, event: string) => void): () => void {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        try {
          // Pass session.user directly — avoids calling getUser() while the
          // Supabase auth lock is held, which would deadlock the Promise.
          const profile = await this.fetchProfile(session.user.id, session.user);
          this.currentProfile = profile;
          cb(profile, event);
        } catch (err) {
          logger.error('AuthService', 'fetchProfile failed — using session fallback', { err });
          // Never lock out an authenticated user. Build a minimal profile
          // from the session so they always reach the dashboard.
          const u = session.user;
          const email = u.email ?? '';
          
          const nameFromMetadata = 
            (typeof u.user_metadata?.full_name === 'string' ? u.user_metadata.full_name : undefined) ||
            (typeof u.user_metadata?.name === 'string' ? u.user_metadata.name : undefined);

          const avatarUrl = typeof u.user_metadata?.avatar_url === 'string' ? u.user_metadata.avatar_url : undefined;

          const providerFromMetadata: UserProfile['provider'] = 
            (typeof u.app_metadata?.provider === 'string' &&
             ['email', 'google', 'apple', 'demo'].includes(u.app_metadata.provider))
              ? u.app_metadata.provider as UserProfile['provider'] // Safe after check
              : 'email';

          const fallback: UserProfile = {
            id: u.id,
            name: nameFromMetadata || email.split('@')[0] || 'Member',
            email,
            avatar: avatarUrl,
            role: (u.app_metadata?.provider === 'editor' ? 'editor' : 'viewer'),
            provider: providerFromMetadata,
            memberTier: 'bronze',
            visitCount: 0,
            uploadCount: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            emailVerified: !!u.email_confirmed_at,
          };
          this.currentProfile = fallback;
          cb(fallback, event);
        }
      } else {
        this.currentProfile = null;
        cb(null, event);
      }
    });
    return () => subscription.unsubscribe();
  }

  private async fetchProfile(userId: string, authUser?: SupabaseUser): Promise<UserProfile> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, avatar, phone, role, provider, member_tier, visit_count, upload_count, preferences, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data) {
      try {
        const p = rowToProfile(data as ProfileRow);
        return p;
      } catch { /* fall through to rebuild */ }
    }
    if (error) logger.warn('AuthService', 'profiles SELECT failed', { error: error.message });

    // No profile row — use pre-resolved user when available (avoids calling
    // getUser() inside an onAuthStateChange callback which would deadlock).
    let user: SupabaseUser | null = authUser ?? null;
    if (!user) {
      try {
        const { data: { user: fetchedUser }, error: getUserError } = await supabase.auth.getUser();
        if (getUserError) {
          logger.error('AuthService', 'supabase.auth.getUser failed in fetchProfile', { error: getUserError.message });
          throw getUserError; // Re-throw to be caught by caller
        }
        user = fetchedUser;
      } catch (e) {
        logger.error('AuthService', 'Error fetching user in fetchProfile fallback', { error: String(e) });
        throw new Error('Failed to fetch user in fallback'); // Ensure a consistent error for the caller
      }
    }

    if (!user) {
      throw new Error('User not found in fetchProfile'); // Should not happen if authUser is provided or getUser succeeds
    }

    const meta = user.user_metadata ?? {};
    const nameFromMeta = 
      (typeof meta.full_name === 'string' ? meta.full_name : undefined) ||
      (typeof meta.name === 'string' ? meta.name : undefined);
    const name = (nameFromMeta || user.email?.split('@')[0] || 'Member').slice(0, 60) || 'Member';

    const email = user.email ?? '';

    // Only allow viewer or editor from metadata; admin must be set via admin panel.
    const metaRole: UserProfile['role'] = (meta.role === 'editor') ? 'editor' : 'viewer';

    const avatarUrl = typeof meta.avatar_url === 'string' ? meta.avatar_url : undefined;

    const providerFromAppMetadata: UserProfile['provider'] = 
      (typeof user.app_metadata?.provider === 'string' &&
       ['email', 'google', 'apple', 'demo'].includes(user.app_metadata.provider))
        ? user.app_metadata.provider as UserProfile['provider'] // Safe after check
        : 'email';

    const fallback: UserProfile = {
      id: userId,
      name,
      email,
      avatar: avatarUrl,
      role: metaRole,
      provider: providerFromAppMetadata,
      memberTier: 'bronze',
      visitCount: 0,
      uploadCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      emailVerified: !!user.email_confirmed_at,
    };

    // Persist to DB — ignore error if it already exists (race condition)
    try {
      await supabase.from('profiles').upsert({
        id: userId,
        name: fallback.name,
        email: fallback.email,
        avatar: fallback.avatar ?? null,
        provider: fallback.provider,
        role: metaRole,
        member_tier: 'bronze',
      }, { onConflict: 'id', ignoreDuplicates: true });
    } catch (e) {
      logger.warn('AuthService', 'Failed to upsert profile in fetchProfile fallback', { error: String(e) });
      // Do not re-throw, continue to return the fallback profile.
    }

    return fallback;
  }
}

export const authService = AuthService.getInstance();
