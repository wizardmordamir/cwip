/* eslint-disable */
import { curry, mergeObjects } from '../../util-functions';

export class ComposableObject {
  static keys = curry(
    (
      fn: (value: string, index: number, array: string[]) => any,
      object: Record<string, any>,
    ): string[] => {
      if (typeof object !== 'object') {
        return ['Error:Non Object Provided'];
      }

      return Object.keys(object).map(fn);
    },
  );

  static values = curry(
    (
      fn: (value: unknown, index: number, array: unknown[]) => any,
      object: Record<string, any>,
    ): unknown[] => {
      if (typeof object !== 'object') {
        return ['Error:Non Object Provided'];
      }

      return Object.values(object).map(fn);
    },
  );

  static entries = curry(
    (
      fn: (value: [string, any], index: number, array: [string, any][]) => any,
      object: Record<string, any>,
    ): [string, unknown][] => {
      if (typeof object !== 'object') {
        return [['Error', 'Non Object Provided']];
      }

      return Object.entries(object).map(fn);
    },
  );

  static mergeObjects = curry(
    (overridingObject: Record<string, any>, baseObject: Record<string, any>): object => {
      if (typeof baseObject !== 'object' || typeof overridingObject !== 'object') {
        return { Error: 'Non Object Provided' };
      }

      return mergeObjects(baseObject, overridingObject);
    },
  );

  static fromEntries = (entries: Iterable<readonly [PropertyKey, any]>): Record<string, any> => {
    try {
      return Object.fromEntries(entries);
    } catch (err: any) {
      return { Error: err.message };
    }
  };
}
