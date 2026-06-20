import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { STORAGE_KEYS } from '../../constants';

export type Theme = 'dark' | 'light' | 'system';
type Panel = 'chat' | 'participants' | 'ai' | 'notes';

interface UIState {
  theme: Theme;
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  activeMeetingPanel: Panel;
  globalLoading: boolean;
}

/** Resolves 'system' to actual dark/light and updates <html> class */
export function applyTheme(theme: Theme): void {
  const resolved =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  document.documentElement.classList.toggle('light', resolved === 'light');
}

const storedTheme = (localStorage.getItem(STORAGE_KEYS.THEME) as Theme) || 'dark';

const initialState: UIState = {
  theme: storedTheme,
  sidebarCollapsed: localStorage.getItem(STORAGE_KEYS.SIDEBAR) === 'true',
  mobileSidebarOpen: false,
  activeMeetingPanel: 'chat',
  globalLoading: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme(state, { payload }: PayloadAction<Theme>) {
      state.theme = payload;
      localStorage.setItem(STORAGE_KEYS.THEME, payload);
      applyTheme(payload);
    },
    toggleTheme(state) {
      const next: Theme = state.theme === 'dark' ? 'light' : 'dark';
      state.theme = next;
      localStorage.setItem(STORAGE_KEYS.THEME, next);
      applyTheme(next);
    },
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
      localStorage.setItem(STORAGE_KEYS.SIDEBAR, String(state.sidebarCollapsed));
    },
    setMobileSidebar(state, { payload }: PayloadAction<boolean>) {
      state.mobileSidebarOpen = payload;
    },
    setActiveMeetingPanel(state, { payload }: PayloadAction<Panel>) {
      state.activeMeetingPanel = payload;
    },
    setGlobalLoading(state, { payload }: PayloadAction<boolean>) {
      state.globalLoading = payload;
    },
  },
});

export const {
  setTheme, toggleTheme, toggleSidebar,
  setMobileSidebar, setActiveMeetingPanel, setGlobalLoading,
} = uiSlice.actions;
export default uiSlice.reducer;
