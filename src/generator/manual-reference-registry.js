import { MODULE_TYPES, TARGET_TYPES } from "../target-classification.js";
import { inferFailureMode } from "./generation-mode-policy.js";

export function buildManualReferenceIds(feature, scenario) {
  const refs = new Set();
  const sourceFile = String(feature.files?.[0] ?? "").toLowerCase();
  const featureName = String(feature.name ?? "").toLowerCase();
  const failureMode = scenario.failureMode ?? inferFailureMode(feature, scenario);
  const ordinal = deriveManualOrdinal(scenario.scenarioId);

  const handlers = [
    { when: () => feature.moduleType === MODULE_TYPES.SEARCH, run: () => addCardholderSearchReferences(refs, scenario, failureMode, ordinal) },
    { when: () => feature.moduleType === MODULE_TYPES.TAB_SWITCH, run: () => addCardholderTabReferences(refs, scenario, failureMode, ordinal) },
    { when: () => feature.moduleType === MODULE_TYPES.COUNT_DISPLAY || feature.moduleType === MODULE_TYPES.EMPTY_STATE, run: () => addCardholderCountReferences(refs, scenario, failureMode, ordinal, feature.moduleType) },
    { when: () => feature.moduleType === MODULE_TYPES.FAVORITE_TOGGLE, run: () => addCardholderFavoriteReferences(refs, scenario, failureMode, ordinal) },
    { when: () => feature.moduleType === MODULE_TYPES.CONTACT_PHONE || feature.moduleType === MODULE_TYPES.CONTACT_EMAIL || feature.moduleType === MODULE_TYPES.CONTACT_LINE, run: () => addCardholderContactReferences(refs, feature.moduleType, scenario, failureMode) },
    { when: () => feature.moduleType === MODULE_TYPES.NOTIFICATION_MENU || feature.moduleType === MODULE_TYPES.NOTIFICATION_READ_STATE, run: () => addNotificationReferences(refs, feature, scenario, failureMode, ordinal) },
    { when: () => feature.moduleType === MODULE_TYPES.PHONE_VALIDATION, run: () => addRegistrationReferences(refs, feature, scenario, failureMode, ordinal) },
    { when: () => feature.moduleType === MODULE_TYPES.VERIFICATION_FLOW, run: () => addRegistrationReferences(refs, feature, scenario, failureMode, ordinal) },
    { when: () => feature.moduleType === MODULE_TYPES.DUPLICATE_CHECK, run: () => { refs.add("TC-SCAN-024"); refs.add("TC-SCAN-025"); } },
    { when: () => feature.moduleType === MODULE_TYPES.SCAN_PERMISSION, run: () => refs.add(`TC-SCAN-${ordinal}`) },
    { when: () => feature.moduleType === MODULE_TYPES.SCAN_QUOTA, run: () => { refs.add("TC-SCAN-008"); refs.add("TC-SCAN-009"); } },
    { when: () => feature.moduleType === MODULE_TYPES.SCAN_FIELD_MAPPING, run: () => { refs.add("TC-SCAN-019"); refs.add("TC-SCAN-021"); } },
    { when: () => feature.moduleType === MODULE_TYPES.SETTINGS_FORM || feature.moduleType === MODULE_TYPES.SETTINGS_VALIDATION, run: () => addSettingsReferences(refs, feature, scenario, failureMode, ordinal) },
    { when: () => feature.moduleType === MODULE_TYPES.AUTH_BACKEND || feature.targetType === TARGET_TYPES.AUTH_BACKEND_FLOW_SERVICE, run: () => addRegistrationReferences(refs, feature, scenario, failureMode, ordinal) },
    { when: () => feature.moduleType === MODULE_TYPES.ROUTE_GUARD || feature.targetType === TARGET_TYPES.ROUTE_GUARD, run: () => addRouteGuardReferences(refs, feature, scenario, failureMode) },
    { when: () => feature.moduleType === MODULE_TYPES.LIFF_CORE || feature.targetType === TARGET_TYPES.LIFF_ADAPTER_SERVICE, run: () => addLiffCoreReferences(refs, feature, scenario, failureMode) },
    { when: () => feature.targetType === TARGET_TYPES.AUTH_ENTRY_FLOW || feature.targetType === TARGET_TYPES.AUTH_ONBOARDING_PAGE, run: () => addRegistrationReferences(refs, feature, scenario, failureMode, ordinal) },
    { when: () => feature.targetType === TARGET_TYPES.CARD_SHARE_FLOW_PAGE, run: () => addMyCardReferences(refs, feature, scenario, failureMode, "card-share") },
    { when: () => feature.targetType === TARGET_TYPES.SHARE_WORKFLOW_PAGE, run: () => addMyCardReferences(refs, feature, scenario, failureMode, "share-workflow") },
    { when: () => feature.targetType === TARGET_TYPES.CARD_MANAGE_PAGE_FLOW, run: () => addMyCardReferences(refs, feature, scenario, failureMode, "card-manage") },
    { when: () => feature.targetType === TARGET_TYPES.CARD_DETAIL_FLOW_PAGE, run: () => addMyCardReferences(refs, feature, scenario, failureMode, "card-detail") },
    { when: () => feature.targetType === TARGET_TYPES.LINE_SHARE_SERVICE || sourceFile.includes("/features/line-flex-message/"), run: () => addMyCardReferences(refs, feature, scenario, failureMode, "line-share-service") },
    { when: () => sourceFile.includes("/features/cardholder/"), run: () => refs.add(`TC-04-DETAIL-${ordinal}`) },
    { when: () => sourceFile.includes("/features/cardmanage/"), run: () => addMyCardReferences(refs, feature, scenario, failureMode, "card-manage") },
    { when: () => sourceFile.includes("/features/mycash/"), run: () => refs.add("TC-MC-001") },
  ];

  for (const handler of handlers) {
    if (handler.when()) {
      handler.run();
      break;
    }
  }

  if (failureMode === "permission_denied") {
    refs.add("TC-SCAN-005");
    refs.add("TC-SCAN-007");
  }
  if (failureMode === "network_timeout") {
    refs.add("TC-SCAN-015");
  }
  if (failureMode === "duplicate_data") {
    refs.add("TC-SCAN-024");
  }
  if (failureMode === "validation_error" && (sourceFile.includes("/features/auth/") || featureName.includes("verification"))) {
    refs.add("TC-REG1-007");
    refs.add("TC-REG1-008");
    refs.add("TC-REG1-009");
  }

  return [...refs];
}

