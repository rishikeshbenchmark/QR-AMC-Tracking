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
| ORM / DB | Prisma 6 (`provider = "sqlserver"`) · SQL Server 2022 (Docker in dev) |
| Frontend | React 19 · Vite · Mantine 8 · TanStack Query · React Router 7 |
| Validation | zod, at every boundary, front and back |
| Auth | JWT bearer + bcrypt |

## Layout

```
QR-AMC-Tracking-system/
├── docker-compose.yml      SQL Server 2022 for local development
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

## First-time setup

Prerequisites: **Node 20.11+**, **Docker Desktop**, **Git**.

```bash
git clone <repo-url>
cd QR-AMC-Tracking-system
npm install                    # installs both workspaces from the root

cp .env.example .env           # SQL Server SA password for docker-compose
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Then edit the env files:

1. Pick an `MSSQL_SA_PASSWORD` in the root `.env`. SQL Server rejects weak ones silently — 8+ chars
   with upper, lower, digit and symbol.
2. Put **that same password** into `DATABASE_URL` in `server/.env`.
3. Generate a real `JWT_SECRET`:
   `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

```bash
npm run db:up                  # start SQL Server (first pull is ~1.5 GB)
npm run db:migrate             # apply migrations
npm run db:seed                # one company, roles, permissions, an admin user
npm run dev                    # API on :4000, client on :5173
```

Verify: `curl http://localhost:4000/api/v1/health` returns `{"data":{"status":"ok",…}}`.

## Scripts

Run from the repository root.

| Command | Does |
|---|---|
| `npm run dev` | API and client together |
| `npm run dev:server` / `npm run dev:client` | one at a time |
| `npm run build` | production build of both |
| `npm run test` | test suites |
| `npm run db:up` / `db:down` / `db:logs` | the SQL Server container |
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

`main` is always deployable. One branch per task, squash-merged via PR:
`feat/masters-suppliers`, `fix/serial-case-dup`, `docs/adr-status-model`. Conventional Commits for
messages. The PR checklist lives in CLAUDE.md — answer it honestly before merging.
