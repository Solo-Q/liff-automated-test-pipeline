import path from "node:path";

import { EXIT_CODES } from "./constants.js";
import { runTests } from "./test-runner.js";
import { ensureDirectory, pathExists, readJsonFile, writeJsonFile, writeTextFile } from "./utils/fs.js";

export async function buildReport(context, logger) {
  const { repoPath, options } = context;
  logger.info("Stage started: report", {
    stage: "report",
    repoPath,
    dryRun: options.dryRun,
  });

  const inputs = await loadReportInputs(context, logger);
  if (!inputs.ok) {
    return {
      stage: "report",
      ok: false,
      exitCode: inputs.exitCode,
      message: inputs.message,
      errorCode: inputs.errorCode,
      data: inputs.data,
    };
  }

  const {
    projectProfile,
    featureMap,
    generationPlan,
    pipelineState,
    testRunSummary,
    testRunArtifacts,
  } = inputs.data;

  if (!projectProfile.usesLiff) {
    return {
      stage: "report",
      ok: false,
      exitCode: EXIT_CODES.UNSUPPORTED_PROJECT,
      message: "Report generation requires a LIFF repository.",
      errorCode: "LIFF_NOT_DETECTED",
      data: inputs.data,
    };
  }

  const failureAnalysis = buildFailureAnalysis(testRunArtifacts);
  const riskAnalysis = buildRiskAnalysis(featureMap, generationPlan, testRunSummary);
  const summary = buildSummary(projectProfile, featureMap, generationPlan, testRunSummary, pipelineState);
  const coverageSummary = testRunSummary.coverage ?? null;
  const markdownReport = buildMarkdownReport(summary, failureAnalysis, riskAnalysis, testRunSummary);
  const riskMarkdown = buildRiskMarkdown(riskAnalysis);

  const mutations = [
    {
      path: "reports/latest/test-report.md",
      action: (await pathExists(path.join(repoPath, "reports/latest/test-report.md"))) ? "update" : "create",
    },
    {
      path: "reports/latest/summary.json",
      action: (await pathExists(path.join(repoPath, "reports/latest/summary.json"))) ? "update" : "create",
    },
    {
      path: "reports/latest/coverage-summary.json",
      action: (await pathExists(path.join(repoPath, "reports/latest/coverage-summary.json"))) ? "update" : "create",
    },
    {
      path: "reports/latest/failure-analysis.json",
      action: (await pathExists(path.join(repoPath, "reports/latest/failure-analysis.json"))) ? "update" : "create",
    },
    {
      path: "reports/latest/risk-analysis.md",
      action: (await pathExists(path.join(repoPath, "reports/latest/risk-analysis.md"))) ? "update" : "create",
    },
  ];

  const nextPipelineState = await buildPipelineState(repoPath, mutations, options.dryRun);
  summary.completedStages = nextPipelineState.completedStages;

  if (!options.dryRun) {
    const reportsDir = path.join(repoPath, "reports", "latest");
    await ensureDirectory(reportsDir);
    await writeTextFile(path.join(reportsDir, "test-report.md"), markdownReport);
    await writeJsonFile(path.join(reportsDir, "summary.json"), summary);
    await writeJsonFile(path.join(reportsDir, "coverage-summary.json"), coverageSummary);
    await writeJsonFile(path.join(reportsDir, "failure-analysis.json"), failureAnalysis);
    await writeTextFile(path.join(reportsDir, "risk-analysis.md"), riskMarkdown);
    await writeJsonFile(path.join(repoPath, ".liff-testgen", "pipeline-state.json"), nextPipelineState);
  }

  return {
    stage: "report",
    ok: true,
    exitCode: EXIT_CODES.SUCCESS,
    message: "Report generation completed.",
    data: {
      dryRun: options.dryRun,
      summary,
      coverageSummary,
      failureAnalysis,
      riskAnalysis,
      pipelineState: nextPipelineState,
      outputs: [
        "reports/latest/test-report.md",
        "reports/latest/summary.json",
        "reports/latest/coverage-summary.json",
        "reports/latest/failure-analysis.json",
        "reports/latest/risk-analysis.md",
      ],
    },
  };
}

