// cwip/react search — the shared UI for a "universal search": a responsive
// header/top-nav search box ({@link HeaderSearch}) that collapses to an icon on
// narrow screens, plus a routing-agnostic grouped-results renderer
// ({@link SearchResults}) for its dropdown. The matching itself is pure and lives
// in `cwip/search`; these just draw the hits an app produces.
export * from './HeaderSearch';
export * from './SearchResults';
