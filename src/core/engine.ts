import { ActionInputs, ActionLogger, ActionResult, ALObject, ConsumptionInfo, DiscoveredApp, UntrackedId } from "./types";
import { discoverApps, findALFiles } from "./discovery";
import { initializeParser, parseALFiles, terminateParser } from "./parser";
import { buildConsumption, mergeConsumption } from "./consumption";
import { getConsumption, syncConsumption } from "./backend";

interface AppWithConsumption {
    app: DiscoveredApp;
    objects: ALObject[];
    branchConsumption: ConsumptionInfo;
}

/**
 * Groups apps by their backend ID (pool ID for pooled apps, hash for standalone).
 */
function groupAppsByBackendId(apps: DiscoveredApp[]): Map<string, DiscoveredApp[]> {
    const groups = new Map<string, DiscoveredApp[]>();
    for (const app of apps) {
        const group = groups.get(app.backendId) || [];
        group.push(app);
        groups.set(app.backendId, group);
    }
    return groups;
}

/**
 * Resolve the auth key from .objidconfig of the first app in the group that has one.
 */
function resolveAuthKey(apps: DiscoveredApp[]): string | undefined {
    for (const app of apps) {
        if (app.config.authKey) return app.config.authKey;
    }
    return undefined;
}

/**
 * Find untracked IDs: branch IDs that are not present in backend consumption.
 */
function findUntrackedIds(
    appConsumptions: AppWithConsumption[],
    backendConsumption: ConsumptionInfo,
    inputs: ActionInputs
): UntrackedId[] {
    const untracked: UntrackedId[] = [];

    for (const { app, objects } of appConsumptions) {
        for (const obj of objects) {
            if (!obj.id) continue;

            const backendIds = backendConsumption[obj.type];
            if (!backendIds || !backendIds.includes(obj.id)) {
                untracked.push({
                    app,
                    category: "object",
                    objectType: obj.type,
                    objectId: obj.id,
                    objectName: obj.name,
                    filePath: obj.path,
                    line: obj.line,
                });
            }

            // Check fields
            if (obj.fields && !inputs.excludeFieldIds) {
                const fieldKey = `${obj.type}_${obj.id}`;
                const backendFieldIds = backendConsumption[fieldKey];
                for (const field of obj.fields) {
                    if (!backendFieldIds || !backendFieldIds.includes(field.id)) {
                        untracked.push({
                            app,
                            category: "field",
                            objectType: obj.type,
                            objectId: obj.id,
                            objectName: obj.name,
                            memberName: field.name,
                            memberId: field.id,
                            filePath: obj.path,
                            line: field.line,
                        });
                    }
                }
            }

            // Check enum values
            if (obj.values && !inputs.excludeEnumValueIds) {
                const valueKey = `${obj.type}_${obj.id}`;
                const backendValueIds = backendConsumption[valueKey];
                for (const value of obj.values) {
                    if (!backendValueIds || !backendValueIds.includes(value.id)) {
                        untracked.push({
                            app,
                            category: "value",
                            objectType: obj.type,
                            objectId: obj.id,
                            objectName: obj.name,
                            memberName: value.name,
                            memberId: value.id,
                            filePath: obj.path,
                            line: value.line,
                        });
                    }
                }
            }
        }
    }

    return untracked;
}

/**
 * Run the action. This is the main entry point for the platform-agnostic business logic.
 */
export async function run(inputs: ActionInputs, logger: ActionLogger): Promise<ActionResult> {
    const result: ActionResult = {
        success: true,
        untrackedIds: [],
        syncedApps: [],
        errors: [],
        warnings: [],
    };

    // Discover apps
    const apps = await discoverApps(inputs.workspace, logger);
    if (apps.length === 0) {
        logger.warning("No AL apps (app.json) found in the workspace.");
        return result;
    }

    logger.info(`Discovered ${apps.length} AL app(s)`);

    // Initialize parser
    try {
        await initializeParser();
    } catch (err) {
        const msg = `Failed to initialize AL parser: ${(err as Error).message}`;
        logger.fail(msg);
        result.success = false;
        result.errors.push(msg);
        return result;
    }

    try {
        // Parse all apps and build per-app consumption
        const appConsumptions: AppWithConsumption[] = [];

        for (const app of apps) {
            const alFiles = await findALFiles(app.appDir);
            if (alFiles.length === 0) {
                logger.info(`App "${app.manifest.name}": no .al files found, skipping`);
                continue;
            }

            const objects = await parseALFiles(alFiles);
            const validObjects = objects.filter((o) => !o.error);
            if (objects.length !== validObjects.length) {
                const errCount = objects.length - validObjects.length;
                logger.warning(`App "${app.manifest.name}": ${errCount} file(s) had parse errors`);
            }

            const branchConsumption = buildConsumption(validObjects);
            appConsumptions.push({ app, objects: validObjects, branchConsumption });

            logger.info(`App "${app.manifest.name}": parsed ${alFiles.length} file(s), ${validObjects.length} object(s)`);
        }

        // Group by backend ID (pools share one backend ID)
        const groups = groupAppsByBackendId(appConsumptions.map((ac) => ac.app));

        if (inputs.mode === "warn") {
            await runWarnMode(inputs, logger, result, appConsumptions, groups);
        } else {
            await runSyncMode(inputs, logger, result, appConsumptions, groups);
        }
    } finally {
        await terminateParser();
    }

    return result;
}

