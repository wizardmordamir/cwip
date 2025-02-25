type Obj = Record<string, any>;
export type LoggingSettings = {
    disableSameMessagesLimit: boolean;
    redactionText: string;
    secretProps: string[];
    messagesPerHour: number;
    priorMessages: Obj;
};
export declare const loggingSettings: LoggingSettings;
export declare const cleanStringForLogging: (str: string) => string;
export declare const cleanDataForLogging: (opts: any) => any;
export declare const shouldLogMessage: (message: any, group?: string) => boolean;
export {};
//# sourceMappingURL=logging.d.ts.map