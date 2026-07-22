# CLAUDE.md — QR-AMC Tracking System

Operating manual for Claude Code on this repository. Read this before every task. Where this file
and your instincts disagree, this file wins; where this file and an ADR in `docs/adr/` disagree, the
ADR wins.

---

## Project Overview

### What this is

A multi-tenant web platform for QR-based warranty and AMC tracking. Backoffice staff register
purchased assets in two steps (the item physically arrives before the paperwork does), the system
mints a permanent UUID per asset which becomes its QR label, the asset moves through QC → warehouse
→ dispatch → installation, a sale binds it to a customer and sets the customer warranty, and paid
AMC contracts extend support after the warranty lapses. Anyone scanning the sticker sees a public
client view; logged-in staff see the full purchase-side picture including permission-gated cost
price. Everything is audit-logged and soft-deleted.

### Business objective

Replace spreadsheet tracking of asset warranties. The commercial point is the **warranty gap** — the
window where the company's warranty to the customer outlasts the supplier's warranty to the company.
That gap is unfunded exposure, and today nobody can see it.

### Tech stack

| Layer | Choice |
|---|---|
| Backend | Node.js + **TypeScript**, Express |
| ORM | **Prisma** (`provider = "sqlserver"`) |
| Database | **SQL Server 2022** (Docker in dev, company server in prod) |
| Auth | JWT (header bearer) + bcrypt |
| Validation | **zod** — same schemas shape front and back |
| Frontend | React + **Vite** + TypeScript, PWA |
| Server state | **TanStack Query** (not Redux) |
| Forms | react-hook-form + zod |
| UI kit | Mantine |
| QR | `qrcode` (PNG + PDF label sheets), `html5-qrcode` (camera) |
| Logging | pino |
| Deferred to v2 | node-cron scheduler, nodemailer/SMTP |

### High-level architecture

```
Admin · Backoffice · Staff · Client(anonymous scanner)
                 │ HTTPS
        React SPA / PWA (Vite + TS)
                 │ JSON REST, JWT in header
        Express API (Node + TS)
          middleware:  auth → rbac → validate
          routes → controllers        (HTTP ↔ domain only)
          services                    (all business rules; no HTTP types)
          repositories                (Prisma / raw SQL; no rules)
                 │ TDS (encrypted)
        SQL Server 2022
```

The layering is not ceremony. The warranty logic must be callable from both the API and (in v2) the
nightly scheduler; a rule that lives inside a route handler cannot be reused or tested. **Controllers
translate HTTP. Services hold rules and know nothing about `req`/`res`. Repositories access data and
know no rules.**

### Folder structure

Feature-first, not layer-first — everything about assets lives in one folder.

```
server/
├── prisma/{schema.prisma,migrations/}
├── src/
│   ├── config/env.ts              # zod-validated env loading, constants
│   ├── middlewares/               # auth · rbac · validate · error · rateLimit
│   ├── modules/                   # ← feature-first
│   │   ├── auth/                  # *.routes.ts *.controller.ts *.service.ts *.schemas.ts
│   │   ├── users/ masters/ assets/ purchases/ sales/ amc/
│   │   ├── qr/ scan/ audit/
│   │   └── reports/ dashboard/    # v2 — do not build during MVP
│   ├── jobs/                      # v2 — scheduler, expiryAlerts
│   ├── shared/
│   │   ├── errors/AppError.ts
│   │   ├── logger.ts  prisma.ts   # ONE PrismaClient instance, exported
│   │   └── warranty.ts            # pure functions: gap, coverage, days remaining
│   ├── app.ts                     # express assembly, no listen()
│   └── server.ts                  # listen + graceful shutdown
└── tests/

client/
├── src/
│   ├── api/client.ts              # axios: baseURL, JWT interceptor, 401 handler
│   ├── auth/{AuthContext.tsx,ProtectedRoute.tsx}
│   ├── components/                # DataTable, DateField, ConfirmDialog, StatusBadge, MasterSelect
│   ├── features/                  # mirrors backend modules 1:1
│   ├── hooks/ lib/ router.tsx
└── vite.config.ts                 # + vite-plugin-pwa
```

