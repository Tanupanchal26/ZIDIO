import { useEffect, useMemo, useRef, useState, useId, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  User, Lock, Bell, Palette, Shield, Save, CreditCard,
  Puzzle, Brain, Trash2, ExternalLink, Check, LogOut, Upload, X, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import { useAppSelector, useAppDispatch } from '../hooks/useAppDispatch';
import { setTheme, type Theme } from '../store/slices/uiSlice';
import { ROUTES, STORAGE_KEYS } from '../constants';
import { useLogout } from '../hooks/useLogout';
import { useFocusTrap } from '../hooks/useFocusTrap';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

type Tab = 'profile' | 'security' | 'notifications' | 'appearance' | 'billing' | 'integrations' | 'ai';

const TABS: { id: Tab; label: string; icon: React.ElementType; group?: string }[] = [
  { id: 'profile',       label: 'Profile',        icon: User,       group: 'Account' },
  { id: 'security',      label: 'Security',        icon: Shield,     group: 'Account' },
  { id: 'notifications', label: 'Notifications',   icon: Bell,       group: 'Account' },
  { id: 'appearance',    label: 'Appearance',      icon: Palette,    group: 'Account' },
  { id: 'billing',       label: 'Billing',         icon: CreditCard, group: 'Workspace' },
  { id: 'integrations',  label: 'Integrations',    icon: Puzzle,     group: 'Workspace' },
  { id: 'ai',            label: 'AI Preferences',  icon: Brain,      group: 'Workspace' },
];

/* ── Toggle switch ── */
interface ToggleProps { id: string; checked: boolean; onChange: () => void; label: string; }
const Toggle = ({ id, checked, onChange, label }: ToggleProps) => (
  <button
    id={id}
    role="switch"
    aria-checked={checked ? 'true' : 'false'}
    aria-label={label}
    onClick={onChange}
    className={clsx(
      'relative w-10 h-[22px] rounded-full shrink-0 transition-colors duration-200 outline-none',
      'focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#07070C]',
      checked ? 'bg-indigo-500' : 'bg-[rgba(255,255,255,0.1)]'
    )}
  >
    <span
      className={clsx(
        'absolute top-0.5 left-0.5 w-[18px] h-[18px] rounded-full bg-white',
        'shadow-[0_1px_3px_rgba(0,0,0,0.4)]',
        'transition-transform duration-200',
        checked && 'translate-x-[18px]'
      )}
    />
  </button>
);

/* ── Avatar Upload with crop, compress, preview, progress ── */
const AvatarUpload = ({ name }: { name: string }) => {
  const fileRef  = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [preview,  setPreview]  = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [cropSrc,  setCropSrc]  = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  /** Compress + crop to square via canvas */
  const processImage = (file: File): Promise<Blob> =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const SIZE = 256;
        const canvas = canvasRef.current!;
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d')!;
        const min = Math.min(img.width, img.height);
        const sx  = (img.width  - min) / 2;
        const sy  = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, SIZE, SIZE);
        canvas.toBlob((blob) => resolve(blob!), 'image/webp', 0.82);
      };
      img.src = URL.createObjectURL(file);
    });

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 8 * 1024 * 1024)    { toast.error('Image must be under 8 MB');    return; }

    const blob    = await processImage(file);
    const dataUrl = URL.createObjectURL(blob);
    setPreview(dataUrl);
    setCropSrc(null);

    // Simulate upload with XHR progress
    setUploading(true);
    setProgress(0);
    const formData = new FormData();
    formData.append('avatar', blob, 'avatar.webp');

    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      setUploading(false);
      setProgress(100);
      toast.success('Avatar updated!');
    };
    xhr.onerror = () => {
      setUploading(false);
      setPreview(null);
      toast.error('Upload failed — please try again');
    };
    xhr.open('POST', '/api/users/avatar');
    xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) ?? ''}`);
    xhr.send(formData);
  };

  return (
    <div className="flex items-center gap-4 mb-6 p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
      <canvas ref={canvasRef} className="hidden" />

      {/* Avatar preview */}
      <div className="relative shrink-0">
        {preview ? (
          <img
            src={preview}
            alt="Avatar preview"
            className="w-14 h-14 rounded-2xl object-cover ring-2 ring-indigo-500/40"
          />
        ) : (
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold"
            style={{ background: 'linear-gradient(135deg, #6366F1, #7C3AED)' }}
          >
            {name.charAt(0).toUpperCase() || 'U'}
          </div>
        )}
        {preview && (
          <button
            onClick={() => setPreview(null)}
            className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 rounded-full bg-[#1E293B] border border-[rgba(255,255,255,0.1)] flex items-center justify-center text-[#94A3B8] hover:text-red-400 transition-colors"
          >
            <X size={9} />
          </button>
        )}
      </div>

      {/* Info + upload button + progress */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#CBD5E1]">{name || 'Your Name'}</p>
        <p className="text-xs text-[#3F4D5C] mt-0.5">WebP · max 8 MB · auto-cropped to square</p>

        {uploading && (
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[#64748B]">Uploading…</span>
              <span className="text-[10px] text-[#64748B]">{progress}%</span>
            </div>
            <div className="h-1 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {!uploading && (
          <button
            onClick={() => fileRef.current?.click()}
            className="mt-2 flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
          >
            <Upload size={11} />
            {preview ? 'Change photo' : 'Upload photo'}
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
        />
      </div>
    </div>
  );
};

const SectionHeader = ({ title, desc }: { title: string; desc?: string }) => (
  <div className="mb-5">
    <h2 className="text-[0.9375rem] font-semibold text-[#F1F5F9] tracking-tight">{title}</h2>
    {desc && <p className="text-sm text-[#64748B] mt-0.5 leading-relaxed">{desc}</p>}
  </div>
);

/* ── Row item for notification/settings toggles ── */
const SettingRow = ({
  title, desc, id, checked, onChange,
}: { title: string; desc: string; id: string; checked: boolean; onChange: () => void }) => (
  <div className="flex items-center justify-between py-3.5 border-b border-[rgba(255,255,255,0.04)] last:border-0">
    <div className="flex-1 pr-6">
      <label htmlFor={id} className="text-sm font-medium text-[#CBD5E1] cursor-pointer">{title}</label>
      <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">{desc}</p>
    </div>
    <Toggle id={id} checked={checked} onChange={onChange} label={title} />
  </div>
);

const Settings = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const urlTab = (searchParams.get('tab') ?? 'profile').toLowerCase() as Tab;
  const validTabs = useMemo(() => new Set<Tab>(TABS.map(t => t.id)), []);

  useEffect(() => {
    if (validTabs.has(urlTab)) {
      setTab(urlTab);
      return;
    }
    setTab('profile');
    setSearchParams({ tab: 'profile' }, { replace: true });
  }, [urlTab, validTabs, setSearchParams]);

  const user     = useAppSelector((s) => s.auth.user);
  const theme    = useAppSelector((s) => s.ui.theme);
  const dispatch = useAppDispatch();
  const logout   = useLogout();
  const [tab,    setTab]    = useState<Tab>('profile');
  const [name,   setName]   = useState(user?.name ?? '');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm,   setDeleteConfirm]   = useState('');
  const deleteInputId = useId();
  const deleteModalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(deleteModalRef, showDeleteModal);

  const handleDeleteAccount = () => {
    if (deleteConfirm !== 'DELETE') return;
    setShowDeleteModal(false);
    toast.error('Account deletion coming soon.');
  };

  const [notifs, setNotifs] = useState({
    email: true, push: true, digest: false, mentions: true,
    meetingInvite: true, taskAssigned: true, aiSummary: true,
  });

  const [ai, setAI] = useState({
    autoSummary: true, actionItems: true, transcription: true,
    suggestions: false, searchHistory: true,
  });

  const toggleNotif = (k: keyof typeof notifs) =>
    setNotifs(n => ({ ...n, [k]: !n[k] }));

  const toggleAI = (k: keyof typeof ai) =>
    setAI(a => ({ ...a, [k]: !a[k] }));

  const save = () => toast.success('Settings saved!');

  const handleLogout = logout;

  const tabGroups = ['Account', 'Workspace'];

  // Keep tab in sync with URL (so /settings?tab=profile works after refresh)
  const handleTabClick = (next: Tab) => {
    setTab(next);
    setSearchParams({ tab: next }, { replace: false });
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="text-h3 text-[#F1F5F9]">Settings</h1>
        <p className="text-sm text-[#64748B] mt-0.5">Manage your account and workspace preferences</p>
      </motion.div>

      <div className="flex gap-6 flex-col md:flex-row">

        {/* ── Tab list ── */}
        <nav className="flex md:flex-col gap-2 md:w-52 flex-shrink-0 flex-wrap" aria-label="Settings navigation">
          {tabGroups.map(group => (
            <div key={group} className="flex md:flex-col gap-1 w-full">
              <p className="text-[10px] font-semibold text-[#2D3A4A] uppercase tracking-[0.1em] px-2.5 py-1 hidden md:block">
                {group}
              </p>
              {TABS.filter(t => t.group === group).map(({ id, label, icon: Icon }) => (
                  <button
                        key={id}
                        onClick={() => handleTabClick(id as Tab)}
                  aria-current={tab === id ? 'page' : undefined}
                  className={clsx(
                    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[0.8125rem] font-medium transition-all text-left',
                    tab === id
                      ? 'bg-[rgba(99,102,241,0.1)] text-[#818CF8] border border-indigo-500/14'
                      : 'text-[#64748B] hover:bg-white/[0.04] hover:text-[#94A3B8] border border-transparent'
                  )}
                >
                  <Icon size={14} aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
          ))}
          
          <div className="pt-4 mt-4 border-t border-[rgba(255,255,255,0.05)] hidden md:block">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[0.8125rem] font-medium text-[#64748B] hover:bg-red-500/10 hover:text-red-400 transition-all text-left w-full"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </nav>

        {/* ── Content ── */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
            >

              {/* Profile */}
              {tab === 'profile' && (
                <Card>
                  <SectionHeader title="Profile Information" desc="Your public name and email visible to team members." />
                  <AvatarUpload name={name} />
                  <div className="flex flex-col gap-4">
                    <div>
                      <label htmlFor="settings-name" className="form-label">Full Name</label>
                      <input id="settings-name" type="text" value={name} onChange={e => setName(e.target.value)} className="input" />
                    </div>
                    <div>
                      <label htmlFor="settings-email" className="form-label">Email Address</label>
                      <input id="settings-email" type="email" value={user?.email ?? ''} readOnly className="input opacity-60 cursor-not-allowed" />
                      <p className="form-hint">Email changes require verification. Contact support.</p>
                    </div>
                    <div className="flex justify-end pt-1">
                      <Button onClick={save} leftIcon={<Save size={13} />}>Save Changes</Button>
                    </div>
                  </div>
                </Card>
              )}

              {/* Security */}
              {tab === 'security' && (
                <div className="flex flex-col gap-4">
                  <Card>
                    <SectionHeader title="Change Password" />
                    <div className="flex flex-col gap-4">
                      {[
                        { id: 'cur-pass', label: 'Current Password', autoComplete: 'current-password' },
                        { id: 'new-pass', label: 'New Password',     autoComplete: 'new-password' },
                        { id: 'cfm-pass', label: 'Confirm New Password', autoComplete: 'new-password' },
                      ].map(({ id, label, autoComplete }) => (
                        <div key={id}>
                          <label htmlFor={id} className="form-label">{label}</label>
                          <input id={id} type="password" placeholder="••••••••" className="input" autoComplete={autoComplete} />
                        </div>
                      ))}
                      <div className="flex justify-end">
                        <Button onClick={save} leftIcon={<Lock size={13} />}>Update Password</Button>
                      </div>
                    </div>
                  </Card>

                  <Card>
                    <SectionHeader title="Two-Factor Authentication" desc="Add an extra layer of security to your account." />
                    <div className="flex items-center justify-between p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
                      <div>
                        <p className="text-sm font-medium text-[#CBD5E1]">Authenticator App</p>
                        <p className="text-xs text-[#64748B] mt-0.5">Use an app like Authy or Google Authenticator</p>
                      </div>
                      <Button variant="secondary" size="sm">Enable</Button>
                    </div>
                  </Card>

                  <Card variant="danger">
                    <SectionHeader title="Danger Zone" desc="Permanent and irreversible actions." />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-[#CBD5E1]">Delete Account</p>
                        <p className="text-xs text-[#64748B] mt-0.5">Permanently delete your account and all data</p>
                      </div>
                      <Button variant="danger" size="sm" leftIcon={<Trash2 size={13} />}
                        onClick={() => { setDeleteConfirm(''); setShowDeleteModal(true); }}>
                        Delete Account
                      </Button>
                    </div>
                  </Card>
                </div>
              )}

              {/* Notifications */}
              {tab === 'notifications' && (
                <Card>
                  <SectionHeader title="Notification Preferences" desc="Choose what you want to be notified about." />
                  <div className="flex flex-col">
                    <SettingRow title="Email Notifications" desc="Receive meeting summaries and alerts via email" id="n-email" checked={notifs.email} onChange={() => toggleNotif('email')} />
                    <SettingRow title="Push Notifications" desc="Browser push for real-time meeting alerts" id="n-push" checked={notifs.push} onChange={() => toggleNotif('push')} />
                    <SettingRow title="Daily Digest" desc="Morning summary of tasks and upcoming meetings" id="n-digest" checked={notifs.digest} onChange={() => toggleNotif('digest')} />
                    <SettingRow title="Mentions" desc="Notify when someone @mentions you in channels" id="n-mentions" checked={notifs.mentions} onChange={() => toggleNotif('mentions')} />
                    <SettingRow title="Meeting Invites" desc="Get notified when you're added to a meeting" id="n-invite" checked={notifs.meetingInvite} onChange={() => toggleNotif('meetingInvite')} />
                    <SettingRow title="Task Assignments" desc="Notify when a task is assigned to you" id="n-task" checked={notifs.taskAssigned} onChange={() => toggleNotif('taskAssigned')} />
                    <SettingRow title="AI Summaries Ready" desc="Notify when AI finishes processing a meeting" id="n-ai" checked={notifs.aiSummary} onChange={() => toggleNotif('aiSummary')} />
                  </div>
                </Card>
              )}

              {/* Appearance */}
              {tab === 'appearance' && (
                <Card>
                  <SectionHeader title="Theme" desc="Choose how IntellMeet looks for you." />
                  <div className="flex gap-3 mb-6" role="radiogroup" aria-label="Theme selection">
                    {([
                      { id: 'dark',   label: 'Dark',   preview: { bg: '#07070C', text: '#F1F5F9', accent: '#6366F1', border: '#ffffff14' } },
                      { id: 'light',  label: 'Light',  preview: { bg: '#FFFFFF', text: '#111827', accent: '#6366F1', border: '#E5E7EB' } },
                      { id: 'system', label: 'System', preview: { bg: 'linear-gradient(135deg,#07070C 50%,#FFFFFF 50%)', text: '#6366F1', accent: '#6366F1', border: '#6366F133' } },
                    ] as const).map(({ id: t, label, preview }) => {
                      const isActive = theme === t;
                      return (
                        <button key={t}
                          role="radio"
                          aria-checked={isActive}
                          onClick={() => dispatch(setTheme(t as any))}
                          className={clsx(
                            'flex-1 flex flex-col items-center gap-2 py-3 px-2 rounded-xl border text-sm font-medium transition-all',
                            isActive
                              ? 'border-indigo-500/35 bg-indigo-500/8 text-indigo-300'
                              : 'border-[rgba(255,255,255,0.07)] text-[#64748B] hover:border-[rgba(255,255,255,0.12)] hover:text-[#94A3B8]'
                          )}
                        >
                          {/* Mini preview swatch */}
                          <div
                            className="w-full h-8 rounded-lg border flex items-center justify-center overflow-hidden"
                            style={{ background: preview.bg, borderColor: preview.border }}
                            aria-hidden="true"
                          >
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: preview.accent }} />
                          </div>
                          <span className="flex items-center gap-1">
                            {isActive && <Check size={11} aria-hidden="true" />}
                            {label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <SectionHeader title="Density" desc="Control how compact the interface appears." />
                  <div className="flex gap-3" role="radiogroup" aria-label="Density selection">
                    {['Comfortable', 'Compact'].map(d => (
                      <button key={d}
                        role="radio"
                        aria-checked={d === 'Comfortable'}
                        className={clsx('flex-1 py-3 rounded-xl border text-sm font-medium transition-all',
                          d === 'Comfortable'
                            ? 'border-indigo-500/35 bg-indigo-500/8 text-indigo-300'
                            : 'border-[rgba(255,255,255,0.07)] text-[#64748B] hover:border-[rgba(255,255,255,0.12)]'
                        )}>
                        {d}
                      </button>
                    ))}
                  </div>
                </Card>
              )}

              {/* Billing */}
              {tab === 'billing' && (
                <div className="flex flex-col gap-4">
                  <Card variant="brand">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-[#F1F5F9]">Pro Plan</p>
                          <Badge variant="primary">Active</Badge>
                        </div>
                        <p className="text-xs text-[#64748B]">$15/user/month · 8 seats · Next billing Dec 1, 2025</p>
                      </div>
                      <Button variant="soft" size="sm">Manage</Button>
                    </div>
                  </Card>
                  <Card>
                    <SectionHeader title="Payment Method" />
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
                      <CreditCard size={16} className="text-[#64748B]" />
                      <div>
                        <p className="text-sm font-medium text-[#CBD5E1]">Visa ending in 4242</p>
                        <p className="text-xs text-[#3F4D5C]">Expires 12/26</p>
                      </div>
                      <Button variant="ghost" size="xs" className="ml-auto">Update</Button>
                    </div>
                  </Card>
                </div>
              )}

              {/* Integrations */}
              {tab === 'integrations' && (
                <Card>
                  <SectionHeader title="Integrations" desc="Connect IntellMeet with your favourite tools." />
                  <div className="flex flex-col gap-3">
                    {[
                      { name: 'Slack',              desc: 'Post meeting summaries to channels', connected: true },
                      { name: 'Google Calendar',    desc: 'Sync meetings with your calendar', connected: true },
                      { name: 'Notion',             desc: 'Export notes and summaries to Notion', connected: false },
                      { name: 'Linear',             desc: 'Create issues from action items', connected: false },
                      { name: 'Jira',               desc: 'Sync tasks with Jira projects', connected: false },
                    ].map(({ name, desc, connected }) => (
                      <div key={name} className="flex items-center justify-between p-3 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.08)] transition-colors">
                        <div>
                          <p className="text-sm font-medium text-[#CBD5E1]">{name}</p>
                          <p className="text-xs text-[#64748B] mt-0.5">{desc}</p>
                        </div>
                        {connected ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="success" dot>Connected</Badge>
                            <Button variant="ghost" size="xs" className="text-[#64748B]">Disconnect</Button>
                          </div>
                        ) : (
                          <Button variant="secondary" size="sm" rightIcon={<ExternalLink size={11} />}>Connect</Button>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* AI Preferences */}
              {tab === 'ai' && (
                <Card>
                  <SectionHeader title="AI Preferences" desc="Configure how IntellMeet's AI assistant behaves." />
                  <div className="flex flex-col">
                    <SettingRow title="Auto-generate Summaries" desc="Automatically generate AI summary after each meeting ends" id="ai-summary" checked={ai.autoSummary} onChange={() => toggleAI('autoSummary')} />
                    <SettingRow title="Extract Action Items" desc="Automatically identify and extract tasks from transcripts" id="ai-actions" checked={ai.actionItems} onChange={() => toggleAI('actionItems')} />
                    <SettingRow title="Live Transcription" desc="Enable real-time speech-to-text during meetings" id="ai-transcript" checked={ai.transcription} onChange={() => toggleAI('transcription')} />
                    <SettingRow title="AI Suggestions" desc="Receive proactive suggestions during meetings" id="ai-suggest" checked={ai.suggestions} onChange={() => toggleAI('suggestions')} />
                    <SettingRow title="Search History" desc="Allow AI to reference past meetings when answering questions" id="ai-history" checked={ai.searchHistory} onChange={() => toggleAI('searchHistory')} />
                  </div>
                </Card>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Delete account confirmation modal ── */}
      <AnimatePresence>
        {showDeleteModal && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteModal(false)}
              aria-hidden="true"
            />
            <motion.div
              ref={deleteModalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-modal-title"
              aria-describedby="delete-modal-desc"
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-[400px] mx-4"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2 }}
            >
              <div className="bg-[#0F0F18] rounded-2xl border border-[rgba(255,255,255,0.08)] p-6 shadow-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-red-500/12 border border-red-500/20 flex items-center justify-center shrink-0">
                    <AlertTriangle size={18} className="text-red-400" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 id="delete-modal-title" className="text-base font-semibold text-[#F1F5F9]">Delete Account</h2>
                    <p id="delete-modal-desc" className="text-xs text-[#64748B] mt-0.5">This action cannot be undone</p>
                  </div>
                </div>
                <p className="text-sm text-[#64748B] leading-relaxed mb-5">
                  All your data — meetings, tasks, notes, and settings — will be permanently deleted.
                  Type <span className="font-mono font-bold text-[#CBD5E1] text-xs bg-white/[0.06] px-1.5 py-0.5 rounded">DELETE</span> to confirm.
                </p>
                <div className="mb-5">
                  <label htmlFor={deleteInputId} className="sr-only">Type DELETE to confirm</label>
                  <input
                    id={deleteInputId}
                    type="text"
                    value={deleteConfirm}
                    onChange={e => setDeleteConfirm(e.target.value)}
                    placeholder="Type DELETE here"
                    autoFocus
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full px-3 py-2.5 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-sm text-[#F1F5F9] placeholder:text-[#2D3A4A] outline-none focus:border-red-500/40 focus:ring-1 focus:ring-red-500/20 transition-all"
                  />
                </div>
                <div className="flex gap-3">
                  <Button variant="secondary" className="flex-1" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
                  <Button
                    variant="danger"
                    className="flex-1"
                    disabled={deleteConfirm !== 'DELETE'}
                    leftIcon={<Trash2 size={13} />}
                    onClick={handleDeleteAccount}
                  >
                    Delete Account
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Settings;
