// ════════════════════════════════════════════════
// STUDIO P — AuthModal (Supabase-backed)
// Tabs: Sign In | Sign Up | Demo (dev only)
// ════════════════════════════════════════════════

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { UserProfile } from '@/types';
import { authService } from '@/auth/AuthService';
import { EmailVerification } from '@/components/EmailVerification';
import {
  signInSchema, signUpSchema,
  type SignInFormData, type SignUpFormData,
  getPasswordStrength,
} from '@/lib/validation';

type Tab = 'signin' | 'signup' | 'demo';
type Step = 'form' | 'loading' | 'verify-email' | 'reset-sent' | 'profile-complete';

interface AuthModalProps {
  onSuccess: (profile: UserProfile) => void;
  onClose: () => void;
  initialError?: string;
}

const isDemoEnabled = import.meta.env.VITE_ENABLE_DEMO_MODE === 'true';

// ── Shared field style ──────────────────────────
const fieldStyle: React.CSSProperties = {
  width: '100%', background: 'var(--ink3)', border: '1px solid var(--bord2)',
  color: 'var(--parch)', padding: '11px 14px', fontFamily: 'DM Sans, sans-serif',
  fontSize: 14, outline: 'none', borderRadius: 6, boxSizing: 'border-box',
};
const errStyle: React.CSSProperties = {
  fontSize: 11, color: '#f87171', marginTop: 4, fontFamily: 'DM Mono, monospace',
};
const labelStyle: React.CSSProperties = {
  fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '.2em',
  color: 'var(--stone)', display: 'block', marginBottom: 5, textTransform: 'uppercase',
};

