import * as https from "https";
import * as http from "http";
import { execSync } from "child_process";
import { AppManifest, ConsumptionInfo } from "./types";

const ACTION_VERSION = "3.4.0";
const BACKEND_URL = "https://backend.alid.ninja";

interface GitUserInfo {
    name: string;
    email: string;
}

let cachedGitUser: GitUserInfo | undefined;

function getLastCommitUser(workspace: string): GitUserInfo {
    if (cachedGitUser) return cachedGitUser;
    try {
        const name = execSync("git log -1 --format=%an", { cwd: workspace, encoding: "utf8" }).trim();
        const email = execSync("git log -1 --format=%ae", { cwd: workspace, encoding: "utf8" }).trim();
        cachedGitUser = { name, email };
    } catch {
        cachedGitUser = { name: "", email: "" };
    }
    return cachedGitUser;
}

interface BackendRequestOptions {
    appId: string;
    authKey?: string;
    manifest?: AppManifest;
    workspace?: string;
}

function request(url: string, method: string, body: unknown, options: { authKey?: string; manifest?: AppManifest; workspace?: string }): Promise<unknown> {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const isHttps = parsed.protocol === "https:";
        const transport = isHttps ? https : http;

        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };
        if (options.authKey) {
            headers["Ninja-Auth-Key"] = options.authKey;
        }

        if (options.manifest?.id) {
            headers["Ninja-App-Id"] = options.manifest.id;
        }

        // Build the header payload the backend expects (matches ninja-extension sendRequest.ts)
        const gitUser = options.workspace ? getLastCommitUser(options.workspace) : { name: "", email: "" };
        const headerPayload = {
            gitUserName: gitUser.name,
            gitUserEmail: gitUser.email,
            appPublisher: options.manifest?.publisher,
            appName: options.manifest?.name,
            appVersion: options.manifest?.version,
            ninjaVersion: ACTION_VERSION,
        };
        headers["Ninja-Header-Payload"] = Buffer.from(JSON.stringify(headerPayload)).toString("base64");

        const bodyStr = JSON.stringify(body);
        headers["Content-Length"] = Buffer.byteLength(bodyStr).toString();

        const req = transport.request(
            {
                hostname: parsed.hostname,
                port: parsed.port || (isHttps ? 443 : 80),
                path: parsed.pathname + parsed.search,
                method,
                headers,
            },
            (res) => {
                let data = "";
                res.on("data", (chunk) => (data += chunk));
                res.on("end", () => {
                    if (res.statusCode === 401) {
                        reject(new Error("Authentication failed (401). An auth key is required for this app."));
                        return;
                    }

                    if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
                        reject(new Error(`Backend returned HTTP ${res.statusCode}: ${data}`));
                        return;
                    }

                    try {
                        resolve(data ? JSON.parse(data) : undefined);
                    } catch {
                        reject(new Error(`Failed to parse backend response: ${data}`));
                    }
                });
            }
        );

        req.on("error", (err) => {
            reject(new Error(`Backend unreachable: ${err.message}. Check the backend-url input.`));
        });

        req.write(bodyStr);
        req.end();
    });
}

/**
 * Fetch current consumption from the backend.
 */
export async function getConsumption(options: BackendRequestOptions): Promise<ConsumptionInfo> {
    const url = `${BACKEND_URL}/api/v3/getConsumption/${options.appId}`;
    const body: Record<string, string> = { appId: options.appId };
    if (options.authKey) {
        body.authKey = options.authKey;
    }

    const result = await request(url, "POST", body, { authKey: options.authKey, manifest: options.manifest, workspace: options.workspace });

    if (!result || typeof result !== "object") {
        return {};
    }

    // Backend may include _total or _appInfo metadata — strip those
    const consumption: ConsumptionInfo = {};
    for (const [key, value] of Object.entries(result as Record<string, unknown>)) {
        if (key.startsWith("_")) continue;
        if (Array.isArray(value)) {
            consumption[key] = value as number[];
        }
    }

    return consumption;
}

/**
 * Sync (merge/patch) consumption to the backend.
 */
export async function syncConsumption(options: BackendRequestOptions, ids: ConsumptionInfo): Promise<void> {
    const url = `${BACKEND_URL}/api/v3/syncIds/${options.appId}`;
    const body: Record<string, unknown> = { ids, appId: options.appId };
    if (options.authKey) {
        body.authKey = options.authKey;
    }

    await request(url, "PATCH", body, { authKey: options.authKey, manifest: options.manifest, workspace: options.workspace });
}
