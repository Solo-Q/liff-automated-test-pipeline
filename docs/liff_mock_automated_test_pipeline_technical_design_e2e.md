# LIFF 功能流程自動化測試技術設計書

## 1. 文件資訊

**文件名稱**：LIFF 功能流程自動化測試技術設計書
**方案版本**：v1.0
**適用範圍**：Android 開發與測試環境下之 LIFF Web App 功能流程驗證
**目標組合**：Android Studio / Emulator + LIFF Mock + Appium + LIFF Inspector

---

## 2. 背景與問題定義

LIFF 是由 LY Corporation 提供的 Web App 平台，LIFF App 會透過 LINE Platform 取得使用者相關資料與平台能力。這代表 LIFF 專案的測試，不只是一般前端頁面測試，還會受到 LIFF SDK、WebView 容器、初始化流程與平台開啟路徑影響。([LINE 開發者][1])

在實務上，LIFF 測試常見痛點包含：`liff.*` API 狀態不易重現、登入與未登入情境難穩定控制、WebView 內頁面流程不易自動化，以及當流程失敗時難以快速定位是初始化、DOM、Network 或測試腳本問題。LIFF Plugin 官方文件明確指出，Plugin 可以擴充或改變 LIFF API 行為；LIFF Mock 則可讓 LIFF App 在 mock mode 下回傳 mock data，這正好對應到「測試環境不穩定」的核心問題。([LINE 開發者][2])

本設計書聚焦於第一階段目標：**不處理效能、不處理多機型碎片化、不追求完整真 LINE 容器模擬，而是先建立一套可穩定驗證 LIFF 功能流程、頁面跳轉與操作結果的自動化測試方案**。Android 官方說明 Emulator 可用於虛擬裝置測試，並同時建議正式發佈前仍應在真機驗證；因此本方案定位為「功能流程驗證主方案」，而非最終發布驗證方案。([Android Developers][3])

---

## 3. 設計目標

本方案的設計目標如下：

第一，建立可重現的 LIFF 測試環境，使登入、未登入、Profile 成功、Profile 失敗、Token 錯誤、Init 失敗等情境可被穩定重跑。LIFF Mock 的官方定位正是將 LIFF SDK 切入 mock mode，讓測試脫離 LIFF Server 並回傳 mock data。([LINE 開發者][2])

第二，建立接近真人操作的 UI 自動化流程，涵蓋按鈕點擊、表單輸入、頁面跳轉、結果驗證等核心互動。Appium 的 Context API 官方文件指出，其設計目的就是處理 Native 與嵌入式 Web Content 間的切換，適合 Hybrid / WebView 類型應用。([Appium Discuss][4])

第三，建立 LIFF 專案專用的失敗排查能力，使測試失敗時可快速查看 Console、Network、DOM 與初始化狀態。LIFF Inspector 官方 README 說明其由 LIFF Inspector Server 與 Plugin 組成，負責在 LIFF App 與 Chrome DevTools 之間建立除錯通道。([GitHub][5])

---

## 4. 非目標

本方案明確不包含以下目標：

本方案不嘗試完整模擬真 LINE 容器，也不保證覆蓋所有 LIFF browser / external browser 差異。LIFF 官方文件指出，LIFF App 的實際開啟環境可能受作業系統、連結處理方式與瀏覽器 / WebView 規格影響，因此開啟位置不保證一致。([LINE 開發者][1])

本方案不處理多品牌、多版本 Android 裝置矩陣，不處理效能、記憶體、熱節流、弱網路與發布前真機認證等議題。Android 官方仍建議發布前要在真機上測試，因此此方案僅作為第一階段的主要功能流程驗證手段。([Android Developers][6])

---

## 5. 整體方案概述

本方案採用四工具分層架構：

* Android Studio / Emulator：提供 Android 虛擬執行環境
* LIFF Mock：提供 LIFF SDK 狀態穩定化與情境模擬
* Appium：提供接近真人操作的 UI / WebView 自動化
* LIFF Inspector：提供 LIFF 專用除錯與觀測能力

Android Emulator 官方定位是可在虛擬裝置上測試 App，無需每次都依賴實體裝置。LIFF Plugin 官方定位則是可改變 LIFF API 行為；LIFF Inspector 則是 LIFF 專用的 DevTools；Appium 的 Context API 則支援 Native 與 WebView 間切換。四者合併後，形成「虛擬執行環境 + 可控 LIFF 狀態 + Hybrid 自動化 + LIFF 專用除錯」的完整測試鏈路。([Android Developers][3])

---

## 6. 工具選型與定位

### 6.1 Android Studio / Emulator

