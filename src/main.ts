import * as core from "@actions/core";
import { run, ActionLogger, ActionInputs } from "./core";

const logger: ActionLogger = {
    info: (msg) => core.info(msg),
    warning: (msg, annotation) => {
        if (annotation) {
            core.warning(msg, { file: annotation.file, startLine: annotation.startLine });
        } else {
            core.warning(msg);
        }
    },
    error: (msg) => core.error(msg),
    fail: (msg) => core.setFailed(msg),
};

async function main(): Promise<void> {
    const mode = core.getInput("mode") || "warn";
    if (mode !== "warn" && mode !== "sync") {
        core.setFailed(`Invalid mode "${mode}". Must be "warn" or "sync".`);
        return;
    }

    const workspace = process.env.GITHUB_WORKSPACE;
    if (!workspace) {
        core.setFailed("GITHUB_WORKSPACE is not set. Is this running inside a GitHub Actions workflow?");
        return;
    }

    const inputs: ActionInputs = {
        mode,
        excludeFieldIds: core.getInput("exclude-field-ids") === "true",
        excludeEnumValueIds: core.getInput("exclude-enum-value-ids") === "true",
        workspace,
    };

    await run(inputs, logger);
}

main().catch((err) => {
    core.setFailed(`Unexpected error: ${(err as Error).message}`);
});
