import React, { ReactNode, useEffect } from 'react';
import ReactDOM from 'react-dom';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
};

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children, className = '' }) => {
  // Disable background scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50" onClick={onClose}>
      <div
        className={`bg-[var(--color-surface)] rounded-xl shadow-lg max-w-lg w-full p-6 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h2 className="text-lg font-semibold mb-4 text-[var(--color-text)]">{title}</h2>}
        {children}
      </div>
    </div>,
    document.body
  );
};
