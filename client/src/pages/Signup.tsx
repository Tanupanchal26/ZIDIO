import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Video } from 'lucide-react';
import toast from 'react-hot-toast';
import { ROUTES } from '../constants';
import { setCredentials } from '../store/auth/auth.slice';
import { useAppDispatch } from '../hooks/useAppDispatch';
import axiosClient from '../api/axios';
import GoogleLoginButton from '../components/common/GoogleLoginButton';
import Logo from '../components/common/Logo';

const getStrength = (pw: string) => {
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(4, score);
};

const STRENGTH_LABEL = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLOR = ['', 'text-red-500', 'text-amber-500', 'text-blue-500', 'text-emerald-500'];

const Signup = () => {
  const dispatch  = useAppDispatch();
  const navigate  = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading,  setLoading]  = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const strength     = getStrength(form.password);
  const strengthLabel = form.password.length > 0 ? STRENGTH_LABEL[strength] : '';
  const strengthColor = form.password.length > 0 ? STRENGTH_COLOR[strength] : '';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { toast.error('Please fill in all fields.'); return; }
    if (form.password !== form.confirm) { toast.error('Passwords do not match.'); return; }
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters.'); return; }
    
    setLoading(true);
    try {
      const res = await axiosClient.post('/auth/signup', { name: form.name, email: form.email, password: form.password, role: 'member' }) as any;
      dispatch(setCredentials({ user: res.user, accessToken: res.accessToken ?? res.token, refreshToken: res.refreshToken }));
      toast.success(`Welcome, ${res.user.name}!`);
      navigate(ROUTES.DASHBOARD);
    } catch (err: any) {
      toast.error(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        
        {/* Left Pane: Form */}
        <div className="auth-left-pane">
          <div className="auth-form-wrapper compact">
            {/* Logo */}
            <Link to="/" className="auth-logo">
              <div className="auth-logo-icon">
                <Logo width={20} height={8} className="text-white" />
              </div>
              <span className="auth-logo-text">IntellMeet</span>
            </Link>

            {/* Form Content */}
            <div className="overflow-y-auto pr-1 flex flex-col gap-3.5 scrollbar-thin">
              <div className="auth-header-text">
                <h2 className="auth-title">Create account</h2>
                <p className="auth-subtitle">
                  Start your free workspace today.
                </p>
              </div>

              <GoogleLoginButton label="Continue with Google" theme="light" className="h-10 mb-0" />

              <div className="auth-divider">
                <div className="auth-divider-line"></div>
                <span className="auth-divider-text">or with email</span>
                <div className="auth-divider-line"></div>
              </div>

              <form onSubmit={handleSubmit} className="auth-form compact">
                <div className="auth-input-group">
                  <label className="auth-label">Full Name</label>
                  <input 
                    type="text" 
                    placeholder="John Doe" 
                    value={form.name}
                    onChange={set('name')}
                    className="auth-input auth-input-sm" 
                    required
                  />
                </div>

                <div className="auth-input-group">
                  <label className="auth-label">Work Email</label>
                  <input 
                    type="email" 
                    placeholder="you@company.com" 
                    value={form.email}
                    onChange={set('email')}
                    className="auth-input auth-input-sm" 
                    required
                  />
                </div>

                <div className="auth-input-group">
                  <label className="auth-label">Password</label>
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    value={form.password}
                    onChange={set('password')}
                    className="auth-input auth-input-sm" 
                    required
                  />
                  {/* Password strength meter */}
                  {form.password.length > 0 && (
                    <div className="auth-strength-meter">
                      <div className="auth-strength-bars">
                        {[1, 2, 3, 4].map(i => (
                          <div
                            key={i}
                            className="auth-strength-bar"
                            style={{
                              backgroundColor: i <= strength
                                ? strength === 1 ? '#EF4444'
                                  : strength === 2 ? '#F59E0B'
                                  : strength === 3 ? '#6366F1'
                                  : '#10B981'
                                : 'rgba(66, 67, 65, 0.08)',
                            }}
                          />
                        ))}
                      </div>
                      <p className={`auth-strength-text ${strengthColor}`}>{strengthLabel} password</p>
                    </div>
                  )}
                </div>

                <div className="auth-input-group">
                  <label className="auth-label">Confirm Password</label>
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    value={form.confirm}
                    onChange={set('confirm')}
                    className="auth-input auth-input-sm" 
                    required
                  />
                  {form.confirm && form.password !== form.confirm && (
                    <p className="auth-alert-error mt-1 text-[10px] font-semibold px-2 py-1.5 rounded-md border border-red-500/10">Passwords do not match</p>
                  )}
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="auth-submit-btn auth-submit-btn-sm"
                >
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Create account'}
                </button>
              </form>
            </div>

            {/* Footer */}
            <div className="auth-footer">
              Already have an account? <Link to={ROUTES.LOGIN} className="auth-footer-link">Sign in</Link>
              <p className="auth-copyright">All rights reserved © 2026 IntellMeet</p>
            </div>
          </div>
        </div>

        {/* Right Pane: Image & Overlay */}
        <div 
          className="auth-right-pane"
          style={{ 
            backgroundImage: "url('/auth_illustration.png')", 
            backgroundColor: '#ffffff', 
            backgroundSize: 'contain', 
            backgroundPosition: 'center', 
            backgroundRepeat: 'no-repeat' 
          }}
        >
          {/* Glass Card Overlay */}
          <div className="auth-glass-card">
            <div className="auth-glass-icon-wrapper">
              <Video size={14} className="text-white" />
            </div>
            <h3 className="auth-glass-title">
              Meet Smarter. Work Faster. Grow Together.
            </h3>
            <p className="auth-glass-desc">
              Transform every conversation into actionable intelligence with real-time AI transcription, smart summaries, and automatic action-item extraction.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Signup;
