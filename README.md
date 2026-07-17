# Gomen

> Search usernames. Pay securely. Reveal the encrypted current password behind a one-time token.

Gomen is a production-ready Next.js marketplace where each "account" has a publicly visible previous password and an AES-256-GCM encrypted current password. Customers search by username, pay via Razorpay, and unlock the current password through a single-use, 10-minute token. Admins manage the catalogue from a full dashboard.

---

## Table of contents

1. [Features](#features)
2. [Tech stack](#tech-stack)
3. [Architecture & security model](#architecture--security-model)
4. [Quick start (local dev)](#quick-start-local-dev)
5. [Environment variables](#environment-variables)
6. [Database](#database)
7. [Razorpay setup](#razorpay-setup)
8. [Firebase setup](#firebase-setup)
9. [Admin setup](#admin-setup)
10. [PWA](#pwa)
11. [Deployment (Vercel + Firebase)](#deployment-vercel--firebase)
12. [Project structure](#project-structure)
13. [API reference](#api-reference)
14. [Scripts](#scripts)
15. [Troubleshooting](#troubleshooting)

---

## Features

### Customer flow (no login required)
- Search by username with live debounced results.
- Each result card shows: `username`, `previous password` (with copy button), `price`, and `current password 🔒 Locked`.
- Buy Access button opens the Razorpay checkout.
- After server-side signature verification, a random 64-character one-time unlock token is minted and stored in the DB.
- User is redirected to `/unlock?token=…` where the backend decrypts and reveals the current password exactly once.
- Refreshing the unlock page shows "This token has already been used."

### Admin panel
- Email + password login backed by Firebase Auth (with a sandbox demo login).
- Add / edit / delete accounts, search, paginate.
- Statistics dashboard: total accounts, today's sales, monthly sales, revenue, successful unlocks, expired tokens, failed unlock attempts.
- 7-day revenue + sales charts (Recharts).
- Top accounts by sales.
- Payments table, logs table (every payment, unlock, failed unlock, expired token, admin action).

### Security
- Current password encrypted at rest with **AES-256-GCM** (random IV + auth tag per record).
- Encryption key lives only in `ENCRYPTION_SECRET` on the server — never shipped to the client.
- Decryption only happens inside the `/api/unlock` route **after** payment verification + token validation.
- The encrypted field is **never** included in any API response that goes to the browser.
- Payment verification uses Razorpay HMAC SHA256 signature check on the server; the frontend's "success" is never trusted.
- One-time tokens are 64 random hex characters, expire after 10 minutes, and are marked `used:true` after a single reveal.
- Admin routes protected by a server-side session cookie + middleware + per-request `requireAdmin()` check.
- Rate limiting on search, order creation, payment verification, and unlock APIs.
- NoSQL-injection-style characters stripped from search queries.

### UX
- Glassmorphism + gradient hero, rounded cards, Framer Motion transitions.
- Dark & light mode (next-themes, default dark).
- Mobile-first responsive layouts.
- Loading skeletons everywhere data is fetched.
- Toast notifications (sonner).
- Confirmation dialogs for destructive admin actions.
- Copy buttons for username, previous password, and the revealed current password.

### PWA
- Installable (manifest + icons + maskable icon).
- Service worker with network-first navigation + offline fallback page.
- Apple touch icon + splash colours.

---

## Tech stack

| Layer | Choice |
|------|--------|
| Framework | Next.js 16 (App Router) — code is compatible with Next.js 15 |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS 4 + shadcn/ui (New York) |
| Animation | Framer Motion |
| Auth | Firebase Authentication (admin only) + server-side session cookies |
| Database | Firebase Firestore (production) · Prisma + SQLite (sandbox/preview fallback) |
| Storage | Firebase Storage |
| Cloud Functions | Firebase Cloud Functions v2 (Razorpay webhook + server-side unlock) |
| Payments | Razorpay (orders + signature verification + webhooks) |
| Charts | Recharts |
| Deployment | Vercel (Next.js) + Firebase (data + functions) |

> **Note on Next.js version**: the user-facing requirements ask for Next.js 15. The codebase is fully compatible with Next.js 15 — the App Router patterns, route handlers, and server actions used here are identical in 15 and 16. The sandbox ships Next.js 16, so the code targets 16; to downgrade, change `next` in `package.json` to `^15` and re-run `bun install`.

> **Note on database**: the codebase supports both Firebase Firestore (production) and Prisma+SQLite (local preview). The same repository code in `src/lib/repository.ts` automatically picks the right backend based on whether `FIREBASE_PROJECT_ID` is set. This means the preview you see here is fully functional — when you deploy with real Firebase credentials, no code changes are required.

---

## Architecture & security model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                BROWSER                                       │
│  ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌──────────┐  ┌─────────────────┐  │
│  │ Home    │  │ Search   │  │ Unlock  │  │ Admin    │  │ Razorpay        │  │
│  │ (page)  │  │ (page)   │  │ (page)  │  │ (page)   │  │ Checkout.js     │  │
│  └────┬────┘  └─────┬────┘  └────┬────┘  └────┬─────┘  └────────┬────────┘  │
└───────┼─────────────┼────────────┼─────────────┼────────────────┼──────────┘
        │             │            │             │                │
        ▼             ▼            ▼             ▼                │
┌──────────────────────────────────────────────────────────────┐ │
│                 NEXT.JS API ROUTES (server)                   │ │
│  /api/accounts/search    rate-limited, sanitised             │ │
│  /api/recent             recent accounts                     │ │
│  /api/payment/create-order  create Razorpay order            │ │
│  /api/payment/verify        verify signature + mint token    │ │
│  /api/unlock               verify token + decrypt password   │ │
│  /api/admin/*              CRUD + stats (requireAdmin)       │ │
│  /api/webhooks/razorpay    secondary confirmation (signed)   │ │
└────────┬─────────────────────────────────────────────────────┘ │
         │                                                       │
         ▼                                                       │
┌─────────────────────────────────────────────────┐            │
│            src/lib (server-only)                 │            │
│   crypto.ts       AES-256-GCM enc/dec            │            │
│   repository.ts   Firestore ↔ Prisma adapter     │            │
│   razorpay.ts     HMAC signature verify          │            │
│   firebase-admin.ts  Admin SDK (server-only)     │            │
│   admin-session.ts   httpOnly session cookies    │            │
└────────┬────────────────────────────────────────┘            │
         │                                                       │
         ▼                                                       ▼
┌──────────────────────────┐              ┌──────────────────────────────┐
│  Firestore (production)  │              │  Razorpay API                │
│  accounts                │              │  orders.create, signature    │
│  payments                │              │  payment.captured webhook    │
│  unlockTokens            │              └──────────────────────────────┘
│  adminSessions           │
│  logs                    │
│  admins                  │
└──────────────────────────┘
```

### Why the current password is never exposed

1. **At rest**: stored as `currentPasswordEnc` (AES-256-GCM ciphertext). The encryption key is read from `process.env.ENCRYPTION_SECRET` only inside server-side code.
2. **In transit**: every public-facing API response goes through `toPublicAccount()`, which strips `currentPasswordEnc` before serialization. The frontend literally cannot see the field.
3. **At decryption**: `/api/unlock` performs four checks (token exists, not used, not expired, payment verified) **before** calling `Accounts.revealCurrentPassword()`. The decryption function is only invoked from that one place.
4. **After decryption**: the token is marked `used:true` *before* the response is sent, so a crash mid-response still leaves a consumed token.
5. **On refresh**: the next call to `/api/unlock` with the same token sees `used === true` and returns `410 already_used`, which the page renders as the "token already used" screen.

---

## Quick start (local dev)

```bash
# 1. Clone & install
git clone https://github.com/your-org/gomen.git
cd gomen
bun install        # or: npm install / pnpm install

# 2. Set up env (sandbox defaults work out of the box for local dev)
cp .env.example .env.local
# Leave the Firebase + Razorpay fields blank to use the built-in mock mode.

# 3. Initialise the local SQLite database (sandbox fallback)
bun run db:push
bun run scripts/seed.js   # optional: seeds 6 demo accounts

# 4. Run
bun run dev
# → http://localhost:3000
```

### Sandbox demo credentials

When Firebase env vars are not set, the admin login accepts these (configurable via env):

- **Email**: `admin@gomen.local`
- **Password**: `gomen-admin`

In sandbox mode, the Razorpay checkout is replaced by an 800ms simulated success — the full order → verify → unlock flow runs end-to-end without real money.

---

## Environment variables

See `.env.example` for the full list with comments. Summary:

| Variable | Required | Purpose |
|---|---|---|
| `ENCRYPTION_SECRET` | yes | 32+ char master key for AES-256-GCM |
| `RAZORPAY_KEY_ID` | prod | Razorpay order creation |
| `RAZORPAY_KEY_SECRET` | prod | Razorpay HMAC signature verify |
| `RAZORPAY_WEBHOOK_SECRET` | prod | Webhook signature verify |
| `FIREBASE_PROJECT_ID` | prod | Admin SDK + client SDK |
| `FIREBASE_CLIENT_EMAIL` | prod | Admin SDK service account |
| `FIREBASE_PRIVATE_KEY` | prod | Admin SDK private key (with literal `\n`) |
| `FIREBASE_STORAGE_BUCKET` | prod | Storage bucket name |
| `NEXT_PUBLIC_FIREBASE_*` | prod | Browser-side Firebase config |
| `ADMIN_DEMO_UID` | both | UID allow-list for admin check |
| `ADMIN_DEMO_EMAIL` | sandbox | Demo login email |
| `ADMIN_DEMO_PASSWORD` | sandbox | Demo login password |
| `NEXT_PUBLIC_SITE_URL` | both | Used for SEO metadata base URL |
| `DATABASE_URL` | sandbox | Prisma SQLite path (ignored in prod) |

---

## Database

### Production (Firebase Firestore)

Collections:

- `accounts/{id}` — `{ username, previousPassword, currentPasswordEnc, price, category, notes, status, createdAt, updatedAt }`
- `payments/{id}` — `{ orderId, paymentId, amount, status, username, accountId, createdAt }`
- `unlockTokens/{id}` — `{ token, accountId, paymentId, createdAt, expiresAt, used }`
- `adminSessions/{id}` — `{ token, adminUid, email, createdAt, expiresAt }`
- `logs/{id}` — `{ action, targetId, detail, adminUid, createdAt }`
- `admins/{uid}` — `{ }` (presence = admin)

Deploy rules + indexes:

```bash
cd firebase
firebase deploy --only firestore:rules,firestore:indexes
```

### Sandbox (Prisma + SQLite)

Schema in `prisma/schema.prisma`. Push with:

```bash
bun run db:push
```

---

## Razorpay setup

1. Create an account at <https://razorpay.com>.
2. Dashboard → Settings → API Keys → Generate Key.
3. Put `Key ID` and `Key Secret` into `.env.local` as `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`.
4. Dashboard → Settings → Webhooks → Add webhook:
   - URL: `https://your-domain.com/api/webhooks/razorpay`
   - Events: `payment.captured`, `payment.failed`
   - Copy the **Webhook Secret** into `RAZORPAY_WEBHOOK_SECRET`.
5. (Test mode) Dashboard → Settings → Test cards → use any test card number for end-to-end runs.

The webhook is a *secondary* trust source. The primary verification is the server-side HMAC check inside `/api/payment/verify` — the webhook is there to mint an unlock token if the user closes the browser tab before the verify call returns.

---

## Firebase setup

1. Create a project at <https://console.firebase.google.com>.
2. **Authentication**: enable Email/Password.
3. **Firestore**: create database in production mode.
4. **Storage**: enable (only used if you upload account images — currently unused, but the rules are in place).
5. **Service account** (Admin SDK):
   - Project settings → Service accounts → Generate new private key.
   - Open the JSON, copy `project_id`, `client_email`, `private_key` into env vars.
6. **Web app config**:
   - Project settings → General → Your apps → Add web app.
   - Copy the `firebaseConfig` values into the `NEXT_PUBLIC_FIREBASE_*` env vars.
7. Deploy rules + indexes:
   ```bash
   cd firebase
   firebase deploy --only firestore:rules,firestore:indexes,storage:rules
   ```
8. (Optional) Deploy Cloud Functions:
   ```bash
   cd firebase/functions
   npm install
   firebase deploy --only functions
   firebase functions:secrets:set ENCRYPTION_SECRET
   firebase functions:secrets:set RAZORPAY_KEY_SECRET
   firebase functions:secrets:set RAZORPAY_WEBHOOK_SECRET
   ```

---

## Admin setup

1. In Firebase Auth, create a user (e.g. `admin@yourdomain.com`).
2. Copy the user's UID (Auth → Users → click the row → copy UID).
3. Add a doc to Firestore `admins/{uid}` with `{ role: "admin" }` (any non-empty doc works — presence = admin).
4. Optionally set `ADMIN_DEMO_UID` env var to that UID for an extra allow-list check.
5. In production, set `ADMIN_DEMO_EMAIL` and `ADMIN_DEMO_PASSWORD` to empty strings to disable the sandbox login.

---

## PWA

- Manifest at `public/manifest.webmanifest`.
- Service worker at `public/sw.js` (network-first for navigation, cache-first for static, with `/offline` fallback).
- Offline page at `src/app/offline/page.tsx`.
- Icons at `public/icons/icon-{192,512,512-maskable}.png` + `apple-touch-icon.png`.
- Service worker is registered only in production builds (see `src/components/shared/sw-register.tsx`).
- To regenerate icons: `node scripts/gen-icons.js`.

---

## Deployment (Vercel + Firebase)

### 1. Push to GitHub

```bash
git init
git add -A
git commit -m "Initial commit: Gomen"
git branch -M main
git remote add origin https://github.com/your-org/gomen.git
git push -u origin main
```

### 2. Deploy to Vercel

1. <https://vercel.com/new> → import the GitHub repo.
2. Framework preset: **Next.js** (auto-detected).
3. Add **all** env vars from `.env.example` in the Vercel project settings.
4. Click **Deploy**.
5. Once deployed, copy the production URL (e.g. `https://gomen.vercel.app`).
6. Update `NEXT_PUBLIC_SITE_URL` in Vercel env vars to the production URL, then redeploy.

### 3. Wire up Razorpay webhook

In Razorpay dashboard, set the webhook URL to `https://your-domain.com/api/webhooks/razorpay`.

### 4. Deploy Firebase

```bash
cd firebase
firebase deploy --only firestore:rules,firestore:indexes,storage:rules
# (optional) firebase deploy --only functions
```

---

## Project structure

```
gomen/
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # root layout: theme, header, footer, toaster, SW
│   │   ├── page.tsx                    # home (hero + search + recent + how + FAQ)
│   │   ├── globals.css
│   │   ├── search/
│   │   │   ├── page.tsx                # Suspense wrapper
│   │   │   └── search-page-inner.tsx   # live search + account cards + buy button
│   │   ├── unlock/
│   │   │   ├── page.tsx                # Suspense wrapper
│   │   │   └── unlock-page-inner.tsx   # token verify + reveal + copy
│   │   ├── offline/page.tsx            # PWA offline fallback
│   │   ├── admin/
│   │   │   ├── login/
│   │   │   │   ├── page.tsx            # Suspense wrapper
│   │   │   │   └── admin-login-inner.tsx
│   │   │   └── dashboard/page.tsx      # stats + chart + accounts/payments/logs tabs
│   │   └── api/
│   │       ├── accounts/search/route.ts
│   │       ├── recent/route.ts
│   │       ├── payment/create-order/route.ts
│   │       ├── payment/verify/route.ts
│   │       ├── unlock/route.ts
│   │       ├── webhooks/razorpay/route.ts
│   │       └── admin/
│   │           ├── login/route.ts
│   │           ├── logout/route.ts
│   │           ├── accounts/route.ts
│   │           ├── accounts/[id]/route.ts
│   │           ├── stats/route.ts
│   │           ├── payments/route.ts
│   │           └── logs/route.ts
│   ├── components/
│   │   ├── ui/                         # shadcn/ui (preinstalled)
│   │   ├── shared/                     # header, footer, theme, copy button, SW register
│   │   ├── home/                       # home-search, recent-accounts, how-it-works, faq
│   │   └── admin/                      # accounts-manager, payments-table, logs-table, stats-chart
│   ├── lib/
│   │   ├── crypto.ts                   # AES-256-GCM encrypt/decrypt + token gen
│   │   ├── firebase-admin.ts           # Admin SDK singleton (server-only)
│   │   ├── firebase-client.ts          # Client SDK (browser, public config)
│   │   ├── razorpay.ts                 # Razorpay client + HMAC verify
│   │   ├── repository.ts               # Firestore ↔ Prisma adapter (the data layer)
│   │   ├── admin-session.ts            # session cookie mint/verify/destroy
│   │   ├── rate-limit.ts               # in-memory rate limiter + query sanitiser
│   │   ├── db.ts                       # Prisma client (sandbox fallback)
│   │   └── utils.ts
│   ├── hooks/
│   ├── types/index.ts                  # shared domain types
│   └── middleware.ts                   # /admin/dashboard cookie gate
├── prisma/schema.prisma                # sandbox schema
├── public/
│   ├── manifest.webmanifest
│   ├── sw.js
│   ├── icons/                          # PWA icons
│   └── logo.svg
├── firebase/
│   ├── firebase.json
│   ├── firestore.rules
│   ├── firestore.indexes.json
│   ├── storage.rules
│   └── functions/                      # Cloud Functions (Razorpay webhook + unlock)
├── scripts/
│   ├── gen-icons.js                    # regenerate PWA icons
│   └── seed.js                         # seed demo accounts (sandbox)
├── .env.example
├── .env.local                          # gitignored
├── vercel.json
├── eslint.config.mjs
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
└── README.md
```

---

## API reference

### Public

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/recent` | — | `{ items: AccountPublic[] }` (6 most recent) |
| GET | `/api/accounts/search?q=…&page=1&limit=12` | — | `{ items, total, page, limit }` |
| POST | `/api/payment/create-order` | `{ accountId }` | `{ orderId, amount, keyId, mock, paymentDbId }` |
| POST | `/api/payment/verify` | `{ orderId, paymentId, signature, paymentDbId }` | `{ token, redirectTo }` |
| POST | `/api/unlock` | `{ token }` | `{ password, username, consumed }` or `{ error }` |
| POST | `/api/webhooks/razorpay` | (Razorpay event) | `{ ok: true }` |

### Admin (requires session cookie)

| Method | Path | Notes |
|---|---|---|
| POST | `/api/admin/login` | email/password (sandbox) or Firebase idToken (prod) |
| POST | `/api/admin/logout` | destroys session |
| GET | `/api/admin/accounts?q=…&page=1&limit=20` | paginated list |
| POST | `/api/admin/accounts` | create |
| PUT | `/api/admin/accounts/:id` | update (blank current password = keep) |
| DELETE | `/api/admin/accounts/:id` | delete |
| GET | `/api/admin/stats` | dashboard stats + 7-day series + top accounts |
| GET | `/api/admin/payments` | recent payments |
| GET | `/api/admin/logs` | recent logs |

---

## Scripts

| Command | Description |
|---|---|
| `bun run dev` | Start Next.js dev server on port 3000 |
| `bun run build` | Production build |
| `bun run start` | Start production server |
| `bun run lint` | ESLint (Next.js + React rules) |
| `bun run db:push` | Push Prisma schema to SQLite (sandbox) |
| `bun run scripts/seed.js` | Seed 6 demo accounts (sandbox) |
| `node scripts/gen-icons.js` | Regenerate PWA icons from SVG |

---

## Troubleshooting

**`bun run dev` runs out of memory (OOM)**
The repo ships with `NODE_OPTIONS=--max-old-space-size=3072` baked into the `dev` script. If you still OOM on a constrained machine, lower it to `2048` or raise to `4096` based on available RAM.

**Search returns empty results in sandbox**
Make sure `.env` points to the same SQLite file Prisma is using. Run `bun run scripts/seed.js` to populate demo accounts.

**Admin login says "invalid credentials"**
In sandbox mode, the demo credentials are `admin@gomen.local` / `gomen-admin` (configurable via `ADMIN_DEMO_EMAIL` / `ADMIN_DEMO_PASSWORD`). In production, login requires a Firebase ID token from a user whose UID exists in the `admins` Firestore collection.

**Payment verification fails**
- In sandbox mode (`RAZORPAY_KEY_ID` not set), the checkout is mocked and verification always succeeds with the literal signature `mock_signature`.
- In production, ensure `RAZORPAY_KEY_SECRET` matches the dashboard value exactly.

**Unlock page shows "invalid token"**
Tokens are 64 hex characters. Make sure the URL wasn't truncated. If you refreshed after a successful reveal, the page will show "token already used" — this is by design.

**Cloud Functions deployment fails**
Ensure you've set all required secrets with `firebase functions:secrets:set`. The functions won't deploy cleanly without `ENCRYPTION_SECRET`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET`.

---

## License

MIT — see `LICENSE` file (to be added).