async function runWarnMode(
    inputs: ActionInputs,
    logger: ActionLogger,
    result: ActionResult,
    appConsumptions: AppWithConsumption[],
    groups: Map<string, DiscoveredApp[]>
): Promise<void> {
    // One getConsumption call per unique backend ID (per pool or standalone app)
    for (const [backendId, groupApps] of groups) {
        const authKey = resolveAuthKey(groupApps);

        let backendConsumption: ConsumptionInfo;
        try {
            backendConsumption = await getConsumption({
                appId: backendId,
                authKey,
                manifest: groupApps[0].manifest,
                workspace: inputs.workspace,
            });
        } catch (err) {
            const msg = (err as Error).message;
            logger.fail(msg);
            result.success = false;
            result.errors.push(msg);
            return;
        }

        // Find all appConsumptions belonging to this group
        const groupAppHashes = new Set(groupApps.map((a) => a.hash));
        const groupConsumptions = appConsumptions.filter((ac) => groupAppHashes.has(ac.app.hash));

        const untracked = findUntrackedIds(groupConsumptions, backendConsumption, inputs);
        result.untrackedIds.push(...untracked);
    }

    if (result.untrackedIds.length > 0) {
        for (const u of result.untrackedIds) {
            let msg: string;
            switch (u.category) {
                case "object":
                    msg = `${u.objectType} ${u.objectId} "${u.objectName}" is not tracked by AL Object ID Ninja`;
                    break;
                case "field":
                    msg = `Field ${u.memberId} "${u.memberName}" in ${u.objectType} ${u.objectId} "${u.objectName}" is not tracked by AL Object ID Ninja`;
                    break;
                case "value":
                    msg = `Enum value ${u.memberId} "${u.memberName}" in ${u.objectType} ${u.objectId} "${u.objectName}" is not tracked by AL Object ID Ninja`;
                    break;
            }
            logger.warning(msg, { file: u.filePath, startLine: u.line });
        }

        const objects = result.untrackedIds.filter((u) => u.category === "object");
        const fields = result.untrackedIds.filter((u) => u.category === "field");
        const values = result.untrackedIds.filter((u) => u.category === "value");

        const parts: string[] = [];
        if (objects.length > 0) parts.push(`${objects.length} untracked object(s)`);
        if (fields.length > 0) parts.push(`${fields.length} untracked field(s)`);
        if (values.length > 0) parts.push(`${values.length} untracked enum value(s)`);

        logger.fail(`${parts.join(", ")} found. Run sync or assign IDs using AL Object ID Ninja.`);
        result.success = false;
    } else {
        logger.info("All object IDs are tracked. No issues found.");
    }
}

async function runSyncMode(
    inputs: ActionInputs,
    logger: ActionLogger,
    result: ActionResult,
    appConsumptions: AppWithConsumption[],
    groups: Map<string, DiscoveredApp[]>
): Promise<void> {
    // One syncIds call per unique backend ID
    for (const [backendId, groupApps] of groups) {
        const authKey = resolveAuthKey(groupApps);

        // Merge consumption from all apps in this group
        const groupAppHashes = new Set(groupApps.map((a) => a.hash));
        const groupConsumptions = appConsumptions.filter((ac) => groupAppHashes.has(ac.app.hash));
        const mergedConsumption = mergeConsumption(groupConsumptions.map((ac) => ac.branchConsumption));

        const idCount = Object.values(mergedConsumption).reduce((sum, ids) => sum + ids.length, 0);

        try {
            await syncConsumption(
                { appId: backendId, authKey, manifest: groupApps[0].manifest, workspace: inputs.workspace },
                mergedConsumption
            );

            const appNames = groupApps.map((a) => a.manifest.name).join(", ");
            logger.info(`Synced ${idCount} ID(s) for: ${appNames}`);

            for (const app of groupApps) {
                result.syncedApps.push({ app, idCount });
            }
        } catch (err) {
            const msg = (err as Error).message;
            logger.fail(msg);
            result.success = false;
            result.errors.push(msg);
            return;
        }
    }

    if (result.success) {
        logger.info("Sync completed successfully.");
    }
}
