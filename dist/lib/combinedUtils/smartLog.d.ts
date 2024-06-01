export namespace smartLogSettings {
    let timer: number;
    let groupInclusions: any[];
}
export function handleError(err: any, prefix?: string): any;
export function smartLog({ type, group, vals, stackLimit, skipShouldLogMessageCheck, depth, timer, }: {
    type?: string;
    group?: string;
    vals?: any[];
    stackLimit?: number;
    skipShouldLogMessageCheck?: boolean;
    depth?: number;
    timer?: number;
}): void;
//# sourceMappingURL=smartLog.d.ts.map