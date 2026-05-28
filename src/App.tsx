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
import { DevLogPanel } from '@/components/DevLogPanel';
import { LandingPage } from '@/portals/LandingPage';
import { AdminPortal } from '@/portals/AdminPortal';
import { ViewerPortal, EditorPortal } from '@/portals/ViewerEditorPortals';
import './index.css';

const isProduction = import.meta.env.VITE_APP_ENV === 'production';

// ── Error Boundary ────────────────────────────────
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { logger.error('ErrorBoundary', error.message, { stack: info.componentStack ?? '' }); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ink)', color: 'var(--parch)', padding: 32, flexDirection: 'column', gap: 16, textAlign: 'center' }}>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 48, color: 'var(--brass)' }}>P</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, letterSpacing: '.2em', color: '#f87171' }}>SOMETHING WENT WRONG</div>
          <div style={{ fontSize: 13, color: 'var(--stone)', maxWidth: 400, lineHeight: 1.6 }}>{(this.state.error as Error).message}</div>
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
        <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 20, fontWeight: 700, color: 'var(--brass)', lineHeight: 1 }}>P</span>
        <span style={{ letterSpacing: '.06em', color: 'var(--stone)' }}>Studio P</span>
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
  const [user, setUser] = useState<UserProfile | null>(() => authService.getProfile());
  const [page, setPage] = useState<AppPage>(() => {
    const p = authService.getProfile();
    if (!p) return 'landing';
    return p.role === 'admin' ? 'admin' : p.role === 'editor' ? 'editor' : 'viewer';
  });
  const [authOpen, setAuthOpen] = useState(false);

  // Apply OS body classes
  useEffect(() => {
    document.body.classList.add('os-' + osInfo.os);
    if (osInfo.mobile) document.body.classList.add('is-mobile');
    document.body.classList.add('has-dock');
    document.documentElement.style.setProperty('--bar-h', osInfo.chromeHeight + 'px');
    logger.info('App', 'Studio P initialised', { os: osInfo.os, mobile: osInfo.mobile });
  }, []);

  const handleAuth = (profile: UserProfile) => {
    setUser(profile);
    setPage(profile.role === 'admin' ? 'admin' : profile.role === 'editor' ? 'editor' : 'viewer');
    setAuthOpen(false);
    logger.info('App', 'User signed in', { name: profile.name, role: profile.role });
  };

  const handleSignOut = async () => {
    await authService.signOut();
    setUser(null);
    setPage('landing');
    logger.info('App', 'User signed out');
  };

  const padTop = osInfo.mobile ? 0 : osInfo.chromeHeight;
  const padBot = 80;

  return (
    <div style={{ minHeight: '100dvh', paddingTop: padTop, paddingBottom: padBot }}>
      <MacBar user={user} onSignIn={() => setAuthOpen(true)} onSignOut={handleSignOut} />

      {page === 'landing' && <LandingPage onSignIn={() => setAuthOpen(true)} />}
      {page === 'admin'   && user?.role === 'admin'  && <AdminPortal  user={user} onClose={() => setPage('landing')} />}
      {page === 'editor'  && user?.role === 'editor' && <EditorPortal user={user} onClose={() => setPage('landing')} />}
      {page === 'viewer'  && user && <ViewerPortal user={user} onClose={() => setPage('landing')} />}

      <Dock user={user} page={page} onNav={setPage} />

      {authOpen && (
        <AuthModal
          onSuccess={handleAuth}
          onClose={() => setAuthOpen(false)}
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