// ── Sign In Form ────────────────────────────────
function SignInForm({ onSuccess, onForgotPassword }: {
  onSuccess: (profile: UserProfile) => void;
  onForgotPassword: () => void;
}) {
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [step, setStep] = useState<'form' | 'verify'>('form');

  const { register, handleSubmit, formState: { errors } } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
  });

  const onSubmit = async (data: SignInFormData) => {
    setLoading(true);
    setApiError('');
    try {
      const result = await authService.signIn(data.email, data.password);
      if (result.needsVerification) {
        setPendingEmail(data.email);
        setStep('verify');
      } else {
        onSuccess(result.profile);
      }
    } catch (e) {
      setApiError(e instanceof Error ? e.message : 'Sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'verify') {
    return (
      <EmailVerification
        email={pendingEmail}
        onVerified={() => setStep('form')}
        onBack={() => setStep('form')}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label style={labelStyle}>Email</label>
        <input {...register('email')} type="email" placeholder="you@example.com" style={fieldStyle} autoComplete="email"/>
        {errors.email && <p style={errStyle}>{errors.email.message}</p>}
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>Password</label>
          <button type="button" onClick={onForgotPassword}
            style={{ background: 'none', border: 'none', color: 'var(--brass)', fontSize: 10, cursor: 'pointer', minHeight: 'unset', fontFamily: 'DM Mono, monospace' }}>
            Forgot?
          </button>
        </div>
        <input {...register('password')} type="password" placeholder="••••••••" style={fieldStyle} autoComplete="current-password"/>
        {errors.password && <p style={errStyle}>{errors.password.message}</p>}
      </div>

      {apiError && <div style={{ padding: '10px 12px', background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.3)', borderRadius: 6, fontSize: 12, color: '#f87171' }}>{apiError}</div>}

      <button type="submit" disabled={loading} style={{
        background: 'var(--brass)', color: 'var(--ink)', border: 'none', padding: '13px',
        borderRadius: 6, fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: '.25em',
        textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
      }}>
        {loading ? 'Signing in…' : 'Sign In →'}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--bord)' }}/>
        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--stone)' }}>OR</span>
        <div style={{ flex: 1, height: 1, background: 'var(--bord)' }}/>
      </div>

      <button type="button" onClick={() => authService.signInWithGoogle()} style={{
        width: '100%', background: 'var(--ink3)', border: '1px solid var(--bord2)', color: 'var(--parch2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        padding: '12px', borderRadius: 6, fontFamily: 'DM Mono, monospace', fontSize: 11, cursor: 'pointer',
      }}>
        <svg width="18" height="18" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.6 0 6.5 1.4 8.8 3.7l6.6-6.6C35.2 2.4 30 0 24 0 14.6 0 6.6 5.4 2.4 13.2l7.7 6C12.1 13 17.6 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.5 24.5c0-1.7-.1-3.3-.4-4.8H24v9.1h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 7.1-10 7.1-17.3z"/>
          <path fill="#FBBC05" d="M10.1 28.5A14.5 14.5 0 019.5 24c0-1.6.3-3.1.6-4.5l-7.7-6A23.9 23.9 0 000 24c0 3.8.9 7.5 2.4 10.8l7.7-6.3z"/>
          <path fill="#34A853" d="M24 48c6 0 11.1-2 14.8-5.4l-7.5-5.8c-2 1.4-4.6 2.2-7.3 2.2-6.4 0-11.8-4.3-13.9-10.2l-7.7 6C6.6 42.6 14.6 48 24 48z"/>
        </svg>
        Continue with Google
      </button>
    </form>
  );
}

// ── Sign Up Form ────────────────────────────────
function SignUpForm({ onSuccess }: { onSuccess: (profile: UserProfile, needsVerification: boolean, email: string) => void }) {
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pwValue, setPwValue] = useState('');

  const { register, handleSubmit, formState: { errors }, watch } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
  });

  watch((data) => { if (data.password !== undefined) setPwValue(data.password); });

  const strength = getPasswordStrength(pwValue);

  const onSubmit = async (data: SignUpFormData) => {
    setLoading(true);
    setApiError('');
    try {
      const result = await authService.signUp({
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone || undefined,
      });
      onSuccess(result.profile, !!result.needsVerification, data.email);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : 'Sign-up failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <label style={labelStyle}>Full Name</label>
        <input {...register('name')} placeholder="Your name" style={fieldStyle} autoComplete="name"/>
        {errors.name && <p style={errStyle}>{errors.name.message}</p>}
      </div>

      <div>
        <label style={labelStyle}>Email</label>
        <input {...register('email')} type="email" placeholder="you@example.com" style={fieldStyle} autoComplete="email"/>
        {errors.email && <p style={errStyle}>{errors.email.message}</p>}
      </div>

      <div>
        <label style={labelStyle}>Password</label>
        <input {...register('password')} type="password" placeholder="Min 8 chars, 1 uppercase, 1 number" style={fieldStyle} autoComplete="new-password"/>
        {pwValue && (
          <div style={{ marginTop: 6 }}>
            <div style={{ height: 3, background: 'var(--bord)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(strength.score / 4) * 100}%`, background: strength.color, borderRadius: 2, transition: 'width .3s, background .3s' }}/>
            </div>
            <span style={{ fontSize: 10, color: strength.color, fontFamily: 'DM Mono, monospace', marginTop: 3, display: 'block' }}>{strength.label}</span>
          </div>
        )}
        {errors.password && <p style={errStyle}>{errors.password.message}</p>}
      </div>

      <div>
        <label style={labelStyle}>Confirm Password</label>
        <input {...register('confirmPassword')} type="password" placeholder="Repeat password" style={fieldStyle} autoComplete="new-password"/>
        {errors.confirmPassword && <p style={errStyle}>{errors.confirmPassword.message}</p>}
      </div>

      <div>
        <label style={labelStyle}>Phone (optional)</label>
        <input {...register('phone')} type="tel" placeholder="+268 7600 0000" style={fieldStyle} autoComplete="tel"/>
        {errors.phone && <p style={errStyle}>{errors.phone.message}</p>}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 4 }}>
        <input {...register('terms')} type="checkbox" id="terms" style={{ marginTop: 2, accentColor: 'var(--brass)', cursor: 'pointer' }}/>
        <label htmlFor="terms" style={{ fontSize: 11, color: 'var(--stone)', lineHeight: 1.6, cursor: 'pointer' }}>
          I agree to Studio P's <span style={{ color: 'var(--brass)' }}>Terms of Service</span> and <span style={{ color: 'var(--brass)' }}>Privacy Policy</span>
        </label>
      </div>
      {errors.terms && <p style={errStyle}>{errors.terms.message}</p>}

      {apiError && <div style={{ padding: '10px 12px', background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.3)', borderRadius: 6, fontSize: 12, color: '#f87171' }}>{apiError}</div>}

      <button type="submit" disabled={loading} style={{
        background: 'var(--brass)', color: 'var(--ink)', border: 'none', padding: '13px',
        borderRadius: 6, fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: '.25em',
        textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, marginTop: 4,
      }}>
        {loading ? 'Creating account…' : 'Create Account →'}
      </button>
    </form>
  );
}

// ── Demo Form ───────────────────────────────────
function DemoForm({ onSuccess }: { onSuccess: (profile: UserProfile) => void }) {
  const [loading, setLoading] = useState('');

  const pick = async (role: 'admin' | 'editor' | 'viewer') => {
    setLoading(role);
    try {
      const profile = await authService.signInDemo(role);
      onSuccess(profile);
    } finally {
      setLoading('');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ fontSize: 11, color: 'var(--stone)', lineHeight: 1.6, marginBottom: 4 }}>
        Development mode — explore all portals without a real account.
      </p>
      {([
        ['admin',  '⚡ Admin Portal',  'Full system access', 'var(--admin-a)'],
        ['editor', '🎨 Editor Studio', 'Content management', 'var(--edit-a)'],
        ['viewer', '✨ Member Space',  'Booking & history',  'var(--view-a)'],
      ] as const).map(([role, label, desc, color]) => (
        <button key={role} onClick={() => pick(role)} disabled={!!loading} style={{
          background: 'var(--ink3)', border: `1px solid ${color}22`, borderRadius: 8,
          padding: '14px 16px', textAlign: 'left', cursor: 'pointer', transition: 'border-color .15s',
          opacity: loading && loading !== role ? 0.5 : 1,
        }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color, marginBottom: 3 }}>
            {loading === role ? 'Loading…' : label}
          </div>
          <div style={{ fontSize: 11, color: 'var(--stone)' }}>{desc}</div>
        </button>
      ))}
    </div>
  );
}

