import type { CSSProperties } from 'react';

export interface SpinnerProps {
  /** Diameter in px (default 24). */
  size?: number;
  /** Stroke color (default `currentColor`, so it inherits text color). */
  color?: string;
  /** Stroke width in px (default 2). */
  thickness?: number;
  /** Accessible label (default `'Loading'`). */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * A dependency-free loading spinner. Animation is done with SVG `animateTransform`
 * (not CSS), so it spins without any stylesheet — drop it in anywhere. Sizing and
 * color are props; color defaults to `currentColor` so it matches surrounding text.
 *
 *   <Spinner /> · <Spinner size={48} color="#06f} />
 */
export const Spinner = ({
  size = 24,
  color = 'currentColor',
  thickness = 2,
  label = 'Loading',
  className,
  style,
}: SpinnerProps) => {
  const r = (size - thickness) / 2;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="status"
      aria-label={label}
      className={className}
      style={style}
    >
      <title>{label}</title>
      <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeOpacity={0.25} strokeWidth={thickness} />
      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={thickness}
        strokeLinecap="round"
        strokeDasharray={`${circumference * 0.25} ${circumference}`}
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from={`0 ${c} ${c}`}
          to={`360 ${c} ${c}`}
          dur="0.8s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  );
};
