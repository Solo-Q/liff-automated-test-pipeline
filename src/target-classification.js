import path from "node:path";

export const TARGET_TYPES = {
  GENERIC: "generic",
  LIFF_ADAPTER_SERVICE: "liff-adapter-service",
  LINE_SHARE_SERVICE: "line-share-service",
  MYCASH_PAGE_FLOW: "mycash-page-flow",
  CARD_MANAGE_PAGE_FLOW: "card-manage-page-flow",
  CARD_DETAIL_FLOW_PAGE: "card-detail-flow-page",
  CARDHOLDER_PAGE_FLOW: "cardholder-page-flow",
  AUTH_ONBOARDING_PAGE: "auth-onboarding-page",
  AUTH_ENTRY_FLOW: "auth-entry-flow",
  AUTH_COMPOSITE_HOOK: "auth-composite-hook",
  AUTH_STATE_HOOK: "auth-state-hook",
  AUTH_BACKEND_FLOW_SERVICE: "auth-backend-flow-service",
  CARD_SHARE_FLOW_PAGE: "card-share-flow-page",
  SHARE_WORKFLOW_PAGE: "share-workflow-page",
  LIFF_HOOK: "liff-hook",
  ROUTE_GUARD: "route-guard",
};

export const MODULE_TYPES = {
  GENERIC: "generic",
  LIFF_CORE: "liff-core",
  LIFF_STATE: "liff-state",
  LINE_SHARE: "line-share",
  AUTH_ENTRY: "auth-entry",
  AUTH_STATE: "auth-state",
  AUTH_BACKEND: "auth-backend",
  AUTH_ONBOARDING: "auth-onboarding",
  ROUTE_GUARD: "route-guard",
  PAGE_FLOW: "page-flow",
  CARD_SHARE: "card-share",
  SHARE_WORKFLOW: "share-workflow",
  SEARCH: "search",
  TAB_SWITCH: "tab-switch",
  PAGINATION: "pagination",
  EMPTY_STATE: "empty-state",
  COUNT_DISPLAY: "count-display",
  FAVORITE_TOGGLE: "favorite-toggle",
  CONTACT_ACTION: "contact-action",
  CONTACT_LINE: "contact-line",
  CONTACT_PHONE: "contact-phone",
  CONTACT_EMAIL: "contact-email",
  NOTIFICATION_CENTER: "notification-center",
  NOTIFICATION_READ_STATE: "notification-read-state",
  NOTIFICATION_MENU: "notification-menu",
  DUPLICATE_CHECK: "duplicate-check",
  SCAN_PERMISSION: "scan-permission",
  SCAN_QUOTA: "scan-quota",
  SCAN_FIELD_MAPPING: "scan-field-mapping",
  SETTINGS_FORM: "settings-form",
  SETTINGS_VALIDATION: "settings-validation",
  PHONE_VALIDATION: "phone-validation",
  VERIFICATION_FLOW: "verification-flow",
};

