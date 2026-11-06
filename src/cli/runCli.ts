import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { parseArgs } from "util";
import { ActionLogger, ActionResult, run, toReport } from "../core";

export interface CliIo {
    out(text: string): void;
    err(text: string): void;
}

const EXIT_OK = 0;
const EXIT_PROBLEMS_FOUND = 1;
const EXIT_COULD_NOT_CHECK = 2;

const HELP = `Usage: al-object-id-ninja-cli [path] [options]

Checks AL apps under path (default: current folder) against AL Object ID Ninja. Reports object,
field, and enum value IDs the backend doesn't track, and object IDs declared in more than one file.

Options:
  --staged                  Report only problems involving AL files staged in git. For pre-commit hooks.
  --json                    Print the result as JSON on stdout.
  --fail-on-collision       Exit 1 on a collision. By default collisions only warn.
  --fail-when-offline       Exit 2 when the backend can't be reached. By default this only warns.
  --exclude-field-ids       Skip table and table extension field IDs.
  --exclude-enum-value-ids  Skip enum and enum extension value IDs.
  --help                    Show this help.

Exit codes:
  0  No problems found
  1  Problems found
  2  The check could not run
`;

function parseCliArgs(args: string[]) {
    return parseArgs({
        args,
        allowPositionals: true,
        options: {
            staged: { type: "boolean" },
            json: { type: "boolean" },
            "fail-on-collision": { type: "boolean" },
            "fail-when-offline": { type: "boolean" },
            "exclude-field-ids": { type: "boolean" },
            "exclude-enum-value-ids": { type: "boolean" },
            help: { type: "boolean" },
        },
    });
}

/**
 * Absolute paths of the AL files staged in the git repository containing `root`.
 */
function getStagedAlFiles(root: string): string[] {
    const git = (...args: string[]) =>
        execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    const topLevel = git("rev-parse", "--show-toplevel").trim();
    return git("diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z")
        .split("\0")
        .filter(file => file.toLowerCase().endsWith(".al"))
        .map(file => path.join(topLevel, file));
}

function emptyResult(): ActionResult {
    return { success: true, untrackedIds: [], collisions: [], offline: false, syncedApps: [], errors: [], warnings: [] };
}

function exitCodeOf(result: ActionResult): number {
    if (result.errors.length > 0) {
        return EXIT_COULD_NOT_CHECK;
    }
    return result.success ? EXIT_OK : EXIT_PROBLEMS_FOUND;
}

/**
 * Runs the CLI and returns its exit code. With --json, stdout holds only the JSON report.
 */
export async function runCli(args: string[], io: CliIo): Promise<number> {
    let parsed: ReturnType<typeof parseCliArgs>;
    try {
        parsed = parseCliArgs(args);
    } catch (err) {
        io.err(`${(err as Error).message}\n\n${HELP}`);
        return EXIT_COULD_NOT_CHECK;
    }

    const { values, positionals } = parsed;
    if (values.help) {
        io.out(HELP);
        return EXIT_OK;
    }

    const workspace = path.resolve(positionals[0] ?? process.cwd());
    if (!fs.existsSync(workspace)) {
        io.err(`Path not found: ${workspace}`);
        return EXIT_COULD_NOT_CHECK;
    }

    const print = values.json ? io.err : io.out;
    const printResult = (result: ActionResult) => {
        if (values.json) {
            io.out(JSON.stringify(toReport(result, workspace), null, 2));
        }
    };

    let onlyFiles: string[] | undefined;
    if (values.staged) {
        try {
            onlyFiles = getStagedAlFiles(workspace);
        } catch (err) {
            io.err(`Could not read staged files from git: ${(err as Error).message}`);
            return EXIT_COULD_NOT_CHECK;
        }
        if (onlyFiles.length === 0) {
            print("No AL files are staged.");
            printResult(emptyResult());
            return EXIT_OK;
        }
    }

    const logger: ActionLogger = {
        info: message => print(message),
        warning: (message, annotation) => {
            const relativeFile = annotation?.file && path.relative(workspace, annotation.file);
            const location = relativeFile ? `${relativeFile}:${annotation?.startLine}: ` : "";
            print(`warning: ${location}${message}`);
        },
        error: message => print(`error: ${message}`),
        fail: message => print(`error: ${message}`),
    };

    const result = await run(
        {
            mode: "warn",
            excludeFieldIds: !!values["exclude-field-ids"],
            excludeEnumValueIds: !!values["exclude-enum-value-ids"],
            workspace,
            failOnCollision: !!values["fail-on-collision"],
            allowOffline: !values["fail-when-offline"],
            gitIdentity: "config",
            tolerantManifests: true,
            onlyFiles,
        },
        logger
    );

    printResult(result);
    return exitCodeOf(result);
}
