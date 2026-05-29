// ════════════════════════════════════════════════
// STUDIO P — AuthCallbackPage
// Handles OAuth redirects from Supabase
// ════════════════════════════════════════════════

import { useEffect } from 'react';
import { logger } from '@/core/logger';

export function AuthCallbackPage() {
  useEffect(() => {
    // Parse OAuth callback errors from URL
    const params = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.slice(1));
    
    const errDesc = params.get('error_description') ?? hash.get('error_description');
    const code = params.get('code');
    
    logger.info('AuthCallbackPage', 'OAuth callback received', { 
      hasCode: !!code, 
      hasError: !!errDesc 
    });

    // Supabase SDK will handle the code exchange automatically via detectSessionInUrl
    // On error, clean up and redirect to auth modal with error message
    if (errDesc) {
      const msg = decodeURIComponent(errDesc).replace(/\+/g, ' ');
      logger.warn('AuthCallbackPage', 'OAuth failed', { msg });
      
      // Clear sessionStorage flag so app doesn't show spinner
      sessionStorage.removeItem('oauth_pending');
      
      // Redirect to home with error state (App.tsx will catch this)
      const errorUrl = new URLSearchParams();
      errorUrl.set('error_description', errDesc);
      window.history.replaceState({}, '', `/?${errorUrl.toString()}`);
      
      // Force redirect after state is set
      setTimeout(() => window.location.href = '/', 100);
    } else if (code) {
      // Success path — Supabase SDK handles exchange automatically
      // Just wait for onAuthStateChange to fire and redirect to dashboard
      logger.info('AuthCallbackPage', 'OAuth code received, awaiting exchange…');
      // Set a timeout to fallback if auth never completes
      const timeout = setTimeout(() => {
        logger.warn('AuthCallbackPage', 'Auth exchange timeout, redirecting to home');
        window.location.href = '/';
      }, 8000);
      return () => clearTimeout(timeout);
    } else {
      // No code or error — shouldn't happen, redirect home
      logger.warn('AuthCallbackPage', 'No code or error in callback');
      window.location.href = '/';
    }
  }, []);

  return (
    <div style={{ 
      minHeight: '100dvh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: 'var(--ink)', 
      flexDirection: 'column', 
      gap: 16 
    }}>
      <div style={{ 
        fontFamily: 'Cormorant Garamond, serif', 
        fontSize: 60, 
        color: 'var(--brass)', 
        animation: 'pulse 2s ease infinite' 
      }}>P</div>
      <div style={{ 
        fontFamily: 'DM Mono, monospace', 
        fontSize: 9, 
        letterSpacing: '.3em', 
        color: 'var(--stone)' 
      }}>COMPLETING SIGN IN…</div>
    </div>
  );
}
