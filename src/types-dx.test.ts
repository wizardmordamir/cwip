// Type-level regression guard for the curried-generic DX fixes. These assertions
// are checked by `tsc` (the typecheck step); the runtime body is trivial. If a
// curried export ever monomorphizes back to `unknown`/`any`, these stop compiling.
import { describe, expect, it } from 'bun:test';
import { difference, filterCurried, findCurried, includes, map, pluck, some, splice } from './core/array';
import { assocPath, getValue, mergeObjects, mergeObjectsDeep, path } from './core/object';
import { allKeysExist, getMissingKeys } from './core/validation';

// Equality helper (Expect<Equal<A, B>>) — compile error if A and B differ.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

// map — generic survives, both call styles infer
const mapBoth = map((n: number) => n.toFixed(2), [1, 2, 3]); // string[]
const mapCurried = map((n: number) => n.toFixed(2))([1, 2, 3]); // string[]
type _map2 = Expect<Equal<typeof mapBoth, string[]>>;
type _map3 = Expect<Equal<typeof mapCurried, string[]>>;

// filterCurried — element type survives (not unknown); narrows via guard overload
const evens = filterCurried((n: number) => n % 2 === 0, [1, 2, 3, 4]);
type _filter = Expect<Equal<typeof evens, number[]>>;
const onlyStrings = filterCurried(
  (x: string | number, _i: number, _a: (string | number)[]): x is string => typeof x === 'string',
  ['a', 1, 'b'],
);
type _filterGuard = Expect<Equal<typeof onlyStrings, string[]>>;
const found = findCurried((n: number) => n > 1, [1, 2, 3]);
type _find = Expect<Equal<typeof found, number | undefined>>;

// some / includes / splice
const someBool = some((n: number) => n > 0, [1, 2]);
type _some = Expect<Equal<typeof someBool, boolean>>;
const inc = includes(2, [1, 2, 3]);
type _inc = Expect<Equal<typeof inc, boolean>>;
const spliced = splice(0, 1, [9], [1, 2, 3]);
type _splice = Expect<Equal<typeof spliced, number[]>>;

// mergeObjects / mergeObjectsDeep — combined shape, not `any`
const merged = mergeObjects({ a: 1 }, { b: 2 });
type _merge = Expect<Equal<typeof merged, { a: number } & { b: number }>>;
const mergedDeep = mergeObjectsDeep({ a: { x: 1 } }, { a: { y: 2 } });
type _mergeDeepHasX = Expect<Equal<(typeof mergedDeep)['a']['x'], number>>;
type _mergeDeepHasY = Expect<Equal<(typeof mergedDeep)['a']['y'], number>>;

// difference — generic value type survives
const diff = difference([1, 2, 3])([2, 3, 4]);
type _diff = Expect<Equal<typeof diff, number[]>>;

// validation — keys are PropertyKeys, not constrained to keyof T
const missing = getMissingKeys({ a: 1 }, ['a', 'b', 'c']); // no cast needed now
type _missing = Expect<Equal<typeof missing, ('a' | 'b' | 'c')[]>>;

// path — template-literal path: exact value type for valid literal paths,
// graceful `any` fallback for dynamic strings, both call styles.
const cfg = { user: { name: 'Ada', age: 36 }, tags: ['x', 'y'] };
const userName = path('user.name', cfg);
type _path1 = Expect<Equal<typeof userName, string>>;
const userAge = path('user.age', cfg);
type _path2 = Expect<Equal<typeof userAge, number>>;
const tag0 = path('tags.0', cfg);
type _path3 = Expect<Equal<typeof tag0, string>>;
const userNameCurried = path('user.name')(cfg);
type _path4 = Expect<Equal<typeof userNameCurried, string>>;
const dynamicKey = 'user.name' as string;
const dyn = path(dynamicKey, cfg); // dynamic string -> any (no false errors)
type _path5 = Expect<Equal<typeof dyn, any>>;

// pluck — value-array type for a valid literal key + autocomplete on the key
const products = [
  { id: 'p1', details: { price: 100 } },
  { id: 'p2', details: { price: 200 } },
];
const ids = pluck('id', products);
type _pluck1 = Expect<Equal<typeof ids, string[]>>;
const prices = pluck('details.price', products);
type _pluck2 = Expect<Equal<typeof prices, number[]>>;

// getValue — array (tuple) path: exact value type, array-index aware, undefined for
// missing keys, graceful `any` for a dynamic (non-literal) path.
const gvCfg = { user: { name: 'Ada', age: 36 }, roles: ['admin', 'user'] };
const gName = getValue(['user', 'name'], gvCfg);
type _gv1 = Expect<Equal<typeof gName, string>>;
const gAge = getValue(['user', 'age'], gvCfg);
type _gv2 = Expect<Equal<typeof gAge, number>>;
const gRole = getValue(['roles', '0'], gvCfg);
type _gv3 = Expect<Equal<typeof gRole, string>>;
const gMissing = getValue(['user', 'nope'], gvCfg);
type _gv4 = Expect<Equal<typeof gMissing, undefined>>;
const gCurried = getValue(['user', 'name'])(gvCfg);
type _gv5 = Expect<Equal<typeof gCurried, string>>;
const gvDynamicPath: string[] = ['user', 'name'];
const gDyn = getValue(gvDynamicPath, gvCfg); // dynamic path -> any (no false errors)
type _gv6 = Expect<Equal<typeof gDyn, any>>;

// assocPath — setting a valid existing path: value is contextually typed to the
// path's type and the result keeps the object's shape T (not `any`).
const apCfg = { user: { name: 'Ada', age: 36 } };
const apResult = assocPath('user.age', 40, apCfg);
type _ap1 = Expect<Equal<typeof apResult, typeof apCfg>>;

describe('type-level DX guards', () => {
  it('compiles and the runtime still behaves', () => {
    expect(mapBoth).toEqual(['1.00', '2.00', '3.00']);
    expect(onlyStrings).toEqual(['a', 'b']);
    expect(merged).toEqual({ a: 1, b: 2 });
    expect(mergedDeep).toEqual({ a: { x: 1, y: 2 } });
    expect(diff).toEqual([4]); // values in [2,3,4] not present in [1,2,3]
    expect(missing).toEqual(['b', 'c']);
    expect(allKeysExist({ a: 1, b: 2 }, ['a', 'b'])).toBe(true);
    expect(userName).toBe('Ada');
    expect(userAge).toBe(36);
    expect(tag0).toBe('x');
    expect(userNameCurried).toBe('Ada');
    expect(dyn).toBe('Ada');
    expect(ids).toEqual(['p1', 'p2']);
    expect(prices).toEqual([100, 200]);
    expect(gName).toBe('Ada');
    expect(gAge).toBe(36);
    expect(gRole).toBe('admin');
    expect(gMissing).toBeUndefined();
    expect(gCurried).toBe('Ada');
    expect(gDyn).toBe('Ada');
    expect(apResult).toEqual({ user: { name: 'Ada', age: 40 } });
  });
});