Android Emulator 是本方案的執行底座。官方文件指出，Emulator 可讓開發者在多種不同虛擬裝置上測試 App，而且隨 Android Studio 一同提供。這使其非常適合作為本機開發、重現流程與執行自動化測試的標準環境。([Android Developers][3])

在本方案中，Android Studio / Emulator 的定位不是「解決 LIFF 特性」，而是提供穩定、可重現、可腳本化的 Android 測試載體。其主要價值在於：不用每次依賴真機即可啟動測試、可快速建立 AVD 組態、可透過 adb 與命令列方式搭配 Appium 跑自動化流程。([Android Developers][7])

其邊界也非常明確：Emulator 解的是 Android 執行環境問題，不解 LIFF API 狀態控制，也不等於完整真實 LINE 容器。Android 官方同時提醒，發佈前應在真機上測試。([Android Developers][6])

### 6.2 LIFF Mock

LIFF Mock 是本方案的狀態穩定層。LINE Developers 官方文件指出，LIFF Plugin 是可擴充 LIFF SDK 或改變 LIFF API 行為的機制；Release Notes 進一步說明，LIFF Mock 是為了讓測試更容易而提供的 LIFF Plugin，可將 LIFF SDK 切入 mock mode，並讓 LIFF API 回傳 mock data。([LINE 開發者][2])

在本方案中，LIFF Mock 的定位是「把不可控的 LIFF 狀態轉為可控情境」。例如可固定 `isLoggedIn()`、`getProfile()`、`getContext()` 的行為，並且能穩定重現登入成功、登入失敗、權限不足、Token 異常與初始化失敗等情境。這能大幅降低測試對真實 LIFF Server 與真使用者狀態的依賴。([LINE 開發者][2])

其邊界在於：LIFF Mock 改的是 SDK 行為，而不是真實 LINE App 容器與真實授權流程。因此它不能替代真登入、真 redirect、真 callback、真 LINE browser / external browser 差異驗證。這些不是 mock 的目標，也不在 Plugin 機制的能力邊界內。([LINE 開發者][2])

### 6.3 Appium

Appium 是本方案的主自動化框架。其官方 Context API 文件指出，Appium 透過「Context」抽象支援 Native 與 Web Content 間切換；在 Hybrid App 中，這讓測試框架可以同時針對原生介面與 WebView 內容進行操作。([Appium Discuss][4])

在本方案中，Appium 的定位是「模擬真人操作手機執行 LIFF 流程」。它負責處理點擊、輸入、等待、驗證頁面內容與切換 WebView Context 等任務。對 LIFF 這類本質上依賴 WebView / Hybrid 結構的應用而言，Appium 相較於僅依賴 Accessibility 黑箱互動的工具，更適合深入處理 WebView 內部互動。([Appium Discuss][4])

然而 Appium 的能力並非零成本。社群文件與討論顯示，Android WebView 自動化通常仰賴 Chromedriver，且需要 WebView Debugging 能力；若 Context 無法正確曝光，測試可能只能看到 `NATIVE_APP`。因此 Appium 在解決 WebView 可操作性方面更強，但也需要額外的測試工程化配置。([Appium Discuss][8])

### 6.4 LIFF Inspector

LIFF Inspector 是本方案的觀測與除錯工具。其 GitHub README 指出，LIFF Inspector 由 Server 與 Plugin 構成，Server 負責在 LIFF App 與 Chrome DevTools 間中介通訊，Plugin 則在 `liff.init()` 前後介入，以便建立除錯連線。([GitHub][5])

在本方案中，LIFF Inspector 的定位不是「跑自動化」，而是「當自動化失敗時提供足夠觀測性」。例如測試卡在某頁時，可透過 Inspector 查看 Console Error、Network Request、DOM 是否載入成功，以及初始化前後的頁面狀態。對 LIFF 這類初始化與開啟鏈路較敏感的應用來說，這類資訊非常關鍵。([GitHub][5])

其邊界是：LIFF Inspector 不替代 Appium，也不負責大規模回歸測試；它更像是專用 DevTools。官方說明也指出，因 LIFF App 使用 HTTPS，預設 `ws://localhost:9222` 會遇到 mixed content，故 Inspector Server 需要 SSL/TLS 配置，表示它仍需額外環境建置。([GitHub][5])

---

## 7. 系統架構設計

整體執行流程如下：

1. 使用 Android Studio 建立並啟動 Android Emulator。
2. 測試版 LIFF App 載入 LIFF Mock，進入可控 mock mode。
3. Appium 啟動測試流程，模擬真人操作，必要時切換 Native / WebView Context。
4. 測試流程若失敗，透過 LIFF Inspector 觀察 Console、Network、DOM 與初始化行為。
5. 測試結果輸出為通過 / 失敗，失敗案例附上截圖與除錯資訊。

