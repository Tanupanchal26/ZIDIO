import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import Badge from '../components/common/Badge';
import Card from '../components/common/Card';
import { analyticsService } from '../services/analytics.service';

const TP = ({ active, payload, label }: any) => active && payload?.length ? (
  <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 shadow-md text-[12px] backdrop-blur-md">
    <p className="font-bold text-[var(--color-text)] mb-1">{label}</p>
    {payload.map((p: any) => <p key={p.name} style={{ color: p.color }} className="font-semibold">{p.name}: {p.value}</p>)}
  </div>
) : null;

const fu = (delay = 0) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: [0.25, 1, 0.5, 1] as const, delay },
});

const Analytics = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => analyticsService.getAnalytics().then(res => res.data.data),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 size={32} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !data) {
    return <div className="text-red-500">Failed to load analytics data.</div>;
  }

  const { weekly, taskData, productivity, engagement } = data;

  return (
    <div className="flex flex-col gap-6 font-sans text-[var(--color-text)]">
      <motion.div {...fu(0)}>
        <h1 className="text-[1.375rem] font-bold text-[var(--color-text)] tracking-tight">Analytics</h1>
        <p className="text-[13px] text-[var(--color-text-secondary)] mt-0.5 font-medium">Team performance and engagement insights</p>
      </motion.div>

      {/* KPI Row */}
      <motion.div {...fu(0.06)} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {engagement.map(({ label, value, trend, up }: any) => (
          <Card key={label} variant="default" className="p-5 flex flex-col justify-between">
            <div>
              <p className="text-[12px] text-[var(--color-text-secondary)] mb-2 leading-snug font-semibold">{label}</p>
              <p className="text-[1.75rem] font-bold text-[var(--color-text)] leading-none tracking-tight">{value}</p>
            </div>
            <div
              className="inline-flex items-center gap-1 mt-3.5 text-[11px] font-bold rounded-full px-2 py-0.5 w-max"
              style={{ color: up ? '#059669' : '#DC2626', background: up ? 'rgba(5,150,105,0.1)' : 'rgba(220,38,38,0.1)' }}
            >
              {up ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
              {trend}
            </div>
          </Card>
        ))}
      </motion.div>

      {/* Charts Row 1 */}
      <motion.div {...fu(0.1)} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card variant="default" className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[13.5px] font-bold text-[var(--color-text)]">Meetings & Tasks per Week</h2>
            <Badge variant="default">Last 7 days</Badge>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={weekly} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="gM" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#AFA9B4" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#AFA9B4" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gT" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fill: '#5E5E5C', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#5E5E5C', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<TP />} />
              <Area type="monotone" dataKey="meetings" stroke="#AFA9B4" fill="url(#gM)" strokeWidth={2.5} name="Meetings" />
              <Area type="monotone" dataKey="tasks" stroke="#10B981" fill="url(#gT)" strokeWidth={2.5} name="Tasks" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card variant="default" className="p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-[13.5px] font-bold text-[var(--color-text)] mb-4">Task Completion</h2>
            <div className="flex items-center justify-center mb-4">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={taskData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="value">
                    {taskData.map((e: any, i: number) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip content={<TP />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="flex flex-col gap-2.5">
            {taskData.map((d: any) => (
              <div key={d.name} className="flex items-center justify-between text-[12px]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                  <span className="text-[var(--color-text-secondary)] font-semibold">{d.name}</span>
                </div>
                <span className="font-bold text-[var(--color-text)]">{d.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Productivity Chart */}
      <motion.div {...fu(0.14)}>
        <Card variant="default" className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[13.5px] font-bold text-[var(--color-text)]">Productivity Score Trend</h2>
            <span className="text-[1.5rem] font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              87%
            </span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={productivity} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <XAxis dataKey="week" tick={{ fill: '#5E5E5C', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[60, 100]} tick={{ fill: '#5E5E5C', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<TP />} />
              <Bar dataKey="score" name="Score" fill="#AFA9B4" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </motion.div>
    </div>
  );
};

export default Analytics;
