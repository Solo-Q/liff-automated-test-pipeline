# LIFF 自動化測試產線工具說明

## 1. 專案是什麼

這個專案是一套針對 **LIFF 前端專案** 的自動化測試產線工具。  
它的目標不是只產生幾支測試檔，而是把一個 LIFF 專案從「分析、補齊 LIFF mock 環境、辨識高價值功能、生成測試案例、執行測試、輸出分析報告」整條流程串起來。

這個工具目前以 CLI 方式運作，專案名稱是：

- `liff-automated-test-pipeline`

CLI 名稱是：

- `liff-testgen`

---

## 2. 這個專案想解決什麼問題

LIFF 專案和一般前端專案相比，通常會有幾個很麻煩的測試問題：

- 專案邏輯會直接依賴 `liff.init()`、`liff.getProfile()`、`liff.isLoggedIn()` 等 LIFF API。
- 很多功能行為跟 LINE 容器、登入狀態、分享流程、跳轉流程強綁定。
- 測試常常只覆蓋 happy path，錯誤分支、邊界情況與 fallback 行為不足。
- 團隊常有手工測試案例，但很難把它們穩定轉成自動化測試。
- 專案越大，LIFF 相關依賴點越散，人工維護測試成本越高。

這個工具的設計方向，是把上述問題拆成一條可重複執行的工程流程：

1. 先找出專案是不是 LIFF 專案  
2. 再建立標準化 mock 測試環境  
3. 再辨識哪些功能最值得測  
4. 再生成測試案例與測試檔  
5. 最後執行並輸出報告

---

## 3. 目前專案進度

目前進度不是概念驗證，而是已經可以跑完整流程的工程原型。

### 3.1 已完成的主幹能力

- `analyze`：分析目標 repo 是否為 LIFF 專案
- `prepare`：補齊 `@line/liff-mock` 與 `testing/liff` scaffold
- `extract-features`：抽出 feature、target type、module type、風險等資訊
- `generate`：產生測試案例規劃與實際測試檔
- `run`：執行測試，蒐集 runner / junit / coverage 結果
- `report`：輸出 Markdown 與 JSON 分析報告
- `pipeline`：串起整條流程

### 3.2 已完成的 v2 能力

目前工具已經不是只有粗粒度 `success / failure / boundary` 三種案例，而是有進入第二版設計：

- `scenario pool`
- `priority`
- `failure taxonomy`
- `testData`
- `manualReferenceIds`
- `module-aware decomposition`
- `targetType`
- `generationMode`

也就是說，工具現在已經可以把「手工測試案例知識」逐步對應到可執行的自動化測試規劃，而不是只生成空白模板。

### 3.3 已驗證的主要樣本

目前主要驗證樣本是：

- [`liff_projects_for_test_only/aicard_app`](./liff_projects_for_test_only/aicard_app)

這個樣本已經被用來驗證：

- LIFF 專案分析
- mock 環境準備
- feature extraction
- scenario generation
- test execution
- report generation
- generator v2 架構重構後是否仍可穩定運作

### 3.4 目前狀態的實際判斷

這個工具目前的定位是：

- 已可作為 **LIFF 測試產線工程原型**
- 已可對已知結構的 LIFF 專案跑完整流程
- 已可生成可執行測試並輸出報告
- 但還不是「任何 LIFF 專案拿來就能高品質全自動生成」的最終產品

換句話說，目前它已經是 **可用的 v1/v2 工程工具**，但仍在持續擴充 adapter、scenario 粒度與跨專案通用性。

---

## 4. 系統整體流程

工具目前的流程是：

1. `analyze`
2. `prepare`
3. `extract-features`
4. `generate`
5. `run`
6. `report`

### 4.1 Analyze

這一步會先分析目標 repo，判斷：

- 是不是前端 repo
- 是否使用 `@line/liff`
- 是否存在 LIFF adapter / service
- 使用什麼 package manager
- 使用哪種 test framework
- 已有哪些現有測試

輸出物會寫到：

- `.liff-testgen/project-profile.json`
- `.liff-testgen/liff-usage-report.json`
- `.liff-testgen/existing-test-map.json`

### 4.2 Prepare

這一步會準備 LIFF mock 測試環境，包含：

- 確認或補齊 `@line/liff-mock`
- 建立 `testing/liff/*` scaffold
- 更新必要的中繼 state

### 4.3 Extract Features

這一步會從專案中找出：

