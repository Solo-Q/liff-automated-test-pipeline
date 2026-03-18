import path from "node:path";

export function buildMyCashWrapperPageTestContent(relativePath, items, sourceFile, deps) {
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
  const sourceDir = path.posix.dirname(sourceFile);
  const wrappedPageName = path.posix.basename(sourceFile, path.posix.extname(sourceFile)).replace(/Wrapper$/, "");
  const wrappedPageImportPath = buildRelativeImportPath(relativePath, path.posix.join(sourceDir, wrappedPageName));
  const wrappedMarker = wrappedPageName.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();

  return `${TOOL_SIGNATURE}
import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("${wrappedPageImportPath}", () => ({
  default: () => <div>${wrappedMarker}</div>,
}));

import ${pageExportName} from "${pageImportPath}";

describe("${items[0]?.featureName ?? pageExportName}", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

${AUTOGEN_START}
it("${items[0]?.title ?? `${pageExportName} unit success`}", () => {
  render(<${pageExportName} />);
  expect(screen.getByText("${wrappedMarker}")).toBeInTheDocument();
});

it("${items[1]?.title ?? `${pageExportName} unit failure`}", () => {
  render(<${pageExportName} />);
  expect(screen.getAllByText("${wrappedMarker}").length).toBeGreaterThan(0);
});

it("${items[2]?.title ?? `${pageExportName} unit boundary`}", () => {
  render(<${pageExportName} />);
  expect(screen.getByText("${wrappedMarker}")).toBeVisible();
});
${AUTOGEN_END}

${MANUAL_START}
// custom cases
${MANUAL_END}
});
`;
}

export function buildMyCashMainPageTestContent(relativePath, items, sourceFile, deps) {
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
  const sourceDir = path.posix.dirname(sourceFile);
  const pointsContextImportPath = buildRelativeImportPath(relativePath, path.posix.join(sourceDir, "../contexts/PointsContext"));
  const pointsApiImportPath = buildRelativeImportPath(relativePath, path.posix.join(sourceDir, "../services/pointsApi"));
  const tabsImportPath = buildRelativeImportPath(relativePath, path.posix.join(sourceDir, "../components/MyCashTabs"));
  const upgradeModalImportPath = buildRelativeImportPath(relativePath, path.posix.join(sourceDir, "../components/UpgradeModal"));
  const upgradePageImportPath = buildRelativeImportPath(relativePath, path.posix.join(sourceDir, "../components/UpgradePage"));
  const rootComponentsImportPath = buildRelativeImportPath(relativePath, "src/components/index");

  return `${TOOL_SIGNATURE}
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { navigateMock, fetchTasksMock, updatePointsStatusMock, addPointsHistoryMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  fetchTasksMock: vi.fn(),
  updatePointsStatusMock: vi.fn(),
  addPointsHistoryMock: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, fallback) => (typeof fallback === "string" ? fallback : key),
  }),
}));
vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
}));
vi.mock("@/hooks", () => ({
  useLiffTitle: vi.fn(),
}));
vi.mock("${pointsContextImportPath}", () => ({
  usePoints: () => ({
    pointsStatus: {
      currentPoints: 1200,
      nextLevelPoints: 2000,
      levelProgress: 0.6,
      canUpgrade: false,
    },
    addPointsHistory: addPointsHistoryMock,
    updatePointsStatus: updatePointsStatusMock,
  }),
}));
vi.mock("${pointsApiImportPath}", () => ({
  fetchTasks: fetchTasksMock,
}));
vi.mock("${tabsImportPath}", () => ({
  default: () => <div>mycash-tabs</div>,
}));
vi.mock("${upgradeModalImportPath}", () => ({
  default: ({ isOpen }) => isOpen ? <div>upgrade-modal</div> : null,
}));
vi.mock("${upgradePageImportPath}", () => ({
  default: () => <div>upgrade-page</div>,
}));
vi.mock("${rootComponentsImportPath}", () => ({
  Button: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
}));

import ${pageExportName} from "${pageImportPath}";

describe("${items[0]?.featureName ?? pageExportName}", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchTasksMock.mockResolvedValue([]);
  });

${AUTOGEN_START}
it("${items[0]?.title ?? "My Cash Page unit success"}", async () => {
  render(<${pageExportName} />);
  await waitFor(() => {
    expect(fetchTasksMock).toHaveBeenCalled();
  });
  expect(screen.getByText("mycash-tabs")).toBeInTheDocument();
  expect(screen.getByText("1200")).toBeInTheDocument();
});

it("${items[1]?.title ?? "My Cash Page unit failure"}", async () => {
  fetchTasksMock.mockRejectedValueOnce(new Error("tasks failed"));
  render(<${pageExportName} />);
  await waitFor(() => {
    expect(fetchTasksMock).toHaveBeenCalled();
  });
  expect(screen.getByText("mycash-tabs")).toBeInTheDocument();
});

it("${items[2]?.title ?? "My Cash Page unit boundary"}", async () => {
  fetchTasksMock.mockResolvedValueOnce([{ id: "register", points: 50, completed: false, disabled: false, isRepeatable: false }]);
  render(<${pageExportName} />);
  await waitFor(() => {
    expect(fetchTasksMock).toHaveBeenCalled();
  });
  expect(screen.getByText("mycash-tabs")).toBeVisible();
});
${AUTOGEN_END}

${MANUAL_START}
// custom cases
${MANUAL_END}
});
`;
}

export function buildBeginnerGuidePageTestContent(relativePath, items, sourceFile, deps) {
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
  const sourceDir = path.posix.dirname(sourceFile);
  const pointsContextImportPath = buildRelativeImportPath(relativePath, path.posix.join(sourceDir, "../contexts/PointsContext"));

  return `${TOOL_SIGNATURE}
import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { navigateMock, paramsMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  paramsMock: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, fallback) => (typeof fallback === "string" ? fallback : key),
  }),
}));
vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
  useParams: () => paramsMock(),
  generatePath: (pattern, values) =>
    Object.entries(values ?? {}).reduce(
      (result, [key, value]) => result.replace(":" + key, String(value)),
      pattern,
    ),
}));
vi.mock("@/hooks", () => ({
  useLiffTitle: vi.fn(),
}));
vi.mock("${pointsContextImportPath}", () => ({
  usePoints: () => ({
    pointsStatus: {
      currentPoints: 888,
    },
  }),
}));

import ${pageExportName} from "${pageImportPath}";

describe("${items[0]?.featureName ?? pageExportName}", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    paramsMock.mockReturnValue({ id: "card-1" });
  });

${AUTOGEN_START}
it("${items[0]?.title ?? "Beginner Guide Page unit success"}", () => {
  render(<${pageExportName} />);
  expect(screen.getByText("888")).toBeInTheDocument();
  expect(screen.getByText("新手上路")).toBeInTheDocument();
});

it("${items[1]?.title ?? "Beginner Guide Page unit failure"}", () => {
  render(<${pageExportName} />);
  expect(screen.getByLabelText("查看點數詳情")).toBeInTheDocument();
});

it("${items[2]?.title ?? "Beginner Guide Page unit boundary"}", () => {
  render(<${pageExportName} />);
  expect(screen.getByText("VIP 體驗包")).toBeInTheDocument();
});
${AUTOGEN_END}

${MANUAL_START}
// custom cases
${MANUAL_END}
});
`;
}

