export function buildLiffHookTestContent(relativePath, items, sourceFile, deps) {
  if (String(sourceFile).toLowerCase().includes("uselifftitle")) {
    return buildLiffTitleHookTestContent(relativePath, items, sourceFile, deps);
  }

  const {
    TOOL_SIGNATURE,
    AUTOGEN_START,
    AUTOGEN_END,
    MANUAL_START,
    MANUAL_END,
    buildRelativeImportPath,
    deriveServiceExportName,
  } = deps;
  const hookImportPath = buildRelativeImportPath(relativePath, sourceFile.replace(/\.[^.]+$/, ""));
  const hookExportName = deriveServiceExportName(sourceFile);

  return `${TOOL_SIGNATURE}
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { liffContextMock, liffServiceMock, logServiceMock } = vi.hoisted(() => ({
  liffContextMock: {
    isInitialized: true,
    isLoggedIn: true,
    isInLineClient: true,
    isLoading: false,
    error: null,
    profile: {
      userId: "U1234567890",
      displayName: "Mock User",
      pictureUrl: null,
      statusMessage: null,
    },
    initialize: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  },
  liffServiceMock: {
    getIsInitialized: vi.fn(),
    isInExternalBrowser: vi.fn(),
    getContext: vi.fn(),
    getLanguage: vi.fn(),
    getVersion: vi.fn(),
    getOS: vi.fn(),
    getLineVersion: vi.fn(),
    getUserProfile: vi.fn(),
    shareMessage: vi.fn(),
    scanQRCode: vi.fn(),
    openExternalBrowser: vi.fn(),
    getIdToken: vi.fn(),
    getAccessToken: vi.fn(),
    isFeatureAvailable: vi.fn(),
  },
  logServiceMock: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/components/common/LiffProvider", () => ({
  useLiffContext: () => liffContextMock,
}));
vi.mock("@/services/liffService", () => ({
  liffService: liffServiceMock,
}));
vi.mock("@/services/logService", () => ({
  logService: logServiceMock,
}));
vi.mock("@/constants/liff", () => ({
  LIFF_FEATURES: {
    shareMessage: true,
    scanCode: true,
  },
}));

import { ${hookExportName} } from "${hookImportPath}";

describe("${items[0]?.featureName ?? hookExportName}", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(liffContextMock, {
      isInitialized: true,
      isLoggedIn: true,
      isInLineClient: true,
      isLoading: false,
      error: null,
      profile: {
        userId: "U1234567890",
        displayName: "Mock User",
        pictureUrl: null,
        statusMessage: null,
      },
    });
    liffServiceMock.getIsInitialized.mockReturnValue(true);
    liffServiceMock.isInExternalBrowser.mockReturnValue(false);
    liffServiceMock.getContext.mockReturnValue({ type: "utou" });
    liffServiceMock.getLanguage.mockReturnValue("zh-TW");
    liffServiceMock.getVersion.mockReturnValue("2.0.0");
    liffServiceMock.getOS.mockReturnValue("ios");
    liffServiceMock.getLineVersion.mockReturnValue("14.0.0");
    liffServiceMock.getUserProfile.mockResolvedValue({
      userId: "U1234567890",
      displayName: "Mock User",
    });
    liffServiceMock.shareMessage.mockResolvedValue(true);
    liffServiceMock.scanQRCode.mockResolvedValue("mock-qr");
    liffServiceMock.openExternalBrowser.mockResolvedValue(undefined);
    liffServiceMock.getIdToken.mockResolvedValue("mock-id-token");
    liffServiceMock.getAccessToken.mockResolvedValue("mock-access-token");
    liffServiceMock.isFeatureAvailable.mockReturnValue(true);
  });

${AUTOGEN_START}
${items.map((item) => buildLiffHookCaseBlock(item, hookExportName)).join("\n\n")}
${AUTOGEN_END}

${MANUAL_START}
// custom cases
${MANUAL_END}
});
`;
}

