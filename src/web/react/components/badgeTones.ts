export type BadgeTone = 'neutral' | 'emerald' | 'sky' | 'cyan' | 'amber' | 'purple' | 'rose' | 'slate';

/** Soft pill colors for {@link Badge}, covering light + dark mode. */
export const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  sky: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  rose: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  slate: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
};
