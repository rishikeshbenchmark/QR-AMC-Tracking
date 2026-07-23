/**
 * Idempotent seed for the shared dev database (DEV_WarrantyHub).
 *
 * Re-runnable by design: every insert is "find-or-create" on its natural key, so running
 * the seed twice never duplicates a row and never clobbers data that already exists. This
 * matters because the database is shared — a second run must be a no-op, not a reset.
 *
 * What it creates (mvp-9day-plan.md, Day 1):
 *   - one company (single-tenant launch; company_id still on every row)
 *   - the three system roles (Admin / Backoffice / Staff)
 *   - the permission catalogue + role_permissions wiring (RBAC per CLAUDE.md role table)
 *   - one Admin user (bcrypt hash) — the login the whole team uses
 *   - amc_types (Comprehensive, Non-Comprehensive)
 *   - a small set of sample masters so the Day-3 masters UI has something to show
 *
 * Admin credentials come from the environment, never from source:
 *   SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME (see server/.env.example).
 * Seed scripts are build-time tooling, so reading process.env here (rather than through
 * src/config/env.ts, which is the *application's* config) is deliberate.
 */
import { randomUUID } from 'node:crypto';

import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BCRYPT_COST = 12;

// Placeholder tenant — rename before onboarding a second company (subdomain feeds tenant
// resolution and RLS, so treat it as semi-permanent even at launch).
const COMPANY = { name: 'Benchmark', subdomain: 'benchmark' } as const;

const ROLE = { ADMIN: 'Admin', BACKOFFICE: 'Backoffice', STAFF: 'Staff' } as const;

const AMC_TYPES = ['Comprehensive', 'Non-Comprehensive'] as const;

/**
 * Permission catalogue. Codes are the contract the RBAC middleware checks — never role
 * names (CLAUDE.md). The set covers the MVP surfaces; report.view/user.manage/audit.read
 * exist now so Admin is complete even though those UIs land later.
 */
const PERMISSIONS: Array<{ code: string; description: string }> = [
  { code: 'asset.create', description: 'Register an asset (Purchase Step 1)' },
  { code: 'asset.read', description: 'View assets and asset lists' },
  { code: 'asset.update', description: 'Edit an asset' },
  { code: 'asset.status.change', description: 'Change an asset status (manual dropdown)' },
  { code: 'asset.cost_price.read', description: 'See the purchase cost price' },
  { code: 'purchase.manage', description: 'Complete Purchase Step 2' },
  { code: 'sale.manage', description: 'Create and edit sales' },
  { code: 'master.manage', description: 'CRUD the master data (category/make/model/supplier/customer)' },
  { code: 'user.manage', description: 'Manage users, roles and permissions' },
  { code: 'audit.read', description: 'Read the audit log' },
  { code: 'report.view', description: 'View reports and dashboards' },
];

// Role -> permission codes. Mirrors the role capability table in CLAUDE.md:
//   Admin       — everything
//   Backoffice  — register/purchase/sell, manage masters, set status, sees cost price
//   Staff       — scan and view only; cost price masked (no asset.cost_price.read)
const ALL_CODES = PERMISSIONS.map((p) => p.code);
const ROLE_PERMISSIONS: Record<string, string[]> = {
  [ROLE.ADMIN]: ALL_CODES,
  [ROLE.BACKOFFICE]: [
    'asset.create',
    'asset.read',
    'asset.update',
    'asset.status.change',
    'asset.cost_price.read',
    'purchase.manage',
    'sale.manage',
    'master.manage',
  ],
  [ROLE.STAFF]: ['asset.read'],
};

// Sample masters (find-or-create). Small, realistic, enough for the Day-3 forms.
const SAMPLE_CATEGORIES = ['Laptop', 'Desktop', 'Printer'] as const;
const SAMPLE_MAKES: Array<{ category: string; name: string }> = [
  { category: 'Laptop', name: 'Dell' },
  { category: 'Laptop', name: 'Lenovo' },
  { category: 'Desktop', name: 'HP' },
  { category: 'Printer', name: 'Canon' },
];
const SAMPLE_MODELS: Array<{ make: string; name: string }> = [
  { make: 'Dell', name: 'Latitude 5550' },
  { make: 'Lenovo', name: 'ThinkPad T14' },
  { make: 'HP', name: 'ProDesk 400 G9' },
  { make: 'Canon', name: 'imageCLASS LBP236dw' },
];
const SAMPLE_SUPPLIERS = ['Acme IT Distributors', 'TechnoServe Supplies'] as const;
const SAMPLE_CUSTOMERS = ['Contoso Pvt Ltd', 'Globex Industries'] as const;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(
      `${name} is not set. Add it to server/.env before seeding (see server/.env.example). ` +
        'The admin credentials are read from the environment, never hardcoded.',
    );
  }
  return value.trim();
}

