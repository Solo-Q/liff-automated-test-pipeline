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

  const failureAnalysis = buildFailureAnalysis(testRunArtifacts, generationPlan);
  const riskAnalysis = buildRiskAnalysis(featureMap, generationPlan, testRunSummary);
  const scenarioAnalysis = buildScenarioAnalysis(featureMap, generationPlan);
  const summary = buildSummary(projectProfile, featureMap, generationPlan, testRunSummary, pipelineState, scenarioAnalysis);
  const coverageSummary = testRunSummary.coverage ?? null;
  const markdownReport = buildMarkdownReport(summary, failureAnalysis, riskAnalysis, testRunSummary, scenarioAnalysis);
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
      scenarioAnalysis,
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

function buildSummary(projectProfile, featureMap, generationPlan, testRunSummary, pipelineState, scenarioAnalysis) {
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
    scenarioStats: scenarioAnalysis.summary,
    featureScenarios: scenarioAnalysis.features,
    testRun: testRunSummary,
  };
}

function buildScenarioAnalysis(featureMap, generationPlan) {
  const featureLookup = new Map(featureMap.map((feature) => [feature.featureId, feature]));
  const featureBuckets = new Map();

  for (const item of generationPlan) {
    const feature = featureLookup.get(item.featureId);
    if (!featureBuckets.has(item.featureId)) {
      featureBuckets.set(item.featureId, {
        featureId: item.featureId,
        featureName: item.featureName,
        targetType: item.targetType ?? feature?.targetType ?? "generic",
        risk: feature?.risk ?? "unknown",
        featureGoal: item.featureGoal ?? null,
        successCriteria: [],
        scenarios: new Map(),
      });
    }

    const bucket = featureBuckets.get(item.featureId);
    for (const criterion of item.successCriteria ?? []) {
      if (!bucket.successCriteria.includes(criterion)) {
        bucket.successCriteria.push(criterion);
      }
    }

    if (!bucket.scenarios.has(item.scenarioId)) {
      bucket.scenarios.set(item.scenarioId, {
        scenarioId: item.scenarioId ?? "S00",
        scenarioName: item.scenarioName ?? item.title,
        scenarioCategory: item.scenarioCategory ?? "Generic",
        scenarioType: item.scenarioType ?? "generic",
        fixture: item.fixture ?? null,
        moduleType: item.moduleType ?? feature?.moduleType ?? null,
        levels: [],
        priorities: [],
        generationModes: [],
        failureModes: [],
        preconditions: item.preconditions ?? [],
        userActions: item.userActions ?? [],
        systemResult: item.systemResult ?? [],
        expectedOutcome: item.expectedOutcome ?? [],
        testData: [],
        manualReferenceIds: [],
        allocationReasonByLevel: {},
        testQuestionByLevel: {},
      });
    }

    const scenario = bucket.scenarios.get(item.scenarioId);
    if (!scenario.levels.includes(item.level)) {
      scenario.levels.push(item.level);
    }
    if (item.priority && !scenario.priorities.includes(item.priority)) {
      scenario.priorities.push(item.priority);
    }
    if (item.generationMode && !scenario.generationModes.includes(item.generationMode)) {
      scenario.generationModes.push(item.generationMode);
    }
    if (item.failureMode && !scenario.failureModes.includes(item.failureMode)) {
      scenario.failureModes.push(item.failureMode);
    }
    for (const dataItem of item.testData ?? []) {
      const dataKey = JSON.stringify(dataItem);
      if (!scenario.testData.some((entry) => JSON.stringify(entry) === dataKey)) {
        scenario.testData.push(dataItem);
      }
    }
    for (const referenceId of item.manualReferenceIds ?? []) {
      if (!scenario.manualReferenceIds.includes(referenceId)) {
        scenario.manualReferenceIds.push(referenceId);
      }
    }
    if (item.allocationReason) {
      scenario.allocationReasonByLevel[item.level] = item.allocationReason;
    }
    if (item.testQuestion) {
      scenario.testQuestionByLevel[item.level] = item.testQuestion;
    }
  }

  const features = Array.from(featureBuckets.values())
    .map((bucket) => ({
      featureId: bucket.featureId,
      featureName: bucket.featureName,
      targetType: bucket.targetType,
      risk: bucket.risk,
      featureGoal: bucket.featureGoal,
      successCriteria: bucket.successCriteria,
      scenarios: Array.from(bucket.scenarios.values()).sort((a, b) => a.scenarioId.localeCompare(b.scenarioId)),
    }))
    .sort((a, b) => a.featureName.localeCompare(b.featureName));

  const summary = {
    totalFeaturesWithScenarios: features.length,
    totalScenarioEntries: generationPlan.length,
    uniqueScenarios: features.reduce((count, feature) => count + feature.scenarios.length, 0),
    byLevel: generationPlan.reduce((acc, item) => {
      acc[item.level] = (acc[item.level] ?? 0) + 1;
      return acc;
    }, {}),
    byCategory: generationPlan.reduce((acc, item) => {
      const key = item.scenarioCategory ?? "Generic";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
    byPriority: generationPlan.reduce((acc, item) => {
      const key = item.priority ?? "unknown";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
    byGenerationMode: generationPlan.reduce((acc, item) => {
      const key = item.generationMode ?? "unknown";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
    byFailureMode: generationPlan.reduce((acc, item) => {
      const key = item.failureMode ?? "none";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
    byModuleType: generationPlan.reduce((acc, item) => {
      const key = item.moduleType ?? "generic";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
    manualCoverage: buildManualCoverageSummary(generationPlan),
    manualOverlap: buildManualOverlapSummary(generationPlan),
  };

  return { summary, features };
}

function buildManualCoverageSummary(generationPlan) {
  let referenced = 0;
  let autoGenerated = 0;
  let manualOnly = 0;
  let blockedPendingProductRule = 0;
  let p0Referenced = 0;
  let p0MissingReference = 0;
  const byFamily = {};
  const byFamilyP0 = {};
  const missingByFamily = {};

  for (const item of generationPlan) {
    const manualRefs = item.manualReferenceIds ?? [];
    if (manualRefs.length > 0) {
      referenced += 1;
      if (item.priority === "P0") {
        p0Referenced += 1;
      }
      for (const referenceId of manualRefs) {
        const family = classifyManualReferenceFamily(referenceId);
        byFamily[family] = (byFamily[family] ?? 0) + 1;
        if (item.priority === "P0") {
          byFamilyP0[family] = (byFamilyP0[family] ?? 0) + 1;
        }
      }
    } else if (item.priority === "P0") {
      p0MissingReference += 1;
      const family = classifyFeatureManualFamily(item);
      missingByFamily[family] = (missingByFamily[family] ?? 0) + 1;
    }
    if (item.generationMode === "auto_required" || item.generationMode === "auto_optional") {
      autoGenerated += 1;
    }
    if (item.generationMode === "manual_only") {
      manualOnly += 1;
    }
    if (item.generationMode === "blocked_pending_product_rule") {
      blockedPendingProductRule += 1;
    }
  }

  return {
    referenced,
    autoGenerated,
    manualOnly,
    blockedPendingProductRule,
    p0Referenced,
    p0MissingReference,
    byFamily,
    byFamilyP0,
    missingByFamily,
  };
}

function buildManualOverlapSummary(generationPlan) {
  const expectedByFamily = {
    registration: 63,
    "my-card": 57,
    cardholder: 65,
    scan: 35,
    notification: 79,
    settings: 98,
  };
  const refsByFamily = {};

  for (const item of generationPlan) {
    for (const referenceId of item.manualReferenceIds ?? []) {
      const family = classifyManualReferenceFamily(referenceId);
      refsByFamily[family] ??= new Set();
      refsByFamily[family].add(referenceId);
    }
  }

  const families = new Set([...Object.keys(expectedByFamily), ...Object.keys(refsByFamily)]);
  const byFamily = {};

  for (const family of families) {
    const uniqueRefs = [...(refsByFamily[family] ?? new Set())].sort();
    const expectedTotal = expectedByFamily[family] ?? null;
    const referencedTotal = uniqueRefs.length;
    byFamily[family] = {
      referencedTotal,
      expectedTotal,
      approxCoveragePct: expectedTotal ? Number(((referencedTotal / expectedTotal) * 100).toFixed(2)) : null,
      sampleRefs: uniqueRefs.slice(0, 10),
    };
  }

  return { byFamily };
}

function classifyFeatureManualFamily(item) {
  const refs = item.manualReferenceIds ?? [];
  if (refs.length > 0) {
    return classifyManualReferenceFamily(refs[0]);
  }

  const moduleType = String(item.moduleType ?? "");
  const targetType = String(item.targetType ?? "");
  const featureName = String(item.featureName ?? "").toLowerCase();
  const featureId = String(item.featureId ?? "").toLowerCase();
  if (moduleType.includes("scan")) {
    return "scan";
  }
  if (moduleType.includes("notification")) {
    return "notification";
  }
  if (moduleType.includes("auth") || moduleType.includes("verification")) {
    return "registration";
  }
  if (moduleType.includes("route-guard") || targetType.includes("route-guard")) {
    return "route-guard";
  }
  if (moduleType.includes("liff") || targetType.includes("liff") || featureName.includes("liff") || featureId.includes("liff")) {
    return "liff-core";
  }
  if (moduleType.includes("contact") || moduleType.includes("favorite") || moduleType.includes("search") || moduleType.includes("tab") || moduleType.includes("count") || moduleType.includes("empty")) {
    return "cardholder";
  }
  if (moduleType.includes("settings")) {
    return "settings";
  }
  return "other";
}

function classifyManualReferenceFamily(referenceId) {
  if (referenceId.startsWith("TC-04-")) {
    return "cardholder";
  }
  if (referenceId.startsWith("TC-SCAN-")) {
    return "scan";
  }
  if (referenceId.startsWith("TC-06-")) {
    return "notification";
  }
  if (referenceId.startsWith("TC-SET-")) {
    return "settings";
  }
  if (referenceId.startsWith("TC-REG")) {
    return "registration";
  }
  if (referenceId.startsWith("TC-MC-")) {
    return "my-card";
  }
  return "other";
}

function buildFailureAnalysis(testRunArtifacts, generationPlan) {
  const scenarioIndex = buildScenarioIndex(generationPlan);
  const entries = [];

  for (const artifact of testRunArtifacts) {
    const junitCases = artifact.junit?.testCases ?? [];
    const failingCases = junitCases.filter((testCase) => testCase.status === "failed" || testCase.status === "error");

    if (failingCases.length === 0) {
      entries.push({
        stage: artifact.stage,
        status: artifact.status,
        category: classifyFailure(artifact),
        reason: artifact.reason ?? null,
        exitCode: artifact.exitCode ?? null,
        scenarios: [],
      });
      continue;
    }

    for (const testCase of failingCases) {
      const mappedScenario = mapJunitCaseToScenario(testCase, scenarioIndex);
      entries.push({
        stage: artifact.stage,
        status: artifact.status,
        category: classifyFailure({
          ...artifact,
          stderr: `${artifact.stderr ?? ""} ${testCase.failureMessage ?? ""} ${testCase.failureText ?? ""} ${testCase.errorMessage ?? ""} ${testCase.errorText ?? ""}`,
        }),
        reason: testCase.failureMessage ?? testCase.errorMessage ?? artifact.reason ?? null,
        exitCode: artifact.exitCode ?? null,
        featureId: mappedScenario?.featureId ?? null,
        featureName: mappedScenario?.featureName ?? null,
        moduleType: mappedScenario?.moduleType ?? null,
        priority: mappedScenario?.priority ?? null,
        failureMode: mappedScenario?.failureMode ?? null,
        level: mappedScenario?.level ?? null,
        scenarioId: mappedScenario?.scenarioId ?? null,
        scenarioName: mappedScenario?.scenarioName ?? null,
        scenarioCategory: mappedScenario?.scenarioCategory ?? null,
        manualReferenceIds: mappedScenario?.manualReferenceIds ?? [],
        manualReferenceFamilies: (mappedScenario?.manualReferenceIds ?? []).map(classifyManualReferenceFamily),
        testName: testCase.name,
        testFile: testCase.classname,
      });
    }
  }

  return entries;
}

function buildScenarioIndex(generationPlan) {
  const byTitle = new Map();
  const byFileAndTitle = new Map();

  for (const item of generationPlan) {
    byTitle.set(item.title, item);
    byFileAndTitle.set(`${item.outputPath}::${item.title}`, item);
  }

  return { byTitle, byFileAndTitle };
}

function mapJunitCaseToScenario(testCase, scenarioIndex) {
  const displayName = String(testCase.name ?? "");
  const title = displayName.includes(">") ? displayName.split(">").pop().trim() : displayName.trim();
  const filePath = normalizeJunitClassname(testCase.classname);
  return scenarioIndex.byFileAndTitle.get(`${filePath}::${title}`) ?? scenarioIndex.byTitle.get(title) ?? null;
}

function normalizeJunitClassname(value) {
  return String(value ?? "").replace(/\\/g, "/").replace(/^\.\//, "");
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
  const manualCoverageSummary = buildManualCoverageSummary(generationPlan);
  const uncoveredP0Cases = generationPlan
    .filter((item) => item.priority === "P0" && (item.generationMode === "manual_only" || item.generationMode === "blocked_pending_product_rule"))
    .map((item) => ({
      featureId: item.featureId,
      featureName: item.featureName,
      moduleType: item.moduleType ?? "generic",
      scenarioId: item.scenarioId,
      scenarioName: item.scenarioName,
      generationMode: item.generationMode,
      manualReferenceIds: item.manualReferenceIds ?? [],
    }));
  const blockedPendingProductRule = generationPlan
    .filter((item) => item.generationMode === "blocked_pending_product_rule")
    .map((item) => ({
      featureId: item.featureId,
      featureName: item.featureName,
      moduleType: item.moduleType ?? "generic",
      scenarioId: item.scenarioId,
      scenarioName: item.scenarioName,
      priority: item.priority ?? "P2",
    }));
  const p0WithoutManualReference = generationPlan
    .filter((item) => item.priority === "P0" && (item.manualReferenceIds ?? []).length === 0)
    .map((item) => ({
      featureId: item.featureId,
      featureName: item.featureName,
      moduleType: item.moduleType ?? "generic",
      scenarioId: item.scenarioId,
      scenarioName: item.scenarioName,
      failureMode: item.failureMode ?? "none",
      family: classifyFeatureManualFamily(item),
    }));

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
    uncoveredP0Cases,
    p0WithoutManualReference,
    blockedPendingProductRule,
    manualCoverageByFamily: manualCoverageSummary.byFamily,
    manualCoverageP0ByFamily: manualCoverageSummary.byFamilyP0,
    p0MissingByFamily: manualCoverageSummary.missingByFamily,
    runRisk: testRunSummary.failed > 0 || testRunSummary.skipped > 0 ? "elevated" : "normal",
  };
}

function buildMarkdownReport(summary, failureAnalysis, riskAnalysis, testRunSummary, scenarioAnalysis) {
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
  lines.push("## Scenario Pool Summary");
  lines.push(`- Features with scenarios: ${scenarioAnalysis.summary.totalFeaturesWithScenarios}`);
  lines.push(`- Unique scenarios: ${scenarioAnalysis.summary.uniqueScenarios}`);
  lines.push(`- Scenario entries assigned to test levels: ${scenarioAnalysis.summary.totalScenarioEntries}`);
  if (Object.keys(scenarioAnalysis.summary.byLevel).length > 0) {
    lines.push(`- By level: ${formatCountMap(scenarioAnalysis.summary.byLevel)}`);
  }
  if (Object.keys(scenarioAnalysis.summary.byCategory).length > 0) {
    lines.push(`- By category: ${formatCountMap(scenarioAnalysis.summary.byCategory)}`);
  }
  if (Object.keys(scenarioAnalysis.summary.byPriority).length > 0) {
    lines.push(`- By priority: ${formatCountMap(scenarioAnalysis.summary.byPriority)}`);
  }
  if (Object.keys(scenarioAnalysis.summary.byGenerationMode).length > 0) {
    lines.push(`- By generation mode: ${formatCountMap(scenarioAnalysis.summary.byGenerationMode)}`);
  }
  if (Object.keys(scenarioAnalysis.summary.byFailureMode).length > 0) {
    lines.push(`- By failure mode: ${formatCountMap(scenarioAnalysis.summary.byFailureMode)}`);
  }
  if (Object.keys(scenarioAnalysis.summary.byModuleType).length > 0) {
    lines.push(`- By module type: ${formatCountMap(scenarioAnalysis.summary.byModuleType)}`);
  }
  if (scenarioAnalysis.summary.manualCoverage) {
    lines.push(`- Manual coverage: referenced=${scenarioAnalysis.summary.manualCoverage.referenced}, autoGenerated=${scenarioAnalysis.summary.manualCoverage.autoGenerated}, manualOnly=${scenarioAnalysis.summary.manualCoverage.manualOnly}, blockedPendingProductRule=${scenarioAnalysis.summary.manualCoverage.blockedPendingProductRule}`);
    lines.push(`- Manual coverage P0: referenced=${scenarioAnalysis.summary.manualCoverage.p0Referenced}, missingReference=${scenarioAnalysis.summary.manualCoverage.p0MissingReference}`);
    if (Object.keys(scenarioAnalysis.summary.manualCoverage.byFamily ?? {}).length > 0) {
      lines.push(`- Manual coverage by family: ${formatCountMap(scenarioAnalysis.summary.manualCoverage.byFamily)}`);
    }
    if (Object.keys(scenarioAnalysis.summary.manualCoverage.byFamilyP0 ?? {}).length > 0) {
      lines.push(`- Manual coverage P0 by family: ${formatCountMap(scenarioAnalysis.summary.manualCoverage.byFamilyP0)}`);
    }
    if (Object.keys(scenarioAnalysis.summary.manualCoverage.missingByFamily ?? {}).length > 0) {
      lines.push(`- Missing P0 manual refs by family: ${formatCountMap(scenarioAnalysis.summary.manualCoverage.missingByFamily)}`);
    }
  }
  if (Object.keys(scenarioAnalysis.summary.manualOverlap?.byFamily ?? {}).length > 0) {
    lines.push(`- Manual overlap by family: ${formatManualOverlapMap(scenarioAnalysis.summary.manualOverlap.byFamily)}`);
  }
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
  lines.push("## Scenario Pool Details");
  const prioritizedFeatures = [
    ...scenarioAnalysis.features.filter((feature) => feature.risk === "high"),
    ...scenarioAnalysis.features.filter((feature) => feature.risk !== "high").slice(0, 8),
  ];
  if (prioritizedFeatures.length === 0) {
    lines.push("- No scenario data available.");
  } else {
    for (const feature of prioritizedFeatures) {
      lines.push(`### ${feature.featureName}`);
      lines.push(`- Feature ID: ${feature.featureId}`);
      lines.push(`- Target type: ${feature.targetType}`);
      lines.push(`- Risk: ${feature.risk}`);
      if (feature.featureGoal) {
        lines.push(`- Goal: ${feature.featureGoal}`);
      }
      if (feature.successCriteria.length > 0) {
        lines.push(`- Success criteria: ${feature.successCriteria.join(" | ")}`);
      }
      for (const scenario of feature.scenarios) {
        lines.push(`- ${scenario.scenarioId} ${scenario.scenarioName} [${scenario.scenarioCategory}] -> ${scenario.levels.join(", ")}`);
        lines.push(`  Module type: ${scenario.moduleType ?? "generic"}`);
        if (scenario.priorities.length > 0) {
          lines.push(`  Priority: ${scenario.priorities.join(", ")}`);
        }
        if (scenario.generationModes.length > 0) {
          lines.push(`  Generation mode: ${scenario.generationModes.join(", ")}`);
        }
        if (scenario.failureModes.length > 0) {
          lines.push(`  Failure mode: ${scenario.failureModes.join(", ")}`);
        }
        if (scenario.preconditions.length > 0) {
          lines.push(`  Preconditions: ${scenario.preconditions.join(" | ")}`);
        }
        if (scenario.userActions.length > 0) {
          lines.push(`  User actions: ${scenario.userActions.join(" | ")}`);
        }
        if (scenario.systemResult.length > 0) {
          lines.push(`  System result: ${scenario.systemResult.join(" | ")}`);
        }
        if (scenario.expectedOutcome.length > 0) {
          lines.push(`  Expected outcome: ${scenario.expectedOutcome.join(" | ")}`);
        }
        if (scenario.testData.length > 0) {
          lines.push(`  Test data: ${scenario.testData.map(formatTestDataItem).join(" | ")}`);
        }
        if (scenario.manualReferenceIds.length > 0) {
          lines.push(`  Manual refs: ${scenario.manualReferenceIds.join(", ")}`);
        }
      }
      lines.push("");
    }
  }
  lines.push("## Failure Analysis");
  if (failureAnalysis.length === 0) {
    lines.push("- No failure artifacts.");
  } else {
    for (const failure of failureAnalysis) {
      if (failure.scenarioId) {
        lines.push(`- ${failure.stage}: ${failure.category} (${failure.status}) -> ${failure.featureName ?? failure.featureId} / ${failure.scenarioId} ${failure.scenarioName}`);
        if ((failure.manualReferenceIds ?? []).length > 0) {
          lines.push(`  Manual refs: ${failure.manualReferenceIds.join(", ")}`);
        }
      } else {
        lines.push(`- ${failure.stage}: ${failure.category} (${failure.status})`);
      }
    }
  }
  lines.push("");
  lines.push("## Risk Analysis");
  lines.push(`- Run risk: ${riskAnalysis.runRisk}`);
  lines.push(`- Uncovered P0 cases: ${riskAnalysis.uncoveredP0Cases.length}`);
  lines.push(`- P0 cases missing manual reference: ${riskAnalysis.p0WithoutManualReference.length}`);
  lines.push(`- Blocked pending product-rule cases: ${riskAnalysis.blockedPendingProductRule.length}`);
  if (Object.keys(riskAnalysis.manualCoverageByFamily ?? {}).length > 0) {
    lines.push(`- Manual coverage by family: ${formatCountMap(riskAnalysis.manualCoverageByFamily)}`);
  }
  if (Object.keys(riskAnalysis.manualCoverageP0ByFamily ?? {}).length > 0) {
    lines.push(`- Manual coverage P0 by family: ${formatCountMap(riskAnalysis.manualCoverageP0ByFamily)}`);
  }
  if (Object.keys(riskAnalysis.p0MissingByFamily ?? {}).length > 0) {
    lines.push(`- Missing P0 manual refs by family: ${formatCountMap(riskAnalysis.p0MissingByFamily)}`);
  }
  if (riskAnalysis.uncoveredHighRisk.length === 0) {
    lines.push("- No uncovered high-risk features.");
  } else {
    for (const feature of riskAnalysis.uncoveredHighRisk) {
      lines.push(`- Uncovered high-risk feature: ${feature.featureId} (${feature.name})`);
    }
  }
  for (const item of riskAnalysis.uncoveredP0Cases.slice(0, 10)) {
    lines.push(`- Uncovered P0: ${item.featureName} / ${item.scenarioId} ${item.scenarioName} [${item.moduleType}]`);
  }
  for (const item of riskAnalysis.p0WithoutManualReference.slice(0, 10)) {
    lines.push(`- P0 missing manual ref: ${item.featureName} / ${item.scenarioId} ${item.scenarioName} [${item.failureMode}; ${item.family}]`);
  }
  for (const item of riskAnalysis.blockedPendingProductRule.slice(0, 10)) {
    lines.push(`- Blocked product rule: ${item.featureName} / ${item.scenarioId} ${item.scenarioName} [${item.priority}]`);
  }
  lines.push("");
  lines.push("## Manual Overlap Summary");
  if (Object.keys(scenarioAnalysis.summary.manualOverlap?.byFamily ?? {}).length === 0) {
    lines.push("- None");
  } else {
    for (const [family, overlap] of Object.entries(scenarioAnalysis.summary.manualOverlap.byFamily)) {
      const coverage = overlap.approxCoveragePct == null ? "n/a" : `${overlap.approxCoveragePct}%`;
      lines.push(`- ${family}: refs=${overlap.referencedTotal}, expected=${overlap.expectedTotal ?? "unknown"}, approxCoverage=${coverage}`);
      if ((overlap.sampleRefs ?? []).length > 0) {
        lines.push(`  Sample refs: ${overlap.sampleRefs.join(", ")}`);
      }
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
  lines.push("## Uncovered P0 Cases");
  if (riskAnalysis.uncoveredP0Cases.length === 0) {
    lines.push("- None");
  } else {
    for (const item of riskAnalysis.uncoveredP0Cases) {
      lines.push(`- ${item.featureId} / ${item.scenarioId}: ${item.featureName} [${item.moduleType}]`);
    }
  }
  lines.push("");
  lines.push("## P0 Missing Manual Reference");
  if (riskAnalysis.p0WithoutManualReference.length === 0) {
    lines.push("- None");
  } else {
    for (const item of riskAnalysis.p0WithoutManualReference) {
      lines.push(`- ${item.featureId} / ${item.scenarioId}: ${item.featureName} [${item.failureMode}; ${item.family}]`);
    }
  }
  lines.push("");
  lines.push("## Manual Coverage By Family");
  if (Object.keys(riskAnalysis.manualCoverageByFamily ?? {}).length === 0) {
    lines.push("- None");
  } else {
    lines.push(`- Total: ${formatCountMap(riskAnalysis.manualCoverageByFamily)}`);
    if (Object.keys(riskAnalysis.manualCoverageP0ByFamily ?? {}).length > 0) {
      lines.push(`- P0 referenced: ${formatCountMap(riskAnalysis.manualCoverageP0ByFamily)}`);
    }
    if (Object.keys(riskAnalysis.p0MissingByFamily ?? {}).length > 0) {
      lines.push(`- P0 missing: ${formatCountMap(riskAnalysis.p0MissingByFamily)}`);
    }
  }
  lines.push("");
  lines.push("## Blocked Pending Product Rule");
  if (riskAnalysis.blockedPendingProductRule.length === 0) {
    lines.push("- None");
  } else {
    for (const item of riskAnalysis.blockedPendingProductRule) {
      lines.push(`- ${item.featureId} / ${item.scenarioId}: ${item.featureName} [${item.priority}]`);
    }
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function formatCountMap(value) {
  return Object.entries(value)
    .map(([key, count]) => `${key}=${count}`)
    .join(", ");
}

function formatManualOverlapMap(value) {
  return Object.entries(value)
    .map(([key, overlap]) => {
      const coverage = overlap.approxCoveragePct == null ? "n/a" : `${overlap.approxCoveragePct}%`;
      return `${key}=${overlap.referencedTotal}/${overlap.expectedTotal ?? "?"} (${coverage})`;
    })
    .join(", ");
}

function formatTestDataItem(item) {
  const values = Array.isArray(item.values) ? item.values.map((value) => JSON.stringify(value)).join(", ") : "";
  const source = item.source ? ` [${item.source}]` : "";
  const note = item.note ? ` (${item.note})` : "";
  return `${item.kind}${source}: ${values}${note}`;
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
