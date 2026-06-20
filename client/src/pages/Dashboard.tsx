import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Video, CheckSquare, Brain, Users, Calendar, BarChart2,
  Sparkles, Bell, TrendingUp, Clock, Plus, ArrowRight, Zap, Loader2
} from 'lucide-react';
import { useAppSelector } from '../hooks/useAppDispatch';
import { ROUTES, MEETING_ROUTE } from '../utils/constants';
import { motion as ds } from '../design-system/motion';
import { clsx } from 'clsx';
import { PageContainer } from '../components/layout/PageContainer';
import { PageHeader } from '../components/layout/PageHeader';
import { analyticsService } from '../services/analytics.service';
import './Dashboard.css';

const fu = ds.fadeInUp;

/* ── Reusable CSS Card Wrapper primitives ── */
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string; }) => (
  <div className={clsx("db-card", className)}>
    {children}
  </div>
);

const CardHead = ({ icon: Icon, title, linkTo, bgClass = 'bg-[var(--color-surface-2)] border border-[var(--color-border)]', colorClass = 'text-[var(--color-text)]' }: {
  icon: React.ElementType; title: string; linkTo?: string; bgClass?: string; colorClass?: string;
}) => (
  <div className="db-card-header">
    <div className="db-card-header-left">
      <div className={clsx("db-card-icon-wrapper", bgClass)}>
        <Icon size={16} className={colorClass} aria-hidden="true" />
      </div>
      <span className="db-card-title">{title}</span>
    </div>
    {linkTo && (
      <Link to={linkTo} className="db-card-link">View all</Link>
    )}
  </div>
);

const timeAgo = (iso: string) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
};

