import { takeKey } from '../object';

export const mapKey = (key: string) => (v: any[]) => v.map(takeKey(key));
