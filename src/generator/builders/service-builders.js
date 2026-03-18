export function buildLiffServiceTestContent(relativePath, items, sourceFile, deps) {
  const {
    TOOL_SIGNATURE,
    AUTOGEN_START,
    AUTOGEN_END,
    MANUAL_START,
    MANUAL_END,
    buildRelativeImportPath,
    deriveServiceExportName,
  } = deps;
  const applyFixtureImportPath = buildRelativeImportPath(relativePath, "testing/liff/applyFixture");
  const resetFixtureImportPath = buildRelativeImportPath(relativePath, "testing/liff/resetFixture");
  const sourceImportPath = buildRelativeImportPath(relativePath, sourceFile.replace(/\.[^.]+$/, ""));
  const serviceExportName = deriveServiceExportName(sourceFile);

  return `${TOOL_SIGNATURE}
import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyLiffFixture, getCurrentLiffFixture } from "${applyFixtureImportPath}";
import { resetLiffFixture } from "${resetFixtureImportPath}";

const { liffMock, logServiceMock, canRedirectAfterLoginMock } = vi.hoisted(() => ({
  liffMock: {
    init: vi.fn(),
    isLoggedIn: vi.fn(),
    getProfile: vi.fn(),
    getIDToken: vi.fn(),
    getAccessToken: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    shareTargetPicker: vi.fn(),
    scanCode: vi.fn(),
    openWindow: vi.fn(),
    getContext: vi.fn(),
    isInClient: vi.fn(),
    closeWindow: vi.fn(),
    getLanguage: vi.fn(),
    getVersion: vi.fn(),
    getOS: vi.fn(),
    getLineVersion: vi.fn(),
    getFriendship: vi.fn(),
  },
  logServiceMock: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  canRedirectAfterLoginMock: vi.fn(),
}));

vi.mock("@line/liff", () => ({ default: liffMock }));
vi.mock("@/services/logService", () => ({ logService: logServiceMock }));
vi.mock("@/constants/liff", () => ({
  LIFF_CONFIG: {
    LIFF_ID: "mock-liff-id",
  },
}));
vi.mock("@/features/auth/utils/redirectHelpers", () => ({
  canRedirectAfterLogin: canRedirectAfterLoginMock,
}));

import { ${serviceExportName} } from "${sourceImportPath}";

describe("${items[0]?.featureName ?? "Liff Service"}", () => {
  beforeEach(() => {
    resetLiffFixture();
    applyLiffFixture("loggedOut");
    vi.clearAllMocks();
    canRedirectAfterLoginMock.mockReturnValue(true);
    liffMock.init.mockImplementation(async () => {
      const fixture = getCurrentLiffFixture();
      if (fixture.initError) {
        throw new Error(String(fixture.initError));
      }
    });
    liffMock.isLoggedIn.mockImplementation(() => Boolean(getCurrentLiffFixture().isLoggedIn));
    liffMock.getProfile.mockImplementation(async () => {
      const fixture = getCurrentLiffFixture();
      if (fixture.profileError) {
        throw new Error(String(fixture.profileError));
      }
      return fixture.profile ?? {
        userId: "U1234567890",
        displayName: "Mock User",
      };
    });
    liffMock.getIDToken.mockImplementation(() => getCurrentLiffFixture().idToken ?? null);
    liffMock.getAccessToken.mockImplementation(() => getCurrentLiffFixture().accessToken ?? null);
    liffMock.login.mockResolvedValue(undefined);
    liffMock.logout.mockImplementation(() => undefined);
    liffMock.shareTargetPicker.mockResolvedValue({ status: "success" });
    liffMock.scanCode.mockResolvedValue({ value: "mock-qr" });
    liffMock.openWindow.mockResolvedValue(undefined);
    liffMock.getContext.mockReturnValue({ type: "utou" });
    liffMock.isInClient.mockImplementation(() => Boolean(getCurrentLiffFixture().isInClient));
    liffMock.closeWindow.mockImplementation(() => undefined);
    liffMock.getLanguage.mockReturnValue("zh-TW");
    liffMock.getVersion.mockReturnValue("2.0.0");
    liffMock.getOS.mockReturnValue("ios");
    liffMock.getLineVersion.mockReturnValue("14.0.0");
    liffMock.getFriendship.mockResolvedValue({ friendFlag: true });
    resetLiffServiceState();
  });

${AUTOGEN_START}
${items.map((item) => buildLiffServiceCaseBlock(item, serviceExportName)).join("\n\n")}
${AUTOGEN_END}

${MANUAL_START}
// custom cases
${MANUAL_END}
});

function resetLiffServiceState() {
  const state = ${serviceExportName} as unknown as {
    isInitialized: boolean
    isLoggedIn: boolean
    initializingPromise: Promise<boolean> | null
  };
  state.isInitialized = false;
  state.isLoggedIn = false;
  state.initializingPromise = null;
}
`;
}

