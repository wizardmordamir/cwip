export declare const validLogLevels: string[];
type LoggerConfig = {
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
export declare const getFileFromStack: (stack: any, index: any) => any;
export declare const getLineFromStack: (stack: any, index: any) => any;
export declare const createLogger: (config?: LoggerConfig) => any;
export {};
//# sourceMappingURL=log.d.ts.map