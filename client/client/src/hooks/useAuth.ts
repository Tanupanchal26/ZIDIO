/**
 * useAuth — thin selector hook over Redux auth state.
 * Single source of truth: Redux authSlice.
 *
 * Previously used Zustand useAuthStore — that store is now deleted.
 */
import { useAppSelector, useAppDispatch } from './useAppDispatch';
import { authService } from '../services/auth.service';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ROUTES } from '../constants';
import { setCredentials, clearAuth } from '../store/slices/authSlice';

export const useAuth = () => {
  const user            = useAppSelector((s) => s.auth.user);
  const accessToken     = useAppSelector((s) => s.auth.accessToken);
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const login = async (email: string, password: string) => {
    const res = await authService.login({ email, password }) as any;
    dispatch(setCredentials({ user: res.user, accessToken: res.accessToken ?? res.token, refreshToken: res.refreshToken }));
    toast.success(`Welcome back, ${res.user.name}!`);
    navigate(ROUTES.DASHBOARD);
  };

  const register = async (name: string, email: string, password: string) => {
    await authService.register({ name, email, password });
    toast.success('Account created successfully. Please log in.');
    navigate(ROUTES.HOME);
  };

  const logout = () => {
    dispatch(clearAuth());
    localStorage.removeItem('im_user');
    localStorage.removeItem('im_access_token');
    toast.success('Signed out');
    navigate(ROUTES.HOME);
  };

  return { user, accessToken, isAuthenticated, login, register, logout };
};
