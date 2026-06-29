import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { setCredentials } from '../store/auth/auth.slice';
import toast from 'react-hot-toast';
import { ROUTES, STORAGE_KEYS } from '../constants';

const GoogleAuthSuccess = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    // Read token from short-lived cookie (more secure than URL param)
    const getCookie = (name: string) => {
      const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
      return match ? decodeURIComponent(match[2]) : null;
    };

    const token = getCookie('__oauth_token') || params.get('token');

    // Clear the cookie immediately after reading
    document.cookie = '__oauth_token=; Max-Age=0; path=/';

    if (!token) {
      toast.error('Google sign-in failed.');
      navigate(ROUTES.LOGIN, { replace: true });
      return;
    }

    const user = {
      id:         params.get('id')         || '',
      name:       params.get('name')       || '',
      email:      params.get('email')      || '',
      avatar:     params.get('avatar')     || '',
      role:       params.get('role')       || 'member',
      isVerified: params.get('isVerified') === 'true',
    };

    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
    localStorage.setItem('im_user', JSON.stringify(user));
    dispatch(setCredentials({ user, accessToken: token }));
    toast.success(`Welcome, ${user.name || 'back'}! 🎉`);
    navigate(ROUTES.DASHBOARD, { replace: true });
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#07070C] gap-4">
      <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      <p className="text-sm text-[#64748B]">Signing you in with Google...</p>
    </div>
  );
};

export default GoogleAuthSuccess;
