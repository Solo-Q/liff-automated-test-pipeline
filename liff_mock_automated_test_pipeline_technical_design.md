# LIFF Mock 自動化測試生成與執行平台｜完整技術設計書

## 1. 文件資訊

**文件名稱**：LIFF Mock Automated Test Pipeline Technical Design  
**版本**：v1.0  
**狀態**：Draft  
**目的**：設計一套可對目標專案自動分析、補齊 LIFF Mock 能力、生成測試案例、執行測試並輸出報告的自動化平台。

---

## 2. 背景與目標

許多 LIFF 專案在測試上有共同問題：

- `liff.*` 呼叫散落在各處，難以 mock
- 真實 LINE 容器難以穩定重現
- 測試覆蓋偏向 happy path
- 缺少失敗情境與邊界條件驗證
- 無法系統化輸出測試結果與風險分析

本平台的目標是建立一條自動化 pipeline，針對目標 codebase 完成以下工作：

1. 分析專案技術棧與 LIFF 使用情況
2. 檢查是否已安裝 `@line/liff-mock`
3. 若缺少則自動安裝與建立測試基礎設施
4. 萃取 feature 與 LIFF 依賴點
5. 自動生成 unit / integration / E2E 測試案例
6. 執行測試並收集 coverage、log、artifact
7. 輸出測試報告、缺陷分析與建議

---

## 3. 範圍

### 3.1 In Scope

- 前端專案分析
- LIFF 專案識別
- `@line/liff-mock` 自動檢查與安裝
- LIFF 測試 adapter / fixtures 自動建立
- 測試案例生成
- 測試執行 orchestration
- 測試結果彙整與報告輸出
- CI 整合設計

### 3.2 Out of Scope

- 真實 LINE 環境憑證管理
- 真實支付、真實 LINE Login 的正式驗證
- 直接修改複雜商業邏輯以配合測試
- 100% 完全自動理解所有 domain 規則
- 對後端服務進行深度契約測試

---

## 4. 核心原則

### 4.1 測試可信度優先於測試數量
平台產生的測試必須可重現、可維護、可解釋，而不是大量產生但品質不穩定的測試檔。

### 4.2 先標準化 LIFF 測試基礎，再生成測試
若專案內 `liff.*` 散落嚴重，應先建立 adapter 與 fixture 層，再進入測試生成。

### 4.3 每個 feature 必須同時覆蓋成功與失敗情境
由於 LIFF Mock 使用假資料，若只測成功案例將造成錯誤安全感。

### 4.4 E2E 僅覆蓋高風險主流程
E2E 不求量大，而求主流程完整與穩定。

### 4.5 產物必須機器可讀與人工可讀並存
輸出包含 JSON 與 Markdown 報告，以利 CI、自動分析與人工審查。

---

## 5. 使用者與利害關係人

### 5.1 主要使用者
- 前端工程師
- QA / SDET
- 技術主管
- DevOps / CI 維護者

### 5.2 次要使用者
- PM（查看測試範圍與風險）
- 外包/合作團隊（快速接手測試基礎設施）

---

## 6. 需求定義

## 6.1 功能需求

### FR-01：專案分析
系統必須能掃描目標專案，辨識：
- package manager
- framework
- test framework
- TypeScript/JavaScript
- 是否為 monorepo
- 是否使用 LIFF
- 是否已安裝 `@line/liff-mock`
- 是否存在 LIFF adapter

### FR-02：LIFF Mock 檢查與安裝
系統必須能：
- 檢查 `package.json` 是否存在 `@line/liff-mock`
- 檢查 lockfile 是否一致
- 缺少時自動安裝至正確 package/workspace
- 記錄安裝結果與版本

### FR-03：測試基礎層建立
系統必須能自動建立：
- LIFF mock setup 檔
- fixture 集合
- fixture apply/reset helper
- 測試 runner config 片段

### FR-04：Feature 萃取
系統必須能根據 codebase 萃取 feature map，包含：
- feature 名稱
- 相關檔案
- 是否依賴 LIFF
- 風險級別
- 推薦測試層級

### FR-05：測試案例生成
系統必須能為 feature 生成：
- unit test
- integration test
- 高風險 feature 的 E2E test

### FR-06：成功/失敗/邊界情境覆蓋
系統生成測試時需至少覆蓋：
- success
- failure
- boundary / exceptional case

### FR-07：測試執行
系統必須能依序執行：
- lint（可選）
- typecheck（可選）
- unit
- integration
- e2e

