import * as fs from "fs";
import { ALObject, Collision, CollisionLocation, DiscoveredApp } from "./types";

interface AppObjects {
    app: DiscoveredApp;
    objects: ALObject[];
}

/**
 * Whether the given 1-based line is inside an #if block.
 */
function isInsideIfBlock(filePath: string, line: number): boolean {
    const lines = fs.readFileSync(filePath, "utf-8").split(/\r?\n/).slice(0, line - 1);
    let depth = 0;
    for (const text of lines) {
        if (/^\s*#if\b/i.test(text)) {
            depth++;
        }
        if (/^\s*#endif\b/i.test(text)) {
            depth--;
        }
    }
    return depth > 0;
}

/**
 * Finds object IDs declared in more than one file among apps that share consumption: one app, or
 * all apps of one pool. Several declarations in one file are not a collision.
 */
export function findCollisions(appObjects: AppObjects[]): Collision[] {
    const byObjectId = new Map<string, { objectType: string; objectId: number; locations: Map<string, CollisionLocation> }>();

    for (const { app, objects } of appObjects) {
        for (const obj of objects) {
            if (!obj.id) {
                continue;
            }

            const key = `${obj.type}:${obj.id}`;
            const entry = byObjectId.get(key) ?? { objectType: obj.type, objectId: obj.id, locations: new Map() };
            byObjectId.set(key, entry);

            if (!entry.locations.has(obj.path)) {
                entry.locations.set(obj.path, {
                    app,
                    objectName: obj.name,
                    filePath: obj.path,
                    line: obj.line,
                    conditional: false,
                });
            }
        }
    }

    const collisions: Collision[] = [];
    for (const { objectType, objectId, locations } of byObjectId.values()) {
        if (locations.size < 2) {
            continue;
        }

        const resolved = [...locations.values()].map(location => ({
            ...location,
            conditional: isInsideIfBlock(location.filePath, location.line),
        }));
        const unconditional = resolved.filter(location => !location.conditional);
        collisions.push({ objectType, objectId, locations: resolved, conditional: unconditional.length < 2 });
    }
    return collisions;
}