export function classifySourceTarget(relativePath) {
  const normalizedPath = String(relativePath ?? "").toLowerCase();
  const baseName = path.basename(normalizedPath);

  if (/(liff).*(service|adapter|client|sdk)/.test(baseName) ||
    (normalizedPath.includes("/services/") && normalizedPath.includes("liff"))) {
    return TARGET_TYPES.LIFF_ADAPTER_SERVICE;
  }

  if (/(line).*(service|share)/.test(baseName) ||
    (normalizedPath.includes("/services/") && normalizedPath.includes("line"))) {
    return TARGET_TYPES.LINE_SHARE_SERVICE;
  }

  if (normalizedPath.includes("/routes/guards/") || /guard\.(js|jsx|ts|tsx|mjs|cjs)$/.test(baseName)) {
    return TARGET_TYPES.ROUTE_GUARD;
  }

  if (normalizedPath.includes("/hooks/") && normalizedPath.includes("liff")) {
    return TARGET_TYPES.LIFF_HOOK;
  }

  if (normalizedPath.includes("/hooks/") && /useauth\.(js|jsx|ts|tsx|mjs|cjs)$/.test(baseName)) {
    return TARGET_TYPES.AUTH_STATE_HOOK;
  }

  if (normalizedPath.includes("/features/auth/hooks/") &&
    /use(authentication|phoneverification|verificationcode)\.(js|jsx|ts|tsx|mjs|cjs)$/.test(baseName)) {
    return TARGET_TYPES.AUTH_COMPOSITE_HOOK;
  }

  if (normalizedPath.includes("/features/auth/services/") &&
    /(authflow|authentication|backendauth|loginwithscopeid)/.test(baseName)) {
    return TARGET_TYPES.AUTH_BACKEND_FLOW_SERVICE;
  }

  if (normalizedPath.includes("/pages/") && /cardsharepage\.(js|jsx|ts|tsx|mjs|cjs)$/.test(baseName)) {
    return TARGET_TYPES.CARD_SHARE_FLOW_PAGE;
  }

  if (normalizedPath.includes("/features/mycash/pages/")) {
    return TARGET_TYPES.MYCASH_PAGE_FLOW;
  }

  if (
    normalizedPath.includes("/features/cardmanage/pages/") &&
    /(cardmanagepage|cardmanageshell|cardworkspace|homepage)\.(js|jsx|ts|tsx|mjs|cjs)$/.test(baseName)
  ) {
    return TARGET_TYPES.CARD_MANAGE_PAGE_FLOW;
  }

  if (
    normalizedPath.includes("/features/cardmanage/pages/") &&
    /carddetailpage\.(js|jsx|ts|tsx|mjs|cjs)$/.test(baseName)
  ) {
    return TARGET_TYPES.CARD_DETAIL_FLOW_PAGE;
  }

  if (normalizedPath.includes("/features/cardholder/pages/")) {
    return TARGET_TYPES.CARDHOLDER_PAGE_FLOW;
  }

  if (
    normalizedPath.includes("/features/auth/pages/") &&
    /(createfirstcardpage|registersuccesspage)\.(js|jsx|ts|tsx|mjs|cjs)$/.test(baseName)
  ) {
    return TARGET_TYPES.AUTH_ONBOARDING_PAGE;
  }

  if (normalizedPath.includes("/pages/") &&
    /(shareactionpage|sharecardpage)\.(js|jsx|ts|tsx|mjs|cjs)$/.test(baseName)) {
    return TARGET_TYPES.SHARE_WORKFLOW_PAGE;
  }

  if ((normalizedPath.includes("/features/auth/pages/") || normalizedPath.includes("/features/auth/routes/") || normalizedPath.includes("/auth/pages/") || normalizedPath.includes("/auth/routes/")) &&
    /(login|auth|signin|welcome|verification)/.test(baseName)) {
    return TARGET_TYPES.AUTH_ENTRY_FLOW;
  }

  return TARGET_TYPES.GENERIC;
}

export function classifyFeatureModule(feature) {
  const sourceFile = String(feature.files?.[0] ?? "").toLowerCase();
  const normalizedName = String(feature.name ?? "").toLowerCase();
  const targetType = feature.targetType ?? classifyFeatureTarget(feature);

  if (targetType === TARGET_TYPES.LIFF_ADAPTER_SERVICE) {
    return MODULE_TYPES.LIFF_CORE;
  }
  if (targetType === TARGET_TYPES.LIFF_HOOK) {
    return MODULE_TYPES.LIFF_STATE;
  }
  if (targetType === TARGET_TYPES.LINE_SHARE_SERVICE) {
    return MODULE_TYPES.LINE_SHARE;
  }
  if (targetType === TARGET_TYPES.AUTH_ENTRY_FLOW) {
    return MODULE_TYPES.AUTH_ENTRY;
  }
  if (targetType === TARGET_TYPES.AUTH_STATE_HOOK || targetType === TARGET_TYPES.AUTH_COMPOSITE_HOOK) {
    return sourceFile.includes("phone") || normalizedName.includes("phone")
      ? MODULE_TYPES.PHONE_VALIDATION
      : MODULE_TYPES.AUTH_STATE;
  }
  if (targetType === TARGET_TYPES.AUTH_BACKEND_FLOW_SERVICE) {
    return MODULE_TYPES.AUTH_BACKEND;
  }
  if (targetType === TARGET_TYPES.AUTH_ONBOARDING_PAGE) {
    return MODULE_TYPES.AUTH_ONBOARDING;
  }
  if (targetType === TARGET_TYPES.ROUTE_GUARD) {
    return MODULE_TYPES.ROUTE_GUARD;
  }
  if (targetType === TARGET_TYPES.CARD_SHARE_FLOW_PAGE) {
    return MODULE_TYPES.CARD_SHARE;
  }
  if (targetType === TARGET_TYPES.SHARE_WORKFLOW_PAGE) {
    return MODULE_TYPES.SHARE_WORKFLOW;
  }

  if (sourceFile.includes("search") || normalizedName.includes("search")) {
    return MODULE_TYPES.SEARCH;
  }
  if (sourceFile.includes("favorite") || normalizedName.includes("favorite")) {
    return MODULE_TYPES.FAVORITE_TOGGLE;
  }
  if (sourceFile.includes("contact") || normalizedName.includes("contact")) {
    return MODULE_TYPES.CONTACT_ACTION;
  }
  if (sourceFile.includes("notification") || normalizedName.includes("notification")) {
    return MODULE_TYPES.NOTIFICATION_CENTER;
  }
  if (sourceFile.includes("setting") || normalizedName.includes("setting")) {
    return MODULE_TYPES.SETTINGS_VALIDATION;
  }
  if (
    sourceFile.includes("phone") ||
    sourceFile.includes("verification") ||
    normalizedName.includes("phone") ||
    normalizedName.includes("verification")
  ) {
    return sourceFile.includes("page") ? MODULE_TYPES.VERIFICATION_FLOW : MODULE_TYPES.PHONE_VALIDATION;
  }
  if (sourceFile.includes("/pages/") || sourceFile.includes("/routes/")) {
    return MODULE_TYPES.PAGE_FLOW;
  }

  return MODULE_TYPES.GENERIC;
}

