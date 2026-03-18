#!/usr/bin/env node

import { runCli } from "./index.js";

const args = process.argv.slice(2);

runCli(args)
  .then((exitCode) => {
    process.exitCode = exitCode;
  })
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Unexpected error: ${message}`);
    process.exitCode = 1;
  });