async function main(): Promise<void> {
  const adminEmail = requireEnv('SEED_ADMIN_EMAIL');
  const adminPassword = requireEnv('SEED_ADMIN_PASSWORD');
  const adminName = process.env.SEED_ADMIN_NAME?.trim() || 'Administrator';

  // --- Company ---------------------------------------------------------------
  // subdomain is unique via a filtered index Prisma doesn't model, so upsert by hand.
  let company = await prisma.company.findFirst({
    where: { subdomain: COMPANY.subdomain, deletedAt: null },
  });
  if (!company) {
    company = await prisma.company.create({ data: { name: COMPANY.name, subdomain: COMPANY.subdomain } });
  }
  const companyId = company.id;

  // --- Roles -----------------------------------------------------------------
  const roleIds: Record<string, string> = {};
  for (const name of Object.values(ROLE)) {
    let role = await prisma.role.findFirst({ where: { companyId, name } });
    if (!role) {
      role = await prisma.role.create({ data: { companyId, name, isSystem: true } });
    }
    roleIds[name] = role.id;
  }

  // --- Permissions (code is @unique — safe to upsert) ------------------------
  const permissionIds: Record<string, string> = {};
  for (const { code, description } of PERMISSIONS) {
    const permission = await prisma.permission.upsert({
      where: { code },
      update: { description },
      create: { code, description },
    });
    permissionIds[code] = permission.id;
  }

  // --- role_permissions (composite PK — safe to upsert) ----------------------
  for (const [roleName, codes] of Object.entries(ROLE_PERMISSIONS)) {
    const roleId = roleIds[roleName];
    for (const code of codes) {
      const permissionId = permissionIds[code];
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId } },
        update: {},
        create: { roleId, permissionId },
      });
    }
  }

  // --- Admin user ------------------------------------------------------------
  // Create only if absent, so re-seeding never overwrites a password changed after launch.
  const existingAdmin = await prisma.user.findFirst({ where: { email: adminEmail, isDeleted: false } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, BCRYPT_COST);
    await prisma.user.create({
      data: { companyId, roleId: roleIds[ROLE.ADMIN], name: adminName, email: adminEmail, passwordHash },
    });
  }

  // --- amc_types -------------------------------------------------------------
  for (const name of AMC_TYPES) {
    const existing = await prisma.amcType.findFirst({ where: { companyId, name, isDeleted: false } });
    if (!existing) {
      await prisma.amcType.create({ data: { companyId, name } });
    }
  }

  // --- Sample masters --------------------------------------------------------
  const categoryIds: Record<string, string> = {};
  for (const name of SAMPLE_CATEGORIES) {
    let row = await prisma.productCategory.findFirst({ where: { companyId, name, isDeleted: false } });
    if (!row) row = await prisma.productCategory.create({ data: { companyId, name } });
    categoryIds[name] = row.id;
  }

  const makeIds: Record<string, string> = {};
  for (const { category, name } of SAMPLE_MAKES) {
    let row = await prisma.productMake.findFirst({ where: { companyId, name, isDeleted: false } });
    if (!row) {
      row = await prisma.productMake.create({
        data: { companyId, categoryId: categoryIds[category], name },
      });
    }
    makeIds[name] = row.id;
  }

  for (const { make, name } of SAMPLE_MODELS) {
    const existing = await prisma.productModel.findFirst({ where: { companyId, name, isDeleted: false } });
    if (!existing) {
      await prisma.productModel.create({ data: { companyId, makeId: makeIds[make], name } });
    }
  }

  for (const name of SAMPLE_SUPPLIERS) {
    const existing = await prisma.supplier.findFirst({ where: { companyId, name, isDeleted: false } });
    if (!existing) await prisma.supplier.create({ data: { companyId, name } });
  }

  for (const name of SAMPLE_CUSTOMERS) {
    const existing = await prisma.customer.findFirst({ where: { companyId, name, isDeleted: false } });
    if (!existing) await prisma.customer.create({ data: { companyId, name } });
  }

  // Summary — never logs the password or the hash.
  const counts = {
    company: COMPANY.subdomain,
    roles: Object.keys(roleIds).length,
    permissions: Object.keys(permissionIds).length,
    adminCreated: !existingAdmin,
    adminEmail,
    amcTypes: AMC_TYPES.length,
    categories: SAMPLE_CATEGORIES.length,
    makes: SAMPLE_MAKES.length,
    models: SAMPLE_MODELS.length,
    suppliers: SAMPLE_SUPPLIERS.length,
    customers: SAMPLE_CUSTOMERS.length,
  };
  // eslint-disable-next-line no-console
  console.log('Seed complete:', JSON.stringify(counts, null, 2));
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Seed failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
