import { useRef, useState } from 'react';
import { Search, Menu, Plus, Video, Command } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../hooks/useAppDispatch';
import { setMobileSidebar } from '../../store/slices/uiSlice';
import NotificationCenter from '../common/NotificationCenter';
import { ROUTES } from '../../constants';

interface Props { title?: string; }

const TopBar = ({ title }: Props) => {
  const user          = useAppSelector((s) => s.auth.user);
  const dispatch      = useAppDispatch();
  const navigate      = useNavigate();
  const initial       = user?.name?.charAt(0).toUpperCase() ?? 'U';
  const inputRef      = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  return (
    <header
      role="banner"
      className="flex items-center h-14 bg-[var(--color-surface)] border-b border-[var(--color-border)] px-4 sm:px-6 shrink-0 gap-4 w-full"
    >
      {/* Left: mobile toggle + page title */}
      <div className="flex items-center gap-3 shrink-0 min-w-0">
        <button
          onClick={() => dispatch(setMobileSidebar(true))}
          className="md:hidden p-2 -ml-1 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors active:scale-95"
          aria-label="Open navigation menu"
          aria-haspopup="true"
        >
          <Menu size={18} aria-hidden="true" />
        </button>

        {title && (
          <h1 className="text-[15px] font-semibold text-slate-900 tracking-tight hidden sm:block truncate max-w-[180px]">
            {title}
          </h1>
        )}
      </div>

      {/* Center: search */}
      <div className="flex-1 flex justify-center max-w-sm mx-auto">
        <div className="relative w-full transition-all duration-200 group">
          <Search
            size={15}
            className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 pointer-events-none ${focused ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-500'}`}
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            placeholder="Search meetings, tasks, people…"
            aria-label="Search"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className={`
              w-full h-9 pl-10 pr-12 rounded-full text-sm font-medium
              bg-slate-100 border transition-all duration-200 outline-none
              text-slate-900 placeholder:text-slate-400
              ${focused
                ? 'bg-white border-blue-500 shadow-[0_0_0_3px_rgba(37,99,235,0.12)]'
                : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
              }
            `}
          />
          <div
            className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none"
            aria-hidden="true"
          >
            {focused ? (
              <kbd className="flex items-center text-[10px] text-slate-400 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 font-bold uppercase tracking-wider">
                ESC
              </kbd>
            ) : (
              <kbd className="hidden sm:flex items-center text-xs text-slate-400 font-medium bg-white/50 border border-slate-200/50 rounded px-1.5 py-0.5 shadow-sm">
                ⌘K
              </kbd>
            )}
          </div>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0" role="toolbar" aria-label="Header actions">
        <NotificationCenter />

        <button
          onClick={() => navigate(ROUTES.SETTINGS + '?tab=profile')}
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-bold bg-blue-600 shadow-sm transition-all hover:ring-4 hover:ring-blue-100 active:scale-95"
          aria-label={`View profile for ${user?.name ?? 'User'}`}
        >
          <span aria-hidden="true">{initial}</span>
        </button>

        <button
          onClick={() => navigate(ROUTES.LOBBY)}
          className="hidden sm:flex items-center gap-2 text-sm font-semibold text-white bg-blue-600 rounded-xl px-5 h-10 shadow-sm shadow-blue-600/20 transition-all hover:bg-blue-700 hover:shadow-blue-600/30 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-100"
          aria-label="Start a new meeting"
        >
          <Plus size={16} strokeWidth={2.5} aria-hidden="true" />
          New Meeting
        </button>

        <button
          onClick={() => navigate(ROUTES.LOBBY)}
          className="sm:hidden p-2 rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors active:scale-95"
          aria-label="New meeting"
        >
          <Video size={18} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
};

export default TopBar;