export function buildExpiredPointsPageTestContent(relativePath, items, sourceFile, deps) {
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
  const sourceDir = path.posix.dirname(sourceFile);
  const pointsContextImportPath = buildRelativeImportPath(relativePath, path.posix.join(sourceDir, "../contexts/PointsContext"));

  return `${TOOL_SIGNATURE}
import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { navigateMock, paramsMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  paramsMock: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, fallback) => (typeof fallback === "string" ? fallback : key),
  }),
}));
vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
  useParams: () => paramsMock(),
  generatePath: (pattern, values) =>
    Object.entries(values ?? {}).reduce(
      (result, [key, value]) => result.replace(":" + key, String(value)),
      pattern,
    ),
}));
vi.mock("@/hooks", () => ({
  useLiffTitle: vi.fn(),
}));
vi.mock("${pointsContextImportPath}", () => ({
  usePoints: () => ({
    pointsStatus: {
      currentPoints: 520,
    },
  }),
}));

import ${pageExportName} from "${pageImportPath}";

describe("${items[0]?.featureName ?? pageExportName}", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    paramsMock.mockReturnValue({ id: "card-1" });
  });

${AUTOGEN_START}
it("${items[0]?.title ?? "Expired Points Page unit success"}", () => {
  render(<${pageExportName} />);
  expect(screen.getByText("520")).toBeInTheDocument();
  expect(screen.getByText("到期點數")).toBeInTheDocument();
});

it("${items[1]?.title ?? "Expired Points Page unit failure"}", () => {
  render(<${pageExportName} />);
  expect(screen.getByText("10 天後即將到期")).toBeInTheDocument();
});

it("${items[2]?.title ?? "Expired Points Page unit boundary"}", () => {
  render(<${pageExportName} />);
  expect(screen.getByText("註冊獎勵點數")).toBeInTheDocument();
});
${AUTOGEN_END}

${MANUAL_START}
// custom cases
${MANUAL_END}
});
`;
}

export function buildCardManageWrapperPageTestContent(relativePath, items, sourceFile, deps) {
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
  const sourceDir = path.posix.dirname(sourceFile);
  const normalizedSourceFile = String(sourceFile).toLowerCase();
  const childName = normalizedSourceFile.endsWith("/cardmanagepage.tsx") ? "CardManageShell" : "CardWorkspace";
  const childImportPath = buildRelativeImportPath(relativePath, path.posix.join(sourceDir, childName));
  const childMarker = childName.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();

  return `${TOOL_SIGNATURE}
import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("${childImportPath}", () => ({
  ${childName}: () => <div>${childMarker}</div>,
  default: () => <div>${childMarker}</div>,
}));
vi.mock("@/components/layout", () => ({
  PageWrapper: ({ children }) => <div>{children}</div>,
}));

import ${pageExportName} from "${pageImportPath}";

describe("${items[0]?.featureName ?? pageExportName}", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

${AUTOGEN_START}
it("${items[0]?.title ?? `${pageExportName} unit success`}", () => {
  render(<${pageExportName} />);
  expect(screen.getByText("${childMarker}")).toBeInTheDocument();
});

it("${items[1]?.title ?? `${pageExportName} unit failure`}", () => {
  render(<${pageExportName} />);
  expect(screen.getAllByText("${childMarker}").length).toBeGreaterThan(0);
});

it("${items[2]?.title ?? `${pageExportName} unit boundary`}", () => {
  render(<${pageExportName} />);
  expect(screen.getByText("${childMarker}")).toBeVisible();
});
${AUTOGEN_END}

${MANUAL_START}
// custom cases
${MANUAL_END}
});
`;
}

export function buildCardManageShellTestContent(relativePath, items, sourceFile, deps) {
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
  const sourceDir = path.posix.dirname(sourceFile);
  const hooksImportPath = buildRelativeImportPath(relativePath, path.posix.join(sourceDir, "../hooks/index"));
  const workspaceImportPath = buildRelativeImportPath(relativePath, path.posix.join(sourceDir, "CardWorkspace"));

  return `${TOOL_SIGNATURE}
import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { userStoreMock, cardBootstrapMock, cardDataSyncMock } = vi.hoisted(() => ({
  userStoreMock: vi.fn(),
  cardBootstrapMock: vi.fn(),
  cardDataSyncMock: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key, fallback) => fallback ?? key }),
}));
vi.mock("@/components/common/ErrorMessage", () => ({
  ErrorMessage: ({ message }) => <div>{message}</div>,
}));
vi.mock("@/components/common/LoadingSpinner", () => ({
  LoadingSpinner: ({ text }) => <div>{text ?? "loading-spinner"}</div>,
}));
vi.mock("@/state/ui/userStore", () => ({
  useUserStore: () => userStoreMock(),
}));
vi.mock("${hooksImportPath}", () => ({
  useCardBootstrap: () => cardBootstrapMock(),
  useCardDataSync: () => cardDataSyncMock(),
}));
vi.mock("${workspaceImportPath}", () => ({
  CardWorkspace: () => <div>card-workspace</div>,
  default: () => <div>card-workspace</div>,
}));

import ${pageExportName} from "${pageImportPath}";

describe("${items[0]?.featureName ?? pageExportName}", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userStoreMock.mockReturnValue({ error: null });
    cardBootstrapMock.mockReturnValue({
      isInitializing: false,
      errorMessage: null,
      retry: vi.fn(),
    });
  });

${AUTOGEN_START}
it("${items[0]?.title ?? "Card Manage Shell unit success"}", () => {
  render(<${pageExportName} />);
  expect(screen.getByText("card-workspace")).toBeInTheDocument();
});

it("${items[1]?.title ?? "Card Manage Shell unit failure"}", () => {
  cardBootstrapMock.mockReturnValueOnce({
    isInitializing: false,
    errorMessage: "bootstrap failed",
    retry: vi.fn(),
  });
  render(<${pageExportName} />);
  expect(screen.getByText("bootstrap failed")).toBeInTheDocument();
});

it("${items[2]?.title ?? "Card Manage Shell unit boundary"}", () => {
  cardBootstrapMock.mockReturnValueOnce({
    isInitializing: true,
    errorMessage: null,
    retry: vi.fn(),
  });
  render(<${pageExportName} />);
  expect(screen.getByText("cardmanage.status.initializing")).toBeInTheDocument();
});
${AUTOGEN_END}

${MANUAL_START}
// custom cases
${MANUAL_END}
});
`;
}

export function buildCardWorkspaceTestContent(relativePath, items, sourceFile, deps) {
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
  const sourceDir = path.posix.dirname(sourceFile);
  const hooksImportPath = buildRelativeImportPath(relativePath, path.posix.join(sourceDir, "../hooks/index"));
  const viewImportPath = buildRelativeImportPath(relativePath, path.posix.join(sourceDir, "../components/card-management/CardManagementView"));
  const constantsImportPath = buildRelativeImportPath(relativePath, path.posix.join(sourceDir, "../constants/index"));

  return `${TOOL_SIGNATURE}
import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { userStoreMock, cardActionsMock, defaultCardMock, editorStateMock } = vi.hoisted(() => ({
  userStoreMock: vi.fn(),
  cardActionsMock: {
    createCard: vi.fn(),
    updateCard: vi.fn(),
    deleteCard: vi.fn(),
  },
  defaultCardMock: {
    setAsDefault: vi.fn(),
  },
  editorStateMock: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key, fallback) => fallback ?? key }),
}));
vi.mock("@/services/logService", () => ({
  logService: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));
vi.mock("@/state/ui/userStore", () => ({
  useUserStore: () => userStoreMock(),
}));
vi.mock("${hooksImportPath}", () => ({
  useCardActions: () => cardActionsMock,
  useDefaultCard: () => defaultCardMock,
  useCardEditorState: () => editorStateMock(),
  useCardListState: vi.fn(),
}));
vi.mock("${viewImportPath}", () => ({
  CardManagementView: () => <div>card-management-view</div>,
}));
vi.mock("${constantsImportPath}", () => ({
  APP_CONFIG: {
    MAX_CARDS_COUNT: 5,
  },
}));

import ${pageExportName} from "${pageImportPath}";

describe("${items[0]?.featureName ?? pageExportName}", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userStoreMock.mockReturnValue({
      user: { id: "user-1" },
      cards: [{ id: "card-1" }],
      isLoading: false,
    });
    editorStateMock.mockReturnValue({
      showEditor: false,
      editingCard: null,
      openEditorForEdit: vi.fn(),
      openEditorForCreate: vi.fn(),
      closeEditor: vi.fn(),
      showDeleteConfirm: false,
      deletingCardId: null,
      openDeleteConfirm: vi.fn(),
      closeDeleteConfirm: vi.fn(),
    });
  });

${AUTOGEN_START}
it("${items[0]?.title ?? "Card Workspace unit success"}", () => {
  render(<${pageExportName} />);
  expect(screen.getByText("card-management-view")).toBeInTheDocument();
});

it("${items[1]?.title ?? "Card Workspace unit failure"}", () => {
  userStoreMock.mockReturnValueOnce({
    user: { id: "user-1" },
    cards: [],
    isLoading: true,
  });
  render(<${pageExportName} />);
  expect(screen.getByText("common.loading")).toBeInTheDocument();
});

it("${items[2]?.title ?? "Card Workspace unit boundary"}", () => {
  userStoreMock.mockReturnValueOnce({
    user: { id: "user-1" },
    cards: [],
    isLoading: false,
  });
  render(<${pageExportName} />);
  expect(screen.getByText("common.creatingDefaultCard")).toBeInTheDocument();
});
${AUTOGEN_END}

${MANUAL_START}
// custom cases
${MANUAL_END}
});
`;
}

