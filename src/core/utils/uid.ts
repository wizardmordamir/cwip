export const uid = (): string =>
  globalThis.crypto?.randomUUID?.() ??
  `r-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;
