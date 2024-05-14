type Obj = {
    [key: string]: any;
};
export declare const shallowClone: (obj: Obj) => Obj;
export declare const deepClone: (obj: Obj) => Obj;
export declare const extend: (...objects: Obj[]) => Object;
export declare const excludesKeys: (keys: string[], obj: Obj) => string[];
export declare const stringify: (obj: Obj, spaces?: number) => string;
export declare const firstExistingKey: (keys: string[], obj: Obj) => string;
export declare const firstExistingKeyValue: (keys: string[], obj: Obj) => any;
export declare const hasKey: (key: string, obj: Obj) => boolean;
export declare const hasAllKeys: (keys: string[], obj: Obj) => boolean;
export declare const getMissingKeys: (keys: string[], obj: Obj) => string[];
export declare const removeKeys: (keys: string[], obj: Obj) => Obj;
export {};
//# sourceMappingURL=objects.d.ts.map