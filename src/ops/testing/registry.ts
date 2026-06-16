import { type Mock, mock } from 'bun:test';

// Keep the internal logic exactly as you had it
const defaultMocks = {
  console: {
    log: () => undefined,
    error: () => undefined,
    warn: () => undefined,
    info: () => undefined,
    debug: () => undefined,
  },
  fs: {
    promises: {
      access: () => Promise.resolve(),
      stat: () => Promise.resolve({ isSymbolicLink: () => false as boolean, isDirectory: () => false as boolean }),
      lstat: () => Promise.resolve({ isSymbolicLink: () => false as boolean, isDirectory: () => false as boolean }),
      readFile: () => Promise.resolve('' as string),
      writeFile: () => Promise.resolve(undefined),
    },
    statSync: () => ({ isSymbolicLink: () => false as boolean, isDirectory: () => false as boolean }),
    lstatSync: () => ({ isSymbolicLink: () => false as boolean, isDirectory: () => false as boolean }),
    existsSync: () => false,
    readFileSync: () => '' as string,
    writeFileSync: () => undefined,
  },
};

const moduleMap: Record<string, string> = {
  fs: 'node:fs',
  console: 'node:console',
};

// --- Singleton Manager ---
class MockRegistry {
  private static instance: MockRegistry;
  public isEnabled = false;
  public registry: Registry;

  private constructor() {
    this.registry = this.createMockRegistry(defaultMocks) as Registry;
  }

  public static getInstance(): MockRegistry {
    if (!MockRegistry.instance) {
      MockRegistry.instance = new MockRegistry();
    }
    return MockRegistry.instance;
  }

  public createMockRegistry = (obj: any): any => {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => {
        if (typeof value === 'function') return [key, mock(value as any)];
        if (typeof value === 'object' && value !== null) return [key, this.createMockRegistry(value)];
        return [key, value];
      }),
    );
  };

  /**
   * The explicit ON switch. Call this once from test setup (preload / beforeAll)
   * BEFORE importing the code under test. Until it runs, node:fs and console keep
   * their real behavior — nothing global is overwritten.
   */
  public enable() {
    if (this.isEnabled) return;

    console.warn('[cwip/testing] System mocks enabled — node:fs and console are now virtualized.');

    // 1. Intercept modules defined in moduleMap
    Object.entries(moduleMap).forEach(([registryKey, moduleName]) => {
      const mocks = (this.registry as any)[registryKey];
      if (!mocks) return;

      mock.module(moduleName, () => {
        const nested: Record<string, any> = {};
        for (const [key, value] of Object.entries(mocks)) {
          if (typeof value === 'object' && value !== null && !('_isMockFunction' in (value as any))) {
            nested[key] = value;
          }
        }
        return { ...mocks, ...nested, default: { ...mocks, ...nested } };
      });
    });

    // 2. Patch global console
    Object.assign(global.console, this.registry.console);

    this.isEnabled = true;
  }
}

let registry: Registry;

// Lazily grab the singleton registry handle so fake()/resetAllMocks() never crash
// on an undefined module-level `registry` if they run before initializeGlobalMocks().
const getRegistry = (): Registry => {
  if (!registry) registry = MockRegistry.getInstance().registry;
  return registry;
};

// Loud guard for the silent-no-op footgun: mutating a registry spy does nothing to
// the code under test unless the spies have actually been wired into node:fs/console
// via enable(). Throw with a fix instead of letting tests run against the real fs.
const assertEnabled = (fnName: string, path: string) => {
  if (!areSystemMocksEnabled()) {
    throw new Error(
      `[cwip/testing] ${fnName}('${path}') was called before system mocks were enabled — ` +
        'the real node:fs is still active, so this override would silently do nothing. ' +
        'Call enableSystemMocks() (or mockManager.enable()) in your test setup first.',
    );
  }
};

// --- Exported API ---

/** True once enableSystemMocks()/enable() has virtualized node:fs and console. */
export const areSystemMocksEnabled = (): boolean => MockRegistry.getInstance().isEnabled;

/**
 * Get a handle to the mock registry WITHOUT overwriting anything. node:fs and
 * console keep their real behavior — importing or calling this has no global side
 * effects. Use enableSystemMocks() when you actually want the overrides on.
 */
export const initializeGlobalMocks = () => {
  const mockManager = MockRegistry.getInstance();
  registry = mockManager.registry;
  return {
    mockManager,
    registry,
  };
};

/**
 * The explicit ON switch — the one call test setup makes before the tests run.
 * Virtualizes node:fs and console process-wide and returns the registry handle.
 * Until this runs, the overrides do not happen.
 */
export const enableSystemMocks = () => {
  const mockManager = MockRegistry.getInstance();
  registry = mockManager.registry;
  mockManager.enable();
  return {
    mockManager,
    registry,
  };
};

/**
 * Override a single registry path (e.g. 'fs.promises.access') for the code under
 * test. Requires system mocks to be enabled first.
 */
export const fake = (path: string, overrides: any) => {
  assertEnabled('fake', path);
  const reg = getRegistry();
  const segments = path.split('.');
  const mockFunc = segments.reduce((obj: any, key) => obj?.[key], reg) as any;
  const defaultGetter = segments.reduce((obj: any, key) => obj?.[key], defaultMocks) as any;

  if (!mockFunc || !defaultGetter) {
    throw new Error(`[Registry] Path ${path} not found.`);
  }

  const implementation = (...args: any[]) => {
    const base = defaultGetter(...args);
    if (base instanceof Promise) {
      return base.then((resolvedBase) => deepMerge(resolvedBase, overrides));
    }
    return deepMerge(base, overrides);
  };

  mockFunc.mockImplementation(implementation);
};

export const fakeReject = (path: string, error: any = new Error('Mocked Error')) => {
  assertEnabled('fakeReject', path);
  const mockFunc = path.split('.').reduce((obj: any, key) => obj?.[key], getRegistry()) as any;
  mockFunc.mockImplementation(() => Promise.reject(error));
};

export const resetAllMocks = (currentRegistry: any = getRegistry(), currentDefaults: any = defaultMocks) => {
  for (const key in currentRegistry) {
    const item = currentRegistry[key];
    const defaultValue = currentDefaults[key];
    if (item?._isMockFunction || (typeof item === 'function' && 'mockImplementation' in item)) {
      item.mockClear();
      item.mockImplementation(defaultValue);
    } else if (typeof item === 'object' && item !== null) {
      resetAllMocks(item, defaultValue);
    }
  }
};

// --- Helper Functions (Private) ---

const deepMerge = (base: any, overrides: any): any => {
  if (typeof overrides !== 'object' || overrides === null || typeof overrides === 'function') return overrides;
  const result = { ...base };
  for (const key in overrides) {
    if (overrides[key] && typeof overrides[key] === 'object' && typeof overrides[key] !== 'function') {
      result[key] = deepMerge(base[key] || {}, overrides[key]);
    } else {
      result[key] = overrides[key];
    }
  }
  return result;
};

type DeepMocked<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? Mock<T[K]> : T[K] extends object ? DeepMocked<T[K]> : T[K];
};
type Registry = DeepMocked<typeof defaultMocks>;
