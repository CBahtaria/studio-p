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

  private constructor() {
    this.loadFromSession();
  }

  private async loadFromSession(): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      this.currentProfile = await this.fetchProfile(session.user.id);
    }
  }

  async signUp(data: SignUpData): Promise<AuthResult> {
    logger.info('AuthService', 'Sign-up initiated', { email: data.email });

    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { name: data.name, phone: data.phone ?? null },
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
      return {
        profile: {
          id: data.user.id,
          name: (data.user.user_metadata.name as string) ?? email.split('@')[0],
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
    const env = import.meta.env.VITE_APP_ENV;
    if (env === 'production') return 'https://studio-p-prod.vercel.app/auth/callback';
    const base = import.meta.env.VITE_PUBLIC_URL ?? window.location.origin;
    return `${base}/auth/callback`;
  }

  async signInWithGoogle(): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: this.callbackUrl, scopes: 'openid email profile' },
    });
    if (error) throw new Error(error.message);
  }

  async signInWithApple(): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: this.callbackUrl },
    });
    if (error) throw new Error(error.message);
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

  onAuthStateChange(cb: (profile: UserProfile | null) => void): () => void {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        try {
          // Pass session.user directly — avoids calling getUser() while the
          // Supabase auth lock is held, which would deadlock the Promise.
          const profile = await this.fetchProfile(session.user.id, session.user);
          this.currentProfile = profile;
          cb(profile);
        } catch {
          cb(null);
        }
      } else {
        this.currentProfile = null;
        cb(null);
      }
    });
    return () => subscription.unsubscribe();
  }

  private resolveRole(email: string): UserProfile['role'] {
    const ADMIN_EMAILS = ['charleskris9@gmail.com'];
    return ADMIN_EMAILS.includes(email.toLowerCase()) ? 'admin' : 'viewer';
  }

  private async fetchProfile(userId: string, authUser?: SupabaseUser): Promise<UserProfile> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!error && data) return rowToProfile(data as ProfileRow);

    // No profile row — use pre-resolved user when available (avoids calling
    // getUser() inside an onAuthStateChange callback which would deadlock).
    const user = authUser ?? (await supabase.auth.getUser()).data.user;
    const meta = user?.user_metadata ?? {};
    const name = (
      (meta.full_name as string) ||
      (meta.name as string) ||
      user?.email?.split('@')[0] ||
      'Member'
    ).slice(0, 60) || 'Member';

    const email = user?.email ?? '';
    const role  = this.resolveRole(email);

    const fallback: UserProfile = {
      id: userId,
      name,
      email,
      avatar: (meta.avatar_url as string) ?? undefined,
      role,
      provider: (user?.app_metadata?.provider as UserProfile['provider']) ?? 'email',
      memberTier: 'bronze',
      visitCount: 0,
      uploadCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      emailVerified: !!user?.email_confirmed_at,
    };

    // Persist to DB — ignore error if it already exists (race condition)
    await supabase.from('profiles').upsert({
      id: userId,
      name: fallback.name,
      email: fallback.email,
      avatar: fallback.avatar ?? null,
      provider: fallback.provider,
      role,
      member_tier: 'bronze',
    }, { onConflict: 'id', ignoreDuplicates: true });

    return fallback;
  }
}

export const authService = AuthService.getInstance();
