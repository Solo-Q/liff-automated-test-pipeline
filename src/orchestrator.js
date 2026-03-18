import { runStage } from "./stages/index.js";

const PIPELINE_ORDER = [
  "analyze",
  "prepare",
  "extract-features",
  "generate",
  "run",
  "report",
];

export async function runCommand(parsed, logger) {
  const context = {
    repoPath: parsed.repoPath,
    options: parsed.options,
  };

  if (parsed.command === "pipeline") {
    const results = [];

    for (const stage of PIPELINE_ORDER) {
      const result = await runStage(stage, context, logger);
      results.push(result);

      if (!result.ok) {
        return {
          ok: false,
          exitCode: result.exitCode,
          command: parsed.command,
          stages: results,
        };
      }
    }

    return {
      ok: true,
      exitCode: 0,
      command: parsed.command,
      stages: results,
    };
  }

  const result = await runStage(parsed.command, context, logger);

  return {
    ok: result.ok,
    exitCode: result.exitCode,
    command: parsed.command,
    stages: [result],
  };
}
