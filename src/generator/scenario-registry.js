import { MODULE_TYPES } from "../target-classification.js";

export function buildScenarioPool(feature) {
  const modulePool = buildModuleScenarioPool(feature);
  if (modulePool.length > 0) {
    return modulePool;
  }

  const pool = [
    {
      scenarioId: "S01",
      scenarioType: "success",
      name: "正常成功流程",
      category: "Happy Path",
      levels: ["unit", "integration", "e2e"],
      fixture: pickFixture(feature, "success"),
      preconditions: buildPreconditions(feature, "success"),
      userActions: buildUserActions(feature, "success"),
      systemResult: buildSystemResult(feature, "success"),
      expectedOutcome: buildExpectedOutcome(feature, "success"),
    },
    {
      scenarioId: "S02",
      scenarioType: "failure",
      name: feature.dependsOnLiff ? "前置條件失敗" : "異常流程處理",
      category: feature.dependsOnLiff ? "Precondition Failure" : "Error Handling",
      levels: ["unit", "integration"],
      fixture: pickFixture(feature, "failure"),
      preconditions: buildPreconditions(feature, "failure"),
      userActions: buildUserActions(feature, "failure"),
      systemResult: buildSystemResult(feature, "failure"),
      expectedOutcome: buildExpectedOutcome(feature, "failure"),
    },
  ];

  if (feature.risk !== "low") {
    pool.push({
      scenarioId: "S03",
      scenarioType: "boundary",
      name: "邊界與 fallback 流程",
      category: "Boundary",
      levels: ["unit", "integration"],
      fixture: pickFixture(feature, "boundary"),
      preconditions: buildPreconditions(feature, "boundary"),
      userActions: buildUserActions(feature, "boundary"),
      systemResult: buildSystemResult(feature, "boundary"),
      expectedOutcome: buildExpectedOutcome(feature, "boundary"),
    });
  }

  if (feature.dependsOnLiff) {
    pool.push({
      scenarioId: "S04",
      scenarioType: "failure",
      name: "LIFF 初始化失敗",
      category: "LIFF Failure",
      levels: ["integration", "e2e"],
      fixture: "initFailed",
      preconditions: ["LIFF initialization fails before the feature is ready."],
      userActions: ["Open the feature entry and wait for initialization."],
      systemResult: ["The feature should surface an error or block unsafe continuation."],
      expectedOutcome: [`${feature.name} surfaces LIFF initialization failure safely.`],
    });
  }

  return pool;
}

