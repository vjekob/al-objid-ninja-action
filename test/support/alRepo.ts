import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const created: string[] = [];

/**
 * Creates a throwaway folder holding AL files and app manifests, removed by `removeAlRepos`.
 */
export function createAlRepo(files: Record<string, string>): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "ninja-action-test-"));
    created.push(root);
    for (const [relativePath, content] of Object.entries(files)) {
        const fullPath = path.join(root, relativePath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, content);
    }
    return root;
}

export function removeAlRepos(): void {
    for (const root of created.splice(0)) {
        fs.rmSync(root, { recursive: true, force: true });
    }
}

export function appJson(id: string, name = "TestApp"): string {
    return JSON.stringify({
        id,
        name,
        publisher: "TestPublisher",
        version: "1.0.0.0",
        idRanges: [{ from: 50000, to: 50999 }],
    });
}

export function codeunit(id: number, name: string): string {
    return `codeunit ${id} "${name}"\n{\n}\n`;
}

export function memoryLogger() {
    const warnings: string[] = [];
    const failures: string[] = [];
    const infos: string[] = [];
    return {
        warnings,
        failures,
        infos,
        info: (message: string) => {
            infos.push(message);
        },
        warning: (message: string) => {
            warnings.push(message);
        },
        error: () => {},
        fail: (message: string) => {
            failures.push(message);
        },
    };
}
