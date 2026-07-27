# Task — Supplier and AMC Supplier masters

**Owner:** Soham (`co2024sohamsagare-cmyk`) · **Branch:** `feat/masters-suppliers`

Read [`docs/INTERN-ONBOARDING.md`](../INTERN-ONBOARDING.md) first. This file only covers what is
*different* from the category template.

---

## What you're building

Two independent, flat masters — no parent relationships, so this is the closest of the three tasks
to a straight clone of categories.

- **Supplier** — who we bought the hardware from. Name + an optional email.
- **AMC Supplier** — a third party who fulfils back-to-back AMC support. Often a different company
  from the seller, which is exactly why it is a separate table. Name only.

## The tables (already exist — do not touch the schema)

`Supplier` → `suppliers`

| Field | Notes |
|---|---|
| `id` | uuid, DB-generated |
| `companyId` | from the JWT, never the request body |
| `name` | NVarChar(**255**) — note: wider than a category's 150 |
| `email` | NVarChar(255), **nullable** |
| audit + soft-delete columns | same set as categories |

Unique: `ux_suppliers_company_name` on `(company_id, name)` where `is_deleted = 0`.

`AmcSupplier` → `amc_suppliers` — identical minus `email`.
Unique: `ux_amc_suppliers_company_name` on `(company_id, name)` where `is_deleted = 0`.

## Backend

Create `server/src/modules/masters/suppliers/` and `server/src/modules/masters/amc-suppliers/`,
each a clone of the categories folder (six files). Mount both in `masters.routes.ts`:

```ts
mastersRouter.use('/suppliers', suppliersRouter);
mastersRouter.use('/amc-suppliers', amcSuppliersRouter);
```

### Differences from the template

**Name length.** 255, not 150. Change the constant in *both* the server and client schema files, and
in the `search` field of the list query too.

**The optional email — the one fiddly bit.** An empty text input submits `""`, which is not a valid
email and is not the same as "not provided". Normalise at the schema boundary so the rest of the
code only ever sees a string or `undefined`:

```ts
const supplierEmail = z
  .string()
  .trim()
  .max(255)
  .email('Enter a valid email address.')
  .optional()
  .or(z.literal('').transform(() => undefined));
```

Then store `input.email ?? null` — the column is nullable, and `null` is the correct "no email",
not `''`. Use the same shape in the client mirror schema so the inline error appears as you type.

Clearing an email on an existing supplier must actually clear it: `PUT` with `email: ""` should end
with `NULL` in the row, not the old value. The template's update path only handles a single required
field, so this is the part you have to think about rather than copy.

**DTO.** `{ id, name, email: string | null, createdAt, updatedAt }` for suppliers;
no `email` for AMC suppliers.

**Duplicate codes.** `SUPPLIER_NAME_TAKEN` and `AMC_SUPPLIER_NAME_TAKEN`, both 409. The duplicate
check is on **name only** — two suppliers may share an email, and the unique index doesn't cover it.

**Audit `ENTITY_TYPE`.** `'supplier'` and `'amc_supplier'`. On update, diff both editable fields:
`diffFields(current, next, ['name', 'email'])`, so an email change is recorded as its own audit row.
Note the template returns early when `changes.length === 0` — keep that behaviour so a save with no
actual change doesn't write a no-op audit row.

**Sort whitelist.** `['name', 'createdAt']`.

## Frontend

`client/src/features/masters/suppliers/` and `client/src/features/masters/amc-suppliers/`, cloned
from the categories feature folder.

**Form modal.** Two fields for suppliers — Name (required) and Email (optional). Both are plain
text inputs, so `register('name')` / `register('email')` works exactly as in the template. Label the
email input "Email (optional)" so nobody wonders. AMC suppliers keep the single-field modal
unchanged.

**Columns.** Suppliers: Name · Email · Created · actions. Show a dimmed `—` when the email is null
rather than an empty cell. AMC suppliers: Name · Created · actions.

**Search.** The server searches `name` only. That is fine and intended — do not add email search
without asking, because it changes the index story.

**Field error mapping.** The template maps server field errors onto inputs via `FORM_FIELDS`; add
`'email'` to that set, or a server-side email error will silently fall through to the generic alert.

**Registration.** Two routes in `router.tsx` inside the existing `master.manage` block, and two nav
items in `AppLayout.tsx`. One line each — see rule 3 in the onboarding doc.

## Order of work

Suppliers first, completely — backend, frontend, whole checklist, pushed. AMC suppliers is then a
20-minute copy with one field removed. Don't do them in parallel.

## Extra checks before you open the PR

Everything in the onboarding definition of done, plus:

- [ ] Create a supplier with no email → row saved, `email` is `NULL` in the database (not `''`).
- [ ] Create a supplier with `not-an-email` → inline error on the email field, nothing written.
- [ ] Add an email to an existing supplier, then clear it and save → the column is `NULL` again.
- [ ] Two suppliers with the same email but different names → both allowed.
- [ ] A 255-character name is accepted; 256 is rejected with a field error.
- [ ] A supplier and an AMC supplier may share a name — they are separate tables, so this must work.
- [ ] Changing only the email writes an audit row for `email`; saving with nothing changed writes
      no audit row at all.
