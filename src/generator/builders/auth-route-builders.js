export function buildAuthBackendFlowServiceTestContent(relativePath, items, sourceFile, deps) {
  const {
    TOOL_SIGNATURE,
    AUTOGEN_START,
    AUTOGEN_END,
    MANUAL_START,
    MANUAL_END,
    buildRelativeImportPath,
  } = deps;
  const serviceImportPath = buildRelativeImportPath(relativePath, sourceFile.replace(/\.[^.]+$/, ""));

  return `${TOOL_SIGNATURE}
import { beforeEach, describe, expect, it, vi } from "vitest";

const { navigateMock, dispatchMock, loginWithScopeIdMock, getMobileByScopeIdMock, logServiceMock, setAuthenticatedMock, logoutMock, saveAuthToCookiesMock, getAuthDataFromCookiesMock, clearAuthCookiesMock, getSatokenMock, canRedirectAfterLoginMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  dispatchMock: vi.fn(),
  loginWithScopeIdMock: vi.fn(),
  getMobileByScopeIdMock: vi.fn(),
  logServiceMock: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  setAuthenticatedMock: vi.fn((payload) => ({ type: "auth/setAuthenticated", payload })),
  logoutMock: vi.fn(() => ({ type: "auth/logout" })),
  saveAuthToCookiesMock: vi.fn(),
  getAuthDataFromCookiesMock: vi.fn(),
  clearAuthCookiesMock: vi.fn(),
  getSatokenMock: vi.fn(),
  canRedirectAfterLoginMock: vi.fn(),
}));

vi.mock("@/constants/env", () => ({
  ENV_CONFIG: {
    THIRD_CHANNEL: "mock-channel",
  },
}));
vi.mock("@/constants/storage", () => ({
  SESSION_STORAGE_KEYS: {
    REDIRECT_AFTER_LOGIN: "REDIRECT_AFTER_LOGIN",
  },
}));
vi.mock("@/routes/paths", () => ({
  ROUTE_PATHS: {
    HOME: "/",
    PHONE_VERIFICATION: "/phone-verification",
  },
}));
vi.mock("@/services/auth/loginWithScopeId", () => ({
  loginWithScopeId: loginWithScopeIdMock,
}));
vi.mock("@/services/graphql/queries/getMobileByScopeId", () => ({
  TOKEN_INVALID_CODE: "TOKEN_INVALID",
  getMobileByScopeId: getMobileByScopeIdMock,
}));
vi.mock("@/services/logService", () => ({
  logService: logServiceMock,
}));
vi.mock("@/state/global/authSlice", () => ({
  setAuthenticated: setAuthenticatedMock,
  logout: logoutMock,
}));
vi.mock("@/utils/authUtils", () => ({
  saveAuthToCookies: saveAuthToCookiesMock,
  getAuthDataFromCookies: getAuthDataFromCookiesMock,
  clearAuthCookies: clearAuthCookiesMock,
}));
vi.mock("@/utils/deviceUtils", () => ({
  getDeviceData: () => ({ os: "ios" }),
  getSatoken: getSatokenMock,
}));
vi.mock("../constants/session", () => ({
  SESSION_PENDING_REGISTRATION: "SESSION_PENDING_REGISTRATION",
}));
vi.mock("../utils/redirectHelpers", () => ({
  canRedirectAfterLogin: canRedirectAfterLoginMock,
}));

import { performExistingLoginBackendFlow } from "${serviceImportPath}";

describe("${items[0]?.featureName ?? "Auth Flow Service"}", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSatokenMock.mockReturnValue("satoken-123");
    getMobileByScopeIdMock.mockResolvedValue({ success: true });
    getAuthDataFromCookiesMock.mockReturnValue({
      tokenId: "token-123",
      scopeId: "U1234567890",
      accountId: "account-1",
    });
    loginWithScopeIdMock.mockResolvedValue({
      tokenId: "token-123",
      accountId: "account-1",
    });
    canRedirectAfterLoginMock.mockReturnValue(true);
    sessionStorage.clear();
    localStorage.clear();
  });

${AUTOGEN_START}
${items.map((item) => buildAuthBackendFlowServiceCaseBlock(item)).join("\n\n")}
${AUTOGEN_END}

${MANUAL_START}
// custom cases
${MANUAL_END}
});
`;
}

