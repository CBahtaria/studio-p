   1 | // ════════════════════════════════════════════════
   2 | // STUDIO P — AuthService (Supabase-backed)
   3 | // Real auth: email+password with verification, Google, Apple
   4 | // Demo mode gated behind VITE_ENABLE_DEMO_MODE env flag
   5 | // ════════════════════════════════════════════════
   6 | 
   7 | import type { User as SupabaseUser } from '@supabase/supabase-js';
   8 | import { supabase, rowToProfile, type ProfileRow } from '@/lib/supabase';
   9 | import type { UserProfile, UserRole, SignUpData } from '@/types';
  10 | import { logger } from '@/core/logger';
  11 | 
  12 | export interface AuthResult {
  13 |   profile: UserProfile;
  14 |   needsVerification?: boolean;
  15 | }
  16 | 
  17 | class AuthService {
  18 |   private static instance: AuthService;
  19 |   private currentProfile: UserProfile | null = null;
  20 | 
  21 |   static getInstance(): AuthService {
  22 |     if (!AuthService.instance) AuthService.instance = new AuthService();
  23 |     return AuthService.instance;
  24 |   }
  25 | 
  26 |   private constructor() {}
  27 | 
  28 |   async signUp(data: SignUpData): Promise<AuthResult> {
  29 |     logger.info('AuthService', 'Sign-up initiated', { email: data.email });
  30 | 
  31 |     const { data: authData, error } = await supabase.auth.signUp({
  32 |       email: data.email,
  33 |       password: data.password,
  34 |       options: {
  35 |         data: { name: data.name, phone: data.phone ?? null, role: data.role ?? 'viewer' },
  36 |         emailRedirectTo: `${import.meta.env.VITE_PUBLIC_URL ?? window.location.origin}/auth/callback`,
  37 |       },
  38 |     });
  39 | 
  40 |     if (error) {
  41 |       logger.error('AuthService', 'Sign-up failed', { error: error.message });
  42 |       throw new Error(error.message);
  43 |     }
  44 | 
  45 |     if (!authData.user) throw new Error('Sign-up failed — no user returned');
  46 | 
  47 |     if (!authData.session) {
  48 |       logger.info('AuthService', 'Verification email sent', { email: data.email });
  49 |       return {
  50 |         profile: {
  51 |           id: authData.user.id,
  52 |           name: data.name,
  53 |           email: data.email,
  54 |           role: 'viewer',
  55 |           provider: 'email',
  56 |           memberTier: 'bronze',
  57 |           visitCount: 0,
  58 |           uploadCount: 0,
  59 |           createdAt: Date.now(),
  60 |           updatedAt: Date.now(),
  61 |           emailVerified: false,
  62 |         },
  63 |         needsVerification: true,
  64 |       };
  65 |     }
  66 | 
  67 |     const profile = await this.fetchProfile(authData.user.id);
  68 |     this.currentProfile = profile;
  69 |     return { profile };
  70 |   }
  71 | 
  72 |   async signIn(email: string, password: string): Promise<AuthResult> {
  73 |     logger.info('AuthService', 'Sign-in initiated', { email });
  74 | 
  75 |     const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  76 | 
  77 |     if (error) {
  78 |       logger.warn('AuthService', 'Sign-in failed', { error: error.message });
  79 |       throw new Error(error.message);
  80 |     }
  81 | 
  82 |     if (!data.user) throw new Error('Sign-in failed');
  83 | 
  84 |     if (!data.user.email_confirmed_at) {
  85 |       const userName = typeof data.user.user_metadata?.name === 'string' ? data.user.user_metadata.name : email.split('@')[0];
  86 |       return {
  87 |         profile: {
  88 |           id: data.user.id,
  89 |           name: userName,
  90 |           email,
  91 |           role: 'viewer',
  92 |           provider: 'email',
  93 |           memberTier: 'bronze',
  94 |           visitCount: 0,
  95 |           uploadCount: 0,
  96 |           createdAt: Date.now(),
  97 |           updatedAt: Date.now(),
  98 |           emailVerified: false,
  99 |         },
 100 |         needsVerification: true,
 101 |       };
 102 |     }
 103 | 
 104 |     const profile = await this.fetchProfile(data.user.id);
 105 |     this.currentProfile = profile;
 106 |     logger.info('AuthService', 'Sign-in complete', { id: profile.id, role: profile.role });
 107 |     return { profile };
 108 |   }
 109 | 
 110 |   private get callbackUrl(): string {
 111 |     const base = import.meta.env.VITE_PUBLIC_URL ?? window.location.origin;
 112 |     return `${base}/auth/callback`;
 113 |   }
 114 | 
 115 |   async signInWithGoogle(): Promise<void> {
 116 |     sessionStorage.setItem('oauth_pending', '1');
 117 |     const { error } = await supabase.auth.signInWithOAuth({
 118 |       provider: 'google',
 119 |       options: { redirectTo: this.callbackUrl, scopes: 'openid email profile' },
 120 |     });
 121 |     if (error) {
 122 |       sessionStorage.removeItem('oauth_pending');
 123 |       throw new Error(error.message);
 124 |     }
 125 |   }
 126 | 
 127 |   async signInWithApple(): Promise<void> {
 128 |     sessionStorage.setItem('oauth_pending', '1');
 129 |     const { error } = await supabase.auth.signInWithOAuth({
 130 |       provider: 'apple',
 131 |       options: { redirectTo: this.callbackUrl },
 132 |     });
 133 |     if (error) {
 134 |       sessionStorage.removeItem('oauth_pending');
 135 |       throw new Error(error.message);
 136 |     }
 137 |   }
 138 | 
 139 |   async signInDemo(role: UserRole): Promise<UserProfile> {
 140 |     if (import.meta.env.VITE_ENABLE_DEMO_MODE !== 'true') {
 141 |       throw new Error('Demo mode is disabled in this environment');
 142 |     }
 143 |     const DEMO: Record<UserRole, UserProfile> = {
 144 |       admin:  { id: 'demo-admin',  name: 'Studio P Admin', email: 'admin@studiop.sz',  role: 'admin',  provider: 'demo', memberTier: 'platinum', visitCount: 150, uploadCount: 0,  createdAt: 0, updatedAt: 0 },
 145 |       editor: { id: 'demo-editor', name: 'P. Dlamini',     email: 'editor@studiop.sz', role: 'editor', provider: 'demo', memberTier: 'gold',     visitCount: 89,  uploadCount: 12, createdAt: 0, updatedAt: 0 },
 146 |       viewer: { id: 'demo-viewer', name: 'Sipho Dlamini',  email: 'sipho@example.com', role: 'viewer', provider: 'demo', memberTier: 'silver',   visitCount: 7,   uploadCount: 2,  createdAt: 0, updatedAt: 0 },
 147 |       guest:  { id: 'demo-guest',  name: 'Guest',          email: '',                  role: 'guest',  provider: 'demo', memberTier: 'bronze',   visitCount: 0,   uploadCount: 0,  createdAt: 0, updatedAt: 0 },
 148 |     };
 149 |     this.currentProfile = DEMO[role];
 150 |     logger.warn('AuthService', '⚠️ Demo sign-in — not for production', { role });
 151 |     return DEMO[role];
 152 |   }
 153 | 
 154 |   async resendVerification(email: string): Promise<void> {
 155 |     const { error } = await supabase.auth.resend({ type: 'signup', email });
 156 |     if (error) throw new Error(error.message);
 157 |   }
 158 | 
 159 |   async resetPassword(email: string): Promise<void> {
 160 |     const { error } = await supabase.auth.resetPasswordForEmail(email, {
 161 |       redirectTo: `${import.meta.env.VITE_PUBLIC_URL ?? window.location.origin}/auth/reset`,
 162 |     });
 163 |     if (error) throw new Error(error.message);
 164 |   }
 165 | 
 166 |   async signOut(): Promise<void> {
 167 |     try {
 168 |       await supabase.auth.signOut();
 169 |       this.currentProfile = null;
 170 |       logger.info('AuthService', 'Signed out');
 171 |     } catch (error) {
 172 |       logger.error('AuthService', 'Failed to sign out', { error });
 173 |     }
 174 |   }
 175 | 
 176 |   getProfile(): UserProfile | null { return this.currentProfile; }
 177 | 
 178 |   async isAuthenticated(): Promise<boolean> {
 179 |     const { data: { session } } = await supabase.auth.getSession();
 180 |     return !!session;
 181 |   }
 182 | 
 183 |   onAuthStateChange(cb: (profile: UserProfile | null, event: string) => void): () => void {
 184 |     const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
 185 |       if (session?.user) {
 186 |         try {
 187 |           // Pass session.user directly — avoids calling getUser() while the
 188 |           // Supabase auth lock is held, which would deadlock the Promise.
 189 |           const profile = await this.fetchProfile(session.user.id, session.user);
 190 |           this.currentProfile = profile;
 191 |           cb(profile, event);
 192 |         } catch (err) {
 193 |           logger.error('AuthService', 'fetchProfile failed — using session fallback', { err });
 194 |           // Never lock out an authenticated user. Build a minimal profile
 195 |           // from the session so they always reach the dashboard.
 196 |           const u = session.user;
 197 |           const email = u.email ?? '';
 198 |           
 199 |           const nameFromMetadata = 
 200 |             (typeof u.user_metadata?.full_name === 'string' ? u.user_metadata.full_name : undefined) ||
 201 |             (typeof u.user_metadata?.name === 'string' ? u.user_metadata.name : undefined);
 202 | 
 203 |           const avatarUrl = typeof u.user_metadata?.avatar_url === 'string' ? u.user_metadata.avatar_url : undefined;
 204 | 
 205 |           const providerFromMetadata: UserProfile['provider'] = 
 206 |             (typeof u.app_metadata?.provider === 'string' &&
 207 |              ['email', 'google', 'apple', 'demo'].includes(u.app_metadata.provider))
 208 |               ? u.app_metadata.provider as UserProfile['provider'] // Safe after check
 209 |               : 'email';
 210 | 
 211 |           const fallback: UserProfile = {
 212 |             id: u.id,
 213 |             name: nameFromMetadata || email.split('@')[0] || 'Member',
 214 |             email,
 215 |             avatar: avatarUrl,
 216 |             role: (u.app_metadata?.provider === 'editor' ? 'editor' : 'viewer'),
 217 |             provider: providerFromMetadata,
 218 |             memberTier: 'bronze',
 219 |             visitCount: 0,
 220 |             uploadCount: 0,
 221 |             createdAt: Date.now(),
 222 |             updatedAt: Date.now(),
 223 |             emailVerified: !!u.email_confirmed_at,
 224 |           };
 225 |           this.currentProfile = fallback;
 226 |           cb(fallback, event);
 227 |         }
 228 |       } else {
 229 |         this.currentProfile = null;
 230 |         cb(null, event);
 231 |       }
 232 |     });
 233 |     return () => subscription.unsubscribe();
 234 |   }
 235 | 
 236 |   private async fetchProfile(userId: string, authUser?: SupabaseUser): Promise<UserProfile> {
 237 |     const { data, error } = await supabase
 238 |       .from('profiles')
 239 |       .select('*')
 240 |       .eq('id', userId)
 241 |       .maybeSingle();
 242 | 
 243 |     if (!error && data) {
 244 |       if (typeof data === 'object' && data !== null && 'id' in data && 'email' in data && typeof data.id === 'string' && typeof data.email === 'string') {
 245 |         try {
 246 |           const p = rowToProfile(data as ProfileRow);
 247 |           return p;
 248 |         } catch { /* fall through to rebuild */ }
 249 |       } else {
 250 |         logger.warn('AuthService', 'Fetched data is not a valid ProfileRow structure', { data });
 251 |       }
 252 |     }
 253 |     if (error) logger.warn('AuthService', 'profiles SELECT failed', { error: error.message });
 254 | 
  255 |     // No profile row — use pre-resolved user when available (avoids calling
 256 |     // getUser() inside an onAuthStateChange callback which would deadlock).
 257 |     let user: SupabaseUser | null = authUser ?? null;
 258 |     if (!user) {
 259 |       try {
 260 |         const { data: { user: fetchedUser }, error: getUserError } = await supabase.auth.getUser();
 261 |         if (getUserError) {
 262 |           logger.error('AuthService', 'supabase.auth.getUser failed in fetchProfile', { error: getUserError.message });
 263 |           throw getUserError; // Re-throw to be caught by caller
 264 |         }
 265 |         user = fetchedUser;
 266 |       } catch (e) {
 267 |         logger.error('AuthService', 'Error fetching user in fetchProfile fallback', { error: String(e) });
 268 |         throw new Error('Failed to fetch user in fallback'); // Ensure a consistent error for the caller
 269 |       }
 270 |     }
 271 | 
 272 |     if (!user) {
 273 |       throw new Error('User not found in fetchProfile'); // Should not happen if authUser is provided or getUser succeeds
 274 |     }
 275 | 
 276 |     const meta = user.user_metadata ?? {};
 277 |     const nameFromMeta = 
 278 |       (typeof meta.full_name === 'string' ? meta.full_name : undefined) ||
 279 |       (typeof meta.name === 'string' ? meta.name : undefined);
 280 |     const name = (nameFromMeta || user.email?.split('@')[0] || 'Member').slice(0, 60) || 'Member';
 281 | 
 282 |     const email = user.email ?? '';
 283 | 
 284 |     // Only allow viewer or editor from metadata; admin must be set via admin panel.
 285 |     const metaRole: UserProfile['role'] = (meta.role === 'editor') ? 'editor' : 'viewer';
 286 | 
 287 |     const avatarUrl = typeof meta.avatar_url === 'string' ? meta.avatar_url : undefined;
 288 | 
 289 |     const providerFromAppMetadata: UserProfile['provider'] = 
 290 |       (typeof user.app_metadata?.provider === 'string' &&
 291 |        ['email', 'google', 'apple', 'demo'].includes(user.app_metadata.provider))
 292 |         ? user.app_metadata.provider as UserProfile['provider'] // Safe after check
 293 |         : 'email';
 294 | 
 295 |     const fallback: UserProfile = {
 296 |       id: userId,
 297 |       name,
 298 |       email,
 299 |       avatar: avatarUrl,
 300 |       role: metaRole,
 301 |       provider: providerFromAppMetadata,
 302 |       memberTier: 'bronze',
 303 |       visitCount: 0,
 304 |       uploadCount: 0,
 305 |       createdAt: Date.now(),
 306 |       updatedAt: Date.now(),
 307 |       emailVerified: !!user.email_confirmed_at,
 308 |     };
 309 | 
 310 |     // Persist to DB — ignore error if it already exists (race condition)
 311 |     try {
 312 |       await supabase.from('profiles').upsert({
 313 |         id: userId,
 314 |         name: fallback.name,
 315 |         email: fallback.email,
 316 |         avatar: fallback.avatar ?? null,
 317 |         provider: fallback.provider,
 318 |         role: metaRole,
 319 |         member_tier: 'bronze',
 320 |       }, { onConflict: 'id', ignoreDuplicates: true });
 321 |     } catch (e) {
 322 |       logger.warn('AuthService', 'Failed to upsert profile in fetchProfile fallback', { error: String(e) });
 323 |       // Do not re-throw, continue to return the fallback profile.
 324 |     }
 325 | 
 326 |     return fallback;
 327 |   }
 328 | }
 329 | 
 330 | export const authService = AuthService.getInstance();
 331 | 