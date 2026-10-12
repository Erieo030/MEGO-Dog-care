# 日期與時間選擇器

- `../DatePickerField.tsx`：共用手刻 Calendar／Time Modal 與選擇草稿，只有按完成才回傳；取消不修改欄位。
- `datePickerStyles.ts`：外觀與欄位樣式。
- `../../utils/taipeiDate.ts`：台灣時間、日期字串與選擇器內部年月日容器的轉換。
- `../../utils/datePicker.ts`：日期範圍比較、限制與時間步進。

欄位的 `value`、`minimumDate`、`maximumDate` 與 `onChange` 都是實際時間點。日期字串以 `taipeiDateFromKey` 轉入；日期選擇結果以 `taipeiDateKey` 轉成字串；不要用裝置的 `getHours`、`toTimeString` 或自行加上沒有時區的 `T12:00:00`。

Modal 內使用 `taipeiPickerValue` 將台灣年月日時分放進 UTC 欄位容器，並只用 UTC getter／setter 操作；這是避免裝置夏令時間影響的內部表示，不代表畫面改用 UTC。輸出透過 `fromTaipeiPickerValue` 轉回實際時間。日期模式回傳選取日期的台灣午夜，時間／日期時間模式回傳台灣時間；更換日期會保留草稿的時分。只有日期的資料可使用 `toTaipeiDateValue` 轉成台灣中午的穩定表示。

共用元件不再阻擋 2000 年以前的日期，生日／到家日期可正常顯示。疫苗、驅蟲等領域原有的日期驗證不由共用元件取消。空白日期維持空白，開啟時才以台灣今天為選擇起點。

測試涵蓋確認／取消、日期邊界、1999 年生日及台灣時分；跨裝置時區測試另外在 UTC、America/New_York 與 Pacific/Auckland 執行。這不取代實機 Modal 驗收。
