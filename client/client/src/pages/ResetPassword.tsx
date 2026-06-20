import { useState, type FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Zap, Lock, CheckCircle } from 'lucide-react';
import { ROUTES } from '../constants';
import Button from '../components/common/Button';
import axiosClient from '../api/axiosClient';

const ResetPassword = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.password || !form.confirm) { setError('All fields are required'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await axiosClient.post('/auth/reset-password', { token, password: form.password });
      setDone(true);
      setTimeout(() => navigate(ROUTES.LOGIN), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-[var(--color-primary)]/8 blur-[100px]" />
      </div>

      <div className="w-full max-w-md animate-fade-in relative z-10">
        <div className="glass rounded-2xl p-8 border border-[rgba(99,102,241,0.2)] shadow-2xl shadow-black/50">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)] flex items-center justify-center">
              <Zap size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold text-[var(--color-text)]">IntellMeet</span>
          </div>

          {done ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={28} className="text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-[var(--color-text)] mb-2">Password reset!</h2>
              <p className="text-sm text-[var(--color-text-muted)]">Redirecting you to sign in…</p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-[var(--color-text)] mb-1">Set new password</h1>
              <p className="text-sm text-[var(--color-text-muted)] mb-7">Choose a strong password for your account.</p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {(['password', 'confirm'] as const).map((key) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-[var(--color-text-muted)] block mb-1.5">
                      {key === 'password' ? 'New Password' : 'Confirm Password'}
                    </label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)]" />
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={form[key]}
                        onChange={set(key)}
                        placeholder="Min 8 characters"
                        className="input-dark pl-9 pr-10"
                      />
                      {key === 'password' && (
                        <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)]">
                          {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {error && <p className="text-xs text-[var(--color-danger)] bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}

                <Button type="submit" loading={loading} className="w-full py-2.5 mt-1">
                  Reset Password
                </Button>
              </form>

              <p className="text-center text-sm text-[var(--color-text-muted)] mt-6">
                Remember it?{' '}
                <Link to={ROUTES.LOGIN} className="text-[var(--color-primary)] hover:underline font-medium">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
