type SetValue = <T extends object, U extends object>(setter: (val: T) => U) => (obj: T) => T & U;

/**
 * Immutably merges the result of a setter function into an object.
 * Great for piping: pipe(user, setValue(u => ({ fullName: `${u.first} ${u.last}` })))
 */
export const setValue: SetValue = (setter) => (obj) => {
  if (obj == null) return {} as any;
  return {
    ...obj,
    ...setter(obj),
  };
};
