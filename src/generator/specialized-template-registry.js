import { TARGET_TYPES } from "../target-classification.js";

const directTargetBuilderKeys = {
  [TARGET_TYPES.LIFF_ADAPTER_SERVICE]: "liffAdapterService",
  [TARGET_TYPES.LINE_SHARE_SERVICE]: "lineShareService",
  [TARGET_TYPES.LIFF_HOOK]: "liffHook",
  [TARGET_TYPES.AUTH_STATE_HOOK]: "authStateHook",
  [TARGET_TYPES.AUTH_COMPOSITE_HOOK]: "authCompositeHook",
  [TARGET_TYPES.AUTH_BACKEND_FLOW_SERVICE]: "authBackendFlowService",
  [TARGET_TYPES.ROUTE_GUARD]: "routeGuard",
  [TARGET_TYPES.AUTH_ENTRY_FLOW]: "authEntryFlow",
  [TARGET_TYPES.CARD_SHARE_FLOW_PAGE]: "cardShareFlowPage",
  [TARGET_TYPES.SHARE_WORKFLOW_PAGE]: "shareWorkflowPage",
};

const myCashRules = [
  { match: (source) => source.includes("wrapper"), builderKey: "myCashWrapperPage" },
  { match: (source) => source.endsWith("/mycashpage.tsx"), builderKey: "myCashMainPage" },
  { match: (source) => source.endsWith("/beginnerguidepage.tsx"), builderKey: "beginnerGuidePage" },
  { match: (source) => source.endsWith("/expiredpointspage.tsx"), builderKey: "expiredPointsPage" },
];

const cardManageRules = [
  {
    match: (source) =>
      source.endsWith("/cardmanagepage.tsx") || source.endsWith("/homepage.tsx"),
    builderKey: "cardManageWrapperPage",
  },
  { match: (source) => source.endsWith("/cardmanageshell.tsx"), builderKey: "cardManageShell" },
  { match: (source) => source.endsWith("/cardworkspace.tsx"), builderKey: "cardWorkspace" },
];

const cardDetailRules = [
  { match: (source) => source.endsWith("/carddetailpage.tsx"), builderKey: "cardDetailEntryPage" },
];

const cardholderRules = [
  { match: (source) => source.endsWith("/cardholderpage.tsx"), builderKey: "cardholderMainPage" },
  {
    match: (source) =>
      source.endsWith("/manualcarddetailroutepage.tsx") ||
      source.endsWith("/smartcarddetailroutepage.tsx"),
    builderKey: "cardholderRoutePage",
  },
  { match: (source) => source.endsWith("/manualcardeditpage.tsx"), builderKey: "manualCardEditPage" },
  { match: (source) => source.endsWith("/notificationcenterpage.tsx"), builderKey: "notificationCenterPage" },
  {
    match: (source) =>
      source.endsWith("/contactdetailpage.tsx") || source.endsWith("/smartcarddetailpage.tsx"),
    builderKey: "cardholderDetailPage",
  },
];

const authOnboardingRules = [
  { match: (source) => source.endsWith("/createfirstcardpage.tsx"), builderKey: "createFirstCardPage" },
  { match: (source) => source.endsWith("/registersuccesspage.tsx"), builderKey: "registerSuccessPage" },
];

const groupedTargetRules = {
  [TARGET_TYPES.MYCASH_PAGE_FLOW]: myCashRules,
  [TARGET_TYPES.CARD_MANAGE_PAGE_FLOW]: cardManageRules,
  [TARGET_TYPES.CARD_DETAIL_FLOW_PAGE]: cardDetailRules,
  [TARGET_TYPES.CARDHOLDER_PAGE_FLOW]: cardholderRules,
  [TARGET_TYPES.AUTH_ONBOARDING_PAGE]: authOnboardingRules,
};

export function selectSpecializedTemplateBuilder({
  projectProfile,
  targetType,
  sourceFile,
  parentFeatureId,
  builders,
}) {
  if (projectProfile.unitTestFramework !== "vitest") {
    return null;
  }

  if (!sourceFile || !targetType || targetType === TARGET_TYPES.GENERIC || parentFeatureId) {
    return null;
  }

  const directBuilderKey = directTargetBuilderKeys[targetType];
  if (directBuilderKey) {
    return builders[directBuilderKey] ?? null;
  }

  const rules = groupedTargetRules[targetType] ?? [];
  const normalizedSourceFile = String(sourceFile).toLowerCase();
  const matchedRule = rules.find((rule) => rule.match(normalizedSourceFile));
  if (!matchedRule) {
    return null;
  }

  return builders[matchedRule.builderKey] ?? null;
}
