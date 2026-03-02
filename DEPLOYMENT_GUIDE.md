# 按摩工時登記系統 - AWS Amplify Gen2 部署指南

## 目錄

1. [前置要求](#前置要求)
2. [本地開發環境設置](#本地開發環境設置)
3. [AWS 帳號準備](#aws-帳號準備)
4. [部署到 AWS Amplify](#部署到-aws-amplify)
5. [配置 PostgreSQL 資料庫](#配置-postgresql-資料庫)
6. [環境變數設置](#環境變數設置)
7. [首次部署](#首次部署)
8. [後續部署](#後續部署)
9. [監控和維護](#監控和維護)
10. [常見問題](#常見問題)

---

## 前置要求

在開始部署之前，請確保您已經安裝了以下工具：

- **Node.js**：版本 18.0 或更高（[下載](https://nodejs.org/)）
- **npm** 或 **pnpm**：Node.js 包管理器
- **Git**：版本控制系統（[下載](https://git-scm.com/)）
- **AWS CLI**：Amazon Web Services 命令行工具（[安裝指南](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)）

### 驗證安裝

```bash
node --version      # 應該顯示 v18.0.0 或更高
npm --version       # 應該顯示 8.0.0 或更高
git --version       # 應該顯示 git version 2.0.0 或更高
aws --version       # 應該顯示 aws-cli/2.x.x
```

---

## 本地開發環境設置

### 1. 克隆或下載專案

```bash
# 如果已有 Git 倉庫
git clone <your-repository-url>
cd work-hour-tracker

# 或者直接進入專案目錄
cd /home/ubuntu/work-hour-tracker
```

### 2. 安裝依賴

```bash
# 使用 npm
npm install

# 或使用 pnpm（推薦）
pnpm install
```

### 3. 設置本地環境變數

創建 `.env.local` 文件（根據 `.env.example` 範本）：

```bash
# 複製範本
cp .env.example .env.local

# 編輯 .env.local 並填入您的配置
```

### 4. 啟動本地開發伺服器

```bash
npm run dev
# 或
pnpm dev
```

應用將在 `http://localhost:3000` 啟動。

---

## AWS 帳號準備

### 1. 創建 AWS 帳號

如果您還沒有 AWS 帳號，請訪問 [AWS 官方網站](https://aws.amazon.com/) 創建一個。

### 2. 配置 AWS CLI

```bash
aws configure
```

系統會提示您輸入以下信息：

- **AWS Access Key ID**：您的 AWS 訪問密鑰 ID
- **AWS Secret Access Key**：您的 AWS 秘密訪問密鑰
- **Default region name**：選擇最近的地區，例如 `ap-southeast-1`（新加坡）或 `ap-northeast-1`（東京）
- **Default output format**：輸入 `json`

### 3. 驗證配置

```bash
aws sts get-caller-identity
```

如果配置成功，您將看到您的 AWS 帳號信息。

### 4. 創建 IAM 使用者（可選但推薦）

為了安全起見，建議創建一個專門用於部署的 IAM 使用者：

1. 登錄 [AWS 管理控制台](https://console.aws.amazon.com/)
2. 進入 **IAM** 服務
3. 創建新使用者並附加以下權限：
   - `AmplifyFullAccess`
   - `RDSFullAccess`
   - `SecretsManagerReadWrite`
   - `CloudFormationFullAccess`

---

## 部署到 AWS Amplify

### 1. 初始化 Amplify

```bash
npm install -g @aws-amplify/cli
amplify init
```

按照提示進行配置：

- **Project name**：輸入 `work-hour-tracker`
- **Environment name**：輸入 `prod`
- **Default editor**：選擇您喜歡的編輯器
- **App type**：選擇 `javascript`
- **JavaScript framework**：選擇 `react`
- **Source Directory Path**：輸入 `client/src`
- **Distribution Directory Path**：輸入 `dist`
- **Build Command**：輸入 `npm run build`
- **Start Command**：輸入 `npm run dev`

### 2. 添加後端資源

```bash
amplify add api
```

選擇以下選項：

- **Select from pre-configured Amplify templates**：選擇 `GraphQL`
- **Provide custom type definitions**：選擇 `Yes`
- 使用 `amplify/schema.graphql` 中的定義

### 3. 配置資料庫

```bash
amplify add database
```

選擇以下選項：

- **Select a database service**：選擇 `Amazon RDS`
- **Select a database engine**：選擇 `PostgreSQL`
- **Select database tier**：選擇 `db.t3.micro`（免費層）
- **Database name**：輸入 `workhourtrackerdb`
- **Master username**：輸入 `postgres`
- **Master password**：輸入一個安全的密碼

### 4. 推送到雲端

```bash
amplify push
```

系統會詢問您是否要繼續。輸入 `Y` 確認。

### 5. 連接到 Amplify Hosting

```bash
amplify add hosting
```

選擇以下選項：

- **Select the plugin module to execute**：選擇 `Hosting with Amplify Console`
- **Choose a type**：選擇 `Manual deployment`

### 6. 部署應用

```bash
amplify publish
```

部署完成後，您將獲得一個公開 URL，可以訪問您的應用。

---

## 配置 PostgreSQL 資料庫

### 1. 連接到資料庫

獲取資料庫連接信息：

```bash
amplify status
```

查找 RDS 資料庫的端點和連接詳情。

### 2. 運行數據庫遷移

```bash
# 本地運行遷移
pnpm db:push

# 或在 AWS 環境中運行
amplify env add
amplify push
```

### 3. 驗證資料庫連接

```bash
# 使用 psql 連接到資料庫（需要安裝 PostgreSQL 客戶端）
psql -h <database-endpoint> -U postgres -d workhourtrackerdb
```

輸入密碼後，您應該能夠連接到資料庫。

---

## 環境變數設置

### 1. 本地環境變數

創建 `.env.local` 文件：

```env
# 資料庫連接
DATABASE_URL=postgresql://postgres:password@localhost:5432/workhourtrackerdb

# OAuth 配置
VITE_APP_ID=your_app_id
VITE_OAUTH_PORTAL_URL=https://your-oauth-provider.com
OAUTH_SERVER_URL=https://your-oauth-server.com

# JWT 秘鑰
JWT_SECRET=your_jwt_secret_key_here

# 其他配置
NODE_ENV=development
```

### 2. AWS Amplify 環境變數

在 AWS 管理控制台中設置環境變數：

1. 進入 **Amplify Console**
2. 選擇您的應用
3. 進入 **Environment variables**
4. 添加以下變數：

| 變數名 | 值 |
|--------|-----|
| `DATABASE_URL` | PostgreSQL 連接字符串 |
| `JWT_SECRET` | 您的 JWT 秘鑰 |
| `NODE_ENV` | `production` |

---

## 首次部署

### 1. 準備應用

```bash
# 確保所有依賴已安裝
pnpm install

# 運行測試（可選）
pnpm test

# 構建應用
pnpm build
```

### 2. 部署

```bash
# 使用 Amplify CLI 部署
amplify publish

# 或使用 Git 連接自動部署
git push origin main
```

### 3. 驗證部署

1. 訪問 Amplify 提供的 URL
2. 測試登錄功能
3. 測試工時登記功能
4. 檢查資料庫中的數據

---

## 後續部署

### 1. 更新應用

進行代碼更改後：

```bash
# 提交更改
git add .
git commit -m "描述您的更改"

# 推送到主分支
git push origin main
```

Amplify 將自動檢測更改並重新部署應用。

### 2. 手動部署

如果需要立即部署：

```bash
amplify publish
```

### 3. 回滾部署

如果需要回滾到之前的版本：

```bash
# 查看部署歷史
amplify status

# 回滾到特定版本
amplify rollback
```

---

## 監控和維護

### 1. 查看日誌

```bash
# 查看 Amplify 部署日誌
amplify logs

# 或在 AWS 管理控制台中查看 CloudWatch 日誌
```

### 2. 監控應用性能

在 AWS 管理控制台中：

1. 進入 **CloudWatch**
2. 查看應用的指標（CPU、內存、請求數等）
3. 設置告警以監控異常

### 3. 定期備份

```bash
# 備份資料庫
aws rds create-db-snapshot \
  --db-instance-identifier workhourtrackerdb \
  --db-snapshot-identifier workhourtrackerdb-backup-$(date +%Y%m%d)
```

### 4. 更新依賴

定期檢查和更新依賴：

```bash
# 檢查過時的依賴
npm outdated

# 更新依賴
npm update

# 或使用 pnpm
pnpm update
```

---

## 常見問題

### Q1：部署失敗，提示「Permission Denied」

**解決方案**：
1. 檢查 AWS 認證信息：`aws sts get-caller-identity`
2. 確保 IAM 使用者有足夠的權限
3. 重新配置 AWS CLI：`aws configure`

### Q2：資料庫連接失敗

**解決方案**：
1. 檢查資料庫端點是否正確
2. 驗證安全組設置允許連接
3. 確保資料庫實例正在運行

### Q3：應用在部署後無法訪問

**解決方案**：
1. 檢查 Amplify 部署狀態
2. 查看 CloudWatch 日誌以找出錯誤
3. 確保環境變數已正確設置

### Q4：如何自定義域名？

**解決方案**：
1. 在 Amplify 控制台中進入 **Domain Management**
2. 添加自定義域名
3. 按照說明更新 DNS 記錄

### Q5：如何啟用 HTTPS？

**解決方案**：
Amplify 自動為所有應用啟用 HTTPS。您無需進行任何額外配置。

---

## 支援和幫助

如需更多幫助，請參考以下資源：

- [AWS Amplify 官方文檔](https://docs.amplify.aws/)
- [AWS Amplify CLI 參考](https://docs.amplify.aws/cli/)
- [PostgreSQL 官方文檔](https://www.postgresql.org/docs/)
- [React 官方文檔](https://react.dev/)

---

## 安全最佳實踐

1. **不要在代碼中存儲敏感信息**：使用環境變數存儲 API 密鑰和密碼
2. **定期更新依賴**：保持所有包都是最新版本
3. **使用強密碼**：為資料庫和 AWS 帳號設置強密碼
4. **啟用多因素認證**：在 AWS 帳號上啟用 MFA
5. **定期備份**：定期備份資料庫和應用數據
6. **監控日誌**：定期檢查應用和資料庫日誌以發現異常活動

---

## 成本估算

基於 AWS 免費層和標準定價：

| 服務 | 免費層 | 超出免費層後 |
|------|--------|------------|
| Amplify Hosting | 前 15GB/月 | $0.15/GB |
| RDS (db.t3.micro) | 12 個月 | $0.017/小時 |
| Data Transfer | 1GB/月 | $0.09/GB |

**預計月成本**：在免費層內為 $0；超出後約 $10-20/月。

---

## 更新日誌

### 版本 1.0.0（2026-02-27）

- 初始版本發佈
- 支援店家管理
- 支援工時登記
- 支援統計報表
- 支援 PWA 離線功能
- 支援 CSV 匯出

---

祝您部署順利！如有任何問題，請聯繫技術支援。