- 哪些是高價值功能
- 哪些檔案屬於哪一類 target
- 哪些 page 需要拆成更細的 module
- 每個 feature 的風險級別
- 建議測試層級

現在已不只抽 page 級 feature，也支援 child feature / module feature 的拆分。

### 4.4 Generate

這一步會把 feature 轉成可執行測試規劃與 generated tests。

目前生成資料已包含：

- `scenarioId`
- `scenarioName`
- `scenarioCategory`
- `priority`
- `failureMode`
- `testData`
- `manualReferenceIds`
- `generationMode`

產出主要會寫到：

- `.liff-testgen/generation-plan.json`
- `tests/generated/unit/*`
- `tests/generated/integration/*`
- `tests/generated/e2e/*`（目前非主要驗證路徑）

### 4.5 Run

這一步會：

- 根據專案設定執行測試
- 收集 runner 結果
- 解析 coverage
- 解析 junit
- 標準化 test run summary

主要輸出：

- `.liff-testgen/test-run-summary.json`
- `.liff-testgen/test-run-artifacts.json`

### 4.6 Report

最後會整合所有中繼資料與執行結果，輸出：

- `reports/latest/test-report.md`
- `reports/latest/summary.json`
- `reports/latest/coverage-summary.json`
- `reports/latest/failure-analysis.json`
- `reports/latest/risk-analysis.md`

報告目前已支援：

- feature 統計
- scenario pool summary
- risk analysis
- uncovered P0 cases
- blocked pending product rule
- manual testcase reference coverage
- scenario-aware failure mapping

---

## 5. 系統架構說明

系統目前可以分成六個主要層級：

### 5.1 CLI / Orchestrator 層

負責：

- 命令列參數解析
- 執行順序控制
- stage handoff
- exit code 管理

主要檔案：

- [`src/cli.js`](./src/cli.js)
- [`src/index.js`](./src/index.js)
- [`src/orchestrator.js`](./src/orchestrator.js)
- [`src/parse-args.js`](./src/parse-args.js)
- [`src/stages/index.js`](./src/stages/index.js)

### 5.2 Domain Stage 層

這是主要業務邏輯層，包含：

- [`src/analyzer.js`](./src/analyzer.js)
- [`src/preparer.js`](./src/preparer.js)
- [`src/feature-extractor.js`](./src/feature-extractor.js)
- [`src/test-generator.js`](./src/test-generator.js)
- [`src/test-runner.js`](./src/test-runner.js)
- [`src/report-builder.js`](./src/report-builder.js)

### 5.3 Generator Registry / Policy 層

這層負責把「生成規則」從主流程中拆出，避免 `if/else` 無限制膨脹。

目前包含：

- [`src/generator/scenario-registry.js`](./src/generator/scenario-registry.js)  
  負責 scenario pool 規則

- [`src/generator/manual-reference-registry.js`](./src/generator/manual-reference-registry.js)  
  負責手工測試案例 mapping 規則

- [`src/generator/generation-mode-policy.js`](./src/generator/generation-mode-policy.js)  
  負責 priority / generation mode / failure mode 決策

- [`src/generator/specialized-template-registry.js`](./src/generator/specialized-template-registry.js)  
  負責 specialized builder dispatch

- [`src/generator/builder-helpers.js`](./src/generator/builder-helpers.js)  
  負責 builder 共用 helper

### 5.4 Specialized Builder 層

這層負責不同 target family 的實際測試模板生成。

目前已拆成：

- [`src/generator/builders/service-builders.js`](./src/generator/builders/service-builders.js)
- [`src/generator/builders/hook-builders.js`](./src/generator/builders/hook-builders.js)
- [`src/generator/builders/auth-route-builders.js`](./src/generator/builders/auth-route-builders.js)
- [`src/generator/builders/page-flow-builders.js`](./src/generator/builders/page-flow-builders.js)

這個拆法的價值是：

- 新增新的 LIFF family 時，不需要一直回頭改核心檔
- 可以依 family 增加專用 builder
- 後續跨專案擴充時維護成本比較低

### 5.5 Utility 層

提供共用能力：

- [`src/utils/fs.js`](./src/utils/fs.js)
- [`src/utils/package-manager.js`](./src/utils/package-manager.js)
- [`src/logger.js`](./src/logger.js)
- [`src/constants.js`](./src/constants.js)
- [`src/errors.js`](./src/errors.js)

### 5.6 Documentation / Spec 層

