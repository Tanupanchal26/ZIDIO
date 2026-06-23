import React, { useState } from 'react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import { motion } from 'framer-motion';
import { 
  BarChart2, Filter, ChevronDown, Calendar, Clock, CheckSquare, Mail, 
  TrendingUp, TrendingDown, Users, CheckCircle, DollarSign, ArrowRight
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';

// Mock Data
const talkTimeData = [
  { name: 'You', value: 32, time: '5h 59m', color: '#4F46E5' },
  { name: 'Team Members', value: 28, time: '5h 14m', color: '#6366F1' },
  { name: 'Clients', value: 20, time: '3h 44m', color: '#10B981' },
  { name: 'Others', value: 12, time: '2h 15m', color: '#F59E0B' },
  { name: 'Low Participation', value: 8, time: '1h 30m', color: '#9CA3AF' }
];

const sentimentData = [
  { day: 'May 12', positive: 65, neutral: 25, negative: 10 },
  { day: 'May 13', positive: 55, neutral: 35, negative: 5 },
  { day: 'May 14', positive: 65, neutral: 20, negative: 15 },
  { day: 'May 15', positive: 55, neutral: 30, negative: 15 },
  { day: 'May 16', positive: 70, neutral: 20, negative: 10 },
  { day: 'May 17', positive: 65, neutral: 30, negative: 5 },
  { day: 'May 18', positive: 75, neutral: 15, negative: 10 }
];

const effectivenessData = [
  { day: 'May 12', score: 55 },
  { day: 'May 13', score: 68 },
  { day: 'May 14', score: 70 },
  { day: 'May 15', score: 55 },
  { day: 'May 16', score: 72 },
  { day: 'May 17', score: 85 },
  { day: 'May 18', score: 87 }
];

const roiData = [
  { day: '1', value: 20000 },
  { day: '2', value: 22000 },
  { day: '3', value: 19000 },
  { day: '4', value: 23000 },
  { day: '5', value: 25000 },
  { day: '6', value: 22000 },
  { day: '7', value: 27000 },
  { day: '8', value: 26000 },
  { day: '9', value: 28750 }
];

const fu = (delay = 0) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: [0.25, 1, 0.5, 1] as const, delay },
});

