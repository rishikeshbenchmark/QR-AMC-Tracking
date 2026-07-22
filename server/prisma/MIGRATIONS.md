# Migrations — read before you run `prisma migrate`

`db/schema.sql` is the canonical DDL. `schema.prisma` is derived **from** it, never the reverse.

Prisma on SQL Server cannot express three things this schema depends on:

1. **CHECK constraints** — the status vocabularies, date ordering, positive money, the
   Back-to-Back AMC supplier rule, the warranty-start floor.
2. **Filtered unique indexes** — uniqueness must ignore soft-deleted rows, or deleting a
   supplier permanently burns its name. `ux_assets_company_serial` additionally excludes
   `DISCARDED` so a resold serial can re-register under a new asset.
3. **Views** — `vw_asset_coverage`.

So every migration is generated and then **hand-edited**, and the edits live below the
`HAND-EDITED` banner inside the migration SQL.

## Who may create a migration

**Only the project lead.** Three people generating migrations against three local databases
produces three divergent histories that cannot be merged. If your work needs a schema change,
ask — do not run `migrate dev`.

## The workflow

```bash
# 1. Edit schema.prisma to match the change already made in db/schema.sql.
# 2. Generate the SQL WITHOUT applying it:
npm exec --workspace=server -- prisma migrate dev --name <change> --create-only

# 3. Hand-edit server/prisma/migrations/<timestamp>_<change>/migration.sql:
#    add the CHECK constraints / filtered indexes / views, ABOVE the final `COMMIT TRAN;`
#    so they are part of the same transaction.
# 4. Apply it:
npm exec --workspace=server -- prisma migrate dev
```

`CREATE VIEW` must be the first statement in its batch, and the migration runs as one batch —
so wrap views in `EXEC('CREATE VIEW …')`, as the init migration does.

## Never

- **Never regenerate a migration that has been hand-edited.** You will silently drop every
  CHECK constraint and filtered index in it. There is no error; the schema just quietly stops
  enforcing its rules.
- **Never `migrate reset` against anything but your own local instance.**
- In production it is `prisma migrate deploy` only — forward-only, never `dev`.

## Verifying a migration did what you think

Run this in SSMS against the `qramc` database, or with `sqlcmd`:

```sql
SELECT COUNT(*) AS check_constraints FROM sys.check_constraints;
SELECT COUNT(*) AS filtered_indexes  FROM sys.indexes WHERE has_filter = 1;
SELECT COUNT(*) AS coverage_view     FROM sys.views WHERE name = 'vw_asset_coverage';
```

After `20260722100830_init` the correct answers are **11 check constraints**, **14 filtered
indexes** (11 unique + 3 report) and **1 view**. If a later migration drops those numbers, it was
regenerated over a hand-edit.

## Row-level security

`db/schema.sql` section 6 carries the SQL Server RLS policy, deliberately commented out.
Launch is single-company and `company_id` comes from the JWT. **Enable RLS before the second
company is onboarded** — that is a hard prerequisite, not a nice-to-have.
