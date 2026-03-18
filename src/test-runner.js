import { spawn } from "node:child_process";
import path from "node:path";

import { EXIT_CODES } from "./constants.js";
import { generateTests } from "./test-generator.js";
import { detectPackageManager } from "./utils/package-manager.js";
import { ensureDirectory, pathExists, readJsonFile, writeJsonFile, writeTextFile } from "./utils/fs.js";

export async function runTests(context, logger) {
  const { repoPath, options } = context;
  logger.info("Stage started: run", {
    stage: "run",
    repoPath,
    dryRun: options.dryRun,
  });

  const inputs = await loadRunnerInputs(context, logger);
  if (!inputs.ok) {
    return {
      stage: "run",
      ok: false,
      exitCode: inputs.exitCode,
      message: inputs.message,
      errorCode: inputs.errorCode,
      data: inputs.data,
    };
  }

  const { projectProfile, generationPlan } = inputs.data;
  if (!projectProfile.usesLiff) {
    return {
      stage: "run",
      ok: false,
      exitCode: EXIT_CODES.UNSUPPORTED_PROJECT,
      message: "Test running requires a LIFF repository.",
      errorCode: "LIFF_NOT_DETECTED",
      data: inputs.data,
    };
  }

  const installResult = await ensureDependenciesInstalled(repoPath, projectProfile.packageManager, options, logger);
  const runnerContext = await prepareRunnerContext(repoPath, projectProfile, generationPlan, options.dryRun);
  const executionPlan = await buildExecutionPlan(repoPath, projectProfile, generationPlan, runnerContext);
  if (options.dryRun) {
    const pipelineState = await buildPipelineState(repoPath, [
      { path: ".liff-testgen/test-run-summary.json", action: "create" },
      { path: ".liff-testgen/test-run-artifacts.json", action: "create" },
      ...(installResult.planned ? [{ path: "node_modules", action: "create" }] : []),
    ], true);

    return {
      stage: "run",
      ok: true,
      exitCode: EXIT_CODES.SUCCESS,
      message: "Dry-run test execution plan generated.",
      data: {
        dryRun: true,
        installResult,
        runnerContext,
        executionPlan,
        summary: buildSummaryFromPlan(executionPlan),
        artifacts: [],
        pipelineState,
      },
    };
  }

  const summary = buildSummaryFromPlan(executionPlan);
  const artifacts = [];
  let overallOk = true;
  let exitCode = EXIT_CODES.SUCCESS;

  if (installResult.attempted) {
    artifacts.push({
      stage: "install",
      status: installResult.ok ? "passed" : "failed",
      command: installResult.command,
      stdout: installResult.stdout,
      stderr: installResult.stderr,
      exitCode: installResult.exitCode,
    });
    summary.durationMs += installResult.durationMs;
    if (!installResult.ok) {
      overallOk = false;
      exitCode = EXIT_CODES.TEST_EXECUTION_FAILED;
    }
  }

  for (const step of executionPlan) {
    if (!step.shouldRun) {
      summary.skipped += step.testFiles.length > 0 ? step.testFiles.length : 0;
      artifacts.push({
        stage: step.stage,
        status: "not_runnable",
        reason: step.reason,
      });
      overallOk = false;
      exitCode = EXIT_CODES.TEST_EXECUTION_FAILED;
      continue;
    }

    const execution = await executeCommand(step.command, repoPath, step.env);
    summary.durationMs += execution.durationMs;
    const parsedArtifacts = await parseStageArtifacts(repoPath, step);
    artifacts.push({
      stage: step.stage,
      status: execution.exitCode === 0 ? "passed" : "failed",
      command: step.command,
      stdout: execution.stdout,
      stderr: execution.stderr,
      exitCode: execution.exitCode,
      junit: parsedArtifacts.junit,
      coverage: parsedArtifacts.coverage,
    });
    mergeParsedArtifactsIntoSummary(summary, parsedArtifacts);
    if (execution.exitCode === 0) {
      summary.passed += step.testFiles.length;
    } else {
      summary.failed += step.testFiles.length;
      overallOk = false;
      exitCode = EXIT_CODES.TEST_EXECUTION_FAILED;
    }
  }

  const mutations = [
    {
      path: ".liff-testgen/test-run-summary.json",
      action: (await pathExists(path.join(repoPath, ".liff-testgen/test-run-summary.json"))) ? "update" : "create",
    },
    {
      path: ".liff-testgen/test-run-artifacts.json",
      action: (await pathExists(path.join(repoPath, ".liff-testgen/test-run-artifacts.json"))) ? "update" : "create",
    },
  ];
  const pipelineState = await buildPipelineState(repoPath, mutations, false);

  const outputDir = path.join(repoPath, ".liff-testgen");
  await ensureDirectory(outputDir);
  await writeJsonFile(path.join(outputDir, "test-run-summary.json"), summary);
  await writeJsonFile(path.join(outputDir, "test-run-artifacts.json"), artifacts);
  await writeJsonFile(path.join(outputDir, "pipeline-state.json"), pipelineState);

  return {
    stage: "run",
    ok: overallOk,
    exitCode,
    message: overallOk ? "Test execution completed." : "Test execution finished with failures or non-runnable stages.",
    data: {
      dryRun: false,
      installResult,
      runnerContext,
      executionPlan,
      summary,
      artifacts,
      pipelineState,
    },
  };
}