function buildLiffHookCaseBlock(item, hookExportName) {
  if (item.scenarioType === "success") {
    return `it("${item.title}", () => {
  const { result } = renderHook(() => ${hookExportName}());

  expect(result.current.isInitialized).toBe(true);
  expect(result.current.isLoggedIn).toBe(true);
  expect(result.current.language).toBe("zh-TW");
});`;
  }

  if (item.scenarioType === "failure") {
    return `it("${item.title}", async () => {
  liffServiceMock.getUserProfile.mockRejectedValueOnce(new Error("profile failed"));
  const { result } = renderHook(() => ${hookExportName}());

  await expect(result.current.loadUserProfile()).rejects.toThrow("profile failed");
  expect(logServiceMock.error).toHaveBeenCalled();
});`;
  }

  return `it("${item.title}", () => {
  liffContextMock.isInitialized = false;
  const { result } = renderHook(() => ${hookExportName}());

  expect(result.current.isFeatureAvailable("shareMessage")).toBe(false);
});`;
}

export function buildAuthStateHookTestContent(relativePath, items, sourceFile, deps) {
  const {
    TOOL_SIGNATURE,
    AUTOGEN_START,
    AUTOGEN_END,
    MANUAL_START,
    MANUAL_END,
    buildRelativeImportPath,
    deriveServiceExportName,
  } = deps;
  const hookImportPath = buildRelativeImportPath(relativePath, sourceFile.replace(/\.[^.]+$/, ""));
  const hookExportName = deriveServiceExportName(sourceFile);

  return `${TOOL_SIGNATURE}
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { navigateMock, locationMock, dispatchMock, selectorMock, toastErrorMock, performExistingLoginBackendFlowMock, useLiffMock, logServiceMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  locationMock: vi.fn(),
  dispatchMock: vi.fn(),
  selectorMock: vi.fn(),
  toastErrorMock: vi.fn(),
  performExistingLoginBackendFlowMock: vi.fn(),
  useLiffMock: vi.fn(),
  logServiceMock: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
  useLocation: () => locationMock(),
}));
vi.mock("@/app/hooks", () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: () => selectorMock(),
}));
vi.mock("@/components/common/Toast", () => ({
  toast: {
    error: toastErrorMock,
  },
}));
vi.mock("@/features/auth/services/authFlowService", () => ({
  performExistingLoginBackendFlow: performExistingLoginBackendFlowMock,
}));
vi.mock("@/hooks/useLiff", () => ({
  useLiff: () => useLiffMock(),
}));
vi.mock("@/services/logService", () => ({
  logService: logServiceMock,
}));

import { ${hookExportName} } from "${hookImportPath}";

describe("${items[0]?.featureName ?? hookExportName}", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    locationMock.mockReturnValue({ pathname: "/cardmanage", search: "?from=test" });
    selectorMock.mockReturnValue({
      isAuthenticated: false,
      tokenId: null,
      userId: null,
    });
    useLiffMock.mockReturnValue({
      isInitialized: true,
      isLoggedIn: true,
      profile: {
        userId: "U1234567890",
        displayName: "Mock User",
        pictureUrl: null,
        statusMessage: null,
      },
      isLoading: false,
      error: null,
    });
    performExistingLoginBackendFlowMock.mockResolvedValue(true);
  });

${AUTOGEN_START}
${items.map((item) => buildAuthStateHookCaseBlock(item, hookExportName)).join("\n\n")}
${AUTOGEN_END}

${MANUAL_START}
// custom cases
${MANUAL_END}
});
`;
}

function buildAuthStateHookCaseBlock(item, hookExportName) {
  if (item.scenarioType === "success") {
    return `it("${item.title}", () => {
  selectorMock.mockReturnValue({
    isAuthenticated: true,
    tokenId: "token-123",
    userId: "U1234567890",
  });
  const { result } = renderHook(() => ${hookExportName}());

  expect(result.current.isAuthenticated).toBe(true);
  expect(result.current.hasCompletedPhoneVerification).toBe(true);
});`;
  }

  if (item.scenarioType === "failure") {
    return `it("${item.title}", async () => {
  useLiffMock.mockReturnValue({
    isInitialized: false,
    isLoggedIn: false,
    profile: null,
    isLoading: false,
    error: "LIFF failed",
  });
  const { result } = renderHook(() => ${hookExportName}());

  await waitFor(() => {
    expect(result.current.error).toBe("LIFF failed");
    expect(logServiceMock.error).toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalled();
  });
});`;
  }

  return `it("${item.title}", async () => {
  const { result } = renderHook(() => ${hookExportName}());
  let completed = false;

  await act(async () => {
    completed = await result.current.performBackendAuth();
  });

  expect(completed).toBe(true);
  expect(performExistingLoginBackendFlowMock).toHaveBeenCalledWith(expect.objectContaining({
    scopeId: "U1234567890",
    intendedPath: "/cardmanage?from=test",
  }));
});`;
}

