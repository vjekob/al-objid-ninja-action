import { ALObject } from "./types";
/**
 * Initialize the native AL parser. Must be called before parse().
 */
export declare function initializeParser(): Promise<void>;
/**
 * Terminate the native AL parser. Call when done.
 */
export declare function terminateParser(): Promise<void>;
/**
 * Parse AL files and return object definitions.
 */
export declare function parseALFiles(filePaths: string[]): Promise<ALObject[]>;
//# sourceMappingURL=parser.d.ts.map