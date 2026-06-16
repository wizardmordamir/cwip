import { describe, expect, it } from 'bun:test';
import { Just, type Maybe, Nothing } from './Just';

describe('Just', () => {
  it('round-trips a value: of() and the constructor wrap it identically', () => {
    expect(Just.of(42).str()).toBe('Just(42)');
    expect(new Just(42).str()).toBe('Just(42)');
    expect(Just.of(42).str()).toBe(new Just(42).str());
  });

  it('passes the held value to the function it is given (round-trip through map)', () => {
    let seen: number | undefined;
    Just.of(99).map((v) => {
      seen = v;
      return v;
    });
    expect(seen).toBe(99);
  });

  it('map() transforms the held value and stays a Just', () => {
    const result = new Just(10).map((v) => v * 2);
    expect(result.tag).toBe('Just');
    expect(result.str()).toBe('Just(20)');
  });

  it('bind() chains to a Just when the function returns one', () => {
    const result = Just.of(5).bind((v) => Just.of(v + 1));
    expect(result.tag).toBe('Just');
    expect(result.str()).toBe('Just(6)');
  });

  it('bind() chains to a Nothing when the function returns one', () => {
    const result = Just.of(5).bind(() => new Nothing<number>());
    expect(result.tag).toBe('Nothing');
    expect(result.str()).toBe('Nothing()');
  });

  it('chain is an alias of bind (to a Just and to a Nothing)', () => {
    expect(
      Just.of(2)
        .chain((v) => Just.of(v * 5))
        .str(),
    ).toBe('Just(10)');
    expect(Just.of(2).chain(() => new Nothing<number>()).tag).toBe('Nothing');
  });

  it('flatMap is an alias of bind (to a Just and to a Nothing)', () => {
    expect(
      Just.of(3)
        .flatMap((v) => Just.of(v + 7))
        .str(),
    ).toBe('Just(10)');
    expect(Just.of(3).flatMap(() => new Nothing<number>()).tag).toBe('Nothing');
  });

  it('str() renders the wrapped value', () => {
    expect(new Just('hello').str()).toBe('Just(hello)');
  });
});

describe('Nothing', () => {
  it('bind() short-circuits: ignores the function and returns a Nothing', () => {
    let ran = false;
    const result = new Nothing<number>().bind(() => {
      ran = true;
      return Just.of(1);
    });
    expect(ran).toBe(false);
    expect(result.tag).toBe('Nothing');
    expect(result.str()).toBe('Nothing()');
  });

  it('map() short-circuits: ignores the function and returns a Nothing', () => {
    let ran = false;
    const result = new Nothing<number>().map(() => {
      ran = true;
      return 1;
    });
    expect(ran).toBe(false);
    expect(result.tag).toBe('Nothing');
    expect(result.str()).toBe('Nothing()');
  });

  it('str() renders Nothing()', () => {
    expect(new Nothing<number>().str()).toBe('Nothing()');
  });
});

describe('Maybe union discrimination via the tag field', () => {
  // Narrows on `tag`: in the truthy branch `m` is a Just<number>, else a Nothing<number>.
  const render = (m: Maybe<number>): string => (m.tag === 'Just' ? m.str() : 'none');

  it('narrows a Just by its tag', () => {
    expect(render(Just.of(1))).toBe('Just(1)');
    expect(render(new Just(7))).toBe('Just(7)');
  });

  it('narrows a Nothing by its tag', () => {
    expect(render(new Nothing<number>())).toBe('none');
  });
});