此架構的核心原則是分離責任：Emulator 解決執行環境，LIFF Mock 解決狀態可控性，Appium 解決操作自動化，LIFF Inspector 解決失敗排查。這樣可避免將所有責任壓在單一工具上，降低測試不穩定與定位困難的風險。([Android Developers][3])

---

## 8. 測試分層設計

### 8.1 Scenario / State Layer

此層由 LIFF Mock 負責，定義固定的 LIFF 狀態與回傳資料。建議至少包含：未登入、已登入、Profile 成功、Profile 失敗、權限不足、Token 過期、Init 失敗。這類情境是 LIFF Mock 最有價值的覆蓋範圍，因為其設計目的就是讓 LIFF SDK 行為可被控制。([LINE 開發者][2])

### 8.2 UI / Flow Automation Layer

此層由 Appium 負責，執行像真人操作的流程驗證。建議首批只覆蓋最重要主路徑，例如首頁進入、主要 CTA、表單成功流程、表單失敗流程、關鍵導頁與提示訊息。Appium Context API 允許在需要時切換 WebView 以驗證頁面內容。([Appium Discuss][4])

### 8.3 Debug / Diagnosis Layer

此層由 LIFF Inspector 負責，不參與正常批次回歸，而是在流程失敗時介入。此層可協助回答「是 Appium selector 錯了，還是 DOM 沒出來，還是 `liff.init()` 失敗，還是 request 根本沒發」等問題。([GitHub][5])

---

## 9. 可解決的問題

本方案可有效解決以下問題：

首先，可解決「LIFF 狀態難以穩定重現」問題。透過 LIFF Mock，原本依賴真實帳號、真實平台與即時狀態的 LIFF API，可被固定成可預測的回傳結果，這大幅提升測試可重複性。([LINE 開發者][2])

其次，可解決「功能流程與頁面跳轉難以持續驗證」問題。透過 Appium，測試可以像真人使用手機一樣，完成點擊、輸入、等待、切頁與驗證結果的流程。對以 WebView 為核心的 LIFF 而言，這比單純黑箱式流程工具更適配。([Appium Discuss][4])

再次，可解決「LIFF 失敗時缺乏可觀測性」問題。透過 LIFF Inspector，可以直接觀察 LIFF App 的 Console、Network、DOM 與初始化行為，縮短故障定位時間。([GitHub][5])

最後，可解決「本機缺乏可穩定執行的 Android 測試環境」問題。Android Emulator 讓團隊可在不依賴大量真機的前提下，先完成大部分功能流程驗證。([Android Developers][3])

---

## 10. 尚未解決的問題與原因分析

### 10.1 真 LINE 容器問題

本方案無法完整證明「流程在真 LINE App 最終容器中一定正確」。根本原因在於 LIFF 的開啟路徑並非完全由 App 本身控制，而是會受到 OS、連結處理與瀏覽器 / WebView 環境影響。LINE 官方文件已說明 LIFF 是平台型 Web App，實際開啟方式可能受環境影響。([LINE 開發者][1])

這個問題存在的本質是「平台容器問題」，而不是「測試框架問題」。因此即使 Emulator、Mock、Appium 與 Inspector 都配置完成，也不代表真 LINE 容器下的最終表現已被完整驗證。([LINE 開發者][1])

### 10.2 真登入授權與真 Redirect 鏈

本方案也無法完整驗證真實授權流程、Consent Screen、真 Redirect 與 Callback 鏈。原因在於 LIFF Mock 的價值本來就在於把真實平台依賴抽離，這能讓測試穩定，但也同步降低對真實授權鏈的覆蓋。([LINE 開發者][2])

這個問題之所以存在，是因為「功能結果模擬」與「平台鏈路驗證」是兩種不同測試目的。LIFF Mock 只適合前者，不等於後者。([LINE 開發者][2])

### 10.3 WebView 工程成本

雖然 Appium 比一般黑箱工具更適合 WebView，但它並不是無成本解法。官方與社群資料顯示，Hybrid App 需要處理 Context 切換；在 Android WebView 模式下，還可能牽涉 Chromedriver 與 WebView Debugging 設定。([Appium Discuss][4])

這個問題存在的原因不是 Appium 不足，而是 Hybrid / WebView 自動化本來就比純 Native 或純 Web 更複雜。也就是說，換用 Appium 是「較適合的選擇」，但仍需要測試工程化能力。([Appium Discuss][4])

### 10.4 後端真整合

本方案重點在前端受控流程驗證，因此不保證後端對真實 LIFF Token、真 Callback、真 Session 與 API Schema 的整合一定正確。因為 Mock 模式本身就是在降低對真平台依賴，這會自然形成測試邊界。([LINE 開發者][9])