function buildAuthBackendFlowServiceCaseBlock(item) {
  if (item.scenarioType === "success") {
    return `it("${item.title}", async () => {
  await expect(performExistingLoginBackendFlow({
    scopeId: "U1234567890",
    profile: {
      userId: "U1234567890",
      displayName: "Mock User",
    },
    navigate: navigateMock,
    dispatch: dispatchMock,
    intendedPath: "/cardmanage",
  })).resolves.toBe(true);

  expect(dispatchMock).toHaveBeenCalledWith(expect.objectContaining({ type: "auth/setAuthenticated" }));
  expect(getMobileByScopeIdMock).toHaveBeenCalledWith({ scopeId: "U1234567890" });
});`;
  }

  if (item.scenarioType === "failure") {
    return `it("${item.title}", async () => {
  getSatokenMock.mockReturnValue(null);
  loginWithScopeIdMock.mockRejectedValue(new Error("not registered"));

  await expect(performExistingLoginBackendFlow({
    scopeId: "U1234567890",
    profile: {
      userId: "U1234567890",
      displayName: "Mock User",
    },
    navigate: navigateMock,
    dispatch: dispatchMock,
    intendedPath: "/share/card/1",
  })).resolves.toBe(false);

  expect(navigateMock).toHaveBeenCalledWith("/phone-verification", expect.any(Object));
  expect(logServiceMock.error).toHaveBeenCalled();
});`;
  }

  return `it("${item.title}", async () => {
  getSatokenMock.mockReturnValue(null);

  await expect(performExistingLoginBackendFlow({
    scopeId: "U1234567890",
    profile: {
      userId: "U1234567890",
      displayName: "Mock User",
    },
    navigate: navigateMock,
    dispatch: dispatchMock,
    intendedPath: "/cardmanage",
  })).resolves.toBe(true);

  expect(loginWithScopeIdMock).toHaveBeenCalledWith({
    scopeId: "U1234567890",
    thirdChannel: "mock-channel",
  });
  expect(saveAuthToCookiesMock).toHaveBeenCalled();
});`;
}

export function buildRouteGuardTestContent(relativePath, items, sourceFile, deps) {
  const normalizedSource = String(sourceFile).toLowerCase();
  if (normalizedSource.includes("guardshell")) {
    return buildGuardShellTestContent(relativePath, items, sourceFile, deps);
  }
  if (normalizedSource.includes("guestguard")) {
    return buildGuestGuardTestContent(relativePath, items, sourceFile, deps);
  }

  const {
    TOOL_SIGNATURE,
    AUTOGEN_START,
    AUTOGEN_END,
    MANUAL_START,
    MANUAL_END,
    buildRelativeImportPath,
    deriveComponentExportName,
  } = deps;
  const guardImportPath = buildRelativeImportPath(relativePath, sourceFile.replace(/\.[^.]+$/, ""));
  const guardExportName = deriveComponentExportName(sourceFile);

  return `${TOOL_SIGNATURE}
import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { useAuthMock, useLocationMock, canRedirectAfterLoginMock, logServiceMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useLocationMock: vi.fn(),
  canRedirectAfterLoginMock: vi.fn(),
  logServiceMock: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key) => key }),
}));
vi.mock("react-router-dom", () => ({
  Navigate: ({ to }) => <div data-testid="navigate" data-to={to} />,
  useLocation: () => useLocationMock(),
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => useAuthMock(),
}));
vi.mock("@/features/auth/utils/redirectHelpers", () => ({
  canRedirectAfterLogin: canRedirectAfterLoginMock,
}));
vi.mock("@/services/logService", () => ({
  logService: logServiceMock,
}));
vi.mock("@/components/common/LoadingSpinner", () => ({
  LoadingSpinner: ({ text }) => <div>{text}</div>,
}));
vi.mock("../paths", () => ({
  ROUTE_PATHS: {
    HOME: "/",
    PHONE_VERIFICATION: "/phone-verification",
  },
}));

import { ${guardExportName} } from "${guardImportPath}";

describe("${items[0]?.featureName ?? guardExportName}", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLocationMock.mockReturnValue({ pathname: "/cardmanage", search: "" });
    canRedirectAfterLoginMock.mockReturnValue(true);
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      hasCompletedPhoneVerification: true,
      isLoading: false,
      isLiffInitialized: true,
      isLiffLoggedIn: true,
      performBackendAuth: vi.fn(),
    });
  });

${AUTOGEN_START}
${items.map((item) => buildRouteGuardCaseBlock(item, guardExportName)).join("\n\n")}
${AUTOGEN_END}

${MANUAL_START}
// custom cases
${MANUAL_END}
});
`;
}