### FR-08：測試報告輸出
系統必須輸出：
- Markdown summary
- JSON summary
- coverage summary
- failure analysis
- risk analysis

### FR-09：可重複執行
同一專案多次執行 pipeline 時，應支援：
- 增量分析
- 保留人工修改
- 避免覆蓋手工維護區塊

---

## 6.2 非功能需求

### NFR-01：Determinism
同一組 fixtures 應在相同輸入下產生一致結果。

### NFR-02：Maintainability
生成的測試結構需可由工程師接手維護。

### NFR-03：Extensibility
未來可擴充支援更多前端框架與測試工具。

### NFR-04：Observability
各 stage 執行結果需有結構化 log 與 artifact。

### NFR-05：Safety
對 codebase 的修改需可追蹤、可回滾、可 dry-run。

---

## 7. 系統總覽

整體平台由 6 大子系統組成：

1. **Analyzer**：分析 codebase 與技術棧
2. **Preparer**：安裝依賴、建立測試基礎設施
3. **Feature Extractor**：萃取 feature 與風險點
4. **Test Generator**：生成測試案例與測試檔
5. **Test Runner**：執行各測試層級
6. **Report Builder**：彙整結果並輸出報告

---

## 8. 邏輯架構

```text
CLI / Orchestrator
 ├── Analyzer
 │    ├── Package Scanner
 │    ├── Framework Detector
 │    ├── Liff Usage Detector
 │    └── Test Stack Detector
 ├── Preparer
 │    ├── Dependency Ensurer
 │    ├── Config Patcher
 │    └── Liff Testing Scaffold Builder
 ├── Feature Extractor
 │    ├── Route Scanner
 │    ├── Component Scanner
 │    ├── Liff Call Graph Extractor
 │    └── Risk Scorer
 ├── Test Generator
 │    ├── Unit Generator
 │    ├── Integration Generator
 │    └── E2E Generator
 ├── Test Runner
 │    ├── Unit Runner
 │    ├── Integration Runner
 │    ├── E2E Runner
 │    └── Artifact Collector
 └── Report Builder
      ├── Result Aggregator
      ├── Failure Classifier
      ├── Coverage Aggregator
      └── Markdown/JSON Exporter
```

---

## 9. 執行流程設計

### 9.1 完整 pipeline

```text
[1] analyze
[2] prepare
[3] extract-features
[4] generate-tests
[5] run-tests
[6] build-report
```

### 9.2 CLI 介面

```bash
npx liff-testgen analyze ./target-project
npx liff-testgen prepare ./target-project
npx liff-testgen generate ./target-project
npx liff-testgen run ./target-project
npx liff-testgen report ./target-project
```

### 9.3 一鍵流程

```bash
npx liff-testgen pipeline ./target-project
```

### 9.4 Dry run

```bash
npx liff-testgen pipeline ./target-project --dry-run
```

---

## 10. 各模組詳細設計

## 10.1 Analyzer

### 10.1.1 責任
- 掃描檔案系統
- 解析 package/workspace
- 偵測框架與測試工具
- 偵測 LIFF 使用痕跡
- 偵測目前測試覆蓋現況

### 10.1.2 輸入
- repo path

### 10.1.3 輸出
- `project-profile.json`
- `liff-usage-report.json`
- `existing-test-map.json`

### 10.1.4 偵測規則

#### LIFF 專案判斷條件
符合任一：
- `dependencies` 或 `devDependencies` 含 `@line/liff`
- code 中存在 `from '@line/liff'`
- code 中存在 `liff.init(`
- code 中存在 `liff.getProfile(` 或 `liff.isLoggedIn(`

#### `liff-mock` 已安裝判斷
- `package.json` 中包含 `@line/liff-mock`
- lockfile 中存在相符套件條目

#### adapter 存在判斷
透過檔名與呼叫模式判斷：
- `liffGateway`
- `liffService`
- `services/liff`
- `adapters/liff`
- 集中封裝 `getProfile/isLoggedIn/init/login`

---

## 10.2 Preparer

### 10.2.1 責任
- 安裝缺少依賴
- 建立 `testing/liff` scaffolding
- 注入/建立測試設定檔
- 建立標準 fixtures

### 10.2.2 安裝策略

#### 單專案
直接於 root 安裝

#### Monorepo
先識別實際使用 LIFF 的 package，再安裝到該 workspace

### 10.2.3 Scaffold 檔案結構

```text
src/
  testing/
    liff/
      setupLiffMock.ts
      fixtures.ts
      applyFixture.ts
      resetFixture.ts
      types.ts
```