const moduleScenarioBuilders = {
  [MODULE_TYPES.SEARCH]: (feature) => [
    createScenario("S01", "success", "搜尋成功", "Happy Path", ["unit"], "loggedOut", feature),
    createScenario("S02", "failure", "搜尋 API 失敗", "API Error", ["unit"], "loggedOut", feature, {
      failureMode: "api_error",
      testData: [{ kind: "search-keyword", values: ["王小明"], source: "literal", note: "Primary search keyword." }],
    }),
    createScenario("S03", "failure", "搜尋無結果", "Empty Result", ["unit"], "loggedOut", feature, {
      failureMode: "empty_result",
      testData: [{ kind: "search-keyword", values: ["不存在的關鍵字123"], source: "literal", note: "No-result keyword." }],
    }),
    createScenario("S04", "boundary", "搜尋空白輸入", "Boundary", ["unit"], "loggedOut", feature, {
      failureMode: "validation_error",
      testData: [{ kind: "search-keyword", values: ["", "   "], source: "literal", note: "Whitespace inputs should not trigger invalid flow." }],
    }),
  ],
  [MODULE_TYPES.FAVORITE_TOGGLE]: (feature) => [
    createScenario("S01", "success", "收藏切換成功", "Happy Path", ["unit"], "loggedOut", feature),
    createScenario("S02", "failure", "收藏切換 API 失敗", "API Error", ["unit"], "loggedOut", feature, {
      failureMode: "api_error",
    }),
    createScenario("S03", "boundary", "收藏狀態衝突", "State Conflict", ["unit"], "loggedOut", feature, {
      failureMode: "state_conflict",
    }),
  ],
  [MODULE_TYPES.CONTACT_PHONE]: buildContactScenarios,
  [MODULE_TYPES.CONTACT_EMAIL]: buildContactScenarios,
  [MODULE_TYPES.CONTACT_LINE]: buildContactScenarios,
  [MODULE_TYPES.NOTIFICATION_MENU]: (feature) => [
    createScenario("S01", "success", "通知選單操作成功", "Happy Path", ["unit"], "loggedOut", feature),
    createScenario("S02", "failure", "通知選單操作 API 失敗", "API Error", ["unit"], "loggedOut", feature, {
      failureMode: "api_error",
    }),
  ],
  [MODULE_TYPES.NOTIFICATION_READ_STATE]: (feature) => [
    createScenario("S01", "success", "通知標記已讀成功", "Happy Path", ["unit"], "loggedOut", feature),
    createScenario("S02", "failure", "通知標記已讀逾時", "Network Timeout", ["unit"], "loggedOut", feature, {
      failureMode: "network_timeout",
    }),
    createScenario("S03", "boundary", "通知列表為空", "Empty Result", ["unit"], "loggedOut", feature, {
      failureMode: "empty_result",
      testData: [{ kind: "notification-state", values: [null, "empty"], source: "derived", note: "No notifications available." }],
    }),
  ],
  [MODULE_TYPES.EMPTY_STATE]: (feature) => [
    createScenario("S01", "success", "空狀態顯示正確", "Happy Path", ["unit"], "loggedOut", feature),
    createScenario("S02", "boundary", "空狀態資料切換", "Boundary", ["unit"], "loggedOut", feature, {
      failureMode: "empty_result",
    }),
  ],
  [MODULE_TYPES.PHONE_VALIDATION]: (feature) => [
    createScenario("S01", "success", "手機格式驗證成功", "Happy Path", ["unit"], "loggedOut", feature, {
      testData: [{ kind: "phone-input", values: ["0912345678"], source: "literal", note: "Valid phone number." }],
    }),
    createScenario("S02", "failure", "手機格式驗證失敗", "Validation Error", ["unit"], "loggedOut", feature, {
      failureMode: "validation_error",
      testData: [{ kind: "phone-input", values: ["09123456", "091234567890", "0212345678", "!@#$%^&*()"], source: "literal", note: "Invalid phone values." }],
    }),
    createScenario("S03", "boundary", "手機欄位空白值", "Boundary", ["unit"], "loggedOut", feature, {
      failureMode: "validation_error",
      testData: [{ kind: "phone-input", values: ["", "   "], source: "literal", note: "Empty or whitespace phone values." }],
    }),
  ],
  [MODULE_TYPES.DUPLICATE_CHECK]: (feature) => [
    createScenario("S01", "success", "重複檢查通過", "Happy Path", ["unit"], "loggedOut", feature),
    createScenario("S02", "failure", "重複資料攔截", "Duplicate Data", ["unit"], "loggedOut", feature, {
      failureMode: "duplicate_data",
      testData: [{ kind: "phone-input", values: ["0912888999"], source: "literal", note: "Previously registered phone." }],
    }),
  ],
  [MODULE_TYPES.VERIFICATION_FLOW]: (feature) => [
    createScenario("S01", "success", "驗證碼驗證成功", "Happy Path", ["unit"], "loggedOut", feature),
    createScenario("S02", "failure", "驗證碼驗證 API 失敗", "API Error", ["unit"], "loggedOut", feature, {
      failureMode: "api_error",
    }),
    createScenario("S03", "failure", "驗證碼驗證逾時", "Network Timeout", ["unit"], "loggedOut", feature, {
      failureMode: "network_timeout",
    }),
  ],
  [MODULE_TYPES.SCAN_PERMISSION]: (feature) => [
    createScenario("S01", "success", "掃描權限可用", "Happy Path", ["unit"], "loggedOut", feature),
    createScenario("S02", "failure", "掃描權限被拒絕", "Permission Denied", ["unit"], "loggedOut", feature, {
      failureMode: "permission_denied",
    }),
  ],
  [MODULE_TYPES.SCAN_QUOTA]: (feature) => [
    createScenario("S01", "success", "掃描次數正常", "Happy Path", ["unit"], "loggedOut", feature),
    createScenario("S02", "failure", "掃描次數已用盡", "Rate Limit", ["unit"], "loggedOut", feature, {
      failureMode: "rate_limit_reached",
    }),
  ],
  [MODULE_TYPES.SCAN_FIELD_MAPPING]: (feature) => [
    createScenario("S01", "success", "OCR 欄位映射成功", "Happy Path", ["unit"], "loggedOut", feature),
    createScenario("S02", "failure", "OCR 映射 API 失敗", "API Error", ["unit"], "loggedOut", feature, {
      failureMode: "api_error",
    }),
    createScenario("S03", "boundary", "OCR 欄位部分缺失", "Boundary", ["unit"], "loggedOut", feature, {
      failureMode: "state_conflict",
    }),
  ],
  [MODULE_TYPES.SETTINGS_FORM]: (feature) => [
    createScenario("S01", "success", "設定表單載入成功", "Happy Path", ["unit"], "loggedOut", feature),
    createScenario("S02", "failure", "設定表單 API 失敗", "API Error", ["unit"], "loggedOut", feature, {
      failureMode: "api_error",
    }),
  ],
  [MODULE_TYPES.SETTINGS_VALIDATION]: (feature) => [
    createScenario("S01", "success", "設定資料驗證成功", "Happy Path", ["unit"], "loggedOut", feature),
    createScenario("S02", "failure", "設定資料驗證失敗", "Validation Error", ["unit"], "loggedOut", feature, {
      failureMode: "validation_error",
      testData: [{ kind: "settings-input", values: ["", "invalid-email", "   "], source: "literal", note: "Invalid settings form values." }],
    }),
    createScenario("S03", "boundary", "設定資料重複或衝突", "Boundary", ["unit"], "loggedOut", feature, {
      failureMode: "duplicate_data",
    }),
  ],
};