Docs live in `docs/` (in git) and in the **parent** directory `C:\rishi\QR-AMC\` (not in git):
`CONTEXT.md` (glossary), `Document/amc-project-blueprint.md` (Decision Log), `mvp-9day-plan.md`,
`hod-questions.md`, `ER-diagrams/`.

### Important modules

- **`shared/warranty.ts`** — pure functions for supplier vs customer coverage, the gap, days
  remaining. The commercial heart of the product. Always unit-tested.
- **`modules/assets/lifecycle.ts`** — the status `TRANSITIONS` map and `canTransition()`. The only
  place that decides a status change is legal.
- **`modules/scan/`** — the public client view. Its DTO is the single highest-risk surface in the
  system (see Security).
- **`modules/masters/`** — seven near-identical CRUD resources; build one shape, reuse it.

### User roles

| Role | Capability |
|---|---|
| **Admin** | Everything, incl. user management, roles/permissions, audit log, cost price |
| **Backoffice** | Register/purchase/sell assets, manage masters, set status, **can see cost price** |
| **Staff** | Scan and view assets; **cost price masked** |
| **Client** | Anonymous QR scanner. Not a user account. No login, no sensitive fields |

Permissions are codes (`asset.create`, `asset.cost_price.read`, `master.manage`, `user.manage`,
`report.view`) granted to roles via `role_permissions`. Check permissions, never role names.

### Major workflows

1. **Purchase Step 1** — register the physical asset: category/make/model/serial + supplier. Creates
   `assets` + `purchases` rows **in one transaction**. Mints the UUID → QR → printable label.
2. **Purchase Step 2** — paperwork arrives later: PO, invoice, purchase date, supplier warranty
   window, cost price, AMC support mode.
3. **Status progression** — hand-set by Admin/Backoffice through the legal transition map.
4. **Sale** — bind asset to customer, set customer warranty window and optional service support.
5. **Scan** — public client view (no login) or authed staff view (adds supplier/cost/PO/gap).
6. **Resale** — mints a **new asset + new QR**; the old one becomes `DISCARDED`. Customer A's data is
   never visible under customer B's QR.

---

## AI Operating Rules

**Never guess business logic.** This project has a documented list of questions the HOD has not yet
answered (see *Open Questions* below). If a task depends on one of them, say so and ask — do not
invent a rule and bury it in code.

- Ask when requirements are ambiguous. A wrong assumption shipped to a 9-day deadline costs more
  than a question.
- **Search before you write.** Seven master resources share one CRUD shape; assets/purchases/sales
  share validation and audit patterns. Find the existing one and reuse it.
- **Modify existing files rather than creating parallel ones.** No `assets.service.v2.ts`, no
  `utils2.ts`.
- **Never break an existing API contract** without saying so explicitly and explaining the migration.
- Follow SOLID, but proportionately — this is a monolith with one developer, not a framework.
- Keep functions small and single-purpose. If you need a comment to explain a block, extract it.
- **Avoid unnecessary abstractions.** No generic `BaseRepository<T>` until the third concrete case
  proves it. No dependency-injection container. No event bus.
- Readable beats clever. The developer maintaining this is learning the stack.
- **Never leave `TODO` comments** and never ship placeholder implementations. If it isn't finished,
  say it isn't finished in your reply.
- **Never hardcode secrets, connection strings, or API URLs.** Everything through `config/env.ts`.
- Report outcomes honestly. If tests fail, show the output. If a step was skipped, say which.

### Scope discipline (this matters more than usual right now)

The project is in a **9-day MVP crunch** (`mvp-9day-plan.md`, base version 30 Jul 2026, live 1 Aug).

**IN scope:** auth + roles + cost masking · masters with on-the-fly create · asset Step 1 + QR +
label · purchase Step 2 · sales · public and staff scan views · audit log + soft delete.

**OUT — do not build unless explicitly asked:** the 9 reports & CSV/PDF export · nightly expiry
alerts (node-cron/SMTP) · AMC renewals UI · multi-company onboarding UI · offline PWA sync · resale
UI. If a request drifts into these, flag it and confirm before building.

---

## Coding Standards

**Naming.** `camelCase` variables/functions, `PascalCase` types/classes/React components,
`UPPER_SNAKE_CASE` constants and status codes, `snake_case` database columns. Booleans read as
assertions: `isDeleted`, `hasPermission`, `canTransition`. Never abbreviate domain words — `asset`
not `ast`, `warranty` not `wty`.

**File naming.** Backend: `<feature>.<layer>.ts` — `assets.controller.ts`, `assets.service.ts`,
`assets.schemas.ts`, `assets.repository.ts`. Frontend: `PascalCase.tsx` for components,
`camelCase.ts` for hooks/helpers, `<feature>.api.ts` for API modules.

**Variables.** `const` by default, `let` only when reassigned, never `var`. No magic numbers or
magic strings — `ALERT_LEAD_DAYS`, `AssetStatus.QC_PASSED`. Name intermediate values rather than
nesting three calls.

**Functions.** One job each. Prefer ≤ 40 lines. More than 3 positional parameters → take an options
object. Pure functions wherever the logic allows (all of `warranty.ts` is pure, which is why it is
testable).

**Classes.** Sparingly — services are modules of exported functions unless state genuinely needs
encapsulating. `AppError` is a class because it extends `Error`.

**Interfaces & types.** `interface` for object shapes that may be extended; `type` for unions,
intersections, and derived types. **Never `any`** — use `unknown` and narrow. Derive types from zod
schemas (`z.infer<typeof createAssetSchema>`) so validation and typing cannot drift apart.

**Enums.** No TypeScript `enum`. Use `as const` objects + derived unions:
```ts
export const ASSET_STATUS = { CREATED: 'CREATED', QC_PASSED: 'QC_PASSED', /* … */ } as const;
export type AssetStatus = typeof ASSET_STATUS[keyof typeof ASSET_STATUS];
```
This is not stylistic: **Prisma on SQL Server has no native enum support**, so these values exist as
`VARCHAR` + `CHECK` in the DDL. The `as const` union is the single TS mirror of that CHECK.

**Constants.** Domain constants in `shared/constants.ts` or beside the module that owns them. Status
vocabularies live with their transition map.

**Environment variables.** Declared and parsed **once** in `config/env.ts` through a zod schema that
throws at boot on anything missing or malformed. `process.env` appears nowhere else in the codebase.
Every variable is documented in `.env.example` with a safe dummy value. Frontend env vars are
`VITE_`-prefixed; **the API base URL is always an env var**, never a literal.

**Imports.** Node builtins → external packages → internal aliases → relative, separated by blank
lines. Use path aliases (`@/modules/...`) rather than `../../../`. No circular imports. No default
exports except React components and Express routers.

**Formatting.** Prettier + ESLint decide; do not hand-format or argue with the formatter. 100-column
lines, single quotes, semicolons, trailing commas.

**Comments.** Comment *why*, never *what*. A comment restating the code is noise. Comment every
deviation from the obvious, every business rule with a source (`// HOD Q6.3: earlier of sale/install`),
and every workaround with the constraint that forced it. Keep JSDoc for exported pure functions.