文件不只是補充說明，而是這個專案目前的重要規格來源。

主要文件：

- [`docs/liff-mock-automated-test-pipeline-implementation-spec.md`](./docs/liff-mock-automated-test-pipeline-implementation-spec.md)
- [`docs/liff-mock-test-generator-v2-spec.md`](./docs/liff-mock-test-generator-v2-spec.md)
- [`docs/aicard_app_coverage_acceptance_criteria.md`](./docs/aicard_app_coverage_acceptance_criteria.md)
- [`docs/liff_mock_test_case_example.md`](./docs/liff_mock_test_case_example.md)
- [`docs/AI card測試案例`](./docs/AI%20card測試案例)

---

## 6. 目前已完成到什麼程度

如果從產品成熟度來看，目前可以這樣理解：

### 6.1 已達成

- CLI 主幹完成
- 可以對 LIFF 專案跑完整 pipeline
- 已支援 `aicard_app` 這個真實樣本專案
- 已建立 scenario pool 與手工案例 mapping
- 已完成 generator v2 的模組化重構
- 報告已可顯示 scenario、risk、manual coverage、P0 缺口

### 6.2 目前最強的部分

- LIFF 專案分析能力
- `@line/liff-mock` 測試 scaffold 準備
- scenario-aware 報告
- 可擴充的 builder / registry 結構
- 對 `aicard_app` 的完整流程驗證

### 6.3 還沒有完成的部分

- 尚未完成多個不同結構 LIFF 專案的大量驗證
- 還不是所有 page-flow / family 都有深度 adapter
- 一些 generic 測試仍偏 smoke-level
- E2E 仍不是目前主要驗證重點
- 仍需持續把手工案例的細膩度轉成更多可自動化的 scenario

---

## 7. 目前工具輸出的資料與報告

工具在目標專案中會建立幾類目錄：

```text
testing/liff/
tests/generated/
.liff-testgen/
reports/latest/
```

### 7.1 `testing/liff`

這裡是 LIFF mock 測試 scaffold，例如：

- `setupLiffMock.ts`
- `fixtures.ts`
- `applyFixture.ts`
- `resetFixture.ts`
- `types.ts`

### 7.2 `tests/generated`

這裡是工具產生的測試檔。

目前會依層級放在：

- `tests/generated/unit`
- `tests/generated/integration`
- `tests/generated/e2e`

### 7.3 `.liff-testgen`

這裡是中繼資料和 pipeline state。

常見檔案：

- `project-profile.json`
- `liff-usage-report.json`
- `existing-test-map.json`
- `feature-map.json`
- `generation-plan.json`
- `test-run-summary.json`
- `test-run-artifacts.json`
- `pipeline-state.json`

### 7.4 `reports/latest`

這裡是給人看與給系統讀的最終結果：

- `test-report.md`
- `summary.json`
- `coverage-summary.json`
- `failure-analysis.json`
- `risk-analysis.md`

---

## 8. 目前支援的指令

CLI 用法：

```bash
liff-testgen <command> <repoPath> [options]
```

目前支援的 command：

- `analyze`
- `prepare`
- `extract-features`
- `generate`
- `run`
- `report`
- `pipeline`

常用 options：

- `--dry-run`
- `--workspace <name>`
- `--json`
- `--verbose`
- `--help`

### 8.1 常見使用方式

分析單一 LIFF 專案：

```bash
node ./src/cli.js analyze ./liff_projects_for_test_only/aicard_app
```

跑完整流程：

```bash
node ./src/cli.js pipeline ./liff_projects_for_test_only/aicard_app
```

輸出 JSON 結果：

```bash
node ./src/cli.js pipeline ./liff_projects_for_test_only/aicard_app --json
```

---

## 9. 目前推薦怎麼使用這個工具

如果是第一次用在一個新的 LIFF 專案上，建議流程是：

1. 先跑 `analyze`
2. 再跑 `prepare`
3. 再跑 `extract-features`
4. 再跑 `generate`
5. 再跑 `run`
6. 最後跑 `report`

這樣的好處是：

- 可以分段確認專案辨識是否正確
- 可以先看 feature extraction 是否合理
- 可以先看生成案例是否符合期待
- 可以更快找出缺少的 adapter 或規則

如果一開始就直接跑 `pipeline` 也可以，但比較適合已知結構的專案或重複驗證。

---

## 10. 目前專案的限制與風險

這一段很重要，因為這個專案還在演進。

### 10.1 目前最大的限制

