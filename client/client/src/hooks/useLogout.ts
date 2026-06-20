/**
 * useLogout — single reusable logout hook.
 *
 * Replaces the three divergent logout implementations that previously existed in:
 *   - components/layout/Sidebar.tsx
 *   - pages/Settings.tsx
 *   - pages/Home.tsx (Navbar)
 *
 * Usage:
 *   const logout = useLogout();
 *   <button onClick={logout}>Sign Out</button>
 */
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAppDispatch } from './useAppDispatch';
import { clearAuth } from '../store/slices/authSlice';
import { authService } from '../services/auth.service';
import { ROUTES, STORAGE_KEYS } from '../constants';

export const useLogout = () => {
  const dispatch  = useAppDispatch();
  const navigate  = useNavigate();

  return useCallback(async () => {
    try {
      await authService.logout().catch(() => {
        // Swallow network errors — we always clear local state
      });
    } finally {
      dispatch(clearAuth());
      // clearAuth removes im_access_token, im_refresh_token, im_user.
      // Also clear any legacy keys that may have been written by old code.
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
      sessionStorage.clear();
      toast.success('Signed out successfully');
      navigate(ROUTES.HOME, { replace: true });
    }
  }, [dispatch, navigate]);
};
