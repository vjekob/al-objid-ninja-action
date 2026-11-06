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
        locations: Array<{
            app: string;
            objectName: string;
            file: string;
            line: number;
            conditional: boolean;
        }>;
    }>;
    errors: string[];
}
export declare function toReport(result: ActionResult, workspace: string): ActionReport;
//# sourceMappingURL=report.d.ts.map