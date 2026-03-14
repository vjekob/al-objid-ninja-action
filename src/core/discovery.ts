import * as fs from "fs";
import * as path from "path";
import { AppManifest, DiscoveredApp, ObjIdConfig } from "./types";
import { getSha256 } from "./hash";

/**
 * Recursively find all app.json files under a root directory,
 * skipping node_modules and .git.
 */
export async function findAppJsonFiles(rootDir: string): Promise<string[]> {
    const results: string[] = [];

    async function walk(dir: string): Promise<void> {
        let entries: fs.Dirent[];
        try {
            entries = await fs.promises.readdir(dir, { withFileTypes: true });
        } catch {
            return;
        }

        for (const entry of entries) {
            if (entry.name === "node_modules" || entry.name === ".git") {
                continue;
            }

            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                await walk(fullPath);
            } else if (entry.isFile() && entry.name.toLowerCase() === "app.json") {
                results.push(fullPath);
            }
        }
    }

    await walk(rootDir);
    return results;
}

/**
 * Try to parse an app.json file. Returns undefined if it can't be parsed.
 */
function tryParseManifest(appJsonPath: string): AppManifest | undefined {
    try {
        const content = fs.readFileSync(appJsonPath, "utf-8");
        const json = JSON.parse(content);

        if (!json.id || typeof json.id !== "string") {
            return undefined;
        }

        return {
            id: json.id,
            name: json.name || "",
            publisher: json.publisher || "",
            version: json.version || "",
            idRanges: json.idRanges,
        };
    } catch {
        return undefined;
    }
}

/**
 * Try to parse an .objidconfig file. Returns empty config if not found or unparseable.
 */
function tryParseObjIdConfig(appDir: string): ObjIdConfig {
    const configPath = path.join(appDir, ".objidconfig");
    try {
        if (!fs.existsSync(configPath)) {
            return {};
        }

        const content = fs.readFileSync(configPath, "utf-8");
        // .objidconfig may contain comments (JSONC), strip single-line comments
        const stripped = content.replace(/^\s*\/\/.*$/gm, "");
        const json = JSON.parse(stripped);

        return {
            authKey: json.authKey || undefined,
            appPoolId: json.appPoolId || undefined,
        };
    } catch {
        return {};
    }
}

/**
 * Validates that an appPoolId looks correct (64 hex chars).
 * Matches the validation in WorkspaceManager.getPoolIdFromAppIdIfAvailable.
 */
function isValidPoolId(poolId: string): boolean {
    return poolId.length === 64 && /^[0-9a-fA-F]{64}$/.test(poolId);
}

/**
 * Discover all AL apps under a root directory.
 */
export async function discoverApps(rootDir: string, logger?: { warning(msg: string): void }): Promise<DiscoveredApp[]> {
    const appJsonFiles = await findAppJsonFiles(rootDir);
    const apps: DiscoveredApp[] = [];

    for (const appJsonPath of appJsonFiles) {
        const manifest = tryParseManifest(appJsonPath);
        if (!manifest) {
            logger?.warning(`Could not parse ${appJsonPath}, skipping`);
            continue;
        }

        const appDir = path.dirname(appJsonPath);
        const config = tryParseObjIdConfig(appDir);
        const hash = getSha256(manifest.id);

        let backendId = hash;
        if (config.appPoolId) {
            if (isValidPoolId(config.appPoolId)) {
                backendId = config.appPoolId;
            } else {
                logger?.warning(`App "${manifest.name}" has invalid appPoolId in .objidconfig, ignoring pool`);
            }
        }

        apps.push({ appDir, manifest, hash, config, backendId });
    }

    return apps;
}

/**
 * Find all .al files under a directory, recursively.
 */
export async function findALFiles(dir: string): Promise<string[]> {
    const results: string[] = [];

    async function walk(d: string): Promise<void> {
        let entries: fs.Dirent[];
        try {
            entries = await fs.promises.readdir(d, { withFileTypes: true });
        } catch {
            return;
        }

        for (const entry of entries) {
            if (entry.name === "node_modules" || entry.name === ".git") {
                continue;
            }

            const fullPath = path.join(d, entry.name);
            if (entry.isDirectory()) {
                await walk(fullPath);
            } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".al")) {
                results.push(fullPath);
            }
        }
    }

    await walk(dir);
    return results;
}
