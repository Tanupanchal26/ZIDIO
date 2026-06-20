import { memo, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  Video, CheckSquare, Brain, Users, Calendar, BarChart2,
  Sparkles, Bell, TrendingUp, Clock, Plus, ArrowRight, Zap,
  AlertCircle,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAppSelector } from '../hooks/useAppDispatch';
import { ROUTES, MEETING_ROUTE } from '../constants';
import { motion as ds } from '../design-system/motion';
import { clsx } from 'clsx';
import { PageContainer } from '../components/layout/PageContainer';
import { PageHeader } from '../components/layout/PageHeader';
import { ContentGrid } from '../components/layout/DashboardGrid';
import { meetingService } from '../services/meeting.service';
import { taskService } from '../services/task.service';
import { SkeletonBlock } from '../components/common/Loader';

const fu = ds.fadeInUp;

// ── Primitives ─────────────────────────────────────────────────────────────────
const Card = memo(({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={clsx('bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md', className)}>
    {children}
  </div>
));

const CardHead = memo(({ icon: Icon, title, linkTo, bgClass = 'bg-blue-50', colorClass = 'text-blue-600' }: {
  icon: React.ElementType; title: string; linkTo?: string; bgClass?: string; colorClass?: string;
}) => (
  <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
    <div className="flex items-center gap-3">
      <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center', bgClass)}>
        <Icon size={15} className={colorClass} aria-hidden="true" />
      </div>
      <span className="text-sm font-semibold text-slate-900 tracking-tight">{title}</span>
    </div>
    {linkTo && (
      <Link to={linkTo} className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">
        View all
      </Link>
    )}
  </div>
));

// ── Empty state ────────────────────────────────────────────────────────────────
const EmptyState = memo(({ icon: Icon, title, desc, action }: {
  icon: React.ElementType; title: string; desc: string; action?: React.ReactNode;
}) => (
  <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
      <Icon size={20} className="text-slate-400" aria-hidden="true" />
    </div>
    <div>
      <p className="text-sm font-semibold text-slate-600">{title}</p>
      <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
    </div>
    {action}
  </div>
));

// ── Time helpers ──────────────────────────────────────────────────────────────
const timeAgo = (iso: string) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
};

