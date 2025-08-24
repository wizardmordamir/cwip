/* eslint-disable */
type SetValue = <P extends object, R extends object>(setter: (v?: P) => R) => (value: P) => P & R;

export const setValue: SetValue = (setter) => (value) => ({ ...value, ...setter(value) });
