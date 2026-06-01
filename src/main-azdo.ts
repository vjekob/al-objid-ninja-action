import * as path from "path";
import * as fs from "fs";
import * as tl from "azure-pipelines-task-lib";
import { run, ActionLogger, ActionInputs } from "./core";

const logger: ActionLogger = {
    info: (msg) => console.log(msg),
    warning: (msg) => tl.warning(msg),
    error: (msg) => tl.error(msg),
    fail: (msg) => tl.setResult(tl.TaskResult.Failed, msg),
};

/**
 * Resolve the directory to scan for AL apps.
 *
 * By default we use `Build.SourcesDirectory`, which is where the `checkout`
 * step places sources when no custom path is configured. However, when a
 * pipeline checks the repository out to a custom location (via the `checkout`
 * step's `path` parameter), `Build.SourcesDirectory` keeps pointing at the
 * default sources directory and no longer reflects where the repository
 * actually lives. In that case the user can set the `workingDirectory` input.
 *
 * Resolution rules for `workingDirectory`:
 *  - absolute path          -> used as-is
 *  - relative path          -> resolved against `Agent.BuildDirectory`, which
 *                              mirrors how the `checkout` step interprets its
 *                              own `path` parameter (so users can pass the same
 *                              value they gave to `checkout`)
 *  - empty / not provided   -> falls back to `Build.SourcesDirectory`
 */
function resolveWorkspace(): string | undefined {
    const sourcesDirectory = tl.getVariable("Build.SourcesDirectory");
    const buildDirectory = tl.getVariable("Agent.BuildDirectory");

    const workingDirectory = tl.getInput("workingDirectory", false);
    if (!workingDirectory || workingDirectory.trim() === "") {
        return sourcesDirectory;
    }

    const trimmed = workingDirectory.trim();
    if (path.isAbsolute(trimmed)) {
        return trimmed;
    }

    const base = buildDirectory || sourcesDirectory;
    if (!base) {
        return undefined;
    }
    return path.resolve(base, trimmed);
}

async function main(): Promise<void> {
    const mode = tl.getInput("mode") || "warn";
    if (mode === "sync") {
        tl.setResult(tl.TaskResult.Failed, "Sync mode is not supported at the moment. This task only checks for untracked object IDs.");
        return;
    }

    const workspace = resolveWorkspace();
    if (!workspace) {
        tl.setResult(
            tl.TaskResult.Failed,
            "Could not determine the working directory. Is this running inside an Azure DevOps pipeline? If you use a custom checkout path, set the 'workingDirectory' input."
        );
        return;
    }

    if (!fs.existsSync(workspace)) {
        tl.setResult(
            tl.TaskResult.Failed,
            `The working directory "${workspace}" does not exist. If your pipeline checks the repository out to a custom location, set the 'workingDirectory' input to match the 'path' used by the checkout step.`
        );
        return;
    }

    const inputs: ActionInputs = {
        mode: "warn",
        excludeFieldIds: tl.getBoolInput("excludeFieldIds", false) ?? false,
        excludeEnumValueIds: tl.getBoolInput("excludeEnumValueIds", false) ?? false,
        workspace,
    };

    await run(inputs, logger);
}

main().catch((err) => {
    tl.setResult(tl.TaskResult.Failed, `Unexpected error: ${(err as Error).message}`);
});
