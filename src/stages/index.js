import { EXIT_CODES } from "../constants.js";
import { analyzeRepository } from "../analyzer.js";
import { extractFeatures } from "../feature-extractor.js";
import { prepareRepository } from "../preparer.js";
import { generateTests } from "../test-generator.js";
import { runTests } from "../test-runner.js";
import { buildReport } from "../report-builder.js";

function createStubStage(stage) {
  return async function stubStage(context, logger) {
    logger.info(`Stage started: ${stage}`, {
      stage,
      repoPath: context.repoPath,
      dryRun: context.options.dryRun,
    });

    return {
      stage,
      ok: true,
      exitCode: EXIT_CODES.SUCCESS,
      message: `Stage '${stage}' is scaffolded but not implemented yet.`,
    };
  };
}

const STAGES = {
  analyze: analyzeRepository,
  prepare: prepareRepository,
  "extract-features": extractFeatures,
  generate: generateTests,
  run: runTests,
  report: buildReport,
};

export async function runStage(stage, context, logger) {
  const handler = STAGES[stage];

  if (!handler) {
    return {
      stage,
      ok: false,
      exitCode: EXIT_CODES.INVALID_ARGUMENTS,
      message: `Unknown stage: ${stage}`,
    };
  }

  return handler(context, logger);
}