function buildLiffServiceCaseBlock(item, serviceExportName) {
  if (item.scenarioType === "success") {
    return `it("${item.title}", async () => {
  // Priority: ${item.priority ?? "P2"} | Failure mode: ${item.failureMode ?? "none"}
  applyLiffFixture("${item.fixture}");

  await expect(${serviceExportName}.initialize()).resolves.toBe(true);

  expect(${serviceExportName}.isUserLoggedIn()).toBe(true);
  expect(liffMock.init).toHaveBeenCalledWith(expect.objectContaining({
    liffId: expect.any(String),
    withLoginOnExternalBrowser: true,
  }));
});`;
  }

  if (item.failureMode === "liff_init_failed" || item.scenarioId === "S04" || item.fixture === "initFailed") {
    return `it("${item.title}", async () => {
  // Priority: ${item.priority ?? "P2"} | Failure mode: ${item.failureMode ?? "liff_init_failed"}
  applyLiffFixture("${item.fixture}");

  await expect(${serviceExportName}.initialize()).rejects.toThrow();
  expect(liffMock.init).toHaveBeenCalled();
  expect(logServiceMock.error).toHaveBeenCalled();
});`;
  }

  if (item.scenarioType === "failure") {
    return `it("${item.title}", async () => {
  // Priority: ${item.priority ?? "P2"} | Failure mode: ${item.failureMode ?? "api_error"}
  applyLiffFixture("${item.fixture}");
  const state = ${serviceExportName} as unknown as { isInitialized: boolean; isLoggedIn: boolean };
  state.isInitialized = true;
  state.isLoggedIn = true;

  await expect(${serviceExportName}.getUserProfile()).rejects.toThrow("Failed to load profile");
  expect(logServiceMock.error).toHaveBeenCalled();
});`;
  }

  return `it("${item.title}", async () => {
  // Priority: ${item.priority ?? "P2"} | Failure mode: ${item.failureMode ?? "state_conflict"}
  applyLiffFixture("${item.fixture}");
  const state = ${serviceExportName} as unknown as { isInitialized: boolean; isLoggedIn: boolean };
  state.isInitialized = true;
  state.isLoggedIn = true;

  await expect(${serviceExportName}.getIdToken()).resolves.toBeNull();
});`;
}