function buildRouteGuardCaseBlock(item, guardExportName) {
  if (item.scenarioType === "success") {
    return `it("${item.title}", () => {
  render(<${guardExportName}><div>protected content</div></${guardExportName}>);

  expect(screen.getByText("protected content")).toBeInTheDocument();
});`;
  }

  if (item.scenarioType === "failure") {
    return `it("${item.title}", () => {
  useAuthMock.mockReturnValue({
    isAuthenticated: false,
    hasCompletedPhoneVerification: false,
    isLoading: false,
    isLiffInitialized: true,
    isLiffLoggedIn: false,
    performBackendAuth: vi.fn(),
  });
  render(<${guardExportName}><div>protected content</div></${guardExportName}>);

  expect(screen.getByTestId("navigate")).toBeInTheDocument();
});`;
  }

  return `it("${item.title}", () => {
  useAuthMock.mockReturnValue({
    isAuthenticated: false,
    hasCompletedPhoneVerification: false,
    isLoading: true,
    isLiffInitialized: false,
    isLiffLoggedIn: false,
    performBackendAuth: vi.fn(),
  });
  render(<${guardExportName}><div>protected content</div></${guardExportName}>);

  expect(screen.getByText("common.authVerifying")).toBeInTheDocument();
});`;
}

export function buildAuthEntryFlowTestContent(relativePath, items, sourceFile, deps) {
  const normalizedSource = String(sourceFile).toLowerCase();
  if (normalizedSource.includes("phoneverificationpage")) {
    return buildPhoneVerificationPageTestContent(relativePath, items, sourceFile, deps);
  }
  if (normalizedSource.includes("verificationcodepage")) {
    return buildVerificationCodePageTestContent(relativePath, items, sourceFile, deps);
  }
  if (normalizedSource.includes("verificationsuccesspage")) {
    return buildVerificationSuccessPageTestContent(relativePath, items, sourceFile, deps);
  }
  if (normalizedSource.includes("welcomepage")) {
    return buildWelcomePageTestContent(relativePath, items, sourceFile, deps);
  }

  const {
    TOOL_SIGNATURE,
    AUTOGEN_START,
    AUTOGEN_END,
    MANUAL_START,
    MANUAL_END,
    buildRelativeImportPath,
    deriveComponentExportName,
  } = deps;
  const pageImportPath = buildRelativeImportPath(relativePath, sourceFile.replace(/\.[^.]+$/, ""));
  const pageExportName = deriveComponentExportName(sourceFile);

  return `${TOOL_SIGNATURE}
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { navigateMock, dispatchMock, selectorMock, toastShowMock, liffServiceMock, loginWithScopeIdMock, logServiceMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  dispatchMock: vi.fn(),
  selectorMock: vi.fn(),
  toastShowMock: vi.fn(),
  liffServiceMock: {
    initialize: vi.fn(),
    isUserLoggedIn: vi.fn(),
    login: vi.fn(),
    getUserProfile: vi.fn(),
    getIdToken: vi.fn(),
  },
  loginWithScopeIdMock: vi.fn(),
  logServiceMock: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("antd-mobile", () => ({
  Toast: { show: toastShowMock },
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key) => key }),
}));
vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
}));
vi.mock("@/app/hooks", () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: () => selectorMock(),
}));
vi.mock("@/components/common/Button", () => ({
  default: ({ children, onClick, disabled }) => <button onClick={onClick} disabled={disabled}>{children}</button>,
}));
vi.mock("@/components/layout", () => ({
  PageWrapper: ({ children }) => <div>{children}</div>,
}));
vi.mock("@/constants/env", () => ({
  ENV_CONFIG: { IS_DEVELOPMENT: false },
}));
vi.mock("@/services/auth/loginWithScopeId", () => ({
  loginWithScopeId: loginWithScopeIdMock,
}));
vi.mock("@/services/liffService", () => ({
  liffService: liffServiceMock,
}));
vi.mock("@/services/logService", () => ({
  logService: logServiceMock,
}));
vi.mock("@/state/global/authSlice", () => ({
  setAuthenticated: (payload) => ({ type: "auth/setAuthenticated", payload }),
  clearError: () => ({ type: "auth/clearError" }),
}));
vi.mock("@/utils/authUtils", () => ({
  saveAuthToCookies: vi.fn(),
}));
vi.mock("@/utils/deviceUtils", () => ({
  getDeviceData: () => ({ os: "ios" }),
}));

import ${pageExportName} from "${pageImportPath}";

describe("${items[0]?.featureName ?? pageExportName}", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectorMock.mockReturnValue({ error: null });
    liffServiceMock.initialize.mockResolvedValue(undefined);
    liffServiceMock.isUserLoggedIn.mockReturnValue(true);
    liffServiceMock.login.mockResolvedValue(undefined);
    liffServiceMock.getUserProfile.mockResolvedValue({
      userId: "U1234567890",
      displayName: "Mock User",
      pictureUrl: null,
    });
    liffServiceMock.getIdToken.mockResolvedValue("mock-id-token");
    loginWithScopeIdMock.mockResolvedValue({
      tokenId: "token-123",
      accountId: "account-1",
    });
  });

${AUTOGEN_START}
${items.map((item) => buildAuthEntryFlowCaseBlock(item, pageExportName)).join("\n\n")}
${AUTOGEN_END}

${MANUAL_START}
// custom cases
${MANUAL_END}
});
`;
}

