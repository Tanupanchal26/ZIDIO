import { BrowserRouter, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster, toast } from 'react-hot-toast';
import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from './hooks/useAppDispatch';
import { clearAuth, refreshAccessToken, setCredentials } from './store/auth/auth.slice';
import AppRoutes from './app/router';
import ErrorBoundary from './components/common/ErrorBoundary';
import { initSentry } from './utils/sentry';
import './styles/global.css';

// Initialize Sentry as early as possible
initSentry();

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30000 } } });

const DevNavigator = () => {
  const dispatch = useAppDispatch();
  const auth = useAppSelector((s) => s.auth);
  const [minimized, setMinimized] = useState(() => {
    return localStorage.getItem('im_dev_minimized') === 'true';
  });

  const toggleMinimize = () => {
    setMinimized(m => {
      const next = !m;
      localStorage.setItem('im_dev_minimized', String(next));
      return next;
    });
  };

  const handleMockLogin = () => {
    dispatch(setCredentials({
      user: {
        id: 'dev-user-id',
        name: 'Developer Mode',
        email: 'dev@intellmeet.com',
        role: 'admin',
      },
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token'
    }));
    toast.success('Signed in as Developer!');
  };

  const handleMockLogout = () => {
    dispatch(clearAuth());
    toast.success('Signed out from Dev Mode');
  };

  if (minimized) {
    return (
      <button
        onClick={toggleMinimize}
        title="Open Developer Portal"
        style={{
          position: 'fixed',
          bottom: '16px',
          left: '16px',
          zIndex: 99999,
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          backgroundColor: '#0F0F1A',
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: '18px',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.08)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
        }}
      >
        🛠️
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '16px',
      left: '16px',
      zIndex: 99999,
      backgroundColor: '#0F0F1A',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: '16px',
      padding: '14px',
      boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
      color: '#fff',
      fontFamily: "'Inter', system-ui, sans-serif",
      fontSize: '11px',
      width: '280px',
    }}>
      {/* Title & Collapsible trigger */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontWeight: 'bold',
        marginBottom: '10px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        paddingBottom: '8px',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
          🛠️ IntellMeet Developer Portal
        </span>
        <button
          onClick={toggleMinimize}
          style={{
            background: 'none',
            border: 'none',
            color: '#A1A1AA',
            cursor: 'pointer',
            fontSize: '11px',
            padding: '2px 6px',
            borderRadius: '4px',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#A1A1AA'}
        >
          [Minimize]
        </button>
      </div>

      {/* Auth Status & Controls */}
      <div style={{
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: '8px',
        padding: '8px 10px',
        marginBottom: '12px',
        border: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ color: '#A1A1AA' }}>Auth Status:</span>
          {auth.isAuthenticated ? (
            <span style={{ color: '#10B981', fontWeight: 'bold' }}>🟢 Authenticated</span>
          ) : (
            <span style={{ color: '#EF4444', fontWeight: 'bold' }}>🔴 Unauthenticated</span>
          )}
        </div>

        {auth.isAuthenticated ? (
          <div>
            <div style={{ fontSize: '10px', color: '#E4E4E7', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              👤 {auth.user?.name || 'Dev User'} ({auth.user?.email})
            </div>
            <button
              onClick={handleMockLogout}
              style={{
                width: '100%',
                backgroundColor: '#EF4444',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '10px',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              🔒 Disable Mock Auth
            </button>
          </div>
        ) : (
          <button
            onClick={handleMockLogin}
            style={{
              width: '100%',
              backgroundColor: '#6366F1',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '6px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '10px',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            ⚡ Enable Mock Auth (Login)
          </button>
        )}
      </div>

      {/* Pages list */}
      <div style={{ color: '#A1A1AA', fontWeight: 'bold', marginBottom: '6px', fontSize: '10px' }}>
        PAGES JUMP
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
        <Link to="/login" style={{ color: '#818CF8', textDecoration: 'none', fontWeight: '500', padding: '2px 0' }}>🔓 Login</Link>
        <Link to="/signup" style={{ color: '#818CF8', textDecoration: 'none', fontWeight: '500', padding: '2px 0' }}>📝 Signup</Link>
        <Link to="/dashboard" style={{ color: '#818CF8', textDecoration: 'none', fontWeight: '500', padding: '2px 0' }}>📊 Dashboard</Link>
        <Link to="/lobby" style={{ color: '#818CF8', textDecoration: 'none', fontWeight: '500', padding: '2px 0' }}>🎥 Lobby</Link>
        <Link to="/teams" style={{ color: '#818CF8', textDecoration: 'none', fontWeight: '500', padding: '2px 0' }}>👥 Teams</Link>
        <Link to="/channels" style={{ color: '#818CF8', textDecoration: 'none', fontWeight: '500', padding: '2px 0' }}>💬 Channels</Link>
        <Link to="/meeting/dev-call" style={{ color: '#818CF8', textDecoration: 'none', fontWeight: '500', padding: '2px 0' }}>📞 Meeting Room</Link>
        <Link to="/analytics" style={{ color: '#818CF8', textDecoration: 'none', fontWeight: '500', padding: '2px 0' }}>📈 Analytics</Link>
        <Link to="/tasks" style={{ color: '#818CF8', textDecoration: 'none', fontWeight: '500', padding: '2px 0' }}>📋 Tasks</Link>
        <Link to="/settings" style={{ color: '#818CF8', textDecoration: 'none', fontWeight: '500', padding: '2px 0' }}>⚙️ Settings</Link>
        <Link to="/notifications" style={{ color: '#818CF8', textDecoration: 'none', fontWeight: '500', padding: '2px 0' }}>🔔 Notifications</Link>
        <Link to="/ai-summary" style={{ color: '#818CF8', textDecoration: 'none', fontWeight: '500', padding: '2px 0' }}>🧠 AI Summary</Link>
        <Link to="/forgot-password" style={{ color: '#818CF8', textDecoration: 'none', fontWeight: '500', padding: '2px 0' }}>🔑 Forgot Pw</Link>
        <Link to="/reset-password" style={{ color: '#818CF8', textDecoration: 'none', fontWeight: '500', padding: '2px 0' }}>🔄 Reset Pw</Link>
      </div>
    </div>
  );
};

const AuthSync = () => {
  const dispatch = useAppDispatch();
  useEffect(() => {
    const onRefresh = (e: Event) => dispatch(refreshAccessToken((e as CustomEvent<string>).detail));
    const onLogout  = () => dispatch(clearAuth());
    window.addEventListener('auth:tokenRefreshed', onRefresh);
    window.addEventListener('auth:logout', onLogout);
    return () => {
      window.removeEventListener('auth:tokenRefreshed', onRefresh);
      window.removeEventListener('auth:logout', onLogout);
    };
  }, [dispatch]);
  return null;
};

const App = () => {
  const theme = useAppSelector((s) => s.ui.theme);
  const density = useAppSelector((s) => s.ui.density);

  // Apply theme class
  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = (t: 'dark' | 'light') => {
      if (t === 'dark') {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
      }
    };

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mediaQuery.matches ? 'dark' : 'light');

      const handler = (e: MediaQueryListEvent) => {
        applyTheme(e.matches ? 'dark' : 'light');
      };
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      applyTheme(theme);
    }
  }, [theme]);

  // Apply density class
  useEffect(() => {
    const root = document.documentElement;
    if (density === 'compact') {
      root.classList.add('density-compact');
    } else {
      root.classList.remove('density-compact');
    }
  }, [density]);

  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <ErrorBoundary>
          {/* ARIA live region for screen reader announcements */}
          <div role="status" aria-live="polite" aria-atomic="true" className="sr-only" id="a11y-announcer" />
          <AuthSync />
          <AppRoutes />
          <DevNavigator />
        </ErrorBoundary>
        <Toaster
          position="top-right"
          gutter={8}
          containerStyle={{ top: 16, right: 16 }}
          toastOptions={{
            duration: 4000,
            style: {
              background: '#141420',
              color: '#F1F5F9',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              fontSize: '0.8125rem',
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
              fontWeight: '500',
              padding: '10px 14px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
              maxWidth: '360px',
              lineHeight: '1.45',
            },
            success: {
              iconTheme: { primary: '#10B981', secondary: '#fff' },
              style: {
                background: '#141420',
                border: '1px solid rgba(16,185,129,0.2)',
              },
            },
            error: {
              iconTheme: { primary: '#EF4444', secondary: '#fff' },
              style: {
                background: '#141420',
                border: '1px solid rgba(239,68,68,0.2)',
              },
            },
            loading: {
              iconTheme: { primary: '#6366F1', secondary: 'rgba(99,102,241,0.2)' },
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