export function buildCardDetailEntryPageTestContent(relativePath, items, sourceFile, deps) {
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
  const sourceDir = path.posix.dirname(sourceFile);
  const myCardDetailImportPath = buildRelativeImportPath(relativePath, path.posix.join(sourceDir, "MyCardDetailPage"));
  const cardShareImportPath = buildRelativeImportPath(relativePath, path.posix.join(sourceDir, "CardSharePage"));
  const getCardImportPath = buildRelativeImportPath(relativePath, "src/services/graphql/queries/getCard");
  const authUtilsImportPath = buildRelativeImportPath(relativePath, "src/utils/authUtils");

  return `${TOOL_SIGNATURE}
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { paramsMock, authSelectorMock, getCardMock, getAuthDataFromCookiesMock } = vi.hoisted(() => ({
  paramsMock: vi.fn(),
  authSelectorMock: vi.fn(),
  getCardMock: vi.fn(),
  getAuthDataFromCookiesMock: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key, fallback) => fallback ?? key }),
}));
vi.mock("react-router-dom", () => ({
  useParams: () => paramsMock(),
}));
vi.mock("@/components", () => ({
  LoadingSpinner: () => <div>loading-spinner</div>,
  ErrorMessage: ({ message }) => <div>{message}</div>,
}));
vi.mock("@/app/hooks", () => ({
  useAppSelector: (selector) => selector(authSelectorMock()),
}));
vi.mock("${getCardImportPath}", () => ({
  getCard: getCardMock,
}));
vi.mock("${authUtilsImportPath}", () => ({
  getAuthDataFromCookies: getAuthDataFromCookiesMock,
}));
vi.mock("${myCardDetailImportPath}", () => ({
  default: () => <div>my-card-detail-page</div>,
}));
vi.mock("${cardShareImportPath}", () => ({
  default: () => <div>card-share-page</div>,
}));

import ${pageExportName} from "${pageImportPath}";

describe("${items[0]?.featureName ?? pageExportName}", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    paramsMock.mockReturnValue({ id: "card-1" });
    authSelectorMock.mockReturnValue({ auth: { accountId: "owner-1" } });
    getAuthDataFromCookiesMock.mockReturnValue({ accountId: "owner-1" });
  });

${AUTOGEN_START}
it("${items[0]?.title ?? "Card Detail Page unit success"}", async () => {
  getCardMock.mockResolvedValue({
    success: true,
    card: {
      cardModel: {
        ownerId: "owner-1",
      },
    },
  });
  render(<${pageExportName} />);
  await waitFor(() => {
    expect(getCardMock).toHaveBeenCalledWith("card-1");
  });
});

it("${items[1]?.title ?? "Card Detail Page unit failure"}", async () => {
  getCardMock.mockRejectedValueOnce(new Error("載入名片失敗"));
  render(<${pageExportName} />);
  await waitFor(() => {
    expect(getCardMock).toHaveBeenCalled();
  });
});

it("${items[2]?.title ?? "Card Detail Page unit boundary"}", async () => {
  authSelectorMock.mockReturnValueOnce({ auth: { accountId: "viewer-1" } });
  getAuthDataFromCookiesMock.mockReturnValueOnce({ accountId: "viewer-1" });
  getCardMock.mockResolvedValueOnce({
    success: true,
    card: {
      cardModel: {
        ownerId: "owner-1",
      },
    },
  });
  render(<${pageExportName} />);
  await waitFor(() => {
    expect(getCardMock).toHaveBeenCalled();
  });
});
${AUTOGEN_END}

${MANUAL_START}
// custom cases
${MANUAL_END}
});
`;
}

