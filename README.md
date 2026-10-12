# MEGO｜毛孩照護紀錄 App

把狗狗的日常狀況、健康異常、體重、就醫、疫苗、驅蟲、用藥與提醒集中在一個 App，方便飼主回顧，也方便整理資料帶去給獸醫參考。

> [!IMPORTANT]
> MEGO 是**紀錄與整理工具**，不提供疾病診斷、處方或用藥指示。照片分類與 AI 回覆都只是輔助，請以獸醫的專業判斷為準。

**目錄**：[功能總覽](#功能總覽) · [技術棧](#技術棧) · [快速開始](#快速開始) · [環境變數](#環境變數) · [開發與測試](#開發與測試) · [專案結構](#專案結構) · [資料與隱私](#資料與隱私) · [目前限制](#目前限制)

---

## 功能總覽

App 底部有六個分頁。「照片」和「地圖」目前暫時作為獨立入口，之後再決定要整合到哪個分頁。

| 分頁 | 主要功能 |
| --- | --- |
| 🏠 **首頁** | 今日待做、日常健康觀察，以及新增日常、健康異常、體重、提醒的捷徑 |
| 📅 **紀錄** | 月曆與單日紀錄；日常、健康異常、體重、就醫、疫苗、驅蟲、用藥紀錄；時間軸 |
| 🖼️ **照片** | 照護相簿：把既有紀錄附上的照片依毛孩、月份與週整理 |
| 🗺️ **地圖** | 就醫地圖：臺中市夜間／急診動物醫院的搜尋、定位排序、電話與導航 |
| 💬 **MEGO AI** | 照護問答（附參考來源）、自己紀錄的快速查詢、就醫前摘要 |
| ⚙️ **設定** | 毛孩管理、毛孩身份 QR、PDF 匯出、權限、AI 資料使用說明、首頁主題 |

### 照護紀錄

- **帳號與毛孩**：Email 註冊、登入、登出；可建立多隻毛孩並切換、編輯資料。
- **紀錄類型**：日常（喝水、飼料、精神、便便）、健康異常（10 種類型）、體重、就醫、疫苗、驅蟲、用藥。
- **照片附件**：健康異常、體重、就醫和毛孩頭像可以附上照片。
- **複製新增**：疫苗、驅蟲、用藥可以複製上一筆，減少重複輸入。
- **提醒**：支援重複週期；列表的主要操作是「完成」與「延後」，編輯、略過、刪除收在「更多」。從月曆進入時可以查看指定日期的提醒。
- **健康觀察**：首頁只依喝水、飼料、精神與便便的連續變化提示，不混入健康異常事件。

### 照護相簿與就醫地圖

- **照護相簿**：可依「全部／健康異常／就醫／體重」篩選。健康異常的縮圖預設遮住，點開大圖後可回到原始紀錄；照片沿用原本的附件，不另外複製。
- **就醫地圖**：收錄臺中市政府公開名冊的 11 家夜間／急診動物醫院，其中 10 家顯示查核後的座標，1 家標示「位置待確認」。從就醫表單開啟時，可以把醫院名稱帶回表單。

### AI 輔助

- **便便照片分類（選用）**：以 EfficientNet-B0（ONNX）在後端 CPU 推論，建議「正常／偏軟／水狀／偏硬」其中一項，飼主確認後才會儲存。沒有設定模型時，仍可手動填寫日常紀錄。
- **MEGO AI**：常見的紀錄查詢由規則直接回答；犬隻照護知識問題會先以 RAG 檢索照護資料，再由語言模型回答並附上參考來源。
- **就醫前摘要**：選擇 7／15／30 天與資料類別，先顯示一頁看診重點，也可以自填想詢問的事項；原始紀錄和 AI 整理預設收合。
- **PDF 照護報告**：第一頁是看診快速摘要，之後是完整紀錄；報告不含圖片。

---

## 技術棧

| 層級 | 使用技術 |
| --- | --- |
| 前端 | React 19.2.3、React Native 0.86.3、Expo SDK 57、TypeScript 6、React Navigation 7、Ionicons、AsyncStorage |
| 前端原生功能 | expo-image-picker、expo-notifications、expo-secure-store、react-native-maps、expo-location |
| 後端 | Python 3、FastAPI、Pydantic 2、PyMongo、Uvicorn、ReportLab、PyJWT |
| 照片分類 | ONNX Runtime、NumPy、Pillow |
| 資料庫 | MongoDB 7 |
| 開發環境 | Docker Compose、Mongo Express、Expo Metro |
| 測試與品質 | TypeScript、ESLint、Prettier、Jest、pytest、GitHub Actions |

---

## 快速開始

### 1. 需要的工具

- Docker（含 Docker Compose），並確認 Docker daemon 已啟動
- Node.js 與 npm
- Python 3
- `curl`、`ip`、`sha256sum`（`start.sh` 會檢查這些指令）
- 手機安裝 Expo Go（需支援 Expo SDK 57）

> iOS 原生建置需要 macOS 與 Xcode；一般的本機測試用 Expo Go 即可。

### 2. 下載與設定

```bash
git clone https://github.com/Erieo030/MEGO-Dog-care.git
cd MEGO-Dog-care
cp env.example .env
```

打開根目錄的 `.env`，至少確認以下兩項（完整說明見 [環境變數](#環境變數)）：

- `MONGO_URI`：帳號密碼要和 `MONGO_USERNAME`、`MONGO_PASSWORD` 相同
- `MONGO_DB`：資料庫名稱

### 3. 一鍵啟動

```bash
./start.sh
```

腳本會依序安裝套件、啟動 MongoDB 與 Mongo Express、啟動 FastAPI，最後啟動 Expo。`AUTH_SECRET_KEY` 留白時會自動產生，手機連線用的 API 網址也會自動偵測。

手機和電腦不在同一個網段時，改用 tunnel 模式：

```bash
EXPO_CONNECTION=tunnel ./start.sh
```

### 4. 服務位置

| 服務 | 位址 |
| --- | --- |
| FastAPI | `http://localhost:8000` |
| Swagger API 文件 | `http://localhost:8000/docs` |
| Mongo Express | `http://localhost:8082` |
| Expo | 依終端機顯示的 QR Code／網址 |

在終端機按 `Ctrl+C` 即可停止所有服務；MongoDB 的資料 volume 會保留。

---

## 環境變數

所有設定都集中在根目錄的 `.env`，每個欄位的中文說明請看 [`env.example`](env.example)。

| 類別 | 主要變數 | 說明 |
| --- | --- | --- |
| 資料庫（必填） | `MONGO_URI`、`MONGO_DB` | MongoDB 連線與資料庫名稱 |
| 登入 | `AUTH_SECRET_KEY`、`AUTH_ACCESS_TOKEN_MINUTES`、`AUTH_REFRESH_TOKEN_DAYS` | 簽章金鑰至少 32 字元，留白時由 `start.sh` 產生 |
| AI 服務（選用） | `AI_MODEL_API_URL`、`AI_MODEL_API_KEY`、`AI_MODEL_NAME`、`AI_MODEL_TIMEOUT_SECONDS` | 聊天、Embedding、Reranker 也可以各自設定端點 |
| RAG（選用） | `MEGO_RAG_ENABLED`、`MEGO_RAG_TOP_K`、`MEGO_RAG_TIMEOUT_SECONDS` | 停用時不影響一般聊天 |
| 照片分類（選用） | `STOOL_MODEL_DIR`、`STOOL_ORT_THREADS` | 留白時停用照片分類 |
| 附件 | `ATTACHMENT_STORAGE_DIR`、`MEGO_UPLOAD_MAX_MB` | 預設存放在 `backend/uploads`，單檔上限 10 MB |
| App（Expo） | `EXPO_CONNECTION`、`MEGO_API_URL`、`EXPO_PUBLIC_*` | 連線方式、API 網址與前端逾時設定 |

> [!WARNING]
> 請勿提交 `.env`、API Key 或密碼。所有 `EXPO_PUBLIC_*` 的值都會打包進 App，**不能存放任何秘密**。正式部署請使用 HTTPS，並把 CORS 設為正式網域。

### 便便照片分類模型

`stool-classification/model/efficientnet_b0/` 是本機的模型部署資料夾，需要包含 `model.onnx` 與 `model_meta.json`；ONNX 權重不納入 Git。設定時把 `.env` 的 `STOOL_MODEL_DIR` 指向這個資料夾即可。研究計畫和部署細節見 `stool-classification/docs/`。

---

## 開發與測試

```bash
# 前端：型別、lint、格式與測試
cd frontend
npm run typecheck
npm run lint
npm run format:check
npm test

# 前端：Expo 開發與平台 build
npm start
npm run ios
npm run android
npm run web

# 後端測試（在專案根目錄執行）
cd ..
PYTHONPATH=backend pytest -q backend/tests

# 其他檢查
bash -n start.sh
git diff --check
```

每次推送到 GitHub，GitHub Actions 都會自動執行後端測試、前端型別檢查與前端測試。API 的參數與授權需求以 Swagger（`/docs`）為準。

---

## 專案結構

```text
MEGO-Dog-care/
├── frontend/
│   ├── screens/        # 首頁、提醒、時間軸、就醫、健康異常、AI 與毛孩表單等畫面
│   ├── features/       # 依照護領域整理的畫面、元件、樣式與模組 README
│   ├── components/     # 共用元件（日期／時間 Modal、按鈕、底部導覽）
│   ├── services/       # API client 與各功能 service
│   ├── utils/          # 可測試的前端業務規則（例如健康趨勢引擎）
│   ├── contexts/       # Auth、Pet、Settings 狀態
│   ├── navigation/     # Root、Tab 與功能 Stack
│   ├── constants/      # 色票、提醒、時間軸等固定設定
│   └── assets/         # 背景、Logo 與圖片
├── backend/
│   ├── app/api/routes/ # FastAPI 路由
│   ├── app/services/   # CRUD、AI、匯出與業務邏輯
│   ├── app/schemas/    # Pydantic 輸入／輸出模型
│   ├── app/db/         # MongoDB 連線與索引
│   ├── rag_experiment/ # RAG 知識文件、索引與評估
│   ├── tests/          # 後端測試
│   ├── main.py         # ASGI 啟動入口
│   └── docker-compose.yml  # MongoDB／Mongo Express
├── stool-classification/  # 便便分類的研究文件、本機模型部署包與 benchmark 參考
├── env.example         # 環境變數範本
└── start.sh            # 本機一鍵啟動 MongoDB、FastAPI 與 Expo
```

`dog-care/` 是本機的 Python 虛擬環境，不納入 Git。

### 前端功能在哪裡

| 功能 | 位置 |
| --- | --- |
| 疫苗、驅蟲、用藥、毛孩身份 QR、設定子頁 | `frontend/features/<功能>/screens/` |
| 首頁、提醒、時間軸、就醫、健康異常、AI、毛孩表單 | 畫面在 `frontend/screens/`，欄位與元件在 `frontend/features/<功能>/` |
| 照護相簿 | `frontend/features/care-photos/`（後端 `care_photo_service.py`） |
| 就醫地圖 | `frontend/features/vet-map/` |
| 導覽入口 | `frontend/navigation/MainTabs.tsx`、`SharedHealthScreens.tsx` |

資料流：畫面透過 `frontend/services/` 呼叫 API，不直接使用 `fetch`；後端 `app/api/routes/` 再交給 `app/services/` 處理資料。各功能資料夾的 `README.md` 有更細的位置與資料流說明。

---

## 資料與隱私

- **照護資料**：帳號、毛孩與照護紀錄存在 MongoDB；照片壓縮後存在後端的 `backend/uploads/`，資料庫只保存附件資訊。**備份時兩者都要保存。**
- **AI 對話**：對話紀錄只保存在使用者的手機上，不跨裝置同步；首次使用 AI 前會先顯示資料使用說明。犬隻照護的 RAG 參考資料和個人照護紀錄分開管理。
- **便便照片**：分類只回傳建議，不保存照片，所以不會出現在照護相簿。
- **定位**：只在就醫地圖按「使用目前位置」時才請求，不使用背景定位；拒絕定位仍可瀏覽與搜尋醫院。
- **毛孩身份 QR**：以隨機的公開 Token 呈現，只顯示飼主選擇公開的資料。
- **金鑰**：AI 外部服務的金鑰只設定在後端。
- **時區**：後端時間一律以台灣時區（UTC+8）計算。

---

## 目前限制

- **分頁**：「照片」「地圖」暫時是獨立分頁，整合位置還沒決定。
- **毛孩刪除**：後端已有刪除毛孩的 API，但 App 目前**沒有刪除毛孩的入口**。
- **照護相簿（第一版）**：不含頭像、尚未儲存的附件，也不能另外上傳生活照片。「健康異常」照片來自健康事件附件，和首頁的日常健康觀察是兩回事；「就醫照片」包含就醫時附上的文件或藥袋。照片讀取失敗時會提供重試，不會當成沒有照片。
- **就醫地圖（第一版）**：只收錄臺中市夜間／急診動物醫院。名冊與座標的更新日期不代表院所當下的營業狀態，出發前請先打電話確認。地圖沒有社群、預約或醫院合作功能。
- **AI 與照片分類**：結果只供紀錄整理參考，不能取代獸醫診斷。
