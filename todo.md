# 按摩工時登記系統 - 專案 TODO

## 核心功能
- [x] 店家管理：新増、編輯、刪除店家
- [x] 服務類型管理：每家店可設定多種服務類型及 hourly pay
- [x] 工時登記：選擇店家、服務類型、填寶日期（預設今天）、時數、小費
- [x] 自動計算：Total = Hour × Hourly Pay + Tips
- [x] 工時紀錄編輯和刪除
- [x] 統計報表：每月總結頁面，按店家分別統計
- [x] 統計顯示：總工時、總收入、總小費

## 資料匯出與通知
- [x] CSV 匯出功能
- [x] PWA 推播通知設定
- [x] 每日固定時間提醒登記工時

## PWA 功能
- [x] Service Worker 實現
- [x] manifest.json 設定
- [x] 離線使用支援
- [x] iOS 主画面快捷方式支援

## 資料庫與後端
- [x] PostgreSQL schema 設計（shops、services、records 表）
- [x] tRPC 程序：店家 CRUD
- [x] tRPC 程序：服務類型 CRUD
- [x] tRPC 程序：工時紀錄 CRUD
- [x] tRPC 程序：統計報表查詢
- [x] tRPC 程序：CSV 匯出

## 前端 UI 元件
- [x] 全局主題設定（北歐極簡美学）
- [x] 導航佐局（DashboardLayout）
- [x] 店家管理頁面
- [x] 工時登記表單
- [x] 統計報表頁面
- [x] 設定頁面（推播提醒、資料匯出）

## Amplify Gen2 與部署
- [x] Amplify 資料东結構設定
- [x] Backend definition 配置
- [x] PostgreSQL 連線設定
- [x] API 層配置
- [x] 繁體中文部署 README 文件

## 測試與優化
- [ ] 單元測試（Vitest）
- [ ] 響應式設計測試
- [ ] PWA 離線功能測試
- [ ] 部署前最終檢查