export function buildLineServiceTestContent(relativePath, items, sourceFile, deps) {
  const {
    TOOL_SIGNATURE,
    AUTOGEN_START,
    AUTOGEN_END,
    MANUAL_START,
    MANUAL_END,
    buildRelativeImportPath,
    deriveServiceExportName,
    inferLiffCompanionSourceFile,
  } = deps;
  const applyFixtureImportPath = buildRelativeImportPath(relativePath, "testing/liff/applyFixture");
  const resetFixtureImportPath = buildRelativeImportPath(relativePath, "testing/liff/resetFixture");
  const lineServiceImportPath = buildRelativeImportPath(relativePath, sourceFile.replace(/\.[^.]+$/, ""));
  const liffServiceSourceFile = inferLiffCompanionSourceFile(items, sourceFile);
  const liffServiceImportPath = buildRelativeImportPath(relativePath, liffServiceSourceFile.replace(/\.[^.]+$/, ""));
  const lineServiceExportName = deriveServiceExportName(sourceFile);
  const liffServiceExportName = deriveServiceExportName(liffServiceSourceFile);

  return `${TOOL_SIGNATURE}
import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyLiffFixture, getCurrentLiffFixture } from "${applyFixtureImportPath}";
import { resetLiffFixture } from "${resetFixtureImportPath}";

const { liffMock, logServiceMock } = vi.hoisted(() => ({
  liffMock: {
    init: vi.fn(),
    isLoggedIn: vi.fn(),
    getProfile: vi.fn(),
    getIDToken: vi.fn(),
    getAccessToken: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    shareTargetPicker: vi.fn(),
    sendMessages: vi.fn(),
    isApiAvailable: vi.fn(),
    getContext: vi.fn(),
    getOS: vi.fn(),
    getLanguage: vi.fn(),
    getAppLanguage: vi.fn(),
  },
  logServiceMock: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@line/liff", () => ({ default: liffMock }));
vi.mock("../logService", () => ({ logService: logServiceMock }));
vi.mock("../../services/logService", () => ({ logService: logServiceMock }));
vi.mock("@/services/logService", () => ({ logService: logServiceMock }));
vi.mock("@/constants/liff", () => ({
  LIFF_CONFIG: {
    LIFF_ID: "mock-liff-id",
  },
}));

import { ${lineServiceExportName} } from "${lineServiceImportPath}";
import { ${liffServiceExportName} } from "${liffServiceImportPath}";

describe("${items[0]?.featureName ?? "Line Service"}", () => {
  beforeEach(() => {
    resetLiffFixture();
    applyLiffFixture("loggedOut");
    vi.clearAllMocks();
    liffMock.init.mockImplementation(async () => undefined);
    liffMock.isLoggedIn.mockImplementation(() => Boolean(getCurrentLiffFixture().isLoggedIn));
    liffMock.getProfile.mockImplementation(async () => {
      const fixture = getCurrentLiffFixture();
      if (fixture.profileError) {
        throw new Error(String(fixture.profileError));
      }
      return fixture.profile ?? {
        userId: "U1234567890",
        displayName: "Mock User",
      };
    });
    liffMock.getIDToken.mockImplementation(() => getCurrentLiffFixture().idToken ?? null);
    liffMock.getAccessToken.mockImplementation(() => getCurrentLiffFixture().accessToken ?? null);
    liffMock.login.mockResolvedValue(undefined);
    liffMock.logout.mockImplementation(() => undefined);
    liffMock.shareTargetPicker.mockResolvedValue({ status: "success" });
    liffMock.sendMessages.mockResolvedValue(undefined);
    liffMock.isApiAvailable.mockReturnValue(true);
    liffMock.getContext.mockReturnValue({ type: "utou" });
    liffMock.getOS.mockReturnValue("ios");
    liffMock.getLanguage.mockReturnValue("zh-TW");
    liffMock.getAppLanguage.mockReturnValue("zh-TW");
    resetLiffServiceState();
    vi.stubGlobal("open", vi.fn(() => ({
      document: {
        write: vi.fn(),
        close: vi.fn(),
      },
    })));
  });

${AUTOGEN_START}
${items.map((item) => buildLineServiceCaseBlock(item, lineServiceExportName, liffServiceExportName)).join("\n\n")}
${AUTOGEN_END}

${MANUAL_START}
// custom cases
${MANUAL_END}
});

function createMockCard() {
  return {
    id: "card-1",
    userId: "user-1",
    name: "Mock User",
    title: "Engineer",
    company: "OpenAI",
    email: "mock@example.com",
    phone: "0912345678",
    isPublic: true,
    isDefault: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function resetLiffServiceState() {
  const state = ${liffServiceExportName} as unknown as {
    isInitialized: boolean
    isLoggedIn: boolean
    initializingPromise: Promise<boolean> | null
  };
  state.isInitialized = false;
  state.isLoggedIn = false;
  state.initializingPromise = null;
}
`;
}

function buildLineServiceCaseBlock(item, lineServiceExportName, liffServiceExportName) {
  if (item.scenarioType === "success") {
    return `it("${item.title}", async () => {
  // Priority: ${item.priority ?? "P2"} | Failure mode: ${item.failureMode ?? "none"}
  applyLiffFixture("${item.fixture}");
  const state = ${liffServiceExportName} as unknown as { isInitialized: boolean; isLoggedIn: boolean };
  state.isInitialized = true;
  state.isLoggedIn = true;

  await expect(${lineServiceExportName}.shareLINEFlexMessage(createMockCard() as never)).resolves.toBeUndefined();
  expect(liffMock.shareTargetPicker).toHaveBeenCalledTimes(1);
});`;
  }

  if (item.scenarioType === "failure") {
    return `it("${item.title}", async () => {
  // Priority: ${item.priority ?? "P2"} | Failure mode: ${item.failureMode ?? "api_error"}
  applyLiffFixture("${item.fixture}");

  await expect(${lineServiceExportName}.getLineProfile()).resolves.toBeNull();
});`;
  }

  return `it("${item.title}", () => {
  // Priority: ${item.priority ?? "P2"} | Failure mode: ${item.failureMode ?? "external_app_unavailable"}
  liffMock.getOS.mockImplementation(() => {
    throw new Error("env unavailable");
  });

  expect(${lineServiceExportName}.getEnvironment()).toBe("external");
  expect(logServiceMock.error).toHaveBeenCalled();
});`;
}