export function buildAuthCompositeHookTestContent(relativePath, items, sourceFile, deps) {
  const normalizedSource = String(sourceFile).toLowerCase();
  if (normalizedSource.includes("usephoneverification")) {
    return buildPhoneVerificationHookTestContent(relativePath, items, sourceFile, deps);
  }
  if (normalizedSource.includes("useverificationcode")) {
    return buildVerificationCodeHookTestContent(relativePath, items, sourceFile, deps);
  }

  const {
    TOOL_SIGNATURE,
    AUTOGEN_START,
    AUTOGEN_END,
    MANUAL_START,
    MANUAL_END,
    buildRelativeImportPath,
    deriveServiceExportName,
  } = deps;
  const hookImportPath = buildRelativeImportPath(relativePath, sourceFile.replace(/\.[^.]+$/, ""));
  const hookExportName = deriveServiceExportName(sourceFile);

  return `${TOOL_SIGNATURE}
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { dispatchMock, toastErrorMock, useLiffMock, loginWithScopeIdMock, logServiceMock, saveAuthToCookiesMock, getDeviceDataMock, setAuthenticatedMock } = vi.hoisted(() => ({
  dispatchMock: vi.fn(),
  toastErrorMock: vi.fn(),
  useLiffMock: vi.fn(),
  loginWithScopeIdMock: vi.fn(),
  logServiceMock: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  saveAuthToCookiesMock: vi.fn(),
  getDeviceDataMock: vi.fn(),
  setAuthenticatedMock: vi.fn((payload) => ({ type: "auth/setAuthenticated", payload })),
}));

vi.mock("@/app/hooks", () => ({
  useAppDispatch: () => dispatchMock,
}));
vi.mock("@/components/common/Toast", () => ({
  toast: {
    error: toastErrorMock,
  },
}));
vi.mock("@/hooks/useLiff", () => ({
  useLiff: () => useLiffMock(),
}));
vi.mock("@/services/auth/loginWithScopeId", () => ({
  loginWithScopeId: loginWithScopeIdMock,
}));
vi.mock("@/services/logService", () => ({
  logService: logServiceMock,
}));
vi.mock("@/state/global/authSlice", () => ({
  setAuthenticated: setAuthenticatedMock,
}));
vi.mock("@/utils/authUtils", () => ({
  saveAuthToCookies: saveAuthToCookiesMock,
}));
vi.mock("@/utils/deviceUtils", () => ({
  getDeviceData: getDeviceDataMock,
}));

import { ${hookExportName} } from "${hookImportPath}";

describe("${items[0]?.featureName ?? hookExportName}", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDeviceDataMock.mockReturnValue({ os: "ios" });
    useLiffMock.mockReturnValue({
      isInitialized: true,
      isLoggedIn: true,
      profile: {
        userId: "U1234567890",
        displayName: "Mock User",
        pictureUrl: "https://example.com/avatar.png",
      },
      isLoading: false,
      error: null,
      login: vi.fn(),
    });
    loginWithScopeIdMock.mockResolvedValue({
      tokenId: "token-123",
      accountId: "account-1",
    });
  });

${AUTOGEN_START}
${items.map((item) => buildAuthCompositeHookCaseBlock(item, hookExportName)).join("\n\n")}
${AUTOGEN_END}

${MANUAL_START}
// custom cases
${MANUAL_END}
});
`;
}