**Error handling.** One `AppError` class carrying `statusCode`, `code`, `message`, optional `details`.
Services throw `AppError`; controllers never build error responses by hand; one `error.middleware.ts`
maps everything to the response envelope. Never swallow an error silently. Never `catch (e) {}`.
Unexpected errors log with stack and return a generic 500 message — internal details never reach the
client.

**Logging.** pino, structured, with a request id. `info` for lifecycle events and mutations, `warn`
for recoverable anomalies, `error` for failures with stack. **Never log** passwords, hashes, JWTs,
full request bodies containing credentials, or `cost_price`. Never remove existing logging.

**Validation.** zod at every boundary, in `<feature>.schemas.ts`, applied by `validate.middleware.ts`
before the controller runs. Validate types *and* business rules (date ordering, positive money,
required-when-flag-set). Trim and uppercase serial numbers at the boundary, not in the repository.
Never trust a client-supplied `company_id` — it comes from the JWT.

**Async code.** `async/await` only, never raw `.then()` chains. Every promise awaited or explicitly
handled. `Promise.all` for genuinely independent I/O; sequential when order matters. No floating
promises.

**Transactions.** Any operation writing more than one row uses `prisma.$transaction`. Non-negotiable
cases: Step-1 asset+purchase creation, sale + status change, status change + `asset_status_history`
insert, anything paired with an audit row. Keep transactions short — no HTTP calls, no PDF
generation inside one.

**Database queries.** Through Prisma; raw SQL only where Prisma cannot express it, always
parameterized via `$queryRaw` tagged templates (**never** string concatenation). Every read filters
`is_deleted = false` **and** `company_id`. Select explicit fields — never `select *` into a DTO.
Avoid N+1: use `include`/`select` or one grouped query.

**Performance.** See *Performance Guidelines*.

**Security.** See *Security Checklist*.

**Accessibility.** Semantic HTML; every input has a `<label>`; keyboard operable; visible focus;
`aria-live` for async status; colour never the sole signal (status badges carry text); contrast ≥
4.5:1. Backoffice staff use phones — touch targets ≥ 44px.

---

## Architecture Guidelines

**Separation of concerns.** The rule that keeps this codebase alive:

| Layer | May do | Must never do |
|---|---|---|
| Route | Wire path → middleware → controller | Contain logic |
| Controller | Parse validated input, call one service, shape the response | Business rules, direct DB access |
| Service | Business rules, transactions, orchestration, audit | Touch `req`/`res`, know HTTP status codes |
| Repository | Prisma/SQL access, tenant + soft-delete filters | Business decisions |

**Repository pattern.** Used, but pragmatically: a repository per module, exporting functions —
not a generic base class. Its job is to be the one place a table is queried, so tenant and
soft-delete filters cannot be forgotten.

