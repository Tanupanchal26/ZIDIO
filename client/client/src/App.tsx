import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { useAppDispatch } from './hooks/useAppDispatch';
import { clearAuth, refreshAccessToken } from './store/slices/authSlice';
import AppRoutes from './routes/index';
import ErrorBoundary from './components/common/ErrorBoundary';
import './styles/global.css';

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30000 } } });

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

const App = () => (
  <QueryClientProvider client={qc}>
    <BrowserRouter>
      <ErrorBoundary>
        {/* ARIA live region for screen reader announcements */}
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only" id="a11y-announcer" />
        <AuthSync />
        <AppRoutes />
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

export default App;
