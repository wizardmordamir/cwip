/**
 * Renders a millisecond duration as a compact, human-readable string:
 *
 *   formatDuration(950)      // '950ms'
 *   formatDuration(1500)     // '1s'
 *   formatDuration(90_000)   // '1m 30s'
 *   formatDuration(3_661_000)// '1h 1m 1s'
 *
 * Sub-second durations are shown in milliseconds; from one second up the result
 * is composed of the largest non-zero units (days, hours, minutes, seconds),
 * dropping any leading and trailing zero units. Negative inputs are treated as 0.
 */
export const formatDuration = (ms: number): string => {
  if (!Number.isFinite(ms) || ms <= 0) {
    return '0ms';
  }

  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }

  const totalSeconds = Math.round(ms / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (seconds) parts.push(`${seconds}s`);

  return parts.join(' ');
};