function buildModuleScenarioPool(feature) {
  const builder = moduleScenarioBuilders[feature.moduleType ?? null];
  return builder ? builder(feature) : [];
}

function buildContactScenarios(feature) {
  return [
    createScenario("S01", "success", "聯絡操作成功", "Happy Path", ["unit"], "loggedOut", feature),
    createScenario("S02", "failure", "外部應用不可用", "External App Unavailable", ["unit"], "loggedOut", feature, {
      failureMode: "external_app_unavailable",
    }),
  ];
}

function createScenario(scenarioId, scenarioType, name, category, levels, fixture, feature, overrides = {}) {
  return {
    scenarioId,
    scenarioType,
    name,
    category,
    levels,
    fixture,
    preconditions: overrides.preconditions ?? buildPreconditions(feature, scenarioType),
    userActions: overrides.userActions ?? buildUserActions(feature, scenarioType),
    systemResult: overrides.systemResult ?? buildSystemResult(feature, scenarioType),
    expectedOutcome: overrides.expectedOutcome ?? buildExpectedOutcome(feature, scenarioType),
    failureMode: overrides.failureMode ?? null,
    testData: overrides.testData ?? null,
  };
}

function pickFixture(feature, scenarioType) {
  if (scenarioType === "failure") {
    return feature.dependsOnLiff ? "profileFailed" : "loggedOut";
  }
  if (scenarioType === "boundary") {
    return feature.dependsOnLiff ? "tokenExpired" : "loggedOut";
  }
  return feature.dependsOnLiff ? "loggedIn" : "loggedOut";
}

function buildPreconditions(feature, scenarioType) {
  const items = [];
  if (feature.dependsOnLiff) {
    items.push("LIFF context is available.");
  }
  if (scenarioType === "success") {
    items.push("Required user and route state are present.");
  } else if (scenarioType === "failure") {
    items.push("A required dependency or user state is missing or rejected.");
  } else {
    items.push("Feature receives edge-case input or partial state.");
  }
  return items;
}

function buildUserActions(feature, scenarioType) {
  if (scenarioType === "success") {
    return [`Enter ${feature.name} through its primary entry and execute the normal flow.`];
  }
  if (scenarioType === "failure") {
    return [`Trigger ${feature.name} while a dependency fails or a required state is unavailable.`];
  }
  return [`Execute ${feature.name} with boundary input or fallback state.`];
}

function buildSystemResult(feature, scenarioType) {
  if (scenarioType === "success") {
    return [`${feature.name} reaches the expected success state.`];
  }
  if (scenarioType === "failure") {
    return [`${feature.name} surfaces a safe error state or blocks continuation.`];
  }
  return [`${feature.name} remains stable and resolves to a safe fallback.`];
}

function buildExpectedOutcome(feature, scenarioType) {
  if (scenarioType === "failure") {
    return [`${feature.name} handles an error state.`];
  }
  if (scenarioType === "boundary") {
    return [`${feature.name} handles an edge case safely.`];
  }
  return [`${feature.name} completes the happy path.`];
}
