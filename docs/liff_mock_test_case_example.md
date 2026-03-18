下面我直接幫你整理成一份 **LIFF 測試案例分層模板**。
你可以把它當成之後產 testcase 的標準方法。

---

# LIFF 測試案例分層模板

## 1. 目的

這份模板的目的不是只產 E2E case，而是讓你從 **同一個 feature** 出發，系統化拆成：

* **Unit Test**
* **Integration Test**
* **E2E Test**

核心原則只有一句：

**先產「完整情境池」，再依照測試責任把情境分配到不同層級。**

也就是：

* 情境來源相同
* 驗證粒度不同
* 工具不同
* 成本不同

---

# 2. 三層測試的責任定義

## 2.1 Unit Test

### 定位

驗證最小邏輯單位是否正確。

### 適合測什麼

* 純函式
* 商業規則
* state transition
* reducer/store logic
* 表單驗證
* error mapping
* UI 顯示條件
* LIFF adapter 的回傳轉換

### 不適合測什麼

* 多頁面跳轉
* 真實操作流程
* WebView 互動
* 跨模組整合流程

### 關鍵問題

**這個功能規則本身對不對？**

---

## 2.2 Integration Test

### 定位

驗證模組整合後是否能正常運作。

### 適合測什麼

* Page + state + API mock
* Page + LIFF mock
* Router + Page + State
* Init flow
* 提交後畫面狀態切換
* Retry / fallback
* 錯誤處理整合

### 不適合測什麼

* 全旅程真人操作
* 手機層級互動
* 真 WebView / 真 LINE 容器驗證

### 關鍵問題

**這些模組拼起來能不能正常跑？**

---

## 2.3 E2E Test

### 定位

驗證使用者旅程是否真的走得通。

### 適合測什麼

* 首頁進入
* 核心 CTA
* 多步驟操作
* 成功主流程
* 高價值失敗流程
* 主要導頁與回退流程

### 不適合測什麼

* 所有邏輯細節
* 所有錯誤碼映射
* 每個小分支都跑一遍

### 關鍵問題

**使用者真的能不能完成這個功能？**

---

# 3. 分層總原則

## 原則 A：規則放 Unit

凡是不用真的跑頁面就能判斷的，優先放 Unit。

例如：

* 按鈕何時 disabled
* 錯誤訊息顯示哪一種
* 表單是否合法
* 成功後 state 如何變化

---

## 原則 B：整合放 Integration

凡是需要「頁面 + 狀態 + mock 資料」一起驗證的，放 Integration。

例如：

* `liff.init()` 成功後頁面 render
* `getProfile()` 成功後顯示會員資料
* API timeout 時顯示 retry
* route query 不同時載入不同資料

---

## 原則 C：旅程放 E2E

凡是使用者真正會走的核心路徑，放 E2E。

例如：

* 進入活動頁並成功領券
* 表單送出成功
* 送出失敗後重試成功
* 查看會員資料並跳轉下一步

---

# 4. 測試案例生成總流程

每個 feature 都照這 6 步走。

## Step 1：列 Feature

格式：

* Feature ID
* Feature 名稱
* 功能目標
* 入口
* 成功定義

## Step 2：列前置條件

從這幾類想：

* LIFF 條件
* 使用者條件
* 資料條件
* 路由條件
* 權限條件

## Step 3：列主流程

寫出最正常的使用步驟。

## Step 4：列失敗模式

至少要從這幾類想：

* 初始化失敗
* 身分 / 權限失敗
* 資料失敗
* API 失敗
* 異常操作
* UI 狀態錯誤

## Step 5：產完整情境池

把 happy path、前置條件失敗、API 失敗、異常操作、retry 都列出來。

## Step 6：分配到 Unit / Integration / E2E

依照責任分層。

---

# 5. Feature 拆解模板

## Feature 基本資料

**Feature ID**：
**Feature 名稱**：
**功能說明**：
**主要入口**：
**主要使用者價值**：

## 前置條件

*
*
*

## 主流程

1.
2.
3.
4.

## 成功條件

*
*
*

## 失敗模式

*
*
*

## 依賴

* LIFF API：
* 後端 API：
* Router：
* 權限 / scope：
* UI 組件：

---

# 6. 完整情境池模板

每個 feature 先不分層，先把情境列出來。