async function loadRunnerInputs(context, logger) {
  const repoPath = context.repoPath;
  const profilePath = path.join(repoPath, ".liff-testgen/project-profile.json");
  const generationPlanPath = path.join(repoPath, ".liff-testgen/generation-plan.json");

  if ((await pathExists(profilePath)) && (await pathExists(generationPlanPath))) {
    return {
      ok: true,
      exitCode: EXIT_CODES.SUCCESS,
      data: {
        projectProfile: await readJsonFile(profilePath),
        generationPlan: await readJsonFile(generationPlanPath),
      },
    };
  }

  const generateResult = await generateTests(context, logger);
  if (!generateResult.ok) {
    return generateResult;
  }

  return {
    ok: true,
    exitCode: EXIT_CODES.SUCCESS,
    data: {
      projectProfile: await readJsonFile(path.join(repoPath, ".liff-testgen/project-profile.json")).catch(
        () => generateResult.data.projectProfile,
      ),
      generationPlan: generateResult.data.generationPlan,
    },
  };
}

async function buildExecutionPlan(repoPath, projectProfile, generationPlan, runnerContext = {}) {
  const unitAndIntegration = generationPlan.filter((item) => item.level === "unit" || item.level === "integration");
  const e2e = generationPlan.filter((item) => item.level === "e2e");
  const plan = [];

  if (unitAndIntegration.length > 0) {
    const runner = projectProfile.unitTestFramework === "jest" ? "jest" : projectProfile.unitTestFramework === "vitest" ? "vitest" : null;
    const runnerInfo = await resolveRunnerBinary(repoPath, runner);
    const junitFile = path.join(".liff-testgen", "artifacts", `${runner ?? "unit"}-junit.xml`);
    const coverageSummaryFile = path.join(".liff-testgen", "artifacts", "coverage", "coverage-summary.json");
    plan.push({
      stage: "unit+integration",
      runner,
      shouldRun: Boolean(runnerInfo.binaryPath),
      reason: runnerInfo.binaryPath ? null : runnerInfo.reason ?? "No supported unit test runner detected.",
      command: runnerInfo.binaryPath
        ? [
          runnerInfo.binaryPath,
          ...buildUnitIntegrationArgs(runner, unitAndIntegration, junitFile, coverageSummaryFile, runnerContext),
        ]
        : null,
      env: buildRunnerEnv(runner, junitFile),
      testFiles: unique(unitAndIntegration.map((item) => item.outputPath)),
      artifactPaths: {
        junit: junitFile,
        coverageSummary: coverageSummaryFile,
      },
    });
  }

  if (e2e.length > 0) {
    const runnerInfo = await resolveRunnerBinary(repoPath, projectProfile.e2eFramework === "playwright" ? "playwright" : null);
    const junitFile = path.join(".liff-testgen", "artifacts", "playwright-junit.xml");
    plan.push({
      stage: "e2e",
      runner: projectProfile.e2eFramework,
      shouldRun: Boolean(runnerInfo.binaryPath),
      reason: runnerInfo.binaryPath ? null : runnerInfo.reason ?? "No supported E2E runner detected.",
      command: runnerInfo.binaryPath ? [runnerInfo.binaryPath, ...buildE2EArgs(e2e)] : null,
      env: buildRunnerEnv("playwright", junitFile),
      testFiles: unique(e2e.map((item) => item.outputPath)),
      artifactPaths: {
        junit: junitFile,
        coverageSummary: null,
      },
    });
  }

  return plan;
}

async function resolveRunnerBinary(repoPath, runner) {
  if (!runner) {
    return {
      binaryPath: null,
      reason: "Runner is not configured in project profile.",
    };
  }

  const binaryName = runner === "playwright" ? "playwright" : runner;
  const binaryPath = path.join(repoPath, "node_modules", ".bin", binaryName);

  if (await pathExists(binaryPath)) {
    return {
      binaryPath,
      reason: null,
    };
  }

  return {
    binaryPath: null,
    reason: `Local binary not found for ${runner}. Expected ${binaryPath}.`,
  };
}

