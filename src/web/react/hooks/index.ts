// cwip/react hooks — generic, app-agnostic React hooks (peer dependency: react).
// DOM-effect glue (Escape, resize, keyboard inset, auto-size) plus a few hooks
// whose non-trivial logic is extracted into pure, testable helpers
// (`paginationRange`, `compareSortValues`, `computeReorder`).
export * from './createLocalStorageViewStore';
export * from './useAutoSizeTextarea';
export * from './useCrossContainerDrag';
export * from './useDebouncedValue';
export * from './useDiscardGuard';
export * from './useDismissibleItems';
export * from './useDragReorder';
export * from './useEscapeKey';
export * from './useKeyboardInset';
export * from './useKeyDown';
export * from './useOnlineStatus';
export * from './usePagination';
export * from './usePersistedViewState';
export * from './useTableSort';
export * from './useWindowResize';