| 情境ID    | 情境名稱        | 前置條件       | 使用者操作    | 系統結果    | 類型         |
| ------- | ----------- | ---------- | -------- | ------- | ---------- |
| F01-S01 | 正常成功流程      | 已登入、init成功 | 點擊送出     | 顯示成功    | Happy Path |
| F01-S02 | 未登入操作       | 未登入        | 點擊送出     | 顯示登入提示  | 前置失敗       |
| F01-S03 | init失敗      | init失敗     | 進入頁面     | 顯示錯誤頁   | LIFF失敗     |
| F01-S04 | API timeout | 已登入、init成功 | 點擊送出     | 顯示錯誤與重試 | API失敗      |
| F01-S05 | 連點兩次        | 已登入、init成功 | 連點送出     | 僅處理一次   | 異常操作       |
| F01-S06 | 重試後成功       | 首次 timeout | 點擊 retry | 成功顯示結果  | Recovery   |

---

# 7. 分層判斷模板

接下來把情境分配到三層。

| 情境ID    | 情境名稱        | Unit | Integration | E2E  | 原因                                 |
| ------- | ----------- | ---- | ----------- | ---- | ---------------------------------- |
| F01-S01 | 正常成功流程      | 否    | 是           | 是    | Integration驗狀態與渲染，E2E驗核心旅程         |
| F01-S02 | 未登入操作       | 是    | 是           | 視重要性 | Unit驗權限判斷，Integration驗頁面行為         |
| F01-S03 | init失敗      | 否    | 是           | 否    | 屬 LIFF 初始化與頁面整合                    |
| F01-S04 | API timeout | 是    | 是           | 視重要性 | Unit驗錯誤映射，Integration驗UI錯誤處理       |
| F01-S05 | 連點兩次        | 是    | 是           | 否    | Unit驗防重複送出，Integration驗畫面按鈕狀態      |
| F01-S06 | 重試後成功       | 否    | 是           | 是    | Integration驗 retry 邏輯，E2E驗關鍵失敗恢復旅程 |

---

# 8. Unit Test 案例生成規則

## 8.1 什麼情境要進 Unit

符合以下任一條件就該先進 Unit：

* 單純規則判斷
* 純狀態轉移
* 純資料轉換
* 純顯示條件
* 錯誤碼映射
* 是否可操作判斷

## 8.2 Unit 案例模板

**案例 ID**：
**Feature ID**：
**測試名稱**：

### 測試目標

驗證某個邏輯規則。

### 輸入條件

*
*

### Mock / Stub

*
*

### 預期結果

*
*

## 8.3 Unit 常見案例類型

* `canSubmit` 是否正確
* loading 時按鈕是否 disabled
* 錯誤碼對應文案是否正確
* profile 缺欄位時 fallback 是否正確
* 成功後 state 是否更新為 success
* 已領取時是否不可再送出

---

# 9. Integration Test 案例生成規則

## 9.1 什麼情境要進 Integration

符合以下任一條件就適合：

* Page + State + Mock API
* Page + LIFF Mock
* Router + Page
* Init flow + UI render
* Submit + response + UI update
* Retry + recovery

## 9.2 Integration 案例模板

**案例 ID**：
**Feature ID**：
**測試名稱**：

### 測試目標

驗證模組整合後的流程。

### 前置條件

*
*

### Mock 條件

* LIFF Mock：
* API Mock：
* Route Mock：

### 步驟

1.
2.
3.

### 預期結果

*
*
*

## 9.3 Integration 常見案例類型

* `liff.init()` 成功後頁面 render
* `getProfile()` 成功後資料顯示
* `getProfile()` 失敗後顯示錯誤區塊
* API 成功後頁面切換 success state
* API timeout 後顯示 retry
* 點 retry 後重新成功載入
* query 不同時載入不同內容

---

# 10. E2E Test 案例生成規則

## 10.1 什麼情境要進 E2E

只有符合以下條件才建議進 E2E：

* 核心使用者旅程
* 高商業價值流程
* 跨頁操作
* 關鍵 CTA
* 重要失敗恢復路徑

## 10.2 E2E 案例模板

**案例 ID**：
**Feature ID**：
**測試名稱**：

### 測試目標

驗證使用者是否能完成完整旅程。

### 前置條件

*
*

### Mock 條件