**Service layer.** Where every rule in this document lives: status transitions, the QC gate, warranty
computation, cost-price masking, uniqueness checks, audit writes. Services are framework-free and
directly unit-testable.

**Controller layer.** Thin by construction. If a controller exceeds ~20 lines, logic has leaked in.

**Middleware.** Fixed order: `rateLimit → auth → rbac → validate → controller`, with
`error.middleware` last. Public scan routes skip `auth`/`rbac` but keep `rateLimit` and `validate`.

**DTOs.** Every response is an explicit DTO built by a mapper function. **Never** return a Prisma
entity directly and never derive a public DTO by deleting fields from a full object — build it up
from nothing. This is how `password_hash` and `cost_price` stay out of responses.

**Validation.** zod schemas are the contract; TS types derive from them. Where practical the client
imports/mirrors the same shape so the two cannot drift.

**Utilities.** `shared/` is for genuinely cross-module code (logger, prisma client, errors, warranty,
date helpers). Module-specific helpers stay in the module. `shared/` is not a junk drawer.

**Shared components.** Frontend `components/` holds only presentational, reusable pieces with no
feature knowledge. `MasterSelect` (with on-the-fly create) and `StatusBadge` are used everywhere —
change them once, not per feature.

**Configuration.** All config through `config/env.ts`. No config reads at import time inside feature
modules.

**Dependency injection.** Not used. Module imports are the composition mechanism. For testing, inject
collaborators as function parameters where a seam is genuinely needed rather than adding a container.

---

## Database Standards

Canonical DDL: **`db/schema.sql`**. Rationale: `docs/database-schema.md`. Decisions: `docs/adr/`.

**Naming.** Tables `snake_case` plural (`assets`, `amc_contracts`). Columns `snake_case`. FKs
`<singular>_id`. Booleans `is_`/`has_` (`BIT`). Indexes `idx_<table>_<cols>`, unique `ux_…`, checks
`ck_<table>_<rule>`. Views `vw_…`.

**Primary keys.** `UNIQUEIDENTIFIER` everywhere. Internal tables default `NEWSEQUENTIALID()`.
**`assets.id` has no default — the service layer supplies a UUID v4**, because the id is the QR
payload and must exist before insert so the audit row can reference it.

**Foreign keys.** Always declared. No cascading deletes — soft delete is the deletion mechanism.
`audit_logs` deliberately has **no FK to users**: the audit trail must survive user deletion.

**Indexes.** Every index is `company_id`-leading. Uniqueness is filtered so soft-deleted rows don't
block reuse: `CREATE UNIQUE INDEX … WHERE is_deleted = 0`. The serial index additionally excludes
`DISCARDED` so a resold serial can re-register under a new asset.

**Migration rules.** Prisma owns migrations, but **`schema.prisma` is derived from `db/schema.sql`,
not the reverse.** Prisma on SQL Server cannot express CHECK constraints or filtered unique indexes —
after `prisma migrate dev`, **hand-edit the generated SQL** to add them, and never regenerate over
that edit. Migrations are additive and forward-only in prod (`prisma migrate deploy`); rollback is
"previous tag + judgment", which is exactly why destructive migrations are avoided.

**Soft deletes.** `is_deleted BIT DEFAULT 0`, `deleted_at`, `deleted_by` on every business table.
`DELETE` endpoints set the flag. **Every read path filters it.** A missing filter is a data-leak bug,
not a cosmetic one.

**Transactions.** See Coding Standards. Multi-row writes are transactional, always.

**Audit columns.** `created_by`, `created_at`, `updated_by`, `updated_at` on every business table,
plus a row in `audit_logs` (`entity_type`, `entity_id`, `action`, `field_name`, `old_value`,
`new_value`, `changed_by`) for create/update/delete/status-change. Insert-only; never updated,
never deleted.

**Relationship naming.** Prisma relations named for the domain (`asset.purchase`, `asset.sale`,
`asset.amcContracts`), singular for 1:1, plural for 1:N.

**Normalization.** Normalized to 3NF. **Never store what can be derived** — no `qr_url` column (built
from `id`), no stored warranty status, no stored gap, no `installation_date` on `assets` (it lives on
the sale). The one deliberate exception is `assets.status`, and ADR-0003 explains why.

**Performance.** Report-driving indexes are already specified in `db/schema.sql`. The scan path hits
`assets` by primary key and needs nothing further. `vw_asset_coverage` is the single join surface for
coverage reads.

### The status model — read this before touching `assets`

**`assets.status` is ONE column, hand-set from a dropdown.** It holds the full spec vocabulary plus
one addition:

```
CREATED · PURCHASED · QC_PENDING · QC_PASSED · QC_FAILED · ALLOCATED · DISPATCHED ·
INSTALLED · WARRANTY_ACTIVE · WARRANTY_EXPIRED · AMC_ACTIVE · AMC_EXPIRED · DISCARDED
```

This is **ADR-0003**, on the HOD's explicit instruction ("ONE STATUS AT ANY GIVEN TIME", "Manual drop
down"). It supersedes ADR-0002, which split status into three concerns. **Do not re-propose the split
model** and do not add `lifecycle_status`, `qc_status`, or any derived status column back.

Rules that follow from it:

- The system **never writes** `status`. Only an Admin/Backoffice action does.
- Legal transitions live in `modules/assets/lifecycle.ts`, not in a DB CHECK (a CHECK cannot see the
  previous value).
- `QC_FAILED` is terminal — its only exit is `DISCARDED` (HOD: QC-failed assets are scrapped).
- **`DISPATCHED` requires a prior `QC_PASSED` row in `asset_status_history`.** The single column
  cannot remember that QC happened; the history table is what enforces the gate.
- Every transition writes `asset_status_history` in the **same transaction** as the status update.
- `WARRANTY_ACTIVE`/`WARRANTY_EXPIRED`/`AMC_ACTIVE`/`AMC_EXPIRED` are date-derived facts stored as
  hand-set values. **They will drift.** Accepted and contained: the *dates* in `purchases`, `sales`
  and `amc_contracts` remain authoritative for every computation, and the staff view shows an
  advisory drift warning. Never auto-correct the status — a person owns that field.

**Coverage is computed, never stored.** Warranty gap, days remaining, and coverage state come from
`shared/warranty.ts` (app) and `vw_asset_coverage` (reads). A shared fixture asserts the two agree.

**Multi-tenancy.** `company_id` on every business row, always derived from the JWT. Launch seeds
**one** company; the SQL Server RLS policies in `db/schema.sql` are **deliberately commented out**
for now (HOD: manual onboarding, our company first). **Enable RLS before the second company is
onboarded** — that is a hard prerequisite, not a nice-to-have.

---

## API Standards

**REST conventions.** All routes under `/api/v1`. Plural nouns, no verbs in paths. Sub-resources
nest one level (`/assets/:id/sales`). Actions that aren't CRUD use `PATCH` on a sub-path
(`PATCH /assets/:id/status`). Public endpoints are namespaced `/public/…`.

**HTTP status codes.** `200` read/update · `201` create · `204` delete · `400` validation ·
`401` missing/invalid token · `403` authenticated but not permitted · `404` not found (or not in your
tenant) · `409` conflict (duplicate serial, asset already sold, illegal status transition) ·
`422` semantically invalid business state · `429` rate limited · `500` unexpected.

**Success format.**
```json
{ "data": { … } }
{ "data": [ … ], "meta": { "page": 1, "limit": 25, "total": 143 } }
```

**Error format.**
```json
{ "error": { "code": "ASSET_ALREADY_SOLD", "message": "This asset already has a sale.",
             "details": [ { "field": "serialNumber", "issue": "required" } ] } }
```
`code` is a stable machine string; `message` is human-readable and safe to display; `details` carries
zod field errors. Never leak stack traces, SQL, or internal paths.

**Pagination.** `?page=&limit=` (default 25, max 100), returned in `meta`. Every list endpoint
paginates — no unbounded collections.

**Filtering.** Explicit whitelisted query params per endpoint (`status`, `category`, `supplier`,
`customer`, `search`), zod-validated. Never build SQL from arbitrary client input.

**Sorting.** `?sort=field&order=asc|desc`, with `field` validated against an allowlist.

**Validation.** zod at the boundary before the controller. 400 with field-level `details`.

**Authentication.** JWT bearer in the `Authorization` header. Token carries `userId`, `companyId`,
`roleId`. Verified in `auth.middleware`, which populates `req.user`. Passwords bcrypt-hashed (cost
≥ 10). The only unauthenticated routes are `POST /auth/login` and `GET /public/scan/:assetId`.

**Authorization.** `requirePermission('asset.create')` on every non-public route. Check permission
codes, never role names. Field-level rules (cost-price masking) are enforced in the **service/DTO
layer**, not the controller — an unpermitted user gets a response without the field, not a null.

**Versioning.** `/api/v1` from day one. Breaking changes mean `/v2`, never a silent change to `v1`.

---

## Frontend Standards

**Component architecture.** Presentational components in `components/` know nothing about features.
Feature components in `features/<module>/` compose them. Pages orchestrate; they don't fetch inline.
One component, one responsibility.

