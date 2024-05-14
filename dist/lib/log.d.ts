type Config = {
    hideFile?: boolean;
    hideTime?: boolean;
    hideLine?: boolean;
    useLocalTime?: boolean;
    timeFunction?: Function;
    stackIndex?: number;
};
export declare const getFileFromStack: (stack: any, index: any) => any;
export declare const getLineFromStack: (stack: any, index: any) => any;
export declare const log: (config?: Config) => (...args: any[]) => void;
export {};
//# sourceMappingURL=log.d.ts.map