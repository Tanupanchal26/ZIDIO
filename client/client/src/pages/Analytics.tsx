import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import Badge from '../components/common/Badge';

const WEEKLY = [
  { day: 'Mon', meetings: 4, tasks: 8 },  { day: 'Tue', meetings: 6, tasks: 12 },
  { day: 'Wed', meetings: 3, tasks: 6 },  { day: 'Thu', meetings: 8, tasks: 15 },
  { day: 'Fri', meetings: 5, tasks: 10 }, { day: 'Sat', meetings: 2, tasks: 3 },
  { day: 'Sun', meetings: 1, tasks: 2 },
];

const TASK_DATA = [
  { name: 'Done',        value: 47, color: '#10B981' },
  { name: 'In Progress', value: 18, color: '#6366F1' },
  { name: 'To Do',       value: 12, color: '#94A3B8' },
];

const PRODUCTIVITY = [
  { week: 'W1', score: 72 }, { week: 'W2', score: 78 }, { week: 'W3', score: 83 },
  { week: 'W4', score: 80 }, { week: 'W5', score: 87 }, { week: 'W6', score: 91 },
];

const ENGAGEMENT = [
  { label: 'Avg Meeting Duration',    value: '47 min', trend: '+5 min', up: true },
  { label: 'Participation Rate',      value: '94%',    trend: '+2%',   up: true },
  { label: 'AI Summary Usage',        value: '78%',    trend: '+12%',  up: true },
  { label: 'Action Item Completion',  value: '61%',    trend: '-4%',   up: false },
];

const SHADOW = '0 1px 3px rgba(15,23,42,0.04),0 4px 16px rgba(15,23,42,0.05)';
const CARD_STYLE = { background: '#fff', border: '1px solid #EEF0F6', borderRadius: 16, boxShadow: SHADOW };

const TP = ({ active, payload, label }: any) => active && payload?.length ? (
  <div className="bg-white border border-[#EEF0F6] rounded-xl px-3.5 py-2.5 shadow-lg text-[12px]">
    <p className="font-semibold text-[#0F172A] mb-1">{label}</p>
    {payload.map((p: any) => <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</p>)}
  </div>
) : null;

const fu = (delay = 0) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: [0.25, 1, 0.5, 1] as const, delay },
});

const Analytics = () => (
  <div className="flex flex-col gap-6">
    <motion.div {...fu(0)}>
      <h1 className="text-[1.375rem] font-bold text-[#0F172A] tracking-tight">Analytics</h1>
      <p className="text-[13px] text-[#64748B] mt-0.5">Team performance and engagement insights</p>
    </motion.div>

    {/* KPI Row */}
    <motion.div {...fu(0.06)} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {ENGAGEMENT.map(({ label, value, trend, up }) => (
        <div key={label} style={CARD_STYLE} className="p-5">
          <p className="text-[12px] text-[#64748B] mb-2 leading-snug">{label}</p>
          <p className="text-[1.75rem] font-bold text-[#0F172A] leading-none tracking-tight">{value}</p>
          <div
            className="inline-flex items-center gap-1 mt-2.5 text-[11px] font-semibold rounded-full px-2 py-0.5"
            style={{ color: up ? '#059669' : '#DC2626', background: up ? '#DCFCE7' : '#FEE2E2' }}
          >
            {up ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
            {trend}
          </div>
        </div>
      ))}
    </motion.div>

    {/* Charts Row 1 */}
    <motion.div {...fu(0.1)} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div style={CARD_STYLE} className="lg:col-span-2 p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[13.5px] font-semibold text-[#0F172A]">Meetings & Tasks per Week</h2>
          <Badge variant="default">Last 7 days</Badge>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={WEEKLY} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="gM" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gT" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#10B981" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<TP />} />
            <Area type="monotone" dataKey="meetings" stroke="#6366F1" fill="url(#gM)" strokeWidth={2} name="Meetings" />
            <Area type="monotone" dataKey="tasks"    stroke="#10B981" fill="url(#gT)" strokeWidth={2} name="Tasks" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={CARD_STYLE} className="p-5">
        <h2 className="text-[13.5px] font-semibold text-[#0F172A] mb-4">Task Completion</h2>
        <div className="flex items-center justify-center mb-4">
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={TASK_DATA} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="value">
                {TASK_DATA.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip content={<TP />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col gap-2.5">
          {TASK_DATA.map(d => (
            <div key={d.name} className="flex items-center justify-between text-[12px]">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                <span className="text-[#64748B]">{d.name}</span>
              </div>
              <span className="font-semibold text-[#0F172A]">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>

    {/* Productivity Chart */}
    <motion.div {...fu(0.14)} style={CARD_STYLE} className="p-5">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[13.5px] font-semibold text-[#0F172A]">Productivity Score Trend</h2>
        <span
          className="text-[1.5rem] font-bold tracking-tight"
          style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', WebkitBackgroundClip: 'text', color: 'transparent' }}
        >
          87%
        </span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={PRODUCTIVITY} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
          <XAxis dataKey="week" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis domain={[60, 100]} tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={<TP />} />
          <Bar dataKey="score" name="Score" fill="#6366F1" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  </div>
);

export default Analytics;
