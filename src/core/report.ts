import * as path from "path";
import { ActionResult } from "./types";

/**
 * The structured result of a run. Built field by field so that nothing from an app's
 * configuration, such as its auth key, can reach it.
 */
export interface ActionReport {
    success: boolean;
    offline: boolean;
    untracked: Array<{
        app: string;
        category: string;
        objectType: string;
        objectId: number;
        objectName: string;
        memberName?: string;
        memberId?: number;
        file: string;
        line: number;
    }>;
    collisions: Array<{
        objectType: string;
        objectId: number;
        conditional: boolean;
        locations: Array<{ app: string; objectName: string; file: string; line: number; conditional: boolean }>;
    }>;
    errors: string[];
}

function relativeFile(workspace: string, filePath: string): string {
    return path.relative(workspace, filePath).split(path.sep).join("/");
}

export function toReport(result: ActionResult, workspace: string): ActionReport {
    return {
        success: result.success,
        offline: result.offline,
        untracked: result.untrackedIds.map(u => ({
            app: u.app.manifest.name,
            category: u.category,
            objectType: u.objectType,
            objectId: u.objectId,
            objectName: u.objectName,
            memberName: u.memberName,
            memberId: u.memberId,
            file: relativeFile(workspace, u.filePath),
            line: u.line,
        })),
        collisions: result.collisions.map(c => ({
            objectType: c.objectType,
            objectId: c.objectId,
            conditional: c.conditional,
            locations: c.locations.map(l => ({
                app: l.app.manifest.name,
                objectName: l.objectName,
                file: relativeFile(workspace, l.filePath),
                line: l.line,
                conditional: l.conditional,
            })),
        })),
        errors: result.errors,
    };
}