### 10.5 發版前真機驗證

Android 官方明確建議在發佈前應在實體裝置上測試，因此本方案不能取代最終真機驗證。即使目前目標先不處理多機型與效能，發版前仍應以至少一台實體 Android 裝置完成核心 Smoke Test。([Android Developers][6])

---

## 11. 導入策略

導入建議分四個階段執行。

第一階段，建立 LIFF Adapter / Gateway。所有 `liff.*` 呼叫需集中於單一封裝層，以便 LIFF Mock 能穩定接管，避免專案內直接散落多處 SDK 呼叫。此策略符合 LIFF Plugin 可改變 LIFF API 行為的設計前提。([LINE 開發者][2])

第二階段，建立 Scenario Fixtures。建議先完成最小集合：未登入、已登入、Profile 成功、Profile 失敗、Token 異常、Init 失敗。這將成為後續 Appium 自動化的穩定測試基礎。([LINE 開發者][9])

第三階段，建立 Appium 核心流程測試。先只打關鍵主路徑，不建議一開始把所有功能全塞進 E2E。核心流程可包括：首頁啟動、主要 CTA、表單成功、表單失敗、錯誤頁與導頁驗證。([Appium Discuss][4])

第四階段，建立 LIFF Inspector 除錯流程。當 Appium Case 失敗時，標準化排查順序應為：看 Console、看 Network、看 DOM、看 Init 狀態。如此可避免測試失敗後只能憑猜測定位問題。([GitHub][5])

---

## 12. 風險與對策

最大風險之一是 WebView Context 不穩，導致 Appium 無法順利操作頁面。對策是：在測試版 App 中啟用 WebView Debugging、建立穩定等待策略、控制 Chromedriver 版本與 Locator 規則。社群案例顯示這些是 Hybrid App 測試常見必要條件。([Appium Discuss][8])

另一項風險是團隊誤把此方案視為「完整真 LINE 驗證」。對策是將文件與流程明確標示為「功能流程主驗證方案」，並要求發布前至少補一輪真機核心流程驗證。Android 官方的真機測試建議可作為正式依據。([Android Developers][6])

第三項風險是 LIFF Mock 覆蓋過深，導致後端真整合問題被延後暴露。對策是將此方案定位為前端與流程驗證主線，後續若要做正式發布驗證，需另外設計少量真鏈路驗證。([LINE 開發者][9])

---

## 13. 最終結論

**LIFF Mock + Appium + LIFF Inspector + Android Studio / Emulator** 是一套適合 LIFF 專案第一階段導入的功能流程測試方案。它能有效解決 LIFF 狀態不穩、WebView / Hybrid 流程難自動化、頁面跳轉驗證困難，以及失敗時缺乏可觀測性的問題。([LINE 開發者][2])

但這套方案的正確定位是：**用於受控環境下的功能流程驗證**，而不是完整替代真 LINE 容器、真授權鏈與最終發布真機驗證。這些邊界來自 LIFF 平台本身與 Android / WebView 環境特性，而不是單一工具能力不足。([LINE 開發者][1])

若你接下來要，我可以把這份技術設計書再往下一步整理成：

1. **可直接貼 Confluence / Notion 的版型**
2. **Markdown 文件**
3. **Word 文件大綱**
4. **包含目錄編號與表格的正式版**

[1]: https://developers.line.biz/en/docs/liff/overview/?utm_source=chatgpt.com "LINE Front-end Framework (LIFF) - LINE Developers"
[2]: https://developers.line.biz/en/docs/liff/liff-plugin/?utm_source=chatgpt.com "LIFF plugin - LINE Developers"
[3]: https://developer.android.com/studio/run/emulator?utm_source=chatgpt.com "Run apps on the Android Emulator | Android Studio"
[4]: https://discuss.appium.io/t/appium-android-webviews-documentation-xpath-issues/661?utm_source=chatgpt.com "Appium android webviews documentation/xpath issues"
[5]: https://github.com/line/liff-inspector?utm_source=chatgpt.com "line/liff-inspector: The universal DevTools ..."
[6]: https://developer.android.com/studio/run/device?utm_source=chatgpt.com "Run apps on a hardware device | Android Studio"
[7]: https://developer.android.com/studio/run/emulator-commandline?utm_source=chatgpt.com "Start the emulator from the command line | Android Studio"
[8]: https://discuss.appium.io/t/how-to-identify-webview-elements-in-android-hybrid-app/5140?utm_source=chatgpt.com "How to Identify WebView Elements in Android Hybrid App? - Support"
[9]: https://developers.line.biz/en/docs/liff/release-notes/?utm_source=chatgpt.com "Release notes | LINE Developers"
