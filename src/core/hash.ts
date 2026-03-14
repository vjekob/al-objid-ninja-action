import * as crypto from "crypto";

/**
 * Computes SHA256 hash of a string, returned as lowercase hex.
 * Matches getSha256() from the ninja-extension.
 */
export function getSha256(input: string): string {
    return crypto.createHash("sha256").update(input).digest("hex");
}
