# AI feature

- `components/AIConversationSessionRow.tsx`：最近對話列、左滑顯示刪除操作。
- `components/AIChatContent.tsx`：對話泡泡、空對話引導、快速提問與就醫前摘要入口。
- `pre-vet/`：就醫前摘要的文案、樣式與摘要表格元件。
- `aiHubStyles.ts`、`aiChatStyles.ts`：AI 主頁與聊天頁樣式；畫面流程仍由 `../../screens/AIAssistantHubScreen.tsx`、`AIChatScreen.tsx` 管理。
- `aiResponseContent.ts`：回答產生方式、照護紀錄／外部文獻來源及本機對話保存的統一文案。
- `../../services/aiDataConsentService.ts`：開始對話前查詢並記錄後端帳號的 AI 資料使用確認；未確認不可進入聊天。

自由提問仍可討論一般與寵物主題；僅在問題可能需要個人化背景時，載入相關毛孩紀錄，並由模型選擇引用來源，前端在回覆下方顯示。來源隨 session 訊息保存。
既有 AI session 建立、啟用、刪除、上限確認與 AI 對話導航維持於畫面／service 層。

回覆的 `generationMode` 隨訊息保存：`llm` 顯示「MEGO AI 回覆」，`deterministic` 顯示「系統整理（非 AI）」。沒有產生方式資訊的訊息只標示「MEGO 回覆」，不猜測來源。前端分開顯示「使用你的照護紀錄」和可開啟原文的「照護參考文獻」；未附來源的 AI 回覆提示仍需核對，引用不代表獸醫審閱。

最近對話頁與設定明確說明：對話只保存在這支手機，不跨裝置同步，換機或移除 App 不會自動恢復。移除未被呼叫的 `createNewAISession`／`commitNewAISession`，新對話仍走既有確認與建立流程。
