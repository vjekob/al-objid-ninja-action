/**
 * Pins how the action behaves for existing users. These must keep passing unchanged.
 * The AL parser is real; only the backend, which crosses the network, is faked.
 */
jest.mock("../src/core/backend");

import { run } from "../src/core";
import { getConsumption } from "../src/core/backend";
import { appJson, codeunit, createAlRepo, memoryLogger, removeAlRepos } from "./support/alRepo";

const mockGetConsumption = getConsumption as jest.MockedFunction<typeof getConsumption>;
const APP_ID = "11111111-1111-1111-1111-111111111111";
const OTHER_APP_ID = "22222222-2222-2222-2222-222222222222";
const POOL_ID = "a".repeat(64);
const TABLE = 'table 50000 "T"\n{\n    fields\n    {\n        field(1; F; Integer) { }\n    }\n}\n';

function inputs(workspace: string) {
    return { mode: "warn" as const, excludeFieldIds: false, excludeEnumValueIds: false, workspace };
}

describe("action behavior for existing users", () => {
    beforeEach(() => jest.resetAllMocks());
    afterEach(() => removeAlRepos());

    it("should fail with the known message when an object ID is untracked", async () => {
        const workspace = createAlRepo({ "app/app.json": appJson(APP_ID), "app/A.al": codeunit(50000, "A") });
        mockGetConsumption.mockResolvedValue({});
        const logger = memoryLogger();

        await run(inputs(workspace), logger);

        expect(logger.warnings).toEqual(['codeunit 50000 "A" is not tracked by AL Object ID Ninja']);
        expect(logger.failures).toEqual([
            "1 untracked object(s) found. Run sync or assign IDs using AL Object ID Ninja.",
        ]);
    });

    it("should succeed without warnings when every object ID is tracked", async () => {
        const workspace = createAlRepo({ "app/app.json": appJson(APP_ID), "app/A.al": codeunit(50000, "A") });
        mockGetConsumption.mockResolvedValue({ codeunit: [50000] });
        const logger = memoryLogger();

        await run(inputs(workspace), logger);

        expect(logger.warnings).toEqual([]);
        expect(logger.failures).toEqual([]);
    });

    it("should fail on an untracked field when fields are not excluded", async () => {
        const workspace = createAlRepo({ "app/app.json": appJson(APP_ID), "app/T.al": TABLE });
        mockGetConsumption.mockResolvedValue({ table: [50000] });
        const logger = memoryLogger();

        await run(inputs(workspace), logger);

        expect(logger.failures).toEqual([
            "1 untracked field(s) found. Run sync or assign IDs using AL Object ID Ninja.",
        ]);
    });

    it("should not fail on an untracked field when fields are excluded", async () => {
        const workspace = createAlRepo({ "app/app.json": appJson(APP_ID), "app/T.al": TABLE });
        mockGetConsumption.mockResolvedValue({ table: [50000] });
        const logger = memoryLogger();

        await run({ ...inputs(workspace), excludeFieldIds: true }, logger);

        expect(logger.failures).toEqual([]);
    });

    it("should check pool apps against the pool and fetch it once", async () => {
        const config = JSON.stringify({ appPoolId: POOL_ID });
        const workspace = createAlRepo({
            "one/app.json": appJson(APP_ID, "One"),
            "one/.objidconfig": config,
            "one/A.al": codeunit(50000, "A"),
            "two/app.json": appJson(OTHER_APP_ID, "Two"),
            "two/.objidconfig": config,
            "two/B.al": codeunit(50001, "B"),
        });
        mockGetConsumption.mockResolvedValue({ codeunit: [50000, 50001] });

        await run(inputs(workspace), memoryLogger());

        expect(mockGetConsumption.mock.calls.map(([options]) => options.appId)).toEqual([POOL_ID]);
    });

    it("should fail when the backend cannot be reached", async () => {
        const workspace = createAlRepo({ "app/app.json": appJson(APP_ID), "app/A.al": codeunit(50000, "A") });
        mockGetConsumption.mockRejectedValue(new Error("Backend unreachable: boom"));
        const logger = memoryLogger();

        await run(inputs(workspace), logger);

        expect(logger.failures).toHaveLength(1);
    });

    it("should skip an app whose app.json has comments", async () => {
        const workspace = createAlRepo({
            "app/app.json": `// comment\n${appJson(APP_ID)}`,
            "app/A.al": codeunit(50000, "A"),
        });

        await run(inputs(workspace), memoryLogger());

        expect(mockGetConsumption).not.toHaveBeenCalled();
    });

    it("should not treat the same ID in two standalone apps as a problem", async () => {
        const workspace = createAlRepo({
            "one/app.json": appJson(APP_ID, "One"),
            "one/A.al": codeunit(50000, "A"),
            "two/app.json": appJson(OTHER_APP_ID, "Two"),
            "two/B.al": codeunit(50000, "B"),
        });
        mockGetConsumption.mockResolvedValue({ codeunit: [50000] });
        const logger = memoryLogger();

        await run(inputs(workspace), logger);

        expect(logger.warnings).toEqual([]);
        expect(logger.failures).toEqual([]);
    });
});