async function loadReportInputs(context, logger) {
  const repoPath = context.repoPath;
  const requiredFiles = {
    profile: path.join(repoPath, ".liff-testgen/project-profile.json"),
    featureMap: path.join(repoPath, ".liff-testgen/feature-map.json"),
    generationPlan: path.join(repoPath, ".liff-testgen/generation-plan.json"),
    pipelineState: path.join(repoPath, ".liff-testgen/pipeline-state.json"),
    runSummary: path.join(repoPath, ".liff-testgen/test-run-summary.json"),
    runArtifacts: path.join(repoPath, ".liff-testgen/test-run-artifacts.json"),
  };

  const allExist = await Promise.all(Object.values(requiredFiles).map((filePath) => pathExists(filePath)));
  if (allExist.every(Boolean)) {
    return {
      ok: true,
      exitCode: EXIT_CODES.SUCCESS,
      data: {
        projectProfile: await readJsonFile(requiredFiles.profile),
        featureMap: await readJsonFile(requiredFiles.featureMap),
        generationPlan: await readJsonFile(requiredFiles.generationPlan),
        pipelineState: await readJsonFile(requiredFiles.pipelineState),
        testRunSummary: await readJsonFile(requiredFiles.runSummary),
        testRunArtifacts: await readJsonFile(requiredFiles.runArtifacts),
      },
    };
  }

  const runResult = await runTests(context, logger);
  if (!runResult.ok && runResult.data?.summary == null) {
    return runResult;
  }

  return {
    ok: true,
    exitCode: EXIT_CODES.SUCCESS,
    data: {
      projectProfile: await readJsonFile(requiredFiles.profile).catch(() => runResult.data.projectProfile),
      featureMap: await readJsonFile(requiredFiles.featureMap).catch(() => runResult.data.featureMap),
      generationPlan: await readJsonFile(requiredFiles.generationPlan).catch(() => runResult.data.generationPlan),
      pipelineState: await readJsonFile(requiredFiles.pipelineState).catch(() => runResult.data.pipelineState),
      testRunSummary: await readJsonFile(requiredFiles.runSummary).catch(() => runResult.data.summary),
      testRunArtifacts: await readJsonFile(requiredFiles.runArtifacts).catch(() => runResult.data.artifacts),
    },
  };
}

function buildSummary(projectProfile, featureMap, generationPlan, testRunSummary, pipelineState) {
  const highRiskFeatures = featureMap.filter((feature) => feature.risk === "high");
  const generatedFeatureIds = new Set(generationPlan.map((item) => item.featureId));

  return {
    schemaVersion: "1",
    repoPath: projectProfile.repoPath,
    generatedAt: new Date().toISOString(),
    completedStages: pipelineState.completedStages ?? [],
    project: {
      framework: projectProfile.framework,
      language: projectProfile.language,
      packageManager: projectProfile.packageManager,
      usesLiff: projectProfile.usesLiff,
      unitTestFramework: projectProfile.unitTestFramework,
      e2eFramework: projectProfile.e2eFramework,
      hasLiffMock: projectProfile.hasLiffMock,
    },
    featureStats: {
      total: featureMap.length,
      highRisk: highRiskFeatures.length,
      generated: generatedFeatureIds.size,
      ungenerated: featureMap.length - generatedFeatureIds.size,
    },
    testRun: testRunSummary,
  };
}

function buildFailureAnalysis(testRunArtifacts) {
  return testRunArtifacts.map((artifact) => ({
    stage: artifact.stage,
    status: artifact.status,
    category: classifyFailure(artifact),
    reason: artifact.reason ?? null,
    exitCode: artifact.exitCode ?? null,
  }));
}

function classifyFailure(artifact) {
  if (artifact.status === "not_runnable") {
    return "ENVIRONMENT_CONFIG_ISSUE";
  }
  const stderr = `${artifact.stderr ?? ""} ${artifact.reason ?? ""}`;
  if (/profile/i.test(stderr)) {
    return "PROFILE_ERROR_UNHANDLED";
  }
  if (/fixture/i.test(stderr)) {
    return "FIXTURE_MISMATCH";
  }
  if (/timeout|timing/i.test(stderr)) {
    return "ASYNC_TIMING_ISSUE";
  }
  if (/init/i.test(stderr)) {
    return "LIFF_INIT_MISSING";
  }
  return artifact.status === "failed" ? "ENVIRONMENT_CONFIG_ISSUE" : "NONE";
}

