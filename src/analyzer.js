import fs from "node:fs/promises";
import path from "node:path";

import { EXIT_CODES } from "./constants.js";
import { classifySourceTarget, TARGET_TYPES } from "./target-classification.js";
import { findFiles, ensureDirectory, pathExists, readJsonFile, writeJsonFile } from "./utils/fs.js";
import { detectPackageManager } from "./utils/package-manager.js";

const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]);
const TEST_FILE_PATTERN = /\.(test|spec)\.(js|jsx|ts|tsx|mjs|cjs)$/;
const LIFF_APIS = [
  "init",
  "getProfile",
  "isLoggedIn",
  "login",
  "logout",
  "getAccessToken",
  "getIDToken",
  "isInClient",
];
const ADAPTER_PATH_PATTERNS = [
  "liffGateway",
  "liffService",
  "services/liff",
  "adapters/liff",
];
const LIFF_IMPORT_REGEX = /\bfrom\s*['"]@line\/liff['"]|\bimport\s*\(\s*['"]@line\/liff['"]\s*\)/;
const LIFF_DIRECT_CALL_REGEX = /\bliff\.(init|getProfile|isLoggedIn|login|logout|getAccessToken|getIDToken|isInClient)\s*\(/g;

export async function analyzeRepository(context, logger) {
  const { repoPath, options } = context;
  logger.info("Stage started: analyze", {
    stage: "analyze",
    repoPath,
    dryRun: options.dryRun,
  });

  const packageJsonPath = path.join(repoPath, "package.json");

  if (!(await pathExists(packageJsonPath))) {
    return {
      stage: "analyze",
      ok: false,
      exitCode: EXIT_CODES.UNSUPPORTED_PROJECT,
      message: "Target repository does not contain package.json.",
      errorCode: "PACKAGE_JSON_MISSING",
    };
  }

  const packageManager = await detectPackageManager(repoPath);
  if (!packageManager) {
    return {
      stage: "analyze",
      ok: false,
      exitCode: EXIT_CODES.PACKAGE_MANAGER_UNRESOLVED,
      message: "Could not resolve package manager from lockfiles.",
      errorCode: "PACKAGE_MANAGER_UNRESOLVED",
    };
  }

  const packageJson = await readJsonFile(packageJsonPath);
  const workspaceResolution = resolveWorkspaces(packageJson, options.workspace);
  if (!workspaceResolution.ok) {
    return {
      stage: "analyze",
      ok: false,
      exitCode: EXIT_CODES.WORKSPACE_RESOLUTION_FAILED,
      message: workspaceResolution.message,
      errorCode: workspaceResolution.errorCode,
    };
  }

  const sourceFiles = await findFiles(repoPath, ({ name }) => SOURCE_EXTENSIONS.has(path.extname(name)));
  const testFiles = sourceFiles.filter((file) => TEST_FILE_PATTERN.test(file.name));
  const language = detectLanguage(sourceFiles);
  const framework = detectFramework(packageJson);
  const unitTestFramework = detectUnitTestFramework(packageJson, repoPath);
  const e2eFramework = detectE2EFramework(packageJson, repoPath);
  const hasLiffMock = hasDependency(packageJson, "@line/liff-mock");
  const usageReport = await buildLiffUsageReport(sourceFiles);
  const hasLiffAdapter = usageReport.adapterCandidateFiles.length > 0;
  const projectProfile = {
    schemaVersion: "1",
    repoPath,
    packageManager,
    framework,
    language,
    monorepo: workspaceResolution.workspaces.length > 0,
    workspaces: workspaceResolution.workspaces,
    targetWorkspace: workspaceResolution.targetWorkspace,
    unitTestFramework,
    e2eFramework,
    usesLiff: usageReport.importFiles.length > 0 || usageReport.directCallFiles.length > 0 || hasDependency(packageJson, "@line/liff"),
    hasLiffMock,
    hasLiffAdapter,
  };
  const existingTestMap = {
    schemaVersion: "1",
    files: testFiles.map((file) => file.relativePath).sort(),
  };

  const outputs = [
    {
      relativePath: ".liff-testgen/project-profile.json",
      value: projectProfile,
    },
    {
      relativePath: ".liff-testgen/liff-usage-report.json",
      value: usageReport,
    },
    {
      relativePath: ".liff-testgen/existing-test-map.json",
      value: existingTestMap,
    },
  ];

  if (!options.dryRun) {
    const outputDir = path.join(repoPath, ".liff-testgen");
    await ensureDirectory(outputDir);

    for (const output of outputs) {
      await writeJsonFile(path.join(repoPath, output.relativePath), output.value);
    }
  }

  if (!projectProfile.usesLiff) {
    return {
      stage: "analyze",
      ok: false,
      exitCode: EXIT_CODES.UNSUPPORTED_PROJECT,
      message: "Repository was analyzed successfully but no LIFF usage was detected.",
      errorCode: "LIFF_NOT_DETECTED",
      data: buildAnalyzeData(projectProfile, usageReport, existingTestMap, outputs, options.dryRun),
    };
  }

  return {
    stage: "analyze",
    ok: true,
    exitCode: EXIT_CODES.SUCCESS,
    message: "Repository analysis completed.",
    data: buildAnalyzeData(projectProfile, usageReport, existingTestMap, outputs, options.dryRun),
  };
}

function buildAnalyzeData(projectProfile, usageReport, existingTestMap, outputs, dryRun) {
  return {
    dryRun,
    outputs: outputs.map((output) => output.relativePath),
    projectProfile,
    liffUsageReport: usageReport,
    existingTestMap,
  };
}

function resolveWorkspaces(packageJson, requestedWorkspace) {
  const workspaces = normalizeWorkspaces(packageJson.workspaces);

  if (requestedWorkspace && !workspaces.includes(requestedWorkspace)) {
    return {
      ok: false,
      errorCode: "WORKSPACE_NOT_FOUND",
      message: `Workspace '${requestedWorkspace}' was not found in package.json workspaces.`,
    };
  }

  return {
    ok: true,
    workspaces,
    targetWorkspace: requestedWorkspace ?? null,
  };
}

function normalizeWorkspaces(workspaces) {
  if (Array.isArray(workspaces)) {
    return workspaces;
  }

  if (workspaces && Array.isArray(workspaces.packages)) {
    return workspaces.packages;
  }

  return [];
}

function detectLanguage(sourceFiles) {
  let hasJs = false;
  let hasTs = false;

  for (const file of sourceFiles) {
    const extension = path.extname(file.name);
    if (extension === ".ts" || extension === ".tsx") {
      hasTs = true;
    }
    if (extension === ".js" || extension === ".jsx" || extension === ".mjs" || extension === ".cjs") {
      hasJs = true;
    }
  }

  if (hasJs && hasTs) {
    return "mixed";
  }
  if (hasTs) {
    return "ts";
  }
  return "js";
}

function detectFramework(packageJson) {
  return hasDependency(packageJson, "react") ? "react" : "unknown";
}

function detectUnitTestFramework(packageJson, repoPath) {
  if (hasDependency(packageJson, "vitest")) {
    return "vitest";
  }
  if (hasDependency(packageJson, "jest")) {
    return "jest";
  }
  return null;
}

function detectE2EFramework(packageJson, repoPath) {
  if (hasDependency(packageJson, "@playwright/test")) {
    return "playwright";
  }
  return null;
}

function hasDependency(packageJson, dependencyName) {
  const collections = [
    packageJson.dependencies,
    packageJson.devDependencies,
    packageJson.peerDependencies,
    packageJson.optionalDependencies,
  ];

  return collections.some((collection) => Boolean(collection?.[dependencyName]));
}

async function buildLiffUsageReport(sourceFiles) {
  const importFiles = [];
  const directCallFiles = [];
  const adapterCandidateFiles = [];
  const targetCandidates = [];
  const detectedApis = new Set();

  for (const file of sourceFiles) {
    const content = await fs.readFile(file.absolutePath, "utf8");
    const hasImport = LIFF_IMPORT_REGEX.test(content);
    const directCalls = [...content.matchAll(LIFF_DIRECT_CALL_REGEX)];
    const hasDirectCall = directCalls.length > 0;
    const isAdapterCandidate = ADAPTER_PATH_PATTERNS.some((pattern) => file.relativePath.includes(pattern));
    const targetType = classifySourceTarget(file.relativePath);

    if (hasImport) {
      importFiles.push(file.relativePath);
    }

    if (hasDirectCall) {
      directCallFiles.push(file.relativePath);
      for (const match of directCalls) {
        const api = match[0].slice("liff.".length).replace(/\s*\($/, "");
        detectedApis.add(api);
      }
    }

    if (isAdapterCandidate || looksLikeAdapter(content)) {
      adapterCandidateFiles.push(file.relativePath);
    }

    if (targetType !== TARGET_TYPES.GENERIC && (hasImport || hasDirectCall || isAdapterCandidate || looksLikeAdapter(content))) {
      targetCandidates.push({
        file: file.relativePath,
        targetType,
      });
    }
  }

  return {
    schemaVersion: "1",
    importFiles: importFiles.sort(),
    directCallFiles: directCallFiles.sort(),
    adapterCandidateFiles: [...new Set(adapterCandidateFiles)].sort(),
    targetCandidates: dedupeTargetCandidates(targetCandidates),
    detectedApis: [...detectedApis].sort(),
  };
}

function looksLikeAdapter(content) {
  const exportedWrapperCount =
    [...content.matchAll(/\bexport\s+(async\s+)?function\s+(getProfile|isLoggedIn|init|login)\b/g)].length;
  return exportedWrapperCount >= 2 && content.includes("liff.");
}

function dedupeTargetCandidates(candidates) {
  const seen = new Map();
  for (const candidate of candidates) {
    seen.set(`${candidate.file}:${candidate.targetType}`, candidate);
  }
  return [...seen.values()].sort((left, right) => left.file.localeCompare(right.file));
}