function buildAuthEntryFlowCaseBlock(item, pageExportName) {
  if (item.scenarioType === "success") {
    return `it("${item.title}", async () => {
  render(<${pageExportName} />);
  fireEvent.click(screen.getByRole("button", { name: "auth.agreeAndContinue" }));

  await waitFor(() => {
    expect(liffServiceMock.initialize).toHaveBeenCalled();
  });
});`;
  }

  if (item.scenarioType === "failure") {
    return `it("${item.title}", async () => {
  liffServiceMock.initialize.mockRejectedValue(new Error("LIFF init failed"));
  render(<${pageExportName} />);
  fireEvent.click(screen.getByRole("button", { name: "auth.agreeAndContinue" }));

  await waitFor(() => {
    expect(logServiceMock.error).toHaveBeenCalled();
    expect(toastShowMock).toHaveBeenCalled();
  });
});`;
  }

  return `it("${item.title}", () => {
  selectorMock.mockReturnValue({ error: "auth failed" });
  render(<${pageExportName} />);

  expect(screen.getByText("auth failed")).toBeInTheDocument();
});`;
}

function buildPhoneVerificationPageTestContent(relativePath, items, sourceFile, deps) {
  const {
    TOOL_SIGNATURE,
    AUTOGEN_START,
    AUTOGEN_END,
    MANUAL_START,
    MANUAL_END,
    buildRelativeImportPath,
    deriveComponentExportName,
  } = deps;
  const pageImportPath = buildRelativeImportPath(relativePath, sourceFile.replace(/\.[^.]+$/, ""));
  const pageExportName = deriveComponentExportName(sourceFile);
  return `${TOOL_SIGNATURE}
import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { selectorMock, toastErrorMock, sendCodeMock, phoneValidationMock } = vi.hoisted(() => ({
  selectorMock: vi.fn(),
  toastErrorMock: vi.fn(),
  sendCodeMock: vi.fn(),
  phoneValidationMock: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key, fallback) => fallback ?? key }),
}));
vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));
vi.mock("@/app/hooks", () => ({
  useAppSelector: (selector) => selector(selectorMock()),
}));
vi.mock("@/components/common/Button", () => ({
  default: ({ children, onClick, disabled, loading }) => <button onClick={onClick} disabled={disabled}>{loading ? "loading" : children}</button>,
}));
vi.mock("@/components/common/Toast", () => ({
  toast: {
    error: toastErrorMock,
  },
}));
vi.mock("@/components/layout", () => ({
  PageWrapper: ({ children }) => <div>{children}</div>,
}));
vi.mock("@/constants/liff", () => ({
  LIFF_CONFIG: {
    LIFF_ID: "mock-liff-id",
  },
}));
vi.mock("@/services/liffService", () => ({
  liffService: {
    getIsInitialized: vi.fn(),
    initialize: vi.fn(),
    isInLineClient: vi.fn(),
    closeWindow: vi.fn(),
  },
}));
vi.mock("../components/PhoneInput", () => ({
  default: () => <div>phone-input</div>,
}));
vi.mock("../components/SuccessAlert", () => ({
  default: ({ show }) => show ? <div>success-alert</div> : null,
}));
vi.mock("../hooks/usePhoneValidation", () => ({
  usePhoneValidation: () => phoneValidationMock(),
}));
vi.mock("../hooks/usePhoneVerification", () => ({
  usePhoneVerification: () => ({
    isSendingCode: false,
    showSuccessAlert: false,
    sendCode: sendCodeMock,
    handleBack: vi.fn(),
  }),
}));
vi.mock("@/services/logService", () => ({
  logService: {
    info: vi.fn(),
  },
}));

import ${pageExportName} from "${pageImportPath}";

describe("${items[0]?.featureName ?? pageExportName}", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectorMock.mockReturnValue({ verification: { error: null } });
    phoneValidationMock.mockReturnValue({
      phoneNumber: "0912345678",
      countryCode: "+886",
      handlePhoneNumberChange: vi.fn(),
      handleCountryCodeChange: vi.fn(),
      isPhoneNumberValid: true,
      isSupportedCountryCode: true,
    });
    sendCodeMock.mockResolvedValue(undefined);
  });

${AUTOGEN_START}
it("${items[0]?.title ?? "Phone Verification Page unit success"}", () => {
  render(<${pageExportName} />);
  expect(screen.getByText("手機號碼驗證")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "verification.sendVerificationCode" })).toBeInTheDocument();
});

it("${items[1]?.title ?? "Phone Verification Page unit failure"}", () => {
  phoneValidationMock.mockReturnValueOnce({
    phoneNumber: "0912345678",
    countryCode: "+999",
    handlePhoneNumberChange: vi.fn(),
    handleCountryCodeChange: vi.fn(),
    isPhoneNumberValid: true,
    isSupportedCountryCode: false,
  });
  render(<${pageExportName} />);
  expect(screen.getByRole("button", { name: "verification.sendVerificationCode" })).toBeDisabled();
});

it("${items[2]?.title ?? "Phone Verification Page unit boundary"}", () => {
  selectorMock.mockReturnValueOnce({ verification: { error: "auth failed" } });
  render(<${pageExportName} />);
  expect(screen.getAllByText("auth failed").length).toBeGreaterThan(0);
});
${AUTOGEN_END}

${MANUAL_START}
// custom cases
${MANUAL_END}
});
`;
}