function buildAuthCompositeHookCaseBlock(item, hookExportName) {
  if (item.scenarioType === "success") {
    return `it("${item.title}", async () => {
  const { result } = renderHook(() => ${hookExportName}());

  await waitFor(() => {
    expect(result.current.authCompleted).toBe(true);
  });

  expect(loginWithScopeIdMock).toHaveBeenCalledWith({ scopeId: "U1234567890" });
  expect(saveAuthToCookiesMock).toHaveBeenCalled();
  expect(dispatchMock).toHaveBeenCalledWith(expect.objectContaining({ type: "auth/setAuthenticated" }));
});`;
  }

  if (item.scenarioType === "failure") {
    return `it("${item.title}", async () => {
  loginWithScopeIdMock.mockRejectedValueOnce(new Error("backend auth failed"));
  const { result } = renderHook(() => ${hookExportName}());

  await waitFor(() => {
    expect(toastErrorMock).toHaveBeenCalled();
    expect(logServiceMock.error).toHaveBeenCalled();
    expect(result.current.isInitializing).toBe(false);
  });
});`;
  }

  return `it("${item.title}", async () => {
  useLiffMock.mockReturnValue({
    isInitialized: false,
    isLoggedIn: false,
    profile: null,
    isLoading: true,
    error: null,
    login: vi.fn(),
  });
  const { result } = renderHook(() => ${hookExportName}());

  await waitFor(() => {
    expect(result.current.isInitializing).toBe(true);
    expect(loginWithScopeIdMock).not.toHaveBeenCalled();
  });
});`;
}

function buildLiffTitleHookTestContent(relativePath, items, sourceFile, deps) {
  const {
    TOOL_SIGNATURE,
    AUTOGEN_START,
    AUTOGEN_END,
    MANUAL_START,
    MANUAL_END,
    buildRelativeImportPath,
  } = deps;
  const hookImportPath = buildRelativeImportPath(relativePath, sourceFile.replace(/\.[^.]+$/, ""));
  return `${TOOL_SIGNATURE}
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { tMock } = vi.hoisted(() => ({
  tMock: vi.fn((key, interpolation) => interpolation?.name ? \`\${key}:\${interpolation.name}\` : key),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: tMock }),
}));

import { useLiffTitle, useLiffTitleDirect } from "${hookImportPath}";

describe("${items[0]?.featureName ?? "Use Liff Title"}", () => {
  beforeEach(() => {
    document.title = "original-title";
    vi.clearAllMocks();
  });

${AUTOGEN_START}
it("${items[0]?.title ?? "Use Liff Title unit success"}", () => {
  renderHook(() => useLiffTitle("cardholder.title"));
  expect(document.title).toBe("cardholder.title");
});

it("${items[1]?.title ?? "Use Liff Title unit failure"}", () => {
  renderHook(() => useLiffTitle("cardholder.detail.title", { name: "Mock User" }));
  expect(document.title).toBe("cardholder.detail.title:Mock User");
});

it("${items[2]?.title ?? "Use Liff Title unit boundary"}", () => {
  renderHook(() => useLiffTitleDirect("Direct Title"));
  expect(document.title).toBe("Direct Title");
});
${AUTOGEN_END}

${MANUAL_START}
// custom cases
${MANUAL_END}
});
`;
}

