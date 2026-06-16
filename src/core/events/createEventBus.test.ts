import { describe, expect, it } from 'bun:test';
import { createEventBus } from '.';

describe('createEventBus', () => {
  it('delivers events to all listeners and reports the count', () => {
    const bus = createEventBus<{ id: string }>();
    const seen: string[] = [];
    bus.subscribe((e) => seen.push(`a:${e.id}`));
    bus.subscribe((e) => seen.push(`b:${e.id}`));
    expect(bus.listenerCount()).toBe(2);
    bus.emit({ id: '1' });
    expect(seen).toEqual(['a:1', 'b:1']);
  });

  it('subscribe returns an unsubscribe', () => {
    const bus = createEventBus<number>();
    const seen: number[] = [];
    const off = bus.subscribe((n) => seen.push(n));
    bus.emit(1);
    off();
    bus.emit(2);
    expect(seen).toEqual([1]);
    expect(bus.listenerCount()).toBe(0);
  });

  it('is safe when a listener unsubscribes during emit', () => {
    const bus = createEventBus<void>();
    let count = 0;
    const off = bus.subscribe(() => {
      count++;
      off();
    });
    bus.subscribe(() => count++);
    bus.emit();
    expect(count).toBe(2);
    expect(bus.listenerCount()).toBe(1);
  });

  it('clear removes everything', () => {
    const bus = createEventBus();
    bus.subscribe(() => {});
    bus.clear();
    expect(bus.listenerCount()).toBe(0);
  });
});
