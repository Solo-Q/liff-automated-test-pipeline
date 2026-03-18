import { EXIT_CODES } from "./constants.js";
import { CliError } from "./errors.js";
import { createLogger } from "./logger.js";
import { runCommand } from "./orchestrator.js";
import { parseArgs } from "./parse-args.js";

function printHelp() {
  console.log(`LIFF Mock Automated Test Pipeline CLI

Usage:
  liff-testgen <command> <repoPath> [options]

Commands:
  analyze
  prepare
  extract-features
  generate
  run
  report
  pipeline

Options:
  --dry-run
  --workspace <name>
  --json
  --verbose
  --help
`);
}

export async function runCli(argv) {
  try {
    const parsed = parseArgs(argv);

    if (parsed.help) {
      printHelp();
      return EXIT_CODES.SUCCESS;
    }

    const logger = createLogger(parsed.options);
    const result = await runCommand(parsed, logger);

    if (parsed.options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      logger.info(`Command completed: ${result.command}`, {
        ok: result.ok,
        exitCode: result.exitCode,
      });
    }

    return result.exitCode;
  } catch (error) {
    if (error instanceof CliError) {
      const logger = createLogger();
      logger.error(error.message, {
        stage: error.stage,
        errorCode: error.errorCode,
        suggestion: error.suggestion,
      });
      return error.exitCode;
    }

    throw error;
  }
}
