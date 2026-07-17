// ════════════════════════════════════════════════
// STUDIO P — App.tsx (root)
// Main application shell: routing, auth state, OS chrome
// ════════════════════════════════════════════════

import { useState, useEffect, Component, type ReactNode, type ErrorInfo } from 'react';
import type { UserProfile } from '@/types';
import { authService } from '@/auth/AuthService';
import { osInfo } from '@/core/osDetect';
import { logger } from '@/core/logger';
import { AuthModal } from '@/components/AuthModal';
import { AuthCallbackPage } from '@/pages/AuthCallbackPage';
import { PasswordResetPage } from '@/pages/PasswordResetPage';
import { PrivacyPage } from '@/pages/PrivacyPage';
import { TermsPage } from '@/pages/TermsPage';
import { PricelistPage } from '@/pages/PricelistPage';
import { DevLogPanel } from '@/components/DevLogPanel';
import { LandingPage } from '@/portals/LandingPage';
import { AdminPortal } from '@/portals/AdminPortal';
import { ViewerPortal, EditorPortal } from '@/portals/ViewerEditorPortals';
import './index.css';

const isProduction = import.meta.env.VITE_APP_ENV === 'production';

// ── Error Boundary ────────────────────────────────
class ErrorBoundary extends Component<{ children: ReactNode }, { error: unknown }> {
  state: { error: unknown } = { error: null };
  static getDerivedStateFromError(error: unknown) { return { error }; }
  componentDidCatch(error: unknown, info: ErrorInfo) { logger.error('ErrorBoundary', error instanceof Error ? error.message : String(error), { stack: info.componentStack ?? '' }); }
  render() {
    if (this.state.error) {
      const msg = this.state.error instanceof Error ? this.state.error.message : String(this.state.error);
      return (
        <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ink)', color: 'var(--parch)', padding: 32, flexDirection: 'column', gap: 16, textAlign: 'center' }}>
          <img src="/mt-logo.png" alt="MT Barbershop" style={{ height: 56, width: 'auto', objectFit: 'contain' }} />
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, letterSpacing: '.2em', color: '#f87171' }}>SOMETHING WENT WRONG</div>
          <div style={{ fontSize: 13, color: 'var(--stone)', maxWidth: 400, lineHeight: 1.6 }}>{msg}</div>
          <button onClick={() => window.location.reload()} style={{ background: 'var(--brass)', color: 'var(--ink)', border: 'none', padding: '10px 24px', borderRadius: 6, fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: '.2em', cursor: 'pointer', marginTop: 8 }}>
            RELOAD PAGE
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

type AppPage = 'landing' | 'admin' | 'editor' | 'viewer';
type AnyPage = AppPage | 'auth/callback' | 'auth/reset';

function getPageFromPathname(pathname: string): AnyPage {
  if (pathname.startsWith('/auth/callback')) return 'auth/callback';
  if (pathname.startsWith('/auth/reset'))    return 'auth/reset';
  if (pathname === '/admin')  return 'admin';
  if (pathname === '/editor') return 'editor';
  if (pathname === '/viewer') return 'viewer';
  return 'landing';
}

// ── Mac-style Menu Bar ────────────────────────────
function MacBar({ user, onSignIn, onSignOut }: { user: UserProfile | null; onSignIn: () => void; onSignOut: () => void }) {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })), 30000);
    return () => clearInterval(t);
  }, []);

  if (osInfo.mobile) return null;

  const roleColor: Record<string, string> = { admin: 'var(--admin-a)', editor: 'var(--edit-a)', viewer: 'var(--view-a)', guest: 'var(--stone)' };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      height: osInfo.chromeHeight,
      background: 'rgba(10,9,6,.94)',
      backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
      borderBottom: '1px solid var(--bord)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 18px', zIndex: 200,
      fontFamily: 'DM Mono, monospace', fontSize: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <img src="/mt-logo.png" alt="MT Barbershop" style={{ height: 24, width: 'auto', objectFit: 'contain' }} />
        <span style={{ letterSpacing: '.06em', color: 'var(--stone)' }}>MT Barbershop</span>
        {user && (
          <span style={{ fontSize: 8, color: roleColor[user.role] ?? 'var(--brass)', border: '1px solid', padding: '2px 6px', borderRadius: 3, letterSpacing: '.2em' }}>
            {user.role.toUpperCase()}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ color: 'var(--stone)' }}>{time}</span>
        <button onClick={user ? onSignOut : onSignIn} style={{
          background: 'none', border: '1px solid var(--bord2)', color: 'var(--stone)',
          borderRadius: 5, padding: '4px 12px', fontSize: 11, minHeight: 'unset',
          fontFamily: 'DM Mono, monospace', letterSpacing: '.1em', cursor: 'pointer',
          transition: 'color .2s, border-color .2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--parch)'; e.currentTarget.style.borderColor = 'var(--stone)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--stone)'; e.currentTarget.style.borderColor = 'var(--bord2)'; }}
        >{user ? 'Sign Out' : 'Sign In'}</button>
      </div>
    </div>
  );
}

