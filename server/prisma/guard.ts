/**
 * A speed bump in front of destructive Prisma commands on the SHARED dev database.
 *
 * Development runs against one shared SQL Server database on the company server, so
 * `prisma migrate dev` — which can offer to reset the database, dropping every table —
 * must only ever be run by the lead, deliberately. This refuses to proceed unless the
 * caller has explicitly set MIGRATE_OK=1, turning a reflexive `npm run db:migrate` into
 * a stop-and-think instead of a team-wide data loss.
 *
 * It is intentionally not clever: a determined person can always set the variable. The
 * point is that nobody does it *by accident*.
 */
const banner = `
============================================================================
  STOP. db:migrate / db:seed run against the SHARED company database.

  On a shared database, 'prisma migrate dev' can reset it — dropping every
  table and ALL of the team's data. Only the lead runs these, on purpose.

  If your task needs a schema change, ask the lead. See prisma/MIGRATIONS.md.

  If you ARE the lead and mean it, re-run with MIGRATE_OK=1, e.g.:

    # PowerShell
    $env:MIGRATE_OK=1; npm run db:migrate

    # bash
    MIGRATE_OK=1 npm run db:migrate
============================================================================
`;

if (process.env.MIGRATE_OK !== '1') {
  console.error(banner);
  process.exit(1);
}