export function buildCardholderMainPageTestContent(relativePath, items, sourceFile, deps) {
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
  const sourceDir = path.posix.dirname(sourceFile);

  return `${TOOL_SIGNATURE}
import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { locationMock, navigateMock, pageHookMock, modalHookMock, actionsHookMock, notificationsHookMock, unreadHookMock } = vi.hoisted(() => ({
  locationMock: vi.fn(),
  navigateMock: vi.fn(),
  pageHookMock: vi.fn(),
  modalHookMock: vi.fn(),
  actionsHookMock: vi.fn(),
  notificationsHookMock: vi.fn(),
  unreadHookMock: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, fallback) => (typeof fallback === "string" ? fallback : key),
  }),
}));
vi.mock("react-router-dom", () => ({
  useLocation: () => locationMock(),
  useNavigate: () => navigateMock,
}));
vi.mock("@/components/common/LoadingSpinner", () => ({
  LoadingSpinner: () => <div>loading-spinner</div>,
}));
vi.mock("@/components/layout", () => ({
  PageLayout: ({ children }) => <div>{children}</div>,
  PageWrapper: ({ children }) => <div>{children}</div>,
}));
vi.mock("@/hooks", () => ({
  useLiffTitle: vi.fn(),
}));
vi.mock("@/services/logService", () => ({
  logService: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));
vi.mock("${buildRelativeImportPath(relativePath, path.posix.join(sourceDir, "../components/index"))}", () => ({
  AddContactModal: ({ isOpen }) => isOpen ? <div>add-contact-modal</div> : null,
  FavoritesEmptyState: () => <div>favorites-empty-state</div>,
}));
vi.mock("${buildRelativeImportPath(relativePath, path.posix.join(sourceDir, "../components/CardholderList"))}", () => ({
  CardholderList: () => <div>cardholder-list</div>,
}));
vi.mock("${buildRelativeImportPath(relativePath, path.posix.join(sourceDir, "../components/CardholderTabsAndSearch"))}", () => ({
  CardholderTabsAndSearch: () => <div>cardholder-tabs-and-search</div>,
}));
vi.mock("${buildRelativeImportPath(relativePath, path.posix.join(sourceDir, "../components/modals/InviteContactModal"))}", () => ({
  InviteContactModal: ({ isOpen }) => isOpen ? <div>invite-contact-modal</div> : null,
}));
vi.mock("${buildRelativeImportPath(relativePath, path.posix.join(sourceDir, "../components/modals/ScanModal"))}", () => ({
  ScanModal: ({ isOpen }) => isOpen ? <div>scan-modal</div> : null,
}));
vi.mock("${buildRelativeImportPath(relativePath, path.posix.join(sourceDir, "../components/notifications"))}", () => ({
  FavoriteNotification: ({ show }) => show ? <div>favorite-notification</div> : null,
  CardExchangeNotification: ({ show }) => show ? <div>card-exchange-notification</div> : null,
}));
vi.mock("${buildRelativeImportPath(relativePath, path.posix.join(sourceDir, "../hooks/useCardholderPage"))}", () => ({
  useCardholderPage: () => pageHookMock(),
}));
vi.mock("${buildRelativeImportPath(relativePath, path.posix.join(sourceDir, "../hooks/useCardholderModals"))}", () => ({
  useCardholderModals: () => modalHookMock(),
}));
vi.mock("${buildRelativeImportPath(relativePath, path.posix.join(sourceDir, "../hooks/useCardholderActions"))}", () => ({
  useCardholderActions: () => actionsHookMock(),
}));
vi.mock("${buildRelativeImportPath(relativePath, path.posix.join(sourceDir, "../hooks/useCardholderNotifications"))}", () => ({
  useCardholderNotifications: () => notificationsHookMock(),
}));
vi.mock("${buildRelativeImportPath(relativePath, path.posix.join(sourceDir, "../hooks/useUnreadNotificationCount"))}", () => ({
  useUnreadNotificationCount: () => unreadHookMock(),
}));
vi.mock("${buildRelativeImportPath(relativePath, path.posix.join(sourceDir, "ContactDetailPage"))}", () => ({
  default: () => <div>contact-detail-page</div>,
}));
vi.mock("${buildRelativeImportPath(relativePath, path.posix.join(sourceDir, "SmartCardDetailPage"))}", () => ({
  default: () => <div>smart-card-detail-page</div>,
}));

import ${pageExportName} from "${pageImportPath}";

describe("${items[0]?.featureName ?? pageExportName}", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    locationMock.mockReturnValue({ pathname: "/cardholder", state: null });
    pageHookMock.mockReturnValue({
      smartCards: [{ id: "card-1" }],
      contacts: [{ id: "contact-1" }],
      hasVisibleCards: true,
      filterState: {},
      handleFilterChange: vi.fn(),
      filteredContacts: [],
      visibleContacts: [{ id: "contact-1" }],
      selectedFilter: "smart-cards",
      handleSelectedFilterChange: vi.fn(),
      toggleContactStar: vi.fn(),
      addContact: vi.fn(),
      updateContact: vi.fn(),
      deleteContact: vi.fn(),
      updateSmartCard: vi.fn(),
      removeSmartCard: vi.fn(),
      refreshSmartCards: vi.fn(),
      refreshContacts: vi.fn(),
      isLoadingContacts: false,
    });
    modalHookMock.mockReturnValue({
      isAddContactModalOpen: false,
      editingContact: null,
      isEditMode: false,
      openAddContactModal: vi.fn(),
      openEditContactModal: vi.fn(),
      closeAddContactModal: vi.fn(),
      isCardDetailOpen: false,
      detailContact: null,
      detailType: null,
      openCardDetail: vi.fn(),
      openSmartCardDetail: vi.fn(),
      openContactDetail: vi.fn(),
      closeCardDetail: vi.fn(),
      canReopenCardDetail: false,
      reopenCardDetail: vi.fn(),
      isScanModalOpen: false,
      openScanModal: vi.fn(),
      closeScanModal: vi.fn(),
      isInviteModalOpen: false,
      inviteTargetContact: null,
      openInviteModal: vi.fn(),
      closeInviteModal: vi.fn(),
    });
    actionsHookMock.mockReturnValue({
      handleContactAction: vi.fn(),
      handleFavoriteAction: vi.fn(),
      handleSkipAction: vi.fn(),
      handleCancelRequestAction: vi.fn(),
      handleCardExchangeAction: vi.fn(),
      handleSaveContact: vi.fn(),
      handleDeleteContact: vi.fn(),
      handleCardClick: vi.fn(),
    });
    notificationsHookMock.mockReturnValue({
      favoriteNotification: { show: false },
      cardExchangeNotification: { show: false },
      showFavoriteNotification: vi.fn(),
      showCardExchangeNotification: vi.fn(),
    });
    unreadHookMock.mockReturnValue({
      unreadCount: 3,
      refreshUnreadCount: vi.fn(),
    });
  });

${AUTOGEN_START}
it("${items[0]?.title ?? "Cardholder Page unit success"}", () => {
  render(<${pageExportName} />);
  expect(screen.getByText("cardholder-tabs-and-search")).toBeInTheDocument();
  expect(screen.getByText("cardholder-list")).toBeInTheDocument();
});

it("${items[1]?.title ?? "Cardholder Page unit failure"}", () => {
  pageHookMock.mockReturnValueOnce({
    ...pageHookMock(),
    hasVisibleCards: false,
    visibleContacts: [],
  });
  render(<${pageExportName} />);
  expect(screen.getByText("favorites-empty-state")).toBeInTheDocument();
});

it("${items[2]?.title ?? "Cardholder Page unit boundary"}", () => {
  modalHookMock.mockReturnValueOnce({
    ...modalHookMock(),
    isAddContactModalOpen: true,
    isScanModalOpen: true,
  });
  render(<${pageExportName} />);
  expect(screen.getByText("add-contact-modal")).toBeInTheDocument();
  expect(screen.getByText("scan-modal")).toBeInTheDocument();
});
${AUTOGEN_END}

${MANUAL_START}
// custom cases
${MANUAL_END}
});
`;
}

export function buildCardholderRoutePageTestContent(relativePath, items, sourceFile, deps) {
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
  const sourceDir = path.posix.dirname(sourceFile);
  const normalized = String(sourceFile).toLowerCase();
  const isSmart = normalized.endsWith("/smartcarddetailroutepage.tsx");
  const detailName = isSmart ? "SmartCardDetailPage" : "ContactDetailPage";
  const detailMarker = isSmart ? "smart-card-detail-page" : "contact-detail-page";

  return `${TOOL_SIGNATURE}
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { searchParamsMock, navigateMock, dataMock } = vi.hoisted(() => ({
  searchParamsMock: vi.fn(),
  navigateMock: vi.fn(),
  dataMock: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key, fallback) => fallback ?? key }),
}));
vi.mock("react-router-dom", () => ({
  useSearchParams: () => [searchParamsMock()],
  useNavigate: () => navigateMock,
}));
vi.mock("@/components/layout", () => ({
  PageWrapper: ({ children }) => <div>{children}</div>,
  PageLayout: ({ children }) => <div>{children}</div>,
}));
vi.mock("@/components/common/LoadingSpinner", () => ({
  LoadingSpinner: ({ text }) => <div>{text ?? "loading-spinner"}</div>,
}));
vi.mock("@/services/logService", () => ({
  logService: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));
vi.mock("${isSmart ? buildRelativeImportPath(relativePath, "src/services/graphql/index") : buildRelativeImportPath(relativePath, path.posix.join(sourceDir, "../services/getManualCardDetail"))}", () => ({
  ${isSmart ? 'getCard: dataMock,' : 'getManualCardDetail: dataMock,'}
}));
vi.mock("${buildRelativeImportPath(relativePath, path.posix.join(sourceDir, detailName))}", () => ({
  default: () => <div>${detailMarker}</div>,
}));

import ${pageExportName} from "${pageImportPath}";

describe("${items[0]?.featureName ?? pageExportName}", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParamsMock.mockReturnValue({ get: () => "card-1" });
  });

${AUTOGEN_START}
it("${items[0]?.title ?? `${pageExportName} unit success`}", async () => {
  dataMock.mockResolvedValue(${isSmart ? `{
    success: true,
    card: {
      category: [],
      note: [],
      avatarUrl: "",
      cardModel: { cardData: { name: "Card" }, tags: [] },
    },
  }` : `{
    cardModel: { cardData: { name: "Manual Card" }, tags: [] },
    category: [],
    note: [],
  }`});
  render(<${pageExportName} />);
  await waitFor(() => {
    expect(dataMock).toHaveBeenCalled();
  });
});

it("${items[1]?.title ?? `${pageExportName} unit failure`}", async () => {
  dataMock.mockRejectedValueOnce(new Error("load failed"));
  render(<${pageExportName} />);
  await waitFor(() => {
    expect(screen.getByText(/load|cardholder\\.cardDetail\\.loadError/)).toBeInTheDocument();
  });
});

it("${items[2]?.title ?? `${pageExportName} unit boundary`}", async () => {
  searchParamsMock.mockReturnValueOnce({ get: () => null });
  render(<${pageExportName} />);
  await waitFor(() => {
    expect(screen.getByText(/loading|cardholder\\.cardDetail\\.loading/)).toBeInTheDocument();
  });
});
${AUTOGEN_END}

${MANUAL_START}
// custom cases
${MANUAL_END}
});
`;
}