export function inferDecompositionSource(feature) {
  const sourceFile = String(feature.files?.[0] ?? "").toLowerCase();
  const extractionSource = Array.isArray(feature.extractionSource) ? feature.extractionSource : [];

  if (extractionSource.includes("hook") || sourceFile.includes("/hooks/")) {
    return "hook";
  }
  if (sourceFile.includes("/services/")) {
    return "service";
  }
  if (sourceFile.includes("/pages/") || sourceFile.includes("/routes/")) {
    return "page";
  }
  return "qa-module-rule";
}

export function classifyFeatureTarget(feature) {
  const sourceFile = feature.files?.[0] ?? "";
  const normalizedPath = sourceFile.toLowerCase();
  const normalizedName = String(feature.name ?? "").toLowerCase();
  const extractionSource = Array.isArray(feature.extractionSource) ? feature.extractionSource : [];

  const sourceTarget = classifySourceTarget(sourceFile);
  if (sourceTarget !== TARGET_TYPES.GENERIC) {
    if (sourceTarget === TARGET_TYPES.LINE_SHARE_SERVICE && !feature.dependsOnLiff) {
      return TARGET_TYPES.GENERIC;
    }
    return sourceTarget;
  }

  if (feature.dependsOnLiff && extractionSource.includes("hook") && normalizedPath.includes("/hooks/")) {
    return TARGET_TYPES.LIFF_HOOK;
  }

  if (
    extractionSource.includes("hook") &&
    normalizedPath.includes("/hooks/") &&
    normalizedName === "use auth"
  ) {
    return TARGET_TYPES.AUTH_STATE_HOOK;
  }

  if (
    extractionSource.includes("hook") &&
    normalizedPath.includes("/features/auth/hooks/") &&
    (normalizedName.includes("authentication") || normalizedName.includes("verification"))
  ) {
    return TARGET_TYPES.AUTH_COMPOSITE_HOOK;
  }

  if (
    !extractionSource.includes("hook") &&
    normalizedPath.includes("/pages/") &&
    normalizedName === "card share page"
  ) {
    return TARGET_TYPES.CARD_SHARE_FLOW_PAGE;
  }

  if (
    !extractionSource.includes("hook") &&
    normalizedPath.includes("/features/mycash/pages/")
  ) {
    return TARGET_TYPES.MYCASH_PAGE_FLOW;
  }

  if (
    !extractionSource.includes("hook") &&
    normalizedPath.includes("/features/cardmanage/pages/") &&
    (normalizedName.includes("manage") || normalizedName.includes("workspace") || normalizedName === "home page")
  ) {
    return TARGET_TYPES.CARD_MANAGE_PAGE_FLOW;
  }

  if (
    !extractionSource.includes("hook") &&
    normalizedPath.includes("/features/cardmanage/pages/") &&
    normalizedName === "card detail page"
  ) {
    return TARGET_TYPES.CARD_DETAIL_FLOW_PAGE;
  }

  if (
    !extractionSource.includes("hook") &&
    normalizedPath.includes("/features/cardholder/pages/")
  ) {
    return TARGET_TYPES.CARDHOLDER_PAGE_FLOW;
  }

  if (
    !extractionSource.includes("hook") &&
    normalizedPath.includes("/features/auth/pages/") &&
    (normalizedName.includes("create first card") || normalizedName.includes("register success"))
  ) {
    return TARGET_TYPES.AUTH_ONBOARDING_PAGE;
  }

  if (
    !extractionSource.includes("hook") &&
    normalizedPath.includes("/pages/") &&
    normalizedName.includes("share") &&
    (normalizedName.includes("action") || normalizedName.includes("card"))
  ) {
    return TARGET_TYPES.SHARE_WORKFLOW_PAGE;
  }

  if (
    feature.dependsOnLiff &&
    !extractionSource.includes("hook") &&
    (normalizedName.includes("auth") || normalizedName.includes("login"))
  ) {
    return TARGET_TYPES.AUTH_ENTRY_FLOW;
  }

  if (
    !extractionSource.includes("hook") &&
    (normalizedPath.includes("/pages/") || normalizedPath.includes("/routes/")) &&
    (normalizedName.includes("auth") || normalizedName.includes("login") || normalizedName.includes("verification"))
  ) {
    return TARGET_TYPES.AUTH_ENTRY_FLOW;
  }

  return TARGET_TYPES.GENERIC;
}
