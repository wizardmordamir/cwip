export type Prepend<E, T extends any[]> = ((head: E, ...args: T) => any) extends (...args: infer U) => any ? U : T;
//# sourceMappingURL=Prepend.d.ts.map