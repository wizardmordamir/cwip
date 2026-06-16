export type DefinedObject<O> = { [Key in keyof O]: O[Key] };