* LIFF Mock：
* API Mock：

### 操作步驟

1. 使用者進入頁面
2. 點擊某操作
3. 完成下一步
4. 驗證結果

### 預期結果

*
*
*

## 10.3 E2E 常見案例類型

* 使用者成功完成報名
* 使用者成功領取優惠券
* 使用者進入會員頁查看資訊
* 使用者送出表單失敗後 retry 成功
* 使用者完成一段完整導頁流程

---

# 11. 同一個 Feature 的三層拆解範例

下面用「優惠券領取」示範。

---

## Feature

**Feature ID**：F03
**Feature 名稱**：優惠券領取

### 功能說明

使用者可在活動頁領取優惠券。

### 前置條件

* `liff.init()` 成功
* 使用者已登入
* 活動存在
* 尚未領取

### 主流程

1. 進入活動頁
2. 點擊「立即領取」
3. API 送出請求
4. 顯示成功狀態

---

## 11.1 Unit Test 拆法

### U1：未登入不可領取

* 驗證 `canClaim = false`

### U2：已領取按鈕 disabled

* 驗證 UI state mapping 正確

### U3：loading 中不可重複提交

* 驗證 `submitDisabled = true`

### U4：API timeout 對應錯誤文案

* 驗證 error mapping 正確

### U5：成功後 state 轉成 claimed

* 驗證 state transition

---

## 11.2 Integration Test 拆法

### I1：init 成功 + 已登入 + API success

* 頁面顯示可領取
* 點擊後顯示成功狀態

### I2：未登入進入頁面

* 頁面顯示登入提示或阻擋操作

### I3：API timeout

* 顯示錯誤訊息與 retry 按鈕

### I4：retry 後成功

* 第一次 timeout
* retry 後 success
* UI 正確更新

### I5：已領取再進入

* 顯示已領取狀態
* 不可重複領取

---

## 11.3 E2E Test 拆法

### E1：成功領取優惠券

* 使用者進入活動頁
* 點擊領取
* 成功看到已領取狀態

### E2：領取失敗後重試成功

* 第一次失敗
* 使用者點 retry
* 第二次成功

這裡你會發現：
很多 case 不需要進 E2E。
E2E 只保留最有價值的旅程。

---

# 12. 推薦比例

在 LIFF + Appium 這種架構下，我建議：

* **Unit：60%**
* **Integration：30%**
* **E2E：10%**

原因很簡單：

* LIFF/WebView E2E 成本高
* 很多邏輯在 Unit 就能擋掉
* Integration 最划算，因為能驗證模組拼裝
* E2E 應該少而精，只留高價值旅程

---

# 13. 可直接落地的欄位設計

你之後管理 testcase，可以直接用這個表。

| 案例ID    | Feature ID | Feature 名稱 | 情境名稱    | 類型         | 建議層級        | Mock 條件                   | 主要步驟            | 預期結果           | 備註     |
| ------- | ---------- | ---------- | ------- | ---------- | ----------- | ------------------------- | --------------- | -------------- | ------ |
| F03-U01 | F03        | 優惠券領取      | 未登入不可領取 | 前置失敗       | Unit        | isLoggedIn=false          | 呼叫判斷邏輯          | canClaim=false | 純規則    |
| F03-I01 | F03        | 優惠券領取      | 成功領取    | Happy Path | Integration | init success, API success | render -> click | success state  | page整合 |
| F03-E01 | F03        | 優惠券領取      | 使用者成功領取 | Happy Path | E2E         | init success, API success | 進頁 -> 點擊        | 顯示已領取          | 核心旅程   |

---

# 14. 你的實際工作流程

你之後每做一個 feature，可以照這個順序：

1. 先寫 **Feature 拆解表**
2. 產出 **完整情境池**
3. 用 **分層判斷表** 把情境分到 Unit / Integration / E2E
4. 先補齊 **Unit**
5. 再補 **Integration**
6. 最後只挑核心旅程進 **E2E**

這樣測試會最穩，也最不容易失控。

---

# 15. 一句話版

**同一個 feature 只需要產一次情境，之後再分派到 Unit、Integration、E2E；不要為三層各自重新發明一套案例來源。**

如果你要，我下一步可以直接幫你做成 **Excel/試算表欄位版模板**，讓你可以直接開始填每個 feature。
