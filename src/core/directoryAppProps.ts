import * as fs from "fs";
import * as path from "path";
import { parse } from "comment-json";

const PROPS_FILE_NAME = "directory.app.props.json";

// The only app.json properties Ninja consumes. The directory.app.props.json feature can never
// supply or alter `id`/`idRanges`, so they are deliberately excluded and must never be written.
const PROPS_OF_INTEREST = ["name", "publisher", "version"] as const;

const TOKEN = /\$\(([^)]+)\)/g;

/**
 * Parses JSON that may have comments or a byte order mark.
 */
export function parseTolerant(content: string): unknown {
    return parse(content.replace(/^﻿/, ""));
}

function hasToken(value: unknown): value is string {
    return typeof value === "string" && /\$\([^)]+\)/.test(value);
}

function resolveTokens(value: string, vars: Record<string, string>): string {
    return value.replace(TOKEN, (match, key) => (key in vars ? vars[key] : match));
}

function needsResolution(parsedApp: any): boolean {
    return PROPS_OF_INTEREST.some(key => parsedApp[key] === undefined || hasToken(parsedApp[key]));
}

function findPropsFile(appJsonPath: string): string | undefined {
    let currentDir = path.dirname(appJsonPath);

    while (true) {
        const candidate = path.join(currentDir, PROPS_FILE_NAME);
        if (fs.existsSync(candidate)) {
            return candidate;
        }

        const parentDir = path.dirname(currentDir);
        if (parentDir === currentDir) {
            return undefined;
        }
        currentDir = parentDir;
    }
}

function toStringMap(section: any): Record<string, string> {
    const result: Record<string, string> = {};
    if (!section || typeof section !== "object") {
        return result;
    }

    for (const key of Object.keys(section)) {
        const value = section[key];
        if (value !== null && value !== undefined && typeof value !== "object") {
            result[key] = String(value);
        }
    }
    return result;
}

function resolveVariables(variables: Record<string, string>): Record<string, string> {
    const keys = Object.keys(variables);

    // Iterate to a fixed point; the `keys.length + 1` bound stops cyclic references from looping forever.
    for (let pass = 0; pass <= keys.length; pass++) {
        let changed = false;
        for (const key of keys) {
            const resolved = resolveTokens(variables[key], variables);
            if (resolved !== variables[key]) {
                variables[key] = resolved;
                changed = true;
            }
        }
        if (!changed) {
            break;
        }
    }
    return variables;
}

/**
 * Resolves `directory.app.props.json` for the properties Ninja consumes, in place. It fills a
 * property `app.json` omits from the file's `properties` (`app.json` wins), and resolves `$(...)`
 * tokens in `app.json` values against its `variables`. A malformed props file is ignored.
 */
export function applyDirectoryAppProps(appJsonPath: string, parsedApp: any): void {
    if (!needsResolution(parsedApp)) {
        return;
    }

    const propsPath = findPropsFile(appJsonPath);
    if (!propsPath) {
        return;
    }

    let props: any;
    try {
        props = parseTolerant(fs.readFileSync(propsPath, "utf-8"));
    } catch {
        return;
    }

    const variables = resolveVariables(toStringMap(props?.variables));
    const properties = toStringMap(props?.properties);
    for (const key of Object.keys(properties)) {
        properties[key] = resolveTokens(properties[key], variables);
    }

    for (const key of PROPS_OF_INTEREST) {
        if (parsedApp[key] === undefined && key in properties) {
            parsedApp[key] = properties[key];
            continue;
        }
        if (hasToken(parsedApp[key])) {
            parsedApp[key] = resolveTokens(parsedApp[key], variables);
        }
    }
}
