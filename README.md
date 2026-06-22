# Lanx

> Business operating system for freelancers — proposals, contracts, time tracking, invoicing, and payments in one connected platform.

---

## What It Does

Freelancers typically manage their workflow across 3–4 disconnected tools — Notion for proposals, DocuSign for contracts, Toggl for time tracking, Wave for invoices. Lanx replaces all of them with one system where each step feeds into the next.

A proposal becomes a contract. A signed contract creates a project. Tracked time generates an invoice. A paid invoice rolls up into your yearly report — automatically.

---

## Features

- **Authentication** — Authentication with JWT and Oauth
- **Client Management** — contact book that anchors every other entity
- **Proposals** — line-item pricing, sent via public link, client accepts without an account
- **Contracts** — auto-drafted from accepted proposals, e-signed via public link
- **Projects** — auto-created on contract signing, milestone or hourly billing
- **Time Tracking** — start/stop timer, manual entry, billable flag per entry
- **Invoices** — generated from tracked time or milestones, PDF, pay link
- **Payments** — Stripe Connect, money routes directly to freelancer's bank
- **Expenses** — log project costs, optional receipt upload
- **Reports** — yearly income, expenses, net profit, revenue by client and month
- **Email Automation** — proposal/contract/invoice notifications, overdue reminders

---

## Tech Stack

| Layer          | Technology            |
| -------------- | --------------------- |
| Runtime        | Node.js + TypeScript  |
| Framework      | Express               |
| Database       | PostgreSQL            |
| ORM            | Drizzle + drizzle-kit |
| Validation     | Zod                   |
| Auth           | JWT + refresh tokens  |
| Payments       | Stripe Connect        |
| Email          | Resend                |
| PDF Generation | Puppeteer             |
| File Storage   | AWS S3 / Cloudinary   |
| Scheduled Jobs | node-cron             |
| Testing        | Vitest                |
| Linting        | ESLint + Prettier     |
| CI/CD          | GitHub Actions        |
| Deployment     | Railway               |
| Monitoring     | Sentry                |
| Docs           | OpenAPI + Swagger UI  |
| API Testing    | Bruno                 |

---

## System Design

### Three API Zones

```
Zone 1 — Authenticated Dashboard (JWT required)
  /api/v1/clients
  /api/v1/proposals
  /api/v1/contracts
  /api/v1/projects
  /api/v1/time-entries
  /api/v1/invoices
  /api/v1/expenses
  /api/v1/reports

Zone 2 — Public Token-Based (no login, client-facing)
  /proposals/view/:token
  /contracts/sign/:token
  /invoices/pay/:token

Zone 3 — Webhooks (Stripe, signature verified)
  /webhooks/stripe
```

### State Machines

```
Proposal  : draft → sent → viewed → accepted / declined / expired
Contract  : draft → sent → signed
Invoice   : draft → sent → viewed → paid / overdue / cancelled
Time Entry: running → stopped → invoiced
Project   : not_started → in_progress → completed
```

### Payment Flow

```
Client pays invoice
  → Stripe Checkout Session routes payment to freelancer's connected account
  → Stripe webhook fires → invoice marked paid in DB
  → Platform never holds funds (Stripe Connect Express)
```

---

## Project Structure

```
src/
├── config/           # env validation (Zod), app/auth/db config
├── middleware/        # requireAuth, error handler, request logger
├── routes/
│   ├── auth/
│   ├── clients/
│   ├── proposals/
│   ├── contracts/
│   ├── projects/
│   ├── time-entries/
│   ├── invoices/
│   ├── expenses/
│   └── reports/
├── public/            # token-based client-facing routes
│   ├── proposals/
│   ├── contracts/
│   └── invoices/
├── webhooks/          # Stripe webhook handler
├── services/          # business logic per domain
├── db/
│   ├── schema/        # Drizzle table definitions
│   └── migrations/    # drizzle-kit generated migrations
├── utils/
│   ├── jwt.ts
│   ├── pdf.ts
│   ├── email.ts
│   └── storage.ts
├── types/
│   └── express.d.ts   # req.user extension
└── index.ts
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- A Stripe account (with Connect enabled)
- A Resend account

### Installation

```bash
git clone https://github.com/brahimxdev/lanx.git
cd lanx
npm install
```

### Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

```env
# App
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000
API_VERSION=v1

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/lanx

# Auth
JWT_SECRET=
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=
REFRESH_TOKEN_EXPIRES_IN=7d

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Email
RESEND_API_KEY=

# Storage
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### Database Setup

```bash
# Run migrations
npm run db:migrate

# (Optional) Seed demo data
npm run db:seed
```

### Development

```bash
npm run dev
```

API runs at `http://localhost:3000`
Swagger docs at `http://localhost:3000/api-docs`

---

## API Documentation

Swagger UI is available at `/api-docs` when running locally.

Bruno collection is in the `/bruno` directory — open it in Bruno to test all endpoints directly.

---

## Scripts

```bash
npm run dev          # start dev server with hot reload
npm run build        # compile TypeScript
npm run start        # run compiled build
npm run test         # run Vitest test suite
npm run lint         # ESLint
npm run format       # Prettier
npm run db:generate  # generate Drizzle migrations from schema
npm run db:migrate   # run pending migrations
npm run db:studio    # open Drizzle Studio (local DB GUI)
npm run db:seed      # seed demo data
```

---

## Build Progress

| Week | Scope                                        | Status         |
| ---- | -------------------------------------------- | -------------- |
| 1    | Auth, Clients, Projects                      | ⬜ Not started |
| 2    | Proposals — create, send, public accept link | ⬜ Not started |
| 3    | Contracts — e-signature flow                 | ⬜ Not started |
| 4    | Time tracking — timer + manual entries       | ⬜ Not started |
| 5    | Invoices — generation + PDF                  | ⬜ Not started |
| 6    | Stripe Connect + payment webhooks            | ⬜ Not started |
| 7    | Expenses, reports, overdue reminders         | ⬜ Not started |
| 8    | Swagger docs, deploy, demo data              | ⬜ Not started |

---

## Database Schema

Schema defined in `src/db/schema/` using Drizzle.
Full ERD: [dbdiagram.io link] ← add when schema is finalised

---

_Built by Ibrahim Yusuf_
