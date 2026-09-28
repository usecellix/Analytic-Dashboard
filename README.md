# Cellix Admin Dashboard

Next.js admin app — password-gated, reads through `cellix_backend`'s
`/admin/*` routes (`AdminGuard`), not a direct MongoDB connection. See
`TASKS.md` (admin-api-migration) for why: writes from this app (planned)
should go through the backend's own credit/audit logic, not a second
codebase writing Mongo directly.

## Setup

```bash
cd Dashboard
npm install
cp .env.local.example .env.local   # then fill in the values below
npm run dev                        # http://localhost:3100
```

`.env.local`:

```
ADMIN_PASSWORD=                # required — locks the whole app until set
CELLIX_API_URL=http://localhost:4001   # cellix_backend's base URL
CELLIX_ADMIN_API_TOKEN=        # must equal cellix_backend's own CELLIX_ADMIN_API_TOKEN
```

`cellix_backend` needs `CELLIX_ADMIN_API_TOKEN` set to the same value, or
every request here 401s (AdminGuard fails closed when it's unset — the
admin API is off, not open).

## Pages

- `/` — overview stats (requests, planner, frontend)
- `/requests?page=1&id=…` — HTTP conversation traffic
- `/planner?page=1&id=…` — planner agent I/O
- `/frontend?page=1&id=…&level=error&category=accept` — Excel add-in events

### Frontend logs

Emitted by the Excel add-in via `POST /telemetry/frontend`:

| Category | Examples |
|----------|----------|
| `console` | `console.error`, `window.error`, `unhandledrejection` |
| `preview` | `preview.start`, `preview.ready`, `preview.fail` |
| `accept` | `accept.click`, `accept.success`, `accept.fail` |
| `reject` | `reject.click` |

Detail sheet shows message, action summary (types / first action), error stack, conversation/changeSet IDs, and client context.

Mongo collections `request_logs`, `planner_logs`, and `frontend_logs` use a **3-day TTL** on `ts`. File mirrors: `cellix_backend/logs/{requests,planner,frontend}.log` (24h prune).
