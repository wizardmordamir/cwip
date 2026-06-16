// cwip/health — a framework-agnostic, pluggable health-check registry.
//
// Apps register named checks (each yielding a rich { status, detail, remediation }
// result); `runHealthChecks` / a registry's `.run()` aggregates them into a
// report you can serve to an admin console, alert on, or gate readiness with.
// No Express/DB/logger coupling — the opposite of a hardcoded health route.
export * from './checks';
export * from './registry';
export * from './types';