**State management.** **All server state through TanStack Query** — never mirror server data into
`useState`. React Context only for auth. No Redux. Local UI state stays local.

**Folder organization.** `features/` mirrors backend `modules/` 1:1 so a change traces straight
across the stack.

**Hooks.** Custom hooks in `hooks/` or beside their feature, prefixed `use`. Extract a hook when
logic is reused or when a component's logic outgrows its markup. Obey the rules of hooks — no
conditional calls.

**Reusable components.** `MasterSelect` (searchable + create-on-the-fly), `DataTable`, `DateField`,
`StatusBadge`, `ConfirmDialog`. Extend these rather than building a second one.

**Forms.** react-hook-form + zod resolver, sharing schema shape with the backend. Validate on blur,
submit disabled while pending, server field errors mapped back onto inputs. Never submit twice.

**Validation.** Client validation is a courtesy, not a control. The server validates independently,
always.

**Accessibility.** As in Coding Standards. Status is never conveyed by colour alone.

**Responsive design.** Mobile-first — backoffice staff work on phones and the scan view is
phone-only in practice. Every screen usable at 360px.

**Loading states.** Every query renders four states: loading, error, empty, success. Skeletons over
spinners for lists. No layout shift on load.

**Error handling.** An error boundary at the route level; inline errors for form/field failures;
toast for transient failures. Never show a raw error object. A 401 triggers the axios interceptor →
clear auth → redirect to login.

**Performance.** Route-level code splitting via `React.lazy`. `useMemo`/`useCallback` only where a
measured problem exists. Virtualize lists beyond ~200 rows. Debounce search inputs (300ms). Let
TanStack Query cache — don't refetch on every mount.

---

## Git Workflow

**Branch naming.** `feat/assets-step1-api`, `fix/serial-case-dup`, `chore/ci-mssql`,
`docs/adr-status-model`. One branch per task. `main` is always deployable.

**Commit messages.** Conventional Commits: `feat(assets): purchase step-1 with transactional create`,
`fix(warranty): inclusive end-date boundary`, `test(sales): one-sale-per-asset uniqueness`. Imperative
mood, one idea per commit, body explains *why* when non-obvious.

**PR checklist.** Answer honestly before merging:
1. Any business logic in a controller? 2. Every input zod-validated at the boundary? 3. Auth +
permission middleware on every non-public route? 4. Any DTO that could leak `password_hash` or
`cost_price`? 5. Multi-write operations in a transaction? 6. Audit row written for every mutation?
7. Soft-delete + `company_id` filter on every read? 8. Raw SQL parameterized? 9. Status codes mapped
correctly? 10. Tests for new pure logic? 11. Names a stranger would understand? 12. Docs/ADR updated
if the design moved?

**Merge strategy.** Squash-merge into `main`, delete the branch. No develop branch, no gitflow. Tag
releases `v0.x.y` at milestones, `v1.0.0` at go-live.

**Code review expectations.** Solo project — the PR is where you review yourself against the list
above. Claude: when asked to review, apply that checklist and report findings ranked by severity;
do not approve work you have not actually read.

**Commit policy for Claude:** commit or push only when explicitly asked. Never `--no-verify`.

---

## Testing Strategy

Two suites are never skipped, because they protect against *reputational* bugs: **the scan DTO test**
and **the warranty tests**.

**Unit tests.** Every pure function tested at birth: `shared/warranty.ts` (gap, coverage, days
remaining), `modules/assets/lifecycle.ts` (legal and illegal transitions), audit diffing, date
helpers. These are fast, need no database, and carry the business rules.

**Integration tests.** The money paths: login + RBAC matrix, Step-1 asset+purchase transaction
(including rollback on failure), sale creation and its guards, the public scan DTO's exact field set.
Run against a real SQL Server (Docker), not a mock.

**Edge cases** to cover explicitly: inclusive vs exclusive warranty end dates; same-day sale and
installation; customer warranty starting before the sale date (legal — HOD Q6.3); supplier warranty
ending after the customer warranty (zero gap); duplicate serial among live assets vs a discarded one;
dispatch attempted without a `QC_PASSED` history row; sale attempted on a `QC_FAILED` or `DISCARDED`
asset; scanning an asset with no sale yet.

**Validation tests.** Every zod schema rejects malformed input with field-level details, and business
date rules are asserted (end ≥ start, warranty start ≥ earlier of sale/install).

**Regression tests.** Every bug fixed gets a test reproducing it first. Red, then green.

**Out of v1 deliberately:** browser e2e (Playwright is a v2 upgrade), load testing, visual
regression.

---

## Security Checklist

- **Authentication.** bcrypt (cost ≥ 10), JWT with a sane expiry, secret from env only. Never log or
  return a token. Never return `password_hash` in any DTO, ever.
