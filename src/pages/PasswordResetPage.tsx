import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { logger } from '@/core/logger';

const schema = z.object({
  password: z.string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'At least one uppercase letter')
    .regex(/[0-9]/, 'At least one number'),
  confirm: z.string(),
}).refine(d => d.password === d.confirm, {
  message: "Passwords don't match",
  path: ['confirm'],
});

type FormData = z.infer<typeof schema>;

export function PasswordResetPage() {
  const [step, setStep] = useState<'loading' | 'form' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    // Supabase SDK processes the #access_token&type=recovery hash automatically.
    // Listen for PASSWORD_RECOVERY event to confirm the link is valid.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        logger.info('PasswordResetPage', 'Recovery session active');
        setStep('form');
      }
    });

    // Timeout: if no recovery event fires within 6 s the link is bad/expired.
    const timeout = setTimeout(() => {
      setStep(prev => {
        if (prev === 'loading') {
          setErrorMsg('Invalid or expired reset link. Please request a new one.');
          return 'error';
        }
        return prev;
      });
    }, 6000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const onSubmit = async (data: FormData) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: data.password });
      if (error) throw error;
      logger.info('PasswordResetPage', 'Password updated successfully');
      setStep('success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Password update failed';
      logger.error('PasswordResetPage', 'Update failed', { msg });
      setErrorMsg(msg);
      setStep('error');
    }
  };

  const field: React.CSSProperties = {
    width: '100%', background: 'var(--ink3)', border: '1px solid var(--bord2)',
    color: 'var(--parch)', padding: '11px 14px', fontFamily: 'DM Sans, sans-serif',
    fontSize: 14, outline: 'none', borderRadius: 6, boxSizing: 'border-box',
  };
  const label: React.CSSProperties = {
    fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '.2em',
    color: 'var(--stone)', display: 'block', marginBottom: 5, textTransform: 'uppercase',
  };
  const err: React.CSSProperties = { fontSize: 11, color: '#f87171', marginTop: 4, fontFamily: 'DM Mono, monospace' };

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--ink)', padding: 32,
    }}>
      <div style={{
        background: 'var(--ink2)', border: '1px solid var(--bord2)',
        borderRadius: 16, width: '100%', maxWidth: 400, padding: 32,
      }}>
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 24, fontWeight: 700, color: 'var(--brass)', marginBottom: 4 }}>
          Fanu's Studio-P
        </div>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '.25em', color: 'var(--stone)', marginBottom: 28 }}>
          RESET PASSWORD
        </div>

        {step === 'loading' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 40, color: 'var(--brass)', animation: 'pulse 2s ease infinite', marginBottom: 12 }}>P</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '.3em', color: 'var(--stone)' }}>VERIFYING LINK…</div>
          </div>
        )}

        {step === 'form' && (
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={label}>New Password</label>
              <input {...register('password')} type="password" placeholder="••••••••" style={field} autoComplete="new-password" />
              {errors.password && <p style={err}>{errors.password.message}</p>}
            </div>
            <div>
              <label style={label}>Confirm Password</label>
              <input {...register('confirm')} type="password" placeholder="••••••••" style={field} autoComplete="new-password" />
              {errors.confirm && <p style={err}>{errors.confirm.message}</p>}
            </div>
            <button type="submit" disabled={isSubmitting} style={{
              background: 'var(--brass)', color: 'var(--ink)', border: 'none',
              padding: 13, borderRadius: 6, fontFamily: 'DM Mono, monospace',
              fontSize: 10, letterSpacing: '.25em', textTransform: 'uppercase',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.6 : 1, marginTop: 8,
            }}>
              {isSubmitting ? 'Updating…' : 'Set New Password →'}
            </button>
          </form>
        )}

        {step === 'success' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 14, color: 'var(--brass)' }}>✓</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Password updated</div>
            <p style={{ fontSize: 12, color: 'var(--stone)', marginBottom: 20, lineHeight: 1.6 }}>
              Your password has been reset. You can now sign in with your new password.
            </p>
            <a href="/" style={{
              display: 'inline-block', background: 'var(--brass)', color: 'var(--ink)',
              padding: '10px 24px', borderRadius: 6, fontFamily: 'DM Mono, monospace',
              fontSize: 10, letterSpacing: '.15em', textTransform: 'uppercase', textDecoration: 'none',
            }}>Return Home →</a>
          </div>
        )}

        {step === 'error' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>⚠</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, color: '#f87171' }}>Link invalid</div>
            <p style={{ fontSize: 12, color: 'var(--stone)', marginBottom: 20, lineHeight: 1.6 }}>{errorMsg}</p>
            <a href="/" style={{
              display: 'inline-block', background: 'var(--ink3)', color: 'var(--stone)',
              border: '1px solid var(--bord2)', padding: '10px 24px', borderRadius: 6,
              fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: '.15em',
              textTransform: 'uppercase', textDecoration: 'none',
            }}>Request New Link</a>
          </div>
        )}
      </div>
    </div>
  );
}
