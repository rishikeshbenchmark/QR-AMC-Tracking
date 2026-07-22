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
