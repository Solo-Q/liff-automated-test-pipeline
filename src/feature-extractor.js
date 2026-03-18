import fs from "node:fs/promises";
import path from "node:path";

import { analyzeRepository } from "./analyzer.js";
import { EXIT_CODES } from "./constants.js";
import { classifyFeatureTarget, TARGET_TYPES } from "./target-classification.js";
import { ensureDirectory, findFiles, pathExists, readJsonFile, writeJsonFile } from "./utils/fs.js";

const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]);
const FEATURE_HINT_PATTERNS = [
  { source: "route", regex: /(^|\/)(pages|routes)\// },
  { source: "component", regex: /(^|\/)(components)\// },
  { source: "hook", regex: /(^|\/)(hooks)\// },
  { source: "handler", regex: /(submit|handle[A-Z]|on[A-Z]|action)/ },
  { source: "liff-entry", regex: /(liff|profile|login|auth|bootstrap|init)/i },
];
const IGNORED_PREFIXES = ["testing/", "tests/generated/", ".liff-testgen/"];
const FEATURE_INCLUDE_PATTERNS = [
  /^src\/features\/.+\/(pages|routes)\//,
  /^src\/routes\/.+\.(js|jsx|ts|tsx|mjs|cjs)$/,
  /^src\/routes\/guards\/.+\.(js|jsx|ts|tsx|mjs|cjs)$/,
  /^src\/hooks\/use(Liff|Auth|Platform|LiffTitle)[^/]*\.(js|jsx|ts|tsx|mjs|cjs)$/,
  /^src\/services\/liffService\.(js|jsx|ts|tsx|mjs|cjs)$/,
  /^src\/services\/api\/lineService\.(js|jsx|ts|tsx|mjs|cjs)$/,
  /^src\/App\.(js|jsx|ts|tsx|mjs|cjs)$/,
];
const FEATURE_EXCLUDE_PATTERNS = [
  /(^|\/)__tests__\//,
  /\.(test|spec)\.(js|jsx|ts|tsx|mjs|cjs)$/,
  /\.d\.ts$/,
  /(^|\/)(playground|scripts|docs|reference_docs|claudedocs|expansion-packs)\//,
  /^src\/(components|types|utils|constants|locales|assets|state|app)\//,
  /^src\/routes\/(paths|route-table)\.(js|jsx|ts|tsx|mjs|cjs)$/,
  /(^|\/)index\.(js|jsx|ts|tsx|mjs|cjs)$/,
];

export async function extractFeatures(context, logger) {
  const { repoPath, options } = context;
  logger.info("Stage started: extract-features", {
    stage: "extract-features",
    repoPath,
    dryRun: options.dryRun,
  });

  const analysis = await loadOrAnalyze(context, logger);
  if (!analysis.ok) {
    return {
      stage: "extract-features",
      ok: false,
      exitCode: analysis.exitCode,
      message: analysis.message,
      errorCode: analysis.errorCode,
      data: analysis.data,
    };
  }

  const { projectProfile, liffUsageReport, existingTestMap } = analysis.data;
  if (!projectProfile.usesLiff) {
    return {
      stage: "extract-features",
      ok: false,
      exitCode: EXIT_CODES.UNSUPPORTED_PROJECT,
      message: "Feature extraction requires a LIFF repository.",
      errorCode: "LIFF_NOT_DETECTED",
      data: analysis.data,
    };
  }

  const sourceFiles = await findFiles(repoPath, ({ relativePath, name }) => {
    return SOURCE_EXTENSIONS.has(path.extname(name)) && !IGNORED_PREFIXES.some((prefix) => relativePath.startsWith(prefix));
  });
  const featureMap = await buildFeatureMap(repoPath, sourceFiles, liffUsageReport, existingTestMap);
  const outputPath = path.join(repoPath, ".liff-testgen/feature-map.json");
  const pipelineStatePath = path.join(repoPath, ".liff-testgen/pipeline-state.json");
  const featureMapExists = await pathExists(outputPath);
  const pipelineState = await buildPipelineState(
    pipelineStatePath,
    options.dryRun,
    featureMapExists ? "update" : "create",
  );

  if (!options.dryRun) {
    const outputDir = path.join(repoPath, ".liff-testgen");
    await ensureDirectory(outputDir);
    await writeJsonFile(outputPath, featureMap);
    await writeJsonFile(pipelineStatePath, pipelineState);
  }

  return {
    stage: "extract-features",
    ok: true,
    exitCode: EXIT_CODES.SUCCESS,
    message: "Feature extraction completed.",
    data: {
      dryRun: options.dryRun,
      featureCount: featureMap.length,
      output: ".liff-testgen/feature-map.json",
      projectProfile,
      liffUsageReport,
      existingTestMap,
      featureMap,
      pipelineState,
    },
  };
}

async function loadOrAnalyze(context, logger) {
  const repoPath = context.repoPath;
  const profilePath = path.join(repoPath, ".liff-testgen/project-profile.json");
  const usagePath = path.join(repoPath, ".liff-testgen/liff-usage-report.json");
  const testMapPath = path.join(repoPath, ".liff-testgen/existing-test-map.json");

  if ((await pathExists(profilePath)) && (await pathExists(usagePath)) && (await pathExists(testMapPath))) {
    return {
      ok: true,
      exitCode: EXIT_CODES.SUCCESS,
      data: {
        projectProfile: await readJsonFile(profilePath),
        liffUsageReport: await readJsonFile(usagePath),
        existingTestMap: await readJsonFile(testMapPath),
      },
    };
  }

  return analyzeRepository(context, logger);
}

async function buildFeatureMap(repoPath, sourceFiles, liffUsageReport, existingTestMap) {
  const liffFiles = new Set([...liffUsageReport.importFiles, ...liffUsageReport.directCallFiles]);
  const features = [];
  const seenIds = new Set();

  for (const file of sourceFiles) {
    const content = await fs.readFile(file.absolutePath, "utf8");
    const extractionSource = deriveExtractionSources(file.relativePath, content);
    const dependsOnLiff = liffFiles.has(file.relativePath);
    const isFeatureCandidate = isEligibleFeatureFile(file.relativePath, dependsOnLiff) &&
      (dependsOnLiff || extractionSource.length > 0);

    if (!isFeatureCandidate) {
      continue;
    }

    const featureId = createFeatureId(file.relativePath);
    if (seenIds.has(featureId)) {
      continue;
    }
    seenIds.add(featureId);

    const existingTests = matchExistingTests(existingTestMap.files, file.relativePath);
    const riskScore = scoreFeature(content, dependsOnLiff, existingTests);
    const risk = mapRisk(riskScore);
    const featureName = createFeatureName(file.relativePath);
    const targetType = classifyFeatureTarget({
      name: featureName,
      files: [file.relativePath],
      dependsOnLiff,
      extractionSource,
    });
    features.push({
      featureId,
      name: featureName,
      files: [file.relativePath],
      targetType,
      dependsOnLiff,
      risk,
      recommendedTests: recommendTests(risk, dependsOnLiff, targetType),
      existingTests,
      extractionSource,
      reviewStatus: "auto",
    });
  }

  return features.sort((left, right) => left.featureId.localeCompare(right.featureId));
}

function isEligibleFeatureFile(relativePath, dependsOnLiff) {
  if (!relativePath.startsWith("src/")) {
    return false;
  }

  if (FEATURE_EXCLUDE_PATTERNS.some((pattern) => pattern.test(relativePath))) {
    return false;
  }

  if (dependsOnLiff && /^src\/(features\/.+\/(hooks|services)|hooks|services)\//.test(relativePath)) {
    return true;
  }

  return FEATURE_INCLUDE_PATTERNS.some((pattern) => pattern.test(relativePath));
}

function deriveExtractionSources(relativePath, content) {
  const sources = new Set();

  for (const hint of FEATURE_HINT_PATTERNS) {
    if (hint.regex.test(relativePath) || hint.regex.test(content)) {
      sources.add(hint.source);
    }
  }

  if (/export\s+(async\s+)?function\s+use[A-Z]/.test(content) || /function\s+use[A-Z]/.test(content)) {
    sources.add("hook");
  }

  return [...sources].sort();
}

function scoreFeature(content, dependsOnLiff, existingTests) {
  let score = 0;

  if (dependsOnLiff && /(isLoggedIn|getProfile|getAccessToken|getIDToken|login|logout)/.test(content)) {
    score += 2;
  }
  if (dependsOnLiff && /(profile|token)/i.test(content)) {
    score += 2;
  }
  if (/(fetch|axios|navigate|router|location\.href|submit|dispatch)/.test(content)) {
    score += 2;
  }
  if (existingTests.length === 0) {
    score += 1;
  }
  if (/(catch\s*\(|throw\s+new|return\s+null|return\s+false|Error)/.test(content)) {
    score += 1;
  }

  return score;
}

function mapRisk(score) {
  if (score >= 5) {
    return "high";
  }
  if (score >= 2) {
    return "medium";
  }
  return "low";
}

function recommendTests(risk, dependsOnLiff, targetType) {
  if (targetType === TARGET_TYPES.ROUTE_GUARD || targetType === TARGET_TYPES.AUTH_ENTRY_FLOW) {
    return risk === "high" ? ["unit", "integration"] : ["unit"];
  }
  if (risk === "high") {
    return ["unit", "integration", "e2e"];
  }
  if (risk === "medium") {
    return dependsOnLiff ? ["unit", "integration"] : ["unit"];
  }
  return ["unit"];
}

function matchExistingTests(testFiles, relativePath) {
  const stem = path.basename(relativePath, path.extname(relativePath)).toLowerCase();
  return testFiles.filter((testFile) => testFile.toLowerCase().includes(stem)).sort();
}

function createFeatureId(relativePath) {
  return relativePath
    .replace(/\.[^.]+$/, "")
    .replace(/[\\/]+/g, "-")
    .replace(/[^a-zA-Z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function createFeatureName(relativePath) {
  const stem = path.basename(relativePath, path.extname(relativePath));
  const spaced = stem.replace(/[-_]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function buildPipelineState(pipelineStatePath, dryRun, featureMapAction) {
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
  completedStages.add("extract-features");

  const existingMutations = Array.isArray(baseState.fileMutations) ? baseState.fileMutations : [];
  const nextMutation = {
    path: ".liff-testgen/feature-map.json",
    action: featureMapAction,
  };

  return {
    ...baseState,
    lastRunAt: new Date().toISOString(),
    completedStages: [...completedStages],
    dryRun,
    fileMutations: dedupeMutations([...existingMutations, nextMutation]),
  };
}

function dedupeMutations(mutations) {
  const seen = new Map();

  for (const mutation of mutations) {
    seen.set(mutation.path, mutation);
  }

  return [...seen.values()];
}
