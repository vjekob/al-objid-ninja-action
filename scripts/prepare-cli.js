// Assembles the npm package for the CLI in cli-package/: the bundle, the native parsers, and metadata.
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const target = path.join(root, "cli-package");

fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(path.join(target, "dist-cli"), { recursive: true });

// A checkout with CRLF line endings carries the \r into the shebang, and npm's launchers break on it.
const bundle = fs.readFileSync(path.join(root, "dist-cli", "index.js"), "utf-8").replace(/^#!.*\r?\n/, "");
fs.writeFileSync(path.join(target, "dist-cli", "index.js"), `#!/usr/bin/env node\n${bundle}`);
fs.cpSync(path.join(root, "bin"), path.join(target, "bin"), { recursive: true });
fs.copyFileSync(path.join(root, "LICENSE"), path.join(target, "LICENSE"));
fs.copyFileSync(path.join(root, "cli", "README.md"), path.join(target, "README.md"));

const packageJson = {
    name: "@vjeko.com/al-object-id-ninja-cli",
    version: "1.0.0",
    description: "Checks AL object IDs against AL Object ID Ninja from the command line, git hooks, and CI",
    bin: { "al-object-id-ninja-cli": "dist-cli/index.js" },
    files: ["dist-cli", "bin", "LICENSE", "README.md"],
    keywords: ["al", "business-central", "dynamics-365", "object-id", "al-object-id-ninja", "git-hooks"],
    author: { name: "Vjekoslav Babić", email: "vjeko@vjeko.hr", url: "https://vjeko.com" },
    license: "SEE LICENSE IN LICENSE",
    homepage: "https://alid.ninja",
    bugs: { url: "https://github.com/vjekob/al-objid/issues" },
    engines: { node: ">=18.3" },
};
fs.writeFileSync(path.join(target, "package.json"), `${JSON.stringify(packageJson, null, 4)}\n`);
