import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  /**
   * sm   — max-w-3xl   (forms, settings-style single-column pages)
   * default — max-w-7xl  (standard app pages)
   * full — max-w-full  (full-bleed layouts like meeting room)
   */
  size?: 'sm' | 'default' | 'full';
}

export const PageContainer = ({ children, className, size = 'default' }: PageContainerProps) => {
  const maxWidthClass = {
    sm:      'max-w-3xl',
    default: 'max-w-7xl',
    full:    'max-w-full',
  }[size];

  return (
    <div className={clsx('w-full mx-auto px-4 sm:px-6 lg:px-8', maxWidthClass, className)}>
      {children}
    </div>
  );
};
