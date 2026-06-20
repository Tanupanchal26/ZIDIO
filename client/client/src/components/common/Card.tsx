import { clsx } from 'clsx';
import type { HTMLAttributes } from 'react';

interface Props extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'bordered' | 'inset' | 'brand' | 'danger' | 'success' | 'warning';
  hover?: boolean;
  interactive?: boolean;
  noPadding?: boolean;
}

const VARIANTS = {
  default:  'bg-white border border-[#EEF0F6]',
  elevated: 'bg-white border border-[#EEF0F6] shadow-[0_4px_16px_rgba(15,23,42,0.07)]',
  bordered: 'bg-white border border-[#E2E8F0]',
  inset:    'bg-[#F8FAFC] border border-[#EEF0F6]',
  brand:    'bg-[#EFF6FF] border border-[#BFDBFE]',
  danger:   'bg-[#FEF2F2] border border-[#FECACA]',
  success:  'bg-[#ECFDF5] border border-[#A7F3D0]',
  warning:  'bg-[#FFFBEB] border border-[#FDE68A]',
};

const SHADOW = '0 1px 3px rgba(15,23,42,0.04),0 4px 16px rgba(15,23,42,0.05)';

const HOVER =
  'cursor-pointer transition-all duration-150 ' +
  'hover:border-[#CBD5E1] hover:shadow-[0_4px_12px_rgba(15,23,42,0.08)] hover:-translate-y-0.5';

const Card = ({
  variant = 'default',
  hover,
  interactive,
  noPadding,
  className,
  children,
  onClick,
  style,
  ...rest
}: Props) => (
  <div
    onClick={onClick}
    role={onClick || interactive ? 'button' : undefined}
    tabIndex={onClick || interactive ? 0 : undefined}
    onKeyDown={
      onClick || interactive
        ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(e as any); } }
        : undefined
    }
    className={clsx(
      'rounded-2xl overflow-hidden',
      VARIANTS[variant],
      !noPadding && 'p-5',
      (hover || interactive || onClick) && HOVER,
      className
    )}
    style={{ boxShadow: SHADOW, ...style }}
    {...rest}
  >
    {children}
  </div>
);

export default Card;
