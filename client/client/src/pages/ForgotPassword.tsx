import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Zap, ArrowLeft, CheckCircle, ArrowRight, Video, Brain, CheckSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { ROUTES } from '../constants';
import Button from '../components/common/Button';
import axiosClient from '../api/axiosClient';

const BrandPanel = () => (
  <div className="hidden lg:flex flex-col justify-between p-10 h-full relative overflow-hidden">
    <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #0B0B16 0%, #0A0D1C 100%)' }} />
    <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(99,102,241,0.1) 0%, transparent 70%)' }} />
    <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'radial-gradient(circle, #6366F1 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

    <div className="relative z-10">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center shadow-[0_4px_16px_rgba(99,102,241,0.3)]">
          <Zap size={16} className="text-white" strokeWidth={2.5} />
        </div>
        <span className="font-bold text-[#F1F5F9] text-base tracking-tight">IntellMeet</span>
      </div>
    </div>

    <div className="relative z-10 flex flex-col gap-4">
      <h2 className="text-h3 text-[#F1F5F9]">
        Secure by design,<br />
        <span className="gradient-text">private by default</span>
      </h2>
      <p className="text-sm text-[#64748B] leading-relaxed max-w-xs">
        Your account is protected with enterprise-grade security. Reset your password securely.
      </p>
      <div className="flex items-center gap-2 mt-2">
        <div className="w-2 h-2 rounded-full bg-emerald-400" />
        <span className="text-xs text-[#64748B]">End-to-end encrypted · SOC 2 Type II</span>
      </div>
    </div>

    <div className="relative z-10 rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.025)] p-4">
      <p className="text-xs text-[#94A3B8] leading-relaxed mb-2.5">
        "IntellMeet replaced our Zoom + Notion + Asana stack. The AI summaries alone save us 3 hours a week."
      </p>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold" style={{ background: 'linear-gradient(135deg, #6366F1, #7C3AED)' }}>SC</div>
        <div>
          <p className="text-[10px] font-semibold text-[#CBD5E1]">Sarah Chen</p>
          <p className="text-[9px] text-[#2D3A4A]">Head of Product, Acme Corp</p>
        </div>
      </div>
    </div>
  </div>
);

const ForgotPassword = () => {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email) { setError('Email is required.'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Enter a valid email address.'); return; }
    setLoading(true);
    try {
      await axiosClient.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#07070C]">
      <BrandPanel />

      <div className="flex items-center justify-center p-6 lg:p-10 relative">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-0 right-0 w-[400px] h-[400px]" style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.05) 0%, transparent 70%)' }} />
        </div>

        <motion.div
          className="w-full max-w-[400px] relative z-10"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
        >
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-7 h-7 rounded-xl bg-indigo-500 flex items-center justify-center">
              <Zap size={14} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-sm text-[#F1F5F9]">IntellMeet</span>
          </div>

          {sent ? (
            <motion.div
              className="text-center flex flex-col items-center gap-5 py-6"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/16 flex items-center justify-center">
                <CheckCircle size={28} className="text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#F1F5F9] mb-1">Check your inbox</h2>
                <p className="text-sm text-[#64748B] leading-relaxed">
                  We sent a reset link to <span className="text-[#CBD5E1] font-semibold">{email}</span>
                </p>
              </div>
              <p className="text-xs text-[#3F4D5C]">
                Didn't receive it? Check your spam folder or{' '}
                <button
                  onClick={() => { setSent(false); setEmail(''); setError(''); }}
                  className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
                >
                  try again
                </button>
                .
              </p>
              <Link
                to={ROUTES.LOGIN}
                className="flex items-center gap-1.5 text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors font-medium"
              >
                <ArrowLeft size={13} />
                Back to sign in
              </Link>
            </motion.div>
          ) : (
            <>
              <div className="mb-7">
                <h1 className="text-[1.625rem] font-bold text-[#F1F5F9] tracking-tight mb-1">Forgot password?</h1>
                <p className="text-sm text-[#64748B]">Enter your email and we'll send you a reset link.</p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                <div>
                  <label htmlFor="forgot-email" className="form-label">Email address</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#2D3A4A] pointer-events-none" aria-hidden="true" />
                    <input
                      id="forgot-email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="input-dark pl-9"
                      autoFocus
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div role="alert" className="flex items-start gap-2 text-xs text-[#F87171] bg-red-500/8 border border-red-500/16 px-3 py-2.5 rounded-lg">
                    <span className="mt-0.5 shrink-0">⚠</span>
                    {error}
                  </div>
                )}

                <Button type="submit" loading={loading} className="w-full mt-1 h-10 text-sm" rightIcon={<ArrowRight size={14} />}>
                  Send Reset Link
                </Button>
              </form>

              <Link
                to={ROUTES.LOGIN}
                className="flex items-center justify-center gap-1.5 text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors font-medium mt-6"
              >
                <ArrowLeft size={13} />
                Back to sign in
              </Link>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ForgotPassword;