function addCardholderSearchReferences(refs, scenario, failureMode, ordinal) {
  if (failureMode === "empty_result") {
    refs.add("TC-04-SEARCH-005");
    refs.add("TC-04-INTEGRATION-001");
    return;
  }
  if (failureMode === "network_timeout") {
    refs.add("TC-04-SEARCH-012");
    return;
  }
  if (failureMode === "validation_error") {
    refs.add("TC-04-SEARCH-013");
    refs.add("TC-04-SEARCH-014");
    return;
  }
  if (scenario.scenarioType === "boundary") {
    refs.add("TC-04-SEARCH-009");
    refs.add("TC-04-SEARCH-010");
    refs.add("TC-04-SEARCH-013");
    return;
  }
  refs.add(`TC-04-SEARCH-${ordinal}`);
}

function addCardholderTabReferences(refs, scenario, failureMode, ordinal) {
  if (failureMode === "api_error") {
    refs.add("TC-04-TAB-008");
    return;
  }
  if (failureMode === "duplicate_data") {
    refs.add("TC-04-TAB-007");
    return;
  }
  refs.add(`TC-04-TAB-${ordinal}`);
}

function addCardholderCountReferences(refs, scenario, failureMode, ordinal, moduleType) {
  if (failureMode === "empty_result" || moduleType === MODULE_TYPES.EMPTY_STATE) {
    refs.add("TC-04-COUNT-003");
    refs.add("TC-04-LIST-004");
    return;
  }
  if (scenario.scenarioType === "boundary") {
    refs.add("TC-04-COUNT-002");
    refs.add("TC-04-COUNT-004");
    return;
  }
  refs.add(`TC-04-COUNT-${ordinal}`);
}

function addCardholderFavoriteReferences(refs, scenario, failureMode, ordinal) {
  if (failureMode === "api_error") {
    refs.add("TC-04-FAV-005");
    return;
  }
  if (failureMode === "duplicate_data") {
    refs.add("TC-04-FAV-004");
    return;
  }
  refs.add(`TC-04-FAV-${ordinal}`);
}