// ── Root AuthModal ──────────────────────────────
export function AuthModal({ onSuccess, onClose, initialError }: AuthModalProps) {
  const tabs: Tab[] = isDemoEnabled ? ['signin', 'signup', 'demo'] : ['signin', 'signup'];
  const [tab, setTab] = useState<Tab>('signin');
  const [step, setStep] = useState<Step>('form');
  const [verifyEmail, setVerifyEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState('');

  const handleSignUpSuccess = (profile: UserProfile, needsVerification: boolean, email: string) => {
    if (needsVerification) {
      setVerifyEmail(email);
      setStep('verify-email');
    } else {
      onSuccess(profile);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) { setResetError('Enter your email above first'); return; }
    setResetLoading(true);
    setResetError('');
    try {
      await authService.resetPassword(resetEmail);
      setStep('reset-sent');
    } catch (e) {
      setResetError(e instanceof Error ? e.message : 'Failed to send reset email');
    } finally {
      setResetLoading(false);
    }
  };

  const TAB_LABELS: Record<Tab, string> = { signin: 'Sign In', signup: 'Sign Up', demo: 'Demo' };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', backdropFilter: 'blur(12px)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn .2s ease' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--ink2)', border: '1px solid var(--bord2)', borderRadius: 16,
        width: '100%', maxWidth: 400, margin: '0 16px',
        animation: 'windowIn .28s cubic-bezier(.16,1,.3,1)', overflow: 'hidden',
        maxHeight: '90dvh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ padding: '24px 28px 0', borderBottom: '1px solid var(--bord)', paddingBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 24, fontWeight: 700, color: 'var(--brass)', lineHeight: 1 }}>Studio P</div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '.25em', color: 'var(--stone)', marginTop: 3 }}>MANZINI · ESWATINI</div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--bord2)', color: 'var(--stone)', width: 32, height: 32, minHeight: 'unset', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>✕</button>
          </div>

          {step === 'form' && (
            <div style={{ display: 'flex', borderBottom: '1px solid var(--bord)', marginBottom: -1 }}>
              {tabs.map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  background: 'none', border: 'none', borderBottom: `2px solid ${tab === t ? 'var(--brass)' : 'transparent'}`,
                  color: tab === t ? 'var(--brass)' : 'var(--stone)', padding: '8px 0', marginRight: 20,
                  fontFamily: 'DM Mono, monospace', fontSize: 11, letterSpacing: '.15em', textTransform: 'uppercase',
                  cursor: 'pointer', minHeight: 'unset', transition: 'color .15s',
                }}>
                  {TAB_LABELS[t]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '22px 28px 28px' }}>
          {initialError && step === 'form' && (
            <div style={{ padding: '10px 14px', background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.3)', borderRadius: 8, fontSize: 12, color: '#f87171', marginBottom: 16, lineHeight: 1.5 }}>
              {initialError}
            </div>
          )}
          {step === 'form' && tab === 'signin' && (
            <SignInForm
              onSuccess={onSuccess}
              onForgotPassword={() => setStep('reset-sent')}
            />
          )}
          {step === 'form' && tab === 'signup' && (
            <SignUpForm onSuccess={handleSignUpSuccess} />
          )}
          {step === 'form' && tab === 'demo' && isDemoEnabled && (
            <DemoForm onSuccess={onSuccess} />
          )}

          {step === 'verify-email' && (
            <EmailVerification
              email={verifyEmail}
              onVerified={() => setStep('form')}
              onBack={() => setStep('form')}
            />
          )}

          {step === 'reset-sent' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 14 }}>📧</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Password reset sent</div>
              <p style={{ fontSize: 12, color: 'var(--stone)', marginBottom: 20, lineHeight: 1.6 }}>
                Check your inbox for a reset link. It expires in 1 hour.
              </p>
              <div style={{ marginBottom: 12 }}>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  style={{ ...fieldStyle, marginBottom: 8 }}
                />
                {resetError && <p style={errStyle}>{resetError}</p>}
                <button onClick={handleForgotPassword} disabled={resetLoading} style={{
                  width: '100%', background: 'var(--ink3)', border: '1px solid var(--bord2)',
                  color: 'var(--stone)', padding: '10px', borderRadius: 6,
                  fontFamily: 'DM Mono, monospace', fontSize: 10, cursor: 'pointer',
                }}>
                  {resetLoading ? 'Sending…' : 'Send Reset Email'}
                </button>
              </div>
              <button onClick={() => setStep('form')} style={{ background: 'none', border: 'none', color: 'var(--stone)', fontSize: 11, cursor: 'pointer', minHeight: 'unset' }}>
                ← Back to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
