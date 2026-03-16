const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const taskDir = path.join(root, "azdo-task");

// Ensure azdo-task directory exists
fs.mkdirSync(taskDir, { recursive: true });

// Copy task.json
fs.copyFileSync(path.join(root, "task.json"), path.join(taskDir, "task.json"));

// Copy dist-azdo
const distSrc = path.join(root, "dist-azdo");
const distDest = path.join(taskDir, "dist-azdo");
fs.rmSync(distDest, { recursive: true, force: true });
fs.cpSync(distSrc, distDest, { recursive: true });

// Copy bin
const binSrc = path.join(root, "bin");
const binDest = path.join(taskDir, "bin");
fs.rmSync(binDest, { recursive: true, force: true });
fs.cpSync(binSrc, binDest, { recursive: true });

console.log("azdo-task/ prepared successfully.");
