export declare const validLogLevels: string[];
export type LoggerConfig = {
    pino?: any;
    name?: string;
    prettyPrint?: {
        colorize?: boolean;
        translateTime?: string;
        ignore?: string;
    };
    hideFile?: boolean;
    hideTime?: boolean;
    hideLine?: boolean;
    useLocalTime?: boolean;
    timeFunction?: Function;
    stackIndex?: number;
    level?: 'trace' | 'debug' | 'info' | 'warn' | 'error';
};
export type LogSettingsType = {
    logger: any;
    currentConfig: LoggerConfig;
    depth: Function | undefined;
};
export declare const logSettings: LogSettingsType;
export declare const getFileFromStack: (stack: any, index: any) => any;
export declare const getLineFromStack: (stack: any, index: any) => any;
export declare const createLogger: (config?: LoggerConfig) => any;
//# sourceMappingURL=log.d.ts.map