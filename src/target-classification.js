import path from "node:path";

export const TARGET_TYPES = {
  GENERIC: "generic",
  LIFF_ADAPTER_SERVICE: "liff-adapter-service",
  LINE_SHARE_SERVICE: "line-share-service",
  AUTH_ENTRY_FLOW: "auth-entry-flow",
  LIFF_HOOK: "liff-hook",
  ROUTE_GUARD: "route-guard",
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

  if ((normalizedPath.includes("/features/auth/") || normalizedPath.includes("/auth/")) &&
    /(login|auth|signin|welcome|verification)/.test(baseName)) {
    return TARGET_TYPES.AUTH_ENTRY_FLOW;
  }

  return TARGET_TYPES.GENERIC;
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

  if (feature.dependsOnLiff && (normalizedName.includes("auth") || normalizedName.includes("login"))) {
    return TARGET_TYPES.AUTH_ENTRY_FLOW;
  }

  return TARGET_TYPES.GENERIC;
}