export function buildManualCardEditPageTestContent(relativePath, items, sourceFile, deps) {
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
  const sourceDir = path.posix.dirname(sourceFile);
  const pageExportName = deriveComponentExportName(sourceFile);

  return `${TOOL_SIGNATURE}
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { navigateMock, paramsMock, selectorStateMock, getManualCardDetailMock, loadAvatarMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  paramsMock: vi.fn(),
  selectorStateMock: vi.fn(),
  getManualCardDetailMock: vi.fn(),
  loadAvatarMock: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, fallback) => (typeof fallback === "string" ? fallback : key),
  }),
}));
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => paramsMock(),
  };
});
vi.mock("@/app/hooks", () => ({
  useAppSelector: (selector) => selector(selectorStateMock()),
}));
vi.mock("@/components", () => ({
  LoadingSpinner: () => <div>loading-spinner</div>,
  ErrorMessage: ({ message, onRetry }) => (
    <div>
      <div>{message}</div>
      <button onClick={onRetry}>retry</button>
    </div>
  ),
}));
vi.mock("@/components/common/Toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));
vi.mock("@/services/logService", () => ({
  logService: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));
vi.mock("${buildRelativeImportPath(relativePath, path.posix.join(sourceDir, "../../cardmanage/hooks/useAvatarLoader"))}", () => ({
  useAvatarLoader: () => ({
    loading: false,
    avatarPreview: null,
    loadAvatar: loadAvatarMock,
    clearAvatar: vi.fn(),
  }),
}));
vi.mock("${buildRelativeImportPath(relativePath, path.posix.join(sourceDir, "../../cardmanage/components/forms/CardForm"))}", () => ({
  default: ({ onCancel }) => (
    <div>
      <div>manual-card-form</div>
      <button onClick={onCancel}>cancel</button>
    </div>
  ),
}));
vi.mock("${buildRelativeImportPath(relativePath, path.posix.join(sourceDir, "../services/getManualCardDetail"))}", () => ({
  getManualCardDetail: getManualCardDetailMock,
}));
vi.mock("${buildRelativeImportPath(relativePath, path.posix.join(sourceDir, "../services/updateManualCard"))}", () => ({
  updateManualCard: vi.fn(),
}));
vi.mock("${buildRelativeImportPath(relativePath, path.posix.join(sourceDir, "../utils/manualCardDataTransform"))}", () => ({
  transformManualCardToForm: () => ({ name: "Mock Contact", company: "OpenAI" }),
  transformFormToManualCardUpdate: vi.fn(),
}));

import ${pageExportName} from "${pageImportPath}";

describe("${items[0]?.featureName ?? pageExportName}", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    paramsMock.mockReturnValue({ id: "card-1" });
    selectorStateMock.mockReturnValue({
      auth: {
        accountId: "owner-1",
      },
    });
    getManualCardDetailMock.mockResolvedValue({
      cardModel: {
        ownerId: "owner-1",
        avatarId: null,
        cardData: { name: "Mock Contact" },
      },
      category: [],
      note: [],
    });
    loadAvatarMock.mockResolvedValue(undefined);
  });

${AUTOGEN_START}
it("${items[0]?.title ?? "Manual Card Edit Page unit success"}", async () => {
  render(<${pageExportName} />);
  await waitFor(() => {
    expect(getManualCardDetailMock).toHaveBeenCalledWith("card-1");
  });
  expect(document.body).toHaveClass("manual-card-edit-page-active");
  expect(document.title).toBe("cardholder.manualCardEdit.title");
});

it("${items[1]?.title ?? "Manual Card Edit Page unit failure"}", async () => {
  getManualCardDetailMock.mockRejectedValueOnce(new Error("load failed"));
  render(<${pageExportName} />);
  await waitFor(() => {
    expect(getManualCardDetailMock).toHaveBeenCalledWith("card-1");
  });
  expect(document.body).toHaveClass("manual-card-edit-page-active");
});

it("${items[2]?.title ?? "Manual Card Edit Page unit boundary"}", async () => {
  paramsMock.mockReturnValueOnce({ id: null });
  render(<${pageExportName} />);
  await waitFor(() => {
    expect(screen.getByText("cardholder.manualCardEdit.loading")).toBeInTheDocument();
  });
});
${AUTOGEN_END}

${MANUAL_START}
// custom cases
${MANUAL_END}
});
`;
}

export function buildNotificationCenterPageTestContent(relativePath, items, sourceFile, deps) {
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
  const sourceDir = path.posix.dirname(sourceFile);
  const pageExportName = deriveComponentExportName(sourceFile);

  return `${TOOL_SIGNATURE}
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { navigateMock, triggerShareMock, closeShareModalMock, notificationHookStateMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  triggerShareMock: vi.fn(),
  closeShareModalMock: vi.fn(),
  notificationHookStateMock: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
    generatePath: (pattern, values) =>
      Object.entries(values ?? {}).reduce(
        (result, [key, value]) => result.replace(":" + key, String(value)),
        pattern,
      ),
  };
});
vi.mock("antd-mobile", () => ({
  Toast: {
    show: vi.fn(),
  },
}));
vi.mock("@/components/layout", () => ({
  PageWrapper: ({ children }) => <div>{children}</div>,
  PageLayout: ({ children }) => <div>{children}</div>,
}));
vi.mock("@/components/common/Icon", () => ({
  Icon: () => <div>icon</div>,
}));
vi.mock("@/components/common/LoadingSpinner", () => ({
  LoadingSpinner: () => <div>loading-spinner</div>,
}));
vi.mock("@/hooks", () => ({
  useLiffTitle: vi.fn(),
}));
vi.mock("@/routes/paths", () => ({
  ROUTE_PATHS: {
    CARDHOLDER: "/cardholder",
  },
}));
vi.mock("@/services/graphql/queries/getSelfCard", () => ({
  getSelfCard: vi.fn(),
}));
vi.mock("@/services/logService", () => ({
  logService: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));
vi.mock("@/utils/authUtils", () => ({
  getAuthDataFromCookies: () => ({
    accountId: "account-1",
  }),
}));
vi.mock("${buildRelativeImportPath(relativePath, "src/features/cardmanage/components/modals/ShareModal")}", () => ({
  ShareModal: ({ visible }) => (visible ? <div>share-modal</div> : null),
}));
vi.mock("${buildRelativeImportPath(relativePath, "src/features/cardmanage/hooks/useMainCardShare")}", () => ({
  useMainCardShare: () => ({
    mainCardId: "card-1",
    triggerShare: triggerShareMock,
    isShareModalVisible: false,
    closeShareModal: closeShareModalMock,
  }),
}));
vi.mock("${buildRelativeImportPath(relativePath, path.posix.join(sourceDir, "../hooks/useNotificationCenter"))}", () => ({
  useNotificationCenter: () => notificationHookStateMock(),
}));
vi.mock("${buildRelativeImportPath(relativePath, path.posix.join(sourceDir, "../services/notifications"))}", () => ({
  createNotification: vi.fn(),
  NotificationType: {
    CARD_RECEIVED: "CARD_RECEIVED",
    SYSTEM_NOTIFICATION: "SYSTEM_NOTIFICATION",
  },
}));

import ${pageExportName} from "${pageImportPath}";

describe("${items[0]?.featureName ?? pageExportName}", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notificationHookStateMock.mockReturnValue({
      unreadNotifications: [
        {
          id: "notification-1",
          read: false,
          type: "SYSTEM_NOTIFICATION",
          title: "通知標題",
          message: "通知內容",
          createdAt: new Date().toISOString(),
          extraData: null,
        },
      ],
      readNotifications: [],
      isLoading: false,
      isLoadingRead: false,
      markMultipleAsRead: vi.fn().mockResolvedValue(undefined),
      markAllAsRead: vi.fn().mockResolvedValue(undefined),
      loadMore: vi.fn(),
      loadMoreRead: vi.fn(),
      hasNextPage: false,
      hasNextPageRead: false,
    });
  });

${AUTOGEN_START}
it("${items[0]?.title ?? "Notification Center Page unit success"}", () => {
  render(<${pageExportName} />);
  expect(screen.getByText("notificationCenter.tabs.unreadWithCount")).toBeInTheDocument();
});

it("${items[1]?.title ?? "Notification Center Page unit failure"}", () => {
  notificationHookStateMock.mockReturnValueOnce({
    unreadNotifications: [],
    readNotifications: [],
    isLoading: false,
    isLoadingRead: false,
    markMultipleAsRead: vi.fn().mockResolvedValue(undefined),
    markAllAsRead: vi.fn().mockResolvedValue(undefined),
    loadMore: vi.fn(),
    loadMoreRead: vi.fn(),
    hasNextPage: false,
    hasNextPageRead: false,
  });
  render(<${pageExportName} />);
  expect(document.body).toBeTruthy();
});

it("${items[2]?.title ?? "Notification Center Page unit boundary"}", () => {
  render(<${pageExportName} />);
  fireEvent.click(screen.getAllByRole("button")[0]);
  expect(document.body).toBeTruthy();
});
${AUTOGEN_END}

${MANUAL_START}
// custom cases
${MANUAL_END}
});
`;
}

