import { GENERATION_MODES, PRIORITIES } from "./shared.js";
import { MODULE_TYPES, TARGET_TYPES } from "../target-classification.js";

export const KNOWN_PENDING_MANUAL_REFERENCES = new Set([
  "TC-04-SEARCH-013",
  "TC-04-SEARCH-014",
  "TC-04-TAB-009",
  "TC-06-BELL-021",
  "TC-06-BELL-040",
  "TC-06-BELL-041",
  "TC-SET-PUB-012",
  "TC-SET-PUB-013",
  "TC-SET-AUTOACC-009",
  "TC-SET-AUTOACC-010",
  "TC-SET-AUTOACC-011",
  "TC-SET-AUTOACC-012",
  "TC-SET-AUTOSEND-008",
  "TC-SET-AUTOSEND-009",
  "TC-SET-AUTOSEND-011",
  "TC-SET-GREETING-015",
  "TC-SET-GREETING-016",
]);

export function assignPriority(feature, scenario, level) {
  const targetType = feature.targetType ?? TARGET_TYPES.GENERIC;
  if (
    feature.risk === "high" ||
    scenario.scenarioId === "S04" ||
    targetType === TARGET_TYPES.LIFF_ADAPTER_SERVICE ||
    targetType === TARGET_TYPES.LINE_SHARE_SERVICE ||
    targetType === TARGET_TYPES.AUTH_ENTRY_FLOW ||
    targetType === TARGET_TYPES.ROUTE_GUARD ||
    targetType === TARGET_TYPES.AUTH_BACKEND_FLOW_SERVICE
  ) {
    return PRIORITIES.P0;
  }

  if (
    feature.risk === "medium" ||
    level === "integration" ||
    targetType === TARGET_TYPES.AUTH_STATE_HOOK ||
    targetType === TARGET_TYPES.AUTH_COMPOSITE_HOOK ||
    targetType === TARGET_TYPES.CARD_SHARE_FLOW_PAGE ||
    targetType === TARGET_TYPES.SHARE_WORKFLOW_PAGE
  ) {
    return PRIORITIES.P1;
  }

  return PRIORITIES.P2;
}

export function assignGenerationMode(feature, scenario, level, priority, failureMode, manualReferenceIds) {
  if (shouldBlockPendingProductRule(feature, scenario, priority, failureMode, manualReferenceIds)) {
    return GENERATION_MODES.BLOCKED_PENDING_PRODUCT_RULE;
  }

  if (priority === PRIORITIES.P0) {
    return GENERATION_MODES.AUTO_REQUIRED;
  }

  if (
    priority === PRIORITIES.P1 ||
    level === "integration" ||
    scenario.scenarioCategory === "LIFF Failure"
  ) {
    return GENERATION_MODES.AUTO_REQUIRED;
  }

  if (feature.targetType === TARGET_TYPES.GENERIC && feature.risk === "low" && scenario.scenarioType === "boundary") {
    return GENERATION_MODES.AUTO_OPTIONAL;
  }

  return GENERATION_MODES.AUTO_OPTIONAL;
}

export function inferFailureMode(feature, scenario) {
  if (scenario.failureMode) {
    return scenario.failureMode;
  }
  if (scenario.scenarioType === "success") {
    return null;
  }

  const sourceFile = String(feature.files?.[0] ?? "").toLowerCase();
  const featureName = String(feature.name ?? "").toLowerCase();

  if (scenario.scenarioId === "S04" || scenario.fixture === "initFailed" || scenario.category === "LIFF Failure") {
    return "liff_init_failed";
  }
  if (feature.dependsOnLiff && scenario.fixture === "profileFailed") {
    return "liff_profile_failed";
  }
  if (sourceFile.includes("phone") || sourceFile.includes("verification") || featureName.includes("phone")) {
    return "validation_error";
  }
  if (sourceFile.includes("duplicate") || featureName.includes("duplicate")) {
    return "duplicate_data";
  }
  if (sourceFile.includes("search") || featureName.includes("search")) {
    return scenario.scenarioType === "boundary" ? "empty_result" : "api_error";
  }
  if (sourceFile.includes("scan") || featureName.includes("scan")) {
    return scenario.scenarioType === "boundary" ? "rate_limit_reached" : "external_app_unavailable";
  }
  if (sourceFile.includes("notification") || featureName.includes("notification")) {
    return scenario.scenarioType === "boundary" ? "empty_result" : "api_error";
  }
  if (feature.targetType === TARGET_TYPES.ROUTE_GUARD || feature.targetType === TARGET_TYPES.AUTH_ENTRY_FLOW) {
    return "auth_missing";
  }
  if (scenario.scenarioType === "boundary") {
    return "state_conflict";
  }
  return "api_error";
}

export function buildScenarioTestData(feature, scenario) {
  if (Array.isArray(scenario.testData) && scenario.testData.length > 0) {
    if ((feature.risk === "low" || scenario.priority === PRIORITIES.P2) && scenario.scenarioType !== "success") {
      return scenario.testData.slice(0, 1);
    }
    return scenario.testData;
  }
  const sourceFile = String(feature.files?.[0] ?? "").toLowerCase();
  const featureName = String(feature.name ?? "").toLowerCase();
  const data = [];

  if (sourceFile.includes("phone") || sourceFile.includes("verification") || featureName.includes("phone")) {
    data.push({
      kind: "phone-input",
      values: scenario.scenarioType === "success"
        ? ["0912345678"]
        : ["", "   ", "09123456", "091234567890", "0212345678", "!@#$%^&*()"],
      source: "literal",
      note: "Representative phone validation values.",
    });
  }

  if (sourceFile.includes("search") || featureName.includes("search")) {
    data.push({
      kind: "search-keyword",
      values: scenario.scenarioType === "success"
        ? ["王小明"]
        : ["", "   ", "王", "!@#$%^&*()", "不存在的關鍵字123"],
      source: "literal",
      note: "Search keyword cases aligned to manual QA patterns.",
    });
  }

  if (sourceFile.includes("notification") || featureName.includes("notification")) {
    data.push({
      kind: "notification-state",
      values: scenario.scenarioType === "success" ? ["unread"] : [null, "empty", "expired"],
      source: "derived",
      note: "Notification center visible state variants.",
    });
  }

  if (feature.dependsOnLiff) {
    data.push({
      kind: "liff-fixture",
      values: [scenario.fixture],
      source: "fixture",
      note: "Fixture selected for LIFF state simulation.",
    });
  }

  return data;
}

function shouldBlockPendingProductRule(feature, scenario, priority, failureMode, manualReferenceIds) {
  if ((manualReferenceIds ?? []).some((referenceId) => KNOWN_PENDING_MANUAL_REFERENCES.has(referenceId))) {
    return true;
  }

  if (feature.moduleType === MODULE_TYPES.SEARCH && scenario.scenarioType === "boundary") {
    return true;
  }

  if (feature.moduleType === MODULE_TYPES.SETTINGS_VALIDATION && scenario.scenarioType === "boundary") {
    return true;
  }

  if (
    (feature.moduleType === MODULE_TYPES.NOTIFICATION_MENU || feature.moduleType === MODULE_TYPES.NOTIFICATION_READ_STATE) &&
    (scenario.scenarioType === "boundary" || failureMode === "network_timeout")
  ) {
    return true;
  }

  return priority !== PRIORITIES.P0 &&
    scenario.scenarioType === "boundary" &&
    failureMode === "state_conflict" &&
    String(feature.name ?? "").toLowerCase().includes("wrapper");
}
