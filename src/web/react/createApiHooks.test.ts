import { describe, expect, it } from 'bun:test';
import { createApiHooks } from './createApiHooks';

// The hooks themselves drive TanStack Query + React render, which cwip has no DOM
// test env for (consistent with the other cwip/react hooks). The behaviour is
// covered by the consuming apps' tests/e2e; here we assert the factory shape.
describe('createApiHooks', () => {
  it('returns useApiQuery and useApiMutation bound to the injected deps', () => {
    const hooks = createApiHooks<null>({ useClient: () => null });
    expect(typeof hooks.useApiQuery).toBe('function');
    expect(typeof hooks.useApiMutation).toBe('function');
  });

  it('accepts an optional toaster without throwing at construction', () => {
    const hooks = createApiHooks({
      useClient: () => ({ request: async () => ({}) }),
      useToaster: () => ({ success: () => {}, error: () => {} }),
    });
    expect(hooks).toHaveProperty('useApiQuery');
    expect(hooks).toHaveProperty('useApiMutation');
  });
});
