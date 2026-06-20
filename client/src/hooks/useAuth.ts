import { useAuthStore } from '../store/auth/auth.store';
import { authService } from '../api/auth.api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ROUTES } from '../utils/constants';

export const useAuth = () => {
  const { user, token, isAuthenticated, setUser, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const login = async (email: string, password: string) => {
    const res = (await authService.login({ email, password })) as unknown as { user: any; token: string };
    setUser(res.user, res.token);
    toast.success(`Welcome back, ${res.user.name}!`);
    navigate(ROUTES.DASHBOARD);
  };

  const register = async (name: string, email: string, password: string) => {
    const res = (await authService.register({ name, email, password })) as unknown as { user: any; token: string };
    setUser(res.user, res.token);
    toast.success('Account created!');
    navigate(ROUTES.DASHBOARD);
  };

  const logout = () => {
    clearAuth();
    navigate(ROUTES.LOGIN);
    toast.success('Signed out');
  };

  return { user, token, isAuthenticated, login, register, logout };
};
