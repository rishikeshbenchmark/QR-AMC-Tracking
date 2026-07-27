# Task — Make and Model masters

**Owner:** Darsh (`darskgk-04`) · **Branch:** `feat/masters-makes-models`

Read [`docs/INTERN-ONBOARDING.md`](../INTERN-ONBOARDING.md) first. This file only covers what is
*different* from the category template.

---

## What you're building

Two master screens that sit in a chain:

```
Category  ──<  Make  ──<  Model
"Laptop"       "Dell"     "Latitude 5550"
```

A make **always** belongs to a category. A model **always** belongs to a make. Both parents are
mandatory — this was settled with the HOD, don't make them optional to save effort.

Yours is the hardest of the three master tasks, because it is the only one with parent
relationships. Everything the other two do, you do as well, plus the parent handling below.

## The tables (already exist — do not touch the schema)

`ProductMake` → `product_makes`

| Field | Notes |
|---|---|
| `id` | uuid, DB-generated |
| `companyId` | from the JWT, never the request body |
| `categoryId` | **required** FK → `product_categories` |
| `name` | NVarChar(150) |
| audit + soft-delete columns | same set as categories |

Unique index: `ux_makes_company_name` on `(company_id, name)` **where `is_deleted = 0`**.

`ProductModel` → `product_models`

| Field | Notes |
|---|---|
| `id` | uuid, DB-generated |
| `companyId` | from the JWT |
| `makeId` | **required** FK → `product_makes` |
| `name` | NVarChar(150) |
| audit + soft-delete columns | same set |

Unique index: `ux_models_company_make_name` on `(company_id, make_id, name)` where `is_deleted = 0`.

> **Read that last one carefully.** A model name is unique *within its make*, not globally.
> "Latitude 5550" under Dell and "Latitude 5550" under HP are both legal. Your duplicate check
> must include `makeId` — the category template's `findByName(companyId, name)` becomes
> `findByName(companyId, makeId, name)`. Getting this wrong is the single most likely bug in this
> task.

## Backend

Create `server/src/modules/masters/makes/` and `server/src/modules/masters/models/`, each a clone
of the categories folder (six files). Mount both in `masters.routes.ts`:

```ts
mastersRouter.use('/makes', makesRouter);
mastersRouter.use('/models', modelsRouter);
```

### Differences from the template

**Schemas.** `createMakeSchema` = `{ name, categoryId: z.string().uuid() }`.
`createModelSchema` = `{ name, makeId: z.string().uuid() }`. Update schemas carry the same shape —
moving a make to a different category is allowed.

**List query.** Add an optional parent filter, whitelisted like everything else:

- makes: `categoryId: z.string().uuid().optional()`
- models: `makeId: z.string().uuid().optional()`

**DTOs.** Include the parent's id *and* name, so the table can show it without a second request:

```ts
export interface MakeDto {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  createdAt: Date;
  updatedAt: Date | null;
}
```

Get `categoryName` with a nested `select` in the repository — `category: { select: { name: true } }`
— and flatten it in the DTO mapper. Do not `select *` and do not return the nested Prisma object.

**Parent validation (this is the new logic).** Before creating or updating, confirm the parent
exists, belongs to **this tenant** and is not soft-deleted:

```ts
const category = await categoriesRepository.findCategoryById(user.companyId, input.categoryId);
if (!category) throw AppError.notFound('Category not found.');
```

Reuse the category repository's finder — importing another master's *repository* function is fine;
duplicating the query is not. A parent from another company must come back as a plain 404. Without
this check a caller can attach a make to any tenant's category by guessing a uuid.

**Duplicate codes.** `MAKE_NAME_TAKEN` and `MODEL_NAME_TAKEN`, both 409.

**Audit `ENTITY_TYPE`.** `'product_make'` and `'product_model'`. When the parent changes on an
update, that is a field change too — `diffFields(current, next, ['name', 'categoryId'])` so the
audit log records the move, not just the rename.

**Sort whitelist.** `['name', 'createdAt']` is enough. If you want to sort by parent name, add it
deliberately (`orderBy: { category: { name: order } }`) — never pass an unvalidated string through.

## Frontend

`client/src/features/masters/makes/` and `client/src/features/masters/models/`, cloned from the
categories feature folder.

**The form modal** gets a parent picker above the name field. Use the existing
`MasterSelect` (`@/components/MasterSelect`) — it is already built, searchable, and supports
create-on-the-fly:

```tsx
<MasterSelect
  label="Category"
  required
  data={categoryOptions}          // from useCategories(...) mapped to { value: id, label: name }
  value={categoryId}
  onChange={setCategoryId}
  onCreate={async (name) => {
    const created = await createCategory.mutateAsync({ name });
    return { value: created.id, label: created.name };
  }}
  loading={categoriesQuery.isLoading}
  error={errors.categoryId?.message}
/>
```

`MasterSelect` is presentational and never calls the API itself — you pass it the data and the
`onCreate` mutation. Reuse `useCategories` / `useCreateCategory` from
`@/features/masters/categories/categories.queries`; do not write a second copy. Because it is not a
plain `<input>`, it does not work with `register(...)` — wire it through react-hook-form's
`Controller`, or hold the value in state and `setValue` it.

The models modal does the same thing with makes as the parent.

**The models page** gets a make filter next to the search box — a `Select` of makes, plus an
"All makes" option. When it changes, reset to page 1 (the template already does this for search
and sort; extend that `useEffect` dependency list) and pass `makeId` into the list query so it is
part of the query key. Filtering client-side would be wrong: page 2 of an unfiltered list is not
page 2 of a filtered one.

**Columns.** Makes: Name · Category · Created · actions. Models: Name · Make · Created · actions.

**Registration.** Two routes in `router.tsx` inside the existing `master.manage` block, and two nav
items in `AppLayout.tsx`. One line each — see rule 3 in the onboarding doc.

## Order of work

Do makes completely — backend, then frontend, then click through the whole checklist — and push it
before you start models. Models is the same shape again; if makes is right, models is a fast copy.
Two half-finished features is the worst possible state to be in on Thursday.

## Extra checks before you open the PR

Everything in the onboarding definition of done, plus:

- [ ] Creating a make with a `categoryId` that doesn't exist → 404, nothing written.
- [ ] Creating a make with another tenant's `categoryId` → 404 (not 403, not 500).
- [ ] The same model name under two different makes → **both succeed**. Same name twice under one
      make → 409.
- [ ] Filtering models by make and paging through the filtered result gives consistent pages.
- [ ] Creating a category from inside the make modal's dropdown selects it immediately, and the
      Categories page shows it too (the query key was invalidated).
- [ ] Changing a make's category writes an audit row for `category_id`, not just for `name`.
- [ ] The make list shows the category name without an N+1 (one query for the page, not one per row
      — check the SQL in the server log).
