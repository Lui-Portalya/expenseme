# Expense Me

Personal expense tracking built with Next.js (App Router), React, TypeScript and SQLite.

## Features
- Email/password accounts with server-side sessions (httpOnly cookie, bcrypt hashes)
- Expenses: add, edit, delete, search, filter by date/category, sort, paginate, CSV export
- Categories: per-user, colored, seeded with defaults on signup
- Budgets: overall or per-category monthly limits with progress tracking
- Dashboard: monthly total vs. last month, spending by category, daily and 6-month trends
- Settings: profile, currency, change password

## Getting started
```bash
npm install
npm run dev        # http://localhost:3000 — register an account to begin
```

The SQLite database is created automatically at `data/expenseme.db` (override with `EXPENSEME_DB`).

## Scripts
| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server (set `COOKIE_INSECURE=1` to log in over plain http locally) |
| `npm test` | Vitest unit tests: data layer and server actions (in-memory SQLite) |
| `npm run test:e2e` | Playwright browser tests (first time: `npx playwright install chromium`). Starts its own dev server on :3200 with a throwaway DB in `data/e2e.db` |
| `npm run typecheck` / `npm run lint` | Static checks |

## Layout
- `src/lib/db.ts` – connection and schema (idempotent, runs on first use)
- `src/lib/repos/*` – plain-SQL data access, every query scoped by `user_id`
- `src/lib/actions/*` – server actions with zod validation
- `src/lib/auth.ts`, `sessions.ts` – password hashing and sessions
- `src/middleware.ts` – cookie gate; real validation is in `requireUser()`
- `src/app/(auth)` – login/register; `src/app/(app)` – authenticated pages

## Not included yet
Login rate limiting, recurring expenses, receipt uploads, multi-currency per expense.

## License
MIT — see [LICENSE](LICENSE).
