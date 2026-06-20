import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import { applyTheme } from './store/slices/uiSlice';
import type { Theme } from './store/slices/uiSlice';
import App from './App';

// Apply theme before first paint to avoid flash
const savedTheme = (localStorage.getItem('im_theme') as Theme) || 'dark';
applyTheme(savedTheme);

// Listen for OS theme changes when 'system' is selected
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (store.getState().ui.theme === 'system') applyTheme('system');
});

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>
);