function buildRiskAnalysis(featureMap, generationPlan, testRunSummary) {
  const generatedFeatureIds = new Set(generationPlan.map((item) => item.featureId));
  const highRiskFeatures = featureMap.filter((feature) => feature.risk === "high");
  const uncoveredHighRisk = highRiskFeatures.filter((feature) => !generatedFeatureIds.has(feature.featureId));

  return {
    highRiskFeatures: highRiskFeatures.map((feature) => ({
      featureId: feature.featureId,
      name: feature.name,
      recommendedTests: feature.recommendedTests,
    })),
    uncoveredHighRisk: uncoveredHighRisk.map((feature) => ({
      featureId: feature.featureId,
      name: feature.name,
    })),
    runRisk: testRunSummary.failed > 0 || testRunSummary.skipped > 0 ? "elevated" : "normal",
  };
}

function buildMarkdownReport(summary, failureAnalysis, riskAnalysis, testRunSummary) {
  const lines = [];
  lines.push("# LIFF Test Report");
  lines.push("");
  lines.push(`Generated at: ${summary.generatedAt}`);
  lines.push(`Repo: ${summary.repoPath}`);
  lines.push("");
  lines.push("## Project");
  lines.push(`- Framework: ${summary.project.framework}`);
  lines.push(`- Language: ${summary.project.language}`);
  lines.push(`- Package manager: ${summary.project.packageManager}`);
  lines.push(`- Unit test framework: ${summary.project.unitTestFramework ?? "none"}`);
  lines.push(`- E2E framework: ${summary.project.e2eFramework ?? "none"}`);
  lines.push(`- LIFF Mock installed: ${summary.project.hasLiffMock}`);
  lines.push("");
  lines.push("## Feature Summary");
  lines.push(`- Total features: ${summary.featureStats.total}`);
  lines.push(`- High-risk features: ${summary.featureStats.highRisk}`);
  lines.push(`- Generated features: ${summary.featureStats.generated}`);
  lines.push(`- Ungenerated features: ${summary.featureStats.ungenerated}`);
  lines.push("");
  lines.push("## Test Run Summary");
  lines.push(`- Total tests: ${testRunSummary.total}`);
  lines.push(`- Passed: ${testRunSummary.passed}`);
  lines.push(`- Failed: ${testRunSummary.failed}`);
  lines.push(`- Skipped: ${testRunSummary.skipped}`);
  lines.push(`- Duration ms: ${testRunSummary.durationMs}`);
  if (testRunSummary.coverage) {
    lines.push(`- Coverage statements: ${testRunSummary.coverage.statements}`);
    lines.push(`- Coverage branches: ${testRunSummary.coverage.branches}`);
    lines.push(`- Coverage functions: ${testRunSummary.coverage.functions}`);
    lines.push(`- Coverage lines: ${testRunSummary.coverage.lines}`);
  }
  lines.push("");
  lines.push("## Failure Analysis");
  if (failureAnalysis.length === 0) {
    lines.push("- No failure artifacts.");
  } else {
    for (const failure of failureAnalysis) {
      lines.push(`- ${failure.stage}: ${failure.category} (${failure.status})`);
    }
  }
  lines.push("");
  lines.push("## Risk Analysis");
  lines.push(`- Run risk: ${riskAnalysis.runRisk}`);
  if (riskAnalysis.uncoveredHighRisk.length === 0) {
    lines.push("- No uncovered high-risk features.");
  } else {
    for (const feature of riskAnalysis.uncoveredHighRisk) {
      lines.push(`- Uncovered high-risk feature: ${feature.featureId} (${feature.name})`);
    }
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function buildRiskMarkdown(riskAnalysis) {
  const lines = [];
  lines.push("# Risk Analysis");
  lines.push("");
  lines.push(`Run risk: ${riskAnalysis.runRisk}`);
  lines.push("");
  lines.push("## High-Risk Features");
  if (riskAnalysis.highRiskFeatures.length === 0) {
    lines.push("- None");
  } else {
    for (const feature of riskAnalysis.highRiskFeatures) {
      lines.push(`- ${feature.featureId}: ${feature.name} [${feature.recommendedTests.join(", ")}]`);
    }
  }
  lines.push("");
  lines.push("## Uncovered High-Risk Features");
  if (riskAnalysis.uncoveredHighRisk.length === 0) {
    lines.push("- None");
  } else {
    for (const feature of riskAnalysis.uncoveredHighRisk) {
      lines.push(`- ${feature.featureId}: ${feature.name}`);
    }
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
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
  completedStages.add("report");

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
