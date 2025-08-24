export type LoggerLevel = 'info' | 'debug' | 'trace' | 'warn' | 'error';
export type LoggerConfig = {
    baseDirectory?: string;
    level: LoggerLevel;
    skipStringify?: boolean;
    stackDepth: number;
    stringifyError?: (_error: Error) => string;
    stringifyObject?: (_arg: any) => string;
    timestampFunction?: () => string;
};
export declare const updateLoggerConfig: (config: Partial<LoggerConfig>) => LoggerConfig & Partial<LoggerConfig>;
export declare const getFileDetails: (stackDepth?: number) => string;
export declare const logger: {
    trace: (...args: any) => void;
    debug: (...args: any) => void;
    info: (...args: any) => void;
    error: (...args: any) => void;
    warn: (...args: any) => void;
};
//# sourceMappingURL=logger.d.ts.map