// cwip/react — React components, hooks, and headless state primitives (peer
// dependency: react). Importing this subpath requires react in the consuming app
// (declared as an optional peer). It holds three kinds of thing: presentational
// components (Toast/Tooltip/Spinner/InfoHint/ErrorBoundary), generic hooks (see
// ./hooks), and store-agnostic state (createToastStore/useToasts, the confirm
// factory, the persisted-view-state store) — apps bring their own styling/store.
//
// Styling: the styled components are Tailwind-first — they ship utility classes
// that adopt the host app's theme tokens (gray scale, the `dark:` variant, and a
// single themeable brand token `accent`). A Tailwind v4 app must register cwip's
// built dist as a source so those classes get generated (v4 skips node_modules by
// default). The un-trip-able one-liner (covers these components AND cwip/layout's
// grid classes) is:
//   @import "cwip/styles.css";
// or, hand-rolled, `@source` the WHOLE dist — NOT just dist/web/react, which omits
// the layout grid classes in dist/core/layout:
//   @source "../node_modules/cwip/dist";
//
// Theming the brand color: every accent surface (Button's `accent` variant,
// Switch, SegmentedControl, Pagination, Checkbox, the Input/Select/TextArea focus
// ring, DropIndicator, InfoHint's icon) fills/rings with the `accent` token — i.e.
// `--color-accent` / `--color-accent-hover`. Get the emerald default with zero
// config by importing the shipped stylesheet, or define your own to rebrand:
//   @import "cwip/react/theme.css";          // emerald default (see ./theme.css)
//   // …or set --color-accent / --color-accent-hover in your own @theme to rebrand.
//
// Every styled component takes a uniform override surface — `classNames`/`styles`
// (per slot; string/object MERGES, a function REPLACES) and `unstyled` (drop all
// defaults). See ./styling (`StyleableProps`, `resolveClass`, `resolveStyle`,
// `cx`). Spinner is SVG-attribute styled (size/color props); ErrorBoundary is
// logic-only (you supply the fallback UI) — neither needs the class system.
//
// Hover/click help: any Button / ButtonLink / IconButton takes a `tooltip` prop
// (a multiline {@link Tooltip}); FieldLabel takes a `hint` (an {@link InfoHint}
// "ⓘ"). Reach for these to document a control whose label isn't self-evident.
//
// Accessibility — app-wide UI size: call `initUiScale()` once at startup (like a
// theme init, before React mounts, to avoid a flash), then drop a
// `<UiScaleControl />` in your settings. It scales the document root font-size, so
// every rem-based Tailwind utility (cwip's components are rem-first) grows/shrinks
// together — text, icons, and spacing stay in proportion. See ./uiScale.
export * from './charts';
export * from './components';
export * from './confirm';
export * from './createApiHooks';
export * from './ErrorBoundary';
export * from './hooks';
export * from './InfoHint';
export * from './layout';
export * from './nav';
export * from './Spinner';
export * from './search';
export * from './styling';
export * from './Toast';
export * from './Tooltip';
export * from './testReport';
export * from './toastStore';
export * from './uiScale';
export * from './useToasts';