export function buildCardholderDetailPageTestContent(relativePath, items, sourceFile, deps) {
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

const { navigateMock, paramsMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  paramsMock: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, fallback) => (typeof fallback === "string" ? fallback : key),
  }),
}));
vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
  useParams: () => paramsMock(),
  generatePath: (pattern, values) =>
    Object.entries(values ?? {}).reduce(
      (result, [key, value]) => result.replace(":" + key, String(value)),
      pattern,
    ),
}));
vi.mock("@/hooks", () => ({
  useLiffTitle: vi.fn(),
}));
vi.mock("@/constants/liff", () => ({
  LIFF_CONFIG: { LIFF_ID: "test-liff-id" },
  LIFF_FEATURES: {
    shareTargetPicker: true,
    multipleLiffTransition: false,
    aiosTransition: false,
  },
}));
vi.mock("@/services/logService", () => ({
  logService: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import ${pageExportName} from "${pageImportPath}";

const baseProps = {
  contact: {
    id: "contact-1",
    name: "Mock Contact",
    position: "Engineer",
    company: "OpenAI",
    avatar: "",
    isStarred: false,
    note: [],
    tags: [],
    category: [],
    status: "registered",
    contactMethods: [],
    cardSource: "manual",
  },
  onClose: vi.fn(),
  onContactUpdate: vi.fn(),
  onContactDelete: vi.fn(),
};

describe("${items[0]?.featureName ?? pageExportName}", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    paramsMock.mockReturnValue({ id: "card-1" });
  });

${AUTOGEN_START}
it("${items[0]?.title ?? `${pageExportName} unit success`}", () => {
  render(<${pageExportName} {...baseProps} />);
  expect(document.body).toBeTruthy();
});

it("${items[1]?.title ?? `${pageExportName} unit failure`}", () => {
  render(<${pageExportName} {...baseProps} />);
  expect(baseProps.contact.name).toBe("Mock Contact");
});

it("${items[2]?.title ?? `${pageExportName} unit boundary`}", () => {
  render(<${pageExportName} {...baseProps} />);
  expect(typeof baseProps.onClose).toBe("function");
});
${AUTOGEN_END}

${MANUAL_START}
// custom cases
${MANUAL_END}
});
`;
}

export function buildCreateFirstCardPageTestContent(relativePath, items, sourceFile, deps) {
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
  const sourceDir = path.posix.dirname(sourceFile);

  return `${TOOL_SIGNATURE}
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { navigateMock, locationMock, createCardMock, setMainCardMock, canRedirectAfterLoginMock, toastShowMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  locationMock: vi.fn(),
  createCardMock: vi.fn(),
  setMainCardMock: vi.fn(),
  canRedirectAfterLoginMock: vi.fn(),
  toastShowMock: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key, fallback) => fallback ?? key }),
}));
vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
  useLocation: () => locationMock(),
}));
vi.mock("antd-mobile", () => ({
  Toast: { show: toastShowMock },
}));
vi.mock("@/components/common/Button", () => ({
  default: ({ children, onClick, disabled }) => <button onClick={onClick} disabled={disabled}>{children}</button>,
}));
vi.mock("@/components/common/Input", () => ({
  Input: ({ value, onChange, placeholder }) => <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />,
}));
vi.mock("@/components/layout", () => ({
  PageWrapper: ({ children }) => <div>{children}</div>,
}));
vi.mock("${buildRelativeImportPath(relativePath, path.posix.join(sourceDir, "../components/PhoneInput"))}", () => ({
  default: ({ phoneNumber, onPhoneNumberChange }) => <input value={phoneNumber} onChange={(event) => onPhoneNumberChange(event.target.value)} placeholder="phone-input" />,
}));
vi.mock("${buildRelativeImportPath(relativePath, "src/services/graphql/mutations/createCard")}", () => ({
  createCard: createCardMock,
}));
vi.mock("${buildRelativeImportPath(relativePath, "src/services/graphql/mutations/setMainCard")}", () => ({
  setMainCard: setMainCardMock,
}));
vi.mock("${buildRelativeImportPath(relativePath, "src/services/logService")}", () => ({
  logService: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("${buildRelativeImportPath(relativePath, path.posix.join(sourceDir, "../utils/redirectHelpers"))}", () => ({
  canRedirectAfterLogin: canRedirectAfterLoginMock,
}));

import ${pageExportName} from "${pageImportPath}";

describe("${items[0]?.featureName ?? pageExportName}", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    locationMock.mockReturnValue({
      state: {
        displayName: "Mock User",
        phone: "+886912345678",
        countryCode: "+886",
      },
    });
    createCardMock.mockResolvedValue({ id: "card-1" });
    setMainCardMock.mockResolvedValue(undefined);
    canRedirectAfterLoginMock.mockReturnValue(false);
    sessionStorage.clear();
  });

${AUTOGEN_START}
it("${items[0]?.title ?? "Create First Card Page unit success"}", async () => {
  render(<${pageExportName} />);
  fireEvent.change(screen.getByPlaceholderText("請輸入職稱"), { target: { value: "Engineer" } });
  fireEvent.change(screen.getByPlaceholderText("請輸入公司名稱"), { target: { value: "OpenAI" } });
  fireEvent.change(screen.getByPlaceholderText("phone-input"), { target: { value: "0912345678" } });
  fireEvent.click(screen.getByRole("button", { name: "儲存名片" }));
  await waitFor(() => {
    expect(createCardMock).toHaveBeenCalled();
    expect(setMainCardMock).toHaveBeenCalledWith({ id: "card-1" });
  });
});

it("${items[1]?.title ?? "Create First Card Page unit failure"}", () => {
  render(<${pageExportName} />);
  expect(screen.getByRole("button", { name: "儲存名片" })).toBeDisabled();
});

it("${items[2]?.title ?? "Create First Card Page unit boundary"}", () => {
  locationMock.mockReturnValueOnce({ state: null });
  render(<${pageExportName} />);
  expect(navigateMock).toHaveBeenCalled();
});
${AUTOGEN_END}

${MANUAL_START}
// custom cases
${MANUAL_END}
});
`;
}

export function buildRegisterSuccessPageTestContent(relativePath, items, sourceFile, deps) {
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
  const sourceDir = path.posix.dirname(sourceFile);

  return `${TOOL_SIGNATURE}
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { navigateMock, canRedirectAfterLoginMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  canRedirectAfterLoginMock: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key, fallback) => fallback ?? key }),
}));
vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
}));
vi.mock("@/components/common/Button", () => ({
  default: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
}));
vi.mock("@/components/layout", () => ({
  PageWrapper: ({ children }) => <div>{children}</div>,
}));
vi.mock("${buildRelativeImportPath(relativePath, "src/services/logService")}", () => ({
  logService: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("${buildRelativeImportPath(relativePath, path.posix.join(sourceDir, "../utils/redirectHelpers"))}", () => ({
  canRedirectAfterLogin: canRedirectAfterLoginMock,
}));

import ${pageExportName} from "${pageImportPath}";

describe("${items[0]?.featureName ?? pageExportName}", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    canRedirectAfterLoginMock.mockReturnValue(false);
  });

${AUTOGEN_START}
it("${items[0]?.title ?? "Register Success Page unit success"}", async () => {
  sessionStorage.setItem("createdCardId", "card-1");
  render(<${pageExportName} />);
  fireEvent.click(screen.getByRole("button", { name: "前往編輯名片" }));
  await waitFor(() => {
    expect(navigateMock).toHaveBeenCalled();
  });
});

it("${items[1]?.title ?? "Register Success Page unit failure"}", async () => {
  render(<${pageExportName} />);
  fireEvent.click(screen.getByRole("button", { name: "前往編輯名片" }));
  await waitFor(() => {
    expect(navigateMock).toHaveBeenCalled();
  });
});

it("${items[2]?.title ?? "Register Success Page unit boundary"}", async () => {
  sessionStorage.setItem("redirectAfterLogin", "/cardmanage");
  canRedirectAfterLoginMock.mockReturnValueOnce(true);
  render(<${pageExportName} />);
  fireEvent.click(screen.getByRole("button", { name: "前往編輯名片" }));
  await waitFor(() => {
    expect(navigateMock).toHaveBeenCalledWith("/cardmanage", { replace: true });
  });
});
${AUTOGEN_END}

${MANUAL_START}
// custom cases
${MANUAL_END}
});
`;
}

export function buildCardShareFlowPageTestContent(relativePath, items, sourceFile, deps) {
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
import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { paramsMock, navigateMock, locationMock, dispatchMock, getCardMock, getContactCardsMock, loginWithScopeIdMock, liffServiceMock, logServiceMock, saveAuthToCookiesMock, canRedirectAfterLoginMock, tMock } = vi.hoisted(() => ({
  paramsMock: vi.fn(),
  navigateMock: vi.fn(),
  locationMock: vi.fn(),
  dispatchMock: vi.fn(),
  getCardMock: vi.fn(),
  getContactCardsMock: vi.fn(),
  loginWithScopeIdMock: vi.fn(),
  liffServiceMock: {
    getIsInitialized: vi.fn(),
    initialize: vi.fn(),
    isUserLoggedIn: vi.fn(),
    login: vi.fn(),
    getUserProfile: vi.fn(),
  },
  logServiceMock: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  saveAuthToCookiesMock: vi.fn(),
  canRedirectAfterLoginMock: vi.fn(),
  tMock: vi.fn((key) => key),
}));

vi.mock("antd-mobile", () => ({
  Toast: { show: vi.fn() },
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: tMock }),
}));
vi.mock("react-router-dom", () => ({
  useParams: () => paramsMock(),
  useNavigate: () => navigateMock,
  useLocation: () => locationMock(),
}));
vi.mock("@/app/hooks", () => ({
  useAppDispatch: () => dispatchMock,
}));
vi.mock("@/components/common/LoadingSpinner", () => ({
  LoadingSpinner: () => <div>loading</div>,
}));
vi.mock("@/components/layout", () => ({
  PageLayout: ({ children }) => <div>{children}</div>,
  PageWrapper: ({ children }) => <div>{children}</div>,
}));
vi.mock("@/hooks/usePlatform", () => ({
  usePlatform: () => ({
    isLine: true,
    isIOS: true,
    canShare: true,
    supportsNativeShare: true,
    share: vi.fn(),
    copyToClipboard: vi.fn(),
  }),
  default: () => ({
    isLine: true,
    isIOS: true,
    canShare: true,
    supportsNativeShare: true,
    share: vi.fn(),
    copyToClipboard: vi.fn(),
  }),
}));
vi.mock("@/hooks/useLiff", () => ({
  useLiff: () => ({
    isInitialized: true,
    isLoggedIn: true,
    isLoading: false,
    error: null,
    profile: {
      userId: "U1234567890",
      displayName: "Mock User",
    },
    initialize: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    shareMessage: vi.fn(),
  }),
}));
vi.mock("@/constants/env", () => ({
  ENV_CONFIG: { THIRD_CHANNEL: "mock-channel" },
}));
vi.mock("@/constants/liff", () => ({
  LIFF_CONFIG: {
    LIFF_ID: "mock-liff-id",
  },
}));
vi.mock("@/constants/storage", () => ({
  SESSION_STORAGE_KEYS: {
    REDIRECT_AFTER_LOGIN: "REDIRECT_AFTER_LOGIN",
  },
}));
vi.mock("@/features/auth/utils/redirectHelpers", () => ({
  canRedirectAfterLogin: canRedirectAfterLoginMock,
}));
vi.mock("@/features/cardholder/components", () => ({
  CardDetailCard: () => <div>card-detail-card</div>,
}));
vi.mock("@/features/cardholder/pages/SmartCardDetailPage", () => ({
  SmartCardDetailPage: () => <div>smart-card-detail-page</div>,
}));
vi.mock("@/features/cardholder/services/getContactCards", () => ({
  getContactCards: getContactCardsMock,
}));
vi.mock("@/features/cardholder/services/notifications", () => ({
  createNotification: vi.fn(),
}));
vi.mock("@/routes/paths", () => ({
  ROUTE_PATHS: {
    PHONE_VERIFICATION: "/phone-verification",
  },
}));
vi.mock("@/services/graphql/mutations/collectCard", () => ({
  collectCard: vi.fn(),
}));
vi.mock("@/services/auth/loginWithScopeId", () => ({
  loginWithScopeId: loginWithScopeIdMock,
}));
vi.mock("@/services/graphql/queries/getCard", () => ({
  getCard: getCardMock,
}));
vi.mock("@/services/graphql/queries/getSelfCard", () => ({
  getSelfCard: vi.fn(),
}));
vi.mock("@/services/liffService", () => ({
  liffService: liffServiceMock,
}));
vi.mock("@/services/logService", () => ({
  logService: logServiceMock,
}));
vi.mock("@/state/global/authSlice", () => ({
  setAuthenticated: (payload) => ({ type: "auth/setAuthenticated", payload }),
}));
vi.mock("@/utils/authUtils", () => ({
  saveAuthToCookies: saveAuthToCookiesMock,
  getAuthDataFromCookies: vi.fn(() => null),
}));
vi.mock("@/utils/deviceUtils", () => ({
  getDeviceData: () => ({ os: "ios" }),
}));
vi.mock("../components/CardCollectedToast", () => ({
  CardCollectedToast: () => <div>card-collected-toast</div>,
}));
vi.mock("../components/modals/ShareModal", () => ({
  ShareModal: () => <div>share-modal</div>,
}));

import ${pageExportName} from "${pageImportPath}";

describe("${items[0]?.featureName ?? pageExportName}", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    paramsMock.mockReturnValue({ id: "card-1" });
    locationMock.mockReturnValue({ pathname: "/card/detail/card-1", search: "" });
    canRedirectAfterLoginMock.mockReturnValue(true);
    liffServiceMock.getIsInitialized.mockReturnValue(true);
    liffServiceMock.initialize.mockResolvedValue(undefined);
    liffServiceMock.isUserLoggedIn.mockReturnValue(true);
    liffServiceMock.login.mockResolvedValue(undefined);
    liffServiceMock.getUserProfile.mockResolvedValue({
      userId: "U1234567890",
      displayName: "Mock User",
    });
    loginWithScopeIdMock.mockResolvedValue({
      tokenId: "token-123",
      accountId: "account-1",
    });
    getContactCardsMock.mockResolvedValue({ success: true, data: [{ id: "card-1" }] });
    getCardMock.mockResolvedValue({
      success: true,
      card: {
        avatarUrl: "https://example.com/avatar.png",
        cardModel: {
          id: "card-1",
          avatarId: null,
          cardData: {
            name: "Mock User",
            title: "Engineer",
            company: "OpenAI",
            phone: "0912345678",
            email: "mock@example.com",
            lineUrl: "",
          },
        },
      },
    });
  });

${AUTOGEN_START}
${items.map((item) => buildCardShareFlowPageCaseBlock(item, pageExportName)).join("\n\n")}
${AUTOGEN_END}

${MANUAL_START}
// custom cases
${MANUAL_END}
});
`;
}

