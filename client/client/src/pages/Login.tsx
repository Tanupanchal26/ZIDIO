import { useState, useId, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Video, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { ROUTES, STORAGE_KEYS } from '../constants';
import { setCredentials } from '../store/slices/authSlice';
import { useAppDispatch } from '../hooks/useAppDispatch';
import axiosClient from '../api/axiosClient';
import GoogleLoginButton from '../components/common/GoogleLoginButton';

interface FieldError { email?: string; password?: string }

const validate = (email: string, password: string): FieldError => {
  const errs: FieldError = {};
  if (!email)                        errs.email    = 'Email is required';
  else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Enter a valid email';
  if (!password)                     errs.password = 'Password is required';
  return errs;
};

const Login = () => {
  const dispatch  = useAppDispatch();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = (location.state as any)?.from?.pathname || ROUTES.DASHBOARD;

  const emailId    = useId();
  const passwordId = useId();
  const errorId    = useId();

  const remembered = localStorage.getItem(STORAGE_KEYS.REMEMBER_EMAIL) ?? '';
  const [email,       setEmail]       = useState(remembered);
  const [password,    setPassword]    = useState('');
  const [rememberMe,  setRememberMe]  = useState(!!remembered);
  const [showPw,      setShowPw]      = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [errors,      setErrors]      = useState<FieldError>({});
  const [serverError, setServerError] = useState('');

  // Live validation — clear error once user starts correcting
  const onEmailChange = (v: string) => {
    setEmail(v);
    if (errors.email) setErrors(e => ({ ...e, email: undefined }));
    if (serverError)  setServerError('');
  };
  const onPasswordChange = (v: string) => {
    setPassword(v);
    if (errors.password) setErrors(e => ({ ...e, password: undefined }));
    if (serverError)     setServerError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validate(email, password);
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setServerError('');
    try {
      const res = await axiosClient.post('/auth/login', { email, password }) as any;
      if (rememberMe) localStorage.setItem(STORAGE_KEYS.REMEMBER_EMAIL, email);
      else             localStorage.removeItem(STORAGE_KEYS.REMEMBER_EMAIL);
      dispatch(setCredentials({ user: res.user, accessToken: res.accessToken ?? res.token, refreshToken: res.refreshToken }));
      toast.success(`Welcome back, ${res.user.name}!`);
      navigate(from, { replace: true });
    } catch (err: any) {
      setServerError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white font-sans text-gray-900">
      {/* Left Panel */}
      <div
        className="hidden lg:flex w-[48%] text-white p-12 flex-col justify-between relative"
        style={{ backgroundColor: '#7B61FF' }}
        aria-hidden="true"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-[14px] bg-white/20 flex items-center justify-center">
            <Video size={24} className="text-white" strokeWidth={2} />
          </div>
          <span className="font-bold text-2xl tracking-tight">IntellMeet</span>
        </div>
        <div className="flex flex-col justify-center flex-1 max-w-[500px] pl-10">
          <div className="w-fit px-3 py-1 bg-[#242424] rounded text-[13px] font-medium mb-8 border border-white/10 shadow-sm text-gray-200">
            Project preview
          </div>
          <h1 className="text-[44px] lg:text-[52px] font-bold leading-[1.1] mb-6 tracking-tight text-white">
            Everything your team needs in one place.
          </h1>
          <p className="text-[19px] text-white/90 leading-relaxed font-normal">
            Set up your workspace in minutes. No credit card required.
          </p>
        </div>
        <div className="text-sm text-white/70 font-medium">© 2026 IntellMeet</div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-[52%] flex items-center justify-center p-6 sm:p-8 bg-white">
        <div className="w-full max-w-[420px]">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-[14px] flex items-center justify-center" style={{ backgroundColor: '#7B61FF' }}>
              <Video size={20} className="text-white" strokeWidth={2} />
            </div>
            <span className="font-bold text-xl tracking-tight text-gray-900">IntellMeet</span>
          </div>

          <div className="mb-8">
            <h1 className="text-[34px] font-bold text-gray-900 mb-2 tracking-tight">Welcome back</h1>
            <p className="text-[16px] text-gray-500">Sign in to your IntellMeet workspace.</p>
          </div>

          <GoogleLoginButton label="Continue with Google" theme="light" />

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-[14px] text-gray-400">or with email</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Server error */}
          {serverError && (
            <div
              id={errorId}
              role="alert"
              aria-live="assertive"
              className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3 rounded-xl mb-5"
            >
              <span className="mt-0.5 shrink-0">⚠</span>
              <span>{serverError}</span>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            noValidate
            aria-describedby={serverError ? errorId : undefined}
            className="flex flex-col gap-4"
          >
            {/* Email */}
            <div>
              <label htmlFor={emailId} className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
                <input
                  id={emailId}
                  type="email"
                  value={email}
                  onChange={e => onEmailChange(e.target.value)}
                  placeholder="you@company.com"
                  autoComplete="email"
                  autoFocus={!remembered}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? `${emailId}-err` : undefined}
                  className={`w-full pl-10 pr-4 py-3.5 text-[15px] rounded-[14px] border transition-all outline-none shadow-sm placeholder:text-gray-400 text-gray-900 ${
                    errors.email
                      ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100 bg-red-50/30'
                      : 'border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 bg-white'
                  }`}
                />
              </div>
              {errors.email && (
                <p id={`${emailId}-err`} role="alert" className="mt-1.5 text-xs font-medium text-red-600">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor={passwordId} className="text-sm font-medium text-gray-700">
                  Password
                </label>
                <Link
                  to={ROUTES.FORGOT_PASSWORD}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                  tabIndex={0}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
                <input
                  id={passwordId}
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => onPasswordChange(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? `${passwordId}-err` : undefined}
                  className={`w-full pl-10 pr-11 py-3.5 text-[15px] rounded-[14px] border transition-all outline-none shadow-sm placeholder:text-gray-400 text-gray-900 ${
                    errors.password
                      ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100 bg-red-50/30'
                      : 'border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 bg-white'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-0.5"
                >
                  {showPw ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                </button>
              </div>
              {errors.password && (
                <p id={`${passwordId}-err`} role="alert" className="mt-1.5 text-xs font-medium text-red-600">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Remember Me */}
            <label className="flex items-center gap-3 cursor-pointer select-none group">
              <div className="relative shrink-0">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  aria-label="Remember me on this device"
                  className="sr-only"
                />
                <div
                  className={`w-5 h-5 rounded-[5px] border-2 flex items-center justify-center transition-all ${
                    rememberMe ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 bg-white group-hover:border-indigo-400'
                  }`}
                  aria-hidden="true"
                >
                  {rememberMe && (
                    <svg width="11" height="9" viewBox="0 0 11 9" fill="none" aria-hidden="true">
                      <path d="M1 4L4 7.5L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-[14px] font-medium text-gray-600 group-hover:text-gray-800 transition-colors">
                Remember me
              </span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full text-white rounded-[14px] py-4 mt-1 font-semibold text-[16px] transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center h-[54px] hover:opacity-90 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500"
              style={{ backgroundColor: '#7B61FF' }}
              aria-busy={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2.5" aria-label="Signing in…">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                  Signing in…
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="mt-7 text-center text-[15px] text-gray-500">
            Don't have an account?{' '}
            <Link to={ROUTES.SIGNUP} className="text-gray-800 font-semibold hover:text-gray-900 transition-colors underline underline-offset-2">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
