import React from 'react';

interface TypingIndicatorProps {
  names: string[];
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ names }) => {
  if (!names.length) return null;
  const label = names.length === 1 ? `${names[0]} is typing…` : `${names.slice(0, 2).join(', ')} are typing…`;
  return (
    <div className="flex items-center gap-2 px-5 py-1.5 bg-[var(--color-bg-tertiary)]/40 border-t border-[var(--color-border)]">
      <div className="flex gap-0.5">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)] animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <span className="text-[11px] text-[var(--color-text-muted)]">{label}</span>
    </div>
  );
};