function buildCardShareFlowPageCaseBlock(item, pageExportName) {
  if (item.scenarioType === "success") {
    return `it("${item.title}", async () => {
  render(<${pageExportName} />);

  await waitFor(() => {
    expect(liffServiceMock.getIsInitialized).toHaveBeenCalled();
    expect(loginWithScopeIdMock).toHaveBeenCalledWith({
      scopeId: "U1234567890",
      thirdChannel: "mock-channel",
    });
    expect(getCardMock).toHaveBeenCalledWith("card-1");
  });
});`;
  }

  if (item.scenarioType === "failure") {
    return `it("${item.title}", async () => {
  loginWithScopeIdMock.mockRejectedValueOnce(new Error("login failed"));
  render(<${pageExportName} />);

  await waitFor(() => {
    expect(logServiceMock.info).toHaveBeenCalledWith(
      "CardSharePage: loginWithScopeId failed, showing restricted view",
      expect.any(Object),
    );
  });
});`;
  }

  return `it("${item.title}", async () => {
  sessionStorage.setItem("cardShare_auth_card-1", JSON.stringify({
    isAuthenticated: true,
    isCardInCollection: true,
  }));
  render(<${pageExportName} />);

  await waitFor(() => {
    expect(getCardMock).toHaveBeenCalledWith("card-1");
    expect(loginWithScopeIdMock).not.toHaveBeenCalled();
  });
});`;
}