function buildVerificationCodePageTestContent(relativePath, items, sourceFile, deps) {
  const {
    TOOL_SIGNATURE,
    AUTOGEN_START,
    AUTOGEN_END,
    MANUAL_START,
    MANUAL_END,
    buildRelativeImportPath,
    deriveComponentExportName,
  } = deps;
  const pageImportPath = buildRelativeImportPath(relativePath, sourceFile.replace(/\.[^.]+$/, ""));
  const pageExportName = deriveComponentExportName(sourceFile);
  return `${TOOL_SIGNATURE}
import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { navigateMock, dispatchMock, selectorMock, useLiffMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  dispatchMock: vi.fn(),
  selectorMock: vi.fn(),
  useLiffMock: vi.fn(),
}));

vi.mock("antd-mobile", () => ({
  Toast: { show: vi.fn() },
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key) => key }),
}));
vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
}));
vi.mock("@/app/hooks", () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector) => selector(selectorMock()),
}));
vi.mock("@/components/common/Button", () => ({
  default: ({ children }) => <button>{children}</button>,
}));
vi.mock("@/components/common/LoadingSpinner", () => ({
  LoadingSpinner: () => <div>loading</div>,
}));
vi.mock("@/components/layout", () => ({
  PageWrapper: ({ children }) => <div>{children}</div>,
}));
vi.mock("@/constants/storage", () => ({
  SESSION_STORAGE_KEYS: {
    SMS_MOBILE: "SMS_MOBILE",
    SMS_COUNTRY_CODE: "SMS_COUNTRY_CODE",
    SMS_ONCE_TOKEN: "SMS_ONCE_TOKEN",
    CREATED_CARD_ID: "CREATED_CARD_ID",
  },
}));
vi.mock("@/features/cardmanage/hooks/useCreateDefaultCard", () => ({
  useCreateDefaultCard: () => ({ createDefaultCard: vi.fn() }),
}));
vi.mock("@/hooks/useLiff", () => ({
  useLiff: () => useLiffMock(),
}));
vi.mock("@/routes/paths", () => ({
  ROUTE_PATHS: {
    VERIFICATION_SUCCESS: "/verification-success",
    REGISTER_SUCCESS: "/register-success",
    CREATE_FIRST_CARD: "/create-first-card",
  },
}));
vi.mock("@/services/auth/loginWithScopeId", () => ({ loginWithScopeId: vi.fn() }));
vi.mock("@/services/graphql", () => ({ sendCode: vi.fn(), validateCode: vi.fn() }));
vi.mock("@/services/graphql/queries/getSelfCard", () => ({ getSelfCard: vi.fn() }));
vi.mock("@/services/logService", () => ({
  logService: { info: vi.fn(), error: vi.fn() },
}));
vi.mock("@/state/global/authSlice", () => ({
  setAuthenticated: (payload) => ({ type: "auth/setAuthenticated", payload }),
}));
vi.mock("@/utils/authUtils", () => ({ saveAuthToCookies: vi.fn() }));
vi.mock("@/utils/deviceUtils", () => ({ getDeviceData: () => ({ os: "ios" }) }));
vi.mock("../hooks/useCountdown", () => ({
  useCountdown: () => ({ countdown: 0, startCountdown: vi.fn(), isCountingDown: false }),
}));

import ${pageExportName} from "${pageImportPath}";

describe("${items[0]?.featureName ?? pageExportName}", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectorMock.mockReturnValue({ verification: { isLoading: false } });
    useLiffMock.mockReturnValue({
      profile: { userId: "U1234567890", displayName: "Mock User", pictureUrl: null },
    });
    sessionStorage.clear();
    sessionStorage.setItem("SMS_MOBILE", "0912345678");
    sessionStorage.setItem("SMS_COUNTRY_CODE", "+886");
    sessionStorage.setItem("SMS_ONCE_TOKEN", "once-token");
  });

${AUTOGEN_START}
it("${items[0]?.title ?? "Verification Code Page unit success"}", () => {
  render(<${pageExportName} />);
  expect(screen.getAllByRole("button").length).toBeGreaterThan(0);
});

it("${items[1]?.title ?? "Verification Code Page unit failure"}", () => {
  selectorMock.mockReturnValueOnce({ verification: { isLoading: true } });
  render(<${pageExportName} />);
  expect(screen.getAllByRole("button").length).toBeGreaterThan(0);
});

it("${items[2]?.title ?? "Verification Code Page unit boundary"}", () => {
  render(<${pageExportName} />);
  expect(screen.getAllByRole("button").length).toBeGreaterThan(0);
});
${AUTOGEN_END}

${MANUAL_START}
// custom cases
${MANUAL_END}
});
`;
}

