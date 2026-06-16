// Linear-interpolation quantile over an ASCENDING-sorted numeric array. q is
// clamped to [0,1]. Empty input → 0. Matches the common "type 7" / Excel
// PERCENTILE.INC behaviour (q=0 → min, q=1 → max, q=0.5 → median).
export const quantile = (sortedAsc: number[], q: number): number => {
  const n = sortedAsc.length;
  if (n === 0) return 0;
  if (n === 1) return sortedAsc[0];
  const clamped = q < 0 ? 0 : q > 1 ? 1 : q;
  const pos = clamped * (n - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sortedAsc[lo];
  const frac = pos - lo;
  return sortedAsc[lo] + (sortedAsc[hi] - sortedAsc[lo]) * frac;
};

// Median of an unsorted numeric array (copies + sorts; does not mutate input).
// Empty input → 0.
export const median = (nums: number[]): number => {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  return quantile(sorted, 0.5);
};
