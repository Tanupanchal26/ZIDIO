import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Panel = 'chat' | 'participants' | 'ai' | 'notes';

interface UIState {
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  activeMeetingPanel: Panel;
  theme: 'dark';
  toggleSidebar: () => void;
  setMobileSidebar: (v: boolean) => void;
  setActiveMeetingPanel: (p: Panel) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      mobileSidebarOpen: false,
      activeMeetingPanel: 'chat',
      theme: 'dark',
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setMobileSidebar: (v) => set({ mobileSidebarOpen: v }),
      setActiveMeetingPanel: (p) => set({ activeMeetingPanel: p }),
    }),
    { name: 'ui-store', partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed }) }
  )
);
