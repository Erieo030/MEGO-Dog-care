# Health events feature

- `components/HealthEventOptions.tsx`：嘔吐與排便快速表單共用的單選／複選 chips；保持原尺寸與顏色。
- `components/HealthEventScreenState.tsx`：三種快速表單共用的載入與錯誤重試畫面。
- `createHealthEventContent.ts`：新增健康紀錄的快速問題與嚴重程度選項。
- `components/CreateHealthEventChoices.tsx`：新增畫面的快速選項欄位與嘔吐補充資訊。

各異常類型的欄位、驗證、安全提醒與 API 仍各自留在對應畫面，避免錯誤合併不同醫療紀錄規則。

`HealthEventDetailScreen` 頁首顯示事件摘要、日期與嚴重程度；下方只呈現補充資料，避免資訊重複。附件由 `components/AttachmentGallery.tsx` 依父容器寬度排版，有照片與空狀態都不依賴整個螢幕寬度。

必填欄位的錯誤顯示在欄位下方（`components/FieldError.tsx`），不使用對話框：形狀、顏色、發生次數、精神狀況、主要觀察項目與發生時間各自標示，送出時捲到第一個出錯的欄位並震動一次，選擇選項後即清除該欄訊息。`HealthEventOptions` 的 chips 帶 `accessibilityRole="radio"` 與選取狀態。儲存成功直接退回清單或首頁，不另外提示；符合安全提醒條件時才顯示提醒，並等使用者確認後才離開。