function buildVerificationSuccessPageTestContent(relativePath, items, sourceFile, deps) {
  const {
    TOOL_SIGNATURE,
    AUTOGEN_START,
    AUTOGEN_END,
    MANUAL_START,
    MANUAL_END,
    buildRelativeImportPath,
    deriveComponentExportName,
  } = deps;
  const pageImportPath = buildRelativeImportPath(relativePath, sourceFile.replace(/\.[^.]+$/, ""));
  const pageExportName = deriveComponentExportName(sourceFile);
  return `${TOOL_SIGNATURE}
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { navigateMock, selectorMock, liffContextMock, liffServiceMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  selectorMock: vi.fn(),
  liffContextMock: vi.fn(),
  liffServiceMock: {
    getFriendship: vi.fn(),
    initialize: vi.fn(),
    isInLineClient: vi.fn(),
    closeWindow: vi.fn(),
    openExternalBrowser: vi.fn(),
    isUserLoggedIn: vi.fn(),
  },
}));

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));
vi.mock("react-router-dom", () => ({ useNavigate: () => navigateMock }));
vi.mock("@/app/hooks", () => ({
  useAppSelector: (selector) => selector(selectorMock()),
}));
vi.mock("@/components/common/Button", () => ({
  default: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
}));
vi.mock("@/components/layout", () => ({
  PageWrapper: ({ children }) => <div>{children}</div>,
}));
vi.mock("@/components/common/LiffProvider", () => ({
  useLiffContext: () => liffContextMock(),
}));
vi.mock("@/constants", () => ({ LINE_OA: { FRIEND_URL: "https://line.example/friend" } }));
vi.mock("@/constants/env", () => ({ ENV_CONFIG: { IS_DEVELOPMENT: false } }));
vi.mock("@/constants/storage", () => ({ SESSION_STORAGE_KEYS: { REDIRECT_AFTER_LOGIN: "REDIRECT_AFTER_LOGIN" } }));
vi.mock("@/routes/paths", () => ({ ROUTE_PATHS: { CARD_CREATE: "/card-create", CARD_MANAGE: "/card-manage" } }));
vi.mock("../utils/redirectHelpers", () => ({ canRedirectAfterLogin: () => true }));
vi.mock("@/services/liffService", () => ({ liffService: liffServiceMock }));
vi.mock("@/services/logService", () => ({ logService: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import ${pageExportName} from "${pageImportPath}";

describe("${items[0]?.featureName ?? pageExportName}", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectorMock.mockReturnValue({ auth: { userId: "U1234567890", displayName: "Mock User", avatarUrl: null } });
    liffContextMock.mockReturnValue({ isInLineClient: true });
    liffServiceMock.getFriendship.mockResolvedValue({ friendFlag: true });
    liffServiceMock.initialize.mockResolvedValue(undefined);
    liffServiceMock.isInLineClient.mockReturnValue(false);
    sessionStorage.clear();
  });

${AUTOGEN_START}
it("${items[0]?.title ?? "Verification Success Page unit success"}", async () => {
  render(<${pageExportName} />);
  await waitFor(() => {
    expect(liffServiceMock.getFriendship).toHaveBeenCalled();
  });
});

it("${items[1]?.title ?? "Verification Success Page unit failure"}", async () => {
  liffServiceMock.getFriendship.mockRejectedValueOnce(new Error("friendship failed"));
  render(<${pageExportName} />);
  await waitFor(() => {
    expect(screen.getAllByRole("button").length).toBeGreaterThan(0);
  });
});

it("${items[2]?.title ?? "Verification Success Page unit boundary"}", async () => {
  sessionStorage.setItem("REDIRECT_AFTER_LOGIN", "/card-manage");
  render(<${pageExportName} />);
  await waitFor(() => {
    expect(navigateMock).toHaveBeenCalledWith("/card-manage", { replace: true });
  });
});
${AUTOGEN_END}

${MANUAL_START}
// custom cases
${MANUAL_END}
});
`;
}

