import { clsx } from 'clsx';

type Variant = 'default' | 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'purple' | 'outline' | 'live' | 'ai' | 'recording';

const STYLES: Record<Variant, string> = {
  default:   'bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]',
  primary:   'bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]',
  success:   'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]',
  danger:    'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]',
  warning:   'bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]',
  info:      'bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]',
  purple:    'bg-[#F5F3FF] text-[#7C3AED] border border-[#DDD6FE]',
  outline:   'bg-transparent text-[#64748B] border border-[#E2E8F0]',
  live:      'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]',
  ai:        'bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]',
  recording: 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]',
};

const DOT_COLOR: Partial<Record<Variant, string>> = {
  success: 'bg-[#10B981]', danger: 'bg-[#EF4444]', warning: 'bg-[#F59E0B]',
  primary: 'bg-[#3B82F6]', info: 'bg-[#3B82F6]', live: 'bg-[#10B981]', recording: 'bg-[#EF4444]',
};

interface Props {
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
  pulse?: boolean;
  size?: 'sm' | 'md';
}

const Badge = ({ variant = 'default', children, className, dot, pulse, size = 'sm' }: Props) => (
  <span
    className={clsx(
      'inline-flex items-center gap-1.5 rounded-full font-semibold tracking-tight',
      size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-[12px]',
      STYLES[variant],
      className
    )}
  >
    {dot && (
      <span className="relative flex h-1.5 w-1.5 shrink-0" aria-hidden="true">
        {pulse && (
          <span className={clsx('animate-ping absolute inline-flex h-full w-full rounded-full opacity-60', DOT_COLOR[variant] || 'bg-current')} />
        )}
        <span className={clsx('relative inline-flex rounded-full h-1.5 w-1.5', DOT_COLOR[variant] || 'bg-current')} />
      </span>
    )}
    {children}
  </span>
);

export default Badge;
