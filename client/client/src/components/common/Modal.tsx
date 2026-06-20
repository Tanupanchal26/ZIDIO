import { useEffect, useRef, useId } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  hideClose?: boolean;
  footer?: React.ReactNode;
}

const SIZES = { sm: 'max-w-sm', md: 'max-w-[520px]', lg: 'max-w-2xl', xl: 'max-w-4xl', full: 'max-w-[90vw]' };

const Modal = ({ open, onClose, title, description, children, size = 'md', hideClose, footer }: Props) => {
  const titleId  = useId();
  const descId   = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && open) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => closeRef.current?.focus(), 50);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 'var(--z-modal)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-describedby={description ? descId : undefined}
        >
          <motion.div
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />
          <motion.div
            className={clsx(
              'relative w-full flex flex-col bg-white rounded-2xl overflow-hidden max-h-[90dvh]',
              'border border-[#EEF0F6]',
              SIZES[size]
            )}
            style={{ boxShadow: '0 20px 60px rgba(15,23,42,0.15),0 0 0 1px rgba(15,23,42,0.06)' }}
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1,    y: 0 }}
            exit={{   opacity: 0, scale: 0.98,  y: 4 }}
            transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
          >
            {(title || !hideClose) && (
              <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-[#F3F4F8] shrink-0">
                <div className="flex-1 pr-4">
                  {title && (
                    <h2 id={titleId} className="text-[15px] font-semibold text-[#0F172A] tracking-tight">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p id={descId} className="text-[13px] text-[#64748B] mt-1 leading-relaxed">
                      {description}
                    </p>
                  )}
                </div>
                {!hideClose && (
                  <button
                    ref={closeRef}
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#64748B] transition-colors shrink-0"
                    aria-label="Close dialog"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-6 min-h-0">{children}</div>
            {footer && (
              <div className="shrink-0 border-t border-[#F3F4F8] px-6 py-4 flex items-center justify-end gap-3 bg-[#FAFBFD]">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