function addCardholderContactReferences(refs, moduleType, scenario, failureMode) {
  if (moduleType === MODULE_TYPES.CONTACT_LINE) {
    refs.add("TC-04-CONTACT-001");
    if (failureMode === "permission_denied" || failureMode === "external_app_unavailable") {
      refs.add("TC-04-CONTACT-008");
    } else if (scenario.scenarioType !== "success") {
      refs.add("TC-04-CONTACT-002");
    }
    return;
  }
  if (moduleType === MODULE_TYPES.CONTACT_PHONE) {
    refs.add("TC-04-CONTACT-003");
    if (failureMode === "validation_error") {
      refs.add("TC-04-CONTACT-009");
    } else if (scenario.scenarioType !== "success") {
      refs.add("TC-04-CONTACT-004");
    }
    return;
  }
  refs.add("TC-04-CONTACT-005");
  if (failureMode === "validation_error") {
    refs.add("TC-04-CONTACT-007");
  } else if (scenario.scenarioType !== "success") {
    refs.add("TC-04-CONTACT-006");
  }
}

function addNotificationReferences(refs, feature, scenario, failureMode, ordinal) {
  const sourceFile = String(feature.files?.[0] ?? "").toLowerCase();
  const featureName = String(feature.name ?? "").toLowerCase();
  const isBell = sourceFile.includes("notificationcenter") || featureName.includes("notification");
  const isPending = sourceFile.includes("pending") || featureName.includes("pending");
  const isRecommend = sourceFile.includes("recommend") || featureName.includes("recommend");

  if (isPending) {
    refs.add(`TC-06-PENDING-${ordinal}`);
  } else if (isRecommend) {
    refs.add(`TC-06-RECOMMEND-${ordinal}`);
  } else if (isBell) {
    if (feature.moduleType === MODULE_TYPES.NOTIFICATION_MENU) {
      refs.add("TC-06-BELL-001");
      if (failureMode === "network_timeout" || failureMode === "api_error") {
        refs.add("TC-06-BELL-006");
      }
    } else {
      refs.add("TC-06-BELL-002");
      if (failureMode === "network_timeout" || failureMode === "api_error") {
        refs.add("TC-06-BELL-007");
        refs.add("TC-06-BELL-021");
      }
      if (scenario.scenarioType === "boundary") {
        refs.add("TC-06-BELL-005");
        refs.add("TC-06-BELL-040");
        refs.add("TC-06-BELL-041");
      }
    }
    return;
  } else {
    refs.add(`TC-06-APPLY-${ordinal}`);
  }
}

function addRegistrationReferences(refs, feature, scenario, failureMode, ordinal) {
  const sourceFile = String(feature.files?.[0] ?? "").toLowerCase();

  if (feature.moduleType === MODULE_TYPES.PHONE_VALIDATION) {
    refs.add("TC-REG1-001");
    if (failureMode === "validation_error") {
      refs.add("TC-REG1-007");
      refs.add("TC-REG1-008");
      refs.add("TC-REG1-009");
    }
    if (scenario.scenarioType === "boundary") {
      refs.add("TC-REG1-010");
    }
    return;
  }

  if (feature.moduleType === MODULE_TYPES.VERIFICATION_FLOW || sourceFile.includes("verificationcode")) {
    refs.add("TC-REG2-001");
    if (failureMode === "network_timeout") {
      refs.add("TC-REG2-006");
    }
    if (failureMode === "validation_error") {
      refs.add("TC-REG2-004");
    }
    if (scenario.scenarioType === "boundary") {
      refs.add("TC-REG2-005");
    }
    return;
  }

  if (feature.targetType === TARGET_TYPES.AUTH_ONBOARDING_PAGE || sourceFile.includes("createfirstcard") || sourceFile.includes("registersuccess")) {
    refs.add("TC-REG3-001");
    if (scenario.scenarioType === "boundary") {
      refs.add("TC-REG3-003");
    }
    return;
  }

  if (feature.moduleType === MODULE_TYPES.AUTH_BACKEND || feature.targetType === TARGET_TYPES.AUTH_BACKEND_FLOW_SERVICE) {
    refs.add("TC-REG2-001");
    if (failureMode === "api_error") {
      refs.add("TC-REG2-006");
    }
    if (scenario.scenarioType === "boundary") {
      refs.add("TC-REG2-005");
    }
    return;
  }

  refs.add(`TC-REG1-${ordinal}`);
}