// ── Static quick-actions (not data-driven) ───────────────────────────────────
const QUICK = [
  { label: 'New Meeting', icon: Video,       to: ROUTES.LOBBY,      color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-100' },
  { label: 'Create Task', icon: CheckSquare, to: ROUTES.TASKS,      color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  { label: 'AI Summary',  icon: Brain,       to: ROUTES.AI_SUMMARY, color: 'text-purple-600',  bg: 'bg-purple-50',  border: 'border-purple-100' },
  { label: 'Analytics',   icon: BarChart2,   to: ROUTES.ANALYTICS,  color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-100' },
];

// ── Tooltip ──────────────────────────────────────────────────────────────────
const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2.5 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

// ── KPI skeleton ──────────────────────────────────────────────────────────────
const KPISkeleton = () => (
  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col gap-4">
    <div className="flex items-center justify-between">
      <SkeletonBlock height={40} width={40} className="rounded-xl" />
      <SkeletonBlock height={24} width={60} className="rounded-full" />
    </div>
    <div className="flex flex-col gap-2">
      <SkeletonBlock height={32} width={64} className="rounded-md" />
      <SkeletonBlock height={14} width={120} className="rounded-md" />
    </div>
  </div>
);

export default function Dashboard() {
  const navigate  = useNavigate();
  const authUser  = useAppSelector((s) => s.auth.user);
  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = authUser?.name?.split(' ')[0] ?? 'there';

  // ── Live data ───────────────────────────────────────────────────────────────
  const { data: meetingsData, isLoading: meetingsLoading } = useQuery({
    queryKey: ['meetings', 'dashboard'],
    queryFn: () => meetingService.getAll({ limit: 5 }) as Promise<any>,
    staleTime: 60_000,
  });

  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', 'dashboard'],
    queryFn: () => taskService.getAll() as Promise<any>,
    staleTime: 60_000,
  });

  const meetings: any[] = useMemo(() => meetingsData?.data ?? [], [meetingsData]);
  const tasks: any[]    = useMemo(() => tasksData?.data ?? [], [tasksData]);

  // ── Derived analytics ───────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const total    = meetings.length;
    const done     = tasks.filter((t: any) => t.status === 'done').length;
    const pending  = tasks.filter((t: any) => t.status !== 'done').length;
    return { total, done, pending };
  }, [meetings, tasks]);

  // Build a 7-day meetings-per-day chart
  const chartData = useMemo(() => {
    const days: Record<string, number> = {};
    const labels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      days[labels[d.getDay()]] = 0;
    }
    meetings.forEach((m: any) => {
      const d = new Date(m.createdAt ?? m.startedAt ?? Date.now());
      const label = labels[d.getDay()];
      if (label in days) days[label]++;
    });
    return Object.entries(days).map(([day, count]) => ({ day, Meetings: count }));
  }, [meetings]);

  // Task status distribution
  const taskChart = useMemo(() => {
    const counts: Record<string, number> = { todo: 0, 'in_progress': 0, in_review: 0, done: 0 };
    tasks.forEach((t: any) => { if (t.status in counts) counts[t.status]++; });
    return [
      { name: 'Todo',        value: counts.todo,        fill: '#94A3B8' },
      { name: 'In Progress', value: counts.in_progress, fill: '#6366F1' },
      { name: 'In Review',   value: counts.in_review,   fill: '#F59E0B' },
      { name: 'Done',        value: counts.done,        fill: '#10B981' },
    ];
  }, [tasks]);

  const METRICS = [
    {
      label: 'Meetings this month', value: meetingsLoading ? '—' : String(metrics.total),
      delta: meetingsLoading ? '…' : `${metrics.total} total`,
      live: false, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50',
    },
    {
      label: 'Tasks completed', value: tasksLoading ? '—' : String(metrics.done),
      delta: `+${metrics.done}`, live: false, icon: CheckSquare, color: 'text-emerald-600', bg: 'bg-emerald-50',
    },
    {
      label: 'Pending tasks', value: tasksLoading ? '—' : String(metrics.pending),
      delta: `${metrics.pending} open`, live: false, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50',
    },
    {
      label: 'Team members online', value: '—', delta: 'Live', live: true,
      icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50',
    },
  ];

  return (
    <div className="max-w-7xl w-full mx-auto pb-8">
      <motion.div {...fu(0)}>
        <PageHeader
          title={`${greeting}, ${firstName} 👋`}
          subtitle="Here's what's happening with your team today."
          actions={
            <button
              onClick={() => navigate(ROUTES.LOBBY)}
              className="hidden sm:flex items-center gap-2 text-sm font-semibold text-white bg-blue-600 rounded-xl px-5 h-11 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all focus-visible:ring-4 focus-visible:ring-blue-100 active:scale-95"
              aria-label="Start a new meeting"
            >
              <Plus size={16} strokeWidth={2.5} aria-hidden="true" />
              New Meeting
            </button>
          }
        />
      </motion.div>

      {/* ── KPI Cards ── */}
      <ContentGrid columns={4} className="mt-5">
        {meetingsLoading || tasksLoading
          ? Array.from({ length: 4 }).map((_, i) => <KPISkeleton key={i} />)
          : METRICS.map(({ label, value, delta, live, icon: Icon, color, bg }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1], delay: i * 0.07 }}
              className="group bg-white rounded-2xl p-5 flex flex-col gap-4 border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-default"
            >
              <div className="flex items-center justify-between">
                <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110', bg)}>
                  <Icon size={17} className={color} aria-hidden="true" />
                </div>
                <span className={clsx(
                  'inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-1',
                  live ? 'text-blue-700 bg-blue-100' : 'text-emerald-700 bg-emerald-100'
                )}>
                  {live ? <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" aria-hidden="true" /> : <TrendingUp size={11} aria-hidden="true" />}
                  {delta}
                </span>
              </div>
              <div>
                <p className="text-3xl font-bold leading-none tracking-tight text-slate-900">{value}</p>
                <p className="text-sm mt-1.5 text-slate-500 font-medium">{label}</p>
              </div>
            </motion.div>
          ))
        }
      </ContentGrid>

      {/* ── Charts Row ── */}
      <motion.div {...fu(0.12)} className="mt-5">
        <ContentGrid columns={2}>
          {/* Meetings over 7 days */}
          <Card>
            <CardHead icon={BarChart2} title="Meetings — Last 7 Days" bgClass="bg-blue-50" colorClass="text-blue-600" />
            {/* aria-label added to ResponsiveContainer wrapper */}
            <div className="p-5 pt-4">
              {meetingsLoading ? (
                <SkeletonBlock height={160} className="rounded-xl w-full" />
              ) : meetings.length === 0 ? (
                <EmptyState icon={Video} title="No meetings yet" desc="Start your first meeting to see activity." />
              ) : (
                <div role="img" aria-label="Meeting activity over the last 7 days">
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <defs>
                      <linearGradient id="meetGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTip />} />
                    <Area type="monotone" dataKey="Meetings" stroke="#6366F1" strokeWidth={2} fill="url(#meetGrad)" dot={{ fill: '#6366F1', r: 3 }} activeDot={{ r: 5 }} />
                  </AreaChart>
                </ResponsiveContainer>
                </div>
              )}
            </div>
          </Card>

          {/* Task status */}
          <Card>
            <CardHead icon={CheckSquare} title="Task Status" bgClass="bg-emerald-50" colorClass="text-emerald-600" />
            <div className="p-5 pt-4">
              {tasksLoading ? (
                <SkeletonBlock height={160} className="rounded-xl w-full" />
              ) : tasks.length === 0 ? (
                <EmptyState icon={CheckSquare} title="No tasks yet" desc="Create your first task to track progress." />
              ) : (
                <div role="img" aria-label="Task status distribution chart">
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={taskChart} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTip />} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {taskChart.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                </div>
              )}
            </div>
          </Card>
        </ContentGrid>
      </motion.div>

      {/* ── Recent Meetings + Quick Actions + My Tasks ── */}
      <motion.div {...fu(0.2)} className="mt-5">
        <ContentGrid columns={3}>
          {/* Recent Meetings */}
          <Card>
            <CardHead icon={Video} title="Recent Meetings" linkTo={ROUTES.LOBBY} bgClass="bg-indigo-50" colorClass="text-indigo-600" />
            {meetingsLoading ? (
              <div className="flex flex-col gap-3 p-4">
                {[...Array(3)].map((_, i) => <SkeletonBlock key={i} height={52} className="rounded-xl w-full" />)}
              </div>
            ) : meetings.length === 0 ? (
              <EmptyState icon={Video} title="No meetings yet" desc="Start a meeting to see your history here." action={
                <button onClick={() => navigate(ROUTES.LOBBY)} className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                  Start a meeting →
                </button>
              } />
            ) : (
              <div className="flex flex-col divide-y divide-slate-50">
                {meetings.slice(0, 4).map((m: any) => (
                  <button key={m._id} onClick={() => navigate(MEETING_ROUTE(m._id))}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left group transition-all hover:bg-slate-50 active:bg-slate-100"
                    aria-label={`Join meeting: ${m.title}`}
                  >
                    <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', m.status === 'active' ? 'bg-emerald-100' : 'bg-slate-100')}>
                      <Video size={14} className={m.status === 'active' ? 'text-emerald-600' : 'text-slate-400'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate text-slate-900 group-hover:text-blue-600 transition-colors">{m.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Clock size={11} className="text-slate-400" aria-hidden="true" />
                        <span className="text-xs text-slate-500">{timeAgo(m.createdAt || m.startedAt || Date.now())}</span>
                      </div>
                    </div>
                    <span className={clsx('text-[10px] font-semibold px-2 py-1 rounded-full shrink-0',
                      m.status === 'active' ? 'text-emerald-700 bg-emerald-100' : 'text-slate-500 bg-slate-100')}>
                      {m.status === 'active' ? 'Live' : 'Ended'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* Quick Actions */}
          <Card>
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Zap size={15} className="text-indigo-600" aria-hidden="true" />
              </div>
              <span className="text-sm font-semibold text-slate-900">Quick Actions</span>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              {QUICK.map(({ label, icon: Icon, to, color, bg, border }) => (
                <Link key={label} to={to}
                  aria-label={label}
                  className={clsx('flex flex-col items-center gap-2.5 rounded-xl py-4 px-2 transition-all hover:scale-105 hover:shadow-md text-center border shadow-sm', bg, border)}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white shadow-sm">
                    <Icon size={16} className={color} aria-hidden="true" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 leading-tight">{label}</span>
                </Link>
              ))}
            </div>
          </Card>

          {/* My Tasks */}
          <Card>
            <CardHead icon={CheckSquare} title="My Tasks" linkTo={ROUTES.TASKS} bgClass="bg-emerald-50" colorClass="text-emerald-600" />
            {tasksLoading ? (
              <div className="flex flex-col gap-2 p-4">
                {[...Array(4)].map((_, i) => <SkeletonBlock key={i} height={40} className="rounded-lg w-full" />)}
              </div>
            ) : tasks.length === 0 ? (
              <EmptyState icon={CheckSquare} title="No tasks yet" desc="Tasks assigned to you will appear here." action={
                <Link to={ROUTES.TASKS} className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">Create a task →</Link>
              } />
            ) : (
              <div className="flex flex-col py-1">
                {tasks.slice(0, 5).map((t: any) => (
                  <div key={t._id} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-50 last:border-0">
                    <div className={clsx('w-4.5 h-4.5 rounded-md border-2 shrink-0 flex items-center justify-center',
                      t.status === 'done' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 bg-white')}>
                      {t.status === 'done' && <CheckSquare size={10} className="text-emerald-600" aria-hidden="true" />}
                    </div>
                    <p className={clsx('flex-1 text-sm min-w-0 truncate',
                      t.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-700 font-medium')}>
                      {t.title}
                    </p>
                    <div className={clsx('w-2 h-2 rounded-full shrink-0',
                      t.priority === 'high' || t.priority === 'urgent' ? 'bg-red-400' :
                      t.priority === 'medium' ? 'bg-amber-400' : 'bg-emerald-400')} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </ContentGrid>
      </motion.div>

      {/* ── AI Banner ── */}
      <motion.div {...fu(0.3)} className="mt-5">
        <div className="group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 p-5 sm:p-7 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-blue-600 shadow-lg shadow-blue-600/30 group-hover:scale-110 transition-transform">
              <Sparkles size={18} className="text-white" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-bold text-indigo-900">AI Intelligence is ready</p>
              <p className="text-sm mt-0.5 text-indigo-700/80 truncate">Get live transcriptions, smart summaries, and actionable insights from every meeting.</p>
            </div>
          </div>
          <button
            onClick={() => navigate(ROUTES.AI_SUMMARY)}
            className="flex items-center justify-center gap-2 text-sm font-semibold shrink-0 px-5 h-10 rounded-xl transition-all hover:gap-3 bg-white text-indigo-600 border border-indigo-200 shadow-sm hover:shadow hover:bg-indigo-50 active:scale-95"
          >
            Explore AI
            <ArrowRight size={15} aria-hidden="true" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
