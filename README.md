# Work Hour Tracker

A single-user MVP web application for tracking work hours and income.

This project is designed as a practical tool for managing work records, service rates, and monthly earnings.

⚠️ Currently in MVP stage.

---

## ✨ Features

- DEV single-user mode (no login required in development)
- Shop management
- Service type management (supports different hourly rates)
- Work record tracking
- Automatic earnings calculation
- Monthly statistics
- Docker-based PostgreSQL setup

---

## 🛠 Tech Stack

- React + Vite
- TypeScript
- tRPC
- PostgreSQL
- Docker
- React Query

---

## 🧪 Development Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start development server

```bash
pnpm dev
```

### DEV Mode Behavior

Automatically seeds a fallback user (id=1)

No login required in development

Production mode still requires authentication

## 🚀 Production Build
pnpm build
pnpm start

## 📦 Database

PostgreSQL (Docker)

Tables:
users
workers（成員／工作者，一個帳號可多個成員）
shops
serviceTypes
workRecords
notificationSettings

### 若「新增成員」失敗（資料庫尚未有 workers 表）

若資料庫是舊版建好的、從未跑過包含 workers 的 migration，請在專案根目錄執行：

```bash
pnpm run db:migrate-add-workers
```

會建立 `workers` 表、在 `workRecords` 加上 `workerId`，並為每位使用者建立預設成員、把既有工時掛到該成員。完成後重啟 dev server，再到設定頁新增成員即可。

### 推播通知（本地測試）

1. 產生 VAPID 金鑰：
   ```bash
   pnpm run generate-vapid
   ```
2. 將輸出複製到 `.env`（建立 `VAPID_PUBLIC_KEY` 和 `VAPID_PRIVATE_KEY`）
3. 執行遷移：
   ```bash
   pnpm run db:migrate-add-push-subscriptions
   ```
4. 重啟 `pnpm dev`
5. 開啟設定頁 → 啟用推播 → 點「保存設定」→ 允許通知
6. 點「訂閱推播」完成訂閱，於設定時間會收到工時提醒

## 🧭 Roadmap

Improve Work Record UX (auto-select service type when only one option)
Simplified personal mode
CSV export
PWA support
UI polish

## 📌 Notes

This project is built as a practical MVP with real-world usage in mind.
Architecture separates development and production behavior to ensure safety and flexibility.