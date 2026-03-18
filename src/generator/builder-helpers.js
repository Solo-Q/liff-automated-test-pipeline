import path from "node:path";

import { TARGET_TYPES } from "../target-classification.js";

export function buildRelativeImportPath(relativePath, targetPathWithoutExtension) {
  const importPath = toPosixPath(
    path.posix.relative(path.posix.dirname(relativePath), targetPathWithoutExtension),
  );
  return normalizeImportPath(importPath);
}

export function deriveServiceExportName(sourceFile) {
  const stem = path.basename(sourceFile, path.extname(sourceFile));
  return stem.charAt(0).toLowerCase() + stem.slice(1);
}

export function deriveComponentExportName(sourceFile) {
  const stem = path.basename(sourceFile, path.extname(sourceFile));
  return stem.charAt(0).toUpperCase() + stem.slice(1);
}

export function inferLiffCompanionSourceFile(items, fallbackSourceFile) {
  const liffTarget = items.find((item) => item.targetType === TARGET_TYPES.LIFF_ADAPTER_SERVICE && item.sourceFile);
  return liffTarget?.sourceFile ?? "src/services/liffService.ts" ?? fallbackSourceFile;
}

export function buildImportLines(relativePath, level, projectProfile) {
  if (level === "e2e") {
    return `import { test, expect } from "@playwright/test";`;
  }

  const testFramework = projectProfile.unitTestFramework === "jest" ? "jest" : "vitest";
  const fixtureImportPath = toPosixPath(path.posix.relative(path.posix.dirname(relativePath), "testing/liff/applyFixture"));
  const resetFixtureImportPath = toPosixPath(path.posix.relative(path.posix.dirname(relativePath), "testing/liff/resetFixture"));
  return `import { beforeEach, describe, it, expect } from "${testFramework}";
import { applyLiffFixture } from "${normalizeImportPath(fixtureImportPath)}";
import { resetLiffFixture } from "${normalizeImportPath(resetFixtureImportPath)}";`;
}

export function buildCaseBlock(item, level) {
  const testFn = level === "e2e" ? "test" : "it";
  const lines = [];
  lines.push(`${testFn}("${item.title}", async () => {`);

  if (level !== "e2e") {
    lines.push(`  const scenario = {`);
    lines.push(`    featureId: "${item.featureId}",`);
    lines.push(`    featureName: "${item.featureName ?? item.featureId}",`);
    lines.push(`    featureGoal: ${JSON.stringify(item.featureGoal ?? "")},`);
    lines.push(`    sourceFile: ${JSON.stringify(item.sourceFile ?? null)},`);
    lines.push(`    targetType: "${item.targetType ?? TARGET_TYPES.GENERIC}",`);
    lines.push(`    moduleType: ${JSON.stringify(item.moduleType ?? "generic")},`);
    lines.push(`    level: "${level}",`);
    lines.push(`    priority: ${JSON.stringify(item.priority ?? "P2")},`);
    lines.push(`    generationMode: ${JSON.stringify(item.generationMode ?? "auto_optional")},`);
    lines.push(`    scenarioId: "${item.scenarioId ?? "S00"}",`);
    lines.push(`    scenarioName: ${JSON.stringify(item.scenarioName ?? item.title)},`);
    lines.push(`    scenarioCategory: ${JSON.stringify(item.scenarioCategory ?? "Generic")},`);
    lines.push(`    failureMode: ${JSON.stringify(item.failureMode ?? null)},`);
    lines.push(`    fixture: "${item.fixture}",`);
    lines.push(`    testData: ${JSON.stringify(item.testData ?? [])},`);
    lines.push(`    manualReferenceIds: ${JSON.stringify(item.manualReferenceIds ?? [])},`);
    lines.push(`    preconditions: ${JSON.stringify(item.preconditions ?? [])},`);
    lines.push(`    userActions: ${JSON.stringify(item.userActions ?? [])},`);
    lines.push(`    systemResult: ${JSON.stringify(item.systemResult ?? [])},`);
    lines.push(`    expectedOutcome: ${JSON.stringify(item.expectedOutcome ?? [])},`);
    lines.push(`    successCriteria: ${JSON.stringify(item.successCriteria ?? [])},`);
    lines.push(`    allocationReason: ${JSON.stringify(item.allocationReason ?? "")},`);
    lines.push(`    testQuestion: ${JSON.stringify(item.testQuestion ?? "")},`);
    lines.push(`  };`);
    lines.push(``);
    lines.push(`  applyLiffFixture(scenario.fixture);`);
    lines.push(`  expect(scenario.featureId.length).toBeGreaterThan(0);`);
    lines.push(`  expect(scenario.expectedOutcome.length).toBeGreaterThan(0);`);
    lines.push(`  expect(scenario.preconditions.length).toBeGreaterThan(0);`);
    lines.push(`  expect(scenario.userActions.length).toBeGreaterThan(0);`);
    lines.push(`  expect(scenario.systemResult.length).toBeGreaterThan(0);`);
    lines.push(`  expect(scenario.priority.length).toBeGreaterThan(0);`);
    lines.push(`  if (scenario.testData.length > 0) {`);
    lines.push(`    expect(scenario.testData[0].values.length).toBeGreaterThan(0);`);
    lines.push(`  }`);
  } else {
    lines.push(`  await page.goto("/");`);
    lines.push(`  await expect(page).toHaveURL(/.*/);`);
  }

  lines.push(`  // Scenario category: ${item.scenarioCategory ?? "Generic"}`);
  lines.push(`  // Module type: ${item.moduleType ?? "generic"}`);
  lines.push(`  // Priority: ${item.priority ?? "P2"}`);
  lines.push(`  // Generation mode: ${item.generationMode ?? "auto_optional"}`);
  lines.push(`  // Failure mode: ${item.failureMode ?? "none"}`);
  lines.push(`  // Test question: ${item.testQuestion ?? ""}`);
  lines.push(`  // Allocation reason: ${item.allocationReason ?? ""}`);
  for (const dataItem of item.testData ?? []) {
    lines.push(`  // Test data ${dataItem.kind}: ${JSON.stringify(dataItem.values ?? [])}`);
  }
  for (const referenceId of item.manualReferenceIds ?? []) {
    lines.push(`  // Manual reference: ${referenceId}`);
  }
  for (const precondition of item.preconditions ?? []) {
    lines.push(`  // Precondition: ${precondition}`);
  }
  for (const action of item.userActions ?? []) {
    lines.push(`  // User action: ${action}`);
  }
  for (const result of item.systemResult ?? []) {
    lines.push(`  // System result: ${result}`);
  }
  for (const expected of item.expectedOutcome) {
    lines.push(`  // ${expected}`);
  }

  lines.push(`});`);
  return lines.join("\n");
}

