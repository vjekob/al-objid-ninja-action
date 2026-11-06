/**
 * The CLI through its public entry point. The AL parser and git are real; only the backend,
 * which crosses the network, is faked.
 */
jest.mock("../src/core/backend");

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { runCli } from "../src/cli/runCli";
import { BackendUnreachableError } from "../src/core/errors";
import { getConsumption } from "../src/core/backend";
import { appJson, codeunit, createAlRepo, removeAlRepos } from "./support/alRepo";

const mockGetConsumption = getConsumption as jest.MockedFunction<typeof getConsumption>;
const APP_ID = "11111111-1111-1111-1111-111111111111";
const AUTH_KEY = "secret-auth-key";

async function cli(args: string[]) {
    const out: string[] = [];
    const err: string[] = [];
    const exitCode = await runCli(args, {
        out: text => {
            out.push(text);
        },
        err: text => {
            err.push(text);
        },
    });
    return { exitCode, out: out.join("\n"), err: err.join("\n") };
}

function repo(extra: Record<string, string> = {}): string {
    return createAlRepo({ "app/app.json": appJson(APP_ID), "app/A.al": codeunit(50000, "A"), ...extra });
}

function gitInit(root: string): void {
    const git = (command: string) => execSync(`git ${command}`, { cwd: root, stdio: "pipe" });
    git("init");
    git("config user.name Tester");
    git("config user.email tester@example.com");
    git("add -A");
    git('commit -m "start"');
}

describe("CLI", () => {
    beforeEach(() => {
        jest.resetAllMocks();
        mockGetConsumption.mockResolvedValue({ codeunit: [50000] });
    });
    afterEach(() => removeAlRepos());

    it("should exit 0 when every object ID is tracked", async () => {
        const { exitCode } = await cli([repo()]);

        expect(exitCode).toBe(0);
    });

    it("should exit 1 when an object ID is untracked", async () => {
        mockGetConsumption.mockResolvedValue({});

        const { exitCode } = await cli([repo()]);

        expect(exitCode).toBe(1);
    });

    it("should exit 0 on a collision by default", async () => {
        const { exitCode } = await cli([repo({ "app/B.al": codeunit(50000, "B") })]);

        expect(exitCode).toBe(0);
    });

    it("should exit 1 on a collision with --fail-on-collision", async () => {
        const { exitCode } = await cli([repo({ "app/B.al": codeunit(50000, "B") }), "--fail-on-collision"]);

        expect(exitCode).toBe(1);
    });

    it("should exit 2 when the check could not run", async () => {
        mockGetConsumption.mockRejectedValue(new Error("Backend returned HTTP 404: not found"));

        const { exitCode } = await cli([repo()]);

        expect(exitCode).toBe(2);
    });

    it("should exit 0 with a warning when the backend is unreachable", async () => {
        mockGetConsumption.mockRejectedValue(new BackendUnreachableError("Backend unreachable: boom"));

        const { exitCode, out } = await cli([repo()]);

        expect(exitCode).toBe(0);
        expect(out).toContain("unreachable");
    });

    it("should exit 2 when the backend is unreachable with --fail-when-offline", async () => {
        mockGetConsumption.mockRejectedValue(new BackendUnreachableError("Backend unreachable: boom"));

        const { exitCode } = await cli([repo(), "--fail-when-offline"]);

        expect(exitCode).toBe(2);
    });

    it("should exit 2 on an unknown option", async () => {
        const { exitCode } = await cli(["--no-such-option"]);

        expect(exitCode).toBe(2);
    });

    it("should print only JSON on stdout with --json", async () => {
        mockGetConsumption.mockResolvedValue({});

        const { out } = await cli([repo(), "--json"]);

        const report = JSON.parse(out);
        expect(report.untracked.map((u: any) => [u.objectType, u.objectId, u.file])).toEqual([
            ["codeunit", 50000, "app/A.al"],
        ]);
    });

    it("should report collisions as JSON with --json", async () => {
        const { out } = await cli([repo({ "app/B.al": codeunit(50000, "B") }), "--json"]);

        const report = JSON.parse(out);
        expect(report.collisions[0].locations.map((l: any) => l.file).sort()).toEqual(["app/A.al", "app/B.al"]);
    });

    it("should never put the auth key in the JSON report", async () => {
        mockGetConsumption.mockResolvedValue({});
        const root = repo({ "app/.objidconfig": JSON.stringify({ authKey: AUTH_KEY }) });

        const { out } = await cli([root, "--json"]);

        expect(out).not.toContain(AUTH_KEY);
    });

    it("should check an app whose app.json has comments", async () => {
        mockGetConsumption.mockResolvedValue({});
        const root = createAlRepo({
            "app/app.json": `// comment\n${appJson(APP_ID)}`,
            "app/A.al": codeunit(50000, "A"),
        });

        const { exitCode } = await cli([root]);

        expect(exitCode).toBe(1);
    });

    it("should send the publisher from directory.app.props.json", async () => {
        const root = createAlRepo({
            "directory.app.props.json": JSON.stringify({ properties: { publisher: "FromProps" } }),
            "app/app.json": JSON.stringify({ id: APP_ID, name: "App", version: "1.0.0.0" }),
            "app/A.al": codeunit(50000, "A"),
        });

        await cli([root]);

        expect(mockGetConsumption.mock.calls[0][0].manifest?.publisher).toBe("FromProps");
    });

    it("should identify the user from git config", async () => {
        await cli([repo()]);

        expect(mockGetConsumption.mock.calls[0][0].gitIdentity).toBe("config");
    });

    describe("--staged", () => {
        it("should ignore an untracked ID in a file that is not staged", async () => {
            mockGetConsumption.mockResolvedValue({});
            const root = repo();
            gitInit(root);
            fs.writeFileSync(path.join(root, "app/Other.al"), codeunit(50001, "Other"));
            execSync("git add app/Other.al", { cwd: root, stdio: "pipe" });

            const { out } = await cli([root, "--staged", "--json"]);

            const report = JSON.parse(out);
            expect(report.untracked.map((u: any) => u.objectId)).toEqual([50001]);
        });

        it("should find a collision between a staged file and one that is not staged", async () => {
            const root = repo();
            gitInit(root);
            fs.writeFileSync(path.join(root, "app/B.al"), codeunit(50000, "B"));
            execSync("git add app/B.al", { cwd: root, stdio: "pipe" });

            const { out } = await cli([root, "--staged", "--json"]);

            expect(JSON.parse(out).collisions).toHaveLength(1);
        });

        it("should not contact the backend when no AL file is staged", async () => {
            const root = repo();
            gitInit(root);

            const { exitCode } = await cli([root, "--staged"]);

            expect(exitCode).toBe(0);
            expect(mockGetConsumption).not.toHaveBeenCalled();
        });
    });
});