function buildWelcomePageTestContent(relativePath, items, sourceFile, deps) {
  const {
    TOOL_SIGNATURE,
    AUTOGEN_START,
    AUTOGEN_END,
    MANUAL_START,
    MANUAL_END,
    buildRelativeImportPath,
    deriveComponentExportName,
  } = deps;
  const pageImportPath = buildRelativeImportPath(relativePath, sourceFile.replace(/\.[^.]+$/, ""));
  const pageExportName = deriveComponentExportName(sourceFile);
  return `${TOOL_SIGNATURE}
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { navigateMock, dispatchMock, liffContextMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  dispatchMock: vi.fn(),
  liffContextMock: vi.fn(),
}));

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));
vi.mock("react-router-dom", () => ({ useNavigate: () => navigateMock }));
vi.mock("@/app/hooks", () => ({ useAppDispatch: () => dispatchMock }));
vi.mock("@/components/common/Button", () => ({
  default: ({ children, onClick, disabled }) => <button onClick={onClick} disabled={disabled}>{children}</button>,
}));
vi.mock("@/components/common/LiffProvider", () => ({
  useLiffContext: () => liffContextMock(),
}));
vi.mock("@/constants/env", () => ({ ENV_CONFIG: { IS_DEVELOPMENT: false } }));
vi.mock("@/services/logService", () => ({ logService: { debug: vi.fn(), error: vi.fn() } }));
vi.mock("@/state/global/authSlice", () => ({
  setAuthenticated: (payload) => ({ type: "auth/setAuthenticated", payload }),
}));

import ${pageExportName} from "${pageImportPath}";

describe("${items[0]?.featureName ?? pageExportName}", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    liffContextMock.mockReturnValue({
      isLoggedIn: true,
      profile: { displayName: "Mock User", pictureUrl: null },
      logout: vi.fn(),
    });
  });

${AUTOGEN_START}
it("${items[0]?.title ?? "Welcome Page unit success"}", () => {
  render(<${pageExportName} />);
  expect(screen.getByText("Mock User")).toBeInTheDocument();
});

it("${items[1]?.title ?? "Welcome Page unit failure"}", () => {
  liffContextMock.mockReturnValueOnce({ isLoggedIn: true, profile: null, logout: vi.fn() });
  render(<${pageExportName} />);
  expect(screen.getByText("auth.welcome")).toBeInTheDocument();
});

it("${items[2]?.title ?? "Welcome Page unit boundary"}", () => {
  render(<${pageExportName} />);
  fireEvent.click(screen.getAllByRole("button")[0]);
  expect(screen.getAllByRole("button").length).toBeGreaterThan(0);
});
${AUTOGEN_END}

${MANUAL_START}
// custom cases
${MANUAL_END}
});
`;
}

