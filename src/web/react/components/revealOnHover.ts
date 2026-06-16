// Controls revealed on hover (row action buttons, drag handles) must NEVER hide on
// touch — a touch screen has no hover, so a `group-hover`-only control is
// permanently invisible yet still intercepts taps. `pointer-coarse:` forces it
// visible on touch while keeping the desktop hover-reveal. Apply to the control;
// its container needs the `group` class.
export const REVEAL_ON_HOVER =
  'opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100';
