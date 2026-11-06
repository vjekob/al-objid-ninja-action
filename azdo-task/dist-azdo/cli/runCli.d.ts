export interface CliIo {
    out(text: string): void;
    err(text: string): void;
}
/**
 * Runs the CLI and returns its exit code. With --json, stdout holds only the JSON report.
 */
export declare function runCli(args: string[], io: CliIo): Promise<number>;
//# sourceMappingURL=runCli.d.ts.map