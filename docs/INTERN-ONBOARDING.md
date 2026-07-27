# Intern onboarding — masters sprint

Read this once, fully, before you write a line. Then read your own task file in `docs/tasks/`.

Order of reading:

1. This file — how the project works and what "done" means.
2. [`README.md`](../README.md) — setup, scripts, branching.
3. [`CLAUDE.md`](../CLAUDE.md) — the operating manual. Sections you *must* read:
   *Coding Standards*, *API Standards*, *Database Standards*, *Frontend Standards*,
   *Security Checklist*, *Things Never To Do*.
4. Your task file.

---

## 1. What already exists (don't rebuild it)

| Area | State | Where |
|---|---|---|
| Database schema | **Done and live** on the shared server. All master tables already exist. | `server/prisma/schema.prisma` |
| Seed data | Done. One company, roles, permissions, an admin user, sample masters. | `server/prisma/seed.ts` |
| Auth (login, JWT, logout, 401 handling) | Done | `server/src/modules/auth/`, `client/src/auth/` |
| RBAC (`requirePermission`, `RequirePermission`, `can()`) | Done | `server/src/middlewares/rbac.middleware.ts`, `client/src/auth/` |
| Error handling, zod validation middleware, audit helper, logger | Done | `server/src/middlewares/`, `server/src/shared/` |
| Shared UI: `DataTable`, `MasterSelect`, `ConfirmDialog`, `AppLayout` | Done | `client/src/components/` |
| **Category master, full stack** | **Done — this is your template** | see §3 |

Everything you need already has a working example in the repo. You are not designing anything new.
You are cloning a proven slice and changing the nouns.

## 2. Setup

You need three things from Rishikesh before you can run anything:

1. The `DATABASE_URL` line for the shared SQL Server (host, database, SQL login + password).
2. The shared `JWT_SECRET` value.
3. The admin login (email + password) for the app.

```bash
git clone https://github.com/rishikeshbenchmark/QR-AMC-Tracking.git
cd QR-AMC-Tracking
npm install                    # root install covers both workspaces

cp server/.env.example server/.env
cp client/.env.example client/.env
# paste DATABASE_URL and JWT_SECRET into server/.env

npm run dev                    # API :4000, client :5173
```

Check it works: `curl http://localhost:4000/api/v1/health` → `{"data":{"status":"ok",...}}`,
then log in at http://localhost:5173 and open **Categories**. You should see Laptop, Desktop,
Printer from the seed. If you can create/edit/delete a category, your environment is correct and
you are ready to start.

> ### The one rule that can ruin everyone's day
> **Never run `npm run db:migrate` or `npm run db:seed`.** We share one database. Prisma's
> migrate command can offer to *reset* it — that drops every table and everyone's work. There is
> a guard script, but do not test it. If your task seems to need a schema change: it doesn't (the
> tables already exist). If you're convinced it does, ask Rishikesh.

## 3. The template you are cloning

The category master is the reference implementation. Ten files, five back and five front. Open
every one of them and read it before starting — the comments explain *why*, and that reasoning
applies to your master too.

**Backend** — `server/src/modules/masters/categories/`

| File | Responsibility |
|---|---|
| `categories.schemas.ts` | zod contracts: create, update, id param, list query. Types are inferred from these. |
| `categories.types.ts` | The DTO interface — the exact shape sent to the client. |
| `categories.repository.ts` | The *only* file that touches the table. Every read filters `companyId` **and** `isDeleted: false`. |
| `categories.service.ts` | Business rules: duplicate check, 404s, transactions, audit rows, DTO mapping. |
| `categories.controller.ts` | Thin. Pulls the user off the request, calls the service, sets the status code. |
| `categories.routes.ts` | Route table: `requirePermission('master.manage')` → `validate(...)` → controller. |

Plus one line in `server/src/modules/masters/masters.routes.ts` to mount your router.

**Frontend** — `client/src/features/masters/categories/`

| File | Responsibility |
|---|---|
| `categories.schemas.ts` | Client mirror of the server zod schema. Must not drift from it. |
| `categories.api.ts` | Typed axios calls + the response envelope types. |
| `categories.queries.ts` | TanStack Query hooks + the query-key factory. Mutations invalidate the key root. |
| `CategoryFormModal.tsx` | Create/edit modal. Maps server field errors and the 409 back onto inputs. |
| `CategoriesPage.tsx` | List page: search (debounced), sort, pagination, loading/error/empty/success states. |

Plus a route in `client/src/router.tsx` and a nav item in `client/src/components/AppLayout.tsx`.

### The API contract every master follows

```
GET    /api/v1/masters/<resource>?page=1&limit=25&search=&sort=name&order=asc
       → { data: [...], meta: { page, limit, total } }
GET    /api/v1/masters/<resource>/:id    → { data: {...} }
POST   /api/v1/masters/<resource>        → 201 { data: {...} }
PUT    /api/v1/masters/<resource>/:id    → 200 { data: {...} }
DELETE /api/v1/masters/<resource>/:id    → 204, no body (soft delete)
```