function buildUnitIntegrationArgs(runner, generationPlan, junitFile, coverageSummaryFile, runnerContext = {}) {
  const files = unique(generationPlan.map((item) => item.outputPath));
  if (runner === "jest") {
    return [
      "--runInBand",
      "--runTestsByPath",
      ...files,
      "--coverage",
      `--coverageDirectory=.liff-testgen/artifacts/coverage`,
      "--coverageReporters=json-summary",
      "--reporters=default",
      "--reporters=jest-junit",
    ];
  }
  return [
    "run",
    ...(runnerContext?.vitestConfigPath ? ["--config", runnerContext.vitestConfigPath] : []),
    ...files,
    "--reporter=default",
    "--reporter=junit",
    `--outputFile=${junitFile}`,
    "--coverage.enabled",
    "--coverage.reportOnFailure",
    "--coverage.reporter=json-summary",
    `--coverage.reportsDirectory=${path.dirname(coverageSummaryFile)}`,
  ];
}

async function prepareRunnerContext(repoPath, projectProfile, generationPlan, dryRun) {
  if (projectProfile.unitTestFramework !== "vitest") {
    return {};
  }

  const unitAndIntegration = generationPlan.filter((item) => item.level === "unit" || item.level === "integration");
  if (unitAndIntegration.length === 0) {
    return {};
  }

  const generatedPatterns = unique(unitAndIntegration.map((item) => item.outputPath))
    .map((file) => toPosixPath(file));
  const configPath = path.join(repoPath, ".liff-testgen", "vitest.generated.config.mjs");
  const viteConfigPath = await resolveExistingViteConfig(repoPath);
  const content = buildVitestGeneratedConfig(viteConfigPath, generatedPatterns);

  if (!dryRun) {
    await ensureDirectory(path.dirname(configPath));
    await writeTextFile(configPath, content);
  }

  return {
    vitestConfigPath: toPosixPath(path.relative(repoPath, configPath)),
  };
}

async function resolveExistingViteConfig(repoPath) {
  const candidates = [
    "vitest.config.ts",
    "vitest.config.js",
    "vite.config.ts",
    "vite.config.js",
    "vite.config.mts",
    "vite.config.mjs",
  ];

  for (const candidate of candidates) {
    if (await pathExists(path.join(repoPath, candidate))) {
      return `../${candidate}`;
    }
  }

  return null;
}

function buildVitestGeneratedConfig(baseConfigPath, generatedPatterns) {
  const includeList = JSON.stringify(generatedPatterns, null, 2);
  const extendLine = baseConfigPath
    ? `import baseConfig from "${baseConfigPath}";\n`
    : "";
  const baseTestLine = baseConfigPath
    ? "    ...(baseConfig.test ?? {}),\n"
    : "";

  return `${extendLine}import { defineConfig } from "vitest/config";

export default defineConfig({
  ${baseConfigPath ? "...baseConfig,\n" : ""}test: {
${baseTestLine}    include: ${includeList},
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.{idea,git,cache,output,temp}/**"
    ]
  }
});
`;
}

function toPosixPath(value) {
  return value.split(path.sep).join(path.posix.sep);
}

function buildE2EArgs(generationPlan) {
  return ["test", ...unique(generationPlan.map((item) => item.outputPath))];
}

function buildSummaryFromPlan(executionPlan) {
  return {
    total: executionPlan.reduce((count, step) => count + step.testFiles.length, 0),
    passed: 0,
    failed: 0,
    skipped: 0,
    flaky: 0,
    durationMs: 0,
    coverage: null,
    junit: null,
    stages: executionPlan.map((step) => ({
      stage: step.stage,
      runner: step.runner,
      shouldRun: step.shouldRun,
      testFiles: step.testFiles,
      reason: step.reason,
    })),
  };
}

