/**
 * A collision is the same object type and ID declared in two files of one app or one app pool.
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

function inputs(workspace: string, failOnCollision = false) {
    return { mode: "warn" as const, excludeFieldIds: false, excludeEnumValueIds: false, workspace, failOnCollision };
}

function appWithTwoFiles(first: string, second: string): string {
    return createAlRepo({ "app/app.json": appJson(APP_ID), "app/A.al": first, "app/B.al": second });
}

describe("collision detection", () => {
    beforeEach(() => {
        jest.resetAllMocks();
        mockGetConsumption.mockResolvedValue({ codeunit: [50000], table: [50000] });
    });
    afterEach(() => removeAlRepos());

    it("should warn without failing by default when two files declare the same object ID", async () => {
        const workspace = appWithTwoFiles(codeunit(50000, "A"), codeunit(50000, "B"));
        const logger = memoryLogger();

        await run(inputs(workspace), logger);

        expect(logger.warnings.join()).toContain("codeunit 50000");
        expect(logger.failures).toEqual([]);
    });

    it("should report the collision in the result", async () => {
        const workspace = appWithTwoFiles(codeunit(50000, "A"), codeunit(50000, "B"));

        const result = await run(inputs(workspace), memoryLogger());

        expect(result.collisions.map(c => [c.objectType, c.objectId, c.locations.length])).toEqual([
            ["codeunit", 50000, 2],
        ]);
    });

    it("should fail when two files declare the same object ID and failing on collisions is on", async () => {
        const workspace = appWithTwoFiles(codeunit(50000, "A"), codeunit(50000, "B"));
        const logger = memoryLogger();

        const result = await run(inputs(workspace, true), logger);

        expect(result.success).toBe(false);
        expect(logger.failures.join()).toContain("collision");
    });

    it("should find a collision between two apps of one pool", async () => {
        const config = JSON.stringify({ appPoolId: POOL_ID });
        const workspace = createAlRepo({
            "one/app.json": appJson(APP_ID, "One"),
            "one/.objidconfig": config,
            "one/A.al": codeunit(50000, "A"),
            "two/app.json": appJson(OTHER_APP_ID, "Two"),
            "two/.objidconfig": config,
            "two/B.al": codeunit(50000, "B"),
        });

        const result = await run(inputs(workspace), memoryLogger());

        expect(result.collisions).toHaveLength(1);
    });

    it("should not treat the same ID on different object types as a collision", async () => {
        const table = 'table 50000 "T"\n{\n    fields\n    {\n    }\n}\n';
        const workspace = appWithTwoFiles(codeunit(50000, "A"), table);

        const result = await run(inputs(workspace), memoryLogger());

        expect(result.collisions).toEqual([]);
    });

    it("should not treat a file seen through two nested apps as a collision", async () => {
        const workspace = createAlRepo({
            "app/app.json": appJson(APP_ID, "Outer"),
            "app/inner/app.json": appJson(APP_ID, "Inner"),
            "app/inner/A.al": codeunit(50000, "A"),
        });

        const result = await run(inputs(workspace), memoryLogger());

        expect(result.collisions).toEqual([]);
    });

    it("should warn but not fail on a collision that depends on #if, even when failing on collisions is on", async () => {
        const conditional = (symbol: string, name: string) => `#if not ${symbol}\n${codeunit(50000, name)}#endif\n`;
        const workspace = appWithTwoFiles(conditional("ONPREM", "A"), conditional("SAAS", "B"));
        const logger = memoryLogger();

        const result = await run(inputs(workspace, true), logger);

        expect(result.collisions).toHaveLength(1);
        expect(logger.failures).toEqual([]);
    });

    it("should fail when one declaration is under #if but two others are not", async () => {
        const workspace = createAlRepo({
            "app/app.json": appJson(APP_ID),
            "app/A.al": codeunit(50000, "A"),
            "app/B.al": codeunit(50000, "B"),
            "app/C.al": `#if not SAAS\n${codeunit(50000, "C")}#endif\n`,
        });
        const logger = memoryLogger();

        await run(inputs(workspace, true), logger);

        expect(logger.failures.join()).toContain("collision");
    });

    it("should not say no issues were found when there is a collision", async () => {
        const workspace = appWithTwoFiles(codeunit(50000, "A"), codeunit(50000, "B"));
        const logger = memoryLogger();

        await run(inputs(workspace), logger);

        expect(logger.infos.join()).not.toContain("No issues found");
    });

    it("should still report collisions when the backend cannot be reached", async () => {
        const workspace = appWithTwoFiles(codeunit(50000, "A"), codeunit(50000, "B"));
        mockGetConsumption.mockRejectedValue(new Error("Backend unreachable: boom"));

        const result = await run(inputs(workspace), memoryLogger());

        expect(result.collisions).toHaveLength(1);
    });
});
