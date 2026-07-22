-- ============================================================================
-- QR-AMC Tracking System — Database Schema (Microsoft SQL Server 2022 / T-SQL)
--
-- Source of truth: Document/amc-project-blueprint.md (Decision Log) reconciled
-- against the Notion "AMC" workspace (Module, Field-by-Field Dictionary, Mail,
-- ER review notes) and /ER-diagrams/*.html.
--
-- Design summary (see docs/database-schema.md for full rationale):
--   • Multi-tenant: company_id on every tenant-owned row (blueprint D1 REVERSED
--     to multi-tenant, matching the ER diagrams + spec).
--   • MSSQL: UNIQUEIDENTIFIER keys, BIT booleans, DECIMAL(12,2) money, no native
--     ENUM (VARCHAR + CHECK), no Postgres EXCLUDE (overlap guarded in service layer).
--   • ONE manual asset status (HOD Q1.1/Q1.2): a single assets.status column
--     holding the full Mail §3.1 vocabulary + DISCARDED. Set by hand from a
--     dropdown by Admin/Backoffice — never written by the system. Legal moves and
--     the QC gate live in assets/lifecycle.ts + asset_status_history.
--     Coverage (warranty/AMC dates, gap, days remaining) is still COMPUTED at read
--     time for the scan view — advisory only, it never overwrites status.
--     Supersedes the three-concern model (ADR-0002 → ADR-0003).
--   • AMC Support lives on the PURCHASE (blueprint D7 REVERSED — Field Dictionary,
--     Mail §3.3 and the ER diagram all place it on the purchase side).
--   • sales is 1:1 per asset. RESALE mints a NEW asset + NEW QR (Notion Doubts
--     answer; blueprint D2 REVERSED). On resale the old asset is DISCARDED and the
--     new asset re-registers the same physical serial (serial index excludes
--     DISCARDED/deleted rows).  [HOD Q2.1/Q2.2 still unanswered — see gaps below.]
--   • Service Support is a bool + date window on the sale; no Service Support Type
--     master in v1 (blueprint D9 — deliberate deviation from Mail §9).
--   • Every business table: audit columns + soft delete.
--
-- Resolved scope questions: serial unique PER TENANT; users.email unique GLOBAL;
--   product_makes.category_id MANDATORY; cost_price visible to Backoffice AND Admin.
--
-- STILL UNANSWERED by HOD (assumption taken, revisit before go-live):
--   Q1.4 what "Purchased" means → ASSUMED: set by hand once Step-2 paperwork is in.
--   Q2.1/Q2.2 resale purchase history + serial reuse → ASSUMED default (a) re-capture,
--             serial unique only among non-DISCARDED assets.
--   Q5.1/Q5.2 volume, SQL Server host, SMTP, **permanent QR domain** (blocks labels).
--   Q6.1 warranty gap in ₹ → ASSUMED days/years only for v1.
--   Q6.2 label/sticker spec → blocks the Day-5 print test.
-- ============================================================================

-- ============================================================================
-- 1. TENANCY & IDENTITY
-- ============================================================================

CREATE TABLE companies (
    id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    name        NVARCHAR(255) NOT NULL,
    subdomain   NVARCHAR(100) NOT NULL,
    status      VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE'
                CONSTRAINT ck_companies_status CHECK (status IN ('ACTIVE','SUSPENDED')),
    created_at  DATETIME2(3)  NOT NULL DEFAULT SYSUTCDATETIME(),
    deleted_at  DATETIME2(3)  NULL
);
CREATE UNIQUE INDEX ux_companies_subdomain ON companies (subdomain) WHERE deleted_at IS NULL;

CREATE TABLE roles (
    id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    company_id  UNIQUEIDENTIFIER NOT NULL REFERENCES companies(id),
    name        NVARCHAR(100) NOT NULL,   -- Admin, Backoffice, Staff (seeded)
    is_system   BIT NOT NULL DEFAULT 0,   -- system roles are non-deletable
    CONSTRAINT ux_roles_company_name UNIQUE (company_id, name)
);

-- Permission catalogue is a global list of codes (not tenant-scoped).
CREATE TABLE permissions (
    id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    code        VARCHAR(100) NOT NULL UNIQUE,   -- e.g. asset.create, asset.cost_price.read
    description NVARCHAR(255) NULL
);

CREATE TABLE role_permissions (
    role_id       UNIQUEIDENTIFIER NOT NULL REFERENCES roles(id),
    permission_id UNIQUEIDENTIFIER NOT NULL REFERENCES permissions(id),
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE users (
    id            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    company_id    UNIQUEIDENTIFIER NOT NULL REFERENCES companies(id),
    role_id       UNIQUEIDENTIFIER NOT NULL REFERENCES roles(id),  -- one role per user (v1)
    name          NVARCHAR(255) NOT NULL,
    email         NVARCHAR(255) NOT NULL,
    password_hash VARCHAR(255)  NOT NULL,   -- bcrypt; never selected into DTOs
    is_active     BIT NOT NULL DEFAULT 1,
    created_by    UNIQUEIDENTIFIER NULL,
    created_at    DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_by    UNIQUEIDENTIFIER NULL,
    updated_at    DATETIME2(3) NULL,
    is_deleted    BIT NOT NULL DEFAULT 0,
    deleted_at    DATETIME2(3) NULL,
    deleted_by    UNIQUEIDENTIFIER NULL
);
-- Email is GLOBALLY unique (resolved). Filtered so a soft-deleted user's email
-- can be reused.
CREATE UNIQUE INDEX ux_users_email ON users (email) WHERE is_deleted = 0;

-- Insert-only change log. No FK to users (audit must survive user deletion).
-- company_id present so the audit view is tenant-isolated like everything else.
CREATE TABLE audit_logs (
    id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    company_id  UNIQUEIDENTIFIER NOT NULL,
    entity_type VARCHAR(100) NOT NULL,          -- 'asset', 'purchase', ...
    entity_id   UNIQUEIDENTIFIER NOT NULL,
    action      VARCHAR(30)  NOT NULL,          -- CREATE | UPDATE | DELETE | STATUS_CHANGE
    field_name  VARCHAR(100) NULL,
    old_value   NVARCHAR(MAX) NULL,
    new_value   NVARCHAR(MAX) NULL,
    changed_by  UNIQUEIDENTIFIER NULL,
    changed_at  DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX idx_audit_logs_entity ON audit_logs (company_id, entity_type, entity_id);

-- ============================================================================
-- 2. MASTERS  (all UNIQUE(company_id, name); most support on-the-fly creation)
-- ============================================================================

CREATE TABLE product_categories (
    id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    company_id  UNIQUEIDENTIFIER NOT NULL REFERENCES companies(id),
    name        NVARCHAR(150) NOT NULL,
    created_by  UNIQUEIDENTIFIER NULL,
    created_at  DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_by  UNIQUEIDENTIFIER NULL,
    updated_at  DATETIME2(3) NULL,
    is_deleted  BIT NOT NULL DEFAULT 0,
    deleted_at  DATETIME2(3) NULL,
    deleted_by  UNIQUEIDENTIFIER NULL
);
CREATE UNIQUE INDEX ux_categories_company_name ON product_categories (company_id, name) WHERE is_deleted = 0;

CREATE TABLE product_makes (
    id           UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    company_id   UNIQUEIDENTIFIER NOT NULL REFERENCES companies(id),
    category_id  UNIQUEIDENTIFIER NOT NULL REFERENCES product_categories(id), -- mandatory (resolved)
    name         NVARCHAR(150) NOT NULL,
    created_by   UNIQUEIDENTIFIER NULL,
    created_at   DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_by   UNIQUEIDENTIFIER NULL,
    updated_at   DATETIME2(3) NULL,
    is_deleted   BIT NOT NULL DEFAULT 0,
    deleted_at   DATETIME2(3) NULL,
    deleted_by   UNIQUEIDENTIFIER NULL
);
CREATE UNIQUE INDEX ux_makes_company_name ON product_makes (company_id, name) WHERE is_deleted = 0;

CREATE TABLE product_models (
    id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    company_id  UNIQUEIDENTIFIER NOT NULL REFERENCES companies(id),
    make_id     UNIQUEIDENTIFIER NOT NULL REFERENCES product_makes(id),
    name        NVARCHAR(150) NOT NULL,   -- "Latitude 5550" belongs to Dell
    created_by  UNIQUEIDENTIFIER NULL,
    created_at  DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_by  UNIQUEIDENTIFIER NULL,
    updated_at  DATETIME2(3) NULL,
    is_deleted  BIT NOT NULL DEFAULT 0,
    deleted_at  DATETIME2(3) NULL,
    deleted_by  UNIQUEIDENTIFIER NULL
);
CREATE UNIQUE INDEX ux_models_company_make_name ON product_models (company_id, make_id, name) WHERE is_deleted = 0;

CREATE TABLE suppliers (
    id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    company_id  UNIQUEIDENTIFIER NOT NULL REFERENCES companies(id),
    name        NVARCHAR(255) NOT NULL,
    email       NVARCHAR(255) NULL,
    created_by  UNIQUEIDENTIFIER NULL,
    created_at  DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_by  UNIQUEIDENTIFIER NULL,
    updated_at  DATETIME2(3) NULL,
    is_deleted  BIT NOT NULL DEFAULT 0,
    deleted_at  DATETIME2(3) NULL,
    deleted_by  UNIQUEIDENTIFIER NULL
);
CREATE UNIQUE INDEX ux_suppliers_company_name ON suppliers (company_id, name) WHERE is_deleted = 0;

-- Third parties who fulfil Back-to-Back AMC support (kept per ER diagram).
CREATE TABLE amc_suppliers (
    id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    company_id  UNIQUEIDENTIFIER NOT NULL REFERENCES companies(id),
    name        NVARCHAR(255) NOT NULL,
    created_by  UNIQUEIDENTIFIER NULL,
    created_at  DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_by  UNIQUEIDENTIFIER NULL,
    updated_at  DATETIME2(3) NULL,
    is_deleted  BIT NOT NULL DEFAULT 0,
    deleted_at  DATETIME2(3) NULL,
    deleted_by  UNIQUEIDENTIFIER NULL
);
CREATE UNIQUE INDEX ux_amc_suppliers_company_name ON amc_suppliers (company_id, name) WHERE is_deleted = 0;

CREATE TABLE customers (
    id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    company_id  UNIQUEIDENTIFIER NOT NULL REFERENCES companies(id),
    name        NVARCHAR(255) NOT NULL,
    email       NVARCHAR(255) NULL,
    created_by  UNIQUEIDENTIFIER NULL,
    created_at  DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_by  UNIQUEIDENTIFIER NULL,
    updated_at  DATETIME2(3) NULL,
    is_deleted  BIT NOT NULL DEFAULT 0,
    deleted_at  DATETIME2(3) NULL,
    deleted_by  UNIQUEIDENTIFIER NULL
);
CREATE UNIQUE INDEX ux_customers_company_name ON customers (company_id, name) WHERE is_deleted = 0;

-- Seeded (Comprehensive, Non-Comprehensive); not on-the-fly.
CREATE TABLE amc_types (
    id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    company_id  UNIQUEIDENTIFIER NOT NULL REFERENCES companies(id),
    name        NVARCHAR(100) NOT NULL,
    created_by  UNIQUEIDENTIFIER NULL,
    created_at  DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_by  UNIQUEIDENTIFIER NULL,
    updated_at  DATETIME2(3) NULL,
    is_deleted  BIT NOT NULL DEFAULT 0,
    deleted_at  DATETIME2(3) NULL,
    deleted_by  UNIQUEIDENTIFIER NULL
);
CREATE UNIQUE INDEX ux_amc_types_company_name ON amc_types (company_id, name) WHERE is_deleted = 0;

-- ============================================================================
-- 3. ASSET DOMAIN
-- ============================================================================

-- id is an app-generated UUID v4 (it lives in the QR URL and is needed before
-- insert for the audit row) — NO default here; the service layer supplies it.
CREATE TABLE assets (
    id                UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    company_id        UNIQUEIDENTIFIER NOT NULL REFERENCES companies(id),
    category_id       UNIQUEIDENTIFIER NOT NULL REFERENCES product_categories(id),
    make_id           UNIQUEIDENTIFIER NOT NULL REFERENCES product_makes(id),
    model_id          UNIQUEIDENTIFIER NOT NULL REFERENCES product_models(id),
    serial_number     NVARCHAR(100) NOT NULL,        -- trim/uppercase in service layer
    -- ONE status, hand-picked from a dropdown by Admin/Backoffice (HOD Q1.1, Q1.2).
    -- Full Mail §3.1 vocabulary + DISCARDED (HOD Q1.6, end of life). Stored as
    -- UPPER_SNAKE codes to match the rest of this schema; the service layer maps
    -- them to the Mail's display words ('QC_PENDING' -> "QC Pending").
    -- NOTE: WARRANTY_*/AMC_* are hand-set here by explicit instruction. The dates
    -- in purchases/sales/amc_contracts remain the source of truth for the computed
    -- coverage shown on the scan view; a divergence between the two is surfaced to
    -- Backoffice as a warning, never auto-corrected.
    status            VARCHAR(20) NOT NULL DEFAULT 'CREATED'
        CONSTRAINT ck_assets_status CHECK (status IN
            ('CREATED','PURCHASED','QC_PENDING','QC_PASSED','QC_FAILED','ALLOCATED',
             'DISPATCHED','INSTALLED','WARRANTY_ACTIVE','WARRANTY_EXPIRED',
             'AMC_ACTIVE','AMC_EXPIRED','DISCARDED')),
    -- No qr_url column (derived from id). No warranty/coverage columns (derived).
    -- No installation_date here — it lives on the sale (sales.installation_date).
    created_by  UNIQUEIDENTIFIER NULL,
    created_at  DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_by  UNIQUEIDENTIFIER NULL,
    updated_at  DATETIME2(3) NULL,
    is_deleted  BIT NOT NULL DEFAULT 0,
    deleted_at  DATETIME2(3) NULL,
    deleted_by  UNIQUEIDENTIFIER NULL
);
-- Serial unique PER TENANT among live assets. DISCARDED/deleted rows are excluded
-- so that on RESALE the old asset is DISCARDED and the same physical serial can be
-- re-registered under the new asset + new QR (D2, pending HOD Q2.2).
CREATE UNIQUE INDEX ux_assets_company_serial ON assets (company_id, serial_number)
    WHERE is_deleted = 0 AND status <> 'DISCARDED';
