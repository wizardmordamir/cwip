export type LoggerLevel = 'info' | 'debug' | 'trace' | 'warn' | 'error' | 'off';
export type LoggerConfig = {
    baseDirectory?: string;
    level: LoggerLevel;
    skipStringify?: boolean;
    stackDepth: number;
    stringifyError?: (_error: Error) => string;
    stringifyObject?: (_arg: any) => string;
    timestampFunction?: () => string;
    toggles?: {
        skipFileDetails?: boolean;
        skipTimestamps?: boolean;
    };
};
export declare const getLoggerConfig: () => string;
export declare const updateLoggerConfig: (config: Partial<LoggerConfig>) => LoggerConfig & Partial<LoggerConfig>;
export declare const getFileDetails: (stackDepth?: number) => string;
export declare const logger: {
    debug: (...args: any) => void;
    error: (...args: any) => void;
    info: (...args: any) => void;
    trace: (...args: any) => void;
    warn: (...args: any) => void;
};
//# sourceMappingURL=index.d.ts.map