function buildPhoneVerificationHookTestContent(relativePath, items, sourceFile, deps) {
  const {
    TOOL_SIGNATURE,
    AUTOGEN_START,
    AUTOGEN_END,
    MANUAL_START,
    MANUAL_END,
    buildRelativeImportPath,
    deriveServiceExportName,
  } = deps;
  const hookImportPath = buildRelativeImportPath(relativePath, sourceFile.replace(/\.[^.]+$/, ""));
  const hookExportName = deriveServiceExportName(sourceFile);
  return `${TOOL_SIGNATURE}
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { navigateMock, toastErrorMock, sendVerificationCodeMock, logServiceMock, liffServiceMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  toastErrorMock: vi.fn(),
  sendVerificationCodeMock: vi.fn(),
  logServiceMock: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    maskPhoneNumber: vi.fn((value) => value),
  },
  liffServiceMock: {
    getIsInitialized: vi.fn(),
    initialize: vi.fn(),
    isInLineClient: vi.fn(),
    closeWindow: vi.fn(),
  },
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
}));
vi.mock("@/components/common/Toast", () => ({
  toast: {
    error: toastErrorMock,
  },
}));
vi.mock("@/constants", () => ({
  EVENTS: {
    VERIFICATION_START: "VERIFICATION_START",
    VERIFICATION_SUCCESS: "VERIFICATION_SUCCESS",
    VERIFICATION_FAILED: "VERIFICATION_FAILED",
  },
}));
vi.mock("@/routes/paths", () => ({
  ROUTE_PATHS: {
    HOME: "/",
    VERIFICATION_CODE: "/verification-code",
  },
}));
vi.mock("@/services/logService", () => ({
  logService: logServiceMock,
}));
vi.mock("../services/phoneVerificationService", () => ({
  sendVerificationCode: sendVerificationCodeMock,
}));
vi.mock("@/services/liffService", () => ({
  liffService: liffServiceMock,
}));

import { ${hookExportName} } from "${hookImportPath}";

describe("${items[0]?.featureName ?? hookExportName}", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    sendVerificationCodeMock.mockResolvedValue({ onceToken: "once-token", validSecond: 120 });
    liffServiceMock.getIsInitialized.mockReturnValue(true);
    liffServiceMock.initialize.mockResolvedValue(undefined);
    liffServiceMock.isInLineClient.mockReturnValue(false);
    liffServiceMock.closeWindow.mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

${AUTOGEN_START}
it("${items[0]?.title ?? "Use Phone Verification unit success"}", async () => {
  const { result } = renderHook(() => ${hookExportName}());
  expect(result.current.isSendingCode).toBe(false);
  expect(result.current.showSuccessAlert).toBe(false);
});

it("${items[1]?.title ?? "Use Phone Verification unit failure"}", async () => {
  const { result } = renderHook(() => ${hookExportName}());
  expect(typeof result.current.sendCode).toBe("function");
  expect(typeof result.current.handleBack).toBe("function");
});

it("${items[2]?.title ?? "Use Phone Verification unit boundary"}", async () => {
  const { result } = renderHook(() => ${hookExportName}());
  expect(typeof result.current.sendCode).toBe("function");
  expect(typeof result.current.handleBack).toBe("function");
});
${AUTOGEN_END}

${MANUAL_START}
// custom cases
${MANUAL_END}
});
`;
}

function buildVerificationCodeHookTestContent(relativePath, items, sourceFile, deps) {
  const {
    TOOL_SIGNATURE,
    AUTOGEN_START,
    AUTOGEN_END,
    MANUAL_START,
    MANUAL_END,
    buildRelativeImportPath,
    deriveServiceExportName,
  } = deps;
  const hookImportPath = buildRelativeImportPath(relativePath, sourceFile.replace(/\.[^.]+$/, ""));
  const hookExportName = deriveServiceExportName(sourceFile);
  return `${TOOL_SIGNATURE}
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ${hookExportName} } from "${hookImportPath}";

describe("${items[0]?.featureName ?? hookExportName}", () => {
${AUTOGEN_START}
it("${items[0]?.title ?? "Use Verification Code unit success"}", () => {
  const { result } = renderHook(() => ${hookExportName}());
  act(() => {
    result.current.handleInputChange(["1", "2", "3", "4", "5", "6"]);
  });
  expect(result.current.getCodeString()).toBe("123456");
  expect(result.current.isCodeComplete()).toBe(true);
});

it("${items[1]?.title ?? "Use Verification Code unit failure"}", () => {
  const { result } = renderHook(() => ${hookExportName}());
  act(() => {
    result.current.setError("invalid code");
  });
  expect(result.current.isVerificationError).toBe(true);
  expect(result.current.errorMessage).toBe("invalid code");
});

it("${items[2]?.title ?? "Use Verification Code unit boundary"}", () => {
  const { result } = renderHook(() => ${hookExportName}());
  act(() => {
    result.current.handleInputChange(["1", "2", "", "", "", ""]);
    result.current.clearError();
    result.current.resetCode();
  });
  expect(result.current.getCodeString()).toBe("");
  expect(result.current.isCodeComplete()).toBe(false);
});
${AUTOGEN_END}

${MANUAL_START}
// custom cases
${MANUAL_END}
});
`;
}
