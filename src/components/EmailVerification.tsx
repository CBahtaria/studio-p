import { useState, useEffect, useCallback } from 'react';
import { authService } from '@/auth/AuthService';
import { supabase } from '@/lib/supabase';

interface EmailVerificationProps {
  email: string;
  onVerified: () => void;
  onBack: () => void;
}

export function EmailVerification({ email, onVerified, onBack }: EmailVerificationProps) {
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleResend = useCallback(async () => {
    setResending(true);
    setResendMsg('');
    try {
      await authService.resendVerification(email);
      setResendMsg('Sent! Check your inbox.');
      setCooldown(60);
    } catch (e) {
      setResendMsg(e instanceof Error ? e.message : 'Failed to resend');
    } finally {
      setResending(false);
    }
  }, [email]);

  const handleCheckVerified = useCallback(async () => {
    setChecking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email_confirmed_at) {
        onVerified();
      } else {
        // Refresh session to pick up any verification changes
        await supabase.auth.refreshSession();
        const { data: { session: fresh } } = await supabase.auth.getSession();
        if (fresh?.user?.email_confirmed_at) {
          onVerified();
        } else {
          setResendMsg('Email not yet verified. Click the link in your inbox.');
        }
      }
    } finally {
      setChecking(false);
    }
  }, [email, onVerified]);

  return (
    <div style={{ textAlign: 'center', padding: '8px 0' }}>
      <div style={{ fontSize: 44, marginBottom: 16 }}>✉️</div>

      <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 700, color: 'var(--brass)', marginBottom: 8 }}>
        Check your inbox
      </div>

      <p style={{ fontSize: 13, color: 'var(--stone)', lineHeight: 1.7, marginBottom: 4 }}>
        We sent a verification link to
      </p>
      <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--parch)', marginBottom: 24, wordBreak: 'break-all' }}>
        {email}
      </p>

      <p style={{ fontSize: 11, color: 'var(--stone)', lineHeight: 1.6, marginBottom: 20 }}>
        Click the link in that email to confirm your account. The link expires in 24 hours.
      </p>

      <button
        onClick={handleCheckVerified}
        disabled={checking}
        style={{
          width: '100%', background: 'var(--brass)', color: 'var(--ink)', border: 'none',
          padding: '12px 24px', borderRadius: 6, fontFamily: 'DM Mono, monospace',
          fontSize: 10, letterSpacing: '.25em', textTransform: 'uppercase', cursor: 'pointer',
          marginBottom: 10, opacity: checking ? 0.6 : 1,
        }}
      >
        {checking ? 'Checking…' : "I've Verified My Email →"}
      </button>

      <button
        onClick={handleResend}
        disabled={resending || cooldown > 0}
        style={{
          width: '100%', background: 'transparent',
          border: '1px solid var(--bord2)', color: 'var(--stone)',
          padding: '10px 24px', borderRadius: 6, fontFamily: 'DM Mono, monospace',
          fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', cursor: cooldown > 0 ? 'not-allowed' : 'pointer',
          marginBottom: 10,
        }}
      >
        {cooldown > 0 ? `Resend in ${cooldown}s` : resending ? 'Sending…' : 'Resend Verification Email'}
      </button>

      {resendMsg && (
        <div style={{ fontSize: 11, color: resendMsg.startsWith('Sent') ? '#52E89A' : '#f87171', marginBottom: 10 }}>
          {resendMsg}
        </div>
      )}

      <button
        onClick={onBack}
        style={{ background: 'none', border: 'none', color: 'var(--stone)', fontSize: 11, cursor: 'pointer', minHeight: 'unset' }}
      >
        ← Use a different email
      </button>
    </div>
  );
}
