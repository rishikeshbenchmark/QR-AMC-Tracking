BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[companies] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [companies_id_df] DEFAULT NEWSEQUENTIALID(),
    [name] NVARCHAR(255) NOT NULL,
    [subdomain] NVARCHAR(100) NOT NULL,
    [status] VARCHAR(20) NOT NULL CONSTRAINT [companies_status_df] DEFAULT 'ACTIVE',
    [created_at] DATETIME2 NOT NULL CONSTRAINT [companies_created_at_df] DEFAULT SYSUTCDATETIME(),
    [deleted_at] DATETIME2,
    CONSTRAINT [companies_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[roles] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [roles_id_df] DEFAULT NEWSEQUENTIALID(),
    [company_id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(100) NOT NULL,
    [is_system] BIT NOT NULL CONSTRAINT [roles_is_system_df] DEFAULT 0,
    CONSTRAINT [roles_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ux_roles_company_name] UNIQUE NONCLUSTERED ([company_id],[name])
);

-- CreateTable
CREATE TABLE [dbo].[permissions] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [permissions_id_df] DEFAULT NEWSEQUENTIALID(),
    [code] VARCHAR(100) NOT NULL,
    [description] NVARCHAR(255),
    CONSTRAINT [permissions_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [permissions_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[role_permissions] (
    [role_id] UNIQUEIDENTIFIER NOT NULL,
    [permission_id] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [role_permissions_pkey] PRIMARY KEY CLUSTERED ([role_id],[permission_id])
);

-- CreateTable
CREATE TABLE [dbo].[users] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [users_id_df] DEFAULT NEWSEQUENTIALID(),
    [company_id] UNIQUEIDENTIFIER NOT NULL,
    [role_id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [email] NVARCHAR(255) NOT NULL,
    [password_hash] VARCHAR(255) NOT NULL,
    [is_active] BIT NOT NULL CONSTRAINT [users_is_active_df] DEFAULT 1,
    [created_by] UNIQUEIDENTIFIER,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [users_created_at_df] DEFAULT SYSUTCDATETIME(),
    [updated_by] UNIQUEIDENTIFIER,
    [updated_at] DATETIME2,
    [is_deleted] BIT NOT NULL CONSTRAINT [users_is_deleted_df] DEFAULT 0,
    [deleted_at] DATETIME2,
    [deleted_by] UNIQUEIDENTIFIER,
    CONSTRAINT [users_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[audit_logs] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [audit_logs_id_df] DEFAULT NEWSEQUENTIALID(),
    [company_id] UNIQUEIDENTIFIER NOT NULL,
    [entity_type] VARCHAR(100) NOT NULL,
    [entity_id] UNIQUEIDENTIFIER NOT NULL,
    [action] VARCHAR(30) NOT NULL,
    [field_name] VARCHAR(100),
    [old_value] NVARCHAR(max),
    [new_value] NVARCHAR(max),
    [changed_by] UNIQUEIDENTIFIER,
    [changed_at] DATETIME2 NOT NULL CONSTRAINT [audit_logs_changed_at_df] DEFAULT SYSUTCDATETIME(),
    CONSTRAINT [audit_logs_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[product_categories] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [product_categories_id_df] DEFAULT NEWSEQUENTIALID(),
    [company_id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(150) NOT NULL,
    [created_by] UNIQUEIDENTIFIER,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [product_categories_created_at_df] DEFAULT SYSUTCDATETIME(),
    [updated_by] UNIQUEIDENTIFIER,
    [updated_at] DATETIME2,
    [is_deleted] BIT NOT NULL CONSTRAINT [product_categories_is_deleted_df] DEFAULT 0,
    [deleted_at] DATETIME2,
    [deleted_by] UNIQUEIDENTIFIER,
    CONSTRAINT [product_categories_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[product_makes] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [product_makes_id_df] DEFAULT NEWSEQUENTIALID(),
    [company_id] UNIQUEIDENTIFIER NOT NULL,
    [category_id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(150) NOT NULL,
    [created_by] UNIQUEIDENTIFIER,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [product_makes_created_at_df] DEFAULT SYSUTCDATETIME(),
    [updated_by] UNIQUEIDENTIFIER,
    [updated_at] DATETIME2,
    [is_deleted] BIT NOT NULL CONSTRAINT [product_makes_is_deleted_df] DEFAULT 0,
    [deleted_at] DATETIME2,
    [deleted_by] UNIQUEIDENTIFIER,
    CONSTRAINT [product_makes_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[product_models] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [product_models_id_df] DEFAULT NEWSEQUENTIALID(),
    [company_id] UNIQUEIDENTIFIER NOT NULL,
    [make_id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(150) NOT NULL,
    [created_by] UNIQUEIDENTIFIER,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [product_models_created_at_df] DEFAULT SYSUTCDATETIME(),
    [updated_by] UNIQUEIDENTIFIER,
    [updated_at] DATETIME2,
    [is_deleted] BIT NOT NULL CONSTRAINT [product_models_is_deleted_df] DEFAULT 0,
    [deleted_at] DATETIME2,
    [deleted_by] UNIQUEIDENTIFIER,
    CONSTRAINT [product_models_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[suppliers] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [suppliers_id_df] DEFAULT NEWSEQUENTIALID(),
    [company_id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [email] NVARCHAR(255),
    [created_by] UNIQUEIDENTIFIER,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [suppliers_created_at_df] DEFAULT SYSUTCDATETIME(),
    [updated_by] UNIQUEIDENTIFIER,
    [updated_at] DATETIME2,
    [is_deleted] BIT NOT NULL CONSTRAINT [suppliers_is_deleted_df] DEFAULT 0,
    [deleted_at] DATETIME2,
    [deleted_by] UNIQUEIDENTIFIER,
    CONSTRAINT [suppliers_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[amc_suppliers] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [amc_suppliers_id_df] DEFAULT NEWSEQUENTIALID(),
    [company_id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [created_by] UNIQUEIDENTIFIER,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [amc_suppliers_created_at_df] DEFAULT SYSUTCDATETIME(),
    [updated_by] UNIQUEIDENTIFIER,
    [updated_at] DATETIME2,
    [is_deleted] BIT NOT NULL CONSTRAINT [amc_suppliers_is_deleted_df] DEFAULT 0,
    [deleted_at] DATETIME2,
    [deleted_by] UNIQUEIDENTIFIER,
    CONSTRAINT [amc_suppliers_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[customers] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [customers_id_df] DEFAULT NEWSEQUENTIALID(),
    [company_id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [email] NVARCHAR(255),
    [created_by] UNIQUEIDENTIFIER,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [customers_created_at_df] DEFAULT SYSUTCDATETIME(),
    [updated_by] UNIQUEIDENTIFIER,
    [updated_at] DATETIME2,
    [is_deleted] BIT NOT NULL CONSTRAINT [customers_is_deleted_df] DEFAULT 0,
    [deleted_at] DATETIME2,
    [deleted_by] UNIQUEIDENTIFIER,
    CONSTRAINT [customers_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[amc_types] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [amc_types_id_df] DEFAULT NEWSEQUENTIALID(),
    [company_id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(100) NOT NULL,
    [created_by] UNIQUEIDENTIFIER,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [amc_types_created_at_df] DEFAULT SYSUTCDATETIME(),
    [updated_by] UNIQUEIDENTIFIER,
    [updated_at] DATETIME2,
    [is_deleted] BIT NOT NULL CONSTRAINT [amc_types_is_deleted_df] DEFAULT 0,
    [deleted_at] DATETIME2,
    [deleted_by] UNIQUEIDENTIFIER,
    CONSTRAINT [amc_types_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[assets] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [company_id] UNIQUEIDENTIFIER NOT NULL,
    [category_id] UNIQUEIDENTIFIER NOT NULL,
    [make_id] UNIQUEIDENTIFIER NOT NULL,
    [model_id] UNIQUEIDENTIFIER NOT NULL,
    [serial_number] NVARCHAR(100) NOT NULL,
    [status] VARCHAR(20) NOT NULL CONSTRAINT [assets_status_df] DEFAULT 'CREATED',
    [created_by] UNIQUEIDENTIFIER,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [assets_created_at_df] DEFAULT SYSUTCDATETIME(),
    [updated_by] UNIQUEIDENTIFIER,
    [updated_at] DATETIME2,
    [is_deleted] BIT NOT NULL CONSTRAINT [assets_is_deleted_df] DEFAULT 0,
    [deleted_at] DATETIME2,
    [deleted_by] UNIQUEIDENTIFIER,
    CONSTRAINT [assets_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[asset_status_history] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [asset_status_history_id_df] DEFAULT NEWSEQUENTIALID(),
    [company_id] UNIQUEIDENTIFIER NOT NULL,
    [asset_id] UNIQUEIDENTIFIER NOT NULL,
    [from_status] VARCHAR(20),
    [to_status] VARCHAR(20) NOT NULL,
    [remarks] NVARCHAR(500),
    [changed_by] UNIQUEIDENTIFIER,
    [changed_at] DATETIME2 NOT NULL CONSTRAINT [asset_status_history_changed_at_df] DEFAULT SYSUTCDATETIME(),
    CONSTRAINT [asset_status_history_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[purchases] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [purchases_id_df] DEFAULT NEWSEQUENTIALID(),
    [company_id] UNIQUEIDENTIFIER NOT NULL,
    [asset_id] UNIQUEIDENTIFIER NOT NULL,
    [supplier_id] UNIQUEIDENTIFIER NOT NULL,
    [po_number] NVARCHAR(50),
    [supplier_invoice_no] NVARCHAR(50),
    [purchase_date] DATE,
    [supplier_warranty_start] DATE,
    [supplier_warranty_end] DATE,
    [cost_price] DECIMAL(12,2),
    [amc_support] VARCHAR(15),
    [amc_supplier_id] UNIQUEIDENTIFIER,
    [created_by] UNIQUEIDENTIFIER,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [purchases_created_at_df] DEFAULT SYSUTCDATETIME(),
    [updated_by] UNIQUEIDENTIFIER,
    [updated_at] DATETIME2,
    [is_deleted] BIT NOT NULL CONSTRAINT [purchases_is_deleted_df] DEFAULT 0,
    [deleted_at] DATETIME2,
    [deleted_by] UNIQUEIDENTIFIER,
    CONSTRAINT [purchases_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [purchases_asset_id_key] UNIQUE NONCLUSTERED ([asset_id])
);

-- CreateTable
CREATE TABLE [dbo].[sales] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [sales_id_df] DEFAULT NEWSEQUENTIALID(),
    [company_id] UNIQUEIDENTIFIER NOT NULL,
    [asset_id] UNIQUEIDENTIFIER NOT NULL,
    [customer_id] UNIQUEIDENTIFIER NOT NULL,
    [sales_invoice_no] NVARCHAR(50),
    [sales_date] DATE,
    [installation_date] DATE,
    [customer_warranty_start] DATE,
    [customer_warranty_end] DATE,
    [service_support] BIT NOT NULL CONSTRAINT [sales_service_support_df] DEFAULT 0,
    [service_support_start] DATE,
    [service_support_end] DATE,
    [created_by] UNIQUEIDENTIFIER,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [sales_created_at_df] DEFAULT SYSUTCDATETIME(),
    [updated_by] UNIQUEIDENTIFIER,
    [updated_at] DATETIME2,
    [is_deleted] BIT NOT NULL CONSTRAINT [sales_is_deleted_df] DEFAULT 0,
    [deleted_at] DATETIME2,
    [deleted_by] UNIQUEIDENTIFIER,
    CONSTRAINT [sales_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [sales_asset_id_key] UNIQUE NONCLUSTERED ([asset_id])
);

-- CreateTable
CREATE TABLE [dbo].[amc_contracts] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [amc_contracts_id_df] DEFAULT NEWSEQUENTIALID(),
    [company_id] UNIQUEIDENTIFIER NOT NULL,
    [asset_id] UNIQUEIDENTIFIER NOT NULL,
    [sale_id] UNIQUEIDENTIFIER NOT NULL,
    [amc_type_id] UNIQUEIDENTIFIER NOT NULL,
    [amc_start] DATE NOT NULL,
    [amc_end] DATE NOT NULL,
    [is_current] BIT NOT NULL CONSTRAINT [amc_contracts_is_current_df] DEFAULT 1,
    [status] VARCHAR(20) NOT NULL CONSTRAINT [amc_contracts_status_df] DEFAULT 'ACTIVE',
    [created_by] UNIQUEIDENTIFIER,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [amc_contracts_created_at_df] DEFAULT SYSUTCDATETIME(),
    [updated_by] UNIQUEIDENTIFIER,
    [updated_at] DATETIME2,
    [is_deleted] BIT NOT NULL CONSTRAINT [amc_contracts_is_deleted_df] DEFAULT 0,
    [deleted_at] DATETIME2,
    [deleted_by] UNIQUEIDENTIFIER,
    CONSTRAINT [amc_contracts_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[alert_settings] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [alert_settings_id_df] DEFAULT NEWSEQUENTIALID(),
    [company_id] UNIQUEIDENTIFIER NOT NULL,
    [alert_type] VARCHAR(30) NOT NULL,
    [threshold_days] VARCHAR(50) NOT NULL CONSTRAINT [alert_settings_threshold_days_df] DEFAULT '90,60,30,7',
    [recipients] NVARCHAR(max),
    [is_enabled] BIT NOT NULL CONSTRAINT [alert_settings_is_enabled_df] DEFAULT 1,
    [updated_by] UNIQUEIDENTIFIER,
    [updated_at] DATETIME2,
    CONSTRAINT [alert_settings_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ux_alert_settings] UNIQUE NONCLUSTERED ([company_id],[alert_type])
);

-- CreateTable
CREATE TABLE [dbo].[alerts_sent] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [alerts_sent_id_df] DEFAULT NEWSEQUENTIALID(),
    [company_id] UNIQUEIDENTIFIER NOT NULL,
    [alert_type] VARCHAR(30) NOT NULL,
    [entity_type] VARCHAR(30) NOT NULL,
    [entity_id] UNIQUEIDENTIFIER NOT NULL,
    [threshold_days] INT NOT NULL,
    [recipients] NVARCHAR(max),
    [sent_at] DATETIME2 NOT NULL CONSTRAINT [alerts_sent_sent_at_df] DEFAULT SYSUTCDATETIME(),
    CONSTRAINT [alerts_sent_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ux_alerts_sent_dedup] UNIQUE NONCLUSTERED ([company_id],[alert_type],[entity_id],[threshold_days])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_audit_logs_entity] ON [dbo].[audit_logs]([company_id], [entity_type], [entity_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_assets_status] ON [dbo].[assets]([company_id], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_asset_status_history_asset] ON [dbo].[asset_status_history]([asset_id], [changed_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_alerts_sent_entity] ON [dbo].[alerts_sent]([company_id], [entity_type], [entity_id]);

-- AddForeignKey
ALTER TABLE [dbo].[roles] ADD CONSTRAINT [roles_company_id_fkey] FOREIGN KEY ([company_id]) REFERENCES [dbo].[companies]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[role_permissions] ADD CONSTRAINT [role_permissions_role_id_fkey] FOREIGN KEY ([role_id]) REFERENCES [dbo].[roles]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[role_permissions] ADD CONSTRAINT [role_permissions_permission_id_fkey] FOREIGN KEY ([permission_id]) REFERENCES [dbo].[permissions]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[users] ADD CONSTRAINT [users_company_id_fkey] FOREIGN KEY ([company_id]) REFERENCES [dbo].[companies]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[users] ADD CONSTRAINT [users_role_id_fkey] FOREIGN KEY ([role_id]) REFERENCES [dbo].[roles]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[product_categories] ADD CONSTRAINT [product_categories_company_id_fkey] FOREIGN KEY ([company_id]) REFERENCES [dbo].[companies]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[product_makes] ADD CONSTRAINT [product_makes_company_id_fkey] FOREIGN KEY ([company_id]) REFERENCES [dbo].[companies]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[product_makes] ADD CONSTRAINT [product_makes_category_id_fkey] FOREIGN KEY ([category_id]) REFERENCES [dbo].[product_categories]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[product_models] ADD CONSTRAINT [product_models_company_id_fkey] FOREIGN KEY ([company_id]) REFERENCES [dbo].[companies]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[product_models] ADD CONSTRAINT [product_models_make_id_fkey] FOREIGN KEY ([make_id]) REFERENCES [dbo].[product_makes]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[suppliers] ADD CONSTRAINT [suppliers_company_id_fkey] FOREIGN KEY ([company_id]) REFERENCES [dbo].[companies]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[amc_suppliers] ADD CONSTRAINT [amc_suppliers_company_id_fkey] FOREIGN KEY ([company_id]) REFERENCES [dbo].[companies]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[customers] ADD CONSTRAINT [customers_company_id_fkey] FOREIGN KEY ([company_id]) REFERENCES [dbo].[companies]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[amc_types] ADD CONSTRAINT [amc_types_company_id_fkey] FOREIGN KEY ([company_id]) REFERENCES [dbo].[companies]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[assets] ADD CONSTRAINT [assets_company_id_fkey] FOREIGN KEY ([company_id]) REFERENCES [dbo].[companies]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[assets] ADD CONSTRAINT [assets_category_id_fkey] FOREIGN KEY ([category_id]) REFERENCES [dbo].[product_categories]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[assets] ADD CONSTRAINT [assets_make_id_fkey] FOREIGN KEY ([make_id]) REFERENCES [dbo].[product_makes]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[assets] ADD CONSTRAINT [assets_model_id_fkey] FOREIGN KEY ([model_id]) REFERENCES [dbo].[product_models]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[asset_status_history] ADD CONSTRAINT [asset_status_history_company_id_fkey] FOREIGN KEY ([company_id]) REFERENCES [dbo].[companies]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[asset_status_history] ADD CONSTRAINT [asset_status_history_asset_id_fkey] FOREIGN KEY ([asset_id]) REFERENCES [dbo].[assets]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[purchases] ADD CONSTRAINT [purchases_company_id_fkey] FOREIGN KEY ([company_id]) REFERENCES [dbo].[companies]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[purchases] ADD CONSTRAINT [purchases_asset_id_fkey] FOREIGN KEY ([asset_id]) REFERENCES [dbo].[assets]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[purchases] ADD CONSTRAINT [purchases_supplier_id_fkey] FOREIGN KEY ([supplier_id]) REFERENCES [dbo].[suppliers]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[purchases] ADD CONSTRAINT [purchases_amc_supplier_id_fkey] FOREIGN KEY ([amc_supplier_id]) REFERENCES [dbo].[amc_suppliers]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[sales] ADD CONSTRAINT [sales_company_id_fkey] FOREIGN KEY ([company_id]) REFERENCES [dbo].[companies]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[sales] ADD CONSTRAINT [sales_asset_id_fkey] FOREIGN KEY ([asset_id]) REFERENCES [dbo].[assets]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[sales] ADD CONSTRAINT [sales_customer_id_fkey] FOREIGN KEY ([customer_id]) REFERENCES [dbo].[customers]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[amc_contracts] ADD CONSTRAINT [amc_contracts_company_id_fkey] FOREIGN KEY ([company_id]) REFERENCES [dbo].[companies]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[amc_contracts] ADD CONSTRAINT [amc_contracts_asset_id_fkey] FOREIGN KEY ([asset_id]) REFERENCES [dbo].[assets]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[amc_contracts] ADD CONSTRAINT [amc_contracts_sale_id_fkey] FOREIGN KEY ([sale_id]) REFERENCES [dbo].[sales]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[amc_contracts] ADD CONSTRAINT [amc_contracts_amc_type_id_fkey] FOREIGN KEY ([amc_type_id]) REFERENCES [dbo].[amc_types]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[alert_settings] ADD CONSTRAINT [alert_settings_company_id_fkey] FOREIGN KEY ([company_id]) REFERENCES [dbo].[companies]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[alerts_sent] ADD CONSTRAINT [alerts_sent_company_id_fkey] FOREIGN KEY ([company_id]) REFERENCES [dbo].[companies]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;


-- ===========================================================================
-- HAND-EDITED — DO NOT REGENERATE THIS MIGRATION.
--
-- Everything below is written by hand because Prisma on SQL Server cannot
-- express CHECK constraints, filtered indexes, or views. It mirrors
-- db/schema.sql, which is the canonical DDL. If you change the Prisma schema
-- and regenerate, you will silently drop every rule below — re-apply them.
-- ===========================================================================

-- --- CHECK constraints: the status vocabularies -----------------------------

ALTER TABLE [dbo].[companies] ADD CONSTRAINT [ck_companies_status]
    CHECK ([status] IN ('ACTIVE','SUSPENDED'));

-- ADR-0003: one manual status column holding the full Mail 3.1 vocabulary
-- plus DISCARDED. The system never writes it; a person picks it from a dropdown.
ALTER TABLE [dbo].[assets] ADD CONSTRAINT [ck_assets_status]
    CHECK ([status] IN ('CREATED','PURCHASED','QC_PENDING','QC_PASSED','QC_FAILED',
                        'ALLOCATED','DISPATCHED','INSTALLED','WARRANTY_ACTIVE',
                        'WARRANTY_EXPIRED','AMC_ACTIVE','AMC_EXPIRED','DISCARDED'));

ALTER TABLE [dbo].[amc_contracts] ADD CONSTRAINT [ck_amc_status]
    CHECK ([status] IN ('ACTIVE','EXPIRED','CANCELLED'));

-- --- CHECK constraints: purchase-side rules ---------------------------------

ALTER TABLE [dbo].[purchases] ADD CONSTRAINT [ck_purchases_amc_support]
    CHECK ([amc_support] IN ('INHOUSE','BACK_TO_BACK'));

ALTER TABLE [dbo].[purchases] ADD CONSTRAINT [ck_purchases_warranty_order]
    CHECK ([supplier_warranty_end] IS NULL OR [supplier_warranty_start] IS NULL
           OR [supplier_warranty_end] >= [supplier_warranty_start]);

ALTER TABLE [dbo].[purchases] ADD CONSTRAINT [ck_purchases_cost_positive]
    CHECK ([cost_price] IS NULL OR [cost_price] > 0);

-- Back-to-Back support requires a named AMC supplier; Inhouse and unset must not have one.
ALTER TABLE [dbo].[purchases] ADD CONSTRAINT [ck_purchases_amc_supplier]
    CHECK (([amc_support] = 'BACK_TO_BACK' AND [amc_supplier_id] IS NOT NULL)
        OR ([amc_support] = 'INHOUSE'      AND [amc_supplier_id] IS NULL)
        OR ([amc_support] IS NULL          AND [amc_supplier_id] IS NULL));

-- --- CHECK constraints: sale-side rules -------------------------------------

ALTER TABLE [dbo].[sales] ADD CONSTRAINT [ck_sales_warranty_order]
    CHECK ([customer_warranty_end] IS NULL OR [customer_warranty_start] IS NULL
           OR [customer_warranty_end] >= [customer_warranty_start]);

-- HOD Q6.3: the customer warranty starts no earlier than the EARLIER of the sales
-- date and the installation date; the user then picks any date from that floor on.
-- There is deliberately NO "installation >= sale" rule: "whichever is earlier" means
-- installation may legitimately precede the sale.
ALTER TABLE [dbo].[sales] ADD CONSTRAINT [ck_sales_warranty_start_floor]
    CHECK ([customer_warranty_start] IS NULL
           OR ([sales_date] IS NULL AND [installation_date] IS NULL)
           OR [customer_warranty_start] >=
              CASE WHEN [sales_date] IS NULL              THEN [installation_date]
                   WHEN [installation_date] IS NULL       THEN [sales_date]
                   WHEN [sales_date] <= [installation_date] THEN [sales_date]
                   ELSE [installation_date] END);

ALTER TABLE [dbo].[sales] ADD CONSTRAINT [ck_sales_service_window]
    CHECK ([service_support] = 0
        OR ([service_support_start] IS NOT NULL AND [service_support_end] IS NOT NULL
            AND [service_support_end] >= [service_support_start]));

ALTER TABLE [dbo].[amc_contracts] ADD CONSTRAINT [ck_amc_period]
    CHECK ([amc_end] > [amc_start]);

-- --- Filtered UNIQUE indexes ------------------------------------------------
-- Every one of these is filtered so that soft-deleted rows stop blocking reuse.
-- An unfiltered unique index here would mean deleting a supplier permanently
-- burns its name.

CREATE UNIQUE INDEX [ux_companies_subdomain] ON [dbo].[companies] ([subdomain])
    WHERE [deleted_at] IS NULL;

-- Globally unique, not per tenant (resolved scope question).
CREATE UNIQUE INDEX [ux_users_email] ON [dbo].[users] ([email])
    WHERE [is_deleted] = 0;

CREATE UNIQUE INDEX [ux_categories_company_name] ON [dbo].[product_categories] ([company_id], [name])
    WHERE [is_deleted] = 0;

CREATE UNIQUE INDEX [ux_makes_company_name] ON [dbo].[product_makes] ([company_id], [name])
    WHERE [is_deleted] = 0;

CREATE UNIQUE INDEX [ux_models_company_make_name] ON [dbo].[product_models] ([company_id], [make_id], [name])
    WHERE [is_deleted] = 0;

CREATE UNIQUE INDEX [ux_suppliers_company_name] ON [dbo].[suppliers] ([company_id], [name])
    WHERE [is_deleted] = 0;

CREATE UNIQUE INDEX [ux_amc_suppliers_company_name] ON [dbo].[amc_suppliers] ([company_id], [name])
    WHERE [is_deleted] = 0;

CREATE UNIQUE INDEX [ux_customers_company_name] ON [dbo].[customers] ([company_id], [name])
    WHERE [is_deleted] = 0;

CREATE UNIQUE INDEX [ux_amc_types_company_name] ON [dbo].[amc_types] ([company_id], [name])
    WHERE [is_deleted] = 0;

-- Serial is unique per tenant among LIVE assets only. DISCARDED is excluded so that
-- on resale the old asset is discarded and the same physical serial re-registers
-- under the new asset and its new QR.
CREATE UNIQUE INDEX [ux_assets_company_serial] ON [dbo].[assets] ([company_id], [serial_number])
    WHERE [is_deleted] = 0 AND [status] <> 'DISCARDED';

-- Only one current AMC contract per asset; renewals supersede.
CREATE UNIQUE INDEX [ux_amc_current_per_asset] ON [dbo].[amc_contracts] ([asset_id])
    WHERE [is_current] = 1 AND [is_deleted] = 0;

-- --- Filtered report indexes ------------------------------------------------

CREATE INDEX [idx_purchases_supplier_warranty] ON [dbo].[purchases] ([company_id], [supplier_warranty_end])
    WHERE [is_deleted] = 0;

CREATE INDEX [idx_sales_customer_warranty] ON [dbo].[sales] ([company_id], [customer_warranty_end])
    WHERE [is_deleted] = 0;

CREATE INDEX [idx_amc_contracts_end] ON [dbo].[amc_contracts] ([company_id], [amc_end])
    WHERE [is_current] = 1 AND [is_deleted] = 0;

-- --- Derived view -----------------------------------------------------------
-- One row per asset: purchase warranty + sale + current AMC. The warranty gap,
-- days remaining and coverage state are computed at READ time from these dates
-- (here and in shared/warranty.ts) and never stored.
--
-- This does not compete with assets.status: status is what staff picked and is what
-- the screen shows. These dates drive the gap figure and the "status says
-- WARRANTY_ACTIVE but the warranty ended 12 days ago" drift warning.
--
-- Wrapped in EXEC because SQL Server requires CREATE VIEW to be the first statement
-- in its batch, and this migration runs as one transactional batch.
EXEC('
CREATE VIEW dbo.vw_asset_coverage AS
SELECT
    a.id                        AS asset_id,
    a.company_id,
    a.serial_number,
    a.status                    AS manual_status,
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
');

-- Row-level security is deliberately NOT enabled: launch is single-company and
-- company_id is derived from the JWT. db/schema.sql section 6 carries the policy.
-- ENABLE IT BEFORE THE SECOND COMPANY IS ONBOARDED — hard prerequisite.

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