const ACTIVITY = [
  { icon: Brain, text: 'AI summary generated for Q4 Review', time: '5m ago', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10 border border-purple-500/20' },
  { icon: CheckSquare, text: 'Task completed', time: '12m ago', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10 border border-emerald-500/20' },
  { icon: Users, text: 'Sarah K. joined Engineering team', time: '1h ago', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10 border border-blue-500/20' },
];

const QUICK = [
  { label: 'New Meeting', icon: Video, to: ROUTES.LOBBY, color: 'text-blue-600 dark:text-blue-400', hoverClass: 'hover-blue', bg: 'bg-blue-50/40 dark:bg-blue-950/20', border: 'border-blue-100/50 dark:border-blue-900/10' },
  { label: 'Create Task', icon: CheckSquare, to: ROUTES.TASKS, color: 'text-emerald-600 dark:text-emerald-400', hoverClass: 'hover-emerald', bg: 'bg-emerald-50/40 dark:bg-emerald-950/20', border: 'border-emerald-100/50 dark:border-emerald-900/10' },
  { label: 'AI Summary', icon: Brain, to: ROUTES.AI_SUMMARY, color: 'text-purple-600 dark:text-purple-400', hoverClass: 'hover-purple', bg: 'bg-purple-50/40 dark:bg-purple-950/20', border: 'border-purple-100/50 dark:border-purple-900/10' },
  { label: 'Analytics', icon: BarChart2, to: ROUTES.ANALYTICS, color: 'text-amber-600 dark:text-amber-400', hoverClass: 'hover-amber', bg: 'bg-amber-50/40 dark:bg-amber-950/20', border: 'border-amber-100/50 dark:border-amber-900/10' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const authUser = useAppSelector((s) => s.auth.user);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = authUser?.name?.split(' ')[0] ?? 'there';

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => analyticsService.getDashboard().then((res: any) => res?.data ?? res),
  });

  if (isLoading || !data) {
    return (
      <PageContainer className="db-container">
        <div className="flex items-center justify-center h-full min-h-[400px]">
          <Loader2 size={32} className="animate-spin text-indigo-600" />
        </div>
      </PageContainer>
    );
  }

  const { metrics, recentMeetings, upcomingMeetings, taskData } = data;

  const dynamicMetrics = [
    { label: 'Meetings this month', value: metrics.meetingsThisMonth, delta: '+24%', trendType: 'up', icon: Calendar, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10 border border-blue-500/20', glowClass: 'glow-blue' },
    { label: 'Hours saved by AI', value: `${metrics.hoursSaved}h`, delta: '+31%', trendType: 'up', icon: Brain, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10 border border-purple-500/20', glowClass: 'glow-purple' },
    { label: 'Tasks completed', value: metrics.tasksCompleted, delta: '+18%', trendType: 'up', icon: CheckSquare, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10 border border-emerald-500/20', glowClass: 'glow-emerald' },
    { label: 'Team members online', value: metrics.teamMembersOnline, delta: 'Live', trendType: 'live', icon: Users, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10 border border-rose-500/20', glowClass: 'glow-rose' },
  ];

  const tasksList = taskData.map((t: any) => ({
    title: `Task group: ${t._id}`,
    done: t._id === 'done',
    dot: t._id === 'done' ? 'bg-emerald-500' : 'bg-red-500'
  }));

  return (
    <PageContainer className="db-container">
      <motion.div {...fu(0)}>
        <PageHeader title={`${greeting}, ${firstName} 👋`} subtitle="Here's what's happening with your team today." />
      </motion.div>

      {/* ── KPI Cards Grid ── */}
      <div className="db-grid-4">
        {dynamicMetrics.map(({ label, value, delta, trendType, icon: Icon, color, bg, glowClass }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.08 }} className={clsx("db-metric-card", glowClass)}>
            <div className="db-metric-card-header">
              <div className={clsx("db-metric-icon-wrapper", bg)}>
                <Icon size={18} className={color} aria-hidden="true" />
              </div>
              <span className={clsx("db-metric-trend", trendType)}>
                {trendType === 'live' ? <span className="db-metric-trend-dot live" /> : <TrendingUp size={12} />}
                {delta}
              </span>
            </div>
            <div className="db-metric-value-box">
              <p className="db-metric-value">{value}</p>
              <p className="db-metric-label">{label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div {...fu(0.15)}>
        <div className="db-grid-2">
          {/* Recent Meetings */}
          <Card>
            <CardHead icon={Video} title="Recent Meetings" linkTo={ROUTES.LOBBY} bgClass="bg-indigo-500/10 border border-indigo-500/20" colorClass="text-indigo-600 dark:text-indigo-400" />
            <div className="db-meeting-list">
              {recentMeetings.map((m: any) => (
                <button key={m._id} onClick={() => navigate(MEETING_ROUTE(m._id))} className="db-meeting-item">
                  <div className={clsx("db-meeting-icon", m.status === 'live' && "live")}>
                    <Video size={16} className={m.status === 'live' ? "text-emerald-600" : "text-[var(--color-text-secondary)]"} />
                  </div>
                  <div className="db-meeting-info">
                    <p className="db-meeting-name">{m.title}</p>
                    <div className="db-meeting-meta">
                      <div className="db-meeting-meta-item"><Clock size={12} /><span>{timeAgo(m.startedAt || m.createdAt)}</span></div>
                      <span className="db-meeting-meta-divider">•</span>
                      <div className="db-meeting-meta-item"><Users size={12} /><span>{m.participants.length} participants</span></div>
                    </div>
                  </div>
                  <span className={clsx("db-status-badge", m.status === 'live' && "live")}>
                    {m.status === 'live' && <span className="db-status-badge-dot" />}
                    {m.status === 'live' ? 'Live' : 'Ended'}
                  </span>
                </button>
              ))}
            </div>
          </Card>

          {/* Upcoming Meetings */}
          <Card>
            <CardHead icon={Calendar} title="Upcoming Meetings" bgClass="bg-blue-500/10 border border-blue-500/20" colorClass="text-blue-600 dark:text-blue-400" />
            <div className="db-meeting-list">
              {upcomingMeetings.map((m: any) => (
                <div key={m._id} className="db-upcoming-item">
                  <div className={clsx("db-upcoming-indicator", 'bg-blue-500')} />
                  <div className="db-upcoming-info">
                    <p className="db-upcoming-name">{m.title}</p>
                    <p className="db-upcoming-time">{new Date(m.scheduledAt).toLocaleString()}</p>
                  </div>
                  <span className={clsx("db-upcoming-badge", 'bg-blue-500/10', 'text-blue-600')}>
                    <Users size={12} className="mr-1" />
                    {m.participants.length}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </motion.div>

      <motion.div {...fu(0.25)}>
        <div className="db-grid-3">
          <Card>
            <div className="db-card-header">
              <div className="db-card-header-left">
                <div className="db-card-icon-wrapper bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400"><Zap size={16} /></div>
                <span className="db-card-title">Quick Actions</span>
              </div>
            </div>
            <div className="db-quick-grid">
              {QUICK.map(({ label, icon: Icon, to, color, bg, hoverClass }) => (
                <Link key={label} to={to} className={clsx("db-quick-btn", hoverClass)}>
                  <div className={clsx("db-quick-icon-wrapper", bg)}><Icon size={18} className={color} /></div>
                  <span className="db-quick-label">{label}</span>
                </Link>
              ))}
            </div>
          </Card>

          <Card>
            <CardHead icon={CheckSquare} title="My Tasks Overview" linkTo={ROUTES.TASKS} bgClass="bg-emerald-500/10 border border-emerald-500/20" colorClass="text-emerald-600 dark:text-emerald-400" />
            <div className="db-tasks-list">
              {tasksList.map((t: any, i: number) => (
                <div key={i} className={clsx("db-task-item", t.done && "done")}>
                  <div className="db-task-checkbox">{t.done && <CheckSquare size={12} />}</div>
                  <p className="db-task-title">{t.title}</p>
                  <div className={clsx("db-task-dot", t.dot)} />
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="db-card-header">
              <div className="db-card-header-left">
                <div className="db-metric-trend-dot bg-emerald-500 shrink-0" style={{ animation: 'pulseDot 1.5s ease-in-out infinite' }} />
                <span className="db-card-title">Activity Feed</span>
              </div>
            </div>
            <div className="db-activity-list">
              {ACTIVITY.map(({ icon: Icon, text, time, color, bg }) => (
                <div key={text} className="db-activity-item">
                  <div className={clsx("db-activity-icon-wrapper", bg)}><Icon size={16} className={color} /></div>
                  <div className="db-activity-info">
                    <p className="db-activity-text">{text}</p>
                    <p className="db-activity-time">{time}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </motion.div>
    </PageContainer>
  );
}