- **Authorization.** `requirePermission` on every non-public route. Permission codes, not role names.
  Object-level check too: a record from another `company_id` is a **404**, not a 403 — don't confirm
  it exists.
- **Input validation.** zod at every boundary, including query and path params. Whitelist, never
  blacklist.
- **SQL injection.** Prisma parameterizes. Raw SQL only via `$queryRaw` tagged templates. **Never**
  build SQL by string concatenation or interpolation.
- **XSS.** React escapes by default — never use `dangerouslySetInnerHTML`. Sanitize any user text
  rendered outside React (PDF labels, emails).
- **CSRF.** JWT in the `Authorization` header (not cookies) makes classic CSRF inapplicable. If auth
  ever moves to cookies, add `SameSite=Strict` + CSRF tokens at the same time.
- **Rate limiting.** Mandatory on `POST /auth/login` (brute force) and `GET /public/scan/:assetId`
  (the only unauthenticated data surface, enumerable by anyone with a URL).
- **Sensitive logging.** Never log passwords, hashes, tokens, or `cost_price`. Log ids, not payloads.
- **Secret management.** `.env` never committed; `.env.example` carries dummy values only. Production
  secrets live on the server. If a secret is ever committed, rotate it — don't just delete the line.
- **File upload validation.** None in v1. When added (invoice PDFs, v2): validate MIME *and*
  magic bytes, cap size, store outside the web root, never trust the client filename.

**The public scan endpoint is the highest-risk surface in this system.** It is unauthenticated and
its URL is printed on a physical sticker anyone can photograph. Its response is built from a
**dedicated DTO listing exactly the client-view fields** — never a full asset object with fields
deleted. Cost price, supplier, PO number, purchase invoice, and internal ids must never appear in it.
Test the exact field set, and treat any change to that DTO as a security change.

---

## Performance Guidelines

- **Caching.** TanStack Query on the client with sensible `staleTime`. No server cache in v1 — add
  one only when a measurement demands it.
- **Lazy loading.** Route-level code splitting. PDF/QR libraries loaded on demand, not in the main
  bundle.
- **Pagination.** Every list endpoint, no exceptions. The asset list will grow past what a page can
  render.
- **Query optimization.** `company_id`-leading indexes; explicit `select` of needed fields only;
  `include` rather than per-row follow-up queries. Watch for N+1 in list endpoints joining
  purchase/sale/AMC — use `vw_asset_coverage` where it fits.
- **Batch operations.** Bulk label PDFs and seeds use `createMany`/batched writes, not per-row loops
  in a transaction.
- **Debouncing.** Search inputs at 300ms. Never fire a request per keystroke.
- **Memoization.** `useMemo`/`useCallback` where a real cost exists (large table transforms), not
  reflexively.
- **Avoid unnecessary renders.** Stable keys, no inline object/array literals as props on hot paths,
  colocate state so a form keystroke doesn't re-render the page.

---

## AI Decision Framework

Before writing any code:

1. **Understand the requirement.** Restate it in one sentence. If you can't, ask.
2. **Identify affected modules.** Backend module, frontend feature, schema, DTOs, tests.
3. **Search existing implementations.** Grep for the pattern before inventing one.
4. **Identify reusable code.** Which existing service, component, schema, or index already does most
   of this?
5. **Explain the implementation plan** — files to touch, in order.
6. **Mention risks** — breaking changes, migrations, security surfaces, scope creep against the MVP
   list, and anything depending on an unanswered HOD question.
7. **Then generate code.**

---

## Development Workflow

For every request: **Understand → Plan → Identify files → Explain changes → Write code →
Self-review → Suggest improvements.**

Self-review means running the Code Review Checklist below against your own diff before you report
done. "Suggest improvements" means naming what you'd do next and what you deliberately left out —
not doing it unasked.

**Environment notes.** Windows 11, PowerShell primary (a Bash tool exists; each takes its own
syntax). The parent directory `C:\rishi\QR-AMC` is **not** a git repository — only
`QR-AMC-Tracking-system/` is. Use the session scratchpad for temp files, not `/tmp` (the Git Bash
mount is invisible to Windows-path tools).

---

## Code Review Checklist

Before finishing, verify:

- [ ] No duplicated code — the existing helper was reused
- [ ] No unused imports or variables
- [ ] Proper typing; no `any`
- [ ] Consistent naming with the surrounding code
- [ ] Validation at every boundary
- [ ] Error handling present and mapped to the right status code
- [ ] No magic numbers or magic strings
- [ ] No hardcoded URLs, secrets, or connection strings
- [ ] `company_id` and `is_deleted` filters on every read
- [ ] Transaction around every multi-row write
- [ ] Audit row for every mutation
- [ ] No sensitive field in any DTO
- [ ] Tests for new pure logic
- [ ] Readable by someone who didn't write it
- [ ] Production ready — no TODOs, no placeholders, no commented-out code

