# Task — Customer master + the masters shell

**Owner:** Ritesh (`Ritesh0605`) · **Branch:** `feat/masters-customers`

Read [`docs/INTERN-ONBOARDING.md`](../INTERN-ONBOARDING.md) first. This file only covers what is
*different* from the category template.

---

## What you're building

1. **Customers** — who we sold the asset to. Name + an optional email. A flat master, no parents.
2. **The masters shell** — the tabbed page that hosts all six master screens, so the sidebar has
   one "Masters" entry instead of six.

Part 2 is shared surface, so it comes with a coordination rule — see below.

---

## Part 1 — the Customer master

### The table (already exists — do not touch the schema)

`Customer` → `customers`

| Field | Notes |
|---|---|
| `id` | uuid, DB-generated |
| `companyId` | from the JWT, never the request body |
| `name` | NVarChar(**255**) — note: wider than a category's 150 |
| `email` | NVarChar(255), **nullable** |
| audit + soft-delete columns | same set as categories |

Unique: `ux_customers_company_name` on `(company_id, name)` where `is_deleted = 0`.

### Backend

Create `server/src/modules/masters/customers/` as a clone of the categories folder (six files), and
mount it in `masters.routes.ts`:

```ts
mastersRouter.use('/customers', customersRouter);
```

**Name length** is 255, not 150 — change it in both the server and client schema files.

**The optional email — the one fiddly bit.** An empty text input submits `""`, which is not a valid
email and is not the same as "not provided". Normalise at the schema boundary so the rest of the
code only ever sees a string or `undefined`:

```ts
const customerEmail = z
  .string()
  .trim()
  .max(255)
  .email('Enter a valid email address.')
  .optional()
  .or(z.literal('').transform(() => undefined));
```

Store `input.email ?? null` — the column is nullable, and `null` is the correct "no email", not
`''`. Clearing the email on an existing customer must actually clear it: `PUT` with `email: ""`
should leave `NULL` in the row. The template's update path only handles a single required field, so
this is the part to think about rather than copy.

**DTO:** `{ id, name, email: string | null, createdAt, updatedAt }`.
**Duplicate code:** `CUSTOMER_NAME_TAKEN`, 409, checked on **name only** — two customers may share
an email.
**Audit `ENTITY_TYPE`:** `'customer'`, with `diffFields(current, next, ['name', 'email'])` so an
email change gets its own audit row. Keep the template's early return when nothing changed.
**Sort whitelist:** `['name', 'createdAt']`.

### Frontend

`client/src/features/masters/customers/`, cloned from the categories feature folder. Two plain text
inputs in the modal — Name (required) and Email (optional), both work with `register(...)`. Add
`'email'` to the modal's `FORM_FIELDS` set or server-side email errors won't land on the input.
Columns: Name · Email · Created · actions, with a dimmed `—` for a null email.

---

## Part 2 — the masters shell

Six master screens hanging off the sidebar individually is clutter. Build one **Masters** page with
a tab per master:

```
Masters
┌──────────┬───────┬────────┬───────────┬───────────────┬───────────┐
│ Category │ Make  │ Model  │ Supplier  │ AMC Supplier  │ Customer  │
└──────────┴───────┴────────┴───────────┴───────────────┴───────────┘
```

Create `client/src/features/masters/MastersPage.tsx`:

- Mantine `Tabs`, one per master.
- **The tab must be in the URL** — `/masters/categories`, `/masters/makes`, and so on. Drive the
  active tab from `useParams`/`useLocation` and change it with `navigate()`. A tab that only lives
  in component state breaks refresh, back/forward and shareable links, and it will be your first
  bug report.
- `/masters` with no tab redirects to `/masters/categories`.
- Each tab renders the corresponding page component (`<CategoriesPage />`, `<CustomersPage />`, …).
  Those components already own their own search, sort, pagination and modals — the shell adds
  nothing but navigation. Do not move logic into the shell.
- One nav item in `AppLayout.tsx`: **Masters**, gated on `master.manage`, replacing the individual
  ones.

**Coordination — read this before you start Part 2.** Darsh and Soham are building the make, model,
supplier and AMC supplier pages on their own branches at the same time. Their page components do not
exist on `main` yet, so you cannot import them.

The rule: **build the shell with only the tabs whose pages exist on `main` at the time**, and leave
the registration point obvious — a single array near the top of the file:

```tsx
const MASTER_TABS = [
  { value: 'categories', label: 'Categories', path: '/masters/categories', element: <CategoriesPage /> },
  { value: 'customers',  label: 'Customers',  path: '/masters/customers',  element: <CustomersPage /> },
];
```

so that adding a tab later is one line, not a redesign. Tell Rishikesh the moment the shell PR is
open — the merge order matters, and he will sequence the other two branches onto it rather than
letting three people rewrite `router.tsx` in parallel. **Do not** create stub or placeholder pages
for the other four masters; a stub that ships is worse than a missing tab.

Do **Part 1 completely and push it** before starting Part 2. Customers is the deliverable; the shell
is the polish, and it is the part most likely to need rework once the other branches land.

## Extra checks before you open the PR

Everything in the onboarding definition of done, plus:

**Customers**

- [ ] Create a customer with no email → row saved, `email` is `NULL` in the database (not `''`).
- [ ] Create a customer with `not-an-email` → inline error on the email field, nothing written.
- [ ] Add an email, then clear it and save → the column is `NULL` again.
- [ ] Two customers with the same email but different names → both allowed.
- [ ] A 255-character name is accepted; 256 is rejected with a field error.
- [ ] Changing only the email writes an audit row for `email`; saving with nothing changed writes
      no audit row at all.

**Shell**

- [ ] Refreshing the browser on `/masters/customers` reopens the Customers tab, not the first one.
- [ ] Browser back and forward move between tabs.
- [ ] `/masters` redirects to the first tab.
- [ ] A user without `master.manage` sees neither the nav item nor the page (test by temporarily
      removing the permission from a role in the database — **read the row first, put it back
      after**, and never run the seed).
- [ ] Switching tabs does not lose the search text of the tab you return to, or — if it does —
      that is a deliberate choice you can defend in the PR.
