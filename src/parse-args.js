import path from "node:path";

import { COMMANDS, EXIT_CODES } from "./constants.js";
import { CliError } from "./errors.js";

export function parseArgs(argv, cwd = process.cwd()) {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    return {
      help: true,
    };
  }

  const [command, ...rest] = argv;

  if (!COMMANDS.has(command)) {
    throw new CliError(`Unknown command: ${command}`, EXIT_CODES.INVALID_ARGUMENTS, {
      errorCode: "UNKNOWN_COMMAND",
      suggestion: "Use one of: analyze, prepare, extract-features, generate, run, report, pipeline",
    });
  }

  const options = {
    dryRun: false,
    json: false,
    verbose: false,
    workspace: null,
  };
  const positionals = [];

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];

    if (token === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (token === "--json") {
      options.json = true;
      continue;
    }

    if (token === "--verbose") {
      options.verbose = true;
      continue;
    }

    if (token === "--workspace") {
      const value = rest[index + 1];
      if (!value || value.startsWith("--")) {
        throw new CliError("Missing value for --workspace", EXIT_CODES.INVALID_ARGUMENTS, {
          errorCode: "MISSING_WORKSPACE_VALUE",
        });
      }
      options.workspace = value;
      index += 1;
      continue;
    }

    if (token.startsWith("--")) {
      throw new CliError(`Unknown option: ${token}`, EXIT_CODES.INVALID_ARGUMENTS, {
        errorCode: "UNKNOWN_OPTION",
      });
    }

    positionals.push(token);
  }

  if (positionals.length === 0) {
    throw new CliError("Missing <repoPath> argument", EXIT_CODES.INVALID_ARGUMENTS, {
      errorCode: "MISSING_REPO_PATH",
      suggestion: `Example: liff-testgen ${command} .`,
    });
  }

  return {
    help: false,
    command,
    repoPath: path.resolve(cwd, positionals[0]),
    options,
  };
}
