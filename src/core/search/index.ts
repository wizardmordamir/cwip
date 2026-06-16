// cwip/search — pure, dependency-free helpers for a "universal content search"
// over an app's own data. The app owns its data sources + SQL (per-app: which
// tables, which columns, access rules); these provide the shared text mechanics so
// every app isn't re-implementing — and subtly mis-implementing — the same pieces:
//   • valueToText            flatten any stored value to searchable/display text
//   • buildSnippet / snippetForLabel   excerpt-around-match (the "why it matched")
//   • jsonValuesMatch / firstMatchSnippet / firstNonEmptyValue   search a JSON
//       column's values while EXCLUDING secret keys (so a secret can't trigger a
//       hit or leak into a result) and derive a label
//   • escapeLike / likePattern         safe SQL LIKE patterns (escaped wildcards)
// Browser- and node-safe; no external deps.
export * from './jsonSearch';
export * from './like';
export * from './snippet';
export * from './value';
