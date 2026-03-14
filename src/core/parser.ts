import * as path from "path";
import * as fs from "fs";
import { ALObject } from "./types";

/**
 * Interface matching what the native .node binary exports.
 */
interface NativeParserModule {
    initialize(workers?: number): Promise<void>;
    terminate(): Promise<void>;
    parse(sources: string[]): Promise<ALObject[]>;
}

let nativeModule: NativeParserModule | null = null;

function getPlatformIdentifier(): string {
    const platform = process.platform;
    const arch = process.arch;

    if (platform === "win32") {
        return `win32-${arch}-msvc`;
    } else if (platform === "linux") {
        return arch === "x64" ? "linux-x64-gnu" : `linux-${arch}-gnu`;
    } else if (platform === "darwin") {
        return arch === "arm64" ? "darwin-arm64" : "darwin-x64";
    }

    throw new Error(`Unsupported platform: ${platform} (${arch})`);
}

function loadNativeModule(): NativeParserModule {
    if (nativeModule) {
        return nativeModule;
    }

    const platformId = getPlatformIdentifier();
    const binDir = path.resolve(__dirname, "..", "bin");
    const modulePath = path.join(binDir, `al-parser-ninja.${platformId}.node`);

    if (!fs.existsSync(modulePath)) {
        throw new Error(
            `Native parser binary not found: ${modulePath}. Platform: ${process.platform} (${process.arch})`
        );
    }

    const loaded = require(modulePath);

    if (typeof loaded !== "object" || loaded === null || typeof loaded.parse !== "function") {
        throw new Error(
            `Native parser module has unexpected structure. Keys: ${Object.keys(loaded).join(", ")}`
        );
    }

    nativeModule = {
        initialize: typeof loaded.initialize === "function" ? loaded.initialize : async () => {},
        terminate: typeof loaded.terminate === "function" ? loaded.terminate : async () => {},
        parse: loaded.parse,
    };

    return nativeModule!;
}

/**
 * Initialize the native AL parser. Must be called before parse().
 */
export async function initializeParser(): Promise<void> {
    const mod = loadNativeModule();
    await mod.initialize();
}

/**
 * Terminate the native AL parser. Call when done.
 */
export async function terminateParser(): Promise<void> {
    if (nativeModule) {
        await nativeModule.terminate();
        nativeModule = null;
    }
}

/**
 * Parse AL files and return object definitions.
 */
export async function parseALFiles(filePaths: string[]): Promise<ALObject[]> {
    const mod = loadNativeModule();
    return mod.parse(filePaths);
}
