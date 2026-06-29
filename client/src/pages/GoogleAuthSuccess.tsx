import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { setCredentials, type User } from '../store/auth/auth.slice';
import toast from 'react-hot-toast';
import { ROUTES, STORAGE_KEYS } from '../constants';

const OAUTH_COOKIE_NAME = '__oauth_token';

const readCookie = (name: string): string | null => {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
};

const clearCookie = (name: string): void => {
  document.cookie = `${name}=; Max-Age=0; path=/`;
};

const GoogleAuthSuccess = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const accessToken = readCookie(OAUTH_COOKIE_NAME) ?? params.get('token');
    clearCookie(OAUTH_COOKIE_NAME);

    if (!accessToken) {
      toast.error('Google sign-in failed.');
      navigate(ROUTES.LOGIN, { replace: true });
      return;
    }

    const user: User = {
      id:         params.get('id')         ?? '',
      name:       params.get('name')       ?? '',
      email:      params.get('email')      ?? '',
      avatar:     params.get('avatar')     ?? '',
      role:       params.get('role')       ?? 'member',
      isVerified: params.get('isVerified') === 'true',
    };

    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    dispatch(setCredentials({ user, accessToken }));
    toast.success(`Welcome, ${user.name || 'back'}! 🎉`);
    navigate(ROUTES.DASHBOARD, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#07070C] gap-4">
      <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      <p className="text-sm text-[#64748B]">Signing you in with Google...</p>
    </div>
  );
};

export default GoogleAuthSuccess;