// ── Mobile sign-in button (shown only when logged out on mobile) ───
function MobileSignIn({ onSignIn }: { onSignIn: () => void }) {
  if (!osInfo.mobile) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 16, right: 16,
      zIndex: 200,
    }}>
      <button onClick={onSignIn} style={{
        background: 'var(--brass)', color: 'var(--ink)',
        border: 'none', borderRadius: 24, padding: '12px 22px',
        fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: '.2em',
        cursor: 'pointer', boxShadow: '0 4px 24px rgba(0,0,0,.4)',
      }}>
        SIGN IN
      </button>
    </div>
  );
}

// ── Dock Nav (mobile + desktop) ───────────────────
function Dock({ user, page, onNav }: { user: UserProfile | null; page: AppPage; onNav: (p: AppPage) => void }) {
  if (!user) return null;

  const items: Array<{ id: AppPage; icon: string; label: string }> = [{ id: 'landing', icon: '🏠', label: 'Home' }];
  if (user.role === 'admin')  items.push({ id: 'admin',  icon: '⚡', label: 'Admin' });
  if (user.role === 'editor') items.push({ id: 'editor', icon: '🎨', label: 'Studio' });
  if (user.role === 'viewer') items.push({ id: 'viewer', icon: '✨', label: 'My Space' });

  return (
    <div style={{
      position: 'fixed',
      bottom: osInfo.os === 'macos' ? 16 : 8,
      left: '50%', transform: 'translateX(-50%)',
      display: 'flex', gap: 6,
      background: 'rgba(16,12,8,.85)',
      backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
      padding: '6px 12px',
      borderRadius: 40,
      border: '1px solid var(--bord)',
      zIndex: 200,
    }}>
      {items.map(item => (
        <button key={item.id} onClick={() => onNav(item.id)} style={{
          background: page === item.id ? 'rgba(184,150,106,.15)' : 'none',
          border: 'none',
          borderRadius: 30,
          padding: '8px 16px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          cursor: 'pointer', minHeight: 'unset',
          transition: 'background .15s',
          animation: page === item.id ? 'dockBounce .3s cubic-bezier(.16,1,.3,1)' : 'none',
        }}>
          <span style={{ fontSize: 18 }}>{item.icon}</span>
          <span style={{
            fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.1em',
            color: page === item.id ? 'var(--brass)' : 'var(--stone)',
          }}>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

// ── Root App ─────────────────────────────────────
function App() {
  const [user, setUser]         = useState<UserProfile | null>(null);
  const [page, setPage]         = useState<AppPage>('landing');
  const [authOpen, setAuthOpen] = useState(false);
  const [authError, setAuthError] = useState('');
  const [loading, setLoading]   = useState(true);

  // Hard-stop spinner after 10 s in case Supabase never fires.
  useEffect(() => {
    const t = setTimeout(() => {
      sessionStorage.removeItem('oauth_pending');
      setLoading(false);
    }, 10000);
    return () => clearTimeout(t);
  }, []);

  // OS body classes + OAuth callback error detection + initial URL routing
  useEffect(() => {
    document.body.classList.add('os-' + osInfo.os);
    if (osInfo.mobile) document.body.classList.add('is-mobile');
    document.body.classList.add('has-dock');
    document.documentElement.style.setProperty('--bar-h', osInfo.chromeHeight + 'px');
    logger.info('App', 'MT Barbershop initialised', { os: osInfo.os, mobile: osInfo.mobile });

    const params = new URLSearchParams(window.location.search);
    const hash   = new URLSearchParams(window.location.hash.slice(1));

    // Re-arm the oauth_pending flag for mobile in-app browsers that lose sessionStorage.
    if (params.get('code') && !sessionStorage.getItem('oauth_pending')) {
      sessionStorage.setItem('oauth_pending', '1');
    }

    const errDesc = params.get('error_description') ?? hash.get('error_description');
    if (errDesc) {
      const msg = decodeURIComponent(errDesc).replace(/\+/g, ' ');
      logger.warn('App', 'OAuth callback error', { msg });
      window.history.replaceState({}, '', '/');
      sessionStorage.removeItem('oauth_pending');
      setAuthError(`Sign-in failed: ${msg}. Please try again.`);
      setAuthOpen(true);
      setLoading(false);
    }

    // Restore portal from URL on hard reload (e.g. user bookmarked /admin).
    const initial = getPageFromPathname(window.location.pathname);
    if (initial === 'admin' || initial === 'editor' || initial === 'viewer') {
      setPage(initial);
    }

    // Browser back/forward button support.
    const onPop = () => {
      const p = getPageFromPathname(window.location.pathname);
      if (p === 'auth/callback' || p === 'auth/reset') return;
      setPage(p as AppPage);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Single source of truth for auth state.
  useEffect(() => {
    const unsub = authService.onAuthStateChange((profile, event) => {
      if (profile) {
        sessionStorage.removeItem('oauth_pending');
        setUser(profile);

        // Don't override the reset page — user is temporarily signed in for recovery.
        if (window.location.pathname.startsWith('/auth/reset')) {
          setLoading(false);
          return;
        }

        const portalPage = profile.role === 'admin' ? 'admin' : profile.role === 'editor' ? 'editor' : 'viewer';
        const isOAuthReturn = window.location.pathname.startsWith('/auth/callback') || window.location.search.includes('code=');
        const isAtPortalUrl = (['admin', 'editor', 'viewer'] as string[]).includes(window.location.pathname.slice(1));

        // SIGNED_IN covers email sign-in from '/'; isOAuthReturn covers Google/Apple; isAtPortalUrl covers bookmarked URLs.
        if (event === 'SIGNED_IN' || isOAuthReturn || isAtPortalUrl) {
          setPage(portalPage);
          setAuthOpen(false);
          if (isOAuthReturn) {
            window.history.replaceState({}, '', `/${portalPage}`);
          } else if (event === 'SIGNED_IN' && !isAtPortalUrl) {
            window.history.pushState({}, '', `/${portalPage}`);
          }
        }

        logger.info('App', 'Auth: signed in', { name: profile.name, role: profile.role, event });
        setLoading(false);
      } else {
        setUser(null);
        sessionStorage.removeItem('oauth_pending');
        if (!window.location.pathname.startsWith('/auth/')) {
          setPage('landing');
        }
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  const handleAuth = (profile: UserProfile) => {
    sessionStorage.removeItem('oauth_pending');
    setUser(profile);
    const portalPage = profile.role === 'admin' ? 'admin' : profile.role === 'editor' ? 'editor' : 'viewer';
    setPage(portalPage);
    window.history.pushState({}, '', `/${portalPage}`);
    setAuthOpen(false);
    logger.info('App', 'User signed in via modal', { name: profile.name, role: profile.role });
  };

  const handleSignOut = async () => {
    sessionStorage.removeItem('oauth_pending');
    try {
      await authService.signOut();
    } catch (e) {
      logger.error('App', 'Sign-out error', { error: String(e) });
    }
    setUser(null);
    setPage('landing');
    window.history.pushState({}, '', '/');
    logger.info('App', 'User signed out');
  };

  const handleNav = (newPage: AppPage) => {
    setPage(newPage);
    window.history.pushState({}, '', newPage === 'landing' ? '/' : `/${newPage}`);
  };

  const padTop = osInfo.mobile ? 0 : osInfo.chromeHeight;
  const padBot = 80;

  // Auth-specific pages render without chrome, regardless of app auth state.
  if (window.location.pathname.startsWith('/auth/callback')) return <AuthCallbackPage />;
  if (window.location.pathname.startsWith('/auth/reset'))    return <PasswordResetPage />;
  if (window.location.pathname === '/privacy')   return <PrivacyPage />;
  if (window.location.pathname === '/terms')     return <TermsPage />;
  if (window.location.pathname === '/pricelist') return <PricelistPage />;

  if (loading) {
    const isOAuth = sessionStorage.getItem('oauth_pending') === '1';
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ink)', flexDirection: 'column', gap: 16 }}>
        <img src="/mt-logo.png" alt="MT Barbershop" style={{ height: 72, width: 'auto', objectFit: 'contain', animation: 'pulse 2s ease infinite' }} />
        {isOAuth && (
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '.3em', color: 'var(--stone)' }}>SIGNING IN…</div>
        )}
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', paddingTop: padTop, paddingBottom: padBot }}>
      <MacBar user={user} onSignIn={() => setAuthOpen(true)} onSignOut={handleSignOut} />

      {page === 'landing' && <LandingPage onSignIn={() => setAuthOpen(true)} />}
      {page === 'admin'   && user?.role === 'admin'  && <AdminPortal  user={user} onClose={() => handleNav('landing')} onSignOut={handleSignOut} />}
      {page === 'editor'  && user?.role === 'editor' && <EditorPortal user={user} onClose={() => handleNav('landing')} onSignOut={handleSignOut} />}
      {page === 'viewer'  && user && <ViewerPortal user={user} onClose={() => handleNav('landing')} onSignOut={handleSignOut} />}

      <Dock user={user} page={page} onNav={handleNav} />
      {!user && <MobileSignIn onSignIn={() => setAuthOpen(true)} />}

      {authOpen && (
        <AuthModal
          onSuccess={handleAuth}
          onClose={() => { setAuthOpen(false); setAuthError(''); }}
          initialError={authError || undefined}
        />
      )}

      {!isProduction && <DevLogPanel />}
    </div>
  );
}

// ── App with error boundary ───────────────────────
export default function AppWithBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
