/**
 * Mirrors ALUniqueEntity from the ninja-extension parser.
 */
export interface ALUniqueEntity {
    id: number;
    line: number;
    character: number;
    name: string;
}

/**
 * Mirrors ALObject from the ninja-extension parser.
 */
export interface ALObject extends ALUniqueEntity {
    path: string;
    type: string;
    idRange: [number, number];
    fields?: ALUniqueEntity[];
    values?: ALUniqueEntity[];
    properties?: { [key: string]: string };
    extends?: string;
    hasError?: boolean;
    error?: string;
}

/**
 * Consumption info: object type (or type_id for fields/values) -> array of used IDs.
 */
export interface ConsumptionInfo {
    [key: string]: number[];
}

/**
 * Parsed app.json manifest — only the fields we need.
 */
export interface AppManifest {
    id: string;
    name: string;
    publisher: string;
    version: string;
    idRanges?: Array<{ from: number; to: number }>;
}

/**
 * Parsed .objidconfig — only the fields we need.
 */
export interface ObjIdConfig {
    authKey?: string;
    appPoolId?: string;
}

/**
 * A discovered AL app in the repository.
 */
export interface DiscoveredApp {
    /** Directory containing app.json */
    appDir: string;
    /** Parsed app.json */
    manifest: AppManifest;
    /** SHA256 hash of the app GUID */
    hash: string;
    /** Parsed .objidconfig, if present */
    config: ObjIdConfig;
    /** Effective ID for backend calls: appPoolId if pooled, otherwise hash */
    backendId: string;
}

/**
 * Category of an untracked ID.
 */
export type UntrackedCategory = "object" | "field" | "value";

/**
 * An untracked ID found during comparison.
 */
export interface UntrackedId {
    app: DiscoveredApp;
    category: UntrackedCategory;
    /** e.g. "table", "codeunit", "tableextension", "enum", "enumextension" */
    objectType: string;
    objectId: number;
    /** Name of the object (for fields/values: name of the parent object) */
    objectName: string;
    /** Name of the field or enum value (only for field/value categories) */
    memberName?: string;
    memberId?: number;
    filePath: string;
    line: number;
}

/**
 * Result of running the action.
 */
export interface ActionResult {
    success: boolean;
    untrackedIds: UntrackedId[];
    syncedApps: Array<{ app: DiscoveredApp; idCount: number }>;
    errors: string[];
    warnings: string[];
}

/**
 * Platform-agnostic logger interface.
 * GitHub Actions and Azure DevOps will each provide their own implementation.
 */
export interface ActionLogger {
    info(message: string): void;
    warning(message: string, annotation?: { file?: string; startLine?: number }): void;
    error(message: string): void;
    fail(message: string): void;
}

/**
 * Action inputs — platform-agnostic.
 */
export interface ActionInputs {
    mode: "warn" | "sync";
    excludeFieldIds: boolean;
    excludeEnumValueIds: boolean;
    workspace: string;
}
