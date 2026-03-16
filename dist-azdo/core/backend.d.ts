import { AppManifest, ConsumptionInfo } from "./types";
interface BackendRequestOptions {
    appId: string;
    authKey?: string;
    manifest?: AppManifest;
    workspace?: string;
}
/**
 * Fetch current consumption from the backend.
 */
export declare function getConsumption(options: BackendRequestOptions): Promise<ConsumptionInfo>;
/**
 * Sync (merge/patch) consumption to the backend.
 */
export declare function syncConsumption(options: BackendRequestOptions, ids: ConsumptionInfo): Promise<void>;
export {};
//# sourceMappingURL=backend.d.ts.map