export function inferLevelFromOutputPath(relativePath) {
  if (relativePath.includes("/e2e/")) {
    return "e2e";
  }
  if (relativePath.includes("/integration/")) {
    return "integration";
  }
  return "unit";
}

export function normalizeImportPath(importPath) {
  if (importPath.startsWith(".")) {
    return importPath;
  }
  return `./${importPath}`;
}

export function indentBlock(content, spaces) {
  const prefix = " ".repeat(spaces);
  return content
    .split("\n")
    .map((line) => (line.length > 0 ? `${prefix}${line}` : line))
    .join("\n");
}

export function toPosixPath(value) {
  return value.split(path.sep).join(path.posix.sep);
}

export function extractAutogenBlock(content, markers) {
  const { AUTOGEN_START, AUTOGEN_END } = markers;
  const startIndex = content.indexOf(AUTOGEN_START);
  const endIndex = content.indexOf(AUTOGEN_END);
  return content.slice(startIndex, endIndex + AUTOGEN_END.length);
}

export function extractManualBlock(content, markers) {
  const { MANUAL_START, MANUAL_END } = markers;
  const startIndex = content.indexOf(MANUAL_START);
  const endIndex = content.indexOf(MANUAL_END);
  if (startIndex === -1 || endIndex === -1) {
    return null;
  }
  return content.slice(startIndex, endIndex + MANUAL_END.length);
}

export function replaceBlock(content, startMarker, endMarker, nextBlock) {
  const startIndex = content.indexOf(startMarker);
  const endIndex = content.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1) {
    return content;
  }

  const prefix = content.slice(0, startIndex);
  const suffix = content.slice(endIndex + endMarker.length);
  return `${prefix}${nextBlock}${suffix}`;
}

export function mergeToolOwnedContent(currentContent, nextContent, markers) {
  const currentManualBlock = extractManualBlock(currentContent, markers);
  if (!currentManualBlock) {
    return nextContent;
  }

  return replaceBlock(nextContent, markers.MANUAL_START, markers.MANUAL_END, currentManualBlock);
}
