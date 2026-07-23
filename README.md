# QR-AMC Tracking System

Multi-tenant platform for QR-based warranty and AMC tracking. Backoffice staff register purchased
assets, the system mints a permanent UUID per asset which becomes its QR label, and anyone scanning
the sticker sees a public view while logged-in staff see the full purchase-side picture.

Read **[CLAUDE.md](./CLAUDE.md)** before writing code — it is the operating manual (architecture,
naming, validation, security, and the rules that are not negotiable). Where this README and CLAUDE.md
disagree, CLAUDE.md wins.

## Stack

| Layer | Choice |
|---|---|
| Backend | Node 20+ · TypeScript · Express 5 |
| ORM / DB | Prisma 6 (`provider = "sqlserver"`) · SQL Server 2022 Developer Edition |
| Frontend | React 19 · Vite · Mantine 8 · TanStack Query · React Router 7 |
| Validation | zod, at every boundary, front and back |
| Auth | JWT bearer + bcrypt |

## Layout

```
QR-AMC-Tracking-system/
├── db/schema.sql           canonical DDL — schema.prisma is derived FROM this, never the reverse
├── server/
│   ├── prisma/             schema.prisma, migrations/, seed.ts
│   └── src/
│       ├── config/env.ts   the only place process.env is read
│       ├── middlewares/     auth · rbac · validate · error
│       ├── modules/         feature-first: auth, masters, assets, purchases, sales, qr, scan, audit
│       ├── shared/          logger, prisma client, AppError, warranty.ts
│       ├── app.ts           express assembly (no listen)
│       └── server.ts        listen + graceful shutdown
└── client/
    └── src/
        ├── api/            axios client, JWT interceptor
        ├── components/     presentational only: DataTable, MasterSelect, StatusBadge…
        ├── features/       mirrors server modules 1:1
        └── router.tsx
```

Feature modules appear as they are built — the tree above is the destination, not the current state.

## The database

Development runs against **one shared SQL Server database on the company server** — not a database
on your laptop. Everyone connects to the same instance, so there is nothing to install: the schema
is already there, created once by the lead.

This has one hard rule that protects everyone:

> ### Only the lead runs `db:migrate` or `db:seed`. Ever.
>
> `prisma migrate dev` is designed for a database one person owns. Against a shared database it can
> detect "drift" and offer to **reset it — dropping every table and everyone's data**. On your own
> machine that is a yawn; on the shared server it wipes the whole team's work. So interns run
> `npm run dev` and nothing else database-related. If your task needs a schema change, **ask the
> lead** — see `server/prisma/MIGRATIONS.md`.

### Setup for the interns (the common case)

You need the connection details from the lead: the **server host**, the **database name**, and a
**SQL login** (a username and password — not your Windows login; Prisma authenticates with
credentials).

```bash
git clone https://github.com/rishikeshbenchmark/QR-AMC-Tracking.git
cd QR-AMC-Tracking
npm install                          # installs both workspaces from the root

cp server/.env.example server/.env
cp client/.env.example client/.env
```

Edit `server/.env`:

1. Set `DATABASE_URL` to the shared server (the lead gives you the exact line):
   ```
   DATABASE_URL="sqlserver://SERVER_HOST:1433;database=qramc_dev;user=YOUR_LOGIN;password=YOUR_PASSWORD;encrypt=true;trustServerCertificate=true"
   ```
2. Set `JWT_SECRET` to the value the lead shares, so everyone issues compatible tokens:
   the same secret must be used by every developer or your login will not work against a
   teammate's running API.

```bash
npm run dev                          # API on :4000, client on :5173 — DO NOT run db:migrate
```

Verify: `curl http://localhost:4000/api/v1/health` returns `{"data":{"status":"ok",…}}`, then log
in from the browser with the shared admin credentials.

### Setup for the lead (once, when the shared database is empty)

Install **SSMS**, connect to the server, and create an empty database `qramc_dev`. Then, from a
clone with `server/.env` pointing at it:

```bash
npm run db:migrate                   # applies the schema to the shared database
npm run db:seed                      # one company, roles, permissions, the admin user, sample masters
```

Re-running the seed is safe — it is written to be idempotent. Re-running `db:migrate` after the
first time only applies *new* migrations; it does not touch existing data unless it reports drift,
at which point **stop and investigate**, never accept a reset.

