export declare const smartLogSettings: {
    timer: number;
    groupInclusions: any[];
};
export declare const handleError: (err: any, prefix?: string) => any;
export type SmartLogParamsType = {
    type?: string;
    group?: string;
    vals?: any[];
    skipShouldLogMessageCheck?: Boolean;
    depth?: Number;
    timer?: number;
};
export declare const smartLog: ({ type, group, vals, skipShouldLogMessageCheck, depth, timer, }: SmartLogParamsType) => void;
export declare const smartLogger: ({ group, vals, skipShouldLogMessageCheck, depth, timer, }: SmartLogParamsType) => {
    error: (...args: any[]) => void;
    trace: (...args: any[]) => void;
    debug: (...args: any[]) => void;
    info: (...args: any[]) => void;
    warn: (...args: any[]) => void;
};
//# sourceMappingURL=smartLog.d.ts.map