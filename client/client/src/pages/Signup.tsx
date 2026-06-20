import { useState, useId } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Video, Eye, EyeOff, User, Mail, Lock, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { ROUTES } from '../constants';
import axiosClient from '../api/axiosClient';
import GoogleLoginButton from '../components/common/GoogleLoginButton';

// ── Password strength ────────────────────────────────────────────────────────
const getStrength = (pw: string): number => {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8)  s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(4, s);
};

const STRENGTH_META = [
  { label: '',       color: '' },
  { label: 'Weak',   color: '#EF4444' },
  { label: 'Fair',   color: '#F59E0B' },
  { label: 'Good',   color: '#3B82F6' },
  { label: 'Strong', color: '#10B981' },
];

interface FieldErrors {
  name?: string; email?: string; password?: string; confirm?: string; terms?: string;
}

const validate = (f: { name: string; email: string; password: string; confirm: string; terms: boolean }): FieldErrors => {
  const e: FieldErrors = {};
  if (!f.name.trim())                  e.name     = 'Full name is required';
  else if (f.name.trim().length < 2)   e.name     = 'Name must be at least 2 characters';
  if (!f.email)                        e.email    = 'Email is required';
  else if (!/\S+@\S+\.\S+/.test(f.email)) e.email = 'Enter a valid email';
  if (!f.password)                     e.password = 'Password is required';
  else if (f.password.length < 8)      e.password = 'Password must be at least 8 characters';
  else if (!/[A-Z]/.test(f.password) || !/[a-z]/.test(f.password) || !/[0-9]/.test(f.password))
                                       e.password = 'Include uppercase, lowercase and a number';
  if (!f.confirm)                      e.confirm  = 'Please confirm your password';
  else if (f.confirm !== f.password)   e.confirm  = 'Passwords do not match';
  if (!f.terms)                        e.terms    = 'You must accept the terms to continue';
  return e;
};

const Input = ({
  id, label, type, value, onChange, placeholder, autoComplete, icon: Icon,
  error, showToggle, onToggle, showValue,
}: {
  id: string; label: string; type: string; value: string;
  onChange: (v: string) => void; placeholder: string; autoComplete: string;
  icon: React.ElementType; error?: string; showToggle?: boolean; onToggle?: () => void; showValue?: boolean;
}) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
    <div className="relative">
      <Icon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
      <input
        id={id}
        type={showToggle ? (showValue ? 'text' : 'password') : type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : undefined}
        className={`w-full pl-10 ${showToggle ? 'pr-11' : 'pr-4'} py-3.5 text-[15px] rounded-[14px] border transition-all outline-none shadow-sm placeholder:text-gray-400 text-gray-900 ${
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100 bg-red-50/30'
            : 'border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 bg-white'
        }`}
      />
      {showToggle && (
        <button type="button" onClick={onToggle}
          aria-label={showValue ? 'Hide password' : 'Show password'}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-0.5"
        >
          {showValue ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
        </button>
      )}
    </div>
    {error && <p id={`${id}-err`} role="alert" className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}
  </div>
);

const Signup = () => {
  const navigate  = useNavigate();

  const nameId    = useId();
  const emailId   = useId();
  const pwId      = useId();
  const cfmId     = useId();
  const termsId   = useId();
  const serverErrId = useId();

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', terms: false });
  const [showPw,  setShowPw]  = useState(false);
  const [showCfm, setShowCfm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors,  setErrors]  = useState<FieldErrors>({});
  const [serverError, setServerError] = useState('');

  const set = (k: keyof typeof form) => (v: string | boolean) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: undefined }));
    if (serverError) setServerError('');
  };

  const strength     = getStrength(form.password);
  const strengthMeta = form.password ? STRENGTH_META[strength] : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setServerError('');
    try {
      await axiosClient.post('/auth/signup', {
        name: form.name.trim(), email: form.email, password: form.password,
      });
      toast.success('Account created successfully. Please log in.');
      navigate(ROUTES.HOME);
    } catch (err: any) {
      setServerError(err.message || 'Registration failed. Please try again.');
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
          <h1 className="text-[44px] lg:text-[52px] font-bold leading-[1.1] mb-6 tracking-tight">
            Everything your team needs in one place.
          </h1>
          <p className="text-[19px] text-white/90 leading-relaxed font-normal">
            Set up your workspace in minutes. No credit card required.
          </p>
        </div>
        <div className="text-sm text-white/70 font-medium">© 2026 IntellMeet</div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-[52%] flex items-start justify-center p-6 sm:p-8 bg-white overflow-y-auto">
        <div className="w-full max-w-[420px] py-10">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-[14px] flex items-center justify-center" style={{ backgroundColor: '#7B61FF' }}>
              <Video size={20} className="text-white" strokeWidth={2} />
            </div>
            <span className="font-bold text-xl tracking-tight text-gray-900">IntellMeet</span>
          </div>

          <div className="mb-8">
            <h1 className="text-[34px] font-bold text-gray-900 mb-2 tracking-tight">Create account</h1>
            <p className="text-[16px] text-gray-500">Start your free workspace today.</p>
          </div>

          <GoogleLoginButton label="Continue with Google" theme="light" />

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-[14px] text-gray-400">or with email</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {serverError && (
            <div id={serverErrId} role="alert" aria-live="assertive"
              className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3 rounded-xl mb-5">
              <span className="mt-0.5 shrink-0">⚠</span>
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate aria-describedby={serverError ? serverErrId : undefined} className="flex flex-col gap-4">

            <Input id={nameId} label="Full name" type="text" value={form.name} onChange={v => set('name')(v)}
              placeholder="Alex Johnson" autoComplete="name" icon={User} error={errors.name} />

            <Input id={emailId} label="Work email" type="email" value={form.email} onChange={v => set('email')(v)}
              placeholder="you@company.com" autoComplete="email" icon={Mail} error={errors.email} />

            {/* Password with strength meter */}
            <div>
              <label htmlFor={pwId} className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
                <input
                  id={pwId}
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => { set('password')(e.target.value); }}
                  placeholder="Min 8 characters"
                  autoComplete="new-password"
                  aria-invalid={!!errors.password}
                  aria-describedby={`${pwId}-strength${errors.password ? ` ${pwId}-err` : ''}`}
                  className={`w-full pl-10 pr-11 py-3.5 text-[15px] rounded-[14px] border transition-all outline-none shadow-sm placeholder:text-gray-400 text-gray-900 ${
                    errors.password
                      ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100 bg-red-50/30'
                      : 'border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 bg-white'
                  }`}
                />
                <button type="button" onClick={() => setShowPw(v => !v)} aria-label={showPw ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-0.5">
                  {showPw ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                </button>
              </div>
              {form.password && (
                <div className="mt-2.5" id={`${pwId}-strength`} aria-live="polite">
                  <div className="flex gap-1.5 mb-1.5" aria-hidden="true">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="flex-1 h-[3px] rounded-full transition-all duration-300"
                        style={{ background: i <= strength ? strengthMeta!.color : '#E5E7EB' }} />
                    ))}
                  </div>
                  <p className="text-[12px] font-semibold" style={{ color: strengthMeta!.color }}>
                    {strengthMeta!.label} password
                  </p>
                </div>
              )}
              {errors.password && <p id={`${pwId}-err`} role="alert" className="mt-1.5 text-xs font-medium text-red-600">{errors.password}</p>}
            </div>

            {/* Confirm password */}
            <div>
              <Input id={cfmId} label="Confirm password" type="password" value={form.confirm} onChange={v => set('confirm')(v)}
                placeholder="Repeat password" autoComplete="new-password" icon={Lock}
                error={errors.confirm} showToggle onToggle={() => setShowCfm(v => !v)} showValue={showCfm} />
              {!errors.confirm && form.confirm && form.confirm === form.password && (
                <p className="mt-1.5 text-xs font-semibold text-emerald-600 flex items-center gap-1">
                  <Check size={12} aria-hidden="true" /> Passwords match
                </p>
              )}
            </div>

            {/* Terms checkbox */}
            <div>
              <label htmlFor={termsId} className="flex items-start gap-3 cursor-pointer group select-none">
                <div className="relative shrink-0 mt-0.5">
                  <input
                    id={termsId}
                    type="checkbox"
                    checked={form.terms}
                    onChange={e => set('terms')(e.target.checked)}
                    aria-invalid={!!errors.terms}
                    aria-describedby={errors.terms ? `${termsId}-err` : undefined}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded-[5px] border-2 flex items-center justify-center transition-all ${
                    errors.terms ? 'border-red-400 bg-red-50/50' :
                    form.terms ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 bg-white group-hover:border-indigo-400'
                  }`} aria-hidden="true">
                    {form.terms && (
                      <svg width="11" height="9" viewBox="0 0 11 9" fill="none" aria-hidden="true">
                        <path d="M1 4L4 7.5L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-[14px] text-gray-600 leading-snug">
                  I agree to the{' '}
                  <a href="#" onClick={e => e.stopPropagation()} className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors underline underline-offset-2">Terms of Service</a>
                  {' '}and{' '}
                  <a href="#" onClick={e => e.stopPropagation()} className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors underline underline-offset-2">Privacy Policy</a>
                </span>
              </label>
              {errors.terms && <p id={`${termsId}-err`} role="alert" className="mt-1.5 text-xs font-medium text-red-600">{errors.terms}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full text-white rounded-[14px] py-4 mt-1 font-semibold text-[16px] transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center h-[54px] hover:opacity-90 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500"
              style={{ backgroundColor: '#7B61FF' }}
              aria-busy={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2.5" aria-label="Creating account…">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                  Creating account…
                </span>
              ) : 'Create account'}
            </button>
          </form>

          <p className="mt-7 text-center text-[15px] text-gray-500">
            Already have an account?{' '}
            <Link to={ROUTES.LOGIN} className="text-gray-800 font-semibold hover:text-gray-900 transition-colors underline underline-offset-2">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