function buildGuardShellTestContent(relativePath, items, sourceFile, deps) {
  const {
    TOOL_SIGNATURE,
    AUTOGEN_START,
    AUTOGEN_END,
    MANUAL_START,
    MANUAL_END,
    buildRelativeImportPath,
    deriveComponentExportName,
  } = deps;
  const guardImportPath = buildRelativeImportPath(relativePath, sourceFile.replace(/\.[^.]+$/, ""));
  const guardExportName = deriveComponentExportName(sourceFile);
  return `${TOOL_SIGNATURE}
import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { selectorMock } = vi.hoisted(() => ({
  selectorMock: vi.fn(),
}));

vi.mock("@/app/hooks", () => ({
  useAppSelector: (selector) => selector(selectorMock()),
}));
vi.mock("@/components/common/ErrorMessage", () => ({
  ErrorMessage: ({ message }) => <div>{message}</div>,
}));
vi.mock("@/components/common/LoadingSpinner", () => ({
  LoadingSpinner: () => <div>loading</div>,
}));

import { ${guardExportName} } from "${guardImportPath}";

describe("${items[0]?.featureName ?? guardExportName}", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

${AUTOGEN_START}
it("${items[0]?.title ?? "Guard Shell unit success"}", () => {
  selectorMock.mockReturnValue({ auth: { isLoading: false, error: null } });
  render(<${guardExportName}><div>guard content</div></${guardExportName}>);
  expect(screen.getByText("guard content")).toBeInTheDocument();
});

it("${items[1]?.title ?? "Guard Shell unit failure"}", () => {
  selectorMock.mockReturnValue({ auth: { isLoading: false, error: "boom" } });
  render(<${guardExportName}><div>guard content</div></${guardExportName}>);
  expect(screen.getByText("發生錯誤，請稍後再試")).toBeInTheDocument();
});

it("${items[2]?.title ?? "Guard Shell unit boundary"}", () => {
  selectorMock.mockReturnValue({ auth: { isLoading: true, error: null } });
  render(<${guardExportName}><div>guard content</div></${guardExportName}>);
  expect(screen.getByText("loading")).toBeInTheDocument();
});
${AUTOGEN_END}

${MANUAL_START}
// custom cases
${MANUAL_END}
});
`;
}

function buildGuestGuardTestContent(relativePath, items, sourceFile, deps) {
  const {
    TOOL_SIGNATURE,
    AUTOGEN_START,
    AUTOGEN_END,
    MANUAL_START,
    MANUAL_END,
    buildRelativeImportPath,
    deriveComponentExportName,
  } = deps;
  const guardImportPath = buildRelativeImportPath(relativePath, sourceFile.replace(/\.[^.]+$/, ""));
  const guardExportName = deriveComponentExportName(sourceFile);
  return `${TOOL_SIGNATURE}
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { locationMock, getMobileByScopeIdMock, getCurrentUserScopeIdMock } = vi.hoisted(() => ({
  locationMock: vi.fn(),
  getMobileByScopeIdMock: vi.fn(),
  getCurrentUserScopeIdMock: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key) => key }),
}));
vi.mock("react-router-dom", () => ({
  Navigate: ({ to }) => <div data-testid="navigate" data-to={to} />,
  useLocation: () => locationMock(),
}));
vi.mock("@/components/common/LoadingSpinner", () => ({
  LoadingSpinner: ({ text }) => <div>{text}</div>,
}));
vi.mock("@/services/graphql/queries/getMobileByScopeId", () => ({
  getMobileByScopeId: getMobileByScopeIdMock,
}));
vi.mock("@/services/logService", () => ({
  logService: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));
vi.mock("@/utils/authUtils", () => ({
  getCurrentUserScopeId: getCurrentUserScopeIdMock,
}));
vi.mock("../paths", () => ({
  ROUTE_PATHS: {
    CARD_MANAGE: "/card-manage",
  },
}));

import { ${guardExportName} } from "${guardImportPath}";

describe("${items[0]?.featureName ?? guardExportName}", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    locationMock.mockReturnValue({ state: null });
  });

${AUTOGEN_START}
it("${items[0]?.title ?? "Guest Guard unit success"}", async () => {
  getCurrentUserScopeIdMock.mockResolvedValue("U1234567890");
  getMobileByScopeIdMock.mockResolvedValue({ success: false });
  render(<${guardExportName}><div>guest content</div></${guardExportName}>);
  await waitFor(() => {
    expect(screen.getByText("guest content")).toBeInTheDocument();
  });
});

it("${items[1]?.title ?? "Guest Guard unit failure"}", async () => {
  getCurrentUserScopeIdMock.mockResolvedValue("U1234567890");
  getMobileByScopeIdMock.mockResolvedValue({ success: true });
  render(<${guardExportName}><div>guest content</div></${guardExportName}>);
  await waitFor(() => {
    expect(screen.getByTestId("navigate")).toBeInTheDocument();
  });
});

it("${items[2]?.title ?? "Guest Guard unit boundary"}", async () => {
  getCurrentUserScopeIdMock.mockResolvedValue(null);
  render(<${guardExportName}><div>guest content</div></${guardExportName}>);
  await waitFor(() => {
    expect(screen.getByText("guest content")).toBeInTheDocument();
  });
});
${AUTOGEN_END}

${MANUAL_START}
// custom cases
${MANUAL_END}
});
`;
}