### 10.2.4 標準 fixtures
- `loggedOut`
- `loggedIn`
- `profileFailed`
- `tokenExpired`
- `initFailed`
- `notInClient`
- `permissionDenied`
- `apiRejectAfterLiffSuccess`

### 10.2.5 設計原則
- 所有測試共用 fixture vocabulary
- fixture 命名必須穩定
- fixture 可組合覆寫

---

## 10.3 Feature Extractor

### 10.3.1 責任
- 萃取可測 feature
- 建立 feature 與檔案對應
- 標記 LIFF 依賴
- 風險評分

### 10.3.2 Feature 定義
feature 是一個「可由使用者或系統觸發、具有可觀察結果的業務功能單位」。

### 10.3.3 萃取來源
- route/page
- component tree
- form submit handlers
- async actions
- API hooks
- state transitions
- liff entry points

### 10.3.4 風險評分維度
- 是否依賴登入狀態
- 是否影響交易/送單/綁定
- 是否有 side effect
- 是否已有測試
- 是否有多分支與錯誤處理

### 10.3.5 輸出格式

```json
[
  {
    "featureId": "profile-display",
    "name": "Profile Display",
    "files": ["src/pages/profile.tsx", "src/components/ProfileCard.tsx"],
    "dependsOnLiff": true,
    "risk": "medium",
    "recommendedTests": ["unit", "integration"]
  }
]
```

---

## 10.4 Test Generator

### 10.4.1 責任
- 根據 feature map 生成測試案例
- 選擇測試層級
- 套用 fixture 策略
- 保留人工可編修結構

### 10.4.2 生成策略

#### Unit
針對：
- pure function
- hook
- isolated component
- adapter/service

#### Integration
針對：
- page-level flow
- component + router + store + API mock + LIFF mock

#### E2E
僅針對高風險 feature：
- app init
- login gate
- profile load
- 核心送單流程
- fallback/error path

### 10.4.3 測試案例矩陣
每個 feature 至少生成：
- Success case
- Failure case
- Boundary/Exception case

### 10.4.4 範例規則

#### 若 feature 使用 `liff.isLoggedIn()`
生成：
- 已登入成功流程
- 未登入導向/阻擋流程
- 狀態未知/初始化失敗流程

#### 若 feature 使用 `liff.getProfile()`
生成：
- 成功取得 profile
- 取得 profile 失敗
- profile 欄位缺失/異常

#### 若 feature 涉及 token
生成：
- token 有效
- token 為空
- token 過期

### 10.4.5 生成檔案命名
- `*.unit.test.ts`
- `*.integration.test.ts`
- `tests/e2e/*.spec.ts`

### 10.4.6 保護人工修改
生成檔中區分：
- autogenerated block
- safe manual extension block

例如：

```ts
// <autogen:start>
// generated content
// <autogen:end>

// <manual:start>
// developer custom cases
// <manual:end>
```

---

## 10.5 Test Runner

### 10.5.1 責任
- 依序執行測試層級
- 收集結果與 artifact
- 統一失敗輸出

### 10.5.2 執行順序
1. optional lint
2. optional typecheck
3. unit
4. integration
5. e2e

### 10.5.3 Artifact 收集
- test stdout/stderr
- junit xml
- coverage json/html
- screenshots
- videos
- traces
- flaky rerun results

### 10.5.4 重試策略
- unit：不重試
- integration：可配置 0~1 次
- e2e：高風險 flaky case 可配置最多 1 次

---

## 10.6 Report Builder

### 10.6.1 責任
- 彙整所有測試結果
- 產生 summary 與建議
- 分類失敗原因
- 形成最終報告

### 10.6.2 輸出
- `reports/latest/test-report.md`
- `reports/latest/summary.json`
- `reports/latest/coverage-summary.json`
- `reports/latest/failure-analysis.json`
- `reports/latest/risk-analysis.md`

### 10.6.3 失敗分類
- LIFF init handling missing
- Unhandled profile error
- Missing loading state
- Async timing issue
- Mock fixture mismatch
- API error not surfaced
- Navigation/redirect loop
- Environment/config issue

---

## 11. 資料模型

## 11.1 ProjectProfile

```ts
interface ProjectProfile {
  repoPath: string
  packageManager: 'npm' | 'pnpm' | 'yarn'
  framework: string
  language: 'ts' | 'js' | 'mixed'
  monorepo: boolean
  workspaces: string[]
  unitTestFramework?: string
  e2eFramework?: string
  usesLiff: boolean
  hasLiffMock: boolean
  hasLiffAdapter: boolean
}
```

