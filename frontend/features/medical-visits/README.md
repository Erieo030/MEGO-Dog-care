# 就醫紀錄模組

- `medicalVisitContent.ts`：用藥預設值與日期格式轉換。
- `medicalVisitDetailContent.ts`：詳情列與日期格式轉換。
- `components/MedicalVisitTextField.tsx`：共用文字欄位外觀。
- `components/MedicalVisitMedicationEditor.tsx`：單筆用藥編輯區。
- `components/MedicalVisitDetailSections.tsx`：詳情狀態、資料列、藥物卡。
- `screens/MedicalVisitFormScreen.tsx`：表單狀態、驗證、儲存 API、回診提醒同步。
- `screens/MedicalVisitDetailScreen.tsx`：讀取、編輯、刪除、分享與附件操作。

詳情頁將編輯與分享摘要列為主要操作，刪除獨立放在其後作次要操作；分享、刪除確認、附件及 API 行為不變。

表單驗證、就醫 API、附件上傳與導航仍保留在畫面層；UI 子元件不發送請求。

表單的就醫地圖入口帶入 `selectForVisit`，選院後以 `popTo` 合併醫院名稱到既有表單，不重建空白表單。從首頁急診地圖、AI 照護工具或就醫列表進入時只瀏覽；已儲存的就醫照片可從紀錄頁右上角的「照護相簿」查看，仍回到原始就醫紀錄編輯或刪除，不複製資料。

「從地圖選擇動物醫院」是與名稱欄位間隔 12 的等寬淡綠描邊按鈕，有地圖圖示、箭頭及按壓回饋。回診日期使用共用日期欄位的置中呈現與清除按鈕，清除後一併取消回診提醒；仍保留原本的日期時間模式與範圍驗證。

「是否建立回診提醒？」與疫苗／驅蟲共用 `components/ReminderToggleField.tsx`。文字區彈性換行，Switch 固定在外框右側並垂直置中，開啟時淡綠底；沒有下次回診日期時保留停用說明，不再整區隱藏。儲存時停用開關。日期清除按鈕位於標題右側，避免日期框下方多一個短按鈕。

日期顯示與表單的用藥日期共用 `utils/taipeiDate.ts`，以台灣時區解析和輸出，不再使用沒有時區的日期字串或重複的本機日期轉換函式。