function addRouteGuardReferences(refs, feature, scenario, failureMode) {
  const featureName = String(feature.name ?? "").toLowerCase();

  if (featureName.includes("guest")) {
    refs.add("TC-REG3-007");
    if (failureMode === "auth_missing") {
      refs.add("TC-REG3-008");
    }
    return;
  }

  refs.add("TC-REG3-007");
  if (failureMode === "auth_missing") {
    refs.add("TC-REG3-001");
    refs.add("TC-REG3-004");
    return;
  }
  if (scenario.scenarioType === "boundary") {
    refs.add("TC-REG3-008");
  }
}

function addLiffCoreReferences(refs, feature, scenario, failureMode) {
  refs.add("TC-REG2-001");
  refs.add("TC-REG3-001");

  if (failureMode === "liff_init_failed") {
    refs.add("TC-REG3-006");
    return;
  }
  if (failureMode === "liff_profile_failed") {
    refs.add("TC-REG1-014");
    refs.add("TC-REG2-005");
    return;
  }
  if (failureMode === "state_conflict" || scenario.scenarioType === "boundary") {
    refs.add("TC-REG2-010");
    refs.add("TC-REG3-009");
  }
}

function addMyCardReferences(refs, feature, scenario, failureMode, family) {
  if (family === "line-share-service") {
    refs.add("TC-MC-101");
    if (failureMode === "external_app_unavailable" || failureMode === "network_timeout") {
      refs.add("TC-MC-106");
    }
    if (scenario.scenarioType === "boundary") {
      refs.add("TC-MC-105");
    }
    return;
  }

  if (family === "card-share") {
    refs.add("TC-MC-601");
    refs.add("TC-MC-603");
    if (failureMode === "api_error") {
      refs.add("TC-MC-607");
    }
    if (scenario.scenarioType === "boundary") {
      refs.add("TC-MC-605");
      refs.add("TC-MC-606");
    }
    return;
  }

  if (family === "share-workflow") {
    refs.add("TC-MC-701");
    refs.add("TC-MC-703");
    if (failureMode === "api_error" || failureMode === "network_timeout") {
      refs.add("TC-MC-705");
    }
    if (scenario.scenarioType === "boundary") {
      refs.add("TC-MC-704");
    }
    return;
  }

  if (family === "card-detail") {
    refs.add("TC-MC-401");
    refs.add("TC-MC-403");
    if (failureMode === "api_error") {
      refs.add("TC-MC-404");
    }
    return;
  }

  refs.add("TC-MC-001");
  refs.add("TC-MC-401");
  if (failureMode === "api_error") {
    refs.add("TC-MC-506");
  }
  if (scenario.scenarioType === "boundary") {
    refs.add("TC-MC-503");
    refs.add("TC-MC-505");
  }
}

function deriveManualOrdinal(scenarioId) {
  const digits = String(scenarioId ?? "S1").replace(/\D/g, "");
  return String(Number(digits || "1")).padStart(3, "0");
}

function selectSettingsManualReference(feature, scenario, failureMode, ordinal) {
  const featureName = String(feature.name ?? "").toLowerCase();

  if (featureName.includes("member settings")) {
    if (failureMode === "validation_error" || scenario.scenarioType === "boundary") {
      return `TC-SET-GREETING-00${Math.min(Number(ordinal) + 2, 9)}`;
    }
    return `TC-SET-OVERVIEW-${ordinal}`;
  }

  if (failureMode === "api_error") {
    return "TC-SET-OVERVIEW-003";
  }

  return `TC-SET-PUB-${ordinal}`;
}

function addSettingsReferences(refs, feature, scenario, failureMode, ordinal) {
  refs.add(selectSettingsManualReference(feature, scenario, failureMode, ordinal));

  if (failureMode === "api_error") {
    refs.add("TC-SET-AUTOACC-006");
    refs.add("TC-SET-AUTOSEND-005");
  }
  if (failureMode === "network_timeout") {
    refs.add("TC-SET-AUTOACC-008");
    refs.add("TC-SET-AUTOSEND-006");
  }
  if (scenario.scenarioType === "boundary" && String(feature.name ?? "").toLowerCase().includes("member settings")) {
    refs.add("TC-SET-GREETING-003");
    refs.add("TC-SET-GREETING-006");
    refs.add("TC-SET-GREETING-015");
    refs.add("TC-SET-GREETING-016");
  }
}