- 主要驗證樣本仍是 `aicard_app`
- 不同結構的 LIFF 專案仍可能需要補 adapter
- 有些 generated tests 仍是 smoke-level，不代表已完整覆蓋商業規則
- coverage 數字不能直接等同測試品質

### 10.2 不能誤解的地方

這個工具目前 **可以跑通完整流程**，不代表：

- 已能替代所有手工測試
- 已能保證所有生成案例都是高價值案例
- 已適用所有 LIFF 專案結構

它目前比較像：

- 一個已可工作的 LIFF 自動化測試產線核心
- 一個可以持續增加 adapter、scenario 規則、report 能力的平台

### 10.3 目前最適合的使用方式

最適合拿來做：

- LIFF 專案測試產線驗證
- 找出高價值 target 與缺口
- 把手工測試案例逐步轉成可執行測試
- 作為後續跨專案擴充的基礎平台

---

## 11. 目前和手工測試案例的關係

這個工具現在已經不是完全獨立於手工測試案例。

目前 repo 中的：

- [`docs/AI card測試案例`](./docs/AI%20card測試案例)

已被拿來作為：

- manual testcase reference source
- scenario 細化依據
- module-aware 拆分的參考
- P0 / family 覆蓋分析的參考基準

也就是說，這個工具目前的方向不是拋棄手工測試案例，而是：

- 把手工測試案例視為高品質知識庫
- 再逐步抽出可自動化的部分
- 用 `manualReferenceIds`、`priority`、`failureMode` 這些欄位與自動生成結果連接

---

## 12. 開發者與管理者應該怎麼看這個專案

### 12.1 如果你是管理者或非第一線開發人員

你可以把這個專案理解成：

- 一套針對 LIFF 專案的測試自動化平台原型
- 目前已經有完整流程和實際驗證
- 已進入「優化通用性與可維護性」階段

你最該關心的是：

- 是否能穩定分析並執行一個 LIFF 專案
- 是否能讓高價值功能逐步轉成自動化測試
- 是否能產出可讀的風險與覆蓋報告

### 12.2 如果你是工程人員

你最該關心的是：

- 如何新增新的 target family / adapter
- 如何把新的手工測試案例映射進 generator
- 如何提升 scenario 細膩度
- 如何讓更多 LIFF 專案結構被穩定支援

---

## 13. 安裝與執行方式

環境需求：

- Node.js `>=18`
- npm `>=10` 建議

專案目前 `package.json` 內容已支援：

- `npm run start`
- `npm run check`
- `npm run pipeline`

安裝：

```bash
npm install
```

查看 CLI：

```bash
node ./src/cli.js --help
```

執行：

```bash
node ./src/cli.js pipeline ./liff_projects_for_test_only/aicard_app
```

---

## 14. 目前重要文件

如果你想進一步看規格或設計，建議從這幾份開始：

- [`docs/liff-mock-automated-test-pipeline-implementation-spec.md`](./docs/liff-mock-automated-test-pipeline-implementation-spec.md)  
  第一版可直接開發的 implementation spec

- [`docs/liff-mock-test-generator-v2-spec.md`](./docs/liff-mock-test-generator-v2-spec.md)  
  generator v2 規格，包含 failure taxonomy、priority、module-aware decomposition、test data 等方向

- [`docs/aicard_app_coverage_acceptance_criteria.md`](./docs/aicard_app_coverage_acceptance_criteria.md)  
  `aicard_app` 目前的 coverage 目標與分層指標

- [`docs/liff_mock_test_case_example.md`](./docs/liff_mock_test_case_example.md)  
  scenario pool 與測試案例分層設計參考

- [`docs/AI card測試案例`](./docs/AI%20card測試案例)  
  手工測試案例知識庫，目前已作為 generator 對照來源

---

## 15. 退出碼

CLI 目前使用的 exit code：

- `0`：成功
- `1`：內部錯誤
- `2`：參數錯誤
- `3`：不支援的專案
- `4`：repo 不可寫
- `5`：無法判斷 package manager
- `6`：workspace 解析失敗
- `7`：prepare 失敗
- `8`：generate 失敗
- `9`：test execution 失敗
- `10`：report 建立失敗

---

## 16. 一句話總結

這個專案目前已經是一套 **能在真實 LIFF 專案上跑完整流程的自動化測試產線工具**，並且正在從單一樣本驗證，逐步演進成可套用到更多 LIFF 專案的通用平台。
