import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import Sidebar from './Sidebar';
import TopBar from './Navbar';
import { useAppSelector, useAppDispatch } from '../../hooks/useAppDispatch';
import { setMobileSidebar } from '../../store/slices/uiSlice';
import { motion as m } from '../../design-system/motion';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':     'Dashboard',
  '/lobby':         'Meetings',
  '/analytics':     'Analytics',
  '/tasks':         'Task Board',
  '/settings':      'Settings',
  '/profile':       'Profile',
  '/ai-summary':    'AI Summary',
  '/teams':         'Teams',
  '/notifications': 'Notifications',
  '/channels':      'Channels',
};

const AppLayout = () => {
  // ── ALL hooks must be called unconditionally at the top ──────────────────
  const mobileSidebarOpen = useAppSelector((s) => s.ui.mobileSidebarOpen);
  const dispatch          = useAppDispatch();
  const { pathname }      = useLocation();

  const title = PAGE_TITLES[pathname] ?? '';

  /* Close mobile sidebar on route change */
  useEffect(() => {
    dispatch(setMobileSidebar(false));
  }, [pathname, dispatch]);

  /* Announce page title to screen readers on navigation */
  useEffect(() => {
    const announcer = document.getElementById('a11y-announcer');
    if (announcer && title) announcer.textContent = `${title} — IntellMeet`;
  }, [title]);
  // ────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-[var(--color-bg-secondary)] overflow-hidden text-[var(--color-text)] font-sans">
      {/* WCAG 2.2 §2.4.1 — Bypass Blocks */}
      <a href="#main-content" className="skip-link">Skip to main content</a>

      {/* Mobile backdrop */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <motion.div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm md:hidden z-30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => dispatch(setMobileSidebar(false))}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[var(--color-bg-secondary)] relative z-10">
        <TopBar title={title} />

        {/* WCAG §2.4.1 landmark — id target for skip link */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto overflow-x-hidden"
          tabIndex={-1}
          aria-label={title || 'Page content'}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={m.transition.page}
              className="min-h-full p-4 sm:p-6 lg:p-8"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
