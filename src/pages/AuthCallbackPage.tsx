import { useEffect } from 'react';
import { logger } from '@/core/logger';

export function AuthCallbackPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash   = new URLSearchParams(window.location.hash.slice(1));

    // Re-arm the oauth_pending flag in case sessionStorage was lost
    // (mobile in-app browsers open OAuth in a separate system context).
    if (params.get('code') && !sessionStorage.getItem('oauth_pending')) {
      sessionStorage.setItem('oauth_pending', '1');
    }

    const errDesc = params.get('error_description') ?? hash.get('error_description');
    if (errDesc) {
      const msg = decodeURIComponent(errDesc).replace(/\+/g, ' ');
      logger.warn('AuthCallbackPage', 'OAuth error in callback URL', { msg });
      sessionStorage.removeItem('oauth_pending');
      const q = new URLSearchParams({ error_description: errDesc });
      window.location.replace(`/?${q.toString()}`);
      return;
    }

    // Supabase SDK exchanges the code automatically via detectSessionInUrl.
    // Safety-net timeout — if exchange never resolves, go home.
    const timeout = setTimeout(() => {
      logger.warn('AuthCallbackPage', 'Auth exchange timeout, redirecting home');
      sessionStorage.removeItem('oauth_pending');
      window.location.replace('/');
    }, 10000);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--ink)', flexDirection: 'column', gap: 16,
    }}>
      <div style={{
        fontFamily: 'Cormorant Garamond, serif', fontSize: 60,
        color: 'var(--brass)', animation: 'pulse 2s ease infinite',
      }}>P</div>
      <div style={{
        fontFamily: 'DM Mono, monospace', fontSize: 9,
        letterSpacing: '.3em', color: 'var(--stone)',
      }}>COMPLETING SIGN IN…</div>
    </div>
  );
}