CREATE INDEX idx_assets_status ON assets (company_id, status);

-- Every status change, insert-only. Required by the one-status model: once an asset
-- moves past QC_PASSED the row no longer says QC ever passed, but HOD Q1.5 makes
-- "QC passed" a hard gate on dispatch — so the gate reads this table. Also powers
-- the status timeline on the staff scan view.
CREATE TABLE asset_status_history (
    id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    company_id  UNIQUEIDENTIFIER NOT NULL REFERENCES companies(id),
    asset_id    UNIQUEIDENTIFIER NOT NULL REFERENCES assets(id),
    from_status VARCHAR(20) NULL,          -- NULL on the initial CREATED row
    to_status   VARCHAR(20) NOT NULL,
    remarks     NVARCHAR(500) NULL,        -- QC failure reason, discard reason, ...
    changed_by  UNIQUEIDENTIFIER NULL,
    changed_at  DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX idx_asset_status_history_asset ON asset_status_history (asset_id, changed_at);

-- 1:1 with asset. Row is created at Purchase Step 1 (supplier only); Step 2 fills
-- the rest. AMC Support (INHOUSE/BACK_TO_BACK) is captured here at AMC time.
CREATE TABLE purchases (
    id                      UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    company_id              UNIQUEIDENTIFIER NOT NULL REFERENCES companies(id),
    asset_id                UNIQUEIDENTIFIER NOT NULL UNIQUE REFERENCES assets(id),
    supplier_id             UNIQUEIDENTIFIER NOT NULL REFERENCES suppliers(id),
    po_number               NVARCHAR(50) NULL,
    supplier_invoice_no     NVARCHAR(50) NULL,
    purchase_date           DATE NULL,
    supplier_warranty_start DATE NULL,
    supplier_warranty_end   DATE NULL,
    cost_price              DECIMAL(12,2) NULL,   -- visible to Backoffice AND Admin; masked for others
    amc_support             VARCHAR(15) NULL      -- filled at AMC time (nullable)
        CONSTRAINT ck_purchases_amc_support CHECK (amc_support IN ('INHOUSE','BACK_TO_BACK')),
    amc_supplier_id         UNIQUEIDENTIFIER NULL REFERENCES amc_suppliers(id),
    created_by  UNIQUEIDENTIFIER NULL,
    created_at  DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_by  UNIQUEIDENTIFIER NULL,
    updated_at  DATETIME2(3) NULL,
    is_deleted  BIT NOT NULL DEFAULT 0,
    deleted_at  DATETIME2(3) NULL,
    deleted_by  UNIQUEIDENTIFIER NULL,
    CONSTRAINT ck_purchases_warranty_order
        CHECK (supplier_warranty_end IS NULL OR supplier_warranty_start IS NULL
               OR supplier_warranty_end >= supplier_warranty_start),
    CONSTRAINT ck_purchases_cost_positive
        CHECK (cost_price IS NULL OR cost_price > 0),
    -- Back-to-Back requires an AMC supplier; Inhouse/unset must not name one.
    CONSTRAINT ck_purchases_amc_supplier
        CHECK ( (amc_support = 'BACK_TO_BACK' AND amc_supplier_id IS NOT NULL)
             OR (amc_support = 'INHOUSE'      AND amc_supplier_id IS NULL)
             OR (amc_support IS NULL          AND amc_supplier_id IS NULL) )
);
CREATE INDEX idx_purchases_supplier_warranty ON purchases (company_id, supplier_warranty_end) WHERE is_deleted = 0;

-- 1:1 with asset (D2 REVERSED). Resale = new asset + new QR, not a second sale row.
CREATE TABLE sales (
    id                      UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    company_id              UNIQUEIDENTIFIER NOT NULL REFERENCES companies(id),
    asset_id                UNIQUEIDENTIFIER NOT NULL UNIQUE REFERENCES assets(id),
    customer_id             UNIQUEIDENTIFIER NOT NULL REFERENCES customers(id),
    sales_invoice_no        NVARCHAR(50) NULL,      -- nullable until invoiced (D10)
    sales_date              DATE NULL,
    installation_date       DATE NULL,
    customer_warranty_start DATE NULL,
    customer_warranty_end   DATE NULL,
    service_support         BIT NOT NULL DEFAULT 0,
    service_support_start   DATE NULL,              -- required in service layer when flag=1
    service_support_end     DATE NULL,
    created_by  UNIQUEIDENTIFIER NULL,
    created_at  DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_by  UNIQUEIDENTIFIER NULL,
    updated_at  DATETIME2(3) NULL,
    is_deleted  BIT NOT NULL DEFAULT 0,
    deleted_at  DATETIME2(3) NULL,
    deleted_by  UNIQUEIDENTIFIER NULL,
    CONSTRAINT ck_sales_warranty_order
        CHECK (customer_warranty_end IS NULL OR customer_warranty_start IS NULL
               OR customer_warranty_end >= customer_warranty_start),
    -- HOD Q6.3: customer warranty starts no earlier than the EARLIER of sales date
    -- and installation date; the user then picks any date from that floor onward.
    -- (Their example: sold 1 Jul, installed 3 Jul -> selectable from 1 Jul.)
    -- The old "installation_date >= sales_date" check is deliberately GONE — saying
    -- "whichever is earlier" means installation may legitimately precede the sale.
    CONSTRAINT ck_sales_warranty_start_floor
        CHECK (customer_warranty_start IS NULL
               OR (sales_date IS NULL AND installation_date IS NULL)
               OR customer_warranty_start >=
                  CASE WHEN sales_date IS NULL        THEN installation_date
                       WHEN installation_date IS NULL THEN sales_date
                       WHEN sales_date <= installation_date THEN sales_date
                       ELSE installation_date END),
    CONSTRAINT ck_sales_service_window
        CHECK ( service_support = 0
             OR (service_support_start IS NOT NULL AND service_support_end IS NOT NULL
                 AND service_support_end >= service_support_start) )
);
CREATE INDEX idx_sales_customer_warranty ON sales (company_id, customer_warranty_end) WHERE is_deleted = 0;

-- 1:N with asset (renewals = new rows). MSSQL has no EXCLUDE constraint, so the
-- "no overlapping AMC periods per asset" rule is enforced in the service layer.
CREATE TABLE amc_contracts (
    id           UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    company_id   UNIQUEIDENTIFIER NOT NULL REFERENCES companies(id),
    asset_id     UNIQUEIDENTIFIER NOT NULL REFERENCES assets(id),
    sale_id      UNIQUEIDENTIFIER NOT NULL REFERENCES sales(id),
    amc_type_id  UNIQUEIDENTIFIER NOT NULL REFERENCES amc_types(id),
    amc_start    DATE NOT NULL,
    amc_end      DATE NOT NULL,
    is_current   BIT NOT NULL DEFAULT 1,
    status       VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CONSTRAINT ck_amc_status CHECK (status IN ('ACTIVE','EXPIRED','CANCELLED')),
    created_by  UNIQUEIDENTIFIER NULL,
    created_at  DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_by  UNIQUEIDENTIFIER NULL,
    updated_at  DATETIME2(3) NULL,
    is_deleted  BIT NOT NULL DEFAULT 0,
    deleted_at  DATETIME2(3) NULL,
    deleted_by  UNIQUEIDENTIFIER NULL,
    CONSTRAINT ck_amc_period CHECK (amc_end > amc_start)
);
-- Only one current AMC per asset (renewals supersede). Service layer also blocks
-- overlapping periods.
CREATE UNIQUE INDEX ux_amc_current_per_asset ON amc_contracts (asset_id) WHERE is_current = 1 AND is_deleted = 0;
CREATE INDEX idx_amc_contracts_end ON amc_contracts (company_id, amc_end) WHERE is_current = 1 AND is_deleted = 0;

-- ============================================================================
-- 4. ALERTS  (blueprint design: config table + dedup ledger)
--    *** V2 — HOD Q4.1/Q4.2 both answered "This is V2". ***
--    DDL is created now so the tables exist, but NOTHING in the MVP writes to or
--    reads from them: no node-cron job, no SMTP, no recipients configured.
-- ============================================================================

-- Configurable lead days + recipients per alert type (default 90/60/30/7).
CREATE TABLE alert_settings (
    id             UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    company_id     UNIQUEIDENTIFIER NOT NULL REFERENCES companies(id),
    alert_type     VARCHAR(30) NOT NULL,   -- SUPPLIER_WARRANTY | CUSTOMER_WARRANTY | AMC_EXPIRY | SERVICE_SUPPORT | QC_PENDING
    threshold_days VARCHAR(50) NOT NULL DEFAULT '90,60,30,7', -- CSV of lead days
    recipients     NVARCHAR(MAX) NULL,     -- CSV / JSON of email recipients
    is_enabled     BIT NOT NULL DEFAULT 1,
    updated_by     UNIQUEIDENTIFIER NULL,
    updated_at     DATETIME2(3) NULL,
    CONSTRAINT ux_alert_settings UNIQUE (company_id, alert_type)
);

-- Idempotency ledger: the nightly job never emails the same threshold twice.
CREATE TABLE alerts_sent (
    id             UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    company_id     UNIQUEIDENTIFIER NOT NULL REFERENCES companies(id),
    alert_type     VARCHAR(30) NOT NULL,
    entity_type    VARCHAR(30) NOT NULL,   -- purchase | sale | amc_contract | asset
    entity_id      UNIQUEIDENTIFIER NOT NULL,
    threshold_days INT NOT NULL,
    recipients     NVARCHAR(MAX) NULL,
    sent_at        DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT ux_alerts_sent_dedup UNIQUE (company_id, alert_type, entity_id, threshold_days)
);
CREATE INDEX idx_alerts_sent_entity ON alerts_sent (company_id, entity_type, entity_id);
GO

-- ============================================================================
-- 5. DERIVED — vw_asset_coverage (one row per asset: sale + current AMC +
--    purchase warranty). Warranty gap / days-remaining / coverage status are
--    computed at read time (here and in shared/warranty.ts), never stored.
--    This does NOT compete with assets.status: status is what staff picked and is
--    what the screen shows; these dates drive the warranty-gap figure and the
--    "status says WARRANTY_ACTIVE but the warranty ended 12 days ago" warning.
-- ============================================================================
CREATE VIEW vw_asset_coverage AS
SELECT
    a.id                        AS asset_id,
    a.company_id,
    a.serial_number,
    a.status                    AS manual_status,   -- hand-set; authoritative for display
    s.sales_date,
    s.installation_date,
    p.supplier_warranty_end,
    p.amc_support,
    s.id                        AS sale_id,
    s.customer_id,
    s.customer_warranty_end,
    s.service_support_end,
    m.id                        AS current_amc_id,
    m.amc_end
FROM assets a
LEFT JOIN purchases     p ON p.asset_id = a.id AND p.is_deleted = 0
LEFT JOIN sales         s ON s.asset_id = a.id AND s.is_deleted = 0
LEFT JOIN amc_contracts m ON m.asset_id = a.id AND m.is_current = 1 AND m.is_deleted = 0
WHERE a.is_deleted = 0;
GO

-- ============================================================================
-- 6. ROW-LEVEL SECURITY (tenant isolation) — SQL Server security policy.
--    A forgotten WHERE company_id filter should return nothing, not everything.
--    The app sets SESSION_CONTEXT 'company_id' per request; policy shown for
--    `assets`; repeat the FILTER/BLOCK predicates for every company_id table.
--
--    *** DEFERRED, stays commented out. *** HOD Q5.3: "manual as we are first
--    trying to make it work for our company and then we will add tenants later."
--    Launch seeds ONE company and derives company_id from the JWT; app-layer
--    WHERE company_id is sufficient for a single tenant. ENABLE THIS BEFORE THE
--    SECOND COMPANY IS ONBOARDED — that is the hard prerequisite, not a nice-to-have.
-- ============================================================================
-- CREATE FUNCTION dbo.fn_tenant_predicate(@company_id UNIQUEIDENTIFIER)
--   RETURNS TABLE WITH SCHEMABINDING AS
--   RETURN SELECT 1 AS ok
--   WHERE @company_id = CAST(SESSION_CONTEXT(N'company_id') AS UNIQUEIDENTIFIER);
-- GO
-- CREATE SECURITY POLICY dbo.tenant_isolation_policy
--   ADD FILTER PREDICATE dbo.fn_tenant_predicate(company_id) ON dbo.assets,
--   ADD BLOCK  PREDICATE dbo.fn_tenant_predicate(company_id) ON dbo.assets
--   WITH (STATE = ON);
-- GO
