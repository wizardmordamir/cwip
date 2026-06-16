// cwip/react UI scale — an app-wide, persisted "UI size" accessibility control.
// `initUiScale()` on boot, `useUiScale()` to read/control, `<UiScaleControl />` for
// the picker. Everything scales via the document root font-size, so rem-based
// Tailwind utilities grow/shrink proportionally and the layout stays intact.
export * from './scale';
export * from './UiScaleControl';
export * from './uiScaleStore';
export * from './useUiScale';