### If the connection fails

| Symptom | Cause |
|---|---|
| `Can't reach database server` | Wrong host, the server is firewalled from your network, or you're off the company VPN/LAN |
| `Login failed for user …` | Wrong SQL login, or the server has SQL authentication disabled (needs Mixed Mode) |
| `self-signed certificate` | `trustServerCertificate=true` missing from `DATABASE_URL` |
| `Cannot open database "qramc_dev"` | The database hasn't been created yet — that's the lead's one-time step above |

### Working offline

If you need to work without the company network, you can run SQL Server locally instead —
`scripts/install-sqlserver.ps1` sets it up (run it from an elevated PowerShell). This is a
fallback, not the normal path; a local database is your own copy and will not have the team's data.

## Scripts

Run from the repository root.

| Command | Does |
|---|---|
| `npm run dev` | API and client together |
| `npm run dev:server` / `npm run dev:client` | one at a time |
| `npm run build` | production build of both |
| `npm run test` | test suites |
| `npm run db:migrate` / `db:seed` / `db:studio` | Prisma |

## Conventions that bite newcomers

- **Path aliases.** Import `@/modules/masters/…`, never `../../../`. Configured in both workspaces.
- **`import type`.** The client has `verbatimModuleSyntax` on, so type-only imports must say
  `import type { Foo } from '…'` or the build fails.
- **`.env` is never committed.** Only `.env.example` is, and only with dummy values. If you ever
  commit a real secret, rotate it — deleting the line is not enough.
- **Prisma migrations are hand-edited.** Prisma on SQL Server cannot express CHECK constraints or
  filtered unique indexes, so the generated SQL is edited by hand afterwards and must not be
  regenerated over. Only the project lead creates migrations.
- **Every read filters `company_id` and `is_deleted`.** A missing filter is a data-leak bug.

## Branching

Trunk-based. `main` is protected and always deployable; everything else is a short-lived branch
that exists for one task and is deleted the moment it merges. **No `develop` branch, no gitflow** —
with a small team and a hard deadline, long-lived branches only buy merge conflicts.

**Branches are named for the work, never for the person.** A branch called `darsh` accumulates
unrelated changes for a fortnight and becomes unmergeable; `feat/masters-makes-models` merges on
Thursday and disappears.

```
feat/<area>-<thing>     feat/masters-suppliers, feat/assets-step1-api
fix/<what-was-broken>   fix/serial-case-dup
chore/<task>            chore/ci-mssql
docs/<what>             docs/adr-status-model
```

### Current assignments

| Branch | Owner | Scope |
|---|---|---|
| `feat/masters-categories` | Rishikesh | **The template.** Full stack, one master, end to end — every other master copies its shape. |
| `feat/masters-makes-models` | Darsh (`darskgk-04`) | Makes + Models. Both have a parent dropdown, and the model list filters by the chosen make. |
| `feat/masters-suppliers` | Soham (`co2024sohamsagare-cmyk`) | Suppliers + AMC Suppliers. Name, plus optional email on suppliers. |
| `feat/masters-customers` | Ritesh (`Ritesh0605`) | Customers, plus the tabbed shell that hosts all six master screens. |

### The loop

```bash
git checkout main && git pull                 # always start from current main
git checkout feat/masters-suppliers           # your branch
# …work, committing as you go…
git push -u origin feat/masters-suppliers
# open a PR on GitHub, fill in the template, request review
```

Then: squash-merge, delete the branch. One idea per commit, Conventional Commits for the message
(`feat(masters): supplier CRUD with soft delete`).

### Rules that are not negotiable

1. **Never push to `main`.** It is protected; the push will be rejected. Open a PR.
2. **Never create or edit a Prisma migration.** Only the lead does — see
   `server/prisma/MIGRATIONS.md` for why. If your work needs a schema change, ask.
3. **Never edit a file outside your scope** to make your branch work. If you need something changed
   in `shared/`, `components/`, `config/` or `middlewares/`, ask — those are shared surfaces and two
   people editing them in parallel is how a morning disappears.
4. **Rebase, don't merge.** `git pull --rebase origin main` keeps history linear and reviewable.
5. **Push at least once a day**, even if unfinished. Work that only exists on your laptop is work
   nobody can help you with.
