import { DiscoveredApp } from "./types";
/**
 * Recursively find all app.json files under a root directory,
 * skipping node_modules and .git.
 */
export declare function findAppJsonFiles(rootDir: string): Promise<string[]>;
/**
 * Discover all AL apps under a root directory.
 */
export declare function discoverApps(rootDir: string, logger?: {
    warning(msg: string): void;
}): Promise<DiscoveredApp[]>;
/**
 * Find all .al files under a directory, recursively.
 */
export declare function findALFiles(dir: string): Promise<string[]>;
//# sourceMappingURL=discovery.d.ts.map