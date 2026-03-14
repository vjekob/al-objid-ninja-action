import * as https from "https";
import * as http from "http";
import { AppManifest, ConsumptionInfo } from "./types";

const ACTION_VERSION = "3.4.0";
const BACKEND_URL = "https://backend.alid.ninja";

interface BackendRequestOptions {
    appId: string;
    authKey?: string;
    manifest?: AppManifest;
}

function request(url: string, method: string, body: unknown, options: { authKey?: string; manifest?: AppManifest }): Promise<unknown> {
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
        const headerPayload = {
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

    const result = await request(url, "POST", body, { authKey: options.authKey, manifest: options.manifest });

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

    await request(url, "PATCH", body, { authKey: options.authKey, manifest: options.manifest });
}
