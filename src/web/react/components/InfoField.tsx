import type { ReactNode } from 'react';

// A compact labeled information field: small muted label over a value with
// optional sub-text. Used in status cards, detail panels, and capacity dashboards
// where multiple key/value pairs sit side-by-side in a flex row. `min-w-0` +
// `break-words` on the inner elements prevent overflow when values are longer than
// the containing flex column's natural width.
export const InfoField = ({
  label,
  value,
  sub,
  className,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  className?: string;
}) => (
  <div className={`min-w-0 ${className ?? ''}`}>
    <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</div>
    <div className="min-w-0 break-words font-medium leading-snug text-gray-900 dark:text-gray-100">{value}</div>
    {sub != null && sub !== false && sub !== '' && (
      <div className="mt-0.5 min-w-0 break-words text-xs text-gray-500 dark:text-gray-400">{sub}</div>
    )}
  </div>
);