---

## Project Knowledge

*Living section. When new documentation arrives, **update** this — don't replace it.*

**Authority order on conflicts:** Notion "AMC" workspace → `docs/adr/` → `db/schema.sql` →
`docs/database-schema.md` → `CONTEXT.md` → blueprint. The Notion workspace
(`app.notion.com/p/AMC-39cdcac856a780b19895ed9d126fe477`; key subpages: Module, Field-by-Field
Dictionary, Mail, Doubts) is authoritative on requirements.

**Timeline.** Hard deadline from HOD Virendra Singh: **base version usable 30 Jul 2026, live 1 Aug
2026**. The repo's 6-month learning blueprint is superseded *for scheduling* by `mvp-9day-plan.md`;
its architecture and standards still stand.

**Decisions locked (do not re-litigate):**
- **D1 multi-tenant** — `company_id` on every business row. Launch single-company; RLS deferred.
- **D2 resale = new asset + new QR** — sales is 1:1 with asset; old asset becomes `DISCARDED`.
- **D4 one manual status column** — ADR-0003, superseding ADR-0002. See *Database Standards*.
- **D7 AMC Support lives on the purchase**, not the AMC contract (Field Dictionary + Mail §3.3 + ER
  diagram agree).
- **D9 Service Support Type master dropped for v1** — bool + date window on the sale. v2 re-add.
- Serial unique **per tenant** among live assets; `users.email` unique **globally**;
  `product_makes.category_id` mandatory; `cost_price` visible to **Backoffice and Admin**.

**HOD answers received 22 Jul 2026** (`hod-questions.md`):
- Q1.1 status is set manually by Admin/Backoffice from a dropdown.
- Q1.2 **one status at any given time.**
- Q1.3 both physical journeys follow the same flow — Case 2 has no skip branch.
- Q1.5 QC always precedes dispatch; a QC-failed asset is **scrapped** (terminal).
- Q1.6 end-of-life value is **Discard**.
- Q3.1 / Q3.2 public no-login scan; unsold asset shows product identity + "not activated".
- Q4.1 / Q4.2 alerts are **V2**.
- Q5.3 tenant onboarding is manual; our company first.
- Q6.3 customer warranty starts no earlier than the **earlier of** sales date and installation date;
  the user picks any date from that floor onward. (This removed the old `installation_date >=
  sales_date` constraint — installation may legitimately precede the sale.)

**Open questions — never guess these; ask:**
- **Q1.4** what "Purchased" means as a status. *Assumed:* set by hand once Step-2 paperwork is in.
- **Q2.1 / Q2.2** resale purchase history and serial reuse. *Assumed:* re-capture purchase details;
  serial unique only among non-discarded assets.
- **Q5.1 / Q5.2** volume, SQL Server host, SMTP relay, and the **permanent public QR domain**.
  *Blocking:* the domain is frozen forever at the first label print, and the DB host blocks deploy.
- **Q6.1** warranty gap in ₹. *Assumed:* days/years only for v1.
- **Q6.2** label/sticker spec and printer. *Blocking* the label work.

**Known constraints:**
- Prisma on SQL Server: no native enums, cannot express CHECK constraints or filtered unique indexes
  → migrations are hand-edited after generation.
- SQL Server has no `EXCLUDE` constraint → overlapping AMC periods are prevented in the service layer.
- The QR public domain is frozen permanently at first label print.

**Working style.** The user wants speed and shipping. Keep external communications short. Don't
over-produce documents. Flag a risk once, clearly, then proceed.

---

## Things Never To Do

- **Never invent requirements.** Ask, or state the assumption prominently in your reply.
- **Never delete code** that wasn't part of the request.
- **Never change an API contract silently.**
- **Never skip validation**, even for "internal" endpoints.
- **Never bypass authentication or permission checks**, even temporarily for debugging.
- **Never remove logging.**
- **Never expose secrets** — not in code, logs, error messages, commits, or responses.
- **Never use a deprecated or unmaintained library** without flagging it.
- **Never add a dependency** for something the stack already does. Justify every new package.
- **Never re-introduce the three-concern status model** (ADR-0002 is superseded — see ADR-0003).
- **Never auto-write `assets.status`** — a person owns that field.
- **Never store a derived value** (warranty state, gap, QR URL) that can be computed.
- **Never return a full entity from the public scan endpoint.** Build the DTO up from nothing.
- **Never build an OUT-of-scope MVP feature** without confirming first.