Duplicate name → **409** with a machine-readable code (`CATEGORY_NAME_TAKEN` → yours is
`MAKE_NAME_TAKEN`, `SUPPLIER_NAME_TAKEN`, etc.). A row belonging to another tenant → **404**,
never 403: we do not confirm that someone else's data exists.

## 4. Rules for this sprint

1. **Never push to `main`.** It is protected. Branch → push → PR → Rishikesh reviews → squash-merge.
2. **Never create or edit a Prisma migration**, and never edit `server/prisma/` or `db/`.
3. **Stay inside your folders.** You create files in *your* feature directories. The only shared
   files you may touch are the three registration points — `masters.routes.ts` (one line),
   `router.tsx` (one route), `AppLayout.tsx` (one nav item). Keep those edits to the minimum lines
   and rebase before pushing so three people adding adjacent lines is a 30-second conflict, not an
   afternoon. Anything else under `shared/`, `middlewares/`, `config/`, `client/src/api/`,
   `client/src/components/` — **ask, don't edit.**
4. **`git pull --rebase origin main` daily**, and push at least once a day even if unfinished.
   Work that lives only on your laptop is work nobody can help you with.
5. **Conventional Commits**, one idea per commit: `feat(masters): supplier CRUD with soft delete`.
6. **No `any`.** Types are inferred from zod (`z.infer<typeof schema>`). The client has
   `verbatimModuleSyntax` on, so type-only imports must be written `import type { Foo } from '…'`.
7. **Imports use the `@/` alias**, never `../../../`.
8. **Ask early.** Stuck for more than 45 minutes on the same error is a message to the group, not
   a badge of honour.

## 5. Definition of done

Your PR is ready when *all* of this is true. The PR template has the checklist — tick honestly; an
unticked box is useful information, a dishonest tick costs someone an afternoon.

**Backend**

- [ ] Every repository read filters `companyId` **and** `isDeleted: false`. No exceptions.
- [ ] Every route has `requirePermission('master.manage')` and a `validate(...)` for body/params/query.
- [ ] `companyId` and `userId` come from the JWT (`getAuthUser(req)`), **never** from the request body.
- [ ] Duplicate name returns 409 with a code, checked before insert.
- [ ] Delete is a **soft** delete — sets `isDeleted`, `deletedAt`, `deletedBy`. Nothing is ever
      physically removed.
- [ ] Create, update and delete each write an audit row, in the **same transaction** as the write.
- [ ] The response is built by a `toXxxDto()` mapper — a raw Prisma entity is never returned, so
      tenant/audit/soft-delete columns can't leak.
- [ ] Missing row (or another tenant's row) → 404.

**Frontend**

- [ ] Loading, error (with retry), empty and success states all render. Empty-with-search says
      something different from empty-with-no-data.
- [ ] The client zod schema matches the server's field-for-field.
- [ ] Server 400 field errors and the 409 duplicate map back onto the right input.
- [ ] Mutations invalidate the query key so the list refreshes without a page reload.
- [ ] Success and failure both show a notification.
- [ ] The nav item and route are gated on `master.manage`.

**Both**

- [ ] `npm run typecheck --workspace=server` and `npm run typecheck --workspace=client` both pass.
- [ ] `npm run lint --workspace=client` is clean.
      *(Known gap: the server has no eslint config yet, so `npm run lint` at the root fails. That's
      not your bug — skip it.)*
- [ ] No `TODO`s, no placeholders, no commented-out code, no `console.log`.

**How you test it** — by clicking, not by asserting that it compiles:

1. Create a row. It appears in the list.
2. Create the same name again → inline error on the name field, no crash, nothing written.
3. Rename a row, reopen the modal → the new name is there.
4. Delete a row → confirm dialog → the row goes.
5. Search for a partial name → filtered. Search for nonsense → the empty-search message.
6. Sort by name and by created date, both directions.
7. Create 26+ rows or set the page size low → pagination works, page resets to 1 on a new search.
8. In SSMS / `npm run db:studio`, check the deleted row still exists with `is_deleted = 1`, and
   that `audit_logs` has your create/update/delete rows.

Write what you actually did in the PR's "How I tested it" — not "it builds".

## 6. Who is doing what

| Branch | Owner | Task file |
|---|---|---|
| `feat/masters-makes-models` | Darsh (`darskgk-04`) | [`docs/tasks/makes-and-models.md`](tasks/makes-and-models.md) |
| `feat/masters-suppliers` | Soham (`co2024sohamsagare-cmyk`) | [`docs/tasks/suppliers.md`](tasks/suppliers.md) |
| `feat/masters-customers` | Ritesh (`Ritesh0605`) | [`docs/tasks/customers.md`](tasks/customers.md) |

Each of you owns your resource end to end — schema mirror, repository, service, controller, routes,
API layer, hooks, modal, page. Nobody hands off half a feature.