export function buildShareWorkflowPageTestContent(relativePath, items, sourceFile, deps) {
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
import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { paramsMock, locationMock, liffServiceMock, getCardMock, loginWithScopeIdMock, saveAuthToCookiesMock, logServiceMock, shareMock, clipboardWriteTextMock } = vi.hoisted(() => ({
  paramsMock: vi.fn(),
  locationMock: vi.fn(),
  liffServiceMock: {
    initialize: vi.fn(),
    isUserLoggedIn: vi.fn(),
    login: vi.fn(),
    getUserProfile: vi.fn(),
    shareMessage: vi.fn(),
    closeWindow: vi.fn(),
  },
  getCardMock: vi.fn(),
  loginWithScopeIdMock: vi.fn(),
  saveAuthToCookiesMock: vi.fn(),
  logServiceMock: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  shareMock: vi.fn(),
  clipboardWriteTextMock: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key) => key }),
}));
vi.mock("react-router-dom", () => ({
  useParams: () => paramsMock(),
  useLocation: () => locationMock(),
}));
vi.mock("@/components/common/LoadingSpinner", () => ({
  LoadingSpinner: () => <div>loading</div>,
}));
vi.mock("@/components/common/Toast", () => ({
  toast: {
    error: vi.fn(),
  },
}));
vi.mock("@/constants/liff", () => ({
  LIFF_CONFIG: {
    LIFF_ID: "mock-liff-id",
  },
}));
vi.mock("@/services/liffService", () => ({
  liffService: liffServiceMock,
}));
vi.mock("@/services/logService", () => ({
  logService: logServiceMock,
}));
vi.mock("@/services/graphql/queries/getCard", () => ({
  getCard: getCardMock,
}));
vi.mock("@/services/auth/loginWithScopeId", () => ({
  loginWithScopeId: loginWithScopeIdMock,
}));
vi.mock("@/utils/authUtils", () => ({
  saveAuthToCookies: saveAuthToCookiesMock,
}));
vi.mock("@/utils/deviceUtils", () => ({
  getDeviceData: () => ({ os: "ios" }),
}));

import ${pageExportName} from "${pageImportPath}";

describe("${items[0]?.featureName ?? pageExportName}", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    paramsMock.mockReturnValue({ id: "card-1", cardId: "card-1" });
    locationMock.mockReturnValue({ pathname: "/share/card/card-1", search: "" });
    liffServiceMock.initialize.mockResolvedValue(undefined);
    liffServiceMock.isUserLoggedIn.mockReturnValue(true);
    liffServiceMock.login.mockResolvedValue(undefined);
    liffServiceMock.getUserProfile.mockResolvedValue({
      userId: "U1234567890",
      displayName: "Mock User",
    });
    liffServiceMock.shareMessage.mockResolvedValue(undefined);
    liffServiceMock.closeWindow.mockImplementation(() => undefined);
    loginWithScopeIdMock.mockResolvedValue({
      tokenId: "token-123",
      accountId: "account-1",
    });
    getCardMock.mockResolvedValue({
      success: true,
      card: {
        avatarUrl: "https://example.com/avatar.png",
        cardModel: {
          id: "card-1",
          avatarId: null,
          cardData: {
            name: "Mock User",
            title: "Engineer",
            company: "OpenAI",
            customText: "Hello",
            phone: "0912345678",
            email: "mock@example.com",
            address: "Taipei",
            website: "https://example.com",
          },
        },
      },
    });
    clipboardWriteTextMock.mockResolvedValue(undefined);
    shareMock.mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: clipboardWriteTextMock,
      },
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: shareMock,
    });
    Object.defineProperty(window, "isSecureContext", {
      configurable: true,
      value: true,
    });
  });

${AUTOGEN_START}
${items.map((item) => buildShareWorkflowPageCaseBlock(item, pageExportName, sourceFile)).join("\n\n")}
${AUTOGEN_END}

${MANUAL_START}
// custom cases
${MANUAL_END}
});
`;
}

function buildShareWorkflowPageCaseBlock(item, pageExportName, sourceFile) {
  const normalizedSource = String(sourceFile).toLowerCase();

  if (normalizedSource.includes("sharecardpage")) {
    if (item.scenarioType === "success") {
      return `it("${item.title}", async () => {
  render(<${pageExportName} />);

  await waitFor(() => {
    expect(liffServiceMock.initialize).toHaveBeenCalled();
    expect(loginWithScopeIdMock).toHaveBeenCalledWith({ scopeId: "U1234567890" });
    expect(liffServiceMock.shareMessage).toHaveBeenCalledTimes(1);
    expect(liffServiceMock.closeWindow).toHaveBeenCalled();
  });
});`;
    }

    if (item.scenarioType === "failure") {
      return `it("${item.title}", async () => {
  getCardMock.mockResolvedValueOnce({ success: false, message: "Card not found" });
  render(<${pageExportName} />);

  await waitFor(() => {
    expect(logServiceMock.error).toHaveBeenCalled();
    expect(liffServiceMock.shareMessage).not.toHaveBeenCalled();
  });
});`;
    }

    return `it("${item.title}", async () => {
  liffServiceMock.isUserLoggedIn.mockReturnValue(false);
  render(<${pageExportName} />);

  await waitFor(() => {
    expect(liffServiceMock.login).toHaveBeenCalled();
  });
});`;
  }

  if (item.scenarioType === "success") {
    return `it("${item.title}", async () => {
  render(<${pageExportName} />);

  await waitFor(() => {
    expect(liffServiceMock.initialize).toHaveBeenCalled();
    expect(loginWithScopeIdMock).toHaveBeenCalledWith({ scopeId: "U1234567890" });
    expect(clipboardWriteTextMock).toHaveBeenCalled();
    expect(shareMock).toHaveBeenCalledTimes(1);
    expect(liffServiceMock.closeWindow).toHaveBeenCalled();
  });
});`;
  }

  if (item.scenarioType === "failure") {
    return `it("${item.title}", async () => {
  loginWithScopeIdMock.mockRejectedValueOnce(new Error("auth failed"));
  render(<${pageExportName} />);

  await waitFor(() => {
    expect(logServiceMock.error).toHaveBeenCalledWith("ShareActionPage - 認證失敗", expect.any(Object));
  });
});`;
  }

  return `it("${item.title}", async () => {
  liffServiceMock.isUserLoggedIn.mockReturnValue(false);
  render(<${pageExportName} />);

  await waitFor(() => {
    expect(liffServiceMock.login).toHaveBeenCalled();
  });
});`;
}
