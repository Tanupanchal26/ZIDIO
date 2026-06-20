import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline' | 'soft' | 'muted';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'icon-xs' | 'icon-sm' | 'icon-md' | 'icon-lg';
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const BASE =
  'relative inline-flex items-center justify-center font-semibold transition-all ' +
  'select-none cursor-pointer outline-none shrink-0 whitespace-nowrap tracking-tight ' +
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none ' +
  'active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2';

const VARIANTS = {
  primary:
    'text-white shadow-[0_1px_3px_rgba(37,99,235,0.2),0_4px_12px_rgba(37,99,235,0.2)] ' +
    'hover:shadow-[0_4px_16px_rgba(37,99,235,0.35)] hover:opacity-90 duration-150',
  secondary:
    'bg-white text-[#334155] border border-[#E2E8F0] ' +
    'shadow-[0_1px_2px_rgba(15,23,42,0.06)] ' +
    'hover:bg-[#F8FAFC] hover:border-[#CBD5E1] duration-150',
  ghost:
    'bg-transparent text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] duration-150',
  danger:
    'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] hover:bg-[#FEE2E2] duration-150',
  success:
    'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] hover:bg-[#D1FAE5] duration-150',
  outline:
    'bg-white text-[#2563EB] border border-[#BFDBFE] hover:bg-[#EFF6FF] duration-150',
  soft:
    'bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE] hover:bg-[#DBEAFE] duration-150',
  muted:
    'bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0] hover:bg-[#E2E8F0] duration-150',
};

const SIZES = {
  xs:       'h-7  px-2.5  text-xs     rounded-lg  gap-1    font-medium',
  sm:       'h-8  px-3    text-[12px] rounded-xl  gap-1.5',
  md:       'h-9  px-4    text-[13px] rounded-xl  gap-2',
  lg:       'h-11 px-5    text-[14px] rounded-xl  gap-2',
  'icon-xs':  'h-7  w-7    text-xs  rounded-lg',
  'icon-sm':  'h-8  w-8    text-xs  rounded-xl',
  'icon-md':  'h-9  w-9    text-xs  rounded-xl',
  'icon-lg':  'h-11 w-11   text-sm  rounded-xl',
};

const PRIMARY_STYLE = { background: 'linear-gradient(135deg,#2563EB,#4F46E5)' };

const Button = ({
  variant = 'primary',
  size = 'md',
  loading,
  leftIcon,
  rightIcon,
  className,
  children,
  disabled,
  style,
  ...rest
}: Props) => (
  <button
    className={clsx(BASE, VARIANTS[variant], SIZES[size], className)}
    disabled={disabled || loading}
    aria-busy={loading}
    style={variant === 'primary' ? { ...PRIMARY_STYLE, ...style } : style}
    {...rest}
  >
    {loading ? (
      <Loader2 size={13} className="animate-spin shrink-0" aria-hidden="true" />
    ) : leftIcon ? (
      <span className="shrink-0 flex items-center" aria-hidden="true">{leftIcon}</span>
    ) : null}
    {children}
    {!loading && rightIcon && (
      <span className="shrink-0 flex items-center" aria-hidden="true">{rightIcon}</span>
    )}
  </button>
);

export default Button;
