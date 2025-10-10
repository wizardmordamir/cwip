type Obj = Record<string, any>;
export type LoggingSettings = {
    disableSameMessagesLimit: boolean;
    redactionText: string;
    secretProps: string[];
    messagesPerHour: number;
    priorMessages: Obj;
};
export declare const loggingSettings: LoggingSettings;
export declare const updateLoggingSettings: (settings: Partial<LoggingSettings>) => void;
export declare const cleanStringForLogging: (str: string, env: Obj) => string;
export declare const cleanDataForLogging: (opts: any, env: Obj) => any;
export declare const shouldLogMessage: (message: any, group?: string) => boolean;
export {};
//# sourceMappingURL=index.d.ts.map