/**
 * Which user identity reaches the backend. `https` is the network seam; git is real.
 */
jest.mock("https", () => ({ request: jest.fn() }));

import { execSync } from "child_process";
import * as https from "https";
import { BackendUnreachableError } from "../src/core/errors";
import { appJson, createAlRepo, removeAlRepos } from "./support/alRepo";

const mockRequest = https.request as unknown as jest.Mock;

function useBackendResponse(): void {
    mockRequest.mockImplementation((_options: unknown, callback: (res: any) => void) => ({
        on: jest.fn(),
        write: jest.fn(),
        end: () =>
            callback({
                statusCode: 200,
                on: (event: string, handler: (chunk?: string) => void) => {
                    if (event === "data") {
                        handler("{}");
                    }
                    if (event === "end") {
                        handler();
                    }
                },
            }),
    }));
}

function repoCommittedBySomeoneElse(): string {
    const root = createAlRepo({ "app.json": appJson("11111111-1111-1111-1111-111111111111") });
    const git = (command: string) => execSync(`git ${command}`, { cwd: root, stdio: "pipe" });
    git("init");
    git("config user.name Local");
    git("config user.email local@example.com");
    git("add -A");
    git('-c user.name=Author -c user.email=author@example.com commit -m "start"');
    return root;
}

async function sentEmail(gitIdentity?: "config"): Promise<string> {
    let backend: typeof import("../src/core/backend");
    jest.isolateModules(() => {
        backend = require("../src/core/backend");
    });
    await backend!.getConsumption({ appId: "app", workspace: repoCommittedBySomeoneElse(), gitIdentity });
    const headers = mockRequest.mock.calls[0][0].headers;
    return JSON.parse(Buffer.from(headers["Ninja-Header-Payload"], "base64").toString()).gitUserEmail;
}

describe("backend identity", () => {
    beforeEach(() => {
        jest.resetAllMocks();
        useBackendResponse();
    });
    afterEach(() => removeAlRepos());

    it("should send the last commit's author by default", async () => {
        expect(await sentEmail()).toBe("author@example.com");
    });

    it("should send the local git config user when asked to", async () => {
        expect(await sentEmail("config")).toBe("local@example.com");
    });

    it("should report an unreachable backend as BackendUnreachableError", async () => {
        mockRequest.mockImplementation(() => ({
            on: (event: string, handler: (err: Error) => void) => {
                if (event === "error") {
                    handler(new Error("boom"));
                }
            },
            write: jest.fn(),
            end: jest.fn(),
        }));
        const backend = require("../src/core/backend");

        await expect(backend.getConsumption({ appId: "app" })).rejects.toBeInstanceOf(BackendUnreachableError);
    });
});