## 11.2 FeatureMapItem

```ts
interface FeatureMapItem {
  featureId: string
  name: string
  files: string[]
  dependsOnLiff: boolean
  risk: 'low' | 'medium' | 'high'
  recommendedTests: Array<'unit' | 'integration' | 'e2e'>
  existingTests: string[]
}
```

## 11.3 FixtureDefinition

```ts
interface FixtureDefinition {
  name: string
  liffState: {
    isLoggedIn?: boolean
    isInClient?: boolean
    profile?: Record<string, unknown>
    accessToken?: string | null
    idToken?: string | null
    initError?: string | null
    profileError?: string | null
  }
  appState?: Record<string, unknown>
  apiState?: Record<string, unknown>
}
```

## 11.4 TestCaseDefinition

```ts
interface TestCaseDefinition {
  id: string
  featureId: string
  level: 'unit' | 'integration' | 'e2e'
  scenarioType: 'success' | 'failure' | 'boundary'
  title: string
  fixture: string
  expectedOutcome: string[]
}
```

## 11.5 TestRunSummary

```ts
interface TestRunSummary {
  total: number
  passed: number
  failed: number
  skipped: number
  flaky: number
  durationMs: number
  coverage?: {
    statements: number
    branches: number
    functions: number
    lines: number
  }
}
```

---

## 12. 檔案與目錄規劃

```text
project/
  src/
  tests/
    unit/
    integration/
    e2e/
    generated/
  testing/
    liff/
      setupLiffMock.ts
      fixtures.ts
      applyFixture.ts
      resetFixture.ts
      types.ts
  scripts/
    analyze-codebase.ts
    ensure-liff-mock.ts
    extract-features.ts
    generate-tests.ts
    run-test-pipeline.ts
    build-test-report.ts
  reports/
    latest/
      test-report.md
      summary.json
      coverage-summary.json
      failure-analysis.json
      risk-analysis.md
  .liff-testgen/
    project-profile.json
    feature-map.json
    liff-usage-report.json
    pipeline-state.json
```

---

## 13. 測試策略

## 13.1 Unit Test 策略

### 目的
驗證局部邏輯與 LIFF 依賴分支。

### 覆蓋目標
- adapter/service
- hooks
- UI state transforms
- util

### 必測情境
- success
- reject/error
- empty/null
- expired token
- unsupported environment

---

## 13.2 Integration Test 策略

### 目的
驗證模組互動與實際使用流程。

### 覆蓋目標
- app init flow
- page rendering flow
- store/router/API/LIFF interactions

### 必測情境
- init success → render success
- init fail → fallback UI
- profile success → UI render
- profile fail → error UI
- API fail after LIFF success → graceful recovery

---

## 13.3 E2E Test 策略

### 目的
驗證高風險主流程在瀏覽器層面的完整可用性。

### 選取原則
僅限：
- 進站初始化
- 登入守門
- 核心交易/送單
- 核心錯誤處理

### 不建議全部 feature 都做 E2E 的原因
- 慢
- 脆弱
- 維護成本高
- 難以穩定重現

---

## 14. LIFF Mock 標準化設計

## 14.1 Fixture Vocabulary

標準 fixture 名稱應固定，避免不同測試任意命名：

- `loggedOut`
- `loggedIn`
- `loggedInProfileMissing`
- `profileFailed`
- `initFailed`
- `tokenExpired`
- `notInClient`
- `permissionDenied`

## 14.2 Fixture 套用方式

```ts
await applyLiffFixture('loggedIn')
await applyLiffFixture('profileFailed')
```

## 14.3 Fixture 疊加機制

```ts
await applyLiffFixture('loggedIn', {
  profile: { displayName: 'Sam' }
})
```

---

## 15. 錯誤處理設計

### 15.1 可恢復錯誤
- 缺少 `liff-mock` 可自動安裝
- 缺少部分測試設定可自動建立
- feature 萃取不完整但仍可產出部分測試

### 15.2 阻斷錯誤
- 非前端專案
- package manager 無法辨識
- repo 無法寫入
- 測試工具與建置環境衝突嚴重
- monorepo package 定位失敗

### 15.3 錯誤輸出要求
每一個 stage 需輸出：
- stage 名稱
- error code
- human-readable message
- suggestion
- raw detail

---

## 16. 安全與變更控制