async function executeCommand(command, cwd, extraEnv = {}) {
  const startedAt = Date.now();

  return new Promise((resolve) => {
    const child = spawn(command[0], command.slice(1), {
      cwd,
      env: {
        ...process.env,
        ...extraEnv,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      resolve({
        exitCode: 1,
        stdout,
        stderr: `${stderr}${error.message}`,
        durationMs: Date.now() - startedAt,
      });
    });
    child.on("close", (exitCode) => {
      resolve({
        exitCode: exitCode ?? 1,
        stdout,
        stderr,
        durationMs: Date.now() - startedAt,
      });
    });
  });
}

async function ensureDependenciesInstalled(repoPath, packageManager, options, logger) {
  const resolvedPackageManager = packageManager ?? (await detectPackageManager(repoPath));
  const installCommand = buildInstallCommand(resolvedPackageManager);
  const requiresInstall = !(await pathExists(path.join(repoPath, "node_modules")));

  if (!installCommand || !requiresInstall) {
    return {
      attempted: false,
      planned: false,
      ok: true,
      command: installCommand,
      stdout: "",
      stderr: "",
      exitCode: 0,
      durationMs: 0,
    };
  }

  if (options.dryRun) {
    return {
      attempted: false,
      planned: true,
      ok: true,
      command: installCommand,
      stdout: "",
      stderr: "",
      exitCode: 0,
      durationMs: 0,
    };
  }

  logger.info("Installing project dependencies before test execution", {
    stage: "run",
    packageManager: resolvedPackageManager,
  });
  const execution = await executeCommand(installCommand, repoPath);
  return {
    attempted: true,
    planned: false,
    ok: execution.exitCode === 0,
    command: installCommand,
    stdout: execution.stdout,
    stderr: execution.stderr,
    exitCode: execution.exitCode,
    durationMs: execution.durationMs,
  };
}

function buildInstallCommand(packageManager) {
  switch (packageManager) {
    case "npm":
      return ["npm", "install"];
    case "pnpm":
      return ["pnpm", "install"];
    case "yarn":
      return ["yarn", "install"];
    default:
      return null;
  }
}

function buildRunnerEnv(runner, junitFile) {
  if (runner === "jest") {
    return {
      JEST_JUNIT_OUTPUT_DIR: path.dirname(junitFile),
      JEST_JUNIT_OUTPUT_NAME: path.basename(junitFile),
    };
  }

  if (runner === "playwright") {
    return {
      PLAYWRIGHT_JUNIT_OUTPUT_FILE: junitFile,
    };
  }

  return {};
}

async function parseStageArtifacts(repoPath, step) {
  const junit = step.artifactPaths?.junit
    ? await parseJunitFile(path.join(repoPath, step.artifactPaths.junit))
    : null;
  const coverage = step.artifactPaths?.coverageSummary
    ? await parseCoverageSummaryFile(path.join(repoPath, step.artifactPaths.coverageSummary))
    : null;

  return {
    junit,
    coverage,
  };
}

async function parseJunitFile(filePath) {
  if (!(await pathExists(filePath))) {
    return null;
  }

  const { readFile } = await import("node:fs/promises");
  const content = await readFile(filePath, "utf8");
  const rootTag = content.match(/<(testsuites|testsuite)\b([^>]*)>/i);
  if (!rootTag) {
    return null;
  }

  const attrs = parseXmlAttributes(rootTag[2]);
  return {
    tests: toNumber(attrs.tests),
    failures: toNumber(attrs.failures),
    errors: toNumber(attrs.errors),
    skipped: toNumber(attrs.skipped),
    time: toNumber(attrs.time),
  };
}

async function parseCoverageSummaryFile(filePath) {
  if (!(await pathExists(filePath))) {
    return null;
  }

  const content = await readJsonFile(filePath);
  const total = content.total ?? {};
  return {
    statements: toCoveragePct(total.statements),
    branches: toCoveragePct(total.branches),
    functions: toCoveragePct(total.functions),
    lines: toCoveragePct(total.lines),
  };
}

function parseXmlAttributes(raw) {
  const attrs = {};
  for (const match of raw.matchAll(/([a-zA-Z_:][\w:.-]*)="([^"]*)"/g)) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}

function mergeParsedArtifactsIntoSummary(summary, parsedArtifacts) {
  if (parsedArtifacts.coverage) {
    summary.coverage = parsedArtifacts.coverage;
  }
  if (parsedArtifacts.junit) {
    summary.junit = parsedArtifacts.junit;
  }
}

function toCoveragePct(entry) {
  if (!entry || typeof entry.pct !== "number") {
    return 0;
  }
  return entry.pct;
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function buildPipelineState(repoPath, mutations, dryRun) {
  const pipelineStatePath = path.join(repoPath, ".liff-testgen/pipeline-state.json");
  const baseState =
    (await pathExists(pipelineStatePath)) ? await readJsonFile(pipelineStatePath) : {
      schemaVersion: "1",
      lastRunAt: new Date().toISOString(),
      completedStages: [],
      generatorVersion: "0.1.0",
      dryRun,
      fileMutations: [],
    };

  const completedStages = new Set(baseState.completedStages ?? []);
  completedStages.add("run");

  const existingMutations = Array.isArray(baseState.fileMutations) ? baseState.fileMutations : [];
  const nextMutations = [
    ...mutations,
    {
      path: ".liff-testgen/pipeline-state.json",
      action: (await pathExists(pipelineStatePath)) ? "update" : "create",
    },
  ].map(({ path: mutationPath, action }) => ({ path: mutationPath, action }));

  return {
    ...baseState,
    lastRunAt: new Date().toISOString(),
    completedStages: [...completedStages],
    dryRun,
    fileMutations: dedupeMutations([...existingMutations, ...nextMutations]),
  };
}

function dedupeMutations(mutations) {
  const seen = new Map();
  for (const mutation of mutations) {
    seen.set(mutation.path, mutation);
  }
  return [...seen.values()];
}

function unique(values) {
  return [...new Set(values)];
}
