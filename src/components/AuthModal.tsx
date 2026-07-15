   1 | // ════════════════════════════════════════════════
   2 | // STUDIO P — AuthModal (Supabase-backed)
   3 | // Tabs: Sign In | Sign Up | Demo (dev only)
   4 | // ════════════════════════════════════════════════
   5 | 
   6 | import { useState } from 'react';
   7 | import { useForm } from 'react-hook-form';
   8 | import { zodResolver } from '@hookform/resolvers/zod';
   9 | import type { UserProfile } from '@/types';
  10 | import { authService } from '@/auth/AuthService';
  11 | import { EmailVerification } from '@/components/EmailVerification';
  12 | import {
  13 |   signInSchema, signUpSchema,
  14 |   type SignInFormData, type SignUpFormData,
  15 |   getPasswordStrength,
  16 | } from '@/lib/validation';
  17 | 
  18 | type Tab = 'signin' | 'signup' | 'demo';
  19 | type Step = 'form' | 'loading' | 'verify-email' | 'forgot-password' | 'reset-sent' | 'profile-complete';
  20 | 
  21 | interface AuthModalProps {
  22 |   onSuccess: (profile: UserProfile) => void;
  23 |   onClose: () => void;
  24 |   initialError?: string;
  25 | }
  26 | 
  27 | const isDemoEnabled = import.meta.env.VITE_ENABLE_DEMO_MODE === 'true';
  28 | 
  29 | // ── Shared field style ──────────────────────────
  30 | const fieldStyle: React.CSSProperties = {
  31 |   width: '100%', background: 'var(--ink3)', border: '1px solid var(--bord2)',
  32 |   color: 'var(--parch)', padding: '11px 14px', fontFamily: 'DM Sans, sans-serif',
  33 |   fontSize: 14, outline: 'none', borderRadius: 6, boxSizing: 'border-box',
  34 | };
  35 | const errStyle: React.CSSProperties = {
  36 |   fontSize: 11, color: '#f87171', marginTop: 4, fontFamily: 'DM Mono, monospace',
  37 | };
  38 | const labelStyle: React.CSSProperties = {
  39 |   fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '.2em',
  40 |   color: 'var(--stone)', display: 'block', marginBottom: 5, textTransform: 'uppercase',
  41 | };
  42 | 
  43 | // ── Role data used by the sign-in picker ─────────
  44 | const ROLES = [
  45 |   { id: 'viewer' as const, label: 'Client',  sub: 'Book your next cut',    icon: '✨', color: 'var(--view-a)' },
  46 |   { id: 'editor' as const, label: 'Barber',  sub: 'Manage your studio',    icon: '🎨', color: 'var(--edit-a)' },
  47 |   { id: 'admin'  as const, label: 'Admin',   sub: 'Full system access',    icon: '⚡', color: 'var(--admin-a)' },
  48 | ] as const;
  49 | type RoleId = typeof ROLES[number]['id'];
  50 | 
  51 | // ── Sign In Form ────────────────────────────────
  52 | function SignInForm({ onSuccess, onForgotPassword, onVerified, selectedRole, onRoleChange }: {
  53 |   onSuccess: (profile: UserProfile) => void;
  54 |   onForgotPassword: (email: string) => void;
  55 |   onVerified?: () => void;
  56 |   selectedRole: RoleId;
  57 |   onRoleChange: (r: RoleId) => void;
  58 | }) {
  59 |   const [apiError, setApiError] = useState('');
  60 |   const [loading, setLoading] = useState(false);
  61 |   const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | ''>('');
  62 |   const [pendingEmail, setPendingEmail] = useState('');
  63 |   const [step, setStep] = useState<'role' | 'form' | 'verify'>('role');
  64 | 
  65 |   const { register, handleSubmit, formState: { errors }, getValues } = useForm<SignInFormData>({
  66 |     resolver: zodResolver(signInSchema),
  67 |   });
  68 | 
  69 |   const onSubmit = async (data: SignInFormData) => {
  70 |     setLoading(true);
  71 |     setApiError('');
  72 |     try {
  73 |       const result = await authService.signIn(data.email, data.password);
  74 |       if (result.needsVerification) {
  75 |         setPendingEmail(data.email);
  76 |         setStep('verify');
  77 |       } else {
  78 |         onSuccess(result.profile);
  79 |       }
  80 |     } catch (e) {
  81 |       setApiError(e instanceof Error ? e.message : 'Sign-in failed');
  82 |     } finally {
  83 |       setLoading(false);
  84 |     }
  85 |   };
  86 | 
  87 |   // ── Step: role picker ───────────────────────
  88 |   if (step === 'role') {
  89 |     return (
  90 |       <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
  91 |         <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '.2em', color: 'var(--stone)', textAlign: 'center', marginBottom: 6 }}>
  92 |           WHO ARE YOU?
  93 |         </p>
  94 |         {ROLES.map(r => (
  95 |           <button
  96 |             key={r.id}
  97 |             onClick={() => { onRoleChange(r.id); setStep('form'); }}
  98 |             style={{
  99 |               background: 'var(--ink3)', border: `1px solid ${r.color}33`,
 100 |               borderRadius: 10, padding: '14px 16px', textAlign: 'left',
 101 |               cursor: 'pointer', transition: 'border-color .15s, background .15s',
 102 |               display: 'flex', alignItems: 'center', gap: 14,
 103 |             }}
 104 |             onMouseEnter={e => { e.currentTarget.style.borderColor = r.color; e.currentTarget.style.background = `color-mix(in srgb, ${r.color} 8%, var(--ink3))`; }}
 105 |             onMouseLeave={e => { e.currentTarget.style.borderColor = `${r.color}33`; e.currentTarget.style.background = 'var(--ink3)'; }}
 106 |           >
 107 |             <span style={{ fontSize: 22, lineHeight: 1 }}>{r.icon}</span>
 108 |             <div>
 109 |               <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: r.color, marginBottom: 2, letterSpacing: '.06em' }}>{r.label}</div>
 110 |               <div style={{ fontSize: 11, color: 'var(--stone)' }}>{r.sub}</div>
 111 |             </div>
 112 |             <span style={{ marginLeft: 'auto', color: 'var(--stone)', fontSize: 14, opacity: 0.5 }}>›</span>
 113 |           </button>
 114 |         ))}
 115 |       </div>
 116 |     );
 117 |   }
 118 | 
 119 |   // ── Step: verify ───────────────────────────
 120 |   if (step === 'verify') {
 121 |     return (
 122 |       <EmailVerification
 123 |         email={pendingEmail}
 124 |         onVerified={() => {
 125 |           const profile = authService.getProfile();
 126 |           if (profile) {
 127 |             onSuccess(profile);
 128 |           } else {
 129 |             // Profile loading async via TOKEN_REFRESHED — subscribe once then navigate
 130 |             const unsub = authService.onAuthStateChange((p) => {
 131 |               if (p) { unsub(); onSuccess(p); }
 132 |             });
 133 |             setTimeout(() => { unsub(); if (onVerified) onVerified(); else setStep('form'); }, 5000);
 134 |           }
 135 |         }}
 136 |         onBack={() => setStep('form')}
 137 |       />
 138 |     );
 139 |   }
 140 | 
 141 |   const role = ROLES.find(r => r.id === selectedRole);
 142 | 
 143 |   // ── Step: credentials form ─────────────────
 144 |   return (
 145 |     <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
 146 |       {role && (
 147 |         <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: `color-mix(in srgb, ${role.color} 10%, var(--ink3))`, borderRadius: 8, border: `1px solid ${role.color}44` }}>
 148 |           <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
 149 |             <span style={{ fontSize: 14 }}>{role.icon}</span>
 150 |             <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: role.color, letterSpacing: '.1em' }}>{role.label.toUpperCase()}</span>
 151 |           </div>
 152 |           <button type="button" onClick={() => setStep('role')} style={{ background: 'none', border: 'none', color: 'var(--stone)', fontSize: 10, cursor: 'pointer', minHeight: 'unset', fontFamily: 'DM Mono, monospace' }}>
 153 |             Change
 154 |           </button>
 155 |         </div>
 156 |       )}
 157 | 
 158 |       <div>
 159 |         <label style={labelStyle}>Email</label>
 160 |         <input {...register('email')} type="email" placeholder="you@example.com" style={fieldStyle} autoComplete="email"/>
 161 |         {errors.email && <p style={errStyle}>{errors.email.message}</p>}
 162 |       </div>
 163 | 
 164 |       <div>
 165 |         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
 166 |           <label style={{ ...labelStyle, marginBottom: 0 }}>Password</label>
 167 |           <button type="button" onClick={() => onForgotPassword(getValues('email') || '')}
 168 |             style={{ background: 'none', border: 'none', color: 'var(--brass)', fontSize: 10, cursor: 'pointer', minHeight: 'unset', fontFamily: 'DM Mono, monospace' }}>
 169 |             Forgot?
 170 |           </button>
 171 |         </div>
 172 |         <input {...register('password')} type="password" placeholder="••••••••" style={fieldStyle} autoComplete="current-password"/>
 173 |         {errors.password && <p style={errStyle}>{errors.password.message}</p>}
 174 |       </div>
 175 | 
 176 |       {apiError && <div style={{ padding: '10px 12px', background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.3)', borderRadius: 6, fontSize: 12, color: '#f87171' }}>{apiError}</div>}
 177 | 
 178 |       <button type="submit" disabled={loading} style={{
 179 |         background: role ? role.color : 'var(--brass)', color: 'var(--ink)', border: 'none', padding: '13px',
 180 |         borderRadius: 6, fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: '.25em',
 181 |         textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
 182 |       }}>
 183 |         {loading ? 'Signing in…' : `Sign In as ${role?.label ?? 'Member'} →`}
 184 |       </button>
 185 | 
 186 |       <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
 187 |         <div style={{ flex: 1, height: 1, background: 'var(--bord)' }}/>
 188 |         <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--stone)' }}>OR</span>
 189 |         <div style={{ flex: 1, height: 1, background: 'var(--bord)' }}/>
 190 |       </div>
 191 | 
 192 |       <button type="button"
 193 |         disabled={!!oauthLoading}
 194 |         onClick={async () => {
 195 |           setOauthLoading('google');
 196 |           setApiError('');
 197 |           try { await authService.signInWithGoogle(); }
 198 |           catch (e) { setApiError(e instanceof Error ? e.message : 'Google sign-in failed'); setOauthLoading(''); }
 199 |         }}
 200 |         style={{
 201 |           width: '100%', background: 'var(--ink3)', border: '1px solid var(--bord2)', color: 'var(--parch2)',
 202 |           display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
 203 |           padding: '12px', borderRadius: 6, fontFamily: 'DM Mono, monospace', fontSize: 11,
 204 |           cursor: oauthLoading ? 'not-allowed' : 'pointer', opacity: oauthLoading && oauthLoading !== 'google' ? 0.5 : 1,
 205 |         }}>
 206 |         {oauthLoading === 'google' ? 'Redirecting…' : (
 207 |           <>
 208 |             <svg width="18" height="18" viewBox="0 0 48 48">
 209 |               <path fill="#EA4335" d="M24 9.5c3.6 0 6.5 1.4 8.8 3.7l6.6-6.6C35.2 2.4 30 0 24 0 14.6 0 6.6 5.4 2.4 13.2l7.7 6C12.1 13 17.6 9.5 24 9.5z"/>
 210 |               <path fill="#4285F4" d="M46.5 24.5c0-1.7-.1-3.3-.4-4.8H24v9.1h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 7.1-10 7.1-17.3z"/>
 211 |               <path fill="#FBBC05" d="M10.1 28.5A14.5 14.5 0 019.5 24c0-1.6.3-3.1.6-4.5l-7.7-6A23.9 23.9 0 000 24c0 3.8.9 7.5 2.4 10.8l7.7-6.3z"/>
 212 |               <path fill="#34A853" d="M24 48c6 0 11.1-2 14.8-5.4l-7.5-5.8c-2 1.4-4.6 2.2-7.3 2.2-6.4 0-11.8-4.3-13.9-10.2l-7.7 6C6.6 42.6 14.6 48 24 48z"/>
 213 |             </svg>
 214 |             Continue with Google
 215 |           </>
 216 |         )}
 217 |       </button>
 218 | 
 219 |       <button type="button"
 220 |         disabled={!!oauthLoading}
 221 |         onClick={async () => {
 222 |           setOauthLoading('apple');
 223 |           setApiError('');
 224 |           try { await authService.signInWithApple(); }
 225 |           catch (e) { setApiError(e instanceof Error ? e.message : 'Apple sign-in failed'); setOauthLoading(''); }
 226 |         }}
 227 |         style={{
 228 |           width: '100%', background: 'var(--ink3)', border: '1px solid var(--bord2)', color: 'var(--parch2)',
 229 |           display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
 230 |           padding: '12px', borderRadius: 6, fontFamily: 'DM Mono, monospace', fontSize: 11,
 231 |           cursor: oauthLoading ? 'not-allowed' : 'pointer', opacity: oauthLoading && oauthLoading !== 'apple' ? 0.5 : 1,
 232 |         }}>
 233 |         {oauthLoading === 'apple' ? 'Redirecting…' : (
 234 |           <>
 235 |             <svg width="17" height="20" viewBox="0 0 814 1000" fill="currentColor">
 236 |               <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.8-155.5-127.4C46 790.8 0 663.8 0 541.3c0-207.6 134.7-317.3 267.7-317.3 72.9 0 133.9 47.9 178.6 47.9 42.3 0 112.9-50.4 190.9-50.4 30.6 0 110.8 2.6 168.4 81.2zm-126.4-98.4c31.4-37.4 54.4-89.5 54.4-141.5 0-7.1-.6-14.3-1.9-20.1-51.6 2-112.3 34.4-148.8 75.8-28.5 32.7-55.8 84.7-55.8 137.4 0 7.7 1.3 15.5 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 46.4 0 102.5-30.7 136.6-70z"/>
 237 |             </svg>
 238 |             Continue with Apple
 239 |           </>
 240 |         )}
 241 |       </button>
 242 |     </form>
 243 |   );
 244 | }
 245 | 
 246 | // ── Sign Up Form ────────────────────────────────
 247 | function SignUpForm({ onSuccess, role }: { onSuccess: (profile: UserProfile, needsVerification: boolean, email: string) => void; role: RoleId }) {
 248 |   const [apiError, setApiError] = useState('');
 249 |   const [loading, setLoading] = useState(false);
  250 |   const [pwValue, setPwValue] = useState('');
 251 | 
 252 |   const { register, handleSubmit, formState: { errors }, watch } = useForm<SignUpFormData>({
 253 |     resolver: zodResolver(signUpSchema),
 254 |   });
 255 | 
 256 |   watch((data) => { if (data.password !== undefined) setPwValue(data.password); });
 257 | 
 258 |   const strength = getPasswordStrength(pwValue);
 259 | 
 260 |   const onSubmit = async (data: SignUpFormData) => {
 261 |     setLoading(true);
 262 |     setApiError('');
 263 |     try {
 264 |       const result = await authService.signUp({
 265 |         name: data.name,
 266 |         email: data.email,
 267 |         password: data.password,
 268 |         phone: data.phone || undefined,
 269 |         role: role === 'admin' ? 'viewer' : role, // admin only via admin panel
 270 |       });
 271 |       onSuccess(result.profile, !!result.needsVerification, data.email);
 272 |     } catch (e) {
 273 |       setApiError(e instanceof Error ? e.message : 'Sign-up failed');
 274 |     } finally {
 275 |       setLoading(false);
 276 |     }
 277 |   };
 278 | 
 279 |   const roleData = ROLES.find(r => r.id === role);
 280 | 
 281 |   return (
 282 |     <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
 283 |       {roleData && (
 284 |         <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: `color-mix(in srgb, ${roleData.color} 10%, var(--ink3))`, borderRadius: 8, border: `1px solid ${roleData.color}44`, marginBottom: 2 }}>
 285 |           <span style={{ fontSize: 14 }}>{roleData.icon}</span>
 286 |           <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: roleData.color, letterSpacing: '.1em' }}>{roleData.label.toUpperCase()}</span>
 287 |         </div>
 288 |       )}
 289 |       <div>
 290 |         <label style={labelStyle}>Full Name</label>
 291 |         <input {...register('name')} placeholder="Your name" style={fieldStyle} autoComplete="name"/>
 292 |         {errors.name && <p style={errStyle}>{errors.name.message}</p>}
 293 |       </div>
 294 | 
 295 |       <div>
 296 |         <label style={labelStyle}>Email</label>
 297 |         <input {...register('email')} type="email" placeholder="you@example.com" style={fieldStyle} autoComplete="email"/>
 298 |         {errors.email && <p style={errStyle}>{errors.email.message}</p>}
 299 |       </div>
 300 | 
 301 |       <div>
 302 |         <label style={labelStyle}>Password</label>
 303 |         <input {...register('password')} type="password" placeholder="Min 8 chars, 1 uppercase, 1 number" style={fieldStyle} autoComplete="new-password"/>
 304 |         {pwValue && (
 305 |           <div style={{ marginTop: 6 }}>
 306 |             <div style={{ height: 3, background: 'var(--bord)', borderRadius: 2, overflow: 'hidden' }}>
 307 |               <div style={{ height: '100%', width: `${(strength.score / 4) * 100}%`, background: strength.color, borderRadius: 2, transition: 'width .3s, background .3s' }}/>
 308 |             </div>
 309 |             <span style={{ fontSize: 10, color: strength.color, fontFamily: 'DM Mono, monospace', marginTop: 3, display: 'block' }}>{strength.label}</span>
 310 |           </div>
 311 |         )}
 312 |         {errors.password && <p style={errStyle}>{errors.password.message}</p>}
 313 |       </div>
 314 | 
 315 |       <div>
 316 |         <label style={labelStyle}>Confirm Password</label>
 317 |         <input {...register('confirmPassword')} type="password" placeholder="Repeat password" style={fieldStyle} autoComplete="new-password"/>
 318 |         {errors.confirmPassword && <p style={errStyle}>{errors.confirmPassword.message}</p>}
 319 |       </div>
 320 | 
 321 |       <div>
 322 |         <label style={labelStyle}>Phone (optional)</label>
 323 |         <input {...register('phone')} type="tel" placeholder="+268 7600 0000" style={fieldStyle} autoComplete="tel"/>
 324 |         {errors.phone && <p style={errStyle}>{errors.phone.message}</p>}
 325 |       </div>
 326 | 
 327 |       <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 4 }}>
 328 |         <input {...register('terms')} type="checkbox" id="terms" style={{ marginTop: 2, accentColor: 'var(--brass)', cursor: 'pointer' }}/>
 329 |         <label htmlFor="terms" style={{ fontSize: 11, color: 'var(--stone)', lineHeight: 1.6, cursor: 'pointer' }}>
 330 |           I agree to Studio P's{' '}
 331 |           <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brass)', textDecoration: 'none' }} onClick={e => e.stopPropagation()}>Terms of Service</a>
 332 |           {' '}and{' '}
 333 |           <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brass)', textDecoration: 'none' }} onClick={e => e.stopPropagation()}>Privacy Policy</a>
 334 |         </label>
 335 |       </div>
 336 |       {errors.terms && <p style={errStyle}>{errors.terms.message}</p>}
 337 | 
 338 |       {apiError && <div style={{ padding: '10px 12px', background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.3)', borderRadius: 6, fontSize: 12, color: '#f87171' }}>{apiError}</div>}
 339 | 
 340 |       <button type="submit" disabled={loading} style={{
 341 |         background: 'var(--brass)', color: 'var(--ink)', border: 'none', padding: '13px',
 342 |         borderRadius: 6, fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: '.25em',
 343 |         textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, marginTop: 4,
 344 |       }}>
 345 |         {loading ? 'Creating account…' : 'Create Account →'}
 346 |       </button>
 347 |     </form>
 348 |   );
 349 | }
 350 | 
 351 | // ── Demo Form ───────────────────────────────────
 352 | function DemoForm({ onSuccess }: { onSuccess: (profile: UserProfile) => void }) {
 353 |   const [loading, setLoading] = useState('');
 354 |   const [demoError, setDemoError] = useState('');
 355 | 
 356 |   const pick = async (role: 'admin' | 'editor' | 'viewer') => {
 357 |     setLoading(role);
 358 |     setDemoError('');
 359 |     try {
 360 |       const profile = await authService.signInDemo(role);
 361 |       onSuccess(profile);
 362 |     } catch (e) {
 363 |       setDemoError(e instanceof Error ? e.message : 'Demo sign-in failed');
 364 |     } finally {
 365 |       setLoading('');
 366 |     }
 367 |   };
 368 | 
 369 |   return (
 370 |     <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
 371 |       <p style={{ fontSize: 11, color: 'var(--stone)', lineHeight: 1.6, marginBottom: 4 }}>
 372 |         Development mode — explore all portals without a real account.
 373 |       </p>
 374 |       {demoError && <div style={{ padding: '8px 12px', background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.3)', borderRadius: 6, fontSize: 11, color: '#f87171', marginBottom: 4 }}>{demoError}</div>}
 375 |       {([
 376 |         ['admin',  '⚡ Admin Portal',  'Full system access', 'var(--admin-a)'],
 377 |         ['editor', '🎨 Editor Studio', 'Content management', 'var(--edit-a)'],
 378 |         ['viewer', '✨ Member Space',  'Booking & history',  'var(--view-a)'],
 379 |       ] as const).map(([role, label, desc, color]) => (
 380 |         <button key={role} onClick={() => pick(role)} disabled={!!loading} style={{
 381 |           background: 'var(--ink3)', border: `1px solid ${color}22`, borderRadius: 8,
 382 |           padding: '14px 16px', textAlign: 'left', cursor: 'pointer', transition: 'border-color .15s',
 383 |           opacity: loading && loading !== role ? 0.5 : 1,
 384 |         }}>
 385 |           <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color, marginBottom: 3 }}>
 386 |             {loading === role ? 'Loading…' : label}
 387 |           </div>
 388 |           <div style={{ fontSize: 11, color: 'var(--stone)' }}>{desc}</div>
 389 |         </button>
 390 |       ))}
 391 |     </div>
 392 |   );
 393 | }
 394 | 
 395 | // ── Root AuthModal ──────────────────────────────
 396 | export function AuthModal({ onSuccess, onClose, initialError }: AuthModalProps) {
 397 |   const tabs: Tab[] = isDemoEnabled ? ['signin', 'signup', 'demo'] : ['signin', 'signup'];
 398 |   const [tab, setTab] = useState<Tab>('signin');
 399 |   const [step, setStep] = useState<Step>('form');
 400 |   const [verifyEmail, setVerifyEmail] = useState('');
 401 |   const [resetLoading, setResetLoading] = useState(false);
 402 |   const [resetEmail, setResetEmail] = useState('');
 403 |   const [resetError, setResetError] = useState('');
 404 |   // Shared role selection — used by both sign-in and sign-up forms
 405 |   const [selectedRole, setSelectedRole] = useState<RoleId>('viewer');
 406 | 
 407 |   const handleSignUpSuccess = (profile: UserProfile, needsVerification: boolean, email: string) => {
 408 |     if (needsVerification) {
 409 |       setVerifyEmail(email);
 410 |       setStep('verify-email');
 411 |     } else {
 412 |       onSuccess(profile);
 413 |     }
 414 |   };
 415 | 
 416 |   const handleForgotPassword = async () => {
 417 |     if (!resetEmail) { setResetError('Enter your email above first'); return; }
 418 |     setResetLoading(true);
 419 |     setResetError('');
 420 |     try {
 421 |       await authService.resetPassword(resetEmail);
 422 |       setStep('reset-sent');
 423 |     } catch (e) {
 424 |       const msg = e instanceof Error ? e.message : '';
 425 |       // Ignore aborted fetches (modal closed while request was in-flight)
 426 |       if (msg === 'Failed to fetch' || (e instanceof Error && e.name === 'AbortError')) return;
 427 |       setResetError(msg || 'Failed to send reset email');
 428 |     } finally {
 429 |       setResetLoading(false);
 430 |     }
 431 |   };
 432 | 
 433 |   const TAB_LABELS: Record<Tab, string> = { signin: 'Sign In', signup: 'Sign Up', demo: 'Demo' };
 434 | 
 435 |   return (
 436 |     <div
 437 |       style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', backdropFilter: 'blur(12px)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn .2s ease' }}
 438 |       onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
 439 |     >
 440 |       <div style={{
 441 |         background: 'var(--ink2)', border: '1px solid var(--bord2)', borderRadius: 16,
 442 |         width: '100%', maxWidth: 400, margin: '0 16px',
 443 |         animation: 'windowIn .28s cubic-bezier(.16,1,.3,1)', overflow: 'hidden',
 444 |         maxHeight: '90dvh', overflowY: 'auto',
 445 |       }}>
 446 |         {/* Header */}
 447 |         <div style={{ padding: '24px 28px 0', borderBottom: '1px solid var(--bord)', paddingBottom: 16 }}>
 448 |           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
 449 |             <div>
 450 |               <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 24, fontWeight: 700, color: 'var(--brass)', lineHeight: 1 }}>Fanu's Studio-P</div>
 451 |               <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '.25em', color: 'var(--stone)', marginTop: 3 }}>MATSAPHA · ESWATINI</div>
 452 |             </div>
 453 |             <button onClick={onClose} aria-label="Close modal" style={{ background: 'none', border: '1px solid var(--bord2)', color: 'var(--stone)', width: 32, height: 32, minHeight: 'unset', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>✕</button>
 454 |           </div>
 455 | 
 456 |           {step === 'form' && (
 457 |             <div style={{ display: 'flex', borderBottom: '1px solid var(--bord)', marginBottom: -1 }}>
 458 |               {tabs.map(t => (
 459 |                 <button key={t} onClick={() => setTab(t)} style={{
 460 |                   background: 'none', border: 'none', borderBottom: `2px solid ${tab === t ? 'var(--brass)' : 'transparent'}`,
 461 |                   color: tab === t ? 'var(--brass)' : 'var(--stone)', padding: '8px 0', marginRight: 20,
 462 |                   fontFamily: 'DM Mono, monospace', fontSize: 11, letterSpacing: '.15em', textTransform: 'uppercase',
 463 |                   cursor: 'pointer', minHeight: 'unset', transition: 'color .15s',
 464 |                 }}>
 465 |                   {TAB_LABELS[t]}
 466 |                 </button>
 467 |               ))}
 468 |             </div>
 469 |           )}
 470 |         </div>
 471 | 
 472 |         {/* Body */}
 473 |         <div style={{ padding: '22px 28px 28px' }}>
 474 |           {initialError && step === 'form' && (
 475 |             <div style={{ padding: '10px 14px', background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.3)', borderRadius: 8, fontSize: 12, color: '#f87171', marginBottom: 16, lineHeight: 1.5 }}>
 476 |               {initialError}
 477 |             </div>
 478 |           )}
 479 |           {step === 'form' && tab === 'signin' && (
 480 |             <SignInForm
 481 |               onSuccess={onSuccess}
 482 |               onForgotPassword={(email) => { setResetEmail(email); setStep('forgot-password'); }}
 483 |               onVerified={() => {
 484 |                 const profile = authService.getProfile();
 485 |                 if (profile) { onSuccess(profile); } else { onClose(); }
 486 |               }}
 487 |               selectedRole={selectedRole}
 488 |               onRoleChange={setSelectedRole}
 489 |             />
 490 |           )}
 491 |           {step === 'form' && tab === 'signup' && (
 492 |             <SignUpForm onSuccess={handleSignUpSuccess} role={selectedRole} />
 493 |           )}
 494 |           {step === 'form' && tab === 'demo' && isDemoEnabled && (
 495 |             <DemoForm onSuccess={onSuccess} />
 496 |           )}
 497 | 
 498 |           {step === 'verify-email' && (
 499 |             <EmailVerification
 500 |               email={verifyEmail}
 501 |               onVerified={() => {
 502 |                 const profile = authService.getProfile();
 503 |                 if (profile) {
 504 |                   onSuccess(profile);
 505 |                 } else {
 506 |                   // Wait for TOKEN_REFRESHED to complete fetchProfile, then navigate
 507 |                   const unsub = authService.onAuthStateChange((p) => {
 508 |                     if (p) { unsub(); onSuccess(p); }
 509 |                   });
 510 |                   setTimeout(() => { unsub(); onClose(); }, 5000);
 511 |                 }
 512 |               }}
 513 |               onBack={() => setStep('form')}
 514 |             />
 515 |           )}
 516 | 
 517 |           {step === 'forgot-password' && (
 518 |             <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
 519 |               <p style={{ fontSize: 12, color: 'var(--stone)', lineHeight: 1.6, margin: 0 }}>
 520 |                 Enter your email and we'll send you a reset link.
 521 |               </p>
 522 |               <div>
 523 |                 <label style={labelStyle}>Email Address</label>
 524 |                 <input
 525 |                   type="email"
 526 |                   placeholder="your@email.com"
 527 |                   value={resetEmail}
 528 |                   onChange={e => setResetEmail(e.target.value)}
 529 |                   style={fieldStyle}
 530 |                   autoFocus
 531 |                 />
 532 |                 {resetError && <p style={errStyle}>{resetError}</p>}
 533 |               </div>
 534 |               <button onClick={handleForgotPassword} disabled={resetLoading} style={{
 535 |                 background: 'var(--brass)', color: 'var(--ink)', border: 'none', padding: '13px',
 536 |                 borderRadius: 6, fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: '.25em',
 537 |                 textTransform: 'uppercase', cursor: resetLoading ? 'not-allowed' : 'pointer', opacity: resetLoading ? 0.6 : 1,
 538 |               }}>
 539 |                 {resetLoading ? 'Sending…' : 'Send Reset Email →'}
 540 |               </button>
 541 |               <button onClick={() => { setStep('form'); setResetError(''); }} style={{ background: 'none', border: 'none', color: 'var(--stone)', fontSize: 11, cursor: 'pointer', minHeight: 'unset' }}>
 542 |                 ← Back to Sign In
 543 |               </button>
 544 |             </div>
 545 |           )}
 546 | 
 547 |           {step === 'reset-sent' && (
 548 |             <div style={{ textAlign: 'center' }}>
 549 |               <div style={{ fontSize: 40, marginBottom: 14 }}>📧</div>
 550 |               <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Check your inbox</div>
 551 |               <p style={{ fontSize: 12, color: 'var(--stone)', marginBottom: 20, lineHeight: 1.6 }}>
 552 |                 A reset link has been sent to <strong style={{ color: 'var(--parch)' }}>{resetEmail}</strong>. It expires in 1 hour.
 553 |               </p>
 554 |               <button onClick={() => { setStep('form'); setResetEmail(''); setResetError(''); }} style={{ background: 'none', border: 'none', color: 'var(--stone)', fontSize: 11, cursor: 'pointer', minHeight: 'unset' }}>
 555 |                 ← Back to Sign In
 556 |               </button>
 557 |             </div>
 558 |           )}
 559 |         </div>
 560 |       </div>
 561 |     </div>
 562 |   );
 563 | }
