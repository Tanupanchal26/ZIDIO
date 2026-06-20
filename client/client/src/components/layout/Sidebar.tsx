import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Video, Brain, CheckSquare, BarChart2,
  Settings, LogOut, Users, Bell, Hash, Zap, ChevronLeft,
} from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../hooks/useAppDispatch';
import { setMobileSidebar } from '../../store/slices/uiSlice';
import { useLogout } from '../../hooks/useLogout';
import { ROUTES } from '../../constants';
import { clsx } from 'clsx';

const NAV_PRIMARY = [
  { label: 'Dashboard', icon: LayoutDashboard, to: ROUTES.DASHBOARD },
  { label: 'Meetings',  icon: Video,           to: ROUTES.LOBBY },
  { label: 'Teams',     icon: Users,           to: ROUTES.TEAMS },
  { label: 'Channels',  icon: Hash,            to: '/teams' },
];

const NAV_TOOLS = [
  { label: 'AI Summary',    icon: Brain,       to: ROUTES.AI_SUMMARY },
  { label: 'Tasks',         icon: CheckSquare, to: ROUTES.TASKS },
  { label: 'Analytics',     icon: BarChart2,   to: ROUTES.ANALYTICS },
  { label: 'Notifications', icon: Bell,        to: ROUTES.NOTIFICATIONS },
];

interface NavItemProps {
  label: string;
  icon: React.ElementType;
  to: string;
  collapsed?: boolean;
}

const NavItem = ({ label, icon: Icon, to, collapsed }: NavItemProps) => (
  <NavLink
    to={to}
    title={collapsed ? label : undefined}
    aria-label={collapsed ? label : undefined}
    className={({ isActive }) =>
      clsx(
        'nav-item group relative flex items-center gap-2.5 rounded-lg text-sm font-medium',
        'transition-all duration-150 outline-none select-none active:scale-[0.98]',
        collapsed ? 'h-9 w-9 justify-center mx-auto' : 'py-2 px-2.5',
        isActive
          ? 'bg-blue-50 text-blue-700 font-semibold'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
      )
    }
  >
    {({ isActive }) => (
      <>
        {isActive && !collapsed && (
          <motion.span
            layoutId="sidebarPill"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-blue-600"
            aria-hidden="true"
          />
        )}
        <span
          className={clsx(
            'flex items-center justify-center shrink-0 transition-colors rounded-md',
            collapsed ? 'w-7 h-7' : 'w-7 h-7',
            isActive ? 'bg-blue-100/50 text-blue-600' : 'group-hover:bg-white group-hover:shadow-sm text-slate-400 group-hover:text-slate-600'
          )}
        >
          <Icon size={15} aria-hidden="true" />
        </span>
        {!collapsed && <span className="truncate leading-none">{label}</span>}
      </>
    )}
  </NavLink>
);

const SectionLabel = ({ children, collapsed }: { children: React.ReactNode; collapsed?: boolean }) =>
  collapsed ? (
    <div className="h-px bg-slate-100 my-1.5" />
  ) : (
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2.5 mb-1 mt-3 select-none">
      {children}
    </p>
  );

const Sidebar = () => {
  const mobileSidebarOpen = useAppSelector((s) => s.ui.mobileSidebarOpen);
  const user              = useAppSelector((s) => s.auth.user);
  const dispatch          = useAppDispatch();
  const logout            = useLogout();
  const navigate          = useNavigate();

  const handleLogout = () => {
    dispatch(setMobileSidebar(false));
    logout();
  };

  const initial = user?.name?.charAt(0).toUpperCase() ?? 'U';
  const name    = user?.name ?? 'User';
  const email   = user?.email ?? '';

  return (
    <aside
      className={clsx(
        'flex flex-col bg-white border-r border-slate-200 transition-all duration-300 h-screen shrink-0',
        mobileSidebarOpen ? 'w-60 fixed inset-y-0 left-0 z-40' : 'w-[240px] hidden md:flex sticky top-0'
      )}
      aria-label="Main navigation"
    >
      {/* ── Logo ── */}
      <div className="flex items-center gap-2.5 px-4 shrink-0 border-b border-slate-100 h-14">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-blue-600 shadow-sm shadow-blue-600/20">
          <Zap size={14} className="text-white" strokeWidth={2.5} aria-hidden="true" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-bold text-slate-900 text-sm tracking-tight">IntellMeet</span>
          <span className="text-[10px] font-semibold text-blue-600 tracking-wide">AI Platform</span>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav
        className="flex flex-col gap-1 px-2 pt-3 pb-3 flex-1 overflow-y-auto overflow-x-hidden"
        aria-label="Primary"
      >
        <div className="flex flex-col gap-0.5">
          <SectionLabel>Workspace</SectionLabel>
          {NAV_PRIMARY.map((item) => <NavItem key={item.label} {...item} />)}
        </div>

        <div className="h-px bg-slate-100 mx-2 my-2" />

        <div className="flex flex-col gap-0.5">
          <SectionLabel>Tools</SectionLabel>
          {NAV_TOOLS.map((item) => <NavItem key={item.label} {...item} />)}
        </div>
      </nav>

      {/* ── Bottom ── */}
      <div className="border-t border-slate-100 px-2 pt-2 pb-3 flex flex-col gap-0.5 shrink-0">
        <NavItem label="Settings" icon={Settings} to={ROUTES.SETTINGS} />

        <button
          onClick={handleLogout}
          className="group flex items-center py-2 gap-3 px-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all w-full text-left active:scale-[0.98]"
          aria-label="Sign out of IntellMeet"
        >
          <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-white group-hover:text-red-600 group-hover:shadow-sm text-slate-400 transition-colors">
            <LogOut size={15} aria-hidden="true" />
          </span>
          Sign Out
        </button>

        {/* User profile card */}
        <button
          onClick={() => navigate(`${ROUTES.SETTINGS}?tab=profile`)}
          className="flex items-center gap-2.5 mt-2 px-2.5 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 hover:shadow-sm border border-slate-200/60 transition-all w-full text-left active:scale-[0.98]"
          aria-label={`Profile: ${name}`}
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold bg-blue-600 shadow-sm">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-900 truncate leading-tight">{name}</p>
            <p className="text-[11px] text-slate-500 truncate leading-tight mt-0.5">{email}</p>
          </div>
          <span
            className="w-2 h-2 rounded-full bg-emerald-500 border-2 border-slate-50 shrink-0 shadow-sm"
            title="Online"
            aria-label="Status: Online"
          />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
