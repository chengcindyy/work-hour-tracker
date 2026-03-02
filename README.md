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
shops
serviceTypes
workRecords
notificationSettings

## 🧭 Roadmap

Improve Work Record UX (auto-select service type when only one option)
Simplified personal mode
CSV export
PWA support
UI polish

## 📌 Notes

This project is built as a practical MVP with real-world usage in mind.
Architecture separates development and production behavior to ensure safety and flexibility.