### 16.1 Dry-run 模式
只分析與顯示將執行的變更，不真正寫檔。

### 16.2 Backup / Patch 輸出
每次修改前可輸出 patch 或 backup summary。

### 16.3 手工區塊保留
避免覆寫工程師已補充的測試。

### 16.4 Git 建議
建議每次 pipeline 前檢查工作樹是否乾淨，並提示建立新 branch。

---

## 17. CI/CD 整合

### 17.1 建議流程
- Pull Request 開啟時：analyze + generate-preview + unit/integration
- 主分支 nightly：full pipeline + e2e + report publish

### 17.2 CI 產物
- markdown report
- junit xml
- coverage html
- e2e trace/screenshots

### 17.3 Quality Gate 建議
- unit pass rate = 100%
- integration pass rate >= 95%
- e2e pass rate >= 95%
- branch coverage >= 指定門檻
- 高風險 feature 不得無測試

---

## 18. 可觀測性與 Log

### 18.1 結構化 log 欄位
- timestamp
- stage
- event
- repoPath
- filePath
- featureId
- result
- durationMs
- errorCode

### 18.2 重要事件
- dependency installed
- scaffold created
- feature extracted
- test generated
- test run started
- test run completed
- report exported

---

## 19. 版本演進規劃

## 19.1 v1
- analyze
- prepare
- unit/integration generation
- limited e2e generation
- basic report output

## 19.2 v1.5
- improved monorepo support
- smarter feature clustering
- flaky classification
- incremental generation

## 19.3 v2
- AI-assisted scenario enrichment
- contract testing support
- visual flow clustering
- PR comment integration

---

## 20. 風險與限制

### 20.1 技術風險
- 專案結構不規則，feature 萃取不準
- `liff.*` 呼叫散落，mock 不一致
- 舊專案測試框架混亂
- E2E 容易 flaky
- 生成測試與實際業務規則不完全一致

### 20.2 緩解策略
- 先做 adapter 檢查與標準化
- 對 feature map 提供人工審核模式
- 對生成測試提供 manual extension block
- 對 E2E 進行數量控制

---

## 21. 里程碑規劃

### Milestone 1：Codebase 分析 MVP
- 專案分析
- LIFF 專案識別
- `liff-mock` 檢查
- feature map 初版

### Milestone 2：Prepare MVP
- 自動安裝依賴
- 建立 `testing/liff` scaffolding
- 基本 fixture 管理

### Milestone 3：測試生成 MVP
- unit generator
- integration generator
- 核心 E2E generator

### Milestone 4：Runner + Report
- test orchestration
- coverage aggregation
- markdown/json report

### Milestone 5：CI 整合
- PR workflow
- nightly workflow
- quality gate

---

## 22. 驗收標準

平台需滿足以下驗收條件：

1. 能正確辨識目標專案是否使用 LIFF
2. 能正確判斷 `@line/liff-mock` 是否缺失
3. 缺失時能安裝到正確位置
4. 能建立可用的 LIFF fixture 與 setup 檔
5. 對至少 80% 高風險 feature 產生建議測試案例
6. 每個生成 feature 至少有 success/failure case
7. 能成功執行 unit/integration/E2E 流程
8. 能輸出可閱讀且可解析的測試報告

---

## 23. 建議實作技術

### Runtime
- Node.js
- TypeScript

### Parsing / Analysis
- ts-morph
- fast-glob
- yaml/json parser

### Test stack support
- Vitest / Jest
- Playwright
- Testing Library

### Reporting
- Markdown builder
- JSON schema
- JUnit XML parser

---

## 24. 建議第一版實作優先順序

第一版不要一次做滿，建議按這個順序落地：

1. Analyzer
2. `liff-mock` Ensurer
3. LIFF Testing Scaffold Builder
4. Feature Extractor
5. Unit Generator
6. Integration Generator
7. Minimal E2E Generator
8. Runner
9. Report Builder

---

## 25. 結論

本設計書定義了一套針對 LIFF 專案的自動化測試平台，其核心不是單純「幫專案自動寫測試」，而是建立一條可信的測試生產線：

- 先分析
- 再標準化
- 再生成
- 再執行
- 最後報告

其中最關鍵的成功因素有三個：

1. LIFF adapter / fixture 標準化
2. success / failure / boundary 三類案例強制覆蓋
3. 僅對高風險流程使用 E2E

若依此設計落地，第一版即可作為團隊內部的 LIFF 測試自動化基礎平台，後續再逐步加入更高階的 AI feature 理解與測試優化能力。

