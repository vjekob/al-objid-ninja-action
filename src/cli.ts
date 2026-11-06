#!/usr/bin/env node
import { runCli } from "./cli/runCli";

runCli(process.argv.slice(2), {
    out: text => console.log(text),
    err: text => console.error(text),
})
    .then(exitCode => {
        process.exitCode = exitCode;
    })
    .catch(err => {
        console.error(`Unexpected error: ${(err as Error).message}`);
        process.exitCode = 2;
    });
