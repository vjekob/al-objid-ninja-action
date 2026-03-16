import * as tl from "azure-pipelines-task-lib";
import { run, ActionLogger, ActionInputs } from "./core";

const logger: ActionLogger = {
    info: (msg) => console.log(msg),
    warning: (msg) => tl.warning(msg),
    error: (msg) => tl.error(msg),
    fail: (msg) => tl.setResult(tl.TaskResult.Failed, msg),
};

async function main(): Promise<void> {
    const mode = tl.getInput("mode") || "warn";
    if (mode === "sync") {
        tl.setResult(tl.TaskResult.Failed, "Sync mode is not supported at the moment. This task only checks for untracked object IDs.");
        return;
    }

    const workspace = tl.getVariable("Build.SourcesDirectory");
    if (!workspace) {
        tl.setResult(tl.TaskResult.Failed, "Build.SourcesDirectory is not set. Is this running inside an Azure DevOps pipeline?");
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