export default function Analytics() {
  return (
    <div className="flex flex-col gap-6 font-sans text-[var(--color-text)] pb-10">
      
      {/* Header Row */}
      <motion.div {...fu(0)} className="flex items-center justify-between flex-wrap gap-4 bg-[var(--color-surface)] p-5 rounded-2xl border border-[var(--color-border)]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <BarChart2 size={24} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Analytics Hub</h1>
            <p className="text-[13px] text-[var(--color-text-secondary)] font-medium mt-0.5">Track meeting performance, engagement and outcomes.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg text-sm font-semibold hover:bg-[var(--color-border)] transition-colors">
            May 12 – May 18, 2024 <ChevronDown size={14} className="text-[var(--color-text-secondary)]" />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg text-sm font-semibold hover:bg-[var(--color-border)] transition-colors">
            <Filter size={14} /> Filters
          </button>
        </div>
      </motion.div>

      {/* KPI Row */}
      <motion.div {...fu(0.05)} className="grid grid-cols-1 md:grid-cols-5 gap-4">
        
        {/* Effectiveness Score */}
        <Card className="p-5 flex items-center gap-4 col-span-1 md:col-span-1 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl shadow-sm">
          <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path className="text-indigo-100 dark:text-indigo-900/30" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.5" />
              <path className="text-indigo-600 dark:text-indigo-500" strokeDasharray="87, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.5" />
            </svg>
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold leading-none">87</span>
              <span className="text-[9px] text-[var(--color-text-secondary)] font-bold">/100</span>
            </div>
          </div>
          <div>
            <p className="text-[12px] font-semibold text-[var(--color-text)] mb-1">Meeting Effectiveness Score</p>
            <p className="text-[14px] font-bold text-emerald-600 dark:text-emerald-500 mb-1">Great</p>
            <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-500 flex items-center gap-1">
              <TrendingUp size={10} /> 12% <span className="text-[var(--color-text-secondary)]">vs last 7 days</span>
            </p>
          </div>
        </Card>

        {/* Total Meetings */}
        <Card className="p-5 flex flex-col justify-between border border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400"><Calendar size={14} /></div>
            <p className="text-[12px] font-bold">Total Meetings</p>
          </div>
          <div>
            <p className="text-3xl font-bold mb-1">28</p>
            <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-500 flex items-center gap-1">
              <TrendingUp size={10} /> 8% <span className="text-[var(--color-text-secondary)]">vs last 7 days</span>
            </p>
          </div>
        </Card>

        {/* Avg Duration */}
        <Card className="p-5 flex flex-col justify-between border border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400"><Clock size={14} /></div>
            <p className="text-[12px] font-bold">Avg. Meeting Duration</p>
          </div>
          <div>
            <p className="text-3xl font-bold mb-1">46 <span className="text-lg font-semibold text-[var(--color-text-secondary)]">min</span></p>
            <p className="text-[11px] font-medium text-rose-600 dark:text-rose-500 flex items-center gap-1">
              <TrendingDown size={10} /> 6% <span className="text-[var(--color-text-secondary)]">vs last 7 days</span>
            </p>
          </div>
        </Card>

        {/* Action Items */}
        <Card className="p-5 flex flex-col justify-between border border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400"><CheckSquare size={14} /></div>
            <p className="text-[12px] font-bold">Action Items Created</p>
          </div>
          <div>
            <p className="text-3xl font-bold mb-1">156</p>
            <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-500 flex items-center gap-1">
              <TrendingUp size={10} /> 15% <span className="text-[var(--color-text-secondary)]">vs last 7 days</span>
            </p>
          </div>
        </Card>

        {/* Follow ups */}
        <Card className="p-5 flex flex-col justify-between border border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400"><Mail size={14} /></div>
            <p className="text-[12px] font-bold">Meetings with Follow-ups</p>
          </div>
          <div>
            <p className="text-3xl font-bold mb-1">92%</p>
            <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-500 flex items-center gap-1">
              <TrendingUp size={10} /> 9% <span className="text-[var(--color-text-secondary)]">vs last 7 days</span>
            </p>
          </div>
        </Card>

      </motion.div>

      {/* Charts Row */}
      <motion.div {...fu(0.1)} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Talk-time Distribution */}
        <Card className="p-6 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl shadow-sm flex flex-col">
          <h2 className="text-[14px] font-bold mb-4">Talk-time Distribution</h2>
          <div className="flex-1 flex items-center justify-between">
            <div className="relative w-[160px] h-[160px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={talkTimeData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                    {talkTimeData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] text-[var(--color-text-secondary)] font-semibold">Total Talk Time</span>
                <span className="text-[15px] font-bold">18h 42m</span>
              </div>
            </div>
            <div className="flex flex-col gap-3 pl-4">
              {talkTimeData.map((d) => (
                <div key={d.name} className="flex items-center gap-2 text-[12px]">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: d.color }} />
                  <div>
                    <span className="font-bold text-[var(--color-text)]">{d.name}</span>
                    <p className="text-[10px] text-[var(--color-text-secondary)] font-semibold">{d.value}% <span className="font-normal">({d.time})</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button className="text-[13px] font-bold text-indigo-600 dark:text-indigo-400 mt-6 flex items-center gap-1 hover:underline w-max">
            View full report <ArrowRight size={14} />
          </button>
        </Card>

        {/* Sentiment Trend */}
        <Card className="p-6 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[14px] font-bold">Sentiment Trend</h2>
            <div className="flex items-center gap-4 text-[11px] font-bold">
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Positive</span>
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-400" /> Neutral</span>
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500" /> Negative</span>
            </div>
          </div>
          <div className="flex-1 h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sentimentData} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="day" tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} ticks={[0, 25, 50, 75, 100]} tickFormatter={v => `${v}%`} />
                <Line type="monotone" dataKey="positive" stroke="#10B981" strokeWidth={2} dot={{ r: 3, fill: '#10B981', strokeWidth: 0 }} />
                <Line type="monotone" dataKey="neutral" stroke="#FBBF24" strokeWidth={2} dot={{ r: 3, fill: '#FBBF24', strokeWidth: 0 }} />
                <Line type="monotone" dataKey="negative" stroke="#F43F5E" strokeWidth={2} dot={{ r: 3, fill: '#F43F5E', strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <button className="text-[13px] font-bold text-indigo-600 dark:text-indigo-400 mt-6 flex items-center gap-1 hover:underline w-max">
            View sentiment insights <ArrowRight size={14} />
          </button>
        </Card>

        {/* Effectiveness Over Time */}
        <Card className="p-6 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl shadow-sm flex flex-col">
          <h2 className="text-[14px] font-bold mb-6">Meeting Effectiveness Over Time</h2>
          <div className="flex-1 h-[160px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={effectivenessData} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="gEffect" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818CF8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#818CF8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="day" tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} ticks={[0, 25, 50, 75, 100]} />
                <Area type="monotone" dataKey="score" stroke="#6366F1" fill="url(#gEffect)" strokeWidth={2.5} activeDot={{ r: 6, fill: '#fff', stroke: '#6366F1', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
            {/* Custom Tooltip Overlay for May 18 point */}
            <div className="absolute right-[20px] top-[30px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-2 shadow-sm pointer-events-none">
              <p className="text-[9px] font-bold text-[var(--color-text-secondary)]">May 18</p>
              <p className="text-[14px] font-bold text-indigo-600 dark:text-indigo-400">87 <span className="text-[10px] text-[var(--color-text-secondary)]">/100</span></p>
            </div>
          </div>
          <button className="text-[13px] font-bold text-indigo-600 dark:text-indigo-400 mt-6 flex items-center gap-1 hover:underline w-max">
            View trends <ArrowRight size={14} />
          </button>
        </Card>

      </motion.div>

      {/* Bottom Row */}
      <motion.div {...fu(0.15)} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ROI Overview */}
        <Card className="col-span-1 lg:col-span-2 p-6 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[14px] font-bold">ROI Overview</h2>
            <button className="flex items-center gap-1 px-3 py-1.5 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-md text-[11px] font-semibold hover:bg-[var(--color-border)] transition-colors">
              This Month <ChevronDown size={12} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-[var(--color-surface-2)] rounded-xl p-4 flex justify-between items-center">
              <div>
                <p className="text-[11px] font-bold text-[var(--color-text-secondary)] mb-1">Time Saved</p>
                <p className="text-2xl font-bold mb-1">38.6 <span className="text-[13px] text-[var(--color-text-secondary)]">hrs</span></p>
                <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-500 flex items-center gap-1"><TrendingUp size={10} /> 18% <span className="text-[var(--color-text-secondary)]">vs last month</span></p>
              </div>
              <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400"><Clock size={18} /></div>
            </div>
            <div className="bg-[var(--color-surface-2)] rounded-xl p-4 flex justify-between items-center">
              <div>
                <p className="text-[11px] font-bold text-[var(--color-text-secondary)] mb-1">Cost Savings</p>
                <p className="text-2xl font-bold mb-1">$12,450</p>
                <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-500 flex items-center gap-1"><TrendingUp size={10} /> 14% <span className="text-[var(--color-text-secondary)]">vs last month</span></p>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-500"><DollarSign size={18} /></div>
            </div>
            <div className="bg-[var(--color-surface-2)] rounded-xl p-4 flex justify-between items-center">
              <div>
                <p className="text-[11px] font-bold text-[var(--color-text-secondary)] mb-1">Productivity Gain</p>
                <p className="text-2xl font-bold mb-1">23%</p>
                <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-500 flex items-center gap-1"><TrendingUp size={10} /> 11% <span className="text-[var(--color-text-secondary)]">vs last month</span></p>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-500"><TrendingUp size={18} /></div>
            </div>
          </div>

          <div className="flex items-end justify-between flex-1">
            <div className="mb-2">
              <p className="text-[12px] font-bold">ROI Impact</p>
              <p className="text-[10px] text-[var(--color-text-secondary)] font-semibold mb-3">Based on time saved and productivity gain</p>
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">$28,750</p>
              <p className="text-[11px] font-semibold text-[var(--color-text-secondary)]">Total Impact</p>
            </div>
            <div className="w-2/3 h-[80px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={roiData} margin={{ top: 5, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="gRoi" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="value" stroke="#6366F1" fill="url(#gRoi)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <button className="text-[13px] font-bold text-indigo-600 dark:text-indigo-400 mt-6 flex items-center gap-1 hover:underline w-max">
            View ROI dashboard <ArrowRight size={14} />
          </button>
        </Card>

        {/* Top Insights */}
        <Card className="p-6 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl shadow-sm flex flex-col">
          <h2 className="text-[14px] font-bold mb-6">Top Insights</h2>
          
          <div className="flex-1 flex flex-col gap-4">
            
            {/* Insight 1 */}
            <div className="flex gap-3 p-3.5 bg-[var(--color-surface-2)] rounded-xl border border-[var(--color-border)]">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                <BarChart2 size={14} className="text-white" />
              </div>
              <div>
                <p className="text-[12.5px] font-bold mb-1 leading-snug">Your team's meeting effectiveness improved by 12%</p>
                <p className="text-[11px] text-[var(--color-text-secondary)] font-medium leading-snug">Great job! Keep maintaining focused discussions.</p>
              </div>
            </div>

            {/* Insight 2 */}
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center shrink-0 mt-1">
                <Users size={14} className="text-white" />
              </div>
              <div>
                <p className="text-[12.5px] font-bold mb-1 leading-snug">Client meetings have the highest positive sentiment (82%)</p>
                <p className="text-[11px] text-[var(--color-text-secondary)] font-medium leading-snug">Keep up the excellent client engagement.</p>
              </div>
            </div>

            {/* Insight 3 */}
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center shrink-0 mt-1">
                <Clock size={14} className="text-white" />
              </div>
              <div>
                <p className="text-[12.5px] font-bold mb-1 leading-snug">Longer meetings ({'>'} 60 min) show 23% lower effectiveness</p>
                <p className="text-[11px] text-[var(--color-text-secondary)] font-medium leading-snug">Consider keeping meetings shorter and more focused.</p>
              </div>
            </div>

            {/* Insight 4 */}
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shrink-0 mt-1">
                <CheckCircle size={14} className="text-white" />
              </div>
              <div>
                <p className="text-[12.5px] font-bold mb-1 leading-snug">92% of meetings have follow-ups</p>
                <p className="text-[11px] text-[var(--color-text-secondary)] font-medium leading-snug">Excellent! Your team is great at driving actions.</p>
              </div>
            </div>

          </div>

          <button className="text-[13px] font-bold text-indigo-600 dark:text-indigo-400 mt-6 flex items-center gap-1 hover:underline w-max">
            View all insights <ArrowRight size={14} />
          </button>
        </Card>

      </motion.div>

    </div>
  );